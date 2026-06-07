#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="$ROOT/ios/FLOW.xcworkspace"

if [[ ! -d "$WORKSPACE" ]]; then
  echo "ios/ yok. Önce: npm run ios:prepare"
  exit 1
fi

open "$WORKSPACE"
