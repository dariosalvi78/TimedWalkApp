#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
TimedWalk root helper

Usage:
  ./scripts/project.sh install
  ./scripts/project.sh test
  ./scripts/project.sh app:serve
  ./scripts/project.sh app:build
  ./scripts/project.sh app:lint
  ./scripts/project.sh server:basic:run
  ./scripts/project.sh server:basic:dev
  ./scripts/project.sh server:complete:test

Commands:
  install              Install deps in app and both servers
  test                 Run app and complete server tests
  app:serve            Run Vue app dev server
  app:build            Build Vue app
  app:lint             Lint Vue app
  server:basic:run     Run basic server
  server:basic:dev     Run basic server in watch mode
  server:complete:test Run complete server tests
EOF
}

run_in_dir() {
  local dir="$1"
  shift
  (cd "$ROOT_DIR/$dir" && "$@")
}

cmd="${1:-}"

case "$cmd" in
  install)
    run_in_dir app npm install
    run_in_dir servers/basic npm install
    run_in_dir servers/complete/api npm install
    ;;
  test)
    run_in_dir app npm test
    run_in_dir servers/complete/api npm test
    ;;
  app:serve)
    run_in_dir app npm run serve
    ;;
  app:build)
    run_in_dir app npm run build
    ;;
  app:lint)
    run_in_dir app npm run lint
    ;;
  server:basic:run)
    run_in_dir servers/basic npm run run
    ;;
  server:basic:dev)
    run_in_dir servers/basic npm run dev
    ;;
  server:complete:test)
    run_in_dir servers/complete/api npm test
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 1
    ;;
esac
