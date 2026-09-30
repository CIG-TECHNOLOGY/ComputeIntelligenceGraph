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

Launches the public CIG onboarding wizard.
The web installer resolves the published npm package version first so the
curl | bash path uses the same binary and provenance as npm installs.

Web installer:
  curl -fsSL https://cig.lat/install.sh | bash

Debug tracing:
  CIG_INSTALL_TRACE=1 curl -fsSL https://cig.lat/install.sh | bash

Install guide:
  https://cig.lat/install
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
  log "npx is required for the public installer."
  exit 1
fi

log "Launching CIG setup wizard..."
if [[ "${USE_TTY_REDIRECT:-false}" == "true" ]]; then
  "${CLI_CMD[@]}" setup "$@" </dev/tty >/dev/tty 2>&1
else
  "${CLI_CMD[@]}" setup "$@"
fi
