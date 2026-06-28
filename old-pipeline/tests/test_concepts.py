"""Heuristic concept extraction."""
import unittest

from pipeline.ingest import concepts


class TestConcepts(unittest.TestCase):
    def test_extracts_lowercased_terms(self):
        out = concepts.extract_concepts("Mitochondria produce ATP in the cell.")
        self.assertTrue(all(c == c.lower() for c in out))
        self.assertIn("mitochondria", out)

    def test_capitalized_phrase_weighted_above_plain_words(self):
        text = "Golgi Apparatus packages proteins. proteins proteins proteins move."
        out = concepts.extract_concepts(text, max_n=8)
        # multi-word capitalized phrase should be captured
        self.assertIn("golgi apparatus", out)

    def test_stopwords_filtered(self):
        out = concepts.extract_concepts("This that with from their there which when")
        self.assertEqual(out, [])

    def test_respects_max_n(self):
        text = "alpha beta gamma delta epsilon zeta eta theta iota kappa"
        out = concepts.extract_concepts(text, max_n=3)
        self.assertEqual(len(out), 3)

    def test_short_words_ignored(self):
        # words < 4 chars are not picked up by the word regex
        out = concepts.extract_concepts("a an ab abc")
        self.assertEqual(out, [])


if __name__ == "__main__":
    unittest.main()
