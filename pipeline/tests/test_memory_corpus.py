"""In-memory corpus: cosine search + upsert/dedup + reset semantics."""
import unittest

from pipeline.store.memory import MemoryCorpus, cosine


class TestCosine(unittest.TestCase):
    def test_identical_vectors(self):
        self.assertAlmostEqual(cosine([1.0, 0.0], [1.0, 0.0]), 1.0)

    def test_orthogonal(self):
        self.assertAlmostEqual(cosine([1.0, 0.0], [0.0, 1.0]), 0.0)

    def test_zero_vector_safe(self):
        self.assertEqual(cosine([0.0, 0.0], [1.0, 1.0]), 0.0)


class TestMemoryCorpus(unittest.TestCase):
    def setUp(self):
        self.c = MemoryCorpus()
        self.ws = "ws"
        self.c.add_file("f1", "File One")
        self.doc = self.c.insert_document("f1", self.ws, "dataset", 1)

    def test_dense_search_orders_by_cosine(self):
        self.c.insert_passage(self.doc, self.ws, 0, "alpha", [], [1.0, 0.0, 0.0])
        self.c.insert_passage(self.doc, self.ws, 1, "beta", [], [0.0, 1.0, 0.0])
        out = self.c.dense_search(self.ws, [0.9, 0.1, 0.0], 2)
        self.assertEqual(out[0]["text"], "alpha")
        self.assertEqual(out[0]["fileId"], "f1")
        self.assertEqual(out[0]["fileName"], "File One")
        self.assertGreaterEqual(out[0]["score"], out[1]["score"])

    def test_workspace_isolation(self):
        self.c.insert_passage(self.doc, self.ws, 0, "alpha", [], [1.0, 0.0])
        self.assertEqual(self.c.dense_search("other", [1.0, 0.0], 5), [])

    def test_upsert_concept_dedups(self):
        a = self.c.upsert_concept(self.ws, "atp", [1.0, 0.0])
        b = self.c.upsert_concept(self.ws, "atp", [1.0, 0.0])
        self.assertEqual(a, b)
        self.assertEqual(len(self.c.concepts), 1)

    def test_passages_for_concepts_aggregates_weight(self):
        p = self.c.insert_passage(self.doc, self.ws, 0, "p", [], [1.0])
        cid = self.c.upsert_concept(self.ws, "atp", [1.0])
        self.c.link_passage_concept(p, cid, 2.0)
        rows = self.c.passages_for_concepts(self.ws, [cid], 5)
        self.assertEqual(rows[0]["passageId"], p)
        self.assertEqual(rows[0]["w"], 2.0)

    def test_relation_neighbors_symmetric(self):
        self.c.add_relation(self.ws, "cB", "cA", 1.0)  # stored sorted as (cA,cB)
        self.c.add_relation(self.ws, "cA", "cB", 1.0)  # accumulates weight
        nbrs = dict(self.c.relation_neighbors(self.ws, ["cA"]))
        self.assertIn("cB", nbrs)
        self.assertEqual(nbrs["cB"], 2.0)

    def test_keyword_search_filters_by_level(self):
        self.c.upsert_keyword(self.ws, "energy", "high", [1.0, 0.0])
        self.c.upsert_keyword(self.ws, "atp", "low", [1.0, 0.0])
        hi = self.c.keyword_search(self.ws, [1.0, 0.0], "high", 5)
        self.assertEqual(len(hi), 1)
        self.assertEqual(hi[0][1], "energy")

    def test_reset_document_clears_rows(self):
        p = self.c.insert_passage(self.doc, self.ws, 0, "p", [], [1.0])
        cid = self.c.upsert_concept(self.ws, "atp", [1.0])
        self.c.link_passage_concept(p, cid)
        self.c.reset_document("f1")
        self.assertEqual(self.c.dense_search(self.ws, [1.0], 5), [])
        self.assertEqual(self.c.passage_concept_edges(self.ws), [])


if __name__ == "__main__":
    unittest.main()
