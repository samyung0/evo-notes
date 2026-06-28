"""Personalized PageRank over the passage-concept bipartite graph."""
import unittest

from pipeline.engines.ppr import personalized_pagerank


class TestPPR(unittest.TestCase):
    def test_empty_graph(self):
        self.assertEqual(personalized_pagerank([], {}), {})

    def test_restart_biases_connected_passage(self):
        # p1 - cA ; p2 - cB. Restart on cA should favour p1 over p2.
        edges = [("p1", "cA", 1.0), ("p2", "cB", 1.0)]
        ranks = personalized_pagerank(edges, {"cA": 1.0})
        self.assertGreater(ranks["p1"], ranks["p2"])

    def test_shared_concept_propagates(self):
        # p1 and p2 both link to cA; activating cA lifts both above an isolated p3.
        edges = [("p1", "cA", 1.0), ("p2", "cA", 1.0), ("p3", "cB", 1.0)]
        ranks = personalized_pagerank(edges, {"cA": 1.0})
        self.assertGreater(ranks["p1"], ranks["p3"])
        self.assertGreater(ranks["p2"], ranks["p3"])

    def test_uniform_fallback_when_no_activation(self):
        edges = [("p1", "cA", 1.0), ("p2", "cB", 1.0)]
        ranks = personalized_pagerank(edges, {})  # empty personalization
        # symmetric graph → roughly equal mass on the two passages
        self.assertAlmostEqual(ranks["p1"], ranks["p2"], places=6)

    def test_scores_are_finite_and_nonnegative(self):
        edges = [("p1", "cA", 2.0), ("p1", "cB", 1.0), ("p2", "cB", 1.0)]
        ranks = personalized_pagerank(edges, {"cA": 1.0, "cB": 0.5})
        for v in ranks.values():
            self.assertGreaterEqual(v, 0.0)
            self.assertEqual(v, v)  # not NaN


if __name__ == "__main__":
    unittest.main()
