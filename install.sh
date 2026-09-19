#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "MARS v$(cat VERSION) — Marp Authoring & Rendering Studio"
echo "Répertoire : $ROOT"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js est introuvable. Installez Node.js >= 18 puis relancez ./install.sh" >&2
  exit 1
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node.js $(node --version) est trop ancien. MARS nécessite Node.js >= 18." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "✗ npm est introuvable." >&2
  exit 1
fi

echo "✓ Node.js $(node --version)"
echo "✓ npm $(npm --version)"
echo

echo "Installing MARS dependencies…"
if [ -f package-lock.json ]; then
  npm ci
else
  echo "⚠ package-lock.json is absent: falling back to npm install."
  echo "  npm will create a local lock; keep it with this installation for reproducible updates."
  npm install
fi
chmod +x "$ROOT/bin/mars.mjs"

echo
echo "Configuring the global command and running diagnostics…"
node "$ROOT/bin/mars.mjs" setup
node "$ROOT/bin/mars.mjs" doctor --fix

echo
if [[ ":${PATH}:" != *":${HOME}/.local/bin:"* ]]; then
  case "$(basename "${SHELL:-}")" in
    zsh) RC="$HOME/.zshrc" ;;
    bash) RC="$HOME/.bashrc" ;;
    *) RC="" ;;
  esac
  if [ -n "${RC:-}" ]; then
    echo "Pour activer 'mars' dans ce terminal, exécutez : source \"$RC\""
  else
    echo "Add $HOME/.local/bin to PATH, then open a new terminal."
  fi
else
  echo "✓ mars is available in the current PATH."
fi

echo
echo "Suggested check: mars --version && mars doctor"
