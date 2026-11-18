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
      let n = 0;
      Object.values(robot.links).forEach((l) => {
        let has = false;
        l.traverse((o) => (has ||= o.isMesh));
        if (has) n++;
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
export function buildRoom(scene, [w, d]) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), toon('#2a3ab8'));
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  const wallMat = toon('#2f45d6');
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, d), wallMat);
  wallL.position.set(-w / 2 - 0.07, 1.6, 0);
  const wallB = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 3.2, 0.14), wallMat);
  wallB.position.set(-0.07, 1.6, -d / 2 - 0.07);
  wallL.receiveShadow = wallB.receiveShadow = true;
  // rug: orange slab with a white inset border
  const rug = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.02, d * 0.45), toon('#f0542a'));
  rug.position.set(0.3, 0.01, 0.6);
  const border = new THREE.Mesh(new THREE.BoxGeometry(w * 0.47, 0.022, d * 0.37), toon('#fff6e6'));
  border.position.copy(rug.position);
  const rugIn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.024, d * 0.35), toon('#f0542a'));
  rugIn.position.copy(rug.position);
  // skirting lines
  const skirtMat = toon('#1b2580');
  const skL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, d), skirtMat);
  skL.position.set(-w / 2 + 0.01, 0.09, 0);
  const skB = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 0.02), skirtMat);
  skB.position.set(0, 0.09, -d / 2 + 0.01);
  g.add(floor, wallL, wallB, rug, border, rugIn, skL, skB);
  inkify(g, { thickness: 0.02 });
  scene.add(g);
  return g;
}

// A simple chunky key built from primitives, used until a Lux3D key asset replaces it.
export function makeKey() {
  const gold = toon('#ffc82e');
  const k = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.016, 10, 24), gold);
  ring.position.x = -0.07;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.022), gold);
  shaft.position.x = 0.02;
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.04, 0.022), gold);
  t1.position.set(0.06, -0.028, 0);
  const t2 = t1.clone();
  t2.position.x = 0.035;
  k.add(ring, shaft, t1, t2);
  k.rotation.x = -Math.PI / 2;
  inkify(k, { thickness: 0.006 });
  const glow = new THREE.PointLight('#ffd75e', 0, 1.2);
  k.add(glow);
  k.userData.glow = glow;
  return k;
}

// Generated bodies are exterior shells: once a door/lid/drawer is cut out there is no inside.
// Add a dark inner box (rendered back-face only) to each parent link so openings reveal a cavity.
const cavityMat = new THREE.MeshBasicMaterial({ color: '#231a4a', side: THREE.BackSide });
export function addCavities(robot) {
  const parents = new Set(
    Object.values(robot.joints).filter((j) => j.jointType !== 'fixed').map((j) => j.parent),
  );
  robot.updateMatrixWorld(true);
  for (const link of parents) {
    const inv = new THREE.Matrix4().copy(link.matrixWorld).invert();
    const box = new THREE.Box3();
    link.traverse((o) => {
      if (!o.isMesh || o.userData.isOutline) return;
      // only this link's own meshes, not child links
      let p = o.parent;
      while (p && !p.isURDFLink) p = p.parent;
      if (p !== link) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      box.union(b);
    });
    if (box.isEmpty()) continue;
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(0.94);
    const cav = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), cavityMat);
    box.getCenter(cav.position);
    cav.raycast = () => {};
    link.add(cav);
  }
}
