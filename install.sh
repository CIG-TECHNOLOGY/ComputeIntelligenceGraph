#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '%s\n' "$*" >&2
}

if [[ "${CIG_INSTALL_TRACE:-0}" == "1" ]]; then
  export PS4='+ ${BASH_SOURCE##*/}:${LINENO}: '
  set -x
fi

trap 'status=$?; log "CIG install.sh failed at line ${LINENO}: ${BASH_COMMAND} (exit ${status})"; exit ${status}' ERR

print_usage() {
  cat <<'EOF'
Usage: ./install.sh [cig setup flags]

Launches the CIG prerequisite checks and onboarding wizard.
The script prefers the published npm package, then a local built CLI
fallback, and finally an installed `cig` binary as a fallback.

Web installer:
  curl -fsSL https://cig.technology/install.sh | bash

Debug tracing:
  CIG_INSTALL_TRACE=1 curl -fsSL https://cig.technology/install.sh | bash

Install guide:
  https://cig.technology/install
EOF
}

resolve_published_cli_version() {
  if ! command -v npm >/dev/null 2>&1; then
    return 1
  fi

  local resolved_version
  resolved_version="$(npm view @cig-technology/cli version 2>/dev/null | head -n 1 | tr -d '[:space:]')"

  if [[ -z "$resolved_version" ]]; then
    return 1
  fi

  printf '%s' "$resolved_version"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_usage
  exit 0
fi

SCRIPT_ROOT=""
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
  SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi
OS_NAME="$(uname -s)"

case "$OS_NAME" in
  Linux|Darwin)
    ;;
  *)
    echo "CIG install.sh supports Linux and macOS only."
    exit 1
    ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22+ is required."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "Node.js 22+ is required. Detected Node.js ${NODE_MAJOR}."
  exit 1
fi

if [[ ! -t 0 || ! -t 1 || ! -t 2 ]]; then
  if [[ -e /dev/tty ]]; then
    USE_TTY_REDIRECT=true
    log "Installer prompts will use /dev/tty."
  else
    log "CIG install.sh requires an interactive terminal."
    exit 1
  fi
fi

LOCAL_CLI=""
if command -v npx >/dev/null 2>&1; then
  log "Resolving published CIG CLI version from npm..."
  if CLI_VERSION="$(resolve_published_cli_version)"; then
    log "Resolved published CIG CLI version: v${CLI_VERSION}"
    CLI_CMD=(npx --yes "@cig-technology/cli@${CLI_VERSION}")
  else
    log "Could not resolve the published CIG CLI version. Falling back to @latest."
    CLI_CMD=(npx --yes @cig-technology/cli@latest)
  fi
else
  candidate_roots=("$PWD")
  if [[ -n "$SCRIPT_ROOT" ]]; then
    candidate_roots+=("$SCRIPT_ROOT")
  fi

  for candidate_root in "${candidate_roots[@]}"; do
    if [[ -f "${candidate_root}/packages/cli/dist/index.js" ]]; then
      LOCAL_CLI="${candidate_root}/packages/cli/dist/index.js"
      break
    fi
  done

  if [[ -n "$LOCAL_CLI" ]]; then
    CLI_CMD=(node "$LOCAL_CLI")
  elif command -v cig >/dev/null 2>&1; then
    CLI_CMD=(cig)
  else
    log "Could not find the published npm package, a local build, or an installed cig binary."
    exit 1
  fi
fi

log "Launching CIG setup wizard..."
if [[ "${USE_TTY_REDIRECT:-false}" == "true" ]]; then
  "${CLI_CMD[@]}" setup "$@" </dev/tty >/dev/tty 2>&1
else
  "${CLI_CMD[@]}" setup "$@"
fi
