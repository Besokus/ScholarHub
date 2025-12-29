#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_PORT=4000
MAX_OFFSET=9

find_free_port() {
  local i
  for i in $(seq 0 "$MAX_OFFSET"); do
    local p=$((BASE_PORT + i))
    if command -v lsof >/dev/null 2>&1; then
      if ! lsof -t -i :"$p" >/dev/null 2>&1; then
        echo "$p"
        return 0
      fi
    elif command -v netstat >/dev/null 2>&1; then
      if ! netstat -ano 2>/dev/null | grep -E "[:.]$p[[:space:]]" >/dev/null 2>&1; then
        echo "$p"
        return 0
      fi
    else
      echo "$p"
      return 0
    fi
  done
  return 1
}

PORT="$(find_free_port || true)"
if [ -z "$PORT" ]; then
  echo "在端口范围 ${BASE_PORT}–$((BASE_PORT + MAX_OFFSET)) 内未找到可用端口" >&2
  exit 1
fi

echo "▶ 选定管理端运行端口: $PORT"
echo "▶ Go 管理端将使用 http://localhost:${PORT}"
echo "▶ 前端管理接口将使用 http://localhost:${PORT}/api"

echo "▶ 启动管理员后端（Go）..."
cd "$ROOT_DIR/backend-go"
ADMIN_PORT="$PORT" go run ./cmd/server/main.go &
GO_PID=$!

echo "▶ 启动学生后端（Node）..."
cd "$ROOT_DIR/server"
npm run dev &
SERVER_PID=$!

echo "▶ 启动前端（Client）..."
cd "$ROOT_DIR/client"
VITE_ADMIN_API_URL="http://localhost:${PORT}/api" npm run dev &
CLIENT_PID=$!

echo "✅ 所有服务已启动"
echo "Go backend PID: $GO_PID"
echo "Server PID: $SERVER_PID"
echo "Client PID: $CLIENT_PID"

echo " 按 Ctrl+C 停止所有服务..."

wait
