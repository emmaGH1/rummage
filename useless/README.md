# The Obvious Oracle

Play: **https://the-obvious-oracle.vercel.app**

A wooden oracle that reveals extremely obvious facts, then turns itself off. Flip the switch to receive wisdom: drumroll, the lid creaks open, a glove rises, and the oracle reveals FACT #n ("Water is wet.", "You are now breathing manually."), 50 of them, all true, all useless. Then the glove flips the switch back off. Wisdom gained: 0.

Built for the **Most Useless Award** at the Manycore Aholo Global 3D AI Hackathon, by the team behind [Rummage](https://rummage-game.vercel.app).

## What Lux3D did

| Piece | Lux3D | What moves |
|---|---|---|
| The oracle box (`u-box`) | text-to-3D, then articulation from *"The top lid swings upward and backward on a hinge along its back edge"* | the lid and the toggle switch (Lux3D found the switch on its own), on the URDF joints Lux3D returned |
| The cabinet (`u-cabinet`) | text-to-3D, then articulation from *"The two front doors swing outward… and the bottom drawer slides straight out"* | two doors and a drawer |
| The glove hand (`u-hand`) | text-to-3D | moved by code |

Every call is logged with its prompt and task id in [`docs/generation-log.md`](../docs/generation-log.md) (rows starting with `u-`). The prompts are in [`tools/set-useless.json`](../tools/set-useless.json). Nothing was rigged by hand: the joints come straight from Lux3D's URDF, loaded with three.js and urdf-loader.

Code, not Lux3D: the hand's path, the 50 facts and replies, the synthesized sounds, the desk, the toon shading (shared with Rummage).

## Run it

```bash
cd app && npm install   # shared dependencies
cd ../useless && npm run dev
```

Works in any WebGL browser, phone or desktop, in English and Simplified Chinese (follows the browser language, or tap 中文).
