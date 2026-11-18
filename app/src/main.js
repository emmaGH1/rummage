import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ROOMS, DEFAULT_ROOM, TIME_OPTIONS } from './rooms.js';
import { buildRoom, loadArticulated, whenMeshesReady, movableParts, inkify, makeKey, addCavities } from './scene.js';
import { sfx } from './sfx.js';
import './style.css';

// ---------- renderer / camera ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d2a9e');
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.minDistance = 6;
controls.maxDistance = 16;
controls.minPolarAngle = 0.55;
controls.maxPolarAngle = 1.25;

scene.add(new THREE.HemisphereLight('#fff7e0', '#3040c0', 1.4));
const sun = new THREE.DirectionalLight('#ffffff', 2.2);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
sun.shadow.bias = -0.0005;
scene.add(sun);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // pull back on portrait screens so the whole room fits
  camera.fov = w / h < 1 ? 48 : 32;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------- state ----------
const params = new URLSearchParams(location.search);
const challenge = decodeChallenge(params.get('c'));
const roomId = challenge?.r || params.get('room') || DEFAULT_ROOM;
const room = ROOMS[roomId] || ROOMS[DEFAULT_ROOM];
const S = {
  mode: 'loading', // loading | menu | hide | ready | seek | result
  parts: [], // movable parts across all furniture
  byId: new Map(),
  spot: challenge?.s || null,
  timeLimit: challenge?.t ?? 120,
  opened: 0,
  openedIds: new Set(),
  t0: 0,
  elapsed: 0,
  hover: null,
  lastOpened: null,
};
const key = makeKey();
key.visible = false;
scene.add(key);

// ---------- load ----------
async function load() {
  buildRoom(scene, room.size);
  const [w, d] = room.size;
  camera.position.set(w * 1.05, w * 0.95, d * 1.3);
  controls.target.set(0, 0.7, -0.2);
  controls.update();
  resize();
  let done = 0;
  const bar = document.getElementById('loadbar');
  await Promise.all(
    room.items.map(async (it) => {
      const robot = await loadArticulated(it.slug);
      await whenMeshesReady(robot);
      inkify(robot);
      addCavities(robot);
      // sit on the floor, centred on its footprint
      const box = new THREE.Box3().setFromObject(robot);
      const c = box.getCenter(new THREE.Vector3());
      robot.position.set(-c.x, -box.min.y, -c.z);
      const holder = new THREE.Group();
      holder.add(robot);
      if (it.h) holder.scale.setScalar(it.h / (box.max.y - box.min.y));
      holder.position.set(it.x, 0, it.z);
      holder.rotation.y = THREE.MathUtils.degToRad(it.rot || 0);
      scene.add(holder);
      for (const p of movableParts(it.slug, robot)) {
        p.link = p.joint.children.find((c) => c.isURDFLink);
        fixDoorSwing(p, robot);
        p.link.traverse((o) => o.isMesh && (o.userData.part = p));
        S.parts.push(p);
        S.byId.set(p.id, p);
      }
      bar.style.width = `${(++done / room.items.length) * 100}%`;
    }),
  );
  scene.updateMatrixWorld(true);
  if (S.spot && !S.byId.has(S.spot)) S.spot = null;
  go(S.spot ? 'ready' : 'menu');
}

// Lux3D sometimes gives both doors of a pair the same swing sign, so one opens into the cabinet.
// For vertical-hinge doors, flip the open direction if opening moves the door toward the back (-z).
function fixDoorSwing(p, robot) {
  const ax = p.joint.axis;
  if (p.joint.jointType !== 'revolute' || Math.abs(ax.y) < 0.9) return;
  const centre = () => {
    robot.updateMatrixWorld(true);
    const c = new THREE.Box3().setFromObject(p.link).getCenter(new THREE.Vector3());
    return robot.worldToLocal(c);
  };
  const closed = centre();
  p.joint.setJointValue(p.open);
  const opened = centre();
  p.joint.setJointValue(0);
  if (opened.z < closed.z) p.open = -p.open;
}

// ---------- key placement ----------
function placeKey(part) {
  const childBox = new THREE.Box3().setFromObject(part.link);
  const parentBox = new THREE.Box3().setFromObject(part.joint.parent);
  const cc = childBox.getCenter(new THREE.Vector3());
  let host, local;
  if (part.joint.jointType === 'prismatic') {
    // inside the drawer, resting near its bottom; moves with the drawer
    const h = childBox.max.y - childBox.min.y;
    host = part.link;
    local = host.worldToLocal(new THREE.Vector3(cc.x, childBox.min.y + Math.min(0.05, h * 0.3), cc.z));
  } else {
    // behind the door / under the lid: halfway from the door's centre to the body's centre
    const pc = parentBox.getCenter(new THREE.Vector3());
    const p = cc.clone().lerp(pc, 0.5);
    p.y = Math.min(p.y, cc.y);
    host = part.joint.parent;
    local = host.worldToLocal(p);
  }
  host.add(key);
  key.position.copy(local);
  const s = 1 / host.getWorldScale(new THREE.Vector3()).x;
  key.scale.setScalar(s);
}

// ---------- interaction ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.userData.part);
  return hit ? hit.object.userData.part : null;
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
  if (['hide', 'seek'].includes(S.mode) && e.pointerType === 'mouse') setHover(pick(e));
});
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const p = pick(e);
  if (p) toggle(p);
});

function toggle(p) {
  if (!['hide', 'seek'].includes(S.mode)) return;
  if (S.mode === 'seek' && S.t0 === 0) startClock();
  const opening = p.target === 0;
  p.target = opening ? p.open : 0;
  sfx(opening ? (p.joint.jointType === 'prismatic' ? 'slide' : 'creak') : 'shut');
  if (opening) {
    S.lastOpened = p;
    if (S.mode === 'seek' && !S.openedIds.has(p.id)) {
      S.openedIds.add(p.id);
      S.opened++;
      hud();
    }
    if (S.mode === 'seek' && p.id === S.spot) setTimeout(() => found(), 450);
  } else if (S.lastOpened === p) {
    S.lastOpened = S.parts.find((q) => q.target !== 0) || null;
  }
  if (S.mode === 'hide') hideUI();
}

function closeAll(instant = false) {
  for (const p of S.parts) {
    p.target = 0;
    if (instant) p.joint.setJointValue((p.value = 0));
  }
}

// ---------- modes ----------
const $ = (id) => document.getElementById(id);
function show(id, on = true) { $(id).classList.toggle('hidden', !on); }
function go(mode) {
  S.mode = mode;
  ['loading', 'menu', 'hidebar', 'ready', 'hud', 'result'].forEach((id) => show(id, false));
  setHover(null);
  if (mode === 'menu') { show('menu'); key.visible = false; closeAll(); }
  if (mode === 'hide') { show('hidebar'); key.visible = false; closeAll(); S.lastOpened = null; hideUI(); }
  if (mode === 'ready') { show('ready'); closeAll(); key.visible = false; readyUI(); }
  if (mode === 'seek') {
    show('hud');
    S.opened = 0; S.openedIds.clear(); S.t0 = 0; S.elapsed = 0;
    closeAll(true);
    placeKey(S.byId.get(S.spot));
    key.visible = false;
    hud();
  }
  if (mode === 'result') show('result');
}

function hideUI() {
  $('hideBtn').disabled = !S.lastOpened;
  $('hideHint').textContent = S.lastOpened
    ? 'Nice spot. Pick a time limit, then hide the key here.'
    : 'Open a drawer, door or lid to choose a hiding spot.';
  renderChips('chipsHide');
}
function renderChips(id) {
  const el = $(id);
  el.innerHTML = '';
  for (const o of TIME_OPTIONS) {
    const b = document.createElement('button');
    b.className = 'chip' + (o.s === S.timeLimit ? ' on' : '');
    b.textContent = o.label;
    b.onclick = () => { S.timeLimit = o.s; sfx('tick'); renderChips(id); readyUI(); };
    el.appendChild(b);
  }
}
function readyUI() {
  const t = TIME_OPTIONS.find((o) => o.s === S.timeLimit)?.label || '∞';
  $('readyTime').textContent = S.timeLimit ? `${t} to find it` : 'No timer';
  $('readyCount').textContent = `${S.parts.length} things to open`;
}

$('hideStart').onclick = () => go('hide');
$('hideBtn').onclick = () => {
  if (!S.lastOpened) return;
  S.spot = S.lastOpened.id;
  placeKey(S.lastOpened);
  key.visible = true;
  sfx('drop');
  setTimeout(() => { key.visible = false; history.replaceState(null, '', shareUrl()); go('ready'); }, 900);
};
$('seekBtn').onclick = () => go('seek');
$('copyBtn').onclick = () => copyLink($('copyBtn'));
$('shareBtn').onclick = () => copyLink($('shareBtn'));
$('againBtn').onclick = () => go('ready');
$('newBtn').onclick = () => { history.replaceState(null, '', location.pathname); go('hide'); };
$('menuBtn').onclick = () => go('menu');

function startClock() { S.t0 = performance.now(); }
function found() {
  if (S.mode !== 'seek') return;
  S.mode = 'result';
  key.visible = true;
  key.userData.pop = performance.now();
  sfx('win');
  setTimeout(() => {
    $('resultTitle').textContent = 'Found it!';
    $('resultTime').textContent = fmt(S.elapsed);
    $('resultOpened').textContent = S.opened;
    go('result');
  }, 900);
}
function timeUp() {
  S.mode = 'result';
  const p = S.byId.get(S.spot);
  p.target = p.open;
  key.visible = true;
  key.userData.pop = performance.now();
  sfx('lose');
  setTimeout(() => {
    $('resultTitle').textContent = "Time's up!";
    $('resultTime').textContent = fmt(S.timeLimit);
    $('resultOpened').textContent = S.opened;
    go('result');
  }, 1200);
}
function hud() {
  $('opened').textContent = `Opened: ${S.opened}`;
  const left = S.timeLimit ? Math.max(0, S.timeLimit - S.elapsed) : S.elapsed;
  $('timer').textContent = fmt(left);
  $('timer').classList.toggle('urgent', !!S.timeLimit && left <= 10);
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------- share ----------
function encodeChallenge(o) { return btoa(JSON.stringify(o)).split('').reverse().join(''); }
function decodeChallenge(c) {
  try { return c ? JSON.parse(atob(c.split('').reverse().join(''))) : null; } catch { return null; }
}
function shareUrl() {
  return `${location.origin}${location.pathname}?c=${encodeURIComponent(encodeChallenge({ r: roomId, s: S.spot, t: S.timeLimit }))}`;
}
async function copyLink(btn) {
  const url = shareUrl();
  try { await navigator.clipboard.writeText(url); btn.textContent = 'Link copied!'; }
  catch { prompt('Copy this challenge link', url); }
  setTimeout(() => (btn.textContent = btn.dataset.label), 1600);
}

// ---------- loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  for (const p of S.parts) {
    if (p.value !== p.target) {
      const step = (p.joint.jointType === 'prismatic' ? 1.6 : 4.2) * Math.abs(p.open) * dt;
      p.value = Math.abs(p.target - p.value) <= step ? p.target : p.value + Math.sign(p.target - p.value) * step;
      p.joint.setJointValue(p.value);
    }
  }
  if (S.mode === 'seek') {
    if (S.t0) S.elapsed = (performance.now() - S.t0) / 1000;
    hud();
    if (S.timeLimit && S.elapsed >= S.timeLimit) timeUp();
  }
  if (key.visible && key.userData.pop) {
    const t = (performance.now() - key.userData.pop) / 1000;
    key.userData.glow.intensity = 3 + Math.sin(t * 6) * 1.5;
    key.rotation.z = t * 2.5;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
window.__rummage = { S, camera, controls, scene, go, toggle };
frame();
load().catch((e) => {
  console.error(e);
  $('loadmsg').textContent = 'Could not load the room. Please refresh.';
});
