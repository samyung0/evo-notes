"""Sentence normalization."""
import unittest

from pipeline.ingest import normalize


class TestNormalize(unittest.TestCase):
    def test_splits_on_terminators(self):
        out = normalize.split_sentences("The cell is small. Mitochondria make energy! Is that right?")
        self.assertEqual(len(out), 3)

    def test_drops_short_fragments(self):
        out = normalize.split_sentences("Hi. The nucleus stores genetic information.")
        # "Hi." is < 12 chars → dropped
        self.assertEqual(len(out), 1)
        self.assertIn("nucleus", out[0])

    def test_newlines_become_spaces(self):
        out = normalize.split_sentences("Photosynthesis happens\nin chloroplasts here.")
        self.assertEqual(len(out), 1)
        self.assertNotIn("\n", out[0])

    def test_empty(self):
        self.assertEqual(normalize.split_sentences(""), [])


if __name__ == "__main__":
    unittest.main()
