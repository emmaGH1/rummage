# Snorfle

Play: **https://snorfle-game.vercel.app** · Report: [Snorfle-report.pdf](Snorfle-report.pdf)

A ragebait escape room with a meaningless name, for the **Most Useless Award** (Manycore Aholo Global 3D AI Hackathon). The goal is to leave the room. The exit is right there. Deputy Latch, a petty little wooden box with googly eyes who is "in charge of exits", talks you through it by flapping his lid, rolls his eyes at you, and invents a new rule on your EXIT CHECKLIST every time you get close.

The EXIT is a wardrobe. The key is in whichever drawer you open fourth, and it's decorative. A CAPTCHA asks you to open every object that opens, and stalls at 7/8 until you open Deputy Latch. You tidy the room and one drawer slides back out. There's an exit quiz ("Are you still in the room?"). To leave you must switch Deputy Latch off, and its glove switches it back on, twice. Then you escape: into the wardrobe. Wisdom gained: 0.

Quitting doesn't work either: three useless confirmation steps, a progress bar stuck at 99.99%, a list of everything you could have done with the time ("You are never getting that time back"), and finally "Fact: this is a website. Close the tab." Deputy Latch talks in bubbles, sticky notes, notifications, news tickers, ransom notes and fake system alerts, over elevator music that drifts out of tune.

## Lux3D

Every door, drawer, lid and the switch is a joint from a URDF returned by Aholo Lux3D articulation, loaded with three.js + urdf-loader. Nothing was rigged by hand.

- **New for this entry:** Deputy Latch box (lid + a toggle-switch joint that Lux3D found on its own), a mint cabinet and the glove (text-to-3D). Prompts in [`tools/set-useless.json`](../tools/set-useless.json).
- **Reused from Rummage:** wardrobe, chest of drawers, fridge, safe, toy chest, jack-in-the-box.
- Every call, with prompt and task id: [`docs/generation-log.md`](../docs/generation-log.md).

Ours, not Lux3D's: the story and facts, the room shell and EXIT sign, the glove's path, synthesized sounds, toon shading (shared with Rummage). English and Simplified Chinese.

## Run it

```bash
cd app && npm install      # shared dependencies
cd ../useless && npm run dev
```
