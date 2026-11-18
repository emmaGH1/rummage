import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ROOMS, TIME_OPTIONS } from './rooms.js';
import { LEVELS, loadProgress, saveProgress, starsFor, rng, shuffle } from './levels.js';
import { loadRoom, unloadRoom } from './world.js';
import { makeKey, makeLockKey, makePadlock, makeDecoy, DECOY_TYPES, DECOY_LINES } from './items.js';
import { sfx } from './sfx.js';
import { startMusic, toggleMute, isMuted } from './music.js';
import './style.css';

// ---------- renderer / camera ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enablePan: false, enableDamping: true, minDistance: 4, maxDistance: 22, minPolarAngle: 0.5, maxPolarAngle: 1.25 });

scene.add(new THREE.HemisphereLight('#fff7e0', '#3040c0', 1.4));
const sun = new THREE.DirectionalLight('#ffffff', 2.2);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
sun.shadow.bias = -0.0005;
scene.add(sun);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 1 ? 50 : 32;
  camera.updateProjectionMatrix();
}
addEventListener('resize', () => { resize(); if (world && S.mode !== 'title') frameCamera(); });
resize();

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);
const SCREENS = ['loading', 'title', 'map', 'intro', 'hud', 'result', 'hidebar', 'ready', 'pause'];
function screen(...ids) {
  SCREENS.forEach((id) => $(id)?.classList.toggle('hidden', !ids.includes(id)));
}
function toast(text, worldPos, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  let x = innerWidth / 2, y = innerHeight * 0.3;
  if (worldPos) {
    const v = worldPos.clone().project(camera);
    x = (v.x * 0.5 + 0.5) * innerWidth;
    y = (-v.y * 0.5 + 0.5) * innerHeight - 40;
  }
  el.style.left = `${Math.max(90, Math.min(innerWidth - 90, x))}px`;
  el.style.top = `${Math.max(90, y)}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

// ---------- state ----------
let world = null;
const progress = loadProgress();
const S = {
  mode: 'loading', // title | map | intro | play | result | hide | ready | pause
  run: null,
  hover: null,
  lastOpened: null,
  challenge: { spot: null, time: 120, room: 'wizard' },
};

async function enterRoom(roomId) {
  if (world?.roomId === roomId) {
    world.parts.forEach((p) => { p.target = 0; p.value = 0; p.joint.setJointValue(0); });
    clearItems();
    return world;
  }
  screen('loading');
  $('loadbar').style.width = '0%';
  clearItems();
  unloadRoom(scene, world);
  world = await loadRoom(scene, roomId, (f) => ($('loadbar').style.width = `${f * 100}%`));
  frameCamera();
  return world;
}
function frameCamera() {
  const [w, d] = world.room.size;
  // portrait screens: step back so the whole room fits the narrow view
  const k = camera.aspect < 1 ? Math.min(1.9, 1.05 / camera.aspect) : 1;
  camera.position.set(w * 1.0 * k, Math.max(w, d) * 0.95 * k, d * 1.3 * k);
  controls.target.set(0, 0.7, -0.2);
  controls.update();
}

// ---------- items inside furniture ----------
let items = []; // { obj, part, kind: 'key'|'lockkey'|'decoy', found }
function clearItems() {
  items.forEach((it) => it.obj.parent?.remove(it.obj));
  items = [];
  world?.pieces.forEach((pc) => {
    if (pc.padlock) { pc.holder.remove(pc.padlock); pc.padlock = null; }
    pc.locked = false;
  });
}
function itemSpot(part) {
  const childBox = new THREE.Box3().setFromObject(part.link);
  const cc = childBox.getCenter(new THREE.Vector3());
  if (part.joint.jointType === 'prismatic') {
    const h = childBox.max.y - childBox.min.y;
    return { host: part.link, world: new THREE.Vector3(cc.x, childBox.min.y + Math.min(0.05, h * 0.3), cc.z) };
  }
  const pb = new THREE.Box3().setFromObject(part.joint.parent);
  const p = cc.clone().lerp(pb.getCenter(new THREE.Vector3()), 0.5);
  // keep the item low inside tall cupboards so it sits on a "shelf"
  p.y = Math.max(pb.min.y + 0.08, Math.min(p.y, cc.y, pb.min.y + (pb.max.y - pb.min.y) * 0.45));
  return { host: part.joint.parent, world: p };
}
function putItem(obj, part, kind, extra = {}) {
  world.parts.forEach((p) => p.joint.setJointValue(0));
  world.group.updateMatrixWorld(true);
  const { host, world: wp } = itemSpot(part);
  host.add(obj);
  obj.position.copy(host.worldToLocal(wp));
  const s = 1 / host.getWorldScale(new THREE.Vector3()).x;
  obj.scale.multiplyScalar(s);
  obj.visible = false;
  const it = { obj, part, kind, found: false, ...extra };
  items.push(it);
  return it;
}
function lockPiece(piece) {
  piece.locked = true;
  const pad = makePadlock();
  piece.holder.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(piece.holder.matrixWorld).invert();
  const box = new THREE.Box3().setFromObject(piece.robot).applyMatrix4(inv);
  const s = 1 / piece.holder.scale.x;
  pad.scale.setScalar(s * 1.4);
  pad.position.set((box.min.x + box.max.x) / 2, box.min.y + (box.max.y - box.min.y) * 0.55, box.max.z + 0.03 * s);
  piece.holder.add(pad);
  piece.padlock = pad;
}

// ---------- runs ----------
async function startLevel(level, seed = (Math.random() * 1e9) | 0) {
  await enterRoom(level.room);
  setupLevel(level, seed);
  showIntro(level);
}
function setupLevel(level, seed) {
  const rand = rng(seed);
  clearItems();
  const used = new Set();
  const take = (pool) => {
    const p = pool.find((q) => !used.has(q));
    if (p) used.add(p);
    return p;
  };
  const run = { kind: 'story', level, seed, keysTotal: level.keys, keysFound: 0, opened: 0, openedIds: new Set(),
    time: level.time, hints: level.hints, elapsed: 0, penalty: 0, t0: 0, mimics: new Set(), riddle: null };
  const lockedPiece = level.locks ? shuffle(world.pieces.filter((pc) => pc.parts.length), rand)[0] : null;
  const free = shuffle(world.parts.filter((p) => p.piece !== lockedPiece), rand);
  const keyParts = [];
  if (lockedPiece) keyParts.push(take(shuffle(lockedPiece.parts, rand)));
  while (keyParts.length < level.keys) keyParts.push(take(free));
  keyParts.forEach((p, i) => putItem(makeKey(), p, 'key', { n: i }));
  if (lockedPiece) {
    putItem(makeLockKey(), take(free), 'lockkey');
    lockPiece(lockedPiece);
  }
  for (let i = 0; i < (level.mimics || 0); i++) {
    const m = take(free.filter((p) => p.joint.jointType === 'revolute'));
    if (m) run.mimics.add(m);
  }
  const types = shuffle(DECOY_TYPES, rand);
  for (let i = 0; i < (level.decoys || 0); i++) {
    const p = take(free);
    if (p) putItem(makeDecoy(types[i % types.length]), p, 'decoy');
  }
  if (level.riddle) {
    const target = keyParts[keyParts.length - 1];
    const it = world.room.items.find((x) => x.slug === target.piece.slug);
    run.riddle = it?.clue || 'Where things are kept but never read…';
  }
  S.run = run;
}
function startChallengeSeek() {
  clearItems();
  putItem(makeKey(), world.byId.get(S.challenge.spot), 'key', { n: 0 });
  S.run = { kind: 'challenge', keysTotal: 1, keysFound: 0, opened: 0, openedIds: new Set(), time: S.challenge.time,
    hints: 1, elapsed: 0, penalty: 0, t0: 0, mimics: new Set() };
  beginPlay();
}
function beginPlay() {
  world.parts.forEach((p) => { p.target = 0; });
  S.mode = 'play';
  S.run.t0 = performance.now();
  screen('hud');
  $('hudLevel').textContent = S.run.kind === 'story' ? `${S.run.level.id}. ${S.run.level.name}` : 'Challenge';
  $('riddle').classList.toggle('hidden', !S.run.riddle);
  if (S.run.riddle) $('riddle').textContent = `Riddle: “${S.run.riddle}”`;
  hud();
}

// ---------- interaction ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(e) {
  if (!world) return null;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  for (const h of ray.intersectObjects(world.group.children, true)) {
    if (h.object.userData.part) return { part: h.object.userData.part, point: h.point };
    if (h.object.userData.piece) {
      // clicked the body: pick the nearest part of that piece (forgiving on touch screens)
      let best = null, bd = Infinity;
      for (const p of h.object.userData.piece.parts) {
        const d = new THREE.Box3().setFromObject(p.link).getCenter(new THREE.Vector3()).distanceTo(h.point);
        if (d < bd) { bd = d; best = p; }
      }
      return best ? { part: best, point: h.point } : null;
    }
  }
  return null;
}
function setHover(p) {
  if (S.hover === p) return;
  const paint = (part, on) =>
    part?.link.traverse((o) => {
      if (o.isMesh && !o.userData.isOutline) [].concat(o.material).forEach((m) => m.emissive?.set(on ? '#5a4a00' : '#000000'));
    });
  paint(S.hover, false);
  paint(p, true);
  S.hover = p;
  canvas.style.cursor = p ? 'pointer' : 'grab';
}
let down = null;
canvas.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
canvas.addEventListener('pointermove', (e) => {
  if (['hide', 'play'].includes(S.mode) && e.pointerType === 'mouse') setHover(pick(e)?.part || null);
});
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const hit = pick(e);
  if (hit) toggle(hit.part, hit.point);
});

function toggle(p, point) {
  if (!['hide', 'play'].includes(S.mode)) return;
  const where = point || new THREE.Box3().setFromObject(p.link).getCenter(new THREE.Vector3());
  if (S.mode === 'play' && p.piece.locked) {
    sfx('shut');
    p.piece.shake = performance.now();
    toast('Locked!', where, 'bad');
    return;
  }
  const opening = p.target === 0;
  p.target = opening ? p.open : 0;
  p.piece.squash = performance.now();
  sfx(opening ? (p.joint.jointType === 'prismatic' ? 'slide' : 'creak') : 'shut');
  if (S.mode === 'hide') {
    S.lastOpened = opening ? p : world.parts.find((q) => q.target !== 0) || null;
    hideUI();
    return;
  }
  if (!opening) return;
  const run = S.run;
  run.openedIds.add(p.id);
  run.opened++;
  hud();
  if (run.mimics.has(p)) {
    setTimeout(() => {
      p.target = 0;
      run.penalty += 5;
      sfx('chomp');
      toast('CHOMP! +5s', where, 'bad');
    }, 380);
    return;
  }
  setTimeout(() => discover(p, where), 420);
}
const EMPTY = ['Empty!', 'Nothing here.', 'Just dust.', 'Nope!', 'Zilch.', 'Cobwebs…'];
function discover(p, where) {
  if (S.mode !== 'play') return;
  const run = S.run;
  const inside = items.filter((it) => it.part === p && !it.found);
  if (!inside.length) { toast(EMPTY[(Math.random() * EMPTY.length) | 0], where); return; }
  for (const it of inside) {
    it.found = true;
    it.pop = performance.now();
    if (it.kind === 'decoy') { sfx('nope'); toast(DECOY_LINES[it.obj.userData.decoy], where); }
    if (it.kind === 'lockkey') {
      sfx('drop');
      toast('A little brass key! Something unlocked…', where, 'good');
      world.pieces.forEach((pc) => {
        if (pc.locked) { pc.locked = false; pc.unlockAnim = performance.now(); }
      });
    }
    if (it.kind === 'key') {
      run.keysFound++;
      sfx('key');
      toast(run.keysFound >= run.keysTotal ? 'GOT IT!' : `Key ${run.keysFound} of ${run.keysTotal}!`, where, 'good');
      focusOn(it.obj);
      hud();
      if (run.keysFound >= run.keysTotal) setTimeout(win, 1100);
    }
  }
}

// brief camera glance toward a found key, then back
let focus = null;
function focusOn(obj) {
  focus = { t0: performance.now(), from: controls.target.clone(), to: obj.getWorldPosition(new THREE.Vector3()), phase: 'in' };
}

// ---------- hints ----------
$('hintBtn').onclick = () => {
  const run = S.run;
  if (S.mode !== 'play' || run.hints <= 0) return;
  const next = items.find((it) => it.kind === 'key' && !it.found);
  if (!next) return;
  run.hints--;
  next.part.piece.sniff = performance.now();
  sfx('hint');
  toast('Sniff sniff… around here!', next.part.piece.holder.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.4, 0)));
  hud();
};

// ---------- results ----------
function win() {
  if (S.mode !== 'play') return;
  S.mode = 'result';
  sfx('win');
  const run = S.run;
  $('resultTitle').textContent = 'Found it!';
  $('resultTime').textContent = fmt(run.elapsed);
  $('resultOpened').textContent = run.opened;
  if (run.kind === 'story') {
    const stars = starsFor(run.level, { time: run.elapsed, opens: run.opened });
    progress.stars[run.level.id] = Math.max(progress.stars[run.level.id] || 0, stars);
    progress.unlocked = Math.max(progress.unlocked, run.level.id + 1);
    saveProgress(progress);
    resultButtons(stars);
  } else resultButtons(0);
  setTimeout(() => screen('result'), 700);
}
function lose() {
  S.mode = 'result';
  sfx('lose');
  const run = S.run;
  items.filter((it) => it.kind === 'key' && !it.found).forEach((it) => {
    it.part.piece.locked = false;
    it.part.target = it.part.open;
    it.found = true;
    it.pop = performance.now();
  });
  $('resultTitle').textContent = "Time's up!";
  $('resultTime').textContent = fmt(run.time);
  $('resultOpened').textContent = run.opened;
  resultButtons(-1);
  setTimeout(() => screen('result'), 1400);
}
function resultButtons(stars) {
  const el = $('stars');
  el.innerHTML = '';
  el.classList.toggle('hidden', stars === 0);
  const story = S.run.kind === 'story';
  for (let i = 1; i <= 3 && stars !== 0; i++) {
    const s = document.createElement('span');
    s.className = 'star' + (i <= stars ? ' on' : '');
    s.style.animationDelay = `${0.25 * i}s`;
    s.textContent = '★';
    el.appendChild(s);
  }
  $('parLine').textContent = story ? `Par: ${fmt(S.run.level.par.time)} and ${S.run.level.par.opens} opens` : '';
  const hasNext = story && stars > 0 && LEVELS.some((l) => l.id === S.run.level.id + 1 && ROOMS[l.room]);
  $('nextBtn').classList.toggle('hidden', !hasNext);
  $('shareBtn').classList.toggle('hidden', story);
}

function hud() {
  const run = S.run;
  if (!run) return;
  $('opened').textContent = `Opened: ${run.opened}`;
  const left = run.time ? Math.max(0, run.time - run.elapsed) : run.elapsed;
  $('timer').textContent = fmt(left);
  $('timer').classList.toggle('urgent', !!run.time && left <= 10);
  $('keys').innerHTML = Array.from({ length: run.keysTotal }, (_, i) => `<span class="k${i < run.keysFound ? ' on' : ''}"></span>`).join('');
  $('hintBtn').textContent = `Sniff (${run.hints})`;
  $('hintBtn').disabled = run.hints <= 0;
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------- screens ----------
function showTitle() { S.mode = 'title'; screen('title'); }
function showMap() {
  S.mode = 'map';
  history.replaceState(null, '', location.pathname);
  const grid = $('mapGrid');
  grid.innerHTML = '';
  for (const l of LEVELS) {
    const ready = !!ROOMS[l.room];
    const open = ready && l.id <= progress.unlocked;
    const b = document.createElement('button');
    b.className = `panel theme-${l.room}${open ? '' : ' locked'}`;
    const stars = progress.stars[l.id] || 0;
    b.innerHTML = `<span class="num">${l.id}</span><span class="pname">${l.name}</span>
      <span class="pstars">${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i></span>
      <span class="ptag">${ready ? (open ? l.tip : 'Locked: finish the room before') : 'Under construction'}</span>`;
    b.disabled = !open;
    b.onclick = () => { sfx('tick'); startLevel(l); };
    grid.appendChild(b);
  }
  screen('map');
}
function showIntro(level) {
  S.mode = 'intro';
  $('introNum').textContent = `Room ${level.id}`;
  $('introName').textContent = level.name;
  $('introBlurb').textContent = level.blurb;
  const rules = [`Find ${level.keys} key${level.keys > 1 ? 's' : ''}`, `${fmt(level.time)} on the clock`, `${level.hints} sniff hint${level.hints === 1 ? '' : 's'}`];
  if (level.decoys) rules.push(`${level.decoys} decoys`);
  if (level.locks) rules.push('1 padlocked piece');
  if (level.mimics) rules.push(`${level.mimics} mimics`);
  if (level.riddle) rules.push('a riddle');
  $('introRules').innerHTML = rules.map((r) => `<li>${r}</li>`).join('');
  screen('intro');
}
$('playBtn').onclick = () => { sfx('tick'); showMap(); };
$('goBtn').onclick = () => { sfx('tick'); beginPlay(); };
$('introBack').onclick = () => showMap();
$('retryBtn').onclick = () => (S.run.kind === 'story' ? startLevel(S.run.level) : startChallengeSeek());
$('nextBtn').onclick = () => startLevel(LEVELS.find((l) => l.id === S.run.level.id + 1));
$('mapBtn').onclick = () => showMap();
$('pauseBtn').onclick = () => {
  if (S.mode !== 'play') return;
  S.mode = 'pause';
  S.pausedAt = performance.now();
  screen('hud', 'pause');
};
$('resumeBtn').onclick = () => {
  S.run.t0 += performance.now() - S.pausedAt;
  S.mode = 'play';
  screen('hud');
};
$('quitBtn').onclick = () => showMap();

// ---------- challenge (2 players) ----------
async function startHide() {
  sfx('tick');
  const rooms = LEVELS.filter((l) => l.id <= progress.unlocked && ROOMS[l.room]);
  const room = (rooms[rooms.length - 1] || LEVELS[0]).room;
  await enterRoom(room);
  S.challenge.room = room;
  S.mode = 'hide';
  S.lastOpened = null;
  world.parts.forEach((p) => (p.target = 0));
  screen('hidebar');
  hideUI();
}
$('challengeBtn').onclick = startHide;
$('hideAgainBtn').onclick = startHide;
function hideUI() {
  $('hideBtn').disabled = !S.lastOpened;
  $('hideHint').textContent = S.lastOpened
    ? 'Nice spot. Pick a time limit, then hide the key here.'
    : 'Open a drawer, door or lid to choose a hiding spot.';
  const el = $('chipsHide');
  el.innerHTML = '';
  for (const o of TIME_OPTIONS) {
    const b = document.createElement('button');
    b.className = 'chip' + (o.s === S.challenge.time ? ' on' : '');
    b.textContent = o.label;
    b.onclick = () => { S.challenge.time = o.s; sfx('tick'); hideUI(); };
    el.appendChild(b);
  }
}
$('hideBtn').onclick = () => {
  if (!S.lastOpened) return;
  S.challenge.spot = S.lastOpened.id;
  clearItems();
  const it = putItem(makeKey(), S.lastOpened, 'key');
  it.obj.visible = true;
  sfx('drop');
  setTimeout(() => {
    clearItems();
    history.replaceState(null, '', shareUrl());
    showReady();
  }, 900);
};
function showReady() {
  S.mode = 'ready';
  world.parts.forEach((p) => (p.target = 0));
  const t = TIME_OPTIONS.find((o) => o.s === S.challenge.time)?.label || '∞';
  $('readyTime').textContent = S.challenge.time ? `${t} to find it` : 'No timer';
  $('readyCount').textContent = `${world.parts.length} things to open`;
  screen('ready');
}
$('seekBtn').onclick = () => startChallengeSeek();
$('copyBtn').onclick = () => copyLink($('copyBtn'));
$('shareBtn').onclick = () => copyLink($('shareBtn'));
$('readyMapBtn').onclick = () => showMap();

function encodeChallenge(o) { return btoa(JSON.stringify(o)).split('').reverse().join(''); }
function decodeChallenge(c) {
  try { return c ? JSON.parse(atob(c.split('').reverse().join(''))) : null; } catch { return null; }
}
function shareUrl() {
  return `${location.origin}${location.pathname}?c=${encodeURIComponent(encodeChallenge({ r: S.challenge.room, s: S.challenge.spot, t: S.challenge.time }))}`;
}
async function copyLink(btn) {
  const url = shareUrl();
  try { await navigator.clipboard.writeText(url); btn.textContent = 'Link copied!'; }
  catch { prompt('Copy this challenge link', url); }
  setTimeout(() => (btn.textContent = btn.dataset.label), 1600);
}

// ---------- "Made with Lux3D" panel ----------
let manifest = null;
async function openLux() {
  if (!manifest) {
    try { manifest = await (await fetch(`${import.meta.env.BASE_URL}lux3d-manifest.json`)).json(); }
    catch { manifest = { pieces: [] }; }
  }
  S.luxPrev = S.mode;
  S.mode = 'lux';
  screen();
  const list = $('luxList');
  list.innerHTML = '';
  const bySlug = new Map(manifest.pieces.map((p) => [p.slug, p]));
  for (const pc of world.pieces) {
    const m = bySlug.get(pc.slug);
    if (!m) continue;
    const g = m.timings.generate?.seconds, a = m.timings.articulate?.seconds;
    const card = document.createElement('button');
    card.className = 'lux-card';
    card.innerHTML = `<div class="lux-title">${m.slug.replace(/^[a-z]-/, '').replace(/-/g, ' ')}</div>
      <div class="lux-row"><span class="label">Prompt</span><span>${m.prompt}</span></div>
      <div class="lux-row"><span class="label">Motion prompt</span><span>${m.motion}</span></div>
      <div class="lux-meta">
        <span>${m.joints.length} joint${m.joints.length === 1 ? '' : 's'}: ${m.joints.map((j) => j.type).join(', ')}</span>
        ${g ? `<span>generated in ${g}s</span>` : ''}${a ? `<span>articulated in ${a}s</span>` : ''}
        <span>style: ${m.style}</span>
      </div>`;
    card.onclick = () => demoPiece(pc);
    list.appendChild(card);
  }
  $('lux').classList.remove('hidden');
}
function closeLux() {
  $('lux').classList.add('hidden');
  world.parts.forEach((p) => (p.target = 0));
  focus = null;
  controls.target.set(0, 0.7, -0.2);
  if (S.luxPrev === 'map') showMap();
  else showTitle();
}
function demoPiece(pc) {
  sfx('tick');
  const c = new THREE.Box3().setFromObject(pc.robot).getCenter(new THREE.Vector3());
  focus = { t0: performance.now(), from: controls.target.clone(), to: c, phase: 'in' };
  world.parts.forEach((p) => (p.target = 0));
  pc.parts.forEach((p, i) => setTimeout(() => {
    p.target = p.open;
    sfx(p.joint.jointType === 'prismatic' ? 'slide' : 'creak');
  }, 300 + i * 250));
}
$('luxBtn').onclick = openLux;
$('mapLuxBtn').onclick = openLux;
$('mapChallengeBtn').onclick = () => startHide();
$('luxClose').onclick = closeLux;

// ---------- loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  if (world) {
    // springy joints: a little overshoot on open, a firm snap on close
    for (const p of world.parts) {
      if (p.value === p.target && !p.vel) continue;
      const k = p.target === 0 ? 260 : 140, damp = p.target === 0 ? 30 : 13;
      p.vel = (p.vel || 0) + ((p.target - p.value) * k - p.vel * damp) * dt;
      p.value += p.vel * dt;
      if (Math.abs(p.target - p.value) < 1e-3 * Math.max(1, Math.abs(p.open)) && Math.abs(p.vel) < 1e-2) { p.value = p.target; p.vel = 0; }
      // never swing past closed into the body
      if (p.open > 0 ? p.value < 0 : p.value > 0) { p.value = 0; p.vel = 0; }
      p.joint.setJointValue(p.value);
    }
    for (const it of items) {
      const f = it.part.open ? it.part.value / it.part.open : 0;
      if (S.mode !== 'hide') it.obj.visible = it.found || f > 0.45;
      if (it.pop && it.kind !== 'decoy') {
        const t = (now - it.pop) / 1000;
        if (it.obj.userData.glow) it.obj.userData.glow.intensity = 3 + Math.sin(t * 6) * 1.5;
        it.obj.rotation.z = t * 2.5;
      }
    }
    for (const pc of world.pieces) {
      for (const p of pc.parts) {
        const cav = p.joint.parent.userData.cavity;
        if (cav) cav.visible = pc.parts.some((q) => q.joint.parent === p.joint.parent && Math.abs(q.value) > 1e-3);
      }
      let wob = 0, sc = 1;
      if (pc.shake && now - pc.shake < 400) wob = Math.sin((now - pc.shake) / 25) * 0.04;
      if (pc.sniff && now - pc.sniff < 1500) sc = 1 + Math.abs(Math.sin((now - pc.sniff) / 120)) * 0.05;
      if (pc.squash && now - pc.squash < 260) sc *= 1 - Math.sin(((now - pc.squash) / 260) * Math.PI) * 0.025;
      pc.robot.rotation.y = wob;
      pc.robot.scale.setScalar(sc);
      if (pc.padlock && pc.unlockAnim) {
        pc.padlock.position.y -= dt * 2 / pc.holder.scale.x;
        pc.padlock.rotation.z += dt * 6;
        if (now - pc.unlockAnim > 600) { pc.holder.remove(pc.padlock); pc.padlock = null; pc.unlockAnim = 0; }
      }
    }
  }
  if (focus) {
    const t = Math.min(1, (now - focus.t0) / 600);
    const e = t * (2 - t);
    if (focus.phase === 'in') controls.target.lerpVectors(focus.from, focus.to, e * 0.6);
    if (focus.phase === 'out') controls.target.lerpVectors(focus.to.clone().lerp(focus.from, 0.4), focus.from, e);
    if (t >= 1 && focus.phase === 'in') { focus.phase = 'hold'; focus.t0 = now; }
    else if (focus.phase === 'hold' && now - focus.t0 > 700) { focus.phase = 'out'; focus.t0 = now; }
    else if (t >= 1 && focus.phase === 'out') focus = null;
  }
  if (S.mode === 'play') {
    S.run.elapsed = (now - S.run.t0) / 1000 + S.run.penalty;
    hud();
    if (S.run.time && S.run.elapsed >= S.run.time) lose();
  }
  if (S.mode === 'title' && world) {
    const a = now / 9000, [w, d] = world.room.size;
    controls.target.set(0, 0.7, -0.2);
    camera.position.set(w + Math.sin(a) * 1.5, Math.max(w, d) * 0.95, d * 1.3 + Math.cos(a) * 1.5);
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- music ----------
addEventListener('pointerdown', startMusic, { once: true });
const muteBtn = $('muteBtn');
const paintMute = () => (muteBtn.textContent = isMuted() ? 'Music: off' : 'Music: on');
muteBtn.onclick = () => { startMusic(); toggleMute(); paintMute(); };
paintMute();

// ---------- boot ----------
window.__rummage = { S, camera, controls, scene, get world() { return world; }, toggle, startLevel, beginPlay, items: () => items };
frame();
(async () => {
  const params = new URLSearchParams(location.search);
  const ch = decodeChallenge(params.get('c'));
  try {
    if (ch && ROOMS[ch.r]) {
      await enterRoom(ch.r);
      if (world.byId.has(ch.s)) {
        Object.assign(S.challenge, { room: ch.r, spot: ch.s, time: ch.t ?? 120 });
        showReady();
        return;
      }
    }
    await enterRoom(params.get('room') && ROOMS[params.get('room')] ? params.get('room') : 'wizard');
    showTitle();
  } catch (e) {
    console.error(e);
    $('loadmsg').textContent = 'Could not load the room. Please refresh.';
  }
})();
