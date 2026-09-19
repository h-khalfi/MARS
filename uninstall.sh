#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHER="$HOME/.local/bin/mars"
TARGET="$ROOT/bin/mars.mjs"

echo "MARS — désinstallation de la commande globale"

if [ -L "$LAUNCHER" ]; then
  RESOLVED="$(cd "$(dirname "$LAUNCHER")" && cd "$(dirname "$(readlink "$LAUNCHER")")" 2>/dev/null && pwd)/$(basename "$(readlink "$LAUNCHER")")" || true
  if [ "$RESOLVED" = "$TARGET" ]; then
    rm "$LAUNCHER"
    echo "✓ Launcher supprimé : $LAUNCHER"
  else
    echo "⚠ $LAUNCHER pointe vers une autre installation. Aucun fichier supprimé."
  fi
else
  echo "✓ Aucun launcher MARS lié à cette installation."
fi

echo "Les Stacks et ~/.config/mars/ sont conservés."
echo "Vous pouvez supprimer manuellement le dossier MARS si vous ne l'utilisez plus :"
echo "  $ROOT"
