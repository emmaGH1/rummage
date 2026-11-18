# Rummage v2 — the Manor (bigger world, harder levels)
Decided 2026-11-18 08:20 UTC after the user asked for more detail, harder rooms, levels and world building.
Hard deadline unchanged: 11:00 UTC Nov 19. Internal submit 06:00 UTC.

## Story frame (one line, shown on the title screen)
The absent-minded wizard left his manor key somewhere in the house. Rummage through every room before the clock runs out.

## Modes
- **Story (single player, for judges):** 5 rooms unlocked in order from a comic-page level map. The game hides the keys randomly each run, so it can be replayed. Rated 1–3 stars on time and on how many things you opened.
- **Challenge (2 players):** the existing hide → link → seek mode, playable in any unlocked room.

## Levels, with a new difficulty mechanic each
| # | Room | Pieces | Keys | New mechanic |
|---|---|---|---|---|
| 1 | Wizard's study | 6 + props | 1 | Tutorial: open things and find the key |
| 2 | Pirate captain's cabin | 8 + props | 2 | **Decoys:** junk items (coins, bottles) fill some compartments |
| 3 | Haunted kitchen | 8 + props | 2 | **Locked pieces:** a padlocked cupboard needs a small key found elsewhere first |
| 4 | Toy workshop | 8 + props | 2 | **Mimics:** some lids snap shut and cost 5 seconds; **nested** box inside a cupboard |
| 5 | Grand library | 10 + props | 3 | **Riddle clue** cards plus all the earlier mechanics |
Every level has a "key compass" hint (hot/cold pulse) with limited uses: 3, then 2, 2, 1, 1.

## World building and detail
- Every room has its own wall and floor palette, window or porthole, wall decals and rug, all in Comic Ink style.
- **Lux3D props** fill each room (not interactive): e.g. a cauldron, globe, ship wheel, cannon, stove or rocking horse.
- A comic-book level map (the manor cutaway), plus a level intro card, a star result card and room-to-room transitions.
- A "Made with Lux3D" panel: for every piece, its prompt, generation time, joints and a model thumbnail.

## Build order (each step is a commit or several)
1. Level system and level map (data-driven rooms, progress saved in localStorage).
2. Random key placement plus multi-key HUD and star rating.
3. Pirate cabin assets, then decoys.
4. Kitchen assets, then locks.
5. Workshop assets, then mimics and nesting.
6. Library assets, then riddles.
7. Props pass for all rooms, then the key compass hint.
8. Lux3D panel, touch and mobile, performance.
9. **20:00 UTC feature freeze**, then ModelScope deploy, video and report.

## Cut order if late (cut from the bottom)
Riddles → nesting → level 5 → mimics → props in rooms 4–5. Never cut: the level map, random keys, stars, rooms 1–3, deploy, video, report.

## Commits
Small and real: one feature, asset set, fix or doc per commit. No empty or padding commits. Target ≥100 by submission.
