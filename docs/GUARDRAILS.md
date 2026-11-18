# Rummage — sprint guardrails
Set 2026-11-18 ~06:50 UTC. Hard deadline: 11:00 UTC Nov 19 (06:00 EST). Internal submit target: 06:00 UTC Nov 19.

## The product (frozen)
Rummage: a 2-player hide-and-seek game in one 3D room where every furniture part opens.
Hider places a key and picks a time limit (30s / 1m / 2m / 5m / untimed). Seeker clicks furniture to open it.
Score = time taken + number of things opened. Lux3D generates the furniture; its part split + articulation make it openable.

## Must not derail
1. **Scope = docs/PLAN-v2.md** (5 levels, story + challenge modes), as expanded by the user at 08:20 UTC on Nov 18. Still no multiplayer server, accounts, level editor, VR or native app.
   Sharing a challenge is done by putting the challenge in a URL. No backend.
2. **Pre-generated assets only in the public demo.** No live Lux3D calls or API keys in the browser. Demo must work until Dec 31.
3. **Lux3D must visibly do the core job.** Never hand-model or download replacement furniture and pass it off as Lux3D's. Disclose every other tool.
4. **No fakes.** If articulation fails for a piece, we set the hinges ourselves on Lux3D-split parts and say so in the report. Don't claim features we didn't build.
5. **Log every generation** in `docs/generation-log.md`: time, prompt or input, settings, task id, duration, result, screenshot path.
6. **Cut order** if behind schedule is listed in PLAN-v2. Feature freeze at 20:00 UTC still holds.
7. **Never commit secrets.** API key via env or a secret file only. `.env` is gitignored.

## Timebox (UTC, Nov 18 → 19)
| By | Gate |
|---|---|
| 08:30 | Capability test done: 3 objects generated + part split/articulation tried + log written |
| 08:30 | **Decision:** go with Rummage / fall back to the fold-away apartment (B) / fall back to Make Shade |
| 14:00 | Room renders with real Lux3D models; clicking opens parts |
| 18:00 | Full loop: hide → time picker → seek → result → share URL |
| **20:00** | **Feature freeze.** Only fixes and polish after this. |
| 23:00 | Hosted demo live on ModelScope Studio (user's choice), mirrored on GitHub |
| 02:00 | 60–90 s demo video recorded |
| 04:00 | Report PDF done (concept, process, asset iterations, results, tools disclosed) |
| **06:00** | **Submitted.** Then the X post with #Manycorehackathon. |

## Defaults when the user is slow to respond
If no answer within **20 minutes** on a blocking decision, Claude picks the **recommended** option, records it below, and continues.
Claude still asks and waits for anything irreversible or outward-facing: submitting the final form, posting on X, spending more than about half the remaining credits, publishing a public URL, or sharing personal data.

| Decision | Default |
|---|---|
| Articulation quality is borderline | Keep Rummage. Hand-set hinges on Lux3D-split parts and disclose it |
| Articulation unusable and no parts | Pivot to Make Shade (same day, same deadlines) |
| Art direction for the mockups | Whatever the mockup pass picks |
| Stack | Vite + three.js, static build, GLB assets |
| Demo vs video | Submit both; the video is mandatory internally |
| Report format | PDF |
| Application tracks dropdown | Games + whatever fits best of the offered list |

## Decisions log
- 2026-11-18: Name = Rummage (user). Idea = hide-and-seek with articulated Lux3D furniture (user approved).
- 2026-11-18 07:40 UTC: GO. Articulation returns URDF + per-part GLBs with correct joints (drawers prismatic, lid revolute). Cost: text-to-3D 13, articulation 28, part split 30 credits.
- 2026-11-18 07:40 UTC: Art direction defaults to round-2 #6 "Plywood construction kit" with an isometric camera from #5 (pending user).
- 2026-11-18 07:45 UTC: Art direction = Comic Ink (user). Furniture generated with Lux3D style "cartoon".
- 2026-11-18 08:15 UTC: Full loop working (hide → time limit → seek → found / time's up) in the wizard's study, 6 Lux3D pieces, 12 hiding spots. Ahead of the 18:00 gate.
- Fixes we applied on top of Lux3D output (disclose in report): height normalisation per piece; dark inner "cavity" boxes because generated bodies are open shells; auto-flip of a door whose swing pointed inward; joint limits unclamped for that flip.
- 2026-11-18 08:20 UTC: User expanded scope to levels / bigger world / harder (PLAN-v2). Hosting = ModelScope Studio. GitHub repo emmaGH1/rummage created (public), at least 100 real commits.
