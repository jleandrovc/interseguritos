FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go test ./... && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/routes-api ./cmd/server

FROM scratch
COPY --from=build /out/routes-api /routes-api
COPY data /data
ENV PORT=8080 \
    DEFAULT_GRAPH_FILE=/data/lima-sample.json
USER 65532:65532
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD ["/routes-api", "-healthcheck"]
ENTRYPOINT ["/routes-api"]
