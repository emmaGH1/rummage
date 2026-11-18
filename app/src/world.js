import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { ROOMS, THEMES } from './rooms.js';
import { buildRoom, loadArticulated, whenMeshesReady, movableParts, inkify, addCavities } from './scene.js';

const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map(); // slug -> Promise<robot> (cloned per room load is unnecessary: one room at a time)

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

function place(holder, obj, it) {
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -box.min.y, -c.z);
  holder.add(obj);
  if (it.h) holder.scale.setScalar(it.h / (box.max.y - box.min.y));
  holder.position.set(it.x, it.y || 0, it.z); // y lets small pieces sit on tables/counters
  holder.rotation.y = THREE.MathUtils.degToRad(it.rot || 0);
}

async function loadPiece(slug) {
  if (!cache.has(slug)) {
    cache.set(slug, (async () => {
      const robot = await loadArticulated(slug);
      await whenMeshesReady(robot);
      inkify(robot);
      addCavities(robot);
      return robot;
    })());
  }
  return cache.get(slug);
}

export async function loadRoom(scene, roomId, onProgress = () => {}) {
  const room = ROOMS[roomId];
  const theme = THEMES[room.theme] || THEMES.wizard;
  const group = new THREE.Group();
  scene.add(group);
  scene.background = new THREE.Color(theme.bg);
  const shell = buildRoom(group, room.size, theme);
  const world = { roomId, room, theme, group, shell, pieces: [], parts: [], byId: new Map() };
  const props = room.props || [];
  const total = room.items.length + props.length;
  let done = 0;
  await Promise.all([
    ...room.items.map(async (it) => {
      let robot;
      try {
        robot = await loadPiece(it.slug);
      } catch (e) {
        // a missing or broken model should cost one piece, not the whole room
        console.warn('piece failed to load', it.slug, e);
        cache.delete(it.slug);
        onProgress(++done / total);
        return;
      }
      // reset joints in case this robot was used in an earlier run
      Object.values(robot.joints).forEach((j) => j.jointType !== 'fixed' && j.setJointValue(0));
      const holder = new THREE.Group();
      holder.name = it.slug;
      place(holder, robot, it);
      group.add(holder);
      const piece = { slug: it.slug, holder, robot, parts: [] };
      for (const p of movableParts(it.slug, robot)) {
        p.link = p.joint.children.find((c) => c.isURDFLink);
        p.piece = piece;
        fixDoorSwing(p, robot);
        p.link.traverse((o) => o.isMesh && (o.userData.part = p));
        piece.parts.push(p);
        world.parts.push(p);
        world.byId.set(p.id, p);
      }
      // clicking the body of a piece targets its first part (handy on touch screens)
      robot.traverse((o) => o.isMesh && !o.userData.part && (o.userData.piece = piece));
      world.pieces.push(piece);
      onProgress(++done / total);
    }),
    ...props.map(async (it) => {
      try {
        const g = await gltf.loadAsync(`${import.meta.env.BASE_URL}props/${it.slug}.glb`);
        inkify(g.scene);
        const holder = new THREE.Group();
        place(holder, g.scene, it);
        group.add(holder);
      } catch (e) {
        console.warn('prop failed', it.slug, e);
      }
      onProgress(++done / total);
    }),
  ]);
  // stable order so seeded runs reproduce
  world.parts.sort((a, b) => a.id.localeCompare(b.id));
  world.pieces.sort((a, b) => a.slug.localeCompare(b.slug));
  group.updateMatrixWorld(true);
  return world;
}

export function unloadRoom(scene, world) {
  if (!world) return;
  // robots are cached and reused, so detach them before disposing the room shell
  for (const pc of world.pieces) pc.holder.remove(pc.robot);
  scene.remove(world.group);
  world.shell.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      [].concat(o.material).forEach((m) => m.dispose?.());
    }
  });
}
