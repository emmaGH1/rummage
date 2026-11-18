// Reduce triangle counts of Lux3D part GLBs for real-time play on phones.
// Drops normals (recomputed at load), welds, simplifies with meshoptimizer, re-compresses with meshopt.
// Usage (from app/): node scripts/simplify.mjs ratio file.glb [file.glb...]   (files are rewritten in place)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize, weld, simplify, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [ratio, ...files] = process.argv.slice(2);
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
for (const f of files) {
  const doc = await io.read(f);
  let before = 0, after = 0;
  const count = () => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
  await doc.transform(dequantize());
  before = count();
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) p.setAttribute('NORMAL', null);
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: 0.004 }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  after = count();
  await io.write(f, doc);
  console.log(`${f.split('/').slice(-3).join('/')}: ${Math.round(before)} -> ${Math.round(after)} tris`);
}
