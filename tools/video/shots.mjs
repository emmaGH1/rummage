// Shot list for the demo video. setup/actions/perFrame run inside the game page (window.K = helpers in capture.mjs);
// `mouse` runs in node and moves the real pointer (the flashlight follows it).
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
    const a = 0.05 * t;
    const off = o.clone().applyAxisAngle(new K.T3.Vector3(0, 1, 0), a).multiplyScalar(1 - 0.02 * t);
    K.R.camera.position.copy(tg).add(off); K.R.controls.target.copy(tg);
  },
});
// bind level argument into setup (page.evaluate passes no args to setup otherwise)
const withArg = (shot, arg) => ({ ...shot, setup: new Function(`return (${shot.setup.toString()})(${JSON.stringify(arg)});`) });

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
  // face the drawers: put the camera out along the slide axis, a little to the side and above
  const j = pc.parts[0].joint;
  const fwd = j.axis.clone().transformDirection(j.matrixWorld); fwd.y = 0; fwd.normalize();
  const off = fwd.clone().applyAxisAngle(new K.T3.Vector3(0, 1, 0), -0.6).multiplyScalar(size * 1.05).add(new K.T3.Vector3(0, size * 0.42, 0));
  K.look(c, off);
  window.__studio = { pc, base: pc.holder.rotation.y };
  return {};
};

export const SHOTS = [
  // 1. hook: the Grand Library, every joint opening in a wave
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
      const off = o.clone().applyAxisAngle(new K.T3.Vector3(0, 1, 0), -0.18 + 0.04 * t).multiplyScalar(0.92 - 0.012 * t);
      K.R.camera.position.copy(tg).add(off); K.R.controls.target.copy(tg);
    },
  },
  // 2. the generated piece, closed, slowly turning
  {
    name: 'studio_turn', dur: 8,
    setup: studioSetup,
    perFrame: (t) => { const s = window.__studio; s.pc.holder.rotation.y = s.base + Math.sin(t * 0.55) * 0.75;
      const p = s.pc.parts[0]; if (p.value === p.target) p.vel = 1e-6; },
  },
  // 3. articulation: drawers slide out one by one, then pull apart (exploded view); label positions recorded
  {
    name: 'studio_explode', dur: 9,
    setup: studioSetup,
    actions: [
      [0.8, () => { window.__studio.pc.parts[0].target = window.__studio.pc.parts[0].open; }],
      [1.3, () => { window.__studio.pc.parts[1].target = window.__studio.pc.parts[1].open; }],
      [1.8, () => { window.__studio.pc.parts[2].target = window.__studio.pc.parts[2].open; }],
      [4.4, () => { window.__studio.pc.parts.forEach((p, i) => setTimeout(() => (p.target = p.open * 1.9), i * 120)); }],
      [0, () => { window.__fresh = true; }],
      [7.0, () => ({ labels: window.__studio.pc.parts.map((p) => ({ name: p.joint.name, xy: K.screen(K.center(p.link)) })),
        body: K.screen(K.center(window.__studio.pc.robot)) })],
    ],
    perFrame: (t) => { const p = window.__studio.pc.parts[0]; if (p.value === p.target) p.vel = 1e-6; },
  },
  // 4. the same piece in the game: tap it, the key is inside
  {
    name: 'in_room', dur: 6,
    setup: async () => {
      const seed = await K.findSeed(1, (items) => items.some((it) => it.kind === 'key' && it.part.piece.slug === 'w-drawers'));
      await K.level(1, seed);
      K.ui(true);
      const it = K.R.items().find((i) => i.kind === 'key');
      window.__part = it.part;
      window.__cam = { t: K.R.controls.target.clone(), p: K.R.camera.position.clone(), to: K.center(it.part.piece.robot) };
      return { seed };
    },
    actions: [[1.6, () => { const c = K.center(window.__part.link); K.R.toggle(window.__part, c); return { click: K.screen(c) }; }]],
    perFrame: (t, K) => {
      const { t: tg, p, to } = window.__cam;
      const e = Math.min(1, t / 3); const k = e * (2 - e) * 0.32;
      K.R.controls.target.lerpVectors(tg, to, k);
      K.R.camera.position.copy(p).lerp(to, k * 0.55);
    },
  },
  // 5. room montage
  withArg(room('room_pirate'), 2), withArg(room('room_kitchen'), 3), withArg(room('room_workshop'), 4), withArg(room('room_wizard'), 1),
  // 6. decoys
  {
    name: 'decoy', dur: 4.5,
    setup: async () => {
      const seed = await K.findSeed(2, (items) => items.some((it) => it.kind === 'decoy' && ['p-seachest', 'p-crate', 'p-barrel'].includes(it.part.piece.slug)));
      await K.level(2, seed);
      K.ui(true);
      window.__part = K.R.items().find((it) => it.kind === 'decoy' && ['p-seachest', 'p-crate', 'p-barrel'].includes(it.part.piece.slug)).part;
      return { seed };
    },
    actions: [[0.8, () => { const c = K.center(window.__part.link); K.R.toggle(window.__part, c); return { click: K.screen(c) }; }]],
  },
  // 7. padlock: locked, find the brass key, open it
  {
    name: 'padlock', dur: 7,
    setup: async () => {
      const seed = await K.findSeed(3, () => ['k-pantry', 'k-fridge', 'k-dresser'].includes(K.R.world.pieces.find((p) => p.locked)?.slug));
      await K.level(3, seed);
      K.ui(true);
      const R = K.R;
      const locked = R.world.pieces.find((p) => p.locked);
      window.__lk = R.items().find((it) => it.kind === 'lockkey').part;
      window.__key = R.items().find((it) => it.kind === 'key' && it.part.piece === locked).part;
      return { seed, locked: locked.slug };
    },
    actions: [
      [0.6, () => { K.R.toggle(window.__key, K.center(window.__key.link)); return { click1: K.screen(K.center(window.__key.link)) }; }],
      [2.2, () => { K.R.toggle(window.__lk, K.center(window.__lk.link)); return { click2: K.screen(K.center(window.__lk.link)) }; }],
      [4.6, () => { K.R.toggle(window.__key, K.center(window.__key.link)); }],
    ],
  },
  // 8. mimic
  {
    name: 'mimic', dur: 3.6,
    setup: async () => {
      await K.level(4, 5);
      K.ui(true);
      const m = [...K.R.S.run.mimics].sort((a, b) => K.center(b.link).z - K.center(a.link).z)[0];
      window.__part = m;
      return { slug: m.piece.slug };
    },
    actions: [[0.6, () => { const c = K.center(window.__part.link); K.R.toggle(window.__part, c); return { click: K.screen(c) }; }]],
  },
  // 9. night: flashlight sweep, the key is behind the picture
  {
    name: 'night', dur: 8,
    setup: async () => {
      const seed = await K.findSeed(6, (items) => items.some((it) => it.kind === 'key' && it.part.id === 'secret:picture'));
      await K.level(6, seed);
      K.ui(true);
      const pic = K.R.world.parts.find((p) => p.id === 'secret:picture');
      window.__part = pic;
      return { seed, pic: K.screen(K.center(pic.link)) };
    },
    mouse: (t, info) => {
      const path = [[1500, 760], [1150, 820], [800, 700], [560, 520], info.pic];
      const u = Math.min(1, t / 3.8) * (path.length - 1);
      const i = Math.min(path.length - 2, Math.floor(u)), f = u - i;
      const e = f * f * (3 - 2 * f);
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * e, path[i][1] + (path[i + 1][1] - path[i][1]) * e];
    },
    actions: [[4.4, () => { K.R.toggle(window.__part, K.center(window.__part.link)); return { click: K.screen(K.center(window.__part.link)) }; }]],
  },
  // 10. hint clue, then a coin flip on the dice (the shot forces heads)
  {
    name: 'hint_bet', dur: 9,
    setup: async () => {
      await K.level(8, 4);
      K.ui(true);
      Math.random = () => 0.1;
      return {};
    },
    actions: [
      [0.6, () => { document.getElementById('hintBtn').click(); }],
      [3.0, () => { document.getElementById('betBtn').click(); }],
      [4.6, () => { document.querySelectorAll('.bet-opt')[1].click(); }],
    ],
  },
  // 11. hurry: 9 seconds left
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
    actions: [
      [0.7, () => { K.R.toggle(window.__e[0], K.center(window.__e[0].link)); }],
      [2.1, () => { K.R.toggle(window.__e[1], K.center(window.__e[1].link)); }],
    ],
  },
  // 12. the last key and the win screen
  {
    name: 'win', dur: 6,
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
      return { seed };
    },
    actions: [[1.2, () => { const c = K.center(window.__part.link); K.R.toggle(window.__part, c); return { click: K.screen(c) }; }]],
  },
];
