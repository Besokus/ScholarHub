#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(E:\Workdir\计算机科学与技术\Web应用开发\Web开发实验\ScholarHub "$0")" && pwd)"

echo "▶ 启动管理员后端（Go）..."
cd "$ROOT_DIR/backend-go"
go run ./cmd/server/main.go &
GO_PID=$!

echo "▶ 启动学生后端（Node）..."
cd "$ROOT_DIR/server"
npm run dev &
SERVER_PID=$!

echo "▶ 启动前端（Client）..."
cd "$ROOT_DIR/client"
npm run dev &
CLIENT_PID=$!

echo "✅ 所有服务已启动"
echo "Go backend PID: $GO_PID"
echo "Server PID: $SERVER_PID"
echo "Client PID: $CLIENT_PID"

echo "⏳ 按 Ctrl+C 停止所有服务..."

wait
