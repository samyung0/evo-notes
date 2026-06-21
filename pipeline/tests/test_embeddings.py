"""Hash embedder + pgvector literal formatting."""
import math
import unittest

from pipeline.config import EMBED_DIM
from pipeline.llm.embeddings import HashEmbedder, get_embedder, vec_literal


class TestEmbeddings(unittest.TestCase):
    def setUp(self):
        self.emb = HashEmbedder()

    def test_dimension(self):
        v = self.emb.embed(["hello world"])[0]
        self.assertEqual(len(v), EMBED_DIM)

    def test_deterministic(self):
        a = self.emb.embed(["mitochondria produce atp"])[0]
        b = self.emb.embed(["mitochondria produce atp"])[0]
        self.assertEqual(a, b)

    def test_unit_norm(self):
        v = self.emb.embed(["some non empty text here"])[0]
        norm = math.sqrt(sum(x * x for x in v))
        self.assertAlmostEqual(norm, 1.0, places=5)

    def test_empty_text_is_zero_vector(self):
        v = self.emb.embed([""])[0]
        self.assertEqual(sum(abs(x) for x in v), 0.0)

    def test_shared_tokens_increase_similarity(self):
        def cos(a, b):
            return sum(x * y for x, y in zip(a, b))
        q = self.emb.embed(["atp energy"])[0]
        near = self.emb.embed(["atp energy mitochondria"])[0]
        far = self.emb.embed(["calculus derivative integral"])[0]
        self.assertGreater(cos(q, near), cos(q, far))

    def test_vec_literal_format(self):
        lit = vec_literal([1.0, -2.5, 0.0])
        self.assertTrue(lit.startswith("[") and lit.endswith("]"))
        self.assertEqual(lit, "[1.000000,-2.500000,0.000000]")

    def test_get_embedder_defaults_to_hash(self):
        self.assertIsInstance(get_embedder(), HashEmbedder)


if __name__ == "__main__":
    unittest.main()
