#!/usr/bin/env python3
"""Lux3D capability probe for Rummage.

For each test object: text-to-3D -> articulation (motion prompt) -> part split.
Downloads every result to assets/raw/<slug>/ and appends to docs/generation-log.md.

Key: env AHOLO_API_KEY, or AHOLO_KEY_FILE=<path to a file containing the key>.
Usage: python3 tools/lux3d_probe.py [slug ...]   (no args = all objects)
Standard library only.
"""
import json, os, sys, time, urllib.request, urllib.error, datetime, pathlib, threading

API = "https://api.aholo.ai"
ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "raw"
LOG = ROOT / "docs" / "generation-log.md"
LOG_LOCK = threading.Lock()
SPLIT_LOCK = threading.Lock()  # account allows one part-split task at a time

OBJECTS = {
    "sea-chest": {
        "prompt": "antique wooden sea chest with iron bands, brass corners and a hinged lid, single isolated object, closed",
        "motion": "The lid rotates open upward about the hinge along the back top edge, up to about 100 degrees.",
    },
    "drawers": {
        "prompt": "small antique wooden chest of drawers with three stacked drawers and brass knob handles, single isolated object",
        "motion": "Each of the three drawers slides straight out forward along its depth axis, about 60 percent of its depth.",
    },
    "cabinet": {
        "prompt": "tall narrow wooden cabinet with two hinged front doors and brass handles, single isolated object, doors closed",
        "motion": "The two front doors swing open outward on vertical hinges at the left and right outer edges, about 110 degrees.",
    },
}

GEN = {"version": "G1-Turbo", "outputFormat": ["glb"], "faceCount": 60000, "enablePbr": True,
       "style": "photorealistic", "aiPredictSize": True}


def key():
    k = os.environ.get("AHOLO_API_KEY")
    if not k and os.environ.get("AHOLO_KEY_FILE"):
        k = pathlib.Path(os.environ["AHOLO_KEY_FILE"]).read_text().strip()
    if not k:
        sys.exit("Set AHOLO_API_KEY or AHOLO_KEY_FILE")
    return k


def call(method, path, body=None, params=""):
    req = urllib.request.Request(API + path + params, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"c": f"HTTP{e.code}", "m": e.read().decode(errors="replace")[:500], "d": None}


def create(path, body, label):
    for attempt in range(120):  # concurrency limit: keep retrying for up to ~30 min
        r = call("POST", path, body)
        if r.get("c") == "0" and r.get("d"):
            return r["d"]
        if "CONCURRENCY" in str(r.get("c")) or "busy" in str(r.get("m")).lower() or "progress" in str(r.get("m")).lower():
            time.sleep(15)
            continue
        raise RuntimeError(f"{label}: create failed {r}")
    raise RuntimeError(f"{label}: still busy after retries")


def wait(taskid, label, timeout=1800):
    t0 = time.time()
    while time.time() - t0 < timeout:
        r = call("GET", "/global/lux3d/v1/generate/task/get", params=f"?taskid={taskid}")
        d = r.get("d") or {}
        st = d.get("status")
        if st == 3:
            return d, time.time() - t0
        if st in (4, 6):
            raise RuntimeError(f"{label}: task {taskid} ended status {st}: {json.dumps(d)[:500]}")
        time.sleep(8)
    raise RuntimeError(f"{label}: timeout")


def download(url, dest):
    import subprocess
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["curl", "-sSL", "--fail", "--retry", "8", "--retry-all-errors", "-C", "-", "-o", str(dest), url], check=True)
    return dest


def log(row):
    with LOG_LOCK:
        new = not LOG.exists()
        with LOG.open("a") as f:
            if new:
                f.write("# Lux3D generation log\n\n| UTC | Object | Step | Input | Task | Seconds | Result | Notes |\n|---|---|---|---|---|---|---|---|\n")
            f.write("| " + " | ".join(str(x).replace("|", "/").replace("\n", " ") for x in row) + " |\n")


def step(slug, name, path, body, outname, input_desc):
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%m-%d %H:%M")
    try:
        tid = create(path, body, f"{slug}/{name}")
        d, secs = wait(tid, f"{slug}/{name}")
        outs = [o.get("content") for o in d.get("outputs", []) if o.get("content")]
        files = []
        for i, u in enumerate(outs):
            ext = u.split("?")[0].rsplit(".", 1)[-1][:5] if "." in u.split("?")[0].rsplit("/", 1)[-1] else "bin"
            files.append(str(download(u, RAW / slug / f"{outname}{'' if i == 0 else '-' + str(i)}.{ext}").relative_to(ROOT)))
        (RAW / slug / f"{outname}.task.json").write_text(json.dumps(d, indent=1))
        log([now, slug, name, input_desc, tid, round(secs), ", ".join(files), ""])
        print(f"[ok] {slug}/{name} {round(secs)}s -> {files}", flush=True)
        return outs
    except Exception as e:
        log([now, slug, name, input_desc, "-", "-", "FAILED", str(e)[:200]])
        print(f"[fail] {slug}/{name}: {e}", flush=True)
        return None


def run(slug):
    o = OBJECTS[slug]
    outs = step(slug, "text-to-3d", "/global/lux3d/v1/generate/text-to-3d/task/create",
                {"prompt": o["prompt"], **GEN}, "base", o["prompt"])
    if not outs:
        return
    if not o.get("motion"):
        return  # prop: generation only, no articulation
    glb = next((u for u in outs if ".glb" in u.split("?")[0]), outs[0])
    step(slug, "articulation", "/global/lux3d/v1/articulation-animation/task/create",
         {"glbUrl": glb, "prompt": o["motion"]}, "articulated", o["motion"])
    if globals().get("SKIP_SPLIT"):
        return
    with SPLIT_LOCK:
        step(slug, "part-split", "/global/lux3d/v1/part-split/task/create",
             {"glbUrl": glb}, "parts", "base.glb")


if __name__ == "__main__":
    KEY = key()
    args = sys.argv[1:]
    if args and args[0].endswith(".json"):
        cfg = json.loads(pathlib.Path(args[0]).read_text())
        GEN.update(cfg.get("gen", {}))
        OBJECTS.clear(); OBJECTS.update(cfg["objects"])
        SKIP_SPLIT = cfg.get("skipSplit", True)
        args = args[1:]
    slugs = args or list(OBJECTS)
    threads = [threading.Thread(target=run, args=(s,)) for s in slugs]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print("done; see docs/generation-log.md")
