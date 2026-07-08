"""Modal app: MineRU document parsing on a GPU, exposed as an HTTPS endpoint.

Why Modal: MineRU benefits a lot from a GPU but ingest is bursty, so a
scale-to-zero serverless GPU is far cheaper than an always-on pod. Model weights
are cached on a Modal Volume so warm starts skip the multi-GB download.

Cold-start strategy (in layers):
    1. Models load ONCE per container via ``@modal.enter`` using MineRU's
       in-process Python API (``mineru.cli.common.aio_do_parse`` + its
       ``ModelSingleton``). Warm requests skip model loading entirely — the old
       CLI-subprocess design re-imported torch and reloaded all weights on
       every single request.
    2. GPU memory snapshots (``enable_memory_snapshot=True`` +
       ``experimental_options={"enable_gpu_snapshot": True}``) checkpoint the
       process AFTER the models are loaded onto the GPU and warmed up, so cold
       boots restore straight into a ready-to-serve state instead of paying
       imports + weight loading + vLLM engine init (~minutes) on every boot.

Deploy:
    modal deploy modal/mineru_app.py
    # one-time (downloads weights onto the Volume):
    modal run modal/mineru_app.py::download_models

Then point the worker at the printed web URL:
    MODAL_PARSE_URL=https://<org>--evo-mineru-mineruparser-web.modal.run/file_parse
    MODAL_PARSE_TOKEN=<the token in the evo-mineru-token secret>

Contract (matches pipeline/pipeline/rag/modal_parser.py):
    POST /file_parse  (multipart: file=<bytes>, parse_method=auto, filename=...)
    Authorization: Bearer <MINERU_PARSE_TOKEN>
    -> {"content_list": [...], "images": {"<name>": "<base64>"}, "md": "..."}
"""
from __future__ import annotations

import base64
import glob
import json
import os
import subprocess
import tempfile

import modal

CACHE_DIR = "/cache"

# MineRU's OCR models are per-language; "ch" handles both Chinese and English
# (same default the CLI used before this refactor).
LANG = "ch"

# hybrid = MinerU2.5 VLM for layout/tables/formulas + pipeline-style native
# text extraction and per-language OCR (higher accuracy, low hallucination).
# The async vLLM engine is the only vlm backend usable from ``aio_do_parse``
# (the sync engine's LLM entrypoint is not thread-safe and MinerU refuses to
# mix sync/async engine modes). Pinned rather than "hybrid-auto-engine" so the
# backend can't silently change under a redeploy — the GPU memory snapshot
# captures the fully-initialized engine, so determinism matters here.
BACKEND = "hybrid-vllm-async-engine"

# Cache MinerU/HF model weights across cold starts.
model_volume = modal.Volume.from_name("evo-mineru-models", create_if_missing=True)

# A Modal Secret named "evo-mineru-token" must define MINERU_PARSE_TOKEN.
token_secret = modal.Secret.from_name("evo-mineru-token")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0", "libgomp1")
    # [all] (vs the old [core]) pulls in vllm, required by the hybrid backend's
    # local inference engine. hybrid itself needs mineru>=2.7.0.
    .pip_install("mineru[all]>=2.7.0", "fastapi[standard]", "python-multipart")
    .env(
        {
            "MINERU_MODEL_SOURCE": "huggingface",
            "HF_HOME": f"{CACHE_DIR}/huggingface",
            "MINERU_DEVICE_MODE": "cuda",
            # torch.compile with parallel inductor threads is a known cause of
            # GPU-memory-snapshot capture failures (see Modal snapshot docs).
            "TORCHINDUCTOR_COMPILE_THREADS": "1",
        }
    )
)

app = modal.App("evo-mineru")


@app.function(image=image, gpu="L4", volumes={CACHE_DIR: model_volume}, timeout=1800)
def download_models() -> None:
    """Warm the Volume with MineRU's model weights (run once after deploy)."""
    # `mineru-models-download` ships with the package; fall back to a tiny parse
    # that triggers the lazy download if the CLI name changes between versions.
    try:
        subprocess.run(["mineru-models-download", "-s", "huggingface", "-m", "all"], check=True)
    except Exception:
        with tempfile.TemporaryDirectory() as d:
            sample = os.path.join(d, "warm.txt")
            with open(sample, "w") as f:
                f.write("warm up")
            subprocess.run(["mineru", "-p", sample, "-o", d, "-m", "auto"], check=False)
    model_volume.commit()


def _collect_outputs(out_dir: str) -> dict:
    """Collect MineRU's normalized outputs from its output directory tree."""
    matches = glob.glob(os.path.join(out_dir, "**", "*_content_list.json"), recursive=True)
    if not matches:
        raise RuntimeError("mineru produced no *_content_list.json")
    content_path = matches[0]
    base = os.path.dirname(content_path)

    with open(content_path, "r", encoding="utf-8") as f:
        content_list = json.load(f)

    md = ""
    md_matches = glob.glob(os.path.join(base, "*.md"))
    if md_matches:
        with open(md_matches[0], "r", encoding="utf-8") as f:
            md = f.read()

    images: dict[str, str] = {}
    for img in glob.glob(os.path.join(base, "images", "*")):
        try:
            with open(img, "rb") as f:
                images[os.path.basename(img)] = base64.b64encode(f.read()).decode()
        except Exception:
            pass

    return {"content_list": content_list, "images": images, "md": md}


async def _parse_document(data: bytes, name: str, parse_method: str) -> dict:
    """Parse one document in-process (models come from the warm ModelSingleton).

    Must always run on the container's main event loop: vLLM's async engine
    binds its background tasks to the loop it was created on (during the
    warmup parse), and using it from another loop breaks it.
    """
    from pathlib import Path

    from mineru.cli.common import aio_do_parse, read_fn

    stem = Path(os.path.basename(name)).stem or "document"

    with tempfile.TemporaryDirectory() as work:
        # read_fn handles suffix sniffing and image->PDF conversion exactly
        # like the CLI did; office formats pass through as raw bytes.
        input_path = os.path.join(work, os.path.basename(name))
        with open(input_path, "wb") as f:
            f.write(data)
        pdf_bytes = read_fn(input_path)

        out_dir = os.path.join(work, "out")
        os.makedirs(out_dir, exist_ok=True)
        await aio_do_parse(
            output_dir=out_dir,
            pdf_file_names=[stem],
            pdf_bytes_list=[pdf_bytes],
            p_lang_list=[LANG],
            backend=BACKEND,
            parse_method=parse_method or "auto",
            # Skip artifacts nobody downloads: debug PDFs and raw model dumps.
            f_draw_layout_bbox=False,
            f_draw_span_bbox=False,
            f_dump_middle_json=False,
            f_dump_model_output=False,
            f_dump_orig_pdf=False,
        )
        return _collect_outputs(out_dir)


@app.cls(
    image=image,
    gpu="L4",
    volumes={CACHE_DIR: model_volume},
    secrets=[token_secret],
    timeout=900,
    scaledown_window=300,  # keep the container ~5 min after the last request
    enable_memory_snapshot=True,
    # GPU memory snapshots (alpha): the checkpoint also captures GPU state, so
    # the loaded VLM + warm vLLM engine restore directly instead of being
    # rebuilt after every cold boot.
    experimental_options={"enable_gpu_snapshot": True},
)
# No @modal.concurrent: one input per container. The VLM's KV cache plus the
# pipeline OCR models already budget most of the L4's 24 GB VRAM; a second
# in-flight document risks OOM for little gain, so overflow requests scale out
# to a fresh container (restored from snapshot) instead.
class MineruParser:
    @modal.enter(snap=True)
    async def load_models(self) -> None:
        # Everything here is captured in the GPU memory snapshot (with
        # enable_gpu_snapshot the GPU *is* attached during the snap phase, and
        # the weights Volume is readable). Parse a tiny synthetic page through
        # the real request path so the full hybrid stack — the MinerU2.5 VLM
        # inside its async vLLM engine plus the per-language OCR models —
        # lands in the process-wide ModelSingleton under exactly the keys
        # aio_do_parse will use; restored containers then serve their first
        # request with zero lazy loading. Async on purpose: Modal runs async
        # hooks on the same event loop that serves the ASGI app, so the vLLM
        # engine is created on the loop it will be used from.
        import io

        from PIL import Image as PILImage
        from PIL import ImageDraw

        img = PILImage.new("RGB", (800, 600), "white")
        ImageDraw.Draw(img).text((100, 100), "warm up", fill="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        await _parse_document(buf.getvalue(), "warmup.png", "auto")

    @modal.asgi_app()
    def web(self):
        # Parse the multipart form off the raw Starlette Request instead of via
        # FastAPI's ``UploadFile = File(...)`` parameter. FastAPI builds a Pydantic
        # TypeAdapter for ``UploadFile``, which blows up ("class not fully defined")
        # whenever the pinned fastapi / pydantic / starlette trio drifts out of sync
        # in the image — exactly the kind of transitive-version breakage a
        # long-lived serverless endpoint should not be fragile to. Reading the form
        # directly keeps this endpoint working regardless of those versions.
        from starlette.applications import Starlette
        from starlette.requests import Request
        from starlette.responses import JSONResponse
        from starlette.routing import Route

        def _authorized(request: Request) -> bool:
            expected = os.environ.get("MINERU_PARSE_TOKEN", "")
            if not expected:
                return True  # no token configured -> open (dev only)
            auth = request.headers.get("authorization", "")
            return auth.startswith("Bearer ") and auth[7:] == expected

        async def healthz(_request: Request) -> JSONResponse:
            return JSONResponse({"ok": True})

        async def file_parse(request: Request) -> JSONResponse:
            if not _authorized(request):
                return JSONResponse({"detail": "invalid token"}, status_code=401)

            form = await request.form()
            upload = form.get("file")
            if upload is None:
                return JSONResponse({"detail": "missing file field"}, status_code=400)
            parse_method = str(form.get("parse_method") or "auto")
            name = str(form.get("filename") or getattr(upload, "filename", "") or "document")
            data = await upload.read()

            try:
                result = await _parse_document(data, name, parse_method)
            except Exception as e:  # noqa: BLE001 — surface parse failures as 500 JSON
                return JSONResponse({"detail": f"parse failed: {e}"}, status_code=500)
            return JSONResponse(result)

        return Starlette(
            routes=[
                Route("/healthz", healthz, methods=["GET"]),
                Route("/file_parse", file_parse, methods=["POST"]),
            ]
        )
