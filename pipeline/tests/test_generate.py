"""Study-artifact generation — extractive fallbacks (no LLM) + validation."""
import unittest

from pipeline import generate
from pipeline.llm.client import LLMClient

PASSAGES = [
    {"passageId": "p1", "text": "Mitochondria produce ATP. The cell is the basic unit of life.", "fileId": "f1", "fileName": "bio"},
    {"passageId": "p2", "text": "Osmosis is the diffusion of water across a membrane. Diffusion moves particles down a gradient.", "fileId": "f1", "fileName": "bio"},
]


class TestGenerateFallbacks(unittest.TestCase):
    def setUp(self):
        self.llm = LLMClient()  # no API key configured → extractive path
        self.assertFalse(self.llm.available)

    def test_summary_bullets(self):
        out = generate.build_summary(PASSAGES, {"length": "brief", "format": "bullets"}, self.llm)
        self.assertEqual(out["kind"], "summary")
        self.assertTrue(out["body"])
        self.assertIn("•", out["body"])

    def test_summary_prose(self):
        out = generate.build_summary(PASSAGES, {"format": "prose"}, self.llm)
        self.assertNotIn("•", out["body"])

    def test_flashcards_shape(self):
        out = generate.build_flashcards(PASSAGES, {"count": 3}, self.llm)
        self.assertEqual(out["kind"], "flashcards")
        self.assertLessEqual(len(out["cards"]), 3)
        for c in out["cards"]:
            self.assertEqual({"id", "deckId", "front", "back", "known"}, set(c.keys()))

    def test_quiz_shape_and_count(self):
        out = generate.build_quiz(PASSAGES, {"count": 3, "types": ["fill"], "difficulty": ["easy"]}, self.llm)
        self.assertEqual(out["kind"], "quiz")
        self.assertLessEqual(len(out["questions"]), 3)
        for q in out["questions"]:
            self.assertIn("type", q)
            self.assertIn("prompt", q)

    def test_generate_dispatch(self):
        self.assertEqual(generate.generate("summary", PASSAGES, {}, self.llm)["kind"], "summary")
        self.assertEqual(generate.generate("flashcards", PASSAGES, {}, self.llm)["kind"], "flashcards")
        self.assertEqual(generate.generate("quiz", PASSAGES, {}, self.llm)["kind"], "quiz")


class TestQuestionValidation(unittest.TestCase):
    def test_valid_mcq(self):
        q = generate._norm_question({"type": "mcq", "prompt": "Q?", "options": ["a", "b"], "correct": [0]})
        self.assertIsNotNone(q)
        self.assertEqual(q["type"], "mcq")

    def test_mcq_missing_options_rejected(self):
        self.assertIsNone(generate._norm_question({"type": "mcq", "prompt": "Q?", "correct": [0]}))

    def test_unknown_type_rejected(self):
        self.assertIsNone(generate._norm_question({"type": "essay", "prompt": "Q?"}))

    def test_missing_prompt_rejected(self):
        self.assertIsNone(generate._norm_question({"type": "boolean"}))

    def test_boolean_coerces_correct(self):
        q = generate._norm_question({"type": "boolean", "prompt": "True?", "correct": 1})
        self.assertIs(q["correct"], True)

    def test_fill_requires_accepted(self):
        self.assertIsNone(generate._norm_question({"type": "fill", "prompt": "__?"}))
        ok = generate._norm_question({"type": "fill", "prompt": "__?", "accepted": ["x"]})
        self.assertEqual(ok["accepted"], ["x"])


class TestJsonArray(unittest.TestCase):
    def test_extracts_array_from_prose(self):
        out = generate._json_array('Sure! [{"a":1}] done')
        self.assertEqual(out, [{"a": 1}])

    def test_handles_garbage(self):
        self.assertEqual(generate._json_array("no json here"), [])
        self.assertEqual(generate._json_array(""), [])


if __name__ == "__main__":
    unittest.main()
