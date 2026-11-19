# Submission answers

Answers for the Aholo submission form, kept in git so the wording isn't retyped. Deadline: **Nov 19 2026, 11:00 UTC (12:00 WAT)**. Resubmitting under the same project ID is allowed; the last submission counts.

## Required

**Working demo / promotional video → Demo / video link**
https://www.modelscope.ai/studios/heisemma/rummage
(Same build also at https://rummage-game.vercel.app. Static site, pre-generated Lux3D assets, no API key: keeps working past Dec 31 2026.)

**Project report → Upload file**
`docs/report/Rummage-report.pdf`

## Description fields

**Title:** Rummage

**One-line pitch:** A hide-and-seek game where every drawer, door and lid really opens: all 55 pieces of furniture were generated and articulated by Aholo Lux3D.

**Description:**
Most AI 3D generators give you a statue. Lux3D can also split a model into parts and give each part a real joint, and Rummage is built on that one capability: if every generated drawer really slides and every door really swings, a room full of generated furniture becomes a hide-and-seek board.

The wizard has lost his manor keys. Players rummage through five themed rooms by day and by night (10 levels) with decoys, padlocks, lids that bite, riddles, clue hints and risky bets, or hide a key themselves and send the challenge to a friend. It runs in any WebGL browser, desktop or phone, in English and Simplified Chinese.

How Lux3D builds it: one sentence per piece → Lux3D text-to-3D (median 117 s) → Lux3D articulation from a one-line motion prompt, which returns a URDF plus one GLB per moving part (median 154 s) → the game loads the URDF and every joint becomes a hiding spot. 55 pieces, 107 working joints, none rigged by hand (each room also has two hand-built secret spots). Every call is logged with its prompt and task id.

**Links:**
- Play: https://rummage-game.vercel.app
- ModelScope Studio: https://www.modelscope.ai/studios/heisemma/rummage
- Source: https://github.com/emmaGH1/rummage (judges start here: README → JUDGES.md, `node scripts/check-live.mjs`)
- Demo video: https://github.com/emmaGH1/rummage/releases/download/demo-video/rummage-demo.mp4
- X post: https://x.com/_HEISEMMA/status/2123284040677474348

**Track:** Games (plus any other track the dropdown offers that fits: interactive / creative tools).
**Special awards it qualifies for:** "3D AI New Species" (an interactive, playable use of Lux3D articulation).

**Aholo products used:** Lux3D text-to-3D (G1-Turbo, cartoon style) for all furniture, props and items; Lux3D articulation for every interactive piece (107 joints); part split tried in the capability probe.

**Other tools (disclosure):** three.js, urdf-loader, gltf-transform, Vite; OpenAI image generation (concept mockups and the logo only); Claude and Codex (coding assistants); for the demo video only: ElevenLabs (narration), HyperFrames/HeyGen (composition, music track, some sound effects), Freesound CC0 sound effects. In the game, all music and sound effects are synthesized in code.

**Known limits:** interior shading, per-piece height and an automatic flip for inward-swinging doors are our additions on top of Lux3D output; the two "secret" spots per room are part of our room shell; generation is pre-computed (not live in the browser) by design; not yet tested on a low-end phone or from inside mainland China; the demo video is real footage but three moments were set up to keep it short (the coin flip is set to land heads, the "last key" shot starts with the first keys already found and the clock advanced, and the exploded view pulls the drawers out further than they open in the game).

## After submitting (needs the owner's yes)

- [x] X post with the demo video, @ManycoreTech tagged, #Manycorehackathon: https://x.com/_HEISEMMA/status/2123284040677474348. Register it for the popularity award by Nov 30 04:00 EST.
- Tag the submitted commit `submitted`; keep both sites up until results are out.
