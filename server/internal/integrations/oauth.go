package integrations

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/evonotes/server/internal/sourceupload"
)

// Providers supported for file import. OAuth token management lives in Clerk
// (see clerk.go); this file only talks to the providers' file APIs.
const (
	ProviderGoogle    = "google"
	ProviderMicrosoft = "microsoft"
	ProviderNotion    = "notion"
)

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
	return sourceupload.KindFromName(name)
}
