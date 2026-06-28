"""Modal app: MineRU document parsing on a GPU, exposed as an HTTPS endpoint.

Why Modal: MineRU benefits a lot from a GPU but ingest is bursty, so a
scale-to-zero serverless GPU is far cheaper than a always-on pod. Model weights
are cached on a Modal Volume so warm starts skip the multi-GB download.

Deploy:
    modal deploy modal/mineru_app.py
    # one-time (downloads weights onto the Volume):
    modal run modal/mineru_app.py::download_models

Then point the worker at the printed web URL:
    MODAL_PARSE_URL=https://<org>--evo-mineru-web.modal.run/file_parse
    MODAL_PARSE_TOKEN=<the token in the evo-mineru-token secret>

Contract (matches pipeline/pipeline/rag/mineru_client.py):
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

CACHE_DIR = "/root/.cache"

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


def _run_mineru(input_path: str, out_dir: str, parse_method: str) -> dict:
    """Invoke the MineRU CLI and collect its normalized outputs."""
    os.makedirs(out_dir, exist_ok=True)
    cmd = [
        "mineru",
        "-p", input_path,
        "-o", out_dir,
        "-m", parse_method or "auto",
        "-b", "pipeline",
        "-d", "cuda",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"mineru failed: {proc.stderr[-2000:]}")

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


@app.function(
    image=image,
    gpu="L4",
    volumes={CACHE_DIR: model_volume},
    secrets=[token_secret],
    timeout=900,
    scaledown_window=120,  # keep the container ~2 min after the last request
)
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def web():
    from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

    api = FastAPI(title="Evo MineRU parser")
    expected = os.environ.get("MINERU_PARSE_TOKEN", "")

    def _check(auth: str | None) -> None:
        if not expected:
            return  # no token configured -> open (dev only)
        if not auth or not auth.startswith("Bearer ") or auth[7:] != expected:
            raise HTTPException(status_code=401, detail="invalid token")

    @api.get("/healthz")
    def healthz():
        return {"ok": True}

    @api.post("/file_parse")
    async def file_parse(
        file: UploadFile = File(...),
        parse_method: str = Form("auto"),
        filename: str = Form(""),
        authorization: str | None = Header(None),
    ):
        _check(authorization)
        name = filename or file.filename or "document"
        data = await file.read()

        with tempfile.TemporaryDirectory() as work:
            input_path = os.path.join(work, os.path.basename(name))
            with open(input_path, "wb") as f:
                f.write(data)
            out_dir = os.path.join(work, "out")
            result = _run_mineru(input_path, out_dir, parse_method)
        return result

    return api
