// Tiny synthesized sound effects (WebAudio, no files).
let ctx;
function tone({ f = 440, f2, type = 'square', d = 0.12, v = 0.08, delay = 0 }) {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + d + 0.02);
}
const SOUNDS = {
  slide: () => tone({ f: 180, f2: 90, type: 'sawtooth', d: 0.18, v: 0.05 }),
  creak: () => tone({ f: 120, f2: 260, type: 'triangle', d: 0.25, v: 0.07 }),
  shut: () => tone({ f: 140, f2: 60, type: 'square', d: 0.08, v: 0.06 }),
  tick: () => tone({ f: 900, type: 'square', d: 0.04, v: 0.04 }),
  drop: () => { tone({ f: 1200, f2: 600, type: 'triangle', d: 0.15 }); tone({ f: 300, type: 'square', d: 0.06, delay: 0.15 }); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone({ f, type: 'square', d: 0.16, v: 0.07, delay: i * 0.09 })),
  key: () => [784, 988, 1318].forEach((f, i) => tone({ f, type: 'triangle', d: 0.14, v: 0.08, delay: i * 0.07 })),
  nope: () => { tone({ f: 330, f2: 220, type: 'square', d: 0.12, v: 0.05 }); tone({ f: 220, f2: 160, type: 'square', d: 0.14, v: 0.05, delay: 0.12 }); },
  chomp: () => { tone({ f: 90, f2: 50, type: 'sawtooth', d: 0.12, v: 0.1 }); tone({ f: 70, type: 'square', d: 0.1, v: 0.08, delay: 0.1 }); },
  hint: () => [660, 880, 660, 880].forEach((f, i) => tone({ f, type: 'sine', d: 0.08, v: 0.06, delay: i * 0.1 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone({ f, type: 'triangle', d: 0.22, v: 0.08, delay: i * 0.14 })),
};
export function sfx(name) {
  try { SOUNDS[name]?.(); } catch { /* audio unavailable */ }
}
