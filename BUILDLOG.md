# Build log

Plain record of how Rummage was built, November 17–19 2026 (UTC). Times are approximate, from commits and `docs/generation-log.md`.

## Picking the idea (Nov 17)

- Read the rules first: Lux3D must do substantive work, every tool must be disclosed, no faked demos, and a demo link must keep working until Dec 31 2026 (so no live API key in the public build).
- Ideas considered: a shade-canopy designer ("Make Shade"), a fold-away apartment, and articulated hide-and-seek. **Dropped** the first two because Lux3D would only produce static props there; anyone could swap in another generator. **Picked** hide-and-seek because the game only exists if Lux3D's *articulation* works: every hiding spot is a joint Lux3D produced.

## The hard part first (Nov 18, 07:20–07:45)

- Before any game code: three objects through text-to-3D → articulation → part split, on the real API.
- Articulation returned a ZIP with `urdf/robot.urdf` and one GLB per moving part, with correct joint types (drawers prismatic, lids and doors revolute). That settled the design: load the URDF directly, no hand rigging.
- Three downloads failed: the CDN truncated large result files (for example 2.5 MB of 31.6 MB). Fix: re-download with curl and retries from the saved task id (`tools/retry_articulation.py`). Logged in `docs/generation-log.md`.

## Building (07:45–14:30)

- Art direction: two rounds of concept mockups, picked "Comic Ink". Lux3D's `photorealistic` style articulated fine but clashed with it, so every piece was regenerated in `cartoon` style with the palette in the prompt.
- 08:15 first playable loop (hide → time limit → seek → found). 08:20 scope grew to a five-room manor with levels, decoys, padlocks, mimics, riddles and stars.
- Problems hit and fixed (all disclosed in the report):
  - Generated bodies are hollow shells, so you could see through an open door. Added a dark back-face copy of each body as its interior.
  - Scales were inconsistent (a 15 cm wardrobe next to a 2 m one). Each piece gets a target height.
  - For some double doors both hinges had the same sign, so one door swung inward. At load time each door is test-opened and flipped if it moves backwards.
  - A race measured pieces before their meshes loaded (2–3× too big). Now waits for every link's visual.
  - Raw articulation output was about 30 MB per piece. Compressed to about 1.5 MB with gltf-transform.
  - The build disk filled up mid-run and some pieces were lost; they were re-generated from their prompts ("redo" sets in `tools/`).
- Performance pass for phones: meshes simplified to about 25% of their triangles (2.8 M → 0.8 M), shadows redrawn only while parts move.
- 12:50 Night levels with a flashlight, secret spots in each room shell, Day/Night map, logo, Vercel hosting.

## Playtest feedback (14:30–15:10)

- The owner finished all 10 levels in under 20 minutes and reported that the key was "in the carpet 8 of 10 times".
- Measured it: the placement weighted keys toward the smallest parts so strongly that one writing box held a key in **99%** of library runs, and the floorboard in up to 87% of night runs. Also every hint just said "look around here".
- Fixed: equal odds per openable part, keys at varied positions inside a drawer, secret spots as an occasional surprise. Re-measured over 2,000 runs per level: worst spot 23% (`tools/key_stats.mjs`). Hints became clues in words; added bets on levels 5–10 and a reveal of missed keys on a loss. A second model (GPT-6.2 Astra via Codex) reviewed the plan and changed two decisions (no anti-repeat memory, portrait-first on phones).

## Demo video (15:10–22:20)

- The build machine has no GPU and its CPU was throttled by the host, so a screen recording stuttered. Built a frame-by-frame recorder: the game's clock is frozen and stepped 1/30 s per frame (`tools/video/capture.mjs`), and the game logs each sound it plays so the video's sound effects land on the right frames.
- Three rounds of feedback: v1 rated 4/10 (weak music and sound, the game looked unfinished). v2 added real sound effects, one music track, a bigger UI with camera push-ins, and the title, map, challenge and phone screens. v3 added a builder-narrated script and an animated logo intro.

## Language (Nov 18, 22:40–23:30)

- Organisers and many judges are likely Chinese readers. Added Simplified Chinese that follows the browser language, with a 中文/EN switch. Bundled all fonts because Google Fonts is blocked in mainland China; the Chinese display font is cut down to the 456 characters used (48 KB).

## Left unverified

- Not tested on a real low-end phone or from inside mainland China.
- The demo video's mix was measured (loudness, peaks) but only listened to by the owner.
