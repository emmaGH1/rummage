// Deliberately annoying elevator music, synthesized (no files).
// It slowly drifts out of tune the longer you stay, and a kazoo interrupts now and then.
let ctx, master, timer, step = 0, detune = 0, on = false, muted = false;
try { muted = localStorage.getItem('snorfle.music') === 'off'; } catch { /* ignore */ }

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
// a cheesy loop: C  Am  F  G, with a melody that hits one wrong note on purpose
const MEL = [72, 76, 79, 76, 72, 76, 79, 81, 69, 72, 76, 72, 69, 72, 76, 77,
  65, 69, 72, 69, 65, 69, 72, 73, 67, 71, 74, 71, 67, 71, 74, 79];
const BASS = [48, 45, 41, 43];

function note(freq, t, d, type, v, cents = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = cents;
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = 5.5; lg.gain.value = 6; lfo.connect(lg).connect(o.detune);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + d + 0.05); lfo.start(t); lfo.stop(t + d + 0.05);
}
function kazoo(t) {
  [0, 0.12, 0.24].forEach((dt, i) => note(N(62 + i * 3), t + dt, 0.16, 'sawtooth', 0.05, 30));
}

function tick() {
  const t = ctx.currentTime + 0.05;
  const beat = 0.26;
  const m = MEL[step % MEL.length];
  note(N(m), t, beat * 0.9, 'square', 0.035, detune);
  if (step % 8 === 0) note(N(BASS[(step / 8) % 4]), t, beat * 7.5, 'triangle', 0.08, -detune);
  if (step % 2 === 0) note(N(BASS[Math.floor(step / 8) % 4] + 24), t, 0.05, 'square', 0.012);
  if (step % MEL.length === MEL.length - 1) detune += 7; // every loop: a bit more out of tune
  if (Math.random() < 0.012) kazoo(t + beat);
  step++;
}

export function startMusic() {
  if (on) return;
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  master ||= ctx.createGain();
  master.gain.value = muted ? 0 : 0.6;
  master.connect(ctx.destination);
  ctx.resume?.();
  timer = setInterval(tick, 260);
  on = true;
}
export function toggleMusic() {
  muted = !muted;
  try { localStorage.setItem('snorfle.music', muted ? 'off' : 'on'); } catch { /* ignore */ }
  if (master) master.gain.value = muted ? 0 : 0.6;
  // "muted". one more note, out of spite
  if (muted && ctx) { master.gain.value = 0.6; kazoo(ctx.currentTime + 0.4); setTimeout(() => muted && (master.gain.value = 0), 900); }
  return muted;
}
export const isMusicMuted = () => muted;
export const outOfTune = () => detune;
