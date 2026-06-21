"""Benchmark harness + report formatting."""
import os
import tempfile
import unittest

from pipeline.bench import harness, report


class TestDatasetLoading(unittest.TestCase):
    def test_load_bundled_by_name(self):
        ds = harness.load_dataset("sample")
        self.assertEqual(ds.name, "sample-bio-calc")
        self.assertEqual(ds.n_docs, 4)
        self.assertTrue(ds.queries)

    def test_list_datasets_includes_bundled(self):
        names = harness.list_datasets()
        self.assertIn("sample", names)
        self.assertIn("multihop", names)

    def test_missing_dataset_raises(self):
        with self.assertRaises(FileNotFoundError):
            harness.load_dataset("does-not-exist")


class TestRetrievalBenchmark(unittest.TestCase):
    def test_metrics_in_range(self):
        ds = harness.load_dataset("sample")
        results = harness.run_retrieval_benchmark(ds, ["dense", "linearrag", "lightrag"], ks=(1, 3))
        self.assertEqual(len(results), 3)
        for r in results:
            self.assertEqual(r.n_queries, 4)
            self.assertGreater(r.index_build_s, 0.0)
            for k in (1, 3):
                self.assertGreaterEqual(r.recall[k], 0.0)
                self.assertLessEqual(r.recall[k], 1.0)
                self.assertGreaterEqual(r.ndcg[k], 0.0)
                self.assertLessEqual(r.ndcg[k], 1.0)
            self.assertGreaterEqual(r.mrr, 0.0)
            self.assertLessEqual(r.mrr, 1.0)

    def test_dense_recovers_all_relevant_within_topk(self):
        ds = harness.load_dataset("sample")
        [res] = harness.run_retrieval_benchmark(ds, ["dense"], ks=(3,))
        # every sample query has its single relevant doc; recall@3 should be perfect
        self.assertEqual(res.recall[3], 1.0)

    def test_unknown_backend_raises(self):
        ds = harness.load_dataset("sample")
        with self.assertRaises(ValueError):
            harness.run_retrieval_benchmark(ds, ["dense"], backend="redis")

    def test_engine_result_as_dict(self):
        ds = harness.load_dataset("sample")
        [res] = harness.run_retrieval_benchmark(ds, ["dense"], ks=(1,))
        d = res.as_dict()
        self.assertEqual(d["engine"], "dense")
        self.assertIn("recall", d)
        self.assertIn("avgQueryMs", d)


class TestParserBenchmark(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.path = os.path.join(self.dir, "doc.md")
        with open(self.path, "w", encoding="utf-8") as fh:
            fh.write("# Cells\n\nMitochondria make ATP.\n\nThe nucleus stores DNA.")

    def test_runs_and_counts(self):
        [res] = harness.run_parser_benchmark([self.path], ["simple"])
        self.assertEqual(res.files, 1)
        self.assertGreater(res.passages, 0)
        self.assertGreater(res.chars, 0)
        self.assertEqual(res.ran_as, "simple")

    def test_directory_expansion(self):
        [res] = harness.run_parser_benchmark([self.dir], ["simple"])
        self.assertEqual(res.files, 1)

    def test_coverage_with_truth(self):
        # ground truth shares tokens with the parsed text → coverage > 0
        with open(os.path.join(self.dir, "doc.truth.txt"), "w", encoding="utf-8") as fh:
            fh.write("Mitochondria make ATP. The nucleus stores DNA.")
        [res] = harness.run_parser_benchmark([self.path], ["simple"])
        self.assertIsNotNone(res.coverage)
        self.assertGreater(res.coverage, 0.5)

    def test_fallback_recorded(self):
        [res] = harness.run_parser_benchmark([self.path], ["docling"])
        self.assertEqual(res.parser, "docling")
        self.assertEqual(res.ran_as, "simple")  # not installed → fallback


class TestReport(unittest.TestCase):
    def test_format_table_alignment(self):
        out = report.format_table(["a", "bb"], [[1, 2], [333, 4]])
        lines = out.splitlines()
        self.assertEqual(len(lines), 4)  # header + sep + 2 rows
        self.assertIn("a", lines[0])

    def test_retrieval_table_renders(self):
        ds = harness.load_dataset("sample")
        results = harness.run_retrieval_benchmark(ds, ["dense"], ks=(1, 3))
        text = report.retrieval_table(ds.name, results, (1, 3))
        self.assertIn("dense", text)
        self.assertIn("R@1", text)

    def test_parser_json_valid(self):
        import json
        path = tempfile.mktemp(suffix=".md")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("hello world")
        results = harness.run_parser_benchmark([path], ["simple"])
        parsed = json.loads(report.parser_json(results))
        self.assertEqual(parsed["parsers"][0]["parser"], "simple")


if __name__ == "__main__":
    unittest.main()
