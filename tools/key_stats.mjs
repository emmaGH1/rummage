// Count where keys land over many seeds, per level (placement fairness check).
// Usage: node tools/key_stats.mjs [baseUrl] [runs=200]
import puppeteer from '../app/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const base = process.argv[2] || 'http://localhost:4173/';
const N = Number(process.argv[3] || 200);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto(base, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForFunction(() => window.__rummage?.S.mode === 'title', { timeout: 90000 });
const out = await page.evaluate(async (N) => {
  const R = window.__rummage; const res = [];
  for (const lv of R.levels) {
    await R.startLevel(lv, 1);
    const count = {}; const spots = R.world.parts.length;
    for (let s = 0; s < N; s++) {
      R.setupLevel(lv, 1000 + s);
      for (const it of R.items()) if (it.kind === 'key') count[it.part.id] = (count[it.part.id] || 0) + 1;
    }
    const top = Object.entries(count).sort((a, b) => b[1] - a[1]);
    res.push({ level: lv.id, keys: lv.keys, spots, used: top.length,
      top: top.slice(0, 5).map(([id, c]) => `${id} ${Math.round((100 * c) / N)}%`) });
  }
  return res;
}, N);
for (const r of out) console.log(`L${r.level} keys=${r.keys} spots=${r.spots} spotsEverUsed=${r.used} | ${r.top.join(' | ')}`);
await browser.close();
