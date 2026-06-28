"""Ranking metrics: reciprocal rank, recall@k, nDCG@k."""
import math
import unittest

from pipeline.bench import metrics


class TestMetrics(unittest.TestCase):
    def test_reciprocal_rank_positions(self):
        rel = {"a"}
        self.assertEqual(metrics.reciprocal_rank(["a", "b", "c"], rel), 1.0)
        self.assertEqual(metrics.reciprocal_rank(["b", "a", "c"], rel), 0.5)
        self.assertAlmostEqual(metrics.reciprocal_rank(["b", "c", "a"], rel), 1 / 3)

    def test_reciprocal_rank_miss(self):
        self.assertEqual(metrics.reciprocal_rank(["x", "y"], {"a"}), 0.0)
        self.assertEqual(metrics.reciprocal_rank([], {"a"}), 0.0)

    def test_recall_at_k(self):
        ranked = ["a", "b", "c", "d"]
        rel = {"a", "c"}
        self.assertEqual(metrics.recall_at_k(ranked, rel, 1), 0.5)
        self.assertEqual(metrics.recall_at_k(ranked, rel, 3), 1.0)
        self.assertEqual(metrics.recall_at_k(ranked, rel, 4), 1.0)

    def test_recall_empty_relevant(self):
        self.assertEqual(metrics.recall_at_k(["a"], set(), 3), 0.0)

    def test_ndcg_perfect_is_one(self):
        ranked = ["a", "b", "c"]
        rel = {"a", "b"}
        self.assertAlmostEqual(metrics.ndcg_at_k(ranked, rel, 3), 1.0)

    def test_ndcg_order_matters(self):
        rel = {"a"}
        top = metrics.ndcg_at_k(["a", "b", "c"], rel, 3)
        worse = metrics.ndcg_at_k(["b", "c", "a"], rel, 3)
        self.assertGreater(top, worse)
        # nDCG with single relevant at rank 3 == 1/log2(4)
        self.assertAlmostEqual(worse, (1 / math.log2(4)))

    def test_ndcg_no_relevant(self):
        self.assertEqual(metrics.ndcg_at_k(["a", "b"], set(), 2), 0.0)

    def test_mean(self):
        self.assertEqual(metrics.mean([1.0, 0.0, 0.5]), 0.5)
        self.assertEqual(metrics.mean([]), 0.0)


if __name__ == "__main__":
    unittest.main()
