package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/evonotes/server/internal/auth"
	"github.com/evonotes/server/internal/billing"
	"github.com/evonotes/server/internal/integrations"
	"github.com/evonotes/server/internal/store"
)

func (a *api) getBilling(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	info, err := a.s.GetBilling(r.Context(), userID)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, info)
}

func (a *api) billingCheckout(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	var body struct {
		PlanTier string `json:"planTier"`
	}
	if err := decode(r, &body); err != nil || (body.PlanTier != "pro" && body.PlanTier != "team") {
		writeJSON(w, 400, map[string]string{"message": "planTier must be pro or team"})
		return
	}

	u, err := a.s.Me(r.Context(), userID)
	if err != nil {
		a.fail(w, err)
		return
	}

	priceID := billing.PriceForTier(body.PlanTier, a.cfg.StripePricePro, a.cfg.StripePriceTeam)
	if priceID == "" {
		writeJSON(w, 503, map[string]string{"message": "stripe price not configured"})
		return
	}

	customerID, err := a.s.GetStripeCustomerID(r.Context(), userID)
	if err != nil {
		a.fail(w, err)
		return
	}
	if customerID == "" {
		customerID, err = billing.CreateCustomer(u.Email, u.Name, userID)
		if err != nil {
			a.fail(w, err)
			return
		}
		if err := a.s.SetStripeCustomerID(r.Context(), userID, customerID); err != nil {
			a.fail(w, err)
			return
		}
	}

	successURL := a.cfg.AppURL + "/subscription?success=1"
	cancelURL := a.cfg.AppURL + "/subscription"
	url, err := billing.CreateCheckoutSession(customerID, priceID, userID, successURL, cancelURL)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"url": url})
}

func (a *api) billingPortal(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	customerID, err := a.s.GetStripeCustomerID(r.Context(), userID)
	if err != nil {
		a.fail(w, err)
		return
	}
	if customerID == "" {
		writeJSON(w, 400, map[string]string{"message": "no billing account"})
		return
	}
	url, err := billing.CreatePortalSession(customerID, a.cfg.AppURL+"/subscription")
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"url": url})
}

func (a *api) integrationsStatus(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	st, err := a.s.IntegrationsStatus(r.Context(), userID)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, st)
}

func (a *api) googleConnect(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	state := userID + ":" + randID("st")
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", Value: state, Path: "/", MaxAge: 600, HttpOnly: true})
	http.Redirect(w, r, integrations.GoogleAuthURL(a.oauth, state), http.StatusFound)
}

func (a *api) googleCallback(w http.ResponseWriter, r *http.Request) {
	a.handleOAuthCallback(w, r, integrations.ProviderGoogle, integrations.ExchangeGoogleCode)
}

func (a *api) microsoftConnect(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	state := userID + ":" + randID("st")
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", Value: state, Path: "/", MaxAge: 600, HttpOnly: true})
	http.Redirect(w, r, integrations.MicrosoftAuthURL(a.oauth, state), http.StatusFound)
}

func (a *api) microsoftCallback(w http.ResponseWriter, r *http.Request) {
	a.handleOAuthCallback(w, r, integrations.ProviderMicrosoft, integrations.ExchangeMicrosoftCode)
}

func (a *api) handleOAuthCallback(w http.ResponseWriter, r *http.Request, provider string, exchangeFn func(integrations.OAuthConfig, string) (integrations.TokenResponse, error)) {
	state := r.URL.Query().Get("state")
	cookie, err := r.Cookie("oauth_state")
	if err != nil || cookie.Value != state {
		writeJSON(w, 400, map[string]string{"message": "invalid state"})
		return
	}
	userID := splitOAuthState(state)
	code := r.URL.Query().Get("code")
	if code == "" {
		writeJSON(w, 400, map[string]string{"message": "missing code"})
		return
	}

	tr, err := exchangeFn(a.oauth, code)
	if err != nil {
		a.fail(w, err)
		return
	}
	var exp *time.Time
	if tr.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second)
		exp = &t
	}
	conn := store.OAuthConnection{
		UserID: userID, Provider: provider,
		AccessToken: tr.AccessToken, RefreshToken: tr.RefreshToken,
		ExpiresAt: exp,
	}
	if err := a.s.UpsertOAuthConnection(r.Context(), conn); err != nil {
		a.fail(w, err)
		return
	}
	http.Redirect(w, r, a.cfg.AppURL+"/workspaces?connected="+provider, http.StatusFound)
}

func splitOAuthState(state string) string {
	for i := 0; i < len(state); i++ {
		if state[i] == ':' {
			return state[:i]
		}
	}
	return state
}

func (a *api) deleteIntegration(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	provider := id(r)
	if provider != integrations.ProviderGoogle && provider != integrations.ProviderMicrosoft {
		writeJSON(w, 400, map[string]string{"message": "unknown provider"})
		return
	}
	if err := a.s.DeleteOAuthConnection(r.Context(), userID, provider); err != nil {
		a.fail(w, err)
		return
	}
	noContent(w)
}

func (a *api) googlePickerToken(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	tok, err := integrations.EnsureAccessToken(r.Context(), a.s, a.oauth, userID, integrations.ProviderGoogle)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"accessToken": tok})
}

func (a *api) microsoftRecentFiles(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	tok, err := integrations.EnsureAccessToken(r.Context(), a.s, a.oauth, userID, integrations.ProviderMicrosoft)
	if err != nil {
		a.fail(w, err)
		return
	}
	req, _ := http.NewRequest("GET", "https://graph.microsoft.com/v1.0/me/drive/recent", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		a.fail(w, err)
		return
	}
	defer resp.Body.Close()
	var out struct {
		Value []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"value"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, out.Value)
}

func (a *api) importSources(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	wsID := id(r)
	if err := a.s.AssertWorkspaceOwner(r.Context(), userID, wsID); err != nil {
		a.fail(w, err)
		return
	}

	var body struct {
		Provider  string   `json:"provider"`
		FileIds   []string `json:"fileIds"`
		ChapterID *string  `json:"chapterId"`
	}
	if err := decode(r, &body); err != nil || len(body.FileIds) == 0 {
		writeJSON(w, 400, map[string]string{"message": "provider and fileIds required"})
		return
	}

	tok, err := integrations.EnsureAccessToken(r.Context(), a.s, a.oauth, userID, body.Provider)
	if err != nil {
		a.fail(w, err)
		return
	}

	created := []store.File{}
	for _, fid := range body.FileIds {
		var data []byte
		var name string
		switch body.Provider {
		case integrations.ProviderGoogle:
			data, name, err = integrations.DownloadGoogleFile(tok, fid)
		case integrations.ProviderMicrosoft:
			data, name, err = integrations.DownloadMicrosoftFile(tok, fid)
		default:
			writeJSON(w, 400, map[string]string{"message": "unknown provider"})
			return
		}
		if err != nil {
			a.fail(w, err)
			return
		}
		if a.blob == nil {
			a.fail(w, fmt.Errorf("blob store not configured"))
			return
		}
		blobPath, _, err := a.blob.Put(randID("blob"), bytes.NewReader(data))
		if err != nil {
			a.fail(w, err)
			return
		}
		kind := integrations.KindFromName(name)
		f, _, err := a.s.CreateSourceWithJob(r.Context(), wsID, name, kind, body.ChapterID, len(data)/1024, blobPath, a.parser, a.engine)
		if err != nil {
			a.fail(w, err)
			return
		}
		created = append(created, f)
	}
	writeJSON(w, 201, created)
}
