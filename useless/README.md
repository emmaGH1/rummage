# The Useless Box

A box with one job: turning itself off. Flip the switch, the lid opens, a glove comes out and flips it back. It gets moodier the more you try (fake-outs, slams, a wave, naps), and at some point the cabinet next to it joins in.

Built for the **Most Useless Award** at the Manycore Aholo Global 3D AI Hackathon, by the team behind [Rummage](https://rummage-game.vercel.app).

## What Lux3D did

| Piece | Lux3D | What moves |
|---|---|---|
| The box (`u-box`) | text-to-3D, then articulation from *"The top lid swings upward and backward on a hinge along its back edge"* | the lid, on the URDF joint Lux3D returned |
| The cabinet (`u-cabinet`) | text-to-3D, then articulation from *"The two front doors swing outward… and the bottom drawer slides straight out"* | two doors and a drawer |
| The glove hand (`u-hand`) | text-to-3D | moved by code |

Every call is logged with its prompt and task id in [`docs/generation-log.md`](../docs/generation-log.md) (rows starting with `u-`). The prompts are in [`tools/set-useless.json`](../tools/set-useless.json). Nothing was rigged by hand: the joints come straight from Lux3D's URDF, loaded with three.js and urdf-loader.

Code, not Lux3D: the hand's path, the box's moods, the synthesized sounds, the desk, the toon shading (shared with Rummage).

## Run it

```bash
cd app && npm install   # shared dependencies
cd ../useless && npm run dev
```

Works in any WebGL browser, phone or desktop, in English and Simplified Chinese (follows the browser language, or tap 中文).
