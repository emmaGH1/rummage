// Print where every key, brass key, decoy and mimic lands in levels 5-10 for a fixed seed (used for docs/KEY-SHEET.md).
// Usage: node tools/key_sheet.mjs [baseUrl] [seed=1]   (needs the preview server running)
import puppeteer from '../app/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto((process.argv[2] || 'http://localhost:4173/') + '', { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForFunction(() => window.__rummage?.S.mode === 'title', { timeout: 90000 });
const SEED = process.argv[3] || '1';
const out = await page.evaluate(async (SEED) => {
  const R = window.__rummage; const T = R.camera.position.constructor; 
  const B = function () { this.min = new T(1e9,1e9,1e9); this.max = new T(-1e9,-1e9,-1e9); };
  B.prototype.setFromObject = function (o) { o.updateMatrixWorld(true); o.traverse((m) => { if (!m.isMesh) return; m.geometry.computeBoundingBox(); const g = m.geometry.boundingBox;
    for (const x of [g.min.x,g.max.x]) for (const y of [g.min.y,g.max.y]) for (const z of [g.min.z,g.max.z]) { const v = new T(x,y,z).applyMatrix4(m.matrixWorld); this.min.min(v); this.max.max(v); } }); return this; };
  B.prototype.getCenter = function (v) { return v.copy(this.min).add(this.max).multiplyScalar(0.5); };
  const res = [];
  for (const lv of R.levels.filter((l) => l.id >= 5)) {
    await R.startLevel(lv, Number(SEED));
    const W = R.world;
    const desc = (p) => {
      const b = new B().setFromObject(p.link); const c = b.getCenter(new T());
      const pb = new B().setFromObject(p.piece.robot); 
      const sibs = p.piece.parts.length;
      return { slug: p.piece.slug, id: p.id, joint: p.joint.name, type: p.joint.jointType, nParts: sibs,
        rel: [((c.x - pb.min.x) / (pb.max.x - pb.min.x)).toFixed(2), ((c.y - pb.min.y) / (pb.max.y - pb.min.y)).toFixed(2)], y: c.y.toFixed(2), locked: !!p.piece.locked };
    };
    res.push({ id: lv.id, items: R.items().map((it) => ({ kind: it.kind, ...desc(it.part) })),
      mimics: [...R.S.run.mimics].map(desc), riddle: R.S.run.riddle });
  }
  return res;
}, SEED);
console.log(JSON.stringify(out, null, 1));
await browser.close();
