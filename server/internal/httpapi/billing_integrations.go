package httpapi

import (
	"bytes"
	"fmt"
	"net/http"
	"time"

	"github.com/evonotes/server/internal/auth"
	"github.com/evonotes/server/internal/integrations"
	"github.com/evonotes/server/internal/store"
)

// The JSON billing/integration endpoints (status, checkout, portal,
// picker-token, recent, disconnect) are registered with huma in
// huma_account.go. The OAuth redirect flow and multipart-adjacent import stay
// on raw chi here because they redirect / call external providers directly.

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
