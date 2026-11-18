import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ROOMS, TIME_OPTIONS, NAMES } from './rooms.js';
import { LEVELS, loadProgress, saveProgress, starsFor, rng, shuffle } from './levels.js';
import { loadRoom, unloadRoom } from './world.js';
import { makeKey, makeLockKey, makePadlock, makeDecoy, DECOY_TYPES, DECOY_LINES, preloadItems } from './items.js';
import { sfx, toggleSfx, isSfxMuted } from './sfx.js';
import { startMusic, toggleMute, isMuted, setSong, setHurry, duck } from './music.js';
import { LANG, setLang, t as tr, levelText, NAMES_ZH, CLUES_ZH, SECRET_CLUES_EN, DECOY_ZH, EMPTY, timeLabel } from './i18n.js';
import './style.css';

// ---------- renderer / camera ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
const TOUCH = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // shadows re-render only while something moves (see frame loop)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enablePan: false, enableDamping: true, minDistance: 4, maxDistance: 22, minPolarAngle: 0.5, maxPolarAngle: 1.25 });

const hemi = new THREE.HemisphereLight('#fff7e0', '#3040c0', 1.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 2.2);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
sun.shadow.bias = -0.0005;
scene.add(sun);
// Night mode: a flashlight from the camera that follows the pointer (or last touch)
const torch = new THREE.SpotLight('#fff1c4', 0, 40, 0.15, 0.45, 1.0);
scene.add(torch, torch.target);
const aim = new THREE.Vector3(0, 0.6, 0);
let night = false;
function setNight(on) {
  night = on;
  hemi.intensity = on ? 0.025 : 1.4;
  sun.intensity = on ? 0.06 : 2.2;
  torch.intensity = on ? 90 : 0;
  document.body.classList.toggle('night', on);
  if (world) scene.background = new THREE.Color(on ? '#06050d' : world.theme.bg);
  renderer.shadowMap.needsUpdate = true;
}

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
const SCREENS = ['loading', 'title', 'map', 'intro', 'hud', 'result', 'hidebar', 'ready', 'pause', 'reveal', 'bet'];
function screen(...ids) {
  SCREENS.forEach((id) => $(id)?.classList.toggle('hidden', !ids.includes(id)));
  document.body.classList.toggle('in-play', ids.includes('hud'));
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
  renderer.shadowMap.needsUpdate = true;
  frameCamera();
  return world;
}
function frameCamera() {
  const [w, d] = world.room.size;
  // portrait screens: step back so the whole room fits the narrow view
  const k = camera.aspect < 1 ? Math.min(1.6, 0.72 / camera.aspect) : 1;
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
// anchor -1 / 0 / 1 moves the item left / centre / right inside the compartment, so a key isn't always on the same spot
const UP = new THREE.Vector3(0, 1, 0);
function flatDir(v) { v.y = 0; return v.lengthSq() < 1e-6 ? v.set(1, 0, 0) : v.normalize(); }
function extentAlong(box, dir) { const sz = box.getSize(new THREE.Vector3()); return Math.abs(sz.x * dir.x) + Math.abs(sz.z * dir.z); }
function itemSpot(part, anchor = 0) {
  if (part.secret) return { host: world.shell, world: part.secret.spot.clone() };
  const childBox = new THREE.Box3().setFromObject(part.link);
  const cc = childBox.getCenter(new THREE.Vector3());
  const axis = part.joint.axis.clone().transformDirection(part.joint.matrixWorld);
  if (part.joint.jointType === 'prismatic') {
    const h = childBox.max.y - childBox.min.y;
    const side = flatDir(UP.clone().cross(axis));
    const p = new THREE.Vector3(cc.x, childBox.min.y + Math.min(0.05, h * 0.3), cc.z);
    return { host: part.link, world: p.addScaledVector(side, anchor * 0.22 * extentAlong(childBox, side)) };
  }
  const pb = new THREE.Box3().setFromObject(part.joint.parent);
  const pc = pb.getCenter(new THREE.Vector3());
  let p;
  if (Math.abs(axis.y) > 0.9) p = cc.clone().lerp(pc, 0.5 + anchor * 0.18); // door: nearer the hinge or the far side
  else { // lid: slide along the hinge line
    const along = flatDir(axis.clone());
    p = cc.clone().lerp(pc, 0.5).addScaledVector(along, anchor * 0.2 * extentAlong(pb, along));
  }
  // keep the item low inside tall cupboards so it sits on a "shelf"
  p.y = Math.max(pb.min.y + 0.08, Math.min(p.y, cc.y, pb.min.y + (pb.max.y - pb.min.y) * 0.45));
  return { host: part.joint.parent, world: p };
}
function putItem(obj, part, kind, extra = {}) {
  world.parts.forEach((p) => p.joint.setJointValue(0));
  world.group.updateMatrixWorld(true);
  const { host, world: wp } = itemSpot(part, extra.anchor || 0);
  if (extra.spin) obj.rotation.y = extra.spin;
  host.add(obj);
  obj.position.copy(host.worldToLocal(wp));
  const s = 1 / host.getWorldScale(new THREE.Vector3()).x;
  obj.scale.multiplyScalar(s);
  obj.visible = false;
  obj.userData.baseY = obj.position.y;
  obj.userData.hostScale = 1 / s;
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
  setNight(!!level.night);
  showIntro(level);
}
// weighted pick
function pickWeighted(pool, rand, weight) {
  const ws = pool.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < pool.length; i++) if ((r -= ws[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}
const partKind = (p) => (p.secret ? 'secret' : p.joint.jointType === 'prismatic' ? 'drawer' : Math.abs(p.joint.axis.y) > 0.9 ? 'door' : 'lid');
// Placement: every openable part in the furniture is equally likely to hold a key (no favourite spots),
// keys never share a piece, and the room's secret spots (picture, floorboard) are an occasional surprise.
// Check the spread with tools/key_stats.mjs: no spot should hold a key in more than ~25% of runs.
function setupLevel(level, seed) {
  const rand = rng(seed);
  clearItems();
  world.parts.forEach((p) => { p.joint.setJointValue(0); });
  world.group.updateMatrixWorld(true);
  const used = new Set();
  const usedPieces = new Set();
  const usedKinds = new Map();
  const free = () => world.parts.filter((p) => !used.has(p) && !p.piece.lockedFlag);
  const furniture = () => free().filter((p) => !p.secret);
  const claim = (p) => { used.add(p); return p; };
  const pickU = (pool) => pool[Math.floor(rand() * pool.length)];
  const place = () => ({ anchor: Math.floor(rand() * 3) - 1, spin: rand() * Math.PI * 2 });
  const run = { kind: 'story', level, seed, keysTotal: level.keys, keysFound: 0, opened: 0, openedIds: new Set(),
    time: level.time, hints: level.hints, bets: level.bets || 0, elapsed: 0, penalty: 0, t0: 0, mimics: new Set(), riddle: null, hint: null };

  // a padlocked piece always guards one key, so the brass key becomes a required detour
  let lockedPiece = null;
  if (level.locks) {
    lockedPiece = pickU(world.pieces.filter((pc) => pc.parts.length >= 1 && !pc.secret));
    lockedPiece.lockedFlag = true;
  }
  const keyParts = [];
  const addKey = (p) => { claim(p); keyParts.push(p); usedPieces.add(p.piece); usedKinds.set(partKind(p), (usedKinds.get(partKind(p)) || 0) + 1); };
  if (lockedPiece) addKey(pickU(lockedPiece.parts));
  // secret spots: a surprise, not a habit (30% of night runs, 10% of day runs from level 3)
  const secretRoll = rand();
  if (secretRoll < (level.night ? 0.3 : level.id >= 3 ? 0.1 : 0) && keyParts.length < level.keys) {
    const secrets = free().filter((p) => p.secret);
    if (secrets.length) addKey(pickU(secrets));
  }
  while (keyParts.length < level.keys) {
    const pool = furniture().filter((p) => !usedPieces.has(p.piece));
    // equal odds per part, gently varying drawer / door / lid across keys
    addKey(pickWeighted(pool.length ? pool : furniture(), rand, (q) => 1 / (1 + (usedKinds.get(partKind(q)) || 0))));
  }
  keyParts.forEach((p, i) => putItem(makeKey(), p, 'key', { n: i, ...place() }));
  if (lockedPiece) {
    // the brass key sits away from the locked piece
    const far = furniture().filter((p) => p.piece !== lockedPiece);
    const lp = lockedPiece.holder.position;
    putItem(makeLockKey(), claim(pickWeighted(far, rand, (q) => q.piece.holder.position.distanceTo(lp))), 'lockkey', place());
    lockPiece(lockedPiece);
  }
  // mimics: any door or lid in the furniture
  for (let i = 0; i < (level.mimics || 0); i++) {
    const pool = furniture().filter((p) => p.joint.jointType === 'revolute');
    if (pool.length) run.mimics.add(claim(pickU(pool)));
  }
  // decoys: anywhere, including the secret spots
  const types = shuffle(DECOY_TYPES, rand);
  for (let i = 0; i < (level.decoys || 0); i++) {
    const pool = free();
    if (pool.length) putItem(makeDecoy(types[i % types.length]), claim(pickU(pool)), 'decoy', place());
  }
  if (level.riddle) {
    const target = keyParts[keyParts.length - 1];
    const it = world.room.items.find((x) => x.slug === target.piece.slug);
    run.riddle = { slug: it ? target.piece.slug : null, clue: it?.clue, secret: target.secret?.name };
  }
  world.pieces.forEach((pc) => delete pc.lockedFlag);
  S.run = run;
}
function startChallengeSeek() {
  clearItems();
  putItem(makeKey(), world.byId.get(S.challenge.spot), 'key', { n: 0 });
  S.run = { kind: 'challenge', keysTotal: 1, keysFound: 0, opened: 0, openedIds: new Set(), time: S.challenge.time,
    hints: 1, bets: 0, elapsed: 0, penalty: 0, t0: 0, mimics: new Set(), hint: null };
  beginPlay();
}
function beginPlay() {
  world.parts.forEach((p) => { p.target = 0; });
  setSong(S.run.level?.night ? 'night' : world.room.theme);
  setNight(!!S.run.level?.night);
  S.lastSec = null;
  frameCamera();
  S.mode = 'play';
  S.run.t0 = performance.now();
  screen('hud');
  $('hudLevel').textContent = S.run.kind === 'story' ? `${S.run.level.id}. ${levelText(S.run.level).name}` : tr('challengeHud');
  $('riddle').classList.toggle('hidden', !S.run.riddle);
  $('clue').classList.add('hidden');
  $('hud').classList.remove('revealing');
  if (S.run.riddle) {
    $('riddleText').textContent = riddleText(S.run.riddle);
    setRiddle(true);
    clearTimeout(S.riddleTimer);
    S.riddleTimer = setTimeout(() => setRiddle(false), 5000); // read it, then it tucks away
  }
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
// flashlight aim: cheap raycast against the room shell only (walls + floor)
const aimRay = new THREE.Raycaster();
function aimAt(e) {
  if (!night || !world) return;
  const r = canvas.getBoundingClientRect();
  aimRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = aimRay.intersectObject(world.shell, true)[0];
  if (hit) aim.copy(hit.point);
}
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; aimAt(e); });
canvas.addEventListener('pointermove', (e) => {
  aimAt(e);
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
    toast(tr('locked'), where, 'bad');
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
      toast(tr('chomp'), where, 'bad');
    }, 380);
    return;
  }
  setTimeout(() => discover(p, where), 420);
}
function discover(p, where) {
  if (S.mode !== 'play') return;
  const run = S.run;
  const inside = items.filter((it) => it.part === p && !it.found);
  if (!inside.length) { sfx('empty'); { const e = EMPTY[LANG === 'zh' ? 1 : 0]; toast(e[(Math.random() * e.length) | 0], where); } return; }
  for (const it of inside) {
    it.found = true;
    it.pop = performance.now();
    if (it.kind === 'decoy') { sfx('nope'); toast((LANG === 'zh' ? DECOY_ZH : DECOY_LINES)[it.obj.userData.decoy], where); }
    if (it.kind === 'lockkey') {
      sfx('unlock');
      toast(tr('brass'), where, 'good');
      world.pieces.forEach((pc) => {
        if (pc.locked) { pc.locked = false; pc.unlockAnim = performance.now(); }
      });
    }
    if (it.kind === 'key') {
      run.keysFound++;
      sfx('key');
      toast(run.keysFound >= run.keysTotal ? tr('gotIt') : tr('keyOf', { a: run.keysFound, b: run.keysTotal }), where, 'good');
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
function setRiddle(open) {
  $('riddle').classList.toggle('open', open);
  $('riddle').setAttribute('aria-expanded', String(open));
}
function riddleText(r) {
  const zh = LANG === 'zh';
  const s = zh ? (CLUES_ZH[r.slug] || CLUES_ZH[r.secret]) : (r.clue || SECRET_CLUES_EN[r.secret]);
  return zh ? `“${s || tr('riddleFallback')}”` : `“${s || tr('riddleFallback')}”`;
}
$('riddle').onclick = () => setRiddle(!$('riddle').classList.contains('open'));
// What the player should look for next: an unfound key they can reach, else the brass key that opens the padlock.
function nextTarget() {
  const keys = items.filter((it) => it.kind === 'key' && !it.found);
  return keys.find((it) => !it.part.piece.locked) || items.find((it) => it.kind === 'lockkey' && !it.found) || keys[0] || null;
}
const nameOf = (pc) => (LANG === 'zh' ? NAMES_ZH[pc.slug] : NAMES[pc.slug]) || pc.slug.replace(/^[a-z]+-/, '');
const piecePos = (pc) => new THREE.Box3().setFromObject(pc.robot).getCenter(new THREE.Vector3());
function whereIs(pc) {
  const [w, d] = world.room.size;
  const p = piecePos(pc);
  if (p.x < -w / 4) return tr('wLeft');
  if (p.z < -d / 4) return tr('wBack');
  if (p.x > w / 4) return tr('wRight');
  return tr('wMid');
}
function clueFor(it) {
  const p = it.part, pc = p.piece;
  if (p.secret) return p.secret.name === 'picture' ? tr('cWalls') : tr('cFloor');
  const what = tr({ drawer: 'cDrawer', door: 'cDoor', lid: 'cLid' }[partKind(p)]);
  // nearest other piece as a landmark
  const here = piecePos(pc);
  let near = null, nd = Infinity;
  for (const q of world.pieces) {
    if (q === pc || q.secret) continue;
    const dd = piecePos(q).distanceTo(here);
    if (dd < nd) { nd = dd; near = q; }
  }
  const brass = it.kind === 'lockkey' ? tr('cBrass') : '';
  const lm = near && nd < 1.6 ? tr('cNear', { name: nameOf(near) }) : '';
  if (LANG === 'zh') return `${brass}${what}${lm}，${whereIs(pc)}。`;
  return `${brass}${brass ? what.toLowerCase() : what}${lm}, ${whereIs(pc)}.`;
}
function showClue(text) {
  $('clueText').textContent = text;
  $('clue').classList.remove('hidden');
  $('clue').classList.remove('pop'); void $('clue').offsetWidth; $('clue').classList.add('pop');
}
// 1st hint on a target: a clue in words. 2nd hint on the same target: its piece glows and is named.
$('hintBtn').onclick = () => {
  const run = S.run;
  if (S.mode !== 'play' || run.hints <= 0) return;
  const it = nextTarget();
  if (!it) return;
  if (!run.hint || run.hint.it !== it || run.hint.it.found) run.hint = { it, stage: 0 };
  run.hints--;
  sfx('hint');
  if (run.hint.stage === 0) showClue(clueFor(it));
  else {
    const pc = it.part.piece;
    pc.glow = performance.now();
    pc.sniff = performance.now();
    showClue(it.part.secret ? tr('itsThe', { name: nameOf(pc) }) : tr('itsIn', { name: nameOf(pc) }));
  }
  run.hint.stage++;
  hud();
};

// ---------- risk: the dice button (levels 5+) ----------
const BETS = () => [
  { id: 'peek', name: tr('bPeek'), odds: tr('bPeekOdds'), text: tr('bPeekText') },
  { id: 'flip', name: tr('bFlip'), odds: tr('bFlipOdds'), text: tr('bFlipText') },
  { id: 'long', name: tr('bLong'), odds: tr('bLongOdds'), text: tr('bLongText'), min: 2 },
];
function openBets() {
  const run = S.run;
  if (S.mode !== 'play' || run.bets <= 0) return;
  const left = items.filter((it) => it.kind === 'key' && !it.found).length;
  $('betList').innerHTML = '';
  for (const b of BETS()) {
    const btn = document.createElement('button');
    btn.className = 'btn bet-opt';
    btn.disabled = left < (b.min || 1);
    btn.innerHTML = `<b>${b.name}</b><span class="odds">${b.odds}</span><span class="what">${b.text}</span>`;
    btn.onclick = () => placeBet(b.id);
    $('betList').appendChild(btn);
  }
  screen('hud', 'bet');
}
function grantKey(it) {
  const p = it.part;
  if (p.piece.locked) { p.piece.locked = false; p.piece.unlockAnim = performance.now(); }
  const where = new THREE.Box3().setFromObject(p.link).getCenter(new THREE.Vector3());
  if (p.target === 0) p.target = p.open;
  setTimeout(() => discover(p, where), 420);
}
function placeBet(id) {
  const run = S.run;
  screen('hud');
  if (S.mode !== 'play' || run.bets <= 0) return;
  run.bets--;
  hud();
  const left = () => Math.max(0, run.time - run.elapsed);
  if (id === 'peek') {
    run.penalty += 15;
    const it = nextTarget();
    if (it) { it.part.piece.glow = performance.now(); it.part.piece.sniff = performance.now(); showClue(tr('itsIn', { name: nameOf(it.part.piece) })); }
    toast(tr('minus15'), null, 'bad');
    return;
  }
  sfx('tick');
  toast(id === 'flip' ? tr('flipping') : tr('rolling'));
  setTimeout(() => {
    if (S.mode !== 'play') return;
    const win = Math.random() < (id === 'flip' ? 0.5 : 0.25);
    if (win) {
      sfx('unlock');
      toast(id === 'flip' ? tr('heads') : tr('jackpot'), null, 'good');
      if (id === 'flip') { const it = nextTarget(); if (it) grantKey(it); }
      else {
        const lk = items.find((it) => it.kind === 'lockkey' && !it.found);
        if (lk) lk.found = true; // the padlock comes off with the jackpot
        items.filter((it) => it.kind === 'key' && !it.found).forEach((it, i) => setTimeout(() => grantKey(it), i * 500));
      }
    } else {
      sfx('chomp');
      if (id === 'flip') { run.penalty += left() / 2; toast(tr('tails'), null, 'bad'); }
      else { run.penalty += Math.max(0, left() - 15); toast(tr('bust'), null, 'bad'); }
    }
  }, 900);
}
$('betBtn').onclick = openBets;
$('betClose').onclick = () => screen('hud');

// ---------- results ----------
function win() {
  if (S.mode !== 'play') return;
  S.mode = 'result';
  calmDown();
  sfx('win');
  const run = S.run;
  $('resultTitle').textContent = tr('foundIt');
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
  S.mode = 'reveal';
  calmDown();
  sfx('lose');
  const missed = items.filter((it) => it.kind === 'key' && !it.found);
  setNight(false); // lights on so you can see where they were
  missed.forEach((it) => {
    const pc = it.part.piece;
    if (pc.locked) { pc.locked = false; pc.unlockAnim = performance.now(); }
    it.part.target = it.part.open;
    it.found = true;
    it.pop = performance.now();
    pc.glow = performance.now() + 50000; // glows until the result screen
  });
  // walk the camera past each missed key, naming the spot
  missed.forEach((it, i) => setTimeout(() => {
    if (S.mode !== 'reveal') return;
    focusOn(it.obj);
    toast(tr('keyWasHere', { n: it.n + 1, name: nameOf(it.part.piece) }), it.obj.getWorldPosition(new THREE.Vector3()), 'good');
  }, 600 + i * 2200));
  $('revealText').textContent = missed.length === 1 ? tr('revealOne') : tr('revealMany', { n: missed.length });
  screen('hud', 'reveal');
  $('hud').classList.add('revealing');
}
$('revealBtn').onclick = () => showLoseResult();
function showLoseResult() {
  if (S.mode !== 'reveal') return;
  const run = S.run;
  S.mode = 'result';
  $('hud').classList.remove('revealing');
  world.pieces.forEach((pc) => (pc.glow = 0));
  $('resultTitle').textContent = tr('timesUp');
  $('resultTime').textContent = fmt(run.time);
  $('resultOpened').textContent = run.opened;
  resultButtons(-1);
  screen('result');
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
  $('parLine').textContent = story ? tr('par', { t: fmt(S.run.level.par.time), o: S.run.level.par.opens }) : '';
  const hasNext = story && stars > 0 && LEVELS.some((l) => l.id === S.run.level.id + 1 && ROOMS[l.room]);
  $('nextBtn').classList.toggle('hidden', !hasNext);
  $('shareBtn').classList.toggle('hidden', story);
}

function hud() {
  const run = S.run;
  if (!run) return;
  $('opened').textContent = tr('opened', { n: run.opened });
  const left = run.time ? Math.max(0, run.time - run.elapsed) : run.elapsed;
  $('timer').textContent = fmt(left);
  $('timer').classList.toggle('urgent', !!run.time && left <= 10);
  $('keys').innerHTML = Array.from({ length: run.keysTotal }, (_, i) => `<span class="k${i < run.keysFound ? ' on' : ''}"></span>`).join('');
  $('hintCount').textContent = run.hints;
  $('hintBtn').disabled = run.hints <= 0;
  $('betBtn').classList.toggle('hidden', !(run.level?.bets));
  $('betCount').textContent = run.bets;
  $('betBtn').disabled = run.bets <= 0;
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------- deadline pressure ----------
// ≤30s: HURRY! + faster music. ≤10s: tick every second, red pulse, shaking timer. ≤5s: louder ticks, camera shake.
const vignette = $('vignette');
function deadline(left, now) {
  const sec = Math.ceil(left);
  if (sec !== S.lastSec) {
    if (S.lastSec != null) {
      if (sec === 30 && S.run.time > 30) { sfx('hurry'); toast(tr('hurry'), null, 'bad'); }
      if (sec === 10) { sfx('hurry'); toast('10 SECONDS!', null, 'bad'); }
      if (sec <= 10 && sec > 0) sfx(sec <= 5 ? 'clockHi' : 'clock');
    }
    S.lastSec = sec;
  }
  setHurry(left <= 10 ? 2 : left <= 30 ? 1 : 0);
  const u = left <= 10 ? 1 - Math.max(0, left) / 10 : 0;
  vignette.style.opacity = u ? (0.35 + 0.45 * u) * (0.6 + 0.4 * Math.abs(Math.sin(now / (left <= 5 ? 120 : 220)))) : 0;
  $('timer').classList.toggle('shake', left <= 10);
  if (left <= 5) {
    const a = 0.012 * (1 - left / 5);
    camera.position.x += (Math.random() - 0.5) * a;
    camera.position.y += (Math.random() - 0.5) * a;
  }
}
function calmDown() {
  setHurry(0);
  vignette.style.opacity = 0;
  $('timer').classList.remove('shake');
}

// ---------- screens ----------
function showTitle() { S.mode = 'title'; setSong('title'); calmDown(); setNight(false); screen('title'); }
function showMap() {
  S.mode = 'map';
  setNight(false);
  setSong('title');
  calmDown();
  history.replaceState(null, '', location.pathname);
  const grid = $('mapGrid');
  grid.innerHTML = '';
  for (const [label, night] of [[tr('day'), false], [tr('night'), true]]) {
    const h = document.createElement('div');
    h.className = `map-row-label${night ? ' night' : ''}`;
    h.textContent = label;
    grid.appendChild(h);
    for (const l of LEVELS.filter((x) => !!x.night === night)) {
      const open = !!ROOMS[l.room] && l.id <= progress.unlocked;
      const b = document.createElement('button');
      b.className = `panel theme-${l.room}${night ? ' night' : ''}${open ? '' : ' locked'}`;
      const stars = progress.stars[l.id] || 0;
      b.title = open ? levelText(l).tip : tr('lockedTip');
      b.innerHTML = `<span class="num">${l.id}</span><span class="pname">${levelText(l).name}</span>
        <span class="pstars">${open ? '★'.repeat(stars) + `<i>${'★'.repeat(3 - stars)}</i>` : '🔒'}</span>`;
      b.disabled = !open;
      b.onclick = () => { sfx('tick'); startLevel(l); };
      grid.appendChild(b);
    }
  }
  screen('map');
}
function showIntro(level) {
  S.mode = 'intro';
  $('introNum').textContent = tr('room', { n: level.id });
  $('introName').textContent = levelText(level).name;
  $('introBlurb').textContent = levelText(level).blurb;
  const rules = [tr('rFind', { n: level.keys }), tr('rClock', { t: fmt(level.time) }), tr('rHints', { n: level.hints })];
  if (level.decoys) rules.push(tr('rDecoys', { n: level.decoys }));
  if (level.locks) rules.push(tr('rLock'));
  if (level.mimics) rules.push(tr('rMimics', { n: level.mimics }));
  if (level.riddle) rules.push(tr('rRiddle'));
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
  duck(true);
  screen('hud', 'pause');
};
$('resumeBtn').onclick = () => {
  S.run.t0 += performance.now() - S.pausedAt;
  duck(false);
  S.mode = 'play';
  screen('hud');
};
$('quitBtn').onclick = () => { duck(false); showMap(); };

// ---------- challenge (2 players) ----------
async function startHide() {
  sfx('tick');
  setNight(false);
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
    ? tr('hideOpen')
    : tr('hideClosed');
  const el = $('chipsHide');
  el.innerHTML = '';
  for (const o of TIME_OPTIONS) {
    const b = document.createElement('button');
    b.className = 'chip' + (o.s === S.challenge.time ? ' on' : '');
    b.textContent = timeLabel(o.label);
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
  const t = timeLabel(TIME_OPTIONS.find((o) => o.s === S.challenge.time)?.label || '∞');
  $('readyTime').textContent = S.challenge.time ? tr('toFind', { t }) : tr('noTimer');
  $('readyCount').textContent = tr('thingsToOpen', { n: world.parts.length });
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
  try { await navigator.clipboard.writeText(url); btn.textContent = tr('linkCopied'); }
  catch { prompt(tr('copyPrompt'), url); }
  setTimeout(() => (btn.textContent = tr(btn.dataset.i18n)), 1600);
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
    card.innerHTML = `<div class="lux-title">${LANG === 'zh' ? nameOf(pc) : m.slug.replace(/^[a-z]-/, '').replace(/-/g, ' ')}</div>
      <div class="lux-row"><span class="label">${tr('luxPrompt')}</span><span>${m.prompt}</span></div>
      <div class="lux-row"><span class="label">${tr('luxMotion')}</span><span>${m.motion}</span></div>
      <div class="lux-meta">
        <span>${tr('luxJoints', { n: m.joints.length, types: m.joints.map((j) => j.type).join(', ') })}</span>
        ${g ? `<span>${tr('luxGen', { s: g })}</span>` : ''}${a ? `<span>${tr('luxArt', { s: a })}</span>` : ''}
        <span>${tr('luxStyle', { s: m.style })}</span>
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
      const v = p.vel || 0;
      p.vel = v + ((p.target - p.value) * k - v * damp) * dt;
      p.value += p.vel * dt;
      if (Math.abs(p.target - p.value) < 1e-3 * Math.max(1, Math.abs(p.open)) && Math.abs(p.vel) < 1e-2) { p.value = p.target; p.vel = 0; }
      // never swing past closed into the body
      if (p.open > 0 ? p.value < 0 : p.value > 0) { p.value = 0; p.vel = 0; }
      p.joint.setJointValue(p.value);
      renderer.shadowMap.needsUpdate = true;
    }
    for (const it of items) {
      const f = it.part.open ? it.part.value / it.part.open : 0;
      if (S.mode !== 'hide') it.obj.visible = it.found || f > 0.45;
      if (it.pop && it.kind !== 'decoy') {
        const t = (now - it.pop) / 1000;
        if (it.obj.userData.glow) it.obj.userData.glow.intensity = 3 + Math.sin(t * 6) * 1.5;
        it.obj.rotation.y = t * 2.5;
        // float up out of the hiding spot and bob
        const lift = (Math.min(1, t * 2.5) * 0.18 + Math.sin(t * 4) * 0.015) / it.obj.userData.hostScale;
        it.obj.position.y = it.obj.userData.baseY + lift;
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
      if (pc.glow || pc.glowOn) {
        const t = now - pc.glow;
        const on = pc.glow && t > -60000 && t < 6000;
        const k = on ? 0.35 + 0.35 * Math.sin(now / 160) : 0;
        pc.robot.traverse((o) => {
          if (o.isMesh && !o.userData.isOutline) [].concat(o.material).forEach((m) => m.emissive?.setRGB(k, k * 0.8, 0));
        });
        pc.glowOn = on;
        if (!on) pc.glow = 0;
      }
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
    if (S.run.time) deadline(S.run.time - S.run.elapsed, now);
    if (S.run.time && S.run.elapsed >= S.run.time) lose();
  }
  if (S.mode === 'title' && world) {
    const a = now / 9000, [w, d] = world.room.size;
    const k = camera.aspect < 1 ? Math.min(1.6, 0.72 / camera.aspect) : 1;
    controls.target.set(0, 0.7, -0.2);
    camera.position.set((w + Math.sin(a) * 1.5) * k, Math.max(w, d) * 0.95 * k, (d * 1.3 + Math.cos(a) * 1.5) * k);
  }
  if (night) {
    torch.position.copy(camera.position);
    torch.target.position.lerp(aim, 0.2);
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- music ----------
addEventListener('pointerdown', startMusic, { once: true });
const muteBtn = $('muteBtn');
const paintMute = () => (muteBtn.textContent = isMuted() ? tr('musicOff') : tr('musicOn'));
muteBtn.onclick = (e) => { e.stopPropagation(); startMusic(); toggleMute(); paintMute(); };
paintMute();
const sfxBtn = $('sfxBtn');
const paintSfx = () => (sfxBtn.textContent = isSfxMuted() ? tr('sfxOff') : tr('sfxOn'));
sfxBtn.onclick = (e) => { e.stopPropagation(); toggleSfx(); paintSfx(); sfx('click'); };
paintSfx();
$('pMusic').onclick = () => { muteBtn.click(); syncPause(); };
$('pSfx').onclick = () => { sfxBtn.click(); syncPause(); };
function syncPause() { $('pMusic').textContent = muteBtn.textContent; $('pSfx').textContent = sfxBtn.textContent; }
syncPause();
// a click sound on every button, a soft tick on hover (mouse only)
document.addEventListener('click', (e) => { if (e.target.closest('button') && !e.target.closest('.sound')) sfx('click'); }, true);
document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse' && e.target.closest('button:not(:disabled)')) sfx('hover'); });

// ---------- embedded on a phone ----------
// ModelScope shows the game in an iframe that can be far larger than a phone screen, pushing controls off-screen.
// Offer to open the game directly (full screen, real phone viewport).
function embedCheck() {
  let framed = false;
  try { framed = window.top !== window; } catch { framed = true; }
  const touch = matchMedia('(pointer: coarse)').matches;
  const oversized = innerWidth > window.screen.width + 8 || innerHeight > window.screen.height + 8; // window.screen: `screen` is our own helper
  if (framed && (touch || oversized)) {
    const a = $('fullBtn');
    a.href = 'https://rummage-game.vercel.app/';
    a.classList.remove('hidden');
    document.body.classList.add('embedded');
  }
}
embedCheck();
addEventListener('resize', embedCheck);
[500, 1500, 4000].forEach((ms) => setTimeout(embedCheck, ms));

// ---------- language ----------
function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', tr(el.dataset.i18nAria)));
  paintMute(); paintSfx(); syncPause();
}
$('langBtn').onclick = (e) => {
  e.stopPropagation();
  setLang(LANG === 'zh' ? 'en' : 'zh');
  applyStatic();
  // re-render whatever is on screen in the new language
  if (S.mode === 'map') showMap();
  else if (S.mode === 'intro' && S.run?.level) showIntro(S.run.level);
  else if (S.mode === 'hide') hideUI();
  else if (S.mode === 'ready') showReady();
  if (S.run && ['play', 'pause'].includes(S.mode)) {
    hud();
    $('hudLevel').textContent = S.run.kind === 'story' ? `${S.run.level.id}. ${levelText(S.run.level).name}` : tr('challengeHud');
    if (S.run.riddle) $('riddleText').textContent = riddleText(S.run.riddle);
  }
};
setLang(LANG);
applyStatic();

// ---------- boot ----------
window.__rummage = { THREE, S, progress, showTitle, showMap, startHide, camera, controls, scene, get world() { return world; }, toggle, startLevel, setupLevel, beginPlay, lose, placeBet, items: () => items, levels: LEVELS, ROOMS };
frame();
(async () => {
  const params = new URLSearchParams(location.search);
  const ch = decodeChallenge(params.get('c'));
  try {
    await preloadItems();
    if (ch && ROOMS[ch.r]) {
      await enterRoom(ch.r);
      if (world.byId.has(ch.s)) {
        Object.assign(S.challenge, { room: ch.r, spot: ch.s, time: ch.t ?? 120 });
        showReady();
        return;
      }
    }
    // test link: ?level=7&seed=1 jumps straight into that level with a fixed key layout (see docs/KEY-SHEET.md)
    const tl = LEVELS.find((l) => String(l.id) === params.get('level'));
    if (tl && ROOMS[tl.room]) {
      const seed = Number.parseInt(params.get('seed'), 10);
      await startLevel(tl, Number.isFinite(seed) ? seed : undefined);
      return;
    }
    await enterRoom(params.get('room') && ROOMS[params.get('room')] ? params.get('room') : 'wizard');
    showTitle();
  } catch (e) {
    console.error(e);
    $('loadmsg').textContent = tr('loadFail');
  }
})();
