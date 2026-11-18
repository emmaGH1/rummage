# Lux3D generation log

| UTC | Object | Step | Input | Task | Seconds | Result | Notes |
|---|---|---|---|---|---|---|---|
| 11-18 07:23 | drawers | text-to-3d | small antique wooden chest of drawers with three stacked drawers and brass knob handles, single isolated object | 8286875 | 117 | assets/raw/drawers/base.glb |  |
| 11-18 07:23 | sea-chest | text-to-3d | antique wooden sea chest with iron bands, brass corners and a hinged lid, single isolated object, closed | 8286869 | 126 | assets/raw/sea-chest/base.glb |  |
| 11-18 07:23 | cabinet | text-to-3d | tall narrow wooden cabinet with two hinged front doors and brass handles, single isolated object, doors closed | - | - | FAILED | <urlopen error retrieval incomplete: got only 2726218 out of 8949788 bytes> |
| 11-18 07:26 | drawers | articulation | Each of the three drawers slides straight out forward along its depth axis, about 60 percent of its depth. | - | - | FAILED | <urlopen error retrieval incomplete: got only 2548892 out of 31598422 bytes> |
| 11-18 07:35 | drawers | part-split | base.glb | 8288295 | 109 | assets/raw/drawers/parts.glb |  |
| 11-18 07:27 | sea-chest | articulation | The lid rotates open upward about the hinge along the back top edge, up to about 100 degrees. | - | - | FAILED | <urlopen error retrieval incomplete: got only 2776564 out of 19192386 bytes> |
| 11-18 07:39 | cabinet | text-to-3d (recovered) | task 8286870 | 8286870 | ~124 | assets/raw/cabinet/base.glb | first download truncated by CDN; re-downloaded with curl retries |
| 11-18 07:39 | drawers | articulation (recovered) | task 8287142 | 8287142 | ~165 | assets/raw/drawers/art/urdf (body + drawer_top/middle/bottom, 3 prismatic joints, ~0.29 m travel) | 28 credits |
| 11-18 07:39 | sea-chest | articulation (recovered) | task 8287326 | 8287326 | ~172 | assets/raw/sea-chest/art/urdf (body + lid, revolute 0–90°) | 28 credits |
| 11-18 07:37 | sea-chest | part-split | base.glb | 8288584 | 108 | assets/raw/sea-chest/parts.glb |  |
| 11-18 07:39 | cabinet | articulation | The two front doors swing open outward on vertical hinges at the left and right outer edges, about 110 degrees. | 8288739 | 126 | assets/raw/cabinet/articulated.zip |  |
| 11-18 07:40 | w-bookcase | text-to-3d | cartoon bookcase for a wizard's study, open shelves with a few colourful spell books on top and a closed two-door cupboard at the bottom, flat mustard yellow paint, chunky simple shapes, single isolated object | 8288961 | 117 | assets/raw/w-bookcase/base.glb |  |
| 11-18 07:40 | w-desk | text-to-3d | cartoon wooden writing desk for a wizard's study with two drawers stacked on the right side, flat mustard yellow paint, round orange knobs, chunky simple shapes, single isolated object | 8288956 | 153 | assets/raw/w-desk/base.glb |  |
| 11-18 07:40 | w-chest | text-to-3d | cartoon treasure chest for a wizard's study, rounded lid, flat red-orange paint with yellow trim and a keyhole latch, chunky simple shapes, single isolated object, closed | 8289017 | 153 | assets/raw/w-chest/base.glb |  |
| 11-18 07:43 | w-bookcase | articulation | The two lower cupboard doors swing open outward on vertical hinges at their outer edges, about 110 degrees. | 8289226 | 135 | assets/raw/w-bookcase/articulated.zip |  |
| 11-18 07:43 | w-desk | articulation | The two drawers on the right side each slide straight out forward along the depth axis, about 60 percent of their depth. | 8289322 | 145 | assets/raw/w-desk/articulated.zip |  |
| 11-18 07:44 | w-chest | articulation | The lid rotates open upward about the hinge along the back top edge, up to about 100 degrees. | 8289376 | 154 | assets/raw/w-chest/articulated.zip |  |
| 11-18 07:40 | w-potion | text-to-3d | cartoon small potion cabinet for a wizard's study with one front door that has a star window and a drawer underneath, flat teal paint with orange knobs, chunky simple shapes, single isolated object | 8289189 | 108 | assets/raw/w-potion/base.glb |  |
| 11-18 07:47 | w-potion | articulation | The front door swings open outward on a vertical hinge at its left edge, about 110 degrees, and the bottom drawer slides straight out forward about 60 percent of its depth. | 8289661 | 198 | assets/raw/w-potion/articulated.zip |  |
| 11-18 07:40 | w-cabinet | text-to-3d | cartoon tall cupboard for a wizard's study with two front doors and round orange knobs, flat mustard yellow paint, chunky simple shapes, single isolated object, doors closed | 8288957 | 90 | assets/raw/w-cabinet/base.glb |  |
| 11-18 07:40 | w-drawers | text-to-3d | cartoon chest of drawers for a wizard's study, three stacked drawers with round orange knobs, chunky simple shapes, flat mustard yellow paint, bold clean silhouette, single isolated object | 8288959 | 118 | assets/raw/w-drawers/base.glb |  |
| 11-18 07:54 | w-cabinet | articulation | The two front doors swing open outward on vertical hinges at the left and right outer edges, about 110 degrees. | 8290501 | 136 | assets/raw/w-cabinet/articulated.zip |  |
| 11-18 07:56 | w-drawers | articulation | Each of the three drawers slides straight out forward along its depth axis, about 60 percent of its depth. | 8290660 | 145 | assets/raw/w-drawers/articulated.zip |  |
