# Build the gateway as a small static binary.
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -o /out/api ./cmd/api && \
    CGO_ENABLED=0 go build -trimpath -o /out/reconcile ./cmd/reconcile

FROM alpine:3.20
RUN adduser -D -u 10001 app
# Pre-create the blob dir owned by the app user so a fresh named volume
# inherits writable ownership on first mount.
RUN mkdir -p /data/blobs && chown -R app /data/blobs
USER app
COPY --from=build /out/api /api
COPY --from=build /out/reconcile /app/reconcile
EXPOSE 8080
ENTRYPOINT ["/api"]
