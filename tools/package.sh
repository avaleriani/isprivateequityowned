#!/bin/sh
# Builds the Chrome Web Store upload: dist/isprivateequityowned-<version>.zip.
# Only what the extension loads goes in — no README, tools or store assets.
# Run: npm run package
set -eu
cd "$(dirname "$0")/.."

node tools/validate.js > /dev/null

if grep -q "OWNER/REPO" src/config.js; then
  echo "FAIL  src/config.js still points at the OWNER/REPO placeholder" >&2
  exit 1
fi

version=$(node -p "require('./manifest.json').version")
out="dist/isprivateequityowned-$version.zip"
mkdir -p dist
rm -f "$out"
zip -qr "$out" manifest.json src data/companies.json icons -x '*.DS_Store'
echo "$out ($(du -h "$out" | cut -f1))"
