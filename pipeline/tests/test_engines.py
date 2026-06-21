"""End-to-end engine behaviour over an in-memory corpus (no database)."""
import unittest

from pipeline.bench import harness
from pipeline.engines import DenseEngine, get_engine
from pipeline.engines.base import RagEngine
from pipeline.llm.embeddings import HashEmbedder
from pipeline.store.memory import MemoryCorpus


class TestEngineRegistry(unittest.TestCase):
    def test_get_known_engines(self):
        self.assertEqual(get_engine("dense").name, "dense")
        self.assertEqual(get_engine("linearrag").name, "linearrag")
        self.assertEqual(get_engine("lightrag").name, "lightrag")

    def test_unknown_defaults_to_dense(self):
        self.assertIsInstance(get_engine("bogus"), DenseEngine)

    def test_engines_satisfy_protocol(self):
        for name in ("dense", "linearrag", "lightrag"):
            self.assertIsInstance(get_engine(name), RagEngine)


class TestEngineRetrieval(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.emb = HashEmbedder()
        cls.dataset = harness.load_dataset("sample")
        cls.corpus, _ = harness.build_memory_corpus(cls.dataset, cls.emb, ws="ws")

    def _ranked_docs(self, passages):
        seen, docs = set(), []
        for p in passages:
            if p["fileId"] not in seen:
                seen.add(p["fileId"])
                docs.append(p["fileId"])
        return docs

    def test_all_engines_retrieve_relevant_doc(self):
        for name in ("dense", "linearrag", "lightrag"):
            engine = get_engine(name)
            for q in self.dataset.queries:
                docs = self._ranked_docs(engine.retrieve(self.corpus, self.emb, "ws", q["query"], 8))
                relevant = set(q["relevant"])
                self.assertTrue(
                    relevant & set(docs),
                    f"engine={name} q={q['id']} missed {relevant}; got {docs}",
                )

    def test_result_shape(self):
        rows = get_engine("linearrag").retrieve(self.corpus, self.emb, "ws", "ATP", 3)
        self.assertTrue(rows)
        for r in rows:
            self.assertEqual({"passageId", "text", "fileId", "fileName", "score"}, set(r.keys()))

    def test_k_limit_respected(self):
        rows = get_engine("dense").retrieve(self.corpus, self.emb, "ws", "cell", 2)
        self.assertLessEqual(len(rows), 2)

    def test_empty_workspace_returns_empty(self):
        empty = MemoryCorpus()
        for name in ("dense", "linearrag", "lightrag"):
            self.assertEqual(get_engine(name).retrieve(empty, self.emb, "ws", "anything", 5), [])


if __name__ == "__main__":
    unittest.main()
