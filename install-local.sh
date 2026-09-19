#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "install-local.sh est conservé pour compatibilité. Utilisation de install.sh…"
exec "$ROOT/install.sh"
