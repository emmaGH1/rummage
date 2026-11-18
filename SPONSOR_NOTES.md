# Lux3D developer notes

What the Aholo Lux3D API really did while we built Rummage, with measured numbers. Each item is tagged **live** (seen on real API calls), **test** (checked by a script) or **workaround** (our code).

## What worked

- **live · Articulation is the standout.** A one-line motion prompt ("each of the three drawers slides straight out forward along its depth axis, about 60 percent of its depth") came back as a ZIP with `urdf/robot.urdf` and one GLB per moving part. Joint types were right for every piece we shipped: 47 prismatic (drawers) and 60 revolute (doors, lids). Axes, origins and limits were usable as-is in three.js + urdf-loader, apart from the mirrored-door sign in Friction 6.
- **live · It worked first time.** The capability probe articulated 3 of 3 pieces successfully on the first attempt (photorealistic style), before we had written any game code; only the downloads needed retries (see Friction 1).
- **live · Style control.** `cartoon` style plus a palette in the prompt ("flat mustard yellow paint, round orange knobs") gave a consistent set across 55 pieces and 43 props.

## Timings (live, from the task timings of the 55 shipped pieces in `app/public/lux3d-manifest.json`)

| Call | n | Median | p95 |
|---|---|---|---|
| Text-to-3D (G1-Turbo) | 54 | 117 s | 153 s |
| Articulation | 55 | 154 s | 207 s |
| Part split | 2 | 108 s | n/a |

Credits per call, as charged to us: text-to-3D G1-Turbo 13, articulation 28, part split 30.

## Friction

1. **live · Large result downloads were truncated.** 3 of our first downloads ended early ("got only 2,548,892 of 31,598,422 bytes"). The task had succeeded; only the file transfer failed. **Workaround:** resumable downloads with retries, keyed by task id (`tools/retry_articulation.py`). *Suggestion:* serve results with `Content-Length` and range support, or offer a smaller output option.
2. **live · Result URLs expire after about 2 hours.** If a download fails late, the result is gone unless you re-fetch the task. *Suggestion:* document the expiry next to the URL, and let the task endpoint re-issue a fresh URL.
3. **live · Articulation output is large:** about 30 MB per piece (uncompressed textures, full-detail meshes). **Workaround:** gltf-transform (WebP textures, meshopt) brings it to about 1.5 MB. *Suggestion:* an optional web-ready output.
4. **live · Generated bodies are hollow shells.** Opening a door shows the wall behind the furniture. **Workaround:** a dark back-face copy of each body as its interior. *Suggestion:* an option to close or shade the interior cavity behind a moving part.
5. **live · Scale varies between pieces.** Real-world size prediction gave a 15 cm wardrobe next to a 2 m one. **Workaround:** a target height per piece.
6. **live · Double doors: hinge sign.** On some two-door pieces both revolute joints opened the same direction, so one door swung into the body. **Workaround:** test-open each vertical-hinge door at load time and flip it if it moves backwards. *Suggestion:* for mirrored doors, mirror the joint axis or limits.
7. **live · 2 calls failed with "connection refused"** during a burst of parallel requests. A retry succeeded.

## What we'd love next

- A preview of the part split before paying for the full articulation run, so a bad split can be re-prompted cheaply.
- A joint "range in degrees / metres" field in the response next to the URDF limits, so games can read it without parsing XML.

All calls, with prompts and task ids: [docs/generation-log.md](docs/generation-log.md).
