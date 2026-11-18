// Capture the screenshots used by the project report into docs/report/img/.
// Usage: node tools/report_shots.mjs [baseUrl]   (needs the preview server running)
import puppeteer from '../app/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { copyFileSync, mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173/';
const out = new URL('../docs/report/img/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1600,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const snap = (name) => page.screenshot({ path: `${out}${name}.png` });
const ev = (fn, ...a) => page.evaluate(fn, ...a);

await page.goto(base, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForFunction(() => window.__rummage?.S.mode === 'title', { timeout: 90000 });

// rooms, each with a few things open
for (const room of ['wizard', 'pirate', 'kitchen', 'workshop', 'library']) {
  await ev(async (room) => {
    const R = window.__rummage;
    await R.startLevel(R.levels.find((l) => l.room === room), 7);
    R.beginPlay();
    R.world.parts.forEach((p, i) => { if (i % 3 === 1) R.toggle(p); });
  }, room);
  await wait(2500);
  await snap(`room-${room}`);
}
// everything open in the wizard study
await ev(async () => { const R = window.__rummage; await R.startLevel(R.levels[0], 2); R.beginPlay(); R.world.parts.forEach((p) => (p.target = p.open)); });
await wait(2500);
await snap('open-all');
// hurry: 4 seconds left
await ev(async () => { const R = window.__rummage; await R.startLevel(R.levels[1], 4); R.beginPlay(); R.S.run.t0 -= (R.S.run.time - 4) * 1000; });
await wait(900);
await snap('hurry');
// result screen
await ev(async () => { const R = window.__rummage; await R.startLevel(R.levels[0], 3); R.beginPlay(); const k = R.items().find((i) => i.kind === 'key'); R.toggle(k.part); });
await wait(3500);
await snap('result');
// map
await page.evaluate(() => document.getElementById('mapBtn').click());
await wait(1500);
await snap('map');
// lux panel with a demoed piece
await page.evaluate(() => document.getElementById('mapLuxBtn').click());
await wait(1200);
await page.evaluate(() => document.querySelectorAll('.lux-card')[2]?.click());
await wait(2500);
await snap('lux-panel');
await page.evaluate(() => document.getElementById('luxClose').click());
await wait(600);
// night level with the flashlight, then a secret spot opened (wizard study, picture + floorboard)
await ev(async () => { const R = window.__rummage; await R.startLevel(R.levels.find((l) => l.id === 6), 1); R.beginPlay(); });
await wait(1500);
await page.mouse.move(560, 420);
await wait(1200);
await snap('night');
await ev(async () => { const R = window.__rummage; await R.startLevel(R.levels[0], 5); R.beginPlay(); R.world.parts.filter((p) => p.secret).forEach((p) => (p.target = p.open)); });
await wait(2500);
await snap('secret');
// title screen with the logo
await page.goto(base, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__rummage?.S.mode === 'title', { timeout: 90000 });
await wait(1500);
await snap('title');
// photoreal capability test room vs cartoon
await page.goto(`${base}?room=test`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__rummage?.S.mode === 'title', { timeout: 90000 });
await ev(() => { const R = window.__rummage; R.S.mode = 'hide'; document.getElementById('title').classList.add('hidden'); R.world.parts.forEach((p) => (p.target = p.open)); });
await wait(2500);
await snap('iter-photoreal');
await page.goto(`${base}?room=wizard`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__rummage?.S.mode === 'title', { timeout: 90000 });
await ev(() => { const R = window.__rummage; R.S.mode = 'hide'; document.getElementById('title').classList.add('hidden'); R.world.parts.forEach((p) => (p.target = p.open)); });
await wait(2500);
await snap('iter-cartoon');
await browser.close();

// concept mockups
const root = new URL('../', import.meta.url).pathname;
copyFileSync(`${root}docs/concept/seek-toy-like-diorama.png`, `${out}concept-r1.png`);
copyFileSync(`${root}docs/concept/round2/02-ink-wizard-study.png`, `${out}concept-r2.png`);
copyFileSync(`${root}docs/logo/01-key-wordmark.png`, `${out}logo.png`);
console.log('report screenshots ->', out);
