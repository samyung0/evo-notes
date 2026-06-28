"""Runtime configuration, all from env so the same image runs as worker,
retrieval service, or benchmark CLI."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Dict, Optional


# ----------------------------------------------------------------- providers
# Role-based multi-provider model configuration. Models are addressed by role
# (extraction / keywords / image_caption / retrieval / enrichment / embedding);
# each role routes to a provider, and each provider carries its own key/base_url.
# Swap models by editing ``model_ids`` (or the matching EVO_MODEL_* env vars)
# without touching any other code.


@dataclass
class ProviderConfig:
    api_key: str = ""
    base_url: str = ""


@dataclass
class LLMModelSpec:
    context_window: int = 131_072
    max_tokens: int = 4096
    temperature: float = 0.1


@dataclass
class LLMRoleOverride:
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


@dataclass
class EmbeddingModelSpec:
    dimensions: int = 2560
    tokenizer_model: str = ""
    chunk_max_tokens: int = 1024
    merge_peers: bool = True


def _env_model(role: str, default: str) -> str:
    return os.getenv(f"EVO_MODEL_{role.upper()}", default)


@dataclass
class ModelConfig:
    """Providers, per-role model assignments, and per-model specs."""

    providers: Dict[str, ProviderConfig] = field(
        default_factory=lambda: {
            "openrouter": ProviderConfig(
                api_key=os.getenv("OPENROUTER_API_KEY", ""),
                base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            ),
            "deepseek": ProviderConfig(
                api_key=os.getenv("DEEPSEEK_API_KEY", ""),
                base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            ),
            "gemini": ProviderConfig(
                api_key=os.getenv("GOOGLE_API_KEY", ""),
                base_url=os.getenv("GEMINI_BASE_URL", ""),
            ),
        }
    )

    # Which concrete model serves each role (env-overridable via EVO_MODEL_<ROLE>).
    model_ids: Dict[str, str] = field(
        default_factory=lambda: {
            "embedding": _env_model("embedding", "qwen/qwen3-embedding-4b"),
            "extraction": _env_model("extraction", "deepseek-v4-flash"),
            "keywords": _env_model("keywords", "deepseek-v4-flash"),
            "image_caption": _env_model("image_caption", "models/gemini-3.1-flash-lite-preview"),
            "enrichment": _env_model("enrichment", "deepseek-v4-flash"),
            "retrieval": _env_model("retrieval", "deepseek-v4-pro"),
        }
    )

    # Which provider each role routes to.
    model_providers: Dict[str, str] = field(
        default_factory=lambda: {
            "embedding": os.getenv("EVO_PROVIDER_EMBEDDING", "openrouter"),
            "extraction": os.getenv("EVO_PROVIDER_EXTRACTION", "deepseek"),
            "keywords": os.getenv("EVO_PROVIDER_KEYWORDS", "deepseek"),
            "image_caption": os.getenv("EVO_PROVIDER_IMAGE_CAPTION", "gemini"),
            "enrichment": os.getenv("EVO_PROVIDER_ENRICHMENT", "deepseek"),
            "retrieval": os.getenv("EVO_PROVIDER_RETRIEVAL", "deepseek"),
        }
    )

    llm_specs: Dict[str, LLMModelSpec] = field(
        default_factory=lambda: {
            "deepseek-v4-flash": LLMModelSpec(context_window=1_048_576, max_tokens=8192, temperature=0.1),
            "deepseek-v4-pro": LLMModelSpec(context_window=1_048_576, max_tokens=8192, temperature=0.1),
            "models/gemini-3.1-flash-lite-preview": LLMModelSpec(context_window=1_048_576, max_tokens=8192, temperature=0.1),
        }
    )

    llm_role_overrides: Dict[str, LLMRoleOverride] = field(
        default_factory=lambda: {
            "extraction": LLMRoleOverride(temperature=0.0),
            "keywords": LLMRoleOverride(temperature=0.0),
            "image_caption": LLMRoleOverride(temperature=0.0),
        }
    )

    embedding_specs: Dict[str, EmbeddingModelSpec] = field(
        default_factory=lambda: {
            "qwen/qwen3-embedding-4b": EmbeddingModelSpec(
                dimensions=2560,
                tokenizer_model="Qwen/Qwen3-Embedding-4B",
                chunk_max_tokens=1024,
                merge_peers=True,
            ),
        }
    )

    # ---------------------------------------------------------------- helpers
    def provider_for(self, role: str) -> ProviderConfig:
        return self.providers.get(self.model_providers.get(role, ""), ProviderConfig())

    def provider_name(self, role: str) -> str:
        return self.model_providers.get(role, "")

    def model_for(self, role: str) -> str:
        return self.model_ids.get(role, "")

    def spec_for(self, role: str) -> LLMModelSpec:
        return self.llm_specs.get(self.model_for(role), LLMModelSpec())

    def temperature_for(self, role: str) -> float:
        ov = self.llm_role_overrides.get(role)
        if ov is not None and ov.temperature is not None:
            return ov.temperature
        return self.spec_for(role).temperature

    def max_tokens_for(self, role: str) -> int:
        ov = self.llm_role_overrides.get(role)
        if ov is not None and ov.max_tokens is not None:
            return ov.max_tokens
        return self.spec_for(role).max_tokens

    def embedding_dim(self) -> int:
        spec = self.embedding_specs.get(self.model_for("embedding"))
        return spec.dimensions if spec else 2560


models = ModelConfig()

# Embedding dimension. Derived from the active embedding model's spec so the
# hash/remote embedders, EMBED_DIM, and the migration's halfvec(N) stay in sync.
# Must match the vector/halfvec dimension in server/migrations.
EMBED_DIM = models.embedding_dim()


class Config:
    # Postgres (shared with the Go gateway). psycopg accepts the postgres:// URL.
    dsn: str = os.getenv("DATABASE_URL", "postgres://evo:evo@localhost:5432/evo?sslmode=disable")

    # Shared blob volume — the gateway writes uploads here, the worker reads them.
    blob_dir: str = os.getenv("BLOB_DIR", "./data/blobs")

    # Pinned pair at deploy; the worker honours the job payload but falls back
    # to these (and ultimately to 'simple') when a backend isn't installed.
    parser: str = os.getenv("EVO_PARSER", "simple")     # simple | docling | mineru
    engine: str = os.getenv("EVO_ENGINE", "linearrag")  # linearrag | lightrag | dense

    # Embeddings: 'hash' is a dependency-free dev default; 'st' uses local
    # sentence-transformers; 'remote' calls an OpenAI-compatible /embeddings API
    # (the role-based embedding provider/model from ModelConfig).
    embedder: str = os.getenv("EVO_EMBEDDER", "hash")
    st_model: str = os.getenv("EVO_ST_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

    # Role-based model configuration (providers + per-role model assignments).
    models: ModelConfig = models

    # Legacy Anthropic knobs, kept for the optional anthropic provider path.
    anthropic_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    llm_model: str = os.getenv("EVO_LLM_MODEL", "claude-haiku-4-5-20251001")
    vlm_model: str = os.getenv("EVO_VLM_MODEL", "claude-haiku-4-5-20251001")

    # Worker poll cadence (seconds) for the Postgres job queue.
    poll_interval: float = float(os.getenv("EVO_POLL_INTERVAL", "2.0"))

    # Passage chunking target (characters).
    chunk_chars: int = int(os.getenv("EVO_CHUNK_CHARS", "900"))


cfg = Config()
