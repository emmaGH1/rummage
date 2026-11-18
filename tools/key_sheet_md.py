#!/usr/bin/env python3
"""Turn `node tools/key_sheet.mjs <url> <seed>` JSON (stdin) into docs/KEY-SHEET.md tables."""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
names = dict(re.findall(r"'([a-z]+-[a-z0-9-]+)': '((?:[^'\\]|\\.)*)'", (ROOT / "app/src/rooms.js").read_text().split("export const NAMES")[1]))
names = {k: v.replace("\\'", "'") for k, v in names.items()}
LEVELS = {5: "The Grand Library (Day)", 6: "Study by Candlelight (Night, Wizard's Study)", 7: "Midnight Mutiny (Night, Captain's Cabin)",
          8: "The Kitchen After Dark (Night, Haunted Kitchen)", 9: "Toys That Bite (Night, Toy Workshop)", 10: "The Last Key (Night, Grand Library)"}
seed = sys.argv[1] if len(sys.argv) > 1 else "1"
def part(i):
    n = names.get(i["slug"], i["slug"])
    if i["slug"].startswith("secret-"):
        return f"**{n}** (secret spot)"
    j = re.sub(r"_?joint$", "", i["joint"]).replace("_", " ").strip()
    j = re.sub(r"^(door|drawer|lid|cover|chest lid|globe top half)\b", r"\1", j)
    return f"**{n}**, {j}" + (" 🔒" if i.get("locked") else "")
plain = lambda i: part(i).replace("**", "")
out = []
for l in json.load(sys.stdin):
    by = lambda k: [i for i in l["items"] if i["kind"] == k]
    out.append(f"## {l['id']} · {LEVELS[l['id']]} · [play](https://rummage-game.vercel.app/?level={l['id']}&seed={seed})")
    out.append("| | Where |\n|---|---|")
    for n, k in enumerate(by("key"), 1):
        riddle = f" (riddle: \"{l['riddle']}\")" if l["riddle"] and n == len(by("key")) else ""
        out.append(f"| Key {n} | {part(k)}{riddle} |")
    for k in by("lockkey"):
        out.append(f"| Brass key | {part(k)} |")
    out.append(f"| Decoys | {'; '.join(plain(i) for i in by('decoy')) or 'none'} |")
    out.append(f"| Mimics | {'; '.join(plain(i) for i in l['mimics']) or 'none'} |\n")
print("\n".join(out))
