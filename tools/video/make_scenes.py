#!/usr/bin/env python3
"""Write video/compositions/*.html: the overlay scenes for the demo video, in the game's Comic Ink style.
Facts come from app/public/lux3d-manifest.json and the capture logs, so the on-screen numbers match the game."""
import json, pathlib, html
ROOT = pathlib.Path(__file__).resolve().parents[2]
V = ROOT / "video"
man = json.loads((ROOT / "app/public/lux3d-manifest.json").read_text())
drawers = next(p for p in man["pieces"] if p["slug"] == "w-drawers")
explode = json.loads((V / "assets/footage/studio_explode.json").read_text())
n_pieces = len(man["pieces"])
n_joints = sum(len(p["joints"]) for p in man["pieces"])
SHIFT = 240  # studio footage sits this far right (video/index.html .shift)
n_props = len(list((ROOT / "app/public/props").glob("*.glb")))

COMMON = """
  @font-face { font-family: 'Lilita One'; src: url('assets/fonts/LilitaOne.woff2') format('woff2'); }
  #root { position: absolute; inset: 0; font-family: 'Nunito', sans-serif; font-weight: 800; color: #14121f; }
  .badge { position: absolute; font-family: 'Lilita One', sans-serif; font-weight: 400; color: #fff; background: #f0542a;
    border: 5px solid #14121f; border-radius: 16px; padding: 4px 24px 10px; box-shadow: 6px 6px 0 #14121f;
    -webkit-text-stroke: 2px #14121f; paint-order: stroke fill; font-size: 56px; white-space: nowrap; }
  .card { position: absolute; background: #fff6e6; border: 6px solid #14121f; border-radius: 22px; box-shadow: 8px 8px 0 #14121f; }
  .ink { -webkit-text-stroke: 3px #14121f; paint-order: stroke fill; }
"""
def scene(cid, css, body, js):
    return f"""<template>
  <style>{COMMON}{css}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="1920" data-height="1080">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{js}
    window.__timelines["{cid}"] = tl;
  </script>
</template>
"""
# entrance helpers (JS)
POP = "tl.fromTo('{sel}', {{ opacity: 0, y: 40, rotation: -7 }}, {{ opacity: 1, y: 0, rotation: {rot}, duration: 0.45, ease: 'back.out(1.6)' }}, {t});"
OUT = "tl.to('{sel}', {{ opacity: 0, y: 20, duration: 0.22, ease: 'power3.in' }}, {t});"
TYPE = """(() => {{ const el = document.querySelector('{sel}'); const txt = el.dataset.text; const o = {{ n: 0 }};
      tl.set(el, {{ textContent: '' }}, 0);
      tl.to(o, {{ n: txt.length, duration: txt.length / 38, ease: 'none', onUpdate: () => {{ el.textContent = txt.slice(0, Math.round(o.n)); }} }}, {t}); }})();"""
def pop(sel, t, rot=-1.5): return "    " + POP.format(sel=sel, t=t, rot=rot)
def out(sel, t): return "    " + OUT.format(sel=sel, t=t)
def typ(sel, t): return "    " + TYPE.format(sel=sel, t=t)

scenes = {}
# 1. hook ---------------------------------------------------------------
scenes["hook"] = scene("hook", """
  #h-logo { position: absolute; left: 640px; top: 70px; width: 640px; }
  #h-line { left: 192px; bottom: 120px; padding: 18px 34px 22px; font-size: 52px; }
""", """    <img id="h-logo" class="clip" src="assets/logo.png" data-start="2.2" data-duration="4.8" alt="Rummage">
    <div id="h-line" class="card clip" data-start="4" data-duration="3">Every drawer, door and lid opens.</div>""",
"\n".join([
    "    tl.fromTo('#h-logo', { opacity: 0, scale: 1.7, rotation: 6 }, { opacity: 1, scale: 1, rotation: -2, duration: 0.5, ease: 'back.out(1.8)' }, 2.2);",
    pop('#h-line', 4.0), out('#h-line', 6.7), "    tl.to('#h-logo', { opacity: 0, duration: 0.2 }, 6.75);"]))

# 2. question -----------------------------------------------------------
scenes["question"] = scene("question", """
  #q-ground { position: absolute; inset: 0; background: #1d2a9e; }
  .q-line { position: absolute; left: 192px; font-family: 'Lilita One', sans-serif; font-weight: 400; color: #fff; font-size: 104px; line-height: 1.05; }
  .q-line .w { display: inline-block; margin-right: 0.24em; }
  .q-line .hl { color: #ffc82e; }
  #q-1 { top: 300px; } #q-2 { top: 560px; }
""", """    <div id="q-ground"></div>
    <div id="q-1" class="q-line ink"><span class="w">Every</span><span class="w">piece</span><span class="w">of</span><span class="w">furniture</span><br><span class="w">was</span><span class="w">generated</span><span class="w">by</span><span class="w hl">Lux3D</span></div>
    <div id="q-2" class="q-line ink"><span class="w">from</span><span class="w">one</span><span class="w">sentence.</span></div>""",
"""    tl.fromTo('#q-1 .w', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.13, stagger: 0.09 }, 0.1);
    tl.fromTo('#q-2 .w', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.13, stagger: 0.12 }, 1.6);
    tl.to('#q-1, #q-2', { opacity: 0, filter: 'blur(6px)', duration: 0.18 }, 3.3);""")

# 3. prompt (step 1) ----------------------------------------------------
step_css = """
  .step-card { left: 150px; top: 250px; width: 700px; padding: 74px 40px 36px; }
  .step-card .badge { left: -18px; top: -44px; font-size: 52px; }
  .label { font-size: 30px; letter-spacing: 0.04em; text-transform: uppercase; color: #6b5f86; margin-bottom: 10px; }
  .typed { font-size: 38px; line-height: 1.32; min-height: 250px; }
  .chip { position: absolute; font-size: 30px; background: #14121f; color: #fff6e6; border-radius: 12px; padding: 8px 18px; }
"""
prompt_txt = drawers["prompt"]
scenes["prompt"] = scene("prompt", step_css + """
  #p-chip { left: 190px; top: 760px; }
""", f"""    <div id="p-card" class="card step-card clip" data-start="0.2" data-duration="7.7">
      <div class="badge" id="p-badge">1 · Text to 3D</div>
      <div class="label">Prompt</div>
      <div id="p-text" class="typed" data-text="{html.escape(prompt_txt)}">{html.escape(prompt_txt)}</div>
    </div>
    <div id="p-chip" class="chip clip" data-start="5.6" data-duration="2.3">Lux3D G1-Turbo · generated in {drawers['timings']['generate']['seconds']} s</div>""",
"\n".join([pop('#p-card', 0.2), typ('#p-text', 0.7), pop('#p-chip', 5.6, -1), out('#p-card', 7.6), out('#p-chip', 7.6)]))

# 4. joints (step 2) ----------------------------------------------------
labels = explode["extra"].get("labels", [])
lab_html, lab_js = [], []
for i, l in enumerate(labels):
    x, y = l["xy"][0] + SHIFT - 40, l["xy"][1] - 40
    lo, hi = next(j["range"] for j in drawers["joints"] if j["name"] == l["name"])
    lab_html.append(f'    <div id="j-l{i}" class="jl clip" data-start="5.4" data-duration="3.5" style="left:{x}px; top:{y}px"><small>prismatic joint</small>slides {hi:.2f} m</div>')
    lab_js.append(f"    tl.fromTo('#j-l{i}', {{ opacity: 0, scale: 0.6, x: -30 }}, {{ opacity: 1, scale: 1, x: 0, duration: 0.3, ease: 'back.out(2)' }}, {5.4 + i * 0.09:.2f});")
scenes["joints"] = scene("joints", step_css + """
  .jl { position: absolute; font-size: 30px; background: #ffc82e; border: 4px solid #14121f; border-radius: 12px; padding: 4px 14px 6px; box-shadow: 4px 4px 0 #14121f; white-space: nowrap; }
  .jl small { display: block; font-size: 28px; color: #4a3f63; line-height: 1.05; }
  #j-chip { left: 190px; top: 760px; }
""", f"""    <div id="j-card" class="card step-card clip" data-start="0.2" data-duration="8.7">
      <div class="badge">2 · Articulation</div>
      <div class="label">Motion prompt</div>
      <div id="j-text" class="typed" data-text="{html.escape(drawers['motion'])}">{html.escape(drawers['motion'])}</div>
    </div>
    <div id="j-chip" class="chip clip" data-start="3.8" data-duration="5.1">Split into {len(drawers['parts'])} parts + {len(drawers['joints'])} joints (URDF) · {drawers['timings']['articulate']['seconds']} s</div>
""" + "\n".join(lab_html),
"\n".join([pop('#j-card', 0.2), typ('#j-text', 0.6), pop('#j-chip', 3.8, -1)] + lab_js + [out('#j-card', 8.6), out('#j-chip', 8.6), out('.jl', 8.6)]))

# 5. in the room (step 3) ----------------------------------------------
scenes["inroom"] = scene("inroom", """
  #r-badge { left: 192px; bottom: 130px; font-size: 60px; }
""", """    <div id="r-badge" class="badge clip" data-start="0.3" data-duration="3.5">3 · Every joint is a hiding spot</div>""",
"\n".join([pop('#r-badge', 0.3, -3), out('#r-badge', 3.55)]))

# 6. numbers -------------------------------------------------------------
nums = [(n_pieces, "Lux3D pieces of furniture"), (n_joints, "working joints = hiding spots"), (n_props, "Lux3D props and items"), (10, "levels, day and night")]
nb, nj = [], []
for i, (n, label) in enumerate(nums):
    t0 = i * 2.5
    nb.append(f'    <div id="n-{i}" class="num clip" data-start="{t0 + 0.2}" data-duration="2.25"><div class="big ink" id="n-v{i}" data-to="{n}">{n}</div><div class="cap">{label}</div></div>')
    nj.append(f"    tl.fromTo('#n-{i}', {{ opacity: 0, x: -60 }}, {{ opacity: 1, x: 0, duration: 0.35, ease: 'expo.out' }}, {t0 + 0.2});")
    nj.append(f"    (() => {{ const el = document.querySelector('#n-v{i}'); const o = {{ v: 0 }}; tl.set(el, {{ textContent: '0' }}, 0); tl.to(o, {{ v: {n}, duration: 0.9, ease: 'expo.out', onUpdate: () => {{ el.textContent = Math.round(o.v); }} }}, {t0 + 0.25}); }})();")
    nj.append(f"    tl.to('#n-{i}', {{ opacity: 0, x: 40, duration: 0.2, ease: 'power3.in' }}, {t0 + 2.25});")
scenes["numbers"] = scene("numbers", """
  .num { position: absolute; left: 192px; bottom: 140px; }
  .num .big { font-family: 'Lilita One', sans-serif; font-weight: 400; font-size: 230px; line-height: 0.9; color: #ffc82e; -webkit-text-stroke: 6px #14121f; }
  .num .cap { display: inline-block; margin-top: 10px; font-size: 48px; background: #fff6e6; border: 5px solid #14121f; border-radius: 16px; padding: 6px 22px 10px; box-shadow: 6px 6px 0 #14121f; }
""", "\n".join(nb), "\n".join(nj))

# 7. gameplay captions --------------------------------------------------
caps = [
    (0.0, 4.3, "Decoys", "Not everything shiny is a key."),
    (4.3, 6.4, "Padlocks", "Find the little brass key first."),
    (10.7, 3.4, "Mimics", "Some lids bite back: +5 seconds."),
    (14.1, 7.5, "Night levels", "Search by flashlight. Some keys hide outside the furniture."),
    (21.6, 8.7, "Hints and bets", "Hints give clues. Or bet your time on a coin flip."),
    (30.3, 3.8, "Beat the clock", None),
    (34.1, 2.6, "Find every key", None),
]
cb, cj = [], []
for i, (t0, d, head, line) in enumerate(caps):
    inner = f'<div class="badge">{head}</div>' + (f'<div class="sub">{line}</div>' if line else "")
    s, e = t0 + 0.3, t0 + d - 0.3
    top = ' style="width: 560px"' if head == "Hints and bets" else ''  # narrower: the bet menu opens mid-screen in this shot
    cb.append(f'    <div id="c-{i}" class="cap clip"{top} data-start="{s:.2f}" data-duration="{e - s + 0.05:.2f}">{inner}</div>')
    cj.append(f"    tl.fromTo('#c-{i} .badge', {{ opacity: 0, y: 40, rotation: -8 }}, {{ opacity: 1, y: 0, rotation: -3, duration: 0.45, ease: 'back.out(1.6)' }}, {s:.2f});")
    if line:
        cj.append(f"    tl.fromTo('#c-{i} .sub', {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' }}, {s + 0.15:.2f});")
    cj.append(f"    tl.to('#c-{i} > *', {{ opacity: 0, y: 20, duration: 0.2, ease: 'power3.in' }}, {e - 0.2:.2f});")
scenes["play"] = scene("play", """
  .cap { position: absolute; left: 150px; top: 610px; width: 820px; }
  .cap .badge { position: relative; display: inline-block; font-size: 64px; }
  .cap .sub { margin-top: 18px; display: inline-block; font-size: 38px; line-height: 1.25; background: #fff6e6; border: 5px solid #14121f; border-radius: 16px; padding: 10px 22px 14px; box-shadow: 6px 6px 0 #14121f; }
""", "\n".join(cb), "\n".join(cj))

# 8. end card --------------------------------------------------------------
scenes["endcard"] = scene("endcard", """
  #e-ground { position: absolute; inset: 0; background: #1d2a9e; }
  #e-logo { position: absolute; left: 150px; top: 330px; width: 760px; }
  #e-text { position: absolute; left: 1000px; top: 330px; width: 780px; }
  #e-play { font-family: 'Lilita One', sans-serif; font-weight: 400; color: #fff; font-size: 64px; }
  #e-url { margin-top: 8px; display: inline-block; font-family: 'Lilita One', sans-serif; font-weight: 400; font-size: 60px; white-space: nowrap; background: #ffc82e; border: 6px solid #14121f; border-radius: 18px; padding: 4px 26px 10px; box-shadow: 8px 8px 0 #14121f; }
  #e-built { margin-top: 56px; color: #fff6e6; font-size: 44px; }
  #e-built b { color: #ffc82e; }
  #e-repo { margin-top: 14px; color: #fff6e6; font-size: 34px; opacity: 0.9; }
""", """    <div id="e-ground"></div>
    <img id="e-logo" class="clip" src="assets/logo.png" data-start="0.1" data-duration="6.9" alt="Rummage">
    <div id="e-text">
      <div id="e-play" class="ink">Play free in your browser</div>
      <div id="e-url" data-var-text="playUrl">rummage-game.vercel.app</div>
      <div id="e-built">Built with <b>Aholo Lux3D</b></div>
      <div id="e-repo" data-var-text="repoUrl">github.com/emmaGH1/rummage</div>
    </div>""",
"""    tl.fromTo('#e-logo', { opacity: 0, scale: 1.5, rotation: 5 }, { opacity: 1, scale: 1, rotation: -2, duration: 0.5, ease: 'back.out(1.8)' }, 0.1);
    tl.fromTo('#e-play', { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.2 }, 0.6);
    tl.fromTo('#e-url', { opacity: 0, y: 40, rotation: -6 }, { opacity: 1, y: 0, rotation: -2, duration: 0.45, ease: 'back.out(1.6)' }, 0.85);
    tl.fromTo('#e-built', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.4);
    tl.fromTo('#e-repo', { opacity: 0 }, { opacity: 0.9, duration: 0.25 }, 1.7);""")

for name, src in scenes.items():
    (V / "compositions" / f"{name}.html").write_text(src)
print("scenes:", ", ".join(scenes), "| labels:", len(labels), "| numbers:", [n for n, _ in nums])
