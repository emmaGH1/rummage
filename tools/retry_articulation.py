#!/usr/bin/env python3
"""Re-run Lux3D articulation for pieces whose articulation step failed, using the saved base task's GLB URL.
Usage: AHOLO_KEY_FILE=... python3 tools/retry_articulation.py tools/set-xyz.json slug [slug...]"""
import json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import lux3d_probe as p

cfg = json.loads(pathlib.Path(sys.argv[1]).read_text())
p.KEY = p.key()
for slug in sys.argv[2:]:
    task = json.loads((p.RAW / slug / "base.task.json").read_text())
    glb = next(o["content"] for o in task["outputs"] if ".glb" in o["content"].split("?")[0])
    motion = cfg["objects"][slug]["motion"]
    p.step(slug, "articulation", "/global/lux3d/v1/articulation-animation/task/create",
           {"glbUrl": glb, "prompt": motion}, "articulated", motion)
