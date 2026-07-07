"""Modal app: MineRU document parsing on a GPU, exposed as an HTTPS endpoint.

Why Modal: MineRU benefits a lot from a GPU but ingest is bursty, so a
scale-to-zero serverless GPU is far cheaper than an always-on pod. Model weights
are cached on a Modal Volume so warm starts skip the multi-GB download.

Cold-start strategy (in layers):
    1. Models load ONCE per container via ``@modal.enter`` using MineRU's
       in-process Python API (``mineru.cli.common.do_parse`` + its
       ``ModelSingleton``). Warm requests skip model loading entirely — the old
       CLI-subprocess design re-imported torch and reloaded all weights on
       every single request.
    2. CPU memory snapshots (``enable_memory_snapshot=True``) checkpoint the
       process after the heavy imports (torch + the full MineRU pipeline
       graph), so cold boots skip most interpreter/import cost. Model weights
       themselves load in the post-restore phase because the GPU (and the
       weights Volume) are only attached after restore.

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

# Cache MinerU/HF model weights across cold starts.
model_volume = modal.Volume.from_name("evo-mineru-models", create_if_missing=True)

# A Modal Secret named "evo-mineru-token" must define MINERU_PARSE_TOKEN.
token_secret = modal.Secret.from_name("evo-mineru-token")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0", "libgomp1")
    .pip_install("mineru[core]", "fastapi[standard]", "python-multipart")
    .env(
        {
            "MINERU_MODEL_SOURCE": "huggingface",
            "HF_HOME": f"{CACHE_DIR}/huggingface",
            "MINERU_DEVICE_MODE": "cuda",
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


def _parse_document(data: bytes, name: str, parse_method: str) -> dict:
    """Parse one document in-process (models come from the warm ModelSingleton).

    Blocking (GPU inference + file IO); callers run it via ``asyncio.to_thread``.
    """
    from pathlib import Path

    from mineru.cli.common import do_parse, read_fn

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
        do_parse(
            output_dir=out_dir,
            pdf_file_names=[stem],
            pdf_bytes_list=[pdf_bytes],
            p_lang_list=[LANG],
            backend="pipeline",
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
)
# max_inputs=2: the models are loaded once and shared, and MineRU 3.x guards
# inference with per-model locks, so two in-flight parses can overlap CPU work
# (pdfium rasterization, md generation) without doubling VRAM. The old design
# ran 4 concurrent CLI subprocesses = 4 full model copies on one 24 GB L4.
@modal.concurrent(max_inputs=2)
class MineruParser:
    @modal.enter(snap=True)
    def preimport(self) -> None:
        # Captured in the CPU memory snapshot: torch + the entire MineRU
        # pipeline import graph. Must not touch the GPU (none is attached in
        # the snapshot phase) and must not read model weights (the Volume is
        # remounted after restore).
        import mineru.cli.common  # noqa: F401
        import mineru.backend.pipeline.pipeline_analyze  # noqa: F401

    @modal.enter(snap=False)
    def load_models(self) -> None:
        # Runs after snapshot restore, with the GPU attached. Parse a tiny
        # synthetic page through the real request path so every model
        # (layout + OCR + formula + table) lands in the process-wide
        # ModelSingleton under exactly the keys do_parse will use — an eager
        # ``get_model`` call warms a different key and the first request
        # still paid ~8s of lazy MFR-model loading.
        import io

        from PIL import Image as PILImage
        from PIL import ImageDraw

        img = PILImage.new("RGB", (800, 600), "white")
        ImageDraw.Draw(img).text((100, 100), "warm up", fill="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        _parse_document(buf.getvalue(), "warmup.png", "auto")

    @modal.asgi_app()
    def web(self):
        # Parse the multipart form off the raw Starlette Request instead of via
        # FastAPI's ``UploadFile = File(...)`` parameter. FastAPI builds a Pydantic
        # TypeAdapter for ``UploadFile``, which blows up ("class not fully defined")
        # whenever the pinned fastapi / pydantic / starlette trio drifts out of sync
        # in the image — exactly the kind of transitive-version breakage a
        # long-lived serverless endpoint should not be fragile to. Reading the form
        # directly keeps this endpoint working regardless of those versions.
        import asyncio

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
                result = await asyncio.to_thread(_parse_document, data, name, parse_method)
            except Exception as e:  # noqa: BLE001 — surface parse failures as 500 JSON
                return JSONResponse({"detail": f"parse failed: {e}"}, status_code=500)
            return JSONResponse(result)

        return Starlette(
            routes=[
                Route("/healthz", healthz, methods=["GET"]),
                Route("/file_parse", file_parse, methods=["POST"]),
            ]
        )
