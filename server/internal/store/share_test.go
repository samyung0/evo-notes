package store

import (
	"testing"

	"github.com/evonotes/server/internal/mdblock"
)

func TestRewriteCardIDs(t *testing.T) {
	source, err := mdblock.FlashcardsContent("Deck", []mdblock.CardContent{
		{ID: "c_old_1", Front: "A", Back: "B"},
		{ID: "c_old_2", Front: "C", Back: "D"},
	})
	if err != nil {
		t.Fatal(err)
	}

	cloned, ids, err := rewriteCardIDs("Deck", source)
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 2 || ids[0] == "c_old_1" || ids[1] == "c_old_2" || ids[0] == ids[1] {
		t.Fatalf("expected two fresh unique ids, got %#v", ids)
	}
	cards, err := mdblock.ParseFlashcards(cloned)
	if err != nil {
		t.Fatal(err)
	}
	if cards[0].ID != ids[0] || cards[0].Front != "A" || cards[0].Back != "B" {
		t.Fatalf("cloned card content changed: %#v", cards[0])
	}
}
