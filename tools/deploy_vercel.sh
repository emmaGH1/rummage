#!/usr/bin/env bash
# Build and deploy the static game to Vercel (project "rummage", public alias rummage-game.vercel.app).
# Needs: VERCEL_TOKEN_FILE (file holding a Vercel token) and the Vercel CLI in $VC (default ~/.cache/rummage-tmp/vc).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VC="${VC:-$HOME/.cache/rummage-tmp/vc/node_modules/.bin/vercel}"
WORK="${VC_WORK:-$HOME/.cache/rummage-tmp/rummage}"
TOKEN="$(cat "${VERCEL_TOKEN_FILE:?set VERCEL_TOKEN_FILE}")"
(cd "$ROOT/app" && npx vite build >/dev/null)
mkdir -p "$WORK"
find "$WORK" -mindepth 1 -maxdepth 1 ! -name .vercel -exec rm -rf {} +
cp -r "$ROOT/app/dist/." "$WORK/"
cd "$WORK"
url=$("$VC" deploy --prod --yes --token "$TOKEN" 2>/dev/null | grep -Eo 'https://rummage-[a-z0-9]+-[a-z0-9-]+\.vercel\.app' | head -1)
"$VC" alias set "$url" rummage-game.vercel.app --token "$TOKEN" >/dev/null
echo "https://rummage-game.vercel.app  ($url)"
