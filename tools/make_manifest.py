#!/usr/bin/env python3
"""Build app/public/lux3d-manifest.json: for every articulated piece in the app, the Lux3D prompts,
generation timings (from docs/generation-log.md), task ids and joints (from the URDF).
Shown in the in-game "Made with Lux3D" panel. Standard library only."""
import json, pathlib, re, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODELS = ROOT / "app" / "public" / "models"

prompts = {}
for f in sorted((ROOT / "tools").glob("set-*.json")):
    cfg = json.loads(f.read_text())
    for slug, o in cfg["objects"].items():
        prompts[slug] = {"prompt": o["prompt"], "motion": o["motion"], "style": cfg.get("gen", {}).get("style", "photorealistic")}

timings = {}
log = (ROOT / "docs" / "generation-log.md").read_text() if (ROOT / "docs" / "generation-log.md").exists() else ""
for line in log.splitlines():
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 7 or cells[0] in ("UTC", "---"):
        continue
    slug, step, task, secs = cells[1], cells[2], cells[4], cells[5]
    if "FAILED" in cells[6]:
        continue
    key = "generate" if step.startswith("text-to-3d") else "articulate" if step.startswith("articulation") else None
    if key and re.fullmatch(r"\d+", secs or ""):
        timings.setdefault(slug, {})[key] = {"seconds": int(secs), "task": task}

pieces = []
for d in sorted(MODELS.iterdir()):
    urdf = d / "robot.urdf"
    if not urdf.exists() or d.name not in prompts:
        continue
    root = ET.parse(urdf).getroot()
    joints = []
    for j in root.findall("joint"):
        if j.get("type") in ("prismatic", "revolute"):
            lim = j.find("limit")
            joints.append({"name": j.get("name"), "type": j.get("type"),
                           "range": [float(lim.get("lower")), float(lim.get("upper"))] if lim is not None else None})
    parts = [l.get("name") for l in root.findall("link")]
    pieces.append({"slug": d.name, **prompts[d.name], "parts": parts, "joints": joints, "timings": timings.get(d.name, {})})

out = MODELS.parent / "lux3d-manifest.json"
out.write_text(json.dumps({"pieces": pieces}, indent=1))
print(f"{len(pieces)} pieces -> {out.relative_to(ROOT)}")
