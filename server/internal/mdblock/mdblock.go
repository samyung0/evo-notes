// Package mdblock reads and writes the custom fenced code blocks that make
// markdown the single source of truth for generated study materials.
//
// A material's `content` is a markdown document. Quizzes and flashcards embed
// their structured payload inside a fenced block whose language is the artifact
// kind:
//
//	```quiz
//	questions: [ ... ]
//	timeLimitMin: 20
//	```
//
//	```flashcards
//	cards: [ ... ]
//	```
//
// The payload is YAML. Because JSON is a subset of YAML, blocks backfilled from
// the legacy jsonb tables (which embed raw JSON) parse identically; the app
// re-serializes to clean YAML on the next write.
package mdblock

import (
	"encoding/json"
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

// CardContent is one flashcard's authored content (front/back) plus a stable id.
// Per-user scheduling state (FSRS) lives in the card_stats table, never here.
type CardContent struct {
	ID    string `json:"id" yaml:"id"`
	Front string `json:"front" yaml:"front"`
	Back  string `json:"back" yaml:"back"`
}

// ExtractFence returns the body of the first ```<lang> fenced block in content.
func ExtractFence(content, lang string) (string, bool) {
	lines := strings.Split(content, "\n")
	open := "```" + lang
	for i := 0; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) != open {
			continue
		}
		body := make([]string, 0, len(lines)-i)
		for j := i + 1; j < len(lines); j++ {
			if strings.TrimSpace(lines[j]) == "```" {
				return strings.Join(body, "\n"), true
			}
			body = append(body, lines[j])
		}
		return strings.Join(body, "\n"), true // unterminated fence
	}
	return "", false
}

// ParseQuiz extracts the quiz fence and returns the questions as JSON (the shape
// the frontend Question union expects) plus the optional time limit.
func ParseQuiz(content string) (json.RawMessage, *int, error) {
	body, ok := ExtractFence(content, "quiz")
	if !ok {
		return json.RawMessage("[]"), nil, nil
	}
	var doc struct {
		TimeLimitMin *int        `yaml:"timeLimitMin"`
		Questions    interface{} `yaml:"questions"`
	}
	if err := yaml.Unmarshal([]byte(body), &doc); err != nil {
		return nil, nil, fmt.Errorf("parse quiz block: %w", err)
	}
	if doc.Questions == nil {
		doc.Questions = []interface{}{}
	}
	b, err := json.Marshal(doc.Questions)
	if err != nil {
		return nil, nil, err
	}
	return json.RawMessage(b), doc.TimeLimitMin, nil
}

// quizFenceBody renders the YAML payload for a quiz block from JSON questions.
func quizFenceBody(questions json.RawMessage, timeLimit *int) (string, error) {
	var qs interface{} = []interface{}{}
	if len(questions) > 0 {
		if err := json.Unmarshal(questions, &qs); err != nil {
			return "", err
		}
	}
	doc := map[string]interface{}{"questions": qs}
	if timeLimit != nil {
		doc["timeLimitMin"] = *timeLimit
	}
	b, err := yaml.Marshal(doc)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// QuizContent builds a full quiz markdown document (heading + quiz fence).
func QuizContent(title string, questions json.RawMessage, timeLimit *int) (string, error) {
	body, err := quizFenceBody(questions, timeLimit)
	if err != nil {
		return "", err
	}
	if title == "" {
		title = "Quiz"
	}
	return fmt.Sprintf("# %s\n\n```quiz\n%s```\n", title, body), nil
}

// ParseFlashcards extracts the flashcards fence and returns the authored cards.
func ParseFlashcards(content string) ([]CardContent, error) {
	body, ok := ExtractFence(content, "flashcards")
	if !ok {
		return []CardContent{}, nil
	}
	var doc struct {
		Cards []CardContent `yaml:"cards"`
	}
	if err := yaml.Unmarshal([]byte(body), &doc); err != nil {
		return nil, fmt.Errorf("parse flashcards block: %w", err)
	}
	if doc.Cards == nil {
		doc.Cards = []CardContent{}
	}
	return doc.Cards, nil
}

// FlashcardsContent builds a full flashcards markdown document (heading + fence).
func FlashcardsContent(title string, cards []CardContent) (string, error) {
	if cards == nil {
		cards = []CardContent{}
	}
	b, err := yaml.Marshal(map[string]interface{}{"cards": cards})
	if err != nil {
		return "", err
	}
	if title == "" {
		title = "Flashcards"
	}
	return fmt.Sprintf("# %s\n\n```flashcards\n%s```\n", title, string(b)), nil
}
