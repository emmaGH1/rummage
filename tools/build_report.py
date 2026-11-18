#!/usr/bin/env python3
"""Fill docs/report/template.html with live numbers and render docs/report/Rummage-report.pdf.

Numbers come from app/public/lux3d-manifest.json and app/src/rooms.js; screenshots are expected in
docs/report/img/ (see tools/report_shots.mjs). PDF is printed with headless Chromium."""
import json, pathlib, re, subprocess, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
REP = ROOT / "docs" / "report"
man = json.loads((ROOT / "app/public/lux3d-manifest.json").read_text())
pieces = {p["slug"]: p for p in man["pieces"]}
rooms_js = (ROOT / "app/src/rooms.js").read_text()

# parse room blocks from rooms.js: name, item slugs, prop slugs
rooms = []
for key, label in [("wizard", "Wizard's Study"), ("pirate", "Captain's Cabin"), ("kitchen", "Haunted Kitchen"),
                   ("workshop", "Toy Workshop"), ("library", "Grand Library")]:
    m = re.search(rf"\n  {key}: \{{(.*?)\n  \}},", rooms_js, re.S)
    if not m:
        continue
    block = m.group(1)
    items_part, _, props_part = block.partition("props:")
    items = [s for s in re.findall(r"slug: '([^']+)'", items_part) if s in pieces]
    props = re.findall(r"slug: '([^']+)'", props_part)
    props = [s for s in props if (ROOT / f"app/public/props/{s}.glb").exists()]
    joints = sum(len(pieces[s]["joints"]) for s in items)
    rooms.append((label, items, joints, props))

n_pieces = sum(len(r[1]) for r in rooms)
n_parts = sum(r[2] for r in rooms)
n_props = len(list((ROOT / "app/public/props").glob("*.glb")))

room_rows = "\n".join(f"<tr><td>{html.escape(l)}</td><td>{len(i)}</td><td>{j}</td><td>{len(p)}</td></tr>" for l, i, j, p in rooms)
room_rows += f"\n<tr><td><b>Total</b></td><td><b>{n_pieces}</b></td><td><b>{n_parts}</b></td><td><b>{n_props}</b> (incl. items)</td></tr>"

def abridge(t, n=95):
    t = t.replace("cartoon ", "").replace(", chunky simple shapes, single isolated object", "")
    return t if len(t) <= n else t[: n - 1] + "…"

piece_rows = []
for l, items, _, _ in rooms:
    for s in items:
        p = pieces[s]
        jt = ", ".join(sorted({j["type"] for j in p["joints"]}))
        g = p["timings"].get("generate", {}).get("seconds", "–")
        a = p["timings"].get("articulate", {}).get("seconds", "–")
        piece_rows.append(f"<tr><td>{html.escape(s)}</td><td>{html.escape(abridge(p['prompt']))}</td><td>{len(p['joints'])} ({jt})</td><td>{g} / {a}</td></tr>")

timeline = [
    ("Nov 17", "Brief, rules and competitor scan. Ideas: shade canopy vs articulated hide-and-seek. Chose <b>articulation</b> as Lux3D's distinctive feature."),
    ("Nov 18 07:20", "Registered; capability probe: 3 objects → text-to-3D → articulation → part split. Articulation returned URDF + per-part GLBs on the first try."),
    ("07:45", "Concept mockups (2 rounds, 9 styles). Picked Comic Ink. Six cartoon furniture pieces generated and articulated."),
    ("08:15", "First playable: hide → time limit → seek → found, in the wizard's study."),
    ("08:20–09:30", "Scope grew to the five-room manor: levels, keys, decoys, locks, mimics, riddles, stars. Pirate cabin, kitchen and workshop generated."),
    ("09:30–10:15", "Grand library + 25 props; Made-with-Lux3D panel; automated playtest; first ModelScope deploy."),
    ("10:15–", "Phone layouts, sound toggles, strategic key hiding, deadline effects, six songs, Lux3D keys and decoys, 15 extra small pieces."),
]
timeline_rows = "\n".join(f"<tr><td>{w}</td><td>{t}</td></tr>" for w, t in timeline)

out = (REP / "template.html").read_text()
for k, v in {"ROOMS": str(len(rooms)), "PIECES": str(n_pieces), "PARTS": str(n_parts), "PROPS": str(n_props),
             "ROOMTABLE": room_rows, "PIECETABLE": "\n".join(piece_rows), "TIMELINE": timeline_rows}.items():
    out = out.replace("{{" + k + "}}", v)
(REP / "report.html").write_text(out)
pdf = REP / "Rummage-report.pdf"
subprocess.run(["chromium", "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                "--virtual-time-budget=8000", f"--print-to-pdf={pdf}", f"file://{REP / 'report.html'}"],
               check=True, capture_output=True)
print(f"{len(rooms)} rooms, {n_pieces} pieces, {n_parts} parts, {n_props} props -> {pdf.relative_to(ROOT)}")
