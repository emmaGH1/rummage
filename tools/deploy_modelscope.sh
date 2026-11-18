#!/usr/bin/env bash
# Build the game and deploy it to the ModelScope static Studio heisemma/rummage.
# Needs: MS_TOKEN_FILE (file holding a ModelScope access token), the modelscope CLI in $MS_VENV (default ~/.cache/ms-venv).
# The token is read from the file and never printed or committed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${MS_STUDIO:-heisemma/rummage}"
EP="https://www.modelscope.ai"
VENV="${MS_VENV:-$HOME/.cache/ms-venv}"
WORK="${MS_WORK:-$HOME/.cache/ms-studio}"
TOKEN="$(cat "${MS_TOKEN_FILE:?set MS_TOKEN_FILE}")"

(cd "$ROOT/app" && npx vite build >/dev/null)
[ -d "$WORK/.git" ] || GIT_TERMINAL_PROMPT=0 git clone -q "https://oauth2:${TOKEN}@www.modelscope.ai/studios/${REPO}.git" "$WORK"
cd "$WORK"
GIT_TERMINAL_PROMPT=0 git pull -q --rebase origin master 2>/dev/null || true
# replace the previous build but keep the Studio's README and git attributes
find . -mindepth 1 -maxdepth 1 ! -name .git ! -name README.md ! -name .gitattributes -exec rm -rf {} +
cp -r "$ROOT/app/dist/." .
git add -A
git -c user.name=heisemma -c user.email=noreply@modelscope.ai commit -qm "Deploy $(cd "$ROOT" && git rev-parse --short HEAD)" || { echo "nothing to deploy"; exit 0; }
GIT_TERMINAL_PROMPT=0 git push -q origin HEAD:master 2>&1 | grep -v "^remote: event=" | sed "s/${TOKEN}/***/g" || true
"$VENV/bin/modelscope" --token "$TOKEN" --endpoint "$EP" deploy "$REPO" 2>&1 | grep -i "deploy" | tail -1
echo "https://www.modelscope.ai/studios/${REPO}"
