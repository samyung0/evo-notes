package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/evonotes/server/internal/store"
)

// OAuthConfig holds provider OAuth settings.
type OAuthConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	MicrosoftClientID  string
	MicrosoftClientSecret string
	RedirectBaseURL    string
}

const (
	ProviderGoogle    = "google"
	ProviderMicrosoft = "microsoft"
)

func GoogleAuthURL(cfg OAuthConfig, state string) string {
	v := url.Values{
		"client_id":     {cfg.GoogleClientID},
		"redirect_uri":  {cfg.RedirectBaseURL + "/api/integrations/google/callback"},
		"response_type": {"code"},
		"scope":         {"https://www.googleapis.com/auth/drive.readonly"},
		"access_type":   {"offline"},
		"prompt":        {"consent"},
		"state":         {state},
	}
	return "https://accounts.google.com/o/oauth2/v2/auth?" + v.Encode()
}

func MicrosoftAuthURL(cfg OAuthConfig, state string) string {
	v := url.Values{
		"client_id":     {cfg.MicrosoftClientID},
		"redirect_uri":  {cfg.RedirectBaseURL + "/api/integrations/microsoft/callback"},
		"response_type": {"code"},
		"scope":         {"offline_access Files.Read"},
		"state":         {state},
	}
	return "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + v.Encode()
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

func ExchangeGoogleCode(cfg OAuthConfig, code string) (TokenResponse, error) {
	return exchangeToken("https://oauth2.googleapis.com/token", url.Values{
		"code":          {code},
		"client_id":     {cfg.GoogleClientID},
		"client_secret": {cfg.GoogleClientSecret},
		"redirect_uri":  {cfg.RedirectBaseURL + "/api/integrations/google/callback"},
		"grant_type":    {"authorization_code"},
	})
}

func ExchangeMicrosoftCode(cfg OAuthConfig, code string) (TokenResponse, error) {
	return exchangeToken("https://login.microsoftonline.com/common/oauth2/v2.0/token", url.Values{
		"code":          {code},
		"client_id":     {cfg.MicrosoftClientID},
		"client_secret": {cfg.MicrosoftClientSecret},
		"redirect_uri":  {cfg.RedirectBaseURL + "/api/integrations/microsoft/callback"},
		"grant_type":    {"authorization_code"},
	})
}

func exchangeToken(endpoint string, data url.Values) (TokenResponse, error) {
	resp, err := http.PostForm(endpoint, data)
	if err != nil {
		return TokenResponse{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return TokenResponse{}, fmt.Errorf("token exchange: %s", string(body))
	}
	var tr TokenResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return TokenResponse{}, err
	}
	return tr, nil
}

func RefreshGoogleToken(cfg OAuthConfig, refreshToken string) (TokenResponse, error) {
	return exchangeToken("https://oauth2.googleapis.com/token", url.Values{
		"client_id":     {cfg.GoogleClientID},
		"client_secret": {cfg.GoogleClientSecret},
		"refresh_token": {refreshToken},
		"grant_type":    {"refresh_token"},
	})
}

func RefreshMicrosoftToken(cfg OAuthConfig, refreshToken string) (TokenResponse, error) {
	return exchangeToken("https://login.microsoftonline.com/common/oauth2/v2.0/token", url.Values{
		"client_id":     {cfg.MicrosoftClientID},
		"client_secret": {cfg.MicrosoftClientSecret},
		"refresh_token": {refreshToken},
		"grant_type":    {"refresh_token"},
	})
}

func EnsureAccessToken(ctx context.Context, st *store.Store, cfg OAuthConfig, userID, provider string) (string, error) {
	conn, err := st.GetOAuthConnection(ctx, userID, provider)
	if err != nil {
		return "", err
	}
	if conn.ExpiresAt != nil && conn.ExpiresAt.After(time.Now().Add(2*time.Minute)) {
		return conn.AccessToken, nil
	}
	if conn.RefreshToken == "" {
		return conn.AccessToken, nil
	}
	var tr TokenResponse
	switch provider {
	case ProviderGoogle:
		tr, err = RefreshGoogleToken(cfg, conn.RefreshToken)
	case ProviderMicrosoft:
		tr, err = RefreshMicrosoftToken(cfg, conn.RefreshToken)
	default:
		return "", fmt.Errorf("unknown provider")
	}
	if err != nil {
		return "", err
	}
	exp := time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second)
	_ = st.UpdateOAuthTokens(ctx, userID, provider, tr.AccessToken, tr.RefreshToken, &exp)
	return tr.AccessToken, nil
}

func DownloadGoogleFile(accessToken, fileID string) ([]byte, string, error) {
	metaReq, _ := http.NewRequest("GET", "https://www.googleapis.com/drive/v3/files/"+fileID+"?fields=name,mimeType", nil)
	metaReq.Header.Set("Authorization", "Bearer "+accessToken)
	metaResp, err := http.DefaultClient.Do(metaReq)
	if err != nil {
		return nil, "", err
	}
	defer metaResp.Body.Close()
	var meta struct {
		Name     string `json:"name"`
		MimeType string `json:"mimeType"`
	}
	_ = json.NewDecoder(metaResp.Body).Decode(&meta)

	dlURL := "https://www.googleapis.com/drive/v3/files/" + fileID + "?alt=media"
	if strings.HasPrefix(meta.MimeType, "application/vnd.google-apps.") {
		dlURL = "https://www.googleapis.com/drive/v3/files/" + fileID + "/export?mimeType=application/pdf"
		if meta.MimeType == "application/vnd.google-apps.document" {
			meta.Name = strings.TrimSuffix(meta.Name, ".gdoc") + ".pdf"
		}
	}
	req, _ := http.NewRequest("GET", dlURL, nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}
	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("drive download: %s", string(data))
	}
	return data, meta.Name, nil
}

func DownloadMicrosoftFile(accessToken, itemID string) ([]byte, string, error) {
	metaReq, _ := http.NewRequest("GET", "https://graph.microsoft.com/v1.0/me/drive/items/"+itemID+"?select=name", nil)
	metaReq.Header.Set("Authorization", "Bearer "+accessToken)
	metaResp, err := http.DefaultClient.Do(metaReq)
	if err != nil {
		return nil, "", err
	}
	defer metaResp.Body.Close()
	var meta struct {
		Name string `json:"name"`
	}
	_ = json.NewDecoder(metaResp.Body).Decode(&meta)

	req, _ := http.NewRequest("GET", "https://graph.microsoft.com/v1.0/me/drive/items/"+itemID+"/content", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}
	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("onedrive download: %s", string(data))
	}
	return data, meta.Name, nil
}

func KindFromName(name string) string {
	lower := strings.ToLower(name)
	switch {
	case strings.HasSuffix(lower, ".pdf"):
		return "pdf"
	case strings.HasSuffix(lower, ".doc"), strings.HasSuffix(lower, ".docx"):
		return "doc"
	case strings.HasSuffix(lower, ".md"), strings.HasSuffix(lower, ".markdown"):
		return "md"
	case strings.HasSuffix(lower, ".png"), strings.HasSuffix(lower, ".jpg"), strings.HasSuffix(lower, ".jpeg"):
		return "image"
	default:
		return "txt"
	}
}
