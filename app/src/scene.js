import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import URDFLoader from 'urdf-loader';

export const INK = '#14121f';

// --- comic-ink look ---------------------------------------------------------
const gradient = (() => {
  const data = new Uint8Array([70, 70, 70, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

export function toon(color, map = null) {
  return new THREE.MeshToonMaterial({ color, map, gradientMap: gradient });
}

const outlineMat = new THREE.ShaderMaterial({
  uniforms: { thickness: { value: 0.016 }, color: { value: new THREE.Color(INK) } },
  vertexShader: `uniform float thickness;
    void main(){ vec3 p = position + normal * thickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
  fragmentShader: `uniform vec3 color; void main(){ gl_FragColor = vec4(color,1.0); }`,
  side: THREE.BackSide,
});

export function inkify(root, { outline = true, thickness } = {}) {
  const meshes = [];
  root.traverse((o) => o.isMesh && !o.userData.isOutline && meshes.push(o));
  for (const m of meshes) {
    const src = Array.isArray(m.material) ? m.material : [m.material];
    const mats = src.map((s) => {
      const t = toon(s.color ? s.color.clone() : 0xffffff, s.map || null);
      t.side = THREE.DoubleSide; // generated shells are open inside; show their inner faces
      return t;
    });
    m.material = Array.isArray(m.material) ? mats : mats[0];
    m.castShadow = m.receiveShadow = true;
    if (outline && m.geometry.attributes.normal) {
      const mat = thickness ? outlineMat.clone() : outlineMat;
      if (thickness) mat.uniforms.thickness.value = thickness;
      const o = new THREE.Mesh(m.geometry, mat);
      o.userData.isOutline = true;
      o.raycast = () => {};
      m.add(o);
    }
  }
}

// --- loading Lux3D articulated models ---------------------------------------
const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export function loadArticulated(slug) {
  return new Promise((resolve, reject) => {
    const loader = new URDFLoader();
    loader.parseCollision = false;
    loader.loadMeshCb = (path, _m, done) =>
      gltf.load(path, (g) => done(g.scene), undefined, (e) => done(null, e));
    loader.load(`${import.meta.env.BASE_URL}models/${slug}/robot.urdf`, resolve, undefined, reject);
  });
}

// Wait until every mesh inside a URDF robot is attached (urdf-loader loads meshes async).
export function whenMeshesReady(robot, timeoutMs = 20000) {
  const expected = Object.values(robot.links).filter((l) => l.children.some((c) => c.isURDFVisual)).length;
  return new Promise((resolve) => {
    const t0 = performance.now();
    (function poll() {
      // count links whose OWN visual has its mesh (not meshes of child links further down the tree)
      let n = 0;
      Object.values(robot.links).forEach((l) => {
        const vis = l.children.filter((c) => c.isURDFVisual);
        if (vis.length && vis.every((v) => { let has = false; v.traverse((o) => (has ||= o.isMesh)); return has; })) n++;
      });
      if (n >= expected || performance.now() - t0 > timeoutMs) resolve();
      else setTimeout(poll, 80);
    })();
  });
}

// Movable parts = non-fixed joints. "open" target = the limit furthest from 0.
export function movableParts(slug, robot) {
  return Object.values(robot.joints)
    .filter((j) => j.jointType === 'prismatic' || j.jointType === 'revolute')
    .map((j) => {
      const lo = Number(j.limit.lower), hi = Number(j.limit.upper);
      const open = Math.abs(hi) >= Math.abs(lo) ? hi : lo;
      j.ignoreLimits = true; // we drive joints between 0 and `open` ourselves (open may be flipped)
      return { id: `${slug}:${j.name}`, slug, joint: j, open, value: 0, target: 0, opened: false };
    });
}

// --- the room ---------------------------------------------------------------
export function buildRoom(scene, [w, d], t) {
  const g = new THREE.Group();
  const box = (sx, sy, sz, color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), toon(color));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const H = 3.2;
  box(w, 0.12, d, t.floor, 0, -0.06, 0);
  box(0.14, H, d, t.wall, -w / 2 - 0.07, H / 2, 0);
  box(w + 0.14, H, 0.14, t.wall, -0.07, H / 2, -d / 2 - 0.07);
  // floorboards: thin ink lines across the floor
  for (let i = 1; i < Math.floor(d / 0.5); i++) box(w, 0.005, 0.015, t.skirt, 0, 0.002, -d / 2 + i * 0.5);
  // rug with an inset border
  const rx = 0.3, rz = 0.6;
  box(w * 0.5, 0.02, d * 0.42, t.rug, rx, 0.01, rz);
  box(w * 0.43, 0.022, d * 0.35, t.rugBorder, rx, 0.011, rz);
  box(w * 0.41, 0.024, d * 0.33, t.rug, rx, 0.012, rz);
  // skirting
  box(0.03, 0.2, d, t.skirt, -w / 2 + 0.015, 0.1, 0);
  box(w, 0.2, 0.03, t.skirt, 0, 0.1, -d / 2 + 0.015);
  // wall decor on the back wall, right of centre
  const dz = -d / 2 + 0.02;
  if (t.decor === 'window') {
    box(1.3, 1.1, 0.04, '#14121f', 1.4, 2.1, dz);
    box(1.2, 1.0, 0.05, '#8fd3ff', 1.4, 2.1, dz + 0.005);
    box(0.06, 1.0, 0.07, '#fff6e6', 1.4, 2.1, dz + 0.01);
    box(1.2, 0.06, 0.07, '#fff6e6', 1.4, 2.1, dz + 0.01);
    box(1.4, 0.08, 0.16, '#fff6e6', 1.4, 1.56, dz + 0.06);
  } else if (t.decor === 'porthole') {
    for (const px of [0.9, 2.0]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 12, 32), toon('#ffd23f'));
      ring.position.set(px, 2.0, dz + 0.04);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32), toon('#7fe3ff'));
      glass.position.set(px, 2.0, dz + 0.03);
      g.add(ring, glass);
    }
  } else if (t.decor === 'pegboard') {
    box(1.8, 1.0, 0.04, '#f2c14e', 1.2, 2.0, dz);
    for (let i = 0; i < 9; i++)
      for (let j = 0; j < 5; j++) box(0.04, 0.04, 0.05, '#7a2414', 0.45 + i * 0.19, 1.62 + j * 0.19, dz + 0.01);
  }
  // left-wall picture frame with a bold zigzag (Comic Ink flourish)
  const az = t.artZ ?? -0.6; // left-wall picture position, per theme so tall furniture doesn't cover it
  box(0.04, 0.9, 1.1, '#14121f', -w / 2 + 0.02, 2.0, az);
  box(0.05, 0.8, 1.0, t.rugBorder, -w / 2 + 0.03, 2.0, az);
  const zig = new THREE.Shape();
  zig.moveTo(-0.12, 0.3); zig.lineTo(0.1, 0.3); zig.lineTo(0, 0.05); zig.lineTo(0.14, 0.05);
  zig.lineTo(-0.1, -0.32); zig.lineTo(0, -0.05); zig.lineTo(-0.14, -0.05); zig.closePath();
  const bolt = new THREE.Mesh(new THREE.ExtrudeGeometry(zig, { depth: 0.02, bevelEnabled: false }), toon(t.rug));
  bolt.rotation.y = Math.PI / 2;
  bolt.position.set(-w / 2 + 0.06, 2.0, az);
  bolt.scale.setScalar(1.4);
  g.add(bolt);
  inkify(g, { thickness: 0.015 });
  scene.add(g);
  return g;
}

// Generated bodies are exterior shells: once a door/lid/drawer is cut out there is no inside.
// Give each parent link a dark inner skin: a slightly shrunken copy of its own shell rendered back-face only.
// Because it matches the body's shape it never pokes out; through an opening you see a dark interior.
const cavityMat = new THREE.MeshBasicMaterial({ color: '#231a4a', side: THREE.BackSide });
export function addCavities(robot) {
  const parents = new Set(
    Object.values(robot.joints).filter((j) => j.jointType !== 'fixed').map((j) => j.parent),
  );
  for (const link of parents) {
    const skins = [];
    link.traverse((o) => {
      if (!o.isMesh || o.userData.isOutline || o.userData.isCavity) return;
      let p = o.parent;
      while (p && !p.isURDFLink) p = p.parent;
      if (p !== link) return; // only this link's own meshes, not child links
      o.geometry.computeBoundingBox();
      const c = o.geometry.boundingBox.getCenter(new THREE.Vector3());
      const k = 0.94;
      const skin = new THREE.Mesh(o.geometry, cavityMat);
      skin.scale.setScalar(k);
      skin.position.copy(c).multiplyScalar(1 - k);
      skin.userData.isCavity = true;
      skin.raycast = () => {};
      skins.push([o, skin]);
    });
    skins.forEach(([o, skin]) => o.add(skin));
    link.userData.cavity = { set visible(v) { skins.forEach(([, s]) => (s.visible = v)); } };
  }
}
