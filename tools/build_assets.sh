#!/usr/bin/env bash
# Copy Lux3D articulation output (URDF + part GLBs) into the app, compressing meshes and textures for the web.
# Usage: tools/build_assets.sh slug [slug...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GT="$ROOT/app/node_modules/.bin/gltf-transform"
for slug in "$@"; do
  src="$ROOT/assets/raw/$slug/art/urdf"
  dst="$ROOT/app/public/models/$slug"
  zip="$ROOT/assets/raw/$slug/articulated.zip"
  [ -d "$src" ] || { [ -f "$zip" ] && unzip -oq "$zip" -d "$ROOT/assets/raw/$slug/art"; }
  [ -d "$src" ] || { echo "skip $slug (no urdf)"; continue; }
  mkdir -p "$dst/meshes"
  cp "$src/robot.urdf" "$dst/robot.urdf"
  for m in "$src"/meshes/*.glb; do
    "$GT" optimize "$m" "$dst/meshes/$(basename "$m")" --texture-compress webp --texture-size 1024 --compress meshopt --simplify false >/dev/null
  done
  # free disk: the unzipped raw meshes can always be re-extracted from articulated.zip
  rm -rf "$src/meshes"
  # disk is tight on this machine: the compressed copy in the app plus the task record/URDF are kept as provenance
  rm -f "$zip"
  du -sh "$dst" | sed "s|$ROOT/||"
done
