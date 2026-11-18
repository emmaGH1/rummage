// Rebuild the demo video's soundtrack offline from the game's own sound code:
// the songs (app/src/music.js SONGS) and sound effects (app/src/sfx.js SOUNDS) are read from source and
// rendered with an OfflineAudioContext. Sound effects land where capture.mjs logged them, shifted to
// where each shot sits in video/edit.json.
// Usage: node tools/video/render_audio.mjs   -> video/assets/audio/music.wav, sfx.wav
import puppeteer from '../../app/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url).pathname;
const edit = JSON.parse(readFileSync(`${root}video/edit.json`, 'utf8'));
const grab = (file, start) => {
  const s = readFileSync(`${root}app/src/${file}`, 'utf8');
  const i = s.indexOf(start);
  let depth = 0, j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') depth++; if (s[k] === '}' && --depth === 0) return s.slice(j, k + 1); }
  throw new Error(start);
};
const SONGS_SRC = grab('music.js', 'const SONGS =');
const SOUNDS_SRC = grab('sfx.js', 'const SOUNDS =');

// sound events in video time
const events = [];
for (const c of edit.clips) {
  const log = JSON.parse(readFileSync(`${root}video/assets/footage/${c.clip}.json`, 'utf8'));
  for (const [t, name] of log.sounds) {
    const at = c.at + (t - (c.from || 0));
    if (t >= (c.from || 0) && at < c.at + c.dur) events.push([+at.toFixed(3), name]);
  }
}
for (const [at, name] of edit.extraSounds || []) events.push([at, name]);
events.sort((a, b) => a[0] - b[0]);

const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const out = await page.evaluate(async ({ SONGS_SRC, SOUNDS_SRC, edit, events }) => {
  const SR = 48000, LEN = edit.duration;
  const SONGS = eval(`(${SONGS_SRC})`);
  const toWav = (buf) => {
    const ch = [buf.getChannelData(0)], n = ch[0].length;
    const dv = new DataView(new ArrayBuffer(44 + n * 2));
    const w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, SR, true);
    dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, ch[0][i])) * 32767, true);
    let s = ''; const b = new Uint8Array(dv.buffer);
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(s);
  };
  // ---- music: same note() and step sequencer as app/src/music.js ----
  const m = new OfflineAudioContext(1, SR * LEN, SR);
  const master = m.createGain(); master.gain.value = 0.5; master.connect(m.destination);
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const note = (n, t, dur, type, vol) => {
    const o = m.createOscillator(), g = m.createGain();
    o.type = type; o.frequency.setValueAtTime(hz(n), t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  };
  for (const seg of edit.music) {
    const song = SONGS[seg.song];
    let t = seg.from, step = 0;
    while (t < seg.to) {
      const hurry = (seg.hurry || []).find(([a, b]) => t >= a && t < b)?.[2] || 0;
      const s16 = 60 / (song.bpm * (hurry === 2 ? 1.45 : hurry === 1 ? 1.2 : 1)) / 4;
      const i = step % 32, lift = hurry === 2 ? 2 : 0;
      if (song.bass[i]) note(song.bass[i] + lift, t, s16 * 2.2, song.bassWave, 0.15);
      if (song.mel[i]) note(song.mel[i] + lift, t, s16 * 1.4, song.melWave, song.melVol);
      if (i % 4 === 2) note(96, t, 0.03, 'square', 0.012);
      if (hurry && i % 2 === 0) note(hurry === 2 ? 38 : 36, t, 0.05, 'square', 0.05);
      t += s16; step++;
    }
  }
  // fade the bed out at the end
  master.gain.setValueAtTime(0.5, LEN - 2.5); master.gain.linearRampToValueAtTime(0, LEN - 0.1);
  const music = toWav(await m.startRendering());
  // ---- sound effects: the game's SOUNDS with tone() pointed at an offline context ----
  const x = new OfflineAudioContext(1, SR * LEN, SR);
  let at = 0;
  const tone = ({ f = 440, f2, type = 'square', d = 0.12, v = 0.08, delay = 0 }) => {
    const t = at + delay, o = x.createOscillator(), g = x.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(x.destination); o.start(t); o.stop(t + d + 0.02);
  };
  const SOUNDS = eval(`(${SOUNDS_SRC})`);
  for (const [t, name] of events) { if (name === 'hover') continue; at = t; SOUNDS[name]?.(); }
  const sfx = toWav(await x.startRendering());
  return { music, sfx };
}, { SONGS_SRC, SOUNDS_SRC, edit, events });
await browser.close();
mkdirSync(`${root}video/assets/audio`, { recursive: true });
writeFileSync(`${root}video/assets/audio/music.wav`, Buffer.from(out.music, 'base64'));
writeFileSync(`${root}video/assets/audio/sfx.wav`, Buffer.from(out.sfx, 'base64'));
writeFileSync(`${root}video/assets/audio/sfx-events.json`, JSON.stringify(events));
console.log(`music + ${events.length} sound effects -> video/assets/audio/`);
