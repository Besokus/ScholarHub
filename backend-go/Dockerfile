FROM golang:1.20-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o app ./cmd/server

FROM alpine:3.19
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
RUN apk add --no-cache ca-certificates curl
COPY --from=builder /src/app /app/app
RUN chown app:app /app/app
USER app
EXPOSE 4000
CMD ["/app/app"]

