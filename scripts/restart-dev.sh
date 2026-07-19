#!/usr/bin/env bash
# Stop leftover Vite/API processes for Shelf, then start a clean dev session.
# Works on macOS and Linux (Fedora).

set -euo pipefail
cd "$(dirname "$0")/.."

echo "Stopping old Shelf servers…"
for port in 5173 5174 5175 5176 5177 5188 3080; do
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -t -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  elif command -v fuser >/dev/null 2>&1; then
    pids=$(fuser "$port/tcp" 2>/dev/null || true)
  else
    pids=""
  fi
  if [[ -n "${pids:-}" ]]; then
    echo "  port $port -> $pids"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
done

pkill -9 -f "movie-collection.*(vite|server/index|concurrently)" 2>/dev/null || true
sleep 1

echo "Starting npm run dev…"
npm run dev
