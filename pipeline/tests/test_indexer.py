"""index_document builds the full corpus graph identically for any backend."""
import unittest

from pipeline.ingest import indexer
from pipeline.llm.embeddings import HashEmbedder
from pipeline.store.memory import MemoryCorpus

TEXT = (
    "Mitochondria are the powerhouse of the cell, producing ATP. "
    "The nucleus stores DNA. Ribosomes carry out protein synthesis."
)


class TestIndexer(unittest.TestCase):
    def setUp(self):
        self.c = MemoryCorpus()
        self.emb = HashEmbedder()
        self.c.add_file("f1", "Biology")
        self.doc_id = indexer.index_document(self.c, self.emb, "ws", "f1", "dataset", [TEXT], pages=1)

    def test_builds_passage(self):
        self.assertEqual(len(self.c.passages), 1)
        self.assertEqual(self.c.doc_file[self.doc_id], "f1")

    def test_builds_sentences(self):
        self.assertGreaterEqual(len(self.c.sentences), 2)

    def test_builds_concepts_and_edges(self):
        self.assertGreater(len(self.c.concepts), 0)
        self.assertGreater(len(self.c.passage_concept), 0)
        self.assertGreater(len(self.c.sentence_concept), 0)

    def test_builds_themes(self):
        themes = next(iter(self.c.passages.values())).themes
        self.assertTrue(themes)
        self.assertLessEqual(len(themes), 4)

    def test_builds_high_and_low_keywords(self):
        levels = {kw.level for kw in self.c.keywords.values()}
        self.assertIn("low", levels)
        self.assertIn("high", levels)

    def test_builds_relations(self):
        self.assertGreater(len(self.c.relations), 0)

    def test_reindex_replaces_document(self):
        indexer.index_document(self.c, self.emb, "ws", "f1", "dataset", [TEXT], pages=1)
        # still exactly one document/passage for the file (no duplication)
        self.assertEqual(len(self.c.passages), 1)

    def test_concept_search_finds_relevant_concept(self):
        out = self.c.concept_search("ws", self.emb.embed(["atp"])[0], 5)
        names = [n for _, n, _ in out]
        self.assertIn("atp", names)


if __name__ == "__main__":
    unittest.main()
