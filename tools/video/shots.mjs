// Shot list for the demo video. setup/actions/perFrame run inside the game page (window.K = helpers in capture.mjs);
// `mouse` runs in node and moves the real pointer (the flashlight follows it). Coordinates are CSS px (1280x720).
// Shots without a perFrame get K.pushStep: set a push-in with K.push(point, at, dur, k) in setup.
const room = (name, level, dur = 2.6) => ({
  name, dur,
  setup: async (level) => {
    await K.level(level, 7, { play: false });
    K.ui(false);
    K.R.S.mode = 'video';
    const parts = [...K.R.world.parts].filter((p) => !p.secret).sort((a, b) => K.center(a.link).x - K.center(b.link).x);
    window.__wave = parts;
    window.__cam = { t: K.R.controls.target.clone(), o: K.R.camera.position.clone().sub(K.R.controls.target) };
    return {};
  },
  actions: [[0.15, () => K.wave(window.__wave, 0, 45)]],
  perFrame: (t, K) => {
    const { t: tg, o } = window.__cam;
    const off = o.clone().applyAxisAngle(new K.T3.Vector3(0, 1, 0), 0.05 * t).multiplyScalar(0.86 - 0.025 * t);
    K.R.camera.position.copy(tg).add(off); K.R.controls.target.copy(tg);
  },
});
// bind an argument into setup (page.evaluate passes none)
const withArg = (shot, arg) => ({ ...shot, setup: new Function(`return (${shot.setup.toString()})(${JSON.stringify(arg)});`) });
// built as source text: these functions run inside the page, so they can't close over node variables
const click = (name) => new Function(`const p = window['${name}']; const c = K.center(p.link); K.R.toggle(p, c); return { '${name}': K.screen(c) };`);

// a studio view of one Lux3D piece on a plain ground (everything else hidden)
const studioSetup = async () => {
  await K.level(1, 1, { play: false });
  K.ui(false);
  const R = K.R;
  R.S.mode = 'hide'; // keeps hidden items hidden
  R.items().forEach((it) => (it.obj.visible = false));
  const pc = K.piece('w-drawers');
  R.world.group.children.forEach((c) => (c.visible = c === pc.holder));
  if (R.world.shell) R.world.shell.visible = false;
  R.scene.background = new K.T3.Color('#1d2a9e');
  pc.parts.forEach((p) => { p.target = 0; p.value = 0; p.vel = 0; p.joint.setJointValue(0); });
  R.world.group.updateMatrixWorld(true);
  const c = K.center(pc.robot);
  const size = K.box(pc.robot).getSize(new K.T3.Vector3()).length();
  const j = pc.parts[0].joint;
  const fwd = j.axis.clone().transformDirection(j.matrixWorld); fwd.y = 0; fwd.normalize();
  const off = fwd.clone().applyAxisAngle(new K.T3.Vector3(0, 1, 0), -0.6).multiplyScalar(size * 1.05).add(new K.T3.Vector3(0, size * 0.42, 0));
  K.look(c, off);
  pc.holder.userData.rot0 ??= pc.holder.rotation.y; // remembered so later shots can restore it
  window.__studio = { pc, base: pc.holder.userData.rot0 };
  return {};
};
// the game redraws shadows only while a part moves: a tiny nudge each frame keeps them fresh
const fresh = 'const p0 = window.__studio.pc.parts[0]; if (p0.value === p0.target) p0.vel = 1e-6;';

export const SHOTS = [
  // the real title screen (camera orbits the room on its own)
  {
    name: 'title', dur: 7,
    setup: async () => { await K.level(1, 1, { play: false }); K.R.showTitle(); K.ui(true); return {}; },
  },
  // hook: the Grand Library, every joint opening in a wave
  {
    name: 'hook', dur: 7,
    setup: async () => {
      await K.level(5, 3, { play: false });
      K.ui(false);
      K.R.S.mode = 'video';
      window.__wave = [...K.R.world.parts].sort((a, b) => (K.center(a.link).x + K.center(a.link).z) - (K.center(b.link).x + K.center(b.link).z));
      window.__cam = { t: K.R.controls.target.clone(), o: K.R.camera.position.clone().sub(K.R.controls.target) };
      return {};
    },
    actions: [[0.5, () => K.wave(window.__wave, 0, 75)]],
    perFrame: (t, K) => {
      const { t: tg, o } = window.__cam;
      const off = o.clone().applyAxisAngle(new K.T3.Vector3(0, 1, 0), -0.18 + 0.04 * t).multiplyScalar(0.84 - 0.014 * t);
      K.R.camera.position.copy(tg).add(off); K.R.controls.target.copy(tg);
    },
  },
  {
    name: 'studio_turn', dur: 9,
    setup: studioSetup,
    perFrame: new Function('t', `const s = window.__studio; s.pc.holder.rotation.y = s.base + Math.sin(t * 0.5) * 0.75; ${fresh}`),
  },
  {
    name: 'studio_explode', dur: 10,
    setup: studioSetup,
    actions: [
      [0.8, () => { window.__studio.pc.parts[0].target = window.__studio.pc.parts[0].open; }],
      [1.3, () => { window.__studio.pc.parts[1].target = window.__studio.pc.parts[1].open; }],
      [1.8, () => { window.__studio.pc.parts[2].target = window.__studio.pc.parts[2].open; }],
      [4.4, () => { window.__studio.pc.parts.forEach((p, i) => setTimeout(() => (p.target = p.open * 1.9), i * 120)); }],
      [7.0, () => ({ labels: window.__studio.pc.parts.map((p) => ({ name: p.joint.name, xy: K.screen(K.center(p.link)) })),
        body: K.screen(K.center(window.__studio.pc.robot)) })],
    ],
    perFrame: new Function('t', fresh),
  },
  // the same piece in the game: tap it, the key is inside
  {
    name: 'in_room', dur: 6.5,
    setup: async () => {
      const seed = await K.findSeed(1, (items) => items.some((it) => it.kind === 'key' && it.part.piece.slug === 'w-drawers'));
      await K.level(1, seed);
      K.ui(true);
      // the studio shots hid the room; the game keeps a room it is already in, so put it back
      K.R.world.group.children.forEach((c) => (c.visible = true));
      if (K.R.world.shell) K.R.world.shell.visible = true;
      K.R.scene.background = new K.T3.Color(K.R.world.theme.bg);
      K.R.world.pieces.forEach((pc) => (pc.holder.rotation.y = pc.holder.userData.rot0 ?? pc.holder.rotation.y));
      window.__part = K.R.items().find((i) => i.kind === 'key').part;
      K.push(K.center(window.__part.piece.robot), 0, 2.2, 0.3);
      return { seed };
    },
    actions: [[1.8, click('__part')]],
  },
  withArg(room('room_pirate'), 2), withArg(room('room_kitchen'), 3), withArg(room('room_workshop'), 4), withArg(room('room_wizard'), 1),
  // the manor map with progress, then pick a room: the level intro card
  {
    name: 'map', dur: 7,
    setup: async () => {
      const R = K.R;
      Object.assign(R.progress.stars, { 1: 3, 2: 3, 3: 2, 4: 3, 5: 2, 6: 3, 7: 2 });
      R.progress.unlocked = 8;
      await K.level(3, 1, { play: false });
      R.showMap();
      K.ui(true);
      return {};
    },
    actions: [[3.6, () => { document.querySelectorAll('#mapGrid button')[7].click(); }]],
  },
  {
    name: 'decoy', dur: 4.8,
    setup: async () => {
      const ok = (s) => ['p-seachest', 'p-crate', 'p-barrel'].includes(s);
      const seed = await K.findSeed(2, (items) => items.some((it) => it.kind === 'decoy' && ok(it.part.piece.slug)));
      await K.level(2, seed);
      K.ui(true);
      window.__part = K.R.items().find((it) => it.kind === 'decoy' && ok(it.part.piece.slug)).part;
      K.push(K.center(window.__part.piece.robot), 0.1, 1.4, 0.45);
      return { seed };
    },
    actions: [[1.3, click('__part')]],
  },
  {
    name: 'padlock', dur: 7.5,
    setup: async () => {
      const seed = await K.findSeed(3, () => ['k-pantry', 'k-fridge', 'k-dresser'].includes(K.R.world.pieces.find((p) => p.locked)?.slug));
      await K.level(3, seed);
      K.ui(true);
      const R = K.R;
      const locked = R.world.pieces.find((p) => p.locked);
      window.__lk = R.items().find((it) => it.kind === 'lockkey').part;
      window.__key = R.items().find((it) => it.kind === 'key' && it.part.piece === locked).part;
      const mid = K.center(locked.robot).lerp(K.center(window.__lk.piece.robot), 0.4);
      K.push(mid, 0, 1.5, 0.3);
      return { seed, locked: locked.slug };
    },
    actions: [[0.9, click('__key')], [2.6, click('__lk')], [5.0, click('__key')]],
  },
  {
    name: 'mimic', dur: 4,
    setup: async () => {
      await K.level(4, 5);
      K.ui(true);
      const m = [...K.R.S.run.mimics].sort((a, b) => K.center(b.link).z - K.center(a.link).z)[0];
      window.__part = m;
      K.push(K.center(m.piece.robot), 0, 1.2, 0.5);
      return { slug: m.piece.slug };
    },
    actions: [[1.0, click('__part')]],
  },
  // night: flashlight sweep, the key is behind the picture
  {
    name: 'night', dur: 8.5,
    setup: async () => {
      const seed = await K.findSeed(6, (items) => items.some((it) => it.kind === 'key' && it.part.id === 'secret:picture'));
      await K.level(6, seed);
      K.ui(true);
      window.__part = K.R.world.parts.find((p) => p.id === 'secret:picture');
      return { seed, pic: K.screen(K.center(window.__part.link)) };
    },
    mouse: (t, info) => {
      const path = [[1000, 507], [767, 547], [533, 467], [373, 347], info.pic];
      const u = Math.min(1, t / 3.8) * (path.length - 1);
      const i = Math.min(path.length - 2, Math.floor(u)), f = u - i;
      const e = f * f * (3 - 2 * f);
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * e, path[i][1] + (path[i + 1][1] - path[i][1]) * e];
    },
    actions: [[4.4, click('__part')]],
  },
  // hints: a clue in words, then the piece glows, then open it
  {
    name: 'hint', dur: 7,
    setup: async () => {
      await K.level(2, 7);
      K.ui(true);
      return {};
    },
    actions: [
      [0.6, () => { document.getElementById('hintBtn').click(); }],
      [3.0, () => { document.getElementById('hintBtn').click(); const it = K.R.S.run.hint.it; window.__part = it.part; K.push(K.center(it.part.piece.robot), 3.2, 1.3, 0.4); }],
      [5.0, click('__part')],
    ],
  },
  // risk: the dice menu, a coin flip (this shot forces heads)
  {
    name: 'bet', dur: 7.5,
    setup: async () => { await K.level(8, 4); K.ui(true); Math.random = () => 0.1; return {}; },
    actions: [
      [0.5, () => { document.getElementById('betBtn').click(); }],
      [2.4, () => { document.querySelectorAll('.bet-opt')[1].click(); }],
    ],
  },
  // hurry: 9 seconds left
  {
    name: 'hurry', dur: 4,
    setup: async () => {
      await K.level(7, 2);
      K.ui(true);
      const run = K.R.S.run;
      run.t0 -= (run.time - 9.5) * 1000;
      const empties = K.R.world.parts.filter((p) => !p.secret && !K.R.items().some((it) => it.part === p) && !run.mimics.has(p));
      window.__e = empties.sort((a, b) => K.center(b.link).z - K.center(a.link).z).slice(0, 2);
      return {};
    },
    actions: [[0.7, () => { K.R.toggle(window.__e[0], K.center(window.__e[0].link)); }], [2.1, () => { K.R.toggle(window.__e[1], K.center(window.__e[1].link)); }]],
  },
  // the last key and the win screen
  {
    name: 'win', dur: 6.5,
    setup: async () => {
      const seed = await K.findSeed(5, (items) => { const ks = items.filter((it) => it.kind === 'key'); return !ks[ks.length - 1].part.piece.locked && !ks[ks.length - 1].part.secret; });
      await K.level(5, seed);
      K.ui(true);
      const R = K.R, run = R.S.run;
      const keys = R.items().filter((it) => it.kind === 'key');
      keys.slice(0, -1).forEach((it) => { it.found = true; it.part.target = it.part.open; });
      run.keysFound = keys.length - 1;
      run.opened = 8;
      run.t0 -= 68000; // the first keys took a while: about 1:10 on the clock when the last one turns up
      R.world.pieces.forEach((p) => { if (p.locked) { p.locked = false; if (p.padlock) { p.holder.remove(p.padlock); p.padlock = null; } } });
      window.__part = keys[keys.length - 1].part;
      K.push(K.center(window.__part.piece.robot), 0, 1.2, 0.35);
      return { seed };
    },
    actions: [[1.2, click('__part')]],
  },
  // time runs out: the lights come on and the camera visits the missed keys
  {
    name: 'reveal', dur: 8,
    setup: async () => {
      await K.level(9, 3);
      K.ui(true);
      const run = K.R.S.run;
      run.t0 -= (run.time - 1.6) * 1000;
      return {};
    },
  },
  // challenge a friend: open a spot, pick a time, hide the key, get the link
  {
    name: 'hide', dur: 8,
    setup: async () => {
      await K.R.startHide();
      K.ui(true);
      const pc = K.piece('l-mapchest') || K.piece('t-toychest') || K.R.world.pieces.find((p) => p.parts.length && !p.secret);
      window.__part = pc.parts[0];
      K.push(K.center(pc.robot), 0.2, 1.2, 0.35);
      return { slug: pc.slug };
    },
    actions: [
      [1.2, () => { const p = window.__part; K.R.toggle(p, K.center(p.link)); }],
      [2.6, () => { document.querySelectorAll('#chipsHide .chip')[1]?.click(); }],
      [3.8, () => { document.getElementById('hideBtn').click(); }],
    ],
  },
  // the same game on a phone (portrait, touch)
  {
    name: 'phone', dur: 8, viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, // no isMobile: switching it reloads the page
    setup: async () => {
      const seed = await K.findSeed(3, (items, run) => items.some((it) => it.kind === 'key' && !it.part.piece.locked && !it.part.secret));
      await K.level(3, seed);
      K.ui(true);
      window.__part = K.R.items().find((it) => it.kind === 'key' && !it.part.piece.locked && !it.part.secret).part;
      const empty = K.R.world.parts.filter((p) => !p.secret && !K.R.items().some((it) => it.part === p) && !K.R.S.run.mimics.has(p) && !p.piece.locked);
      window.__e = empty[Math.floor(empty.length / 2)];
      return { seed };
    },
    actions: [[0.8, click('__e')], [2.4, () => { document.getElementById('hintBtn').click(); }], [5.0, click('__part')]],
  },
];
