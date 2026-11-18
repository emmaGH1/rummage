#!/usr/bin/env bash
# Copy Lux3D articulation output (URDF + part GLBs) into the app, compressing meshes and textures for the web.
# Usage: tools/build_assets.sh slug [slug...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GT="$ROOT/app/node_modules/.bin/gltf-transform"
for slug in "$@"; do
  src="$ROOT/assets/raw/$slug/art/urdf"
  dst="$ROOT/app/public/models/$slug"
  [ -d "$src" ] || { echo "skip $slug (no urdf)"; continue; }
  mkdir -p "$dst/meshes"
  cp "$src/robot.urdf" "$dst/robot.urdf"
  for m in "$src"/meshes/*.glb; do
    "$GT" optimize "$m" "$dst/meshes/$(basename "$m")" --texture-compress webp --texture-size 1024 --compress meshopt --simplify false >/dev/null
  done
  du -sh "$dst" | sed "s|$ROOT/||"
done
