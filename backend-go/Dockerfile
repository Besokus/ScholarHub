FROM golang:1.20-alpine AS builder
WORKDIR /src
COPY . .
RUN go build -o app ./cmd/server

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /src/app /app/app
ENV PORT=3000
CMD ["/app/app"]

