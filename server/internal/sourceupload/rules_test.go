package sourceupload

import (
	"strings"
	"testing"
)

func TestKindFromNameUsesFrontendExtensionMap(t *testing.T) {
	tests := map[string]string{
		"notes.pdf":         "pdf",
		"report.DOCX":       "doc",
		"readme.mdc":        "md",
		"script.py":         "txt",
		"data.csv":          "sheet",
		"state.json":        "json",
		"no-extension":      "unknown",
		"archive.zip":       "unknown",
		"component.h++":     "txt",
		"configuration.YML": "txt",
	}
	for name, want := range tests {
		if got := KindFromName(name); got != want {
			t.Errorf("KindFromName(%q) = %q, want %q", name, got, want)
		}
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name      string
		kind      string
		mode      string
		size      int64
		wantError string
	}{
		{name: "notes.pdf", kind: "pdf", mode: ParseModeNormal, size: 1},
		{name: "script.py", kind: "txt", mode: ParseModeNone, size: 1},
		{name: "notes.pdf", kind: "pdf", mode: ParseModeNormal, size: NormalMaxBytes + 1, wantError: "10 MB"},
		{name: "notes.pdf", kind: "txt", mode: ParseModeNormal, size: 1, wantError: "does not match"},
		{name: "archive.zip", kind: "unknown", mode: ParseModeNone, size: 1, wantError: "not supported"},
		{name: "notes.pdf", kind: "pdf", mode: "invalid", size: 1, wantError: "unknown parse mode"},
	}
	for _, test := range tests {
		t.Run(test.name+"-"+test.mode, func(t *testing.T) {
			err := Validate(test.name, test.kind, test.mode, test.size)
			if test.wantError == "" {
				if err != nil {
					t.Fatalf("Validate returned unexpected error: %v", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), test.wantError) {
				t.Fatalf("Validate error = %v, want substring %q", err, test.wantError)
			}
		})
	}
}

func TestParsePolicyLists(t *testing.T) {
	advanced := ParseExtensions(ParseModeAdvanced)
	normal := ParseExtensions(ParseModeNormal)
	supported := SupportedExtensions()
	if !contains(advanced, ".doc") || !contains(advanced, ".pptx") {
		t.Fatalf("advanced policy is missing expected extensions: %v", advanced)
	}
	if !contains(normal, ".docx") || contains(normal, ".doc") {
		t.Fatalf("normal policy has unexpected extensions: %v", normal)
	}
	if !contains(supported, ".py") || !contains(supported, ".mdc") || contains(supported, ".zip") {
		t.Fatalf("supported policy does not mirror the frontend allowlist: %v", supported)
	}
}

func contains(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
