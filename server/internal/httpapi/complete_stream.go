package httpapi

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// completeReq is the browser's request to POST
// /api/workspaces/{id}/complete/stream — a stateless AI completion for the note
// editor (AI menu + Copilot-style continue). Unlike chat it is not persisted.
type completeReq struct {
	Mode    string `json:"mode"` // command | continue
	Prompt  string `json:"prompt,omitempty"`
	Context string `json:"context,omitempty"`
	Model   string `json:"model,omitempty"`
}

// completeStream relays a plain token stream from the Python pipeline's
// /complete/stream to the browser over SSE (data: {type,text}). No DB writes.
func (a *api) completeStream(w http.ResponseWriter, r *http.Request) {
	wsID := id(r)
	if !a.assertWS(w, r, wsID) {
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	var req completeReq
	if err := decode(r, &req); err != nil {
		a.fail(w, err)
		return
	}
	if req.Mode != "continue" {
		req.Mode = "command"
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	send := func(v any) {
		b, _ := json.Marshal(v)
		fmt.Fprintf(w, "data: %s\n\n", b)
		flusher.Flush()
	}

	ctx := r.Context()
	onToken := func(t string) { send(map[string]any{"type": "token", "text": t}) }

	streamErr := a.relayComplete(ctx, wsID, req, onToken)
	if ctx.Err() != nil {
		return
	}
	if streamErr != nil {
		send(map[string]any{"type": "error", "message": streamErr.Error()})
		return
	}
	send(map[string]any{"type": "done"})
}

// relayComplete streams the completion from the Python service, falling back to a
// local placeholder when the pipeline is unavailable so the editor still works.
func (a *api) relayComplete(ctx context.Context, wsID string, req completeReq, onToken func(string)) error {
	if a.pipe == nil {
		a.streamCompleteFallback(ctx, req, onToken)
		return nil
	}
	body := map[string]any{
		"workspaceId": wsID,
		"mode":        req.Mode,
		"prompt":      req.Prompt,
		"context":     req.Context,
		"model":       req.Model,
	}
	rc, err := a.pipe.PostStream(ctx, "/complete/stream", body)
	if err != nil {
		a.streamCompleteFallback(ctx, req, onToken)
		return nil
	}
	defer rc.Close()

	reader := bufio.NewReader(rc)
	for {
		line, err := reader.ReadString('\n')
		if line != "" {
			if payload, ok := strings.CutPrefix(strings.TrimRight(line, "\r\n"), "data:"); ok {
				payload = strings.TrimSpace(payload)
				if payload != "" {
					var ev pipeChatEvent
					if json.Unmarshal([]byte(payload), &ev) == nil {
						switch ev.Type {
						case "token":
							onToken(ev.Text)
						case "error":
							return errors.New(ev.Message)
						}
					}
				}
			}
		}
		if err != nil {
			if err == io.EOF || ctx.Err() != nil {
				return nil
			}
			return err
		}
	}
}

// streamCompleteFallback emits a short placeholder completion word-by-word.
func (a *api) streamCompleteFallback(ctx context.Context, req completeReq, onToken func(string)) {
	var text string
	if req.Mode == "continue" {
		text = " and this continues the thought with a few more sentences. (Pipeline offline — placeholder.)"
	} else {
		text = fmt.Sprintf("AI response%s. (Pipeline offline — placeholder.)", promptSuffix(req.Prompt))
	}
	for _, word := range strings.Fields(text) {
		if ctx.Err() != nil {
			return
		}
		onToken(word + " ")
		time.Sleep(30 * time.Millisecond)
	}
}

func promptSuffix(p string) string {
	p = strings.TrimSpace(p)
	if p == "" {
		return ""
	}
	return " to: " + p
}

// aiCommand is a non-streaming convenience relay for one-shot AI actions. It is
// registered but currently unused by the client (the editor uses the stream);
// kept for parity with the plan's /ai/command endpoint.
func (a *api) aiCommand(w http.ResponseWriter, r *http.Request) {
	wsID := id(r)
	if !a.assertWS(w, r, wsID) {
		return
	}
	var req completeReq
	if err := decode(r, &req); err != nil {
		a.fail(w, err)
		return
	}
	if a.pipe != nil {
		if raw, err := a.pipe.PostRaw(r.Context(), "/ai/command", map[string]any{
			"workspaceId": wsID, "prompt": req.Prompt, "context": req.Context, "model": req.Model,
		}); err == nil {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(raw)
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"text": fmt.Sprintf("AI response%s. (Pipeline offline — placeholder.)", promptSuffix(req.Prompt)),
	})
}
