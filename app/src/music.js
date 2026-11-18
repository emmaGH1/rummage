// A tiny bouncy background loop synthesized with WebAudio (no audio files).
// Starts on the first user gesture (browser autoplay rules); mute state is remembered per viewer.
const KEY = 'rummage.muted';
let ctx, master, timer, step = 0, nextT = 0;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }

const BPM = 112;
const S16 = 60 / BPM / 4;
// C major-ish sneaky tune: bass (root notes) + plucky melody, 32 sixteenth steps
const BASS = [48, 0, 0, 48, 0, 0, 55, 0, 45, 0, 0, 45, 0, 0, 52, 0, 41, 0, 0, 41, 0, 0, 48, 0, 43, 0, 0, 43, 47, 0, 50, 0];
const MEL = [72, 0, 76, 0, 79, 0, 76, 74, 0, 72, 0, 0, 69, 0, 72, 0, 77, 0, 76, 0, 74, 0, 72, 0, 71, 0, 74, 0, 79, 0, 0, 0];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function note(m, t, dur, type, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(hz(m), t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function tick() {
  while (nextT < ctx.currentTime + 0.15) {
    const i = step % 32;
    if (BASS[i]) note(BASS[i], nextT, S16 * 2.2, 'triangle', 0.16);
    if (MEL[i]) note(MEL[i], nextT, S16 * 1.4, 'square', 0.035);
    if (i % 4 === 2) note(96, nextT, 0.03, 'square', 0.012); // hi-hat tick
    nextT += S16;
    step++;
  }
}
export function startMusic() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    nextT = ctx.currentTime + 0.1;
    timer = setInterval(tick, 50);
  } catch { /* audio unavailable */ }
}
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
export const isMuted = () => muted;
