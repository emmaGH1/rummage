#!/usr/bin/env bash
# Compress Lux3D prop models (generation only, no articulation) into app/public/props/<slug>.glb.
# Usage: tools/build_props.sh slug [slug...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GT="$ROOT/app/node_modules/.bin/gltf-transform"
mkdir -p "$ROOT/app/public/props"
for slug in "$@"; do
  src="$ROOT/assets/raw/$slug/base.glb"
  [ -f "$src" ] || { echo "skip $slug (no base.glb)"; continue; }
  "$GT" optimize "$src" "$ROOT/app/public/props/$slug.glb" --texture-compress webp --texture-size 512 --compress meshopt --simplify false >/dev/null
  du -h "$ROOT/app/public/props/$slug.glb" | sed "s|$ROOT/||"
done
