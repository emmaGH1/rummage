// Background music synthesized with WebAudio (no audio files): one short loop per room, plus a
// "hurry" mode that speeds up and adds a pulse when the clock is running out.
// Starts on the first user gesture (browser autoplay rules); mute state is remembered per viewer.
const KEY = 'rummage.muted';
let ctx, master, timer, step = 0, nextT = 0;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }

// 32 sixteenth-note steps per loop; numbers are MIDI notes, 0 = rest
const SONGS = {
  title: { bpm: 112, bassWave: 'triangle', melWave: 'square', melVol: 0.035,
    bass: [48, 0, 0, 48, 0, 0, 55, 0, 45, 0, 0, 45, 0, 0, 52, 0, 41, 0, 0, 41, 0, 0, 48, 0, 43, 0, 0, 43, 47, 0, 50, 0],
    mel: [72, 0, 76, 0, 79, 0, 76, 74, 0, 72, 0, 0, 69, 0, 72, 0, 77, 0, 76, 0, 74, 0, 72, 0, 71, 0, 74, 0, 79, 0, 0, 0] },
  wizard: { bpm: 104, bassWave: 'triangle', melWave: 'triangle', melVol: 0.06,
    bass: [45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0, 41, 0, 48, 0, 41, 0, 48, 0, 40, 0, 47, 0, 44, 0, 47, 0],
    mel: [69, 0, 72, 76, 0, 75, 76, 0, 74, 0, 71, 0, 67, 0, 0, 0, 72, 0, 74, 77, 0, 76, 74, 0, 72, 71, 0, 68, 0, 71, 0, 0] },
  pirate: { bpm: 132, bassWave: 'sawtooth', melWave: 'square', melVol: 0.03,
    bass: [50, 0, 0, 57, 0, 0, 50, 0, 0, 57, 0, 0, 48, 0, 0, 55, 0, 0, 48, 0, 0, 55, 0, 0, 46, 0, 53, 0, 45, 0, 52, 0],
    mel: [74, 0, 74, 74, 0, 77, 76, 0, 74, 72, 0, 0, 72, 0, 72, 72, 0, 76, 74, 0, 72, 70, 0, 0, 69, 0, 72, 0, 74, 0, 0, 0] },
  kitchen: { bpm: 96, bassWave: 'triangle', melWave: 'sine', melVol: 0.07,
    bass: [40, 0, 0, 40, 0, 0, 47, 0, 39, 0, 0, 39, 0, 0, 46, 0, 40, 0, 0, 40, 0, 0, 48, 0, 47, 0, 46, 0, 45, 0, 44, 0],
    mel: [76, 0, 0, 75, 76, 0, 0, 79, 0, 78, 0, 0, 71, 0, 0, 0, 76, 0, 0, 75, 76, 0, 0, 72, 0, 71, 0, 70, 0, 69, 0, 0] },
  workshop: { bpm: 124, bassWave: 'triangle', melWave: 'sine', melVol: 0.08,
    bass: [41, 0, 48, 0, 41, 0, 48, 0, 46, 0, 53, 0, 46, 0, 53, 0, 48, 0, 55, 0, 48, 0, 55, 0, 41, 0, 48, 0, 43, 0, 45, 0],
    mel: [77, 81, 84, 0, 81, 0, 77, 0, 82, 0, 81, 0, 79, 0, 0, 0, 79, 82, 86, 0, 84, 0, 82, 0, 81, 0, 79, 0, 77, 0, 0, 0] },
  library: { bpm: 88, bassWave: 'triangle', melWave: 'triangle', melVol: 0.06,
    bass: [45, 0, 0, 0, 52, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0, 40, 0, 0, 0, 44, 0, 0, 0],
    mel: [69, 0, 72, 0, 76, 0, 0, 74, 72, 0, 0, 0, 71, 0, 72, 0, 74, 0, 0, 0, 72, 0, 71, 0, 69, 0, 68, 0, 69, 0, 0, 0] },
};
let song = SONGS.title;
let hurry = 0; // 0 normal, 1 hurry (≤30s), 2 panic (≤10s)

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
  const s16 = 60 / (song.bpm * (hurry === 2 ? 1.45 : hurry === 1 ? 1.2 : 1)) / 4;
  // schedule well ahead so a slow frame on a phone can't starve the audio
  if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.8) {
    const i = step % 32;
    const lift = hurry === 2 ? 2 : 0; // panic: everything a whole tone higher
    if (song.bass[i]) note(song.bass[i] + lift, nextT, s16 * 2.2, song.bassWave, 0.15);
    if (song.mel[i]) note(song.mel[i] + lift, nextT, s16 * 1.4, song.melWave, song.melVol);
    if (i % 4 === 2) note(96, nextT, 0.03, 'square', 0.012); // hi-hat
    if (hurry && i % 2 === 0) note(hurry === 2 ? 38 : 36, nextT, 0.05, 'square', 0.05); // urgent pulse
    nextT += s16;
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
    timer = setInterval(tick, 120);
  } catch { /* audio unavailable */ }
}
export function setSong(name) {
  const next = SONGS[name] || SONGS.title;
  if (next === song) return;
  song = next;
  step = 0;
  hurry = 0;
}
export function setHurry(level) { hurry = level; }
export function duck(on) { if (master && !muted) master.gain.value = on ? 0.15 : 0.5; }
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
export const isMuted = () => muted;
