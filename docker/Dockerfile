FROM golang:1.22-alpine AS builder
ARG GOPROXY=https://mirrors.tencent.com/go,direct
ENV GOPROXY=$GOPROXY GOSUMDB=off
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server ./cmd/server

FROM alpine:3.19
RUN apk add --no-cache curl ca-certificates
COPY --from=builder /server /server
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8080/api/v1/ping || exit 1
CMD ["/server"]
