package httpapi

import (
	"net/http"
)

// transcribe proxies an uploaded audio blob (multipart field "file") to the
// Python pipeline's /transcribe (Whisper) and returns {"text": ...}. When the
// pipeline is unavailable it returns an empty transcript so the editor degrades
// gracefully rather than erroring.
func (a *api) transcribe(w http.ResponseWriter, r *http.Request) {
	if a.pipe == nil {
		writeJSON(w, http.StatusOK, map[string]string{"text": ""})
		return
	}
	if err := r.ParseMultipartForm(32 << 20); err != nil { // 32 MiB
		a.fail(w, err)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		a.fail(w, err)
		return
	}
	defer file.Close()

	name := hdr.Filename
	if name == "" {
		name = "audio.webm"
	}
	raw, err := a.pipe.PostMultipart(r.Context(), "/transcribe", name, file)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]string{"text": ""})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(raw)
}
