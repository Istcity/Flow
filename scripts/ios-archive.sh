#!/usr/bin/env bash
# Archive + IPA export (Team ID ve imza Xcode hesabınızda olmalı)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
SCHEME="FLOW"
WORKSPACE="$ROOT/ios/FLOW.xcworkspace"
ARCHIVE="$ROOT/build/FLOW.xcarchive"
EXPORT_DIR="$ROOT/build/ipa"

TEAM_ID="${APPLE_TEAM_ID:-R9VURFRPRC}"

mkdir -p "$ROOT/build"

echo "→ Archive (Release)..."
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  archive \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates

echo "→ IPA export..."
rm -rf "$EXPORT_DIR"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$ROOT/ios/ExportOptions.plist" \
  -allowProvisioningUpdates

IPA=$(find "$EXPORT_DIR" -name '*.ipa' | head -1)
echo ""
echo "IPA: $IPA"
echo "TestFlight yüklemek için Xcode Organizer veya Transporter uygulamasını kullanın."
