// Automated playtest: for each story level whose room exists, start a seeded run and open parts until
// every key is found. Checks the run ends in a win, no joint goes NaN, and the page logs no errors.
// Usage: node tools/playtest.mjs [baseUrl]   (default http://localhost:4173/)
import puppeteer from '../app/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';

const base = process.argv[2] || 'http://localhost:4173/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, protocolTimeout: 0,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/favicon|404/.test(m.text()) && errors.push(m.text()));
await page.goto(base, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForFunction(() => window.__rummage?.S.mode === 'title', { timeout: 90000 });

const results = await page.evaluate(async () => {
  const R = window.__rummage;
  const { LEVELS } = await import(new URL('src/levels.js', location.href).href).catch(() => ({ LEVELS: null }));
  const levels = LEVELS || R.levels;
  const { ROOMS } = R;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  for (const level of levels) {
    if (!ROOMS[level.room]) { out.push({ level: level.id, skipped: 'room not built' }); continue; }
    await R.startLevel(level, 1234 + level.id);
    R.beginPlay();
    // brute force: open every part in id order (the brass key unlocks padlocked pieces along the way)
    for (let pass = 0; pass < 3 && R.S.mode === 'play'; pass++) {
      for (const p of R.world.parts) {
        if (R.S.mode !== 'play') break;
        if (p.target === 0) { R.toggle(p); await wait(520); }
      }
    }
    await wait(1600);
    out.push({
      level: level.id,
      room: level.room,
      parts: R.world.parts.length,
      result: R.S.mode,
      keys: `${R.S.run.keysFound}/${R.S.run.keysTotal}`,
      opened: R.S.run.opened,
      nan: R.world.parts.filter((p) => !Number.isFinite(p.value)).length,
    });
  }
  return out;
});
console.table(results);
if (errors.length) console.log('page errors:', errors.slice(0, 10));
const bad = results.filter((r) => !r.skipped && (r.result !== 'result' || r.nan || r.keys.split('/')[0] !== r.keys.split('/')[1]));
await browser.close();
process.exit(bad.length || errors.length ? 1 : 0);
