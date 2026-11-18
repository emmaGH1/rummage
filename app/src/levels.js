// Story levels. Each level is a room plus rules. The game places the keys randomly every run.
// mechanics: decoys (junk in some compartments), locks (a padlocked piece needs a small key found first),
// mimics (lids/doors that snap shut, +5s), riddle (clue card naming the key's piece).
export const LEVELS = [
  {
    id: 1, room: 'wizard', name: "The Wizard's Study",
    blurb: 'Every drawer, door and lid opens. Find the manor key.',
    keys: 1, time: 120, hints: 3, decoys: 0, locks: 0, mimics: 0,
    par: { time: 45, opens: 5 },
    tip: 'Click anything that looks like it opens.',
  },
  {
    id: 2, room: 'pirate', name: "The Captain's Cabin",
    blurb: 'Two keys this time, and the captain hoards junk.',
    keys: 2, time: 150, hints: 2, decoys: 4, locks: 0, mimics: 0,
    par: { time: 75, opens: 8 },
    tip: 'Decoys! Not everything shiny is a key.',
  },
  {
    id: 3, room: 'kitchen', name: 'The Haunted Kitchen',
    blurb: 'Something is padlocked. Find the little brass key first.',
    keys: 2, time: 180, hints: 2, decoys: 3, locks: 1, mimics: 0,
    par: { time: 100, opens: 10 },
    tip: 'Locked pieces need a little brass key hidden elsewhere.',
  },
  {
    id: 4, room: 'workshop', name: 'The Toy Workshop',
    blurb: 'Some lids bite back. Mimics snap shut and cost you 5 seconds.',
    keys: 2, time: 180, hints: 1, decoys: 3, locks: 1, mimics: 2,
    par: { time: 110, opens: 11 },
    tip: 'Mimics snap shut: +5 seconds each time.',
  },
  {
    id: 5, room: 'library', name: 'The Grand Library',
    blurb: 'Three keys, riddles, locks and mimics. The final rummage.',
    keys: 3, time: 240, hints: 1, decoys: 4, locks: 1, mimics: 2, riddle: true,
    par: { time: 150, opens: 14 },
    tip: 'Read the riddle: it names where one key is hiding.',
  },
];

const KEY = 'rummage.progress.v1';
export function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && p.stars) return p;
  } catch { /* storage unavailable */ }
  return { unlocked: 1, stars: {} };
}
export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function starsFor(level, { time, opens }) {
  let s = 1;
  if (time <= level.par.time) s++;
  if (opens <= level.par.opens) s++;
  return s;
}

// small seeded RNG so a level run can be reproduced from a seed
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
