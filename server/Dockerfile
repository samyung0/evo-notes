# Build the gateway as a small static binary.
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -o /out/api ./cmd/api

FROM alpine:3.20
RUN adduser -D -u 10001 app
USER app
COPY --from=build /out/api /api
EXPOSE 8080
ENTRYPOINT ["/api"]
