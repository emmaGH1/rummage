// Room layouts. Each item is one Lux3D articulated model (URDF + part GLBs) in public/models/<slug>/.
// x/z in metres on the floor, rot in degrees about Y (0 = front faces +z), h = target height in metres
// (generated models come back at inconsistent scales). Walls sit at x = -W/2 and z = -D/2.
// props: non-interactive Lux3D models (single GLB in public/props/<slug>.glb), same placement fields.
export const ROOMS = {
  test: {
    name: 'Test room',
    size: [6, 6],
    theme: 'wizard',
    items: [
      { slug: 'drawers', x: -1.9, z: -0.6, rot: 90 },
      { slug: 'cabinet', x: 0.2, z: -2.4, rot: 0 },
      { slug: 'sea-chest', x: 0.8, z: 0.9, rot: -20 },
    ],
  },
  wizard: {
    name: "Wizard's study",
    size: [5, 5],
    theme: 'wizard',
    items: [
      { slug: 'w-bookcase', x: -1.05, z: -2.15, rot: 0, h: 2.0 },
      { slug: 'w-cabinet', x: 0.95, z: -2.15, rot: 0, h: 1.8 },
      { slug: 'w-drawers', x: -2.1, z: -0.35, rot: 90, h: 1.05 },
      { slug: 'w-potion', x: -2.15, z: 1.35, rot: 90, h: 1.25 },
      { slug: 'w-desk', x: 1.75, z: 0.15, rot: -15, h: 0.85 },
      { slug: 'w-chest', x: 0.35, z: 0.85, rot: -20, h: 0.6 },
    ],
    props: [],
  },
  pirate: {
    name: "Captain's cabin",
    size: [6, 5.5],
    theme: 'pirate',
    items: [
      { slug: 'p-wardrobe', x: -1.9, z: -2.4, rot: 0, h: 2.0 },
      { slug: 'p-mapcabinet', x: -0.2, z: -2.4, rot: 0, h: 1.2 },
      { slug: 'p-bunk', x: 1.85, z: -1.95, rot: 0, h: 1.6 },
      { slug: 'p-cupboard', x: -2.6, z: -0.6, rot: 90, h: 1.3 },
      { slug: 'p-desk', x: -2.35, z: 1.3, rot: 90, h: 1.0 },
      { slug: 'p-seachest', x: 0.3, z: 0.4, rot: -10, h: 0.6 },
      { slug: 'p-barrel', x: 2.3, z: 0.2, rot: 0, h: 0.95 },
      { slug: 'p-crate', x: 1.4, z: 1.6, rot: 15, h: 0.6 },
    ],
    props: [],
  },
};

// Comic Ink palettes per theme.
export const THEMES = {
  wizard: { bg: '#1d2a9e', wall: '#2f45d6', floor: '#2a3ab8', skirt: '#1b2580', rug: '#f0542a', rugBorder: '#fff6e6', decor: 'window' },
  pirate: { bg: '#0f5f6b', wall: '#16808f', floor: '#7a4a2a', skirt: '#0b4650', rug: '#c9302c', rugBorder: '#ffd23f', decor: 'porthole' },
  kitchen: { bg: '#3b1f5c', wall: '#5b2f8a', floor: '#f2e6c9', skirt: '#2a1442', rug: '#2fbf71', rugBorder: '#14121f', decor: 'window' },
  workshop: { bg: '#a3341f', wall: '#e0562f', floor: '#f2c14e', skirt: '#7a2414', rug: '#2b59c3', rugBorder: '#fff6e6', decor: 'pegboard' },
  library: { bg: '#14213d', wall: '#7a1f2b', floor: '#3b2a1e', skirt: '#4a1018', rug: '#1f6f5c', rugBorder: '#f6c945', decor: 'window' },
};

export const DEFAULT_ROOM = 'wizard';
export const TIME_OPTIONS = [
  { label: '30s', s: 30 },
  { label: '1m', s: 60 },
  { label: '2m', s: 120 },
  { label: '5m', s: 300 },
  { label: '∞', s: 0 },
];
