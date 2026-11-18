// Room layouts. Each item is one Lux3D articulated model (URDF + part GLBs) in public/models/<slug>/.
// x/z in metres on the floor, rot in degrees about Y. Walls sit at x = -W/2 and z = -D/2.
export const ROOMS = {
  test: {
    name: 'Test room',
    size: [6, 6],
    items: [
      { slug: 'drawers', x: -1.9, z: -0.6, rot: 90 },
      { slug: 'cabinet', x: 0.2, z: -2.4, rot: 0 },
      { slug: 'sea-chest', x: 0.8, z: 0.9, rot: -20 },
    ],
  },
  wizard: {
    name: "Wizard's study",
    size: [5, 5],
    // h = target height in metres (generated models come back at inconsistent scales)
    items: [
      { slug: 'w-bookcase', x: -1.05, z: -2.15, rot: 0, h: 2.0 },
      { slug: 'w-cabinet', x: 0.95, z: -2.15, rot: 0, h: 1.8 },
      { slug: 'w-drawers', x: -2.1, z: -0.35, rot: 90, h: 1.05 },
      { slug: 'w-potion', x: -2.15, z: 1.35, rot: 90, h: 1.25 },
      { slug: 'w-desk', x: 1.75, z: 0.15, rot: -15, h: 0.85 },
      { slug: 'w-chest', x: 0.35, z: 0.85, rot: -20, h: 0.6 },
    ],
  },
};

export const DEFAULT_ROOM = 'wizard';
export const TIME_OPTIONS = [
  { label: '30s', s: 30 },
  { label: '1m', s: 60 },
  { label: '2m', s: 120 },
  { label: '5m', s: 300 },
  { label: '∞', s: 0 },
];
