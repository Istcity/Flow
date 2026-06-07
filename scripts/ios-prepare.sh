#!/usr/bin/env bash
# Yerel Xcode ile iOS hazırlığı (EAS kullanmaz)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"

if [[ ! -d "$DEVELOPER_DIR" ]]; then
  echo "Xcode bulunamadı: $DEVELOPER_DIR"
  echo "Kurulum: xcode-select -s /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

cd "$ROOT"

echo "→ Expo native proje (ios/)"
npx expo prebuild --platform ios --no-install

echo "→ CocoaPods"
cd ios && pod install && cd ..

echo ""
echo "Hazır. Xcode açmak için:"
echo "  npm run ios:xcode"
echo ""
echo "TestFlight:"
echo "  1. Xcode → FLOW target → Signing & Capabilities → Team seçin"
echo "  2. Product → Archive"
echo "  3. Distribute App → App Store Connect → Upload"
