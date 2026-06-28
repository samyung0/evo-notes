# Pipeline image — runs as either the ingest worker or the retrieval service
# (compose overrides `command`). Base deps only; add docling/mineru/embed/llm
# extras here when you pin a heavier pair.
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 BLOB_DIR=/data/blobs

COPY pyproject.toml ./
COPY pipeline ./pipeline
RUN pip install --no-cache-dir .

# Default role: the ingest worker.
CMD ["python", "-m", "pipeline.ingest.worker"]
