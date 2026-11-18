// Record real game footage for the demo video, frame by frame on a virtual clock.
// The VM has no GPU, so a live screen recording stutters; instead we freeze the game's clock
// (performance.now, requestAnimationFrame, setTimeout, CSS animations), step it 1/30 s at a time,
// and screenshot every frame. Each shot also logs which game sounds played when (for the soundtrack).
// Usage: node tools/video/capture.mjs [baseUrl] [shot names...]   (preview server must be running)
import puppeteer from '../../app/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SHOTS } from './shots.mjs';

const base = process.argv[2] || 'http://localhost:4173/';
const only = process.argv.slice(3);
const OUT = new URL('../../video/assets/footage/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const FPS = 30, W = 1920, H = 1080;

// installed before the game's scripts run
const VIRTUAL_CLOCK = () => {
  const realNow = performance.now.bind(performance);
  const realRAF = window.requestAnimationFrame.bind(window);
  const realST = window.setTimeout.bind(window);
  const realCT = window.clearTimeout.bind(window);
  let on = false, T = 0, tid = 1e7, rafQ = [], timers = [];
  performance.now = () => (on ? T : realNow());
  window.requestAnimationFrame = (cb) => { if (!on) return realRAF(cb); rafQ.push(cb); return rafQ.length; };
  window.setTimeout = (fn, ms = 0, ...a) => {
    if (!on) return realST(fn, ms, ...a);
    const id = ++tid; timers.push({ id, at: T + ms, fn: () => fn(...a) }); return id;
  };
  window.clearTimeout = (id) => { timers = timers.filter((t) => t.id !== id); realCT(id); };
  const log = [];
  window.__sfxLog = (name) => on && log.push([T, name]);
  window.__virt = {
    async start() { T = realNow(); on = true; log.length = 0; await new Promise((r) => realST(r, 120)); this.t0 = T; },
    stop() { on = false; const q = rafQ; rafQ = []; q.forEach((cb) => realRAF(cb)); timers.forEach((t) => realST(t.fn, 0)); timers = []; },
    step(dt) {
      const end = T + dt;
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); T = t.at;
        try { t.fn(); } catch (e) { console.error(e); }
      }
      T = end;
      const q = rafQ; rafQ = [];
      q.forEach((cb) => { try { cb(T); } catch (e) { console.error(e); } });
      document.getAnimations().forEach((a) => { try { a.pause(); a.currentTime = (a.currentTime || 0) + dt; } catch { /* finished */ } });
    },
    sounds() { return log.map(([t, n]) => [+((t - this.t0) / 1000).toFixed(3), n]); },
  };
};

const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()));
await page.evaluateOnNewDocument(VIRTUAL_CLOCK);
// silence the real WebAudio (the soundtrack is rebuilt from the logs)
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('rummage.muted', '1'); } catch { /* */ } });
await page.goto(base, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__rummage?.S.mode === 'title', { timeout: 120000 });
// helpers available to shot code as window.K
await page.evaluate(() => {
  const R = window.__rummage, T3 = R.THREE;
  const box = (o) => new T3.Box3().setFromObject(o);
  window.K = {
    R, T3, box,
    ui(show) { document.body.classList.toggle('video-clean', !show); },
    async level(id, seed, { play = true } = {}) {
      await R.startLevel(R.levels[id - 1], seed);
      if (play) R.beginPlay();
    },
    async findSeed(id, pred, from = 1) {
      const lv = R.levels[id - 1];
      if (R.world?.roomId !== lv.room) await R.startLevel(lv, 1);
      for (let s = from; s < from + 3000; s++) { R.setupLevel(lv, s); if (pred(R.items(), R.S.run)) return s; }
      throw new Error('no seed for level ' + id);
    },
    piece: (slug) => R.world.pieces.find((p) => p.slug === slug),
    center: (o) => box(o).getCenter(new T3.Vector3()),
    // aim the camera: target point, then camera at an offset from it
    look(target, offset) { R.controls.target.copy(target); R.camera.position.copy(target).add(offset); R.controls.update(); },
    screen(v) { const p = v.clone().project(R.camera); return [Math.round((p.x * 0.5 + 0.5) * innerWidth), Math.round((-p.y * 0.5 + 0.5) * innerHeight)]; },
    wave(parts, t0, gap) { parts.forEach((p, i) => setTimeout(() => { p.target = p.open; p.piece.squash = performance.now(); }, t0 + i * gap)); },
  };
  const st = document.createElement('style');
  st.textContent = `body.video-clean #hud, body.video-clean .center, body.video-clean .bottom, body.video-clean .sound,
    body.video-clean .toast, body.video-clean #embedBar, body.video-clean #fsBtn { display: none !important; }`;
  document.head.appendChild(st);
});

for (const shot of SHOTS) {
  if (only.length && !only.includes(shot.name)) continue;
  const t0 = Date.now();
  await page.evaluate(() => { window.__virt.stop(); });
  const info = await page.evaluate(shot.setup);
  if (shot.perFrame) await page.evaluate(`window.__pf = ${shot.perFrame.toString()}`);
  else await page.evaluate(() => { window.__pf = null; });
  await page.evaluate(() => window.__virt.start());
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'veryfast', `${OUT}${shot.name}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(shot.dur * FPS);
  const actions = [...(shot.actions || [])].sort((a, b) => a[0] - b[0]);
  let ai = 0, extra = {};
  for (let f = 0; f < N; f++) {
    const t = f / FPS;
    while (ai < actions.length && actions[ai][0] <= t) {
      const [, act] = actions[ai++];
      if (act.node) await act.node(page, t); else { const r = await page.evaluate(act, info); if (r) Object.assign(extra, r); }
    }
    if (shot.mouse) { const [x, y] = shot.mouse(t, info); await page.mouse.move(x, y); }
    await page.evaluate((t) => { window.__pf?.(t, window.K); window.__virt.step(1000 / 30); }, t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  const sounds = await page.evaluate(() => window.__virt.sounds());
  writeFileSync(`${OUT}${shot.name}.json`, JSON.stringify({ dur: shot.dur, info, extra, sounds }, null, 1));
  console.log(`${shot.name}: ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${sounds.length} sounds`);
}
await browser.close();
