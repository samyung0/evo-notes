// Package pipeline is a thin HTTP client for the Python retrieval/generate
// service. The gateway calls it synchronously for chat and generate; on any
// error the caller falls back to a local placeholder so the app keeps working
// even when the pipeline is down.
package pipeline

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	base string
	hc   *http.Client
}

func New(base string) *Client {
	return &Client{base: strings.TrimRight(base, "/"), hc: &http.Client{Timeout: 90 * time.Second}}
}

// PostRaw posts body as JSON and returns the raw JSON response.
func (c *Client) PostRaw(ctx context.Context, path string, body any) (json.RawMessage, error) {
	buf, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.base+path, bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := c.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("pipeline %s: %s", path, res.Status)
	}
	return data, nil
}
