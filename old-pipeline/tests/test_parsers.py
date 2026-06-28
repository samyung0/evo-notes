"""Parser registry, chunking, and the dependency-free SimpleParser."""
import os
import tempfile
import unittest

from pipeline.parsers import ParseOpts, chunk_text, get_parser
from pipeline.parsers.docling import DoclingParser
from pipeline.parsers.mineru import MinerUParser
from pipeline.parsers.simple import SimpleParser


class TestChunking(unittest.TestCase):
    def test_paragraph_aware_chunking(self):
        text = "\n\n".join([f"Paragraph number {i} with some words." for i in range(20)])
        chunks = chunk_text(text, target=120)
        self.assertGreater(len(chunks), 1)
        for c in chunks:
            self.assertTrue(c.strip())

    def test_small_text_single_chunk(self):
        chunks = chunk_text("just one short paragraph", target=900)
        self.assertEqual(len(chunks), 1)

    def test_empty_text(self):
        self.assertEqual(chunk_text("", target=900), [])


class TestSimpleParser(unittest.TestCase):
    def _write(self, name, content):
        d = tempfile.mkdtemp()
        path = os.path.join(d, name)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
        return path

    def test_markdown(self):
        path = self._write("a.md", "# Heading\n\nFirst para.\n\nSecond para.")
        doc = SimpleParser().parse(path, ParseOpts())
        self.assertEqual(doc.meta["parser"], "simple")
        self.assertEqual(doc.pages, 1)
        self.assertTrue(any("First para" in p for p in doc.passages))

    def test_unknown_extension_read_as_text(self):
        path = self._write("a.weird", "plain content here")
        doc = SimpleParser().parse(path, ParseOpts())
        self.assertTrue(any("plain content" in p for p in doc.passages))


class TestRegistryFallback(unittest.TestCase):
    def test_unknown_name_returns_simple(self):
        self.assertIsInstance(get_parser("nope"), SimpleParser)

    def test_docling_falls_back_when_uninstalled(self):
        # Docling isn't installed in CI → registry must degrade to SimpleParser.
        p = get_parser("docling")
        self.assertIsInstance(p, SimpleParser)

    def test_mineru_falls_back_when_uninstalled(self):
        p = get_parser("mineru")
        self.assertIsInstance(p, SimpleParser)

    def test_docling_constructor_raises_runtime_error(self):
        with self.assertRaises(RuntimeError):
            DoclingParser()

    def test_mineru_constructor_raises_runtime_error(self):
        with self.assertRaises(RuntimeError):
            MinerUParser()


if __name__ == "__main__":
    unittest.main()
