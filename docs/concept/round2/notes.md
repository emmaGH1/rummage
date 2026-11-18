# Rummage round 2 concept notes

Generated with the built-in image generation tool. Each screen shows the seeker at 0:47 with one drawer hovered. Feasibility rates the visual treatment for AI-generated GLB furniture in three.js.

- **Candy Low-Poly** (Kid’s bedroom, High) — Flat material blocks and broad bevels translate directly to rigid GLB parts and simple lighting.
- **Comic Ink** (Wizard’s study, High) — Two-step toon shading and an outline pass should capture the ink look. The white hover stroke needs to stay distinct from the black outlines.
- **Soft Clay** (Beach hut, Medium) — Rounded geometry and diffuse lights are straightforward. Faithful clay surface impressions would need a normal map or additional modeling.
- **Three-Ink Screenprint** (Mid-century apartment, Medium) — Palette and hard lighting are straightforward. Stable halftone shadows and crisp tonal separation add shader work.
- **Pop Isometric** (Arcade backroom, High) — An orthographic camera, flat material colors and a single outline affordance cover the most visible decisions.
- **Plywood Construction Kit** (School maker lab, High) — Colored material slots and simple hinge meshes do most of the work. Model the visible tabs and plywood edges as geometry or material bands.

## Genre references

- **Hidden Folks** uses direct interaction with scenery during a search. For Rummage, make the furniture the click target and show feedback at the part that moves. [Hidden Folks](https://hiddenfolks.com/)
- **Unpacking** uses room layouts and familiar domestic objects to orient the player. In the cutaway, keep silhouettes and room boundaries visible in one view. [Unpacking](https://www.unpackinggame.com/)
- **The Room** reveals interiors through physical mechanisms. For Rummage, let the drawer travel, door swing and lid angle clearly show which spaces have been searched. [Fireproof Studios](https://www.fireproofgames.com/games/the-room)

## Generation prompts

### Shared prompt

Create ONE original landscape 16:9 image of a polished in-game SEEK screen for the 2-player 3D browser furniture hide-and-seek game Rummage. Screenshot composition edge to edge, full scene and UI, no device bezel. Art direction: [Variant direction]

Exactly five or six distinct furniture pieces arranged in ONE room, visibly separated with easy click targets. At minimum include chest of drawers, low treasure-style storage chest, two-door cabinet, desk, and theme-appropriate fifth piece. Show exactly three unambiguous open states: a drawer pulled out far with its empty inner box and side visible, the chest lid hinged upward around 75° with its empty interior showing, and a tall cabinet with two doors visibly swung outward to reveal shelves. Keep the interiors large and visually readable. Drawer fronts, lids and doors are separate rigid pieces. Highlight only the pulled-out drawer with a narrow clean high-contrast hover outline and a small pointer aimed at its front. The hidden tiny key is tucked out of sight. Desk and fifth furniture closed or inactive. Use original designs, taking only genre principles: easy visual scanning, consistent spatial cues, readable silhouettes and tactile openings.

The only text, exact and fully readable: "Rummage" at upper left, "0:47" countdown near top center, and "Opened: 4" at upper right. Reserve enough wall or background space at top for HUD. No overlapping objects or UI. Wide aspect ratio exactly 16:9. Bold geometric shapes, intentional limited palette, restrained light, clearly realizable with animated GLB furniture and three.js. Avoid ornate clutter, lanterns, bokeh, brass trim, airbrushed gradients, painterly textures, sepia, generic AI concept-render polish.

### Variant directions

#### Candy Low-Poly

Front-facing elevated perspective into a kid’s bedroom with a graphic checkerboard mat. Bright flat-shaded low-poly, chunky chamfered toy geometry, coral, teal, sunflower and lilac. Rounded HUD pills and a chunky rounded display wordmark. Matte simple untextured material blocks; keep each major piece a distinct candy color.

#### Comic Ink

Close, almost eye-level three-quarter single-panel comic composition of a wizard’s study. Clean bold deep-ink outlines, two-step cel shading, ultramarine, butter yellow, white and orange-red. Graphic lightning-shaped window, blocked book shapes on fifth object (shelf), very sparse. Slightly tilted sticker HUD, white outlined countdown and badge. No ornate engravings or magical glow.

#### Soft Clay

Low three-quarter view into a pastel beach hut, handcrafted plasticine stop-motion art direction. Powder blue, peach, pale pistachio and warm ivory. Furniture has squishy bevels, broad thumb-pressed handles and extremely subtle impressions near handles only. Simple ambient shadows, gentle diffuse light. Brush-marker HUD lettering, highly legible. Closed storage bench as fifth object; striped beach towel on a hook.

#### Three-Ink Screenprint

A mid-century modern apartment as a three-ink screenprint: deep petrol blue, persimmon, and warm cream used in sharply cut planes. Three-quarter perspective with a broad cream wall and geometric floor. Sparse, tightly controlled halftone only under the objects, simple tapered legs, flat color shadows, crisp graphic negative space. Offset the furniture across the width in a readable spatial arrangement; small slab-serif wordmark and rigid editorial HUD grid.

#### Pop Isometric

Strict 30-degree orthographic isometric dollhouse cutaway of an arcade backroom, centered on a wide electric-blue canvas, two walls and one floor slab. Hot pink, electric blue and lime supported by white and dark navy. Crisp simple mesh shapes and untextured surfaces. Clean geometric sans HUD at top with no container except a lime timer square. Arcade-adjacent graphic carpet, closed utility locker or shelf as fifth furniture item.

#### Plywood Construction Kit

A wide near-frontal, slightly overhead architectural view of a school maker lab rendered like a laser-cut plywood construction kit. Birch-colored flat faces, dark exposed cut edges, cobalt painted outer surfaces, safety-orange hinges and wedges. Analogue product-design model, right-angle joinery, restrained simple orthographic shadows, warm white backdrop, simple charcoal monospaced HUD in a horizontal ruler-like band. No grain textures needed. Mostly cobalt and ivory with precise orange accents.

### Targeted edits
