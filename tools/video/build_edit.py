#!/usr/bin/env python3
"""Build the demo video edit (v2) from one timeline.

Inputs: video/assets/footage/<shot>.mp4|.json (tools/video/capture.mjs), video/assets/voice/vo_full.mp3 +
vo_lines.json (ElevenLabs, one take), video/assets/audio/bgm.wav (music), video/assets/sfx/*.mp3.
Outputs: video/assets/audio/master.wav (voice + ducked music + sound effects, loudness-normalised),
video/index.html (footage + overlays) and video/compositions/*.html.
Run: python3 tools/video/build_edit.py   (then: cd video && npx hyperframes render)
"""
import json, pathlib, subprocess, html

ROOT = pathlib.Path(__file__).resolve().parents[2]
V = ROOT / "video"
A = V / "assets"
man = json.loads((ROOT / "app/public/lux3d-manifest.json").read_text())
drawers = next(p for p in man["pieces"] if p["slug"] == "w-drawers")
n_pieces = len(man["pieces"])
n_joints = sum(len(p["joints"]) for p in man["pieces"])
VO = {l["id"]: l for l in json.loads((A / "voice/vo_lines.json").read_text())}

# ---- the timeline: (id, footage shot or None, media start, duration, voice line, voice offset) ----
SEGS = [
    ("intro", "studio_explode", 0.2, 7.4, "L00", 0.9),
    ("title", "title", 0.5, 5.0, "L01", 0.4),
    ("hook", "hook", 0.3, 4.4, "L02", 0.4),
    ("card", None, 0, 4.8, None, 0),
    ("prompt", "studio_turn", 0.0, 7.6, "L04", 0.3),
    ("joints", "studio_explode", 0.0, 10.0, "L05", 0.25),
    ("inroom", "in_room", 0.0, 5.6, "L06", 0.4),
    ("n1", "room_pirate", 0.1, 2.6, "L07", 0.4),
    ("n2", "room_kitchen", 0.1, 2.6, None, 0),
    ("n3", "room_workshop", 0.1, 2.6, None, 0),
    ("map", "map", 0.3, 5.6, "L08", 0.4),
    ("decoy", "decoy", 0.6, 3.6, "L09", 0.5),
    ("padlock", "padlock", 0.5, 6.5, "L10", 0.4),
    ("mimic", "mimic", 0.6, 3.2, "L11", 0.3),
    ("night", "night", 0.3, 8.0, "L12", 0.5),
    ("hint", "hint", 0.3, 6.6, "L13", 0.4),
    ("bet", "bet", 0.2, 6.2, "L14", 0.3),
    ("hurry", "hurry", 0.2, 3.0, "L15", 0.4),
    ("win", "win", 0.6, 5.4, "L16", 0.2),
    ("reveal", "reveal", 1.0, 6.8, "L17", 1.2),
    ("hide", "hide", 0.6, 6.4, "L18", 0.4),
    ("phone", "phone", 0.3, 6.6, "L19", 0.4),
    ("end", None, 0, 7.0, "L20", 0.6),
]
t = 0.0
TL = []
for sid, shot, frm, dur, line, off in SEGS:
    TL.append(dict(id=sid, shot=shot, frm=frm, dur=dur, at=round(t, 3), line=line, off=off))
    t += dur
TOTAL = round(t, 2)
at = {s["id"]: s["at"] for s in TL}

# ---- sound effects: the game's own sound events (logged during capture) mapped to real recordings ----
MAP = {"slide": ["drawer-a", "drawer-b"], "creak": ["hinge", "creak"], "shut": ["lidclack"], "key": ["keyfound"],
       "unlock": ["unlock"], "chomp": ["chomp"], "nope": ["boing"], "hint": ["sparkle"], "lose": ["trombone"],
       "drop": ["lidclack"], "win": ["sparkle"], "empty": ["pop"]}
GAIN = {"drawer-a": 0.9, "drawer-b": 0.9, "hinge": 0.55, "creak": 0.7, "lidclack": 0.45, "keyfound": 0.6, "unlock": 0.9,
        "chomp": 0.9, "boing": 0.7, "sparkle": 0.5, "trombone": 0.6, "pop": 0.5, "whoosh": 0.55, "coinflip": 0.9, "clock": 0.5}
events, rot = [], {}
for s in TL:
    if not s["shot"]:
        continue
    log = json.loads((A / f"footage/{s['shot']}.json").read_text())
    for tt, name in log["sounds"]:
        if not (s["frm"] <= tt < s["frm"] + s["dur"] - 0.05) or name not in MAP:
            continue
        opts = MAP[name]; rot[name] = rot.get(name, -1) + 1
        events.append((round(s["at"] + tt - s["frm"], 3), opts[rot[name] % len(opts)]))
# whooshes on the seams between sections, a sparkle on the Lux3D card, the coin, the clock
for sid in ["title", "card", "prompt", "n1", "map", "hide", "phone", "end"]:
    events.append((max(0, at[sid] - 0.25), "whoosh"))
# the studio shots move their drawers directly (no game sound was logged): drawer slides where they open
events += [(at["intro"] + 0.6, "drawer-a"), (at["joints"] + 0.8, "drawer-a"), (at["joints"] + 1.3, "drawer-b"), (at["joints"] + 1.8, "drawer-a"),
           (at["joints"] + 4.4, "whoosh")]
events += [(at["intro"] + 1.35, "whoosh"), (at["intro"] + 1.5, "pop"), (at["intro"] + 2.3, "sparkle"), (at["card"] + 0.3, "sparkle"), (at["bet"] + 2.2, "coinflip"), (at["hurry"] + 0.1, "clock"), (at["end"] + 0.3, "sparkle")]
events.sort()

def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)

# ---- music: extend the 99 s track by 12 bars, joined on a beat, then fade out ----
B = 60 / 131.9                             # tempo and first beat from `npx hyperframes beats assets/audio/bgm.wav`
b0 = 0.035
cut_b, back_b = 160, 160 - 48              # jump back 48 beats (12 bars) at beat 160
T1, T2 = b0 + cut_b * B, b0 + back_b * B
run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(A / "audio/bgm.wav"), "-filter_complex",
     f"[0:a]atrim=0:{T1 + 0.04},asetpts=N/SR/TB[a];[0:a]atrim={T2}:,asetpts=N/SR/TB[b];[a][b]acrossfade=d=0.04[m];"
     f"[m]atrim=0:{TOTAL},afade=t=out:st={TOTAL - 3}:d=3[o]", "-map", "[o]", "-ar", "48000", "-ac", "2", str(A / "audio/bgm_ext.wav")])

# ---- voice: cut each line out of the one ElevenLabs take and place it ----
vo_in, vo_f = [], []
for s in TL:
    if not s["line"]:
        continue
    L = VO[s["line"]]
    st, en = max(0, L["start"] - 0.06), L["end"] + 0.18
    d = int((s["at"] + s["off"]) * 1000)
    vo_f.append(f"[0:a]atrim={st}:{en},asetpts=N/SR/TB,afade=t=in:d=0.02,afade=t=out:st={en - st - 0.06}:d=0.06,adelay={d}|{d}[v{len(vo_f)}]")
vo_graph = ";".join(vo_f) + ";" + "".join(f"[v{i}]" for i in range(len(vo_f))) + f"amix=inputs={len(vo_f)}:normalize=0,apad=whole_dur={TOTAL}[vo]"
run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(A / "voice/vo_full.mp3"), "-filter_complex", vo_graph, "-map", "[vo]",
     "-t", str(TOTAL), "-ar", "48000", "-ac", "2", str(A / "audio/vo_track.wav")])

# ---- sfx track ----
files = sorted({n for _, n in events})
inputs = sum([["-i", str(A / f"sfx/{n}.mp3")] for n in files], [])
fx = []
for i, (tt, n) in enumerate(events):
    k = files.index(n); d = int(tt * 1000)
    fx.append(f"[{k}:a]volume={GAIN.get(n, 0.6)},adelay={d}|{d}[e{i}]")
fx_graph = ";".join(fx) + ";" + "".join(f"[e{i}]" for i in range(len(fx))) + f"amix=inputs={len(fx)}:normalize=0,apad=whole_dur={TOTAL}[fx]"
run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fx_graph, "-map", "[fx]", "-t", str(TOTAL), "-ar", "48000", "-ac", "2", str(A / "audio/sfx_track.wav")])

# ---- mix: music ducks under the voice, then loudness to -16 LUFS with a -1.5 dB ceiling ----
run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(A / "audio/vo_track.wav"), "-i", str(A / "audio/bgm_ext.wav"), "-i", str(A / "audio/sfx_track.wav"),
     "-filter_complex",
     "[0:a]asplit=2[vo][key];[1:a]volume=0.85[mus];[mus][key]sidechaincompress=threshold=0.02:ratio=4:attack=15:release=450:makeup=1[duck];"
     "[vo]volume=1.9[v];[2:a]volume=0.75[s];[v][duck][s]amix=inputs=3:normalize=0[mix];"
     "[mix]loudnorm=I=-16:TP=-2:LRA=11,alimiter=limit=0.79:level=false[o]",
     "-map", "[o]", "-ar", "48000", "-ac", "2", "-t", str(TOTAL), str(A / "audio/master.wav")])

# ---- composition ----
COMMON = """
  @font-face { font-family: 'Lilita One'; src: url('assets/fonts/LilitaOne.woff2') format('woff2'); }
  #root { position: absolute; inset: 0; font-family: 'Nunito', sans-serif; font-weight: 800; color: #14121f; }
  .badge { position: absolute; font-family: 'Lilita One', sans-serif; font-weight: 400; color: #fff; background: #f0542a;
    border: 5px solid #14121f; border-radius: 16px; padding: 4px 26px 10px; box-shadow: 6px 6px 0 #14121f;
    -webkit-text-stroke: 2px #14121f; paint-order: stroke fill; font-size: 64px; white-space: nowrap; }
  .card { position: absolute; background: #fff6e6; border: 6px solid #14121f; border-radius: 22px; box-shadow: 8px 8px 0 #14121f; }
  .ink { -webkit-text-stroke: 3px #14121f; paint-order: stroke fill; }
  .label { font-size: 30px; letter-spacing: 0.04em; text-transform: uppercase; color: #6b5f86; margin-bottom: 10px; }
  .chip { position: absolute; font-size: 32px; background: #14121f; color: #fff6e6; border-radius: 12px; padding: 8px 18px; }
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
POP = "    tl.fromTo('{s}', {{ opacity: 0, y: 40, rotation: -8 }}, {{ opacity: 1, y: 0, rotation: {r}, duration: 0.45, ease: 'back.out(1.6)' }}, {t:.2f});"
OUT = "    tl.to('{s}', {{ opacity: 0, y: 20, duration: 0.22, ease: 'power3.in' }}, {t:.2f});"
TYPE = """    (() => {{ const el = document.querySelector('{s}'); const txt = el.dataset.text; const o = {{ n: 0 }};
      tl.set(el, {{ textContent: '' }}, 0);
      tl.to(o, {{ n: txt.length, duration: txt.length / {cps}, ease: 'none', onUpdate: () => {{ el.textContent = txt.slice(0, Math.round(o.n)); }} }}, {t:.2f}); }})();"""
scenes = {}
seg = {s["id"]: s for s in TL}

# intro: the chest's top drawer opens and the logo bursts out of it -----------------
scenes["intro"] = scene("intro", """
  #i-dim { position: absolute; inset: 0; background: #1d2a9e; }
  #i-logo { position: absolute; left: 510px; top: 150px; width: 900px; height: 498px; }
  #i-logo img { width: 100%; height: 100%; }
  #i-shine { position: absolute; inset: 0; -webkit-mask-image: url('assets/logo.png'); mask-image: url('assets/logo.png');
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%; overflow: hidden; }
  #i-band { position: absolute; top: -20%; left: 0; width: 34%; height: 140%;
    background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%); }
  #i-tag { position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-family: 'Lilita One', sans-serif; font-weight: 400;
    color: #fff; font-size: 68px; }
  #i-tag .w { display: inline-block; margin: 0 0.12em; } #i-tag .hl { color: #ffc82e; }
""", """    <div id="i-dim"></div>
    <div id="i-logo"><img src="assets/logo.png" alt="Rummage"><div id="i-shine"><div id="i-band"></div></div></div>
    <div id="i-tag" class="ink"><span class="w">A</span><span class="w">hide-and-seek</span><span class="w">game</span><span class="w">where</span><span class="w hl">everything</span><span class="w hl">opens</span></div>""",
"""    tl.fromTo('#i-dim', { opacity: 0 }, { opacity: 0.72, duration: 0.3, ease: 'power2.inOut' }, 1.3);
    tl.fromTo('#i-logo', { opacity: 0, scale: 0.08, rotation: -14, y: 260 }, { opacity: 1, scale: 1, rotation: -2, y: 0, duration: 0.75, ease: 'back.out(1.7)' }, 1.35);
    tl.fromTo('#i-logo', { scaleX: 1, scaleY: 1 }, { scaleX: 1.06, scaleY: 0.94, duration: 0.09, ease: 'power2.out', yoyo: true, repeat: 1 }, 2.1);
    tl.fromTo('#i-band', { xPercent: -120 }, { xPercent: 320, duration: 0.75, ease: 'power2.inOut' }, 2.35);
    tl.fromTo('#i-tag .w', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.13, stagger: 0.1 }, 2.9);
    tl.to('#i-logo, #i-tag', { opacity: 0, filter: 'blur(8px)', duration: 0.22, ease: 'power3.in' }, 7.1);""")

# Lux3D card (blue ground) -------------------------------------------------
scenes["card"] = scene("card", """
  #c-ground { position: absolute; inset: 0; background: #1d2a9e; }
  .q { position: absolute; left: 192px; font-family: 'Lilita One', sans-serif; font-weight: 400; color: #fff; font-size: 104px; line-height: 1.08; }
  .q .w { display: inline-block; margin-right: 0.24em; } .q .hl { color: #ffc82e; }
  #q1 { top: 250px; } #q2 { top: 560px; font-size: 84px; color: #fff6e6; }
""", """    <div id="c-ground"></div>
    <div id="q1" class="q ink"><span class="w">Every</span><span class="w">drawer,</span><span class="w">door</span><span class="w">and</span><span class="w">lid:</span><br><span class="w">made</span><span class="w">with</span><span class="w hl">Aholo</span><span class="w hl">Lux3D</span></div>
    <div id="q2" class="q ink"><span class="w">starting</span><span class="w">from</span><span class="w">one</span><span class="w">sentence.</span></div>""",
"""    tl.fromTo('#q1 .w', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.13, stagger: 0.09 }, 0.15);
    tl.fromTo('#q2 .w', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.13, stagger: 0.1 }, 1.9);
    tl.to('#q1, #q2', { opacity: 0, filter: 'blur(6px)', duration: 0.2 }, 4.55);""")

# step cards -----------------------------------------------------------------
step_css = """
  .step { left: 130px; top: 240px; width: 720px; padding: 74px 40px 36px; }
  .step .badge { left: -18px; top: -46px; font-size: 54px; }
  .typed { font-size: 38px; line-height: 1.32; min-height: 250px; }
"""
scenes["prompt"] = scene("prompt", step_css + "#p-chip { left: 170px; top: 770px; }",
    f"""    <div id="p-card" class="card step clip" data-start="0.2" data-duration="6.75">
      <div class="badge">1 · Text to 3D</div>
      <div class="label">Prompt</div>
      <div id="p-text" class="typed" data-text="{html.escape(drawers['prompt'])}">{html.escape(drawers['prompt'])}</div>
    </div>
    <div id="p-chip" class="chip clip" data-start="4.4" data-duration="2.5">Lux3D G1-Turbo · generated in {drawers['timings']['generate']['seconds']} s</div>""",
    "\n".join([POP.format(s="#p-card", t=0.2, r=-1.5), TYPE.format(s="#p-text", t=0.5, cps=60), POP.format(s="#p-chip", t=4.4, r=-1),
               OUT.format(s="#p-card", t=6.72), OUT.format(s="#p-chip", t=6.72)]))
ex = json.loads((A / "footage/studio_explode.json").read_text())
SHIFT = 240
lab_html, lab_js = [], []
for i, l in enumerate(ex["extra"].get("labels", [])):
    x, y = l["xy"][0] * 1.5 + SHIFT - 40, l["xy"][1] * 1.5 - 40
    hi = next(j["range"][1] for j in drawers["joints"] if j["name"] == l["name"])
    lab_html.append(f'    <div id="j-l{i}" class="jl clip" data-start="5.4" data-duration="3.5" style="left:{x:.0f}px; top:{y:.0f}px"><small>prismatic joint</small>slides {hi:.2f} m</div>')
    lab_js.append(f"    tl.fromTo('#j-l{i}', {{ opacity: 0, scale: 0.6, x: -30 }}, {{ opacity: 1, scale: 1, x: 0, duration: 0.3, ease: 'back.out(2)' }}, {5.4 + i * 0.09:.2f});")
scenes["joints"] = scene("joints", step_css + """
  .jl { position: absolute; font-size: 30px; background: #ffc82e; border: 4px solid #14121f; border-radius: 12px; padding: 4px 14px 6px; box-shadow: 4px 4px 0 #14121f; white-space: nowrap; }
  .jl small { display: block; font-size: 28px; color: #4a3f63; line-height: 1.05; }
  #j-chip { left: 170px; top: 770px; }
""", f"""    <div id="j-card" class="card step clip" data-start="0.2" data-duration="8.7">
      <div class="badge">2 · Articulation</div>
      <div class="label">Motion prompt</div>
      <div id="j-text" class="typed" data-text="{html.escape(drawers['motion'])}">{html.escape(drawers['motion'])}</div>
    </div>
    <div id="j-chip" class="chip clip" data-start="3.6" data-duration="5.3">Split into {len(drawers['parts'])} parts + {len(drawers['joints'])} joints (URDF) · {drawers['timings']['articulate']['seconds']} s</div>
""" + "\n".join(lab_html), "\n".join([POP.format(s="#j-card", t=0.2, r=-1.5), TYPE.format(s="#j-text", t=0.5, cps=46), POP.format(s="#j-chip", t=3.6, r=-1)] + lab_js +
    [OUT.format(s="#j-card", t=8.6), OUT.format(s="#j-chip", t=8.6), OUT.format(s=".jl", t=8.6)]))

# numbers ----------------------------------------------------------------------
nums = [(n_pieces, "Lux3D pieces of furniture"), (n_joints, "working joints = hiding spots"), (10, "levels, by day and by night")]
nb, nj = [], []
for i, (n, label) in enumerate(nums):
    t0 = i * 2.6
    nb.append(f'    <div id="n-{i}" class="num clip" data-start="{t0 + 0.15:.2f}" data-duration="2.4"><div class="big ink" id="n-v{i}">{n}</div><div class="cap">{label}</div></div>')
    nj += [f"    tl.fromTo('#n-{i}', {{ opacity: 0, x: -60 }}, {{ opacity: 1, x: 0, duration: 0.35, ease: 'expo.out' }}, {t0 + 0.15:.2f});",
           f"    (() => {{ const el = document.querySelector('#n-v{i}'); const o = {{ v: 0 }}; tl.set(el, {{ textContent: '0' }}, 0); tl.to(o, {{ v: {n}, duration: 0.9, ease: 'expo.out', onUpdate: () => {{ el.textContent = Math.round(o.v); }} }}, {t0 + 0.2:.2f}); }})();",
           f"    tl.to('#n-{i}', {{ opacity: 0, x: 40, duration: 0.2, ease: 'power3.in' }}, {t0 + 2.35:.2f});"]
scenes["numbers"] = scene("numbers", """
  .num { position: absolute; left: 192px; bottom: 130px; }
  .num .big { font-family: 'Lilita One', sans-serif; font-weight: 400; font-size: 230px; line-height: 0.9; color: #ffc82e; -webkit-text-stroke: 6px #14121f; }
  .num .cap { display: inline-block; margin-top: 10px; font-size: 50px; background: #fff6e6; border: 5px solid #14121f; border-radius: 16px; padding: 6px 22px 10px; box-shadow: 6px 6px 0 #14121f; }
""", "\n".join(nb), "\n".join(nj))

# gameplay badges (the voice says the line; the badge names the feature) ----------
BADGES = [("decoy", "Decoys"), ("padlock", "Padlocks"), ("mimic", "Mimics"), ("night", "Night levels"),
          ("hint", "Hints"), ("bet", "Feeling lucky?"), ("hurry", "Beat the clock"), ("win", "Earn your stars"),
          ("reveal", "Learn from a miss"), ("hide", "Challenge a friend")]
play_start = at["map"]
play_end = at["phone"]
bb, bj = [], []
for i, (sid, text) in enumerate(BADGES):
    s = seg[sid]
    a = s["at"] - play_start + 0.25
    e = s["at"] - play_start + s["dur"] - 0.3
    # bottom-left by default; top-left where the game has its own bar along the bottom
    top = "top: 230px" if sid in ("reveal", "hide") else "bottom: 150px"
    bb.append(f'    <div id="b-{i}" class="badge clip" data-start="{a:.2f}" data-duration="{e - a + 0.25:.2f}" style="left: 120px; {top}">{text}</div>')
    bj += [POP.format(s=f"#b-{i}", t=a, r=-3), OUT.format(s=f"#b-{i}", t=e)]
scenes["play"] = scene("play", "", "\n".join(bb), "\n".join(bj))

# phone ---------------------------------------------------------------------------
scenes["phone"] = scene("phone", """
  #ph-ground { position: absolute; inset: 0; background: #1d2a9e; }
  #ph-text { position: absolute; left: 160px; top: 330px; width: 820px; }
  #ph-t1 { font-family: 'Lilita One', sans-serif; font-weight: 400; color: #fff; font-size: 96px; line-height: 1.05; }
  #ph-t2 { margin-top: 26px; display: inline-block; font-size: 44px; background: #fff6e6; border: 5px solid #14121f; border-radius: 16px; padding: 8px 22px 12px; box-shadow: 6px 6px 0 #14121f; }
""", """    <div id="ph-ground"></div>
    <div id="ph-text"><div id="ph-t1" class="ink">Any browser.<br>Desktop or phone.</div><div id="ph-t2">No install. No account.</div></div>""",
"""    tl.fromTo('#ph-t1', { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.2 }, 0.3);
    tl.fromTo('#ph-t2', { opacity: 0, y: 30, rotation: -5 }, { opacity: 1, y: 0, rotation: -1.5, duration: 0.45, ease: 'back.out(1.6)' }, 0.9);""")

# end card --------------------------------------------------------------------------
scenes["endcard"] = scene("endcard", """
  #e-ground { position: absolute; inset: 0; background: #1d2a9e; }
  #e-logo { position: absolute; left: 150px; top: 330px; width: 760px; }
  #e-text { position: absolute; left: 1000px; top: 330px; width: 780px; }
  #e-play { font-family: 'Lilita One', sans-serif; font-weight: 400; color: #fff; font-size: 64px; }
  #e-url { margin-top: 8px; display: inline-block; font-family: 'Lilita One', sans-serif; font-weight: 400; font-size: 60px; white-space: nowrap; background: #ffc82e; border: 6px solid #14121f; border-radius: 18px; padding: 4px 26px 10px; box-shadow: 8px 8px 0 #14121f; }
  #e-built { margin-top: 56px; color: #fff6e6; font-size: 44px; } #e-built b { color: #ffc82e; }
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

cdir = V / "compositions"
for f in cdir.glob("*.html"):
    f.unlink()
for name, src in scenes.items():
    (cdir / f"{name}.html").write_text(src)

# ---- index.html ----
vids = []
for s in TL:
    if not s["shot"]:
        continue
    if s["id"] == "phone":
        continue
    style = "" if s["id"] not in ("prompt", "joints") else ""
    tag = (f'<video id="v-{s["id"]}" class="clip footage" src="assets/footage/{s["shot"]}.mp4" data-start="{s["at"]}" data-duration="{s["dur"]}" '
           f'data-media-start="{s["frm"]}" data-track-index="1" muted playsinline></video>')
    vids.append(("studio" if s["id"] in ("prompt", "joints") else "plain", tag))
ph = seg["phone"]
hosts = []
def host(cid, start, dur, z=5):
    hosts.append(f'      <div id="{cid}" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" data-start="{start}" data-duration="{dur}" '
                 f'data-track-index="2" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:{z}"></div>')
host("intro", at["intro"], seg["intro"]["dur"])
host("card", at["card"], seg["card"]["dur"])
host("prompt", at["prompt"], seg["prompt"]["dur"])
host("joints", at["joints"], seg["joints"]["dur"])
host("numbers", at["n1"], round(seg["n1"]["dur"] * 3, 2))
host("play", play_start, round(play_end - play_start, 2))
host("phone", ph["at"], ph["dur"], 2)
host("endcard", at["end"], seg["end"]["dur"])
plain = "\n".join("      " + t.replace('class="clip footage"', 'class="clip footage" style="z-index:1"') for k, t in vids if k == "plain")
studio = "\n".join("        " + t for k, t in vids if k == "studio")
index = f"""<!doctype html>
<html lang="en"
  data-composition-variables='[{{"id":"playUrl","type":"string","label":"Play link","default":"rummage-game.vercel.app"}},{{"id":"repoUrl","type":"string","label":"Source link","default":"github.com/emmaGH1/rummage"}}]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #1d2a9e; }}
      #root {{ width: 100%; height: 100%; position: relative; }}
      #ground {{ position: absolute; inset: 0; background: #1d2a9e; }}
      video.footage {{ position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: contain; }}
      /* studio shots: the model sits right of centre so the step card has room on the left */
      .shift {{ position: absolute; inset: 0; transform: translateX({SHIFT}px); z-index: 1; }}
      /* the phone: the real game in portrait inside a device frame */
      #phone-frame {{ position: absolute; left: 1150px; top: 60px; width: 452px; height: 960px; border-radius: 64px; background: #14121f;
        box-shadow: 14px 14px 0 rgba(20, 18, 31, 0.55); z-index: 3; }}
      #v-phone {{ position: absolute; left: 1166px; top: 76px; width: 420px; height: 908px; border-radius: 50px; object-fit: cover; z-index: 4; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1920" data-height="1080">
      <div id="ground"></div>
      <!-- real gameplay, recorded frame by frame from the live build (tools/video/capture.mjs); timeline in tools/video/build_edit.py -->
{plain}
      <div class="shift">
{studio}
      </div>
      <div id="phone-frame" class="clip" data-start="{ph['at']}" data-duration="{ph['dur']}" data-track-index="3"></div>
      <video id="v-phone" class="clip" src="assets/footage/phone.mp4" data-start="{ph['at']}" data-duration="{ph['dur']}" data-media-start="{ph['frm']}" data-track-index="4" muted playsinline></video>

{chr(10).join(hosts)}

      <!-- voice (ElevenLabs), music ducked under it, and sound effects at the moments the game played them -->
      <audio id="master" class="clip" src="assets/audio/master.wav" data-start="0" data-duration="{TOTAL}" data-track-index="5" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
(V / "index.html").write_text(index)
(V / "edit2.json").write_text(json.dumps({"total": TOTAL, "timeline": TL, "sfx": events}, indent=1))
print(f"total {TOTAL}s, {len(TL)} segments, {len(events)} sound effects, {len(vo_f)} voice lines")
