"""Retrieval service endpoint logic, exercised offline by monkeypatching the DB
and engine (no Postgres needed)."""
import unittest

import pipeline.retrieve.service as svc

PASSAGES = [
    {"passageId": "p1", "text": "Mitochondria produce ATP for the cell.", "fileId": "f1", "fileName": "bio", "score": 0.9},
    {"passageId": "p2", "text": "The nucleus stores DNA.", "fileId": "f1", "fileName": "bio", "score": 0.5},
]


class _Cur:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _Conn:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def cursor(self):
        return _Cur()


class _Corpus:
    def __init__(self, conn):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _Engine:
    name = "fake"

    def retrieve(self, corpus, embedder, ws, query, k):
        return PASSAGES[:k]


class TestService(unittest.TestCase):
    def setUp(self):
        self._engine = svc._engine
        self._connect = svc.db.connect
        self._pg = svc.PgCorpus
        svc._engine = _Engine()
        svc.db.connect = lambda: _Conn()
        svc.PgCorpus = _Corpus

    def tearDown(self):
        svc._engine = self._engine
        svc.db.connect = self._connect
        svc.PgCorpus = self._pg

    def test_healthz(self):
        out = svc.healthz()
        self.assertTrue(out["ok"])
        self.assertIn("engine", out)

    def test_retrieve_returns_passages(self):
        out = svc.retrieve(svc.RetrieveReq(query="atp", workspaceId="ws", k=2))
        self.assertEqual(len(out["passages"]), 2)
        self.assertEqual(out["passages"][0]["passageId"], "p1")

    def test_chat_fallback_without_llm(self):
        out = svc.chat(svc.ChatReq(query="what makes atp?", workspaceId="ws", k=2))
        self.assertEqual(out["role"], "assistant")
        self.assertEqual(len(out["citations"]), 2)
        self.assertIn("Mitochondria", out["text"])  # extractive: top passage text

    def test_generate_summary_offline(self):
        svc.db.workspace_passages = lambda cur, ws, limit=24: PASSAGES
        out = svc.generate(svc.GenerateReq(workspaceId="ws", kind="summary"))
        self.assertEqual(out["kind"], "summary")


if __name__ == "__main__":
    unittest.main()
