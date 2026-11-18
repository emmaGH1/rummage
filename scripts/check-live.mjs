// scripts/check-live.mjs: re-checks Rummage's live claims against the public sites. No install, no account, no money.
// Node 20+:  node scripts/check-live.mjs        (expected last line: "8 of 8 passed.")
const LIVE = process.env.RUMMAGE_URL || 'https://rummage-game.vercel.app';
const STUDIO = 'https://www.modelscope.ai/studios/heisemma/rummage';
const get = async (url, as = 'text') => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → status ${r.status}`);
  return as === 'json' ? r.json() : as === 'buf' ? new Uint8Array(await r.arrayBuffer()) : r.text();
};
let manifest, html;
const checks = [
  {
    claim: 'the live game answers (no login, no install)',
    run: async () => { html = await get(`${LIVE}/`); if (!html.includes('<title>Rummage')) throw new Error('title missing'); },
  },
  {
    claim: 'the ModelScope Studio page answers',
    run: async () => { await get(STUDIO); },
  },
  {
    claim: 'the live game ships 55 Lux3D pieces with 107 joints (60 revolute, 47 prismatic)',
    run: async () => {
      manifest = await get(`${LIVE}/lux3d-manifest.json`, 'json');
      const joints = manifest.pieces.flatMap((p) => p.joints);
      const rev = joints.filter((j) => j.type === 'revolute').length, pri = joints.filter((j) => j.type === 'prismatic').length;
      if (manifest.pieces.length !== 55 || joints.length !== 107 || rev !== 60 || pri !== 47)
        throw new Error(`${manifest.pieces.length} pieces, ${joints.length} joints (${rev} revolute, ${pri} prismatic)`);
    },
  },
  {
    claim: 'every piece has a Lux3D articulation task id and a text-to-3D prompt and motion prompt',
    run: async () => {
      const bad = manifest.pieces.filter((p) => !p.timings?.articulate?.task || !p.prompt || !p.motion).map((p) => p.slug);
      if (bad.length) throw new Error(`missing for ${bad.join(', ')}`);
    },
  },
  {
    claim: "every one of the 107 joints is read from Lux3D's own URDF on the live site (name and type match)",
    run: async () => {
      let n = 0;
      for (const p of manifest.pieces) {
        const urdf = await get(`${LIVE}/models/${p.slug}/robot.urdf`);
        for (const j of p.joints) {
          if (!new RegExp(`<joint name="${j.name}" type="${j.type}"`).test(urdf)) throw new Error(`${p.slug}: ${j.name} (${j.type}) not in URDF`);
          n++;
        }
      }
      if (n !== 107) throw new Error(`checked ${n}`);
    },
  },
  {
    claim: 'each moving part is its own GLB from Lux3D (e.g. the wizard chest of drawers: body + 3 drawers)',
    run: async () => {
      for (const part of ['body', 'drawer_top', 'drawer_middle', 'drawer_bottom']) {
        const b = await get(`${LIVE}/models/w-drawers/meshes/${part}.glb`, 'buf');
        if (String.fromCharCode(...b.slice(0, 4)) !== 'glTF') throw new Error(`${part}.glb is not a GLB`);
      }
    },
  },
  {
    claim: 'the public build makes no Lux3D API calls and holds no API key (pre-generated assets only)',
    run: async () => {
      const js = html.match(/assets\/index-[^"]+\.js/)?.[0];
      const code = await get(`${LIVE}/${js}`);
      for (const bad of ['api.aholo.ai', 'Authorization', 'x-api-key', 'sk-']) if (code.includes(bad)) throw new Error(`bundle contains "${bad}"`);
    },
  },
  {
    claim: 'the live game is bilingual (English + Simplified Chinese)',
    run: async () => {
      const js = html.match(/assets\/index-[^"]+\.js/)?.[0];
      const code = await get(`${LIVE}/${js}`);
      if (!code.includes('巫师的书房') || !code.includes("The Wizard's Study")) throw new Error('translations missing');
    },
  },
];
let passed = 0;
for (const c of checks) {
  try { await c.run(); passed++; console.log(`PASS  ${c.claim}`); }
  catch (e) { console.log(`FAIL  ${c.claim}: ${e.message}`); }
}
console.log(`\n${passed} of ${checks.length} passed.`);
process.exit(passed === checks.length ? 0 : 1);
