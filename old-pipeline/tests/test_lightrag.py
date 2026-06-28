"""LightRAG LLM-graph build + dual-level retrieval over the in-memory corpus.

Uses a stub extraction LLM (no network) plus the deterministic HashEmbedder so
the graph builder, the lr_* store helpers, and the engine's merge logic are all
exercised offline.
"""
import unittest

from pipeline.ingest import indexer, lightrag_index
from pipeline.engines.lightrag import LightRagEngine
from pipeline.llm.embeddings import HashEmbedder
from pipeline.store.memory import MemoryCorpus


_GRAPH = {
    "entities": [
        {"name": "mitochondria", "type": "concept", "description": "organelle that produces ATP in the cell"},
        {"name": "atp", "type": "concept", "description": "the energy currency of the cell"},
    ],
    "relations": [
        {"source": "mitochondria", "target": "atp", "description": "mitochondria produce atp", "keywords": ["produce"], "strength": 9},
    ],
    "themes": ["cell biology"],
}


class StubLLM:
    """Minimal LLMClient stand-in: an available extraction role returning a fixed
    graph, and an unavailable keywords role (so the engine uses the query vector)."""

    def available_role(self, role):
        return role == "extraction"

    def complete_json(self, prompt, system="", role="extraction", max_tokens=None):
        return dict(_GRAPH)


class TestLightRagIndex(unittest.TestCase):
    def setUp(self):
        self.emb = HashEmbedder()
        self.ws = "ws_test"
        self.corpus = MemoryCorpus()
        self.corpus.add_file("f1", "Cell Biology")
        self.doc_id = indexer.index_document(
            self.corpus, self.emb, self.ws, "f1", "test",
            ["Mitochondria produce ATP in the cell. ATP is the energy currency."],
            pages=1,
        )
        lightrag_index.build(self.corpus, self.emb, StubLLM(), self.ws, "f1", self.doc_id)

    def test_entities_and_theme_stored(self):
        names = {e.name for e in self.corpus.lr_entities.values()}
        self.assertIn("mitochondria", names)
        self.assertIn("atp", names)
        self.assertIn("cell biology", names)  # theme stored as a 'theme' entity

    def test_relation_stored_symmetric(self):
        self.assertEqual(len(self.corpus.lr_relations), 1)
        rel = next(iter(self.corpus.lr_relations.values()))
        self.assertEqual({rel.src, rel.dst}, {self._eid("mitochondria"), self._eid("atp")})

    def test_entity_dedupe_across_passages(self):
        # Re-running the build (a second "passage" worth of the same graph) must
        # not duplicate entities — upsert merges by canonical name.
        lightrag_index.build(self.corpus, self.emb, StubLLM(), self.ws, "f1", self.doc_id)
        names = [e.name for e in self.corpus.lr_entities.values()]
        self.assertEqual(len(names), len(set(names)))

    def test_passages_for_entities(self):
        eid = self._eid("atp")
        rows = self.corpus.passages_for_entities(self.ws, [eid], 10)
        self.assertTrue(rows)
        self.assertEqual(rows[0]["fileId"], "f1")

    def test_retrieval_returns_passage(self):
        engine = LightRagEngine()  # its own LLMClient has no keys -> query-vector fallback
        out = engine.retrieve(self.corpus, self.emb, self.ws, "what do mitochondria produce", 3)
        self.assertTrue(out)
        self.assertEqual(out[0]["fileId"], "f1")
        self.assertIn("score", out[0])

    def _eid(self, name):
        return self.corpus._lr_entity_by_name[(self.ws, name)]


class TestLinearRagIsolation(unittest.TestCase):
    """Building the lightrag graph must not touch the shared regex corpus that
    LinearRAG reads."""

    def test_shared_corpus_untouched_by_lightrag_build(self):
        emb = HashEmbedder()
        ws = "ws_iso"
        corpus = MemoryCorpus()
        corpus.add_file("f1", "Doc")
        doc_id = indexer.index_document(corpus, emb, ws, "f1", "test", ["Mitochondria produce ATP."], pages=1)

        concepts_before = dict(corpus.concepts)
        edges_before = list(corpus.passage_concept)

        lightrag_index.build(corpus, emb, StubLLM(), ws, "f1", doc_id)

        self.assertEqual(corpus.concepts, concepts_before)
        self.assertEqual(corpus.passage_concept, edges_before)


if __name__ == "__main__":
    unittest.main()
