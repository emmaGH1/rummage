import * as THREE from 'three';
import { toon, inkify } from './scene.js';

// Chunky primitive items, styled to match the Comic Ink furniture.
function finish(g, thickness = 0.006) {
  inkify(g, { thickness });
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

export function makeKey(color = '#ffc82e', size = 1) {
  const gold = toon(color);
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
  k.scale.setScalar(size);
  finish(k);
  const glow = new THREE.PointLight(color, 0, 1.2);
  k.add(glow);
  k.userData.glow = glow;
  return k;
}

// the small key that opens padlocked furniture
export const makeLockKey = () => makeKey('#9fd8ff', 0.7);

export function makePadlock() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.06), toon('#ffc82e'));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 8, 16, Math.PI), toon('#c8c8d8'));
  shackle.position.y = 0.065;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 10), toon('#14121f'));
  hole.rotation.x = Math.PI / 2;
  g.add(body, shackle, hole);
  return finish(g, 0.008);
}

const DECOYS = {
  coins: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16), toon('#ffc82e'));
      c.position.set((i % 2) * 0.05 - 0.025, i * 0.012, (i > 1 ? 0.03 : 0) - 0.015);
      g.add(c);
    }
    return g;
  },
  bottle: () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), toon('#2fbf71'));
    b.position.y = 0.06;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.05, 10), toon('#2fbf71'));
    n.position.y = 0.145;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 10), toon('#a0522d'));
    cork.position.y = 0.18;
    g.add(b, n, cork);
    g.rotation.z = Math.PI / 2;
    return g;
  },
  sock: () => {
    const g = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.12), toon('#f0542a'));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.05), toon('#f0542a'));
    foot.position.set(0.02, 0, 0.07);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.032, 0.02), toon('#fff6e6'));
    stripe.position.z = -0.03;
    g.add(leg, foot, stripe);
    return g;
  },
  teacup: () => {
    const g = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.032, 0.05, 14), toon('#fff6e6'));
    cup.position.y = 0.025;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), toon('#fff6e6'));
    handle.position.set(0.05, 0.03, 0);
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.008, 16), toon('#5bc0eb'));
    g.add(cup, handle, saucer);
    return g;
  },
  spoon: () => {
    const g = new THREE.Group();
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.016), toon('#c8c8d8'));
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), toon('#c8c8d8'));
    bowl.scale.y = 0.35;
    bowl.position.x = 0.07;
    g.add(h, bowl);
    return g;
  },
};
export const DECOY_LINES = {
  coins: 'Shiny… but just coins.',
  bottle: 'An empty bottle. Nope!',
  sock: 'A single sock. Gross.',
  teacup: 'A teacup. Not a key.',
  spoon: 'A spoon. Keep looking!',
};
export const DECOY_TYPES = Object.keys(DECOYS);
export function makeDecoy(type) {
  const g = DECOYS[type]();
  g.userData.decoy = type;
  return finish(g);
}
