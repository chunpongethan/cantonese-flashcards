// Little sound effects made with WebAudio (no audio files needed).
let ctx = null;
let enabled = true;

export function setEnabled(on) { enabled = on; }

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, start, dur, { type = 'sine', vol = 0.2, slideTo = null } = {}) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const tap = () => tone(880, 0, 0.06, { type: 'triangle', vol: 0.06 });
export const flip = () => tone(500, 0, 0.12, { type: 'triangle', vol: 0.1, slideTo: 900 });
export const pop = () => tone(420, 0, 0.1, { vol: 0.15, slideTo: 1000 });
export const boop = () => { tone(260, 0, 0.18, { vol: 0.12 }); tone(200, 0.14, 0.25, { vol: 0.12 }); };
export const chime = () => [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.08, 0.4, { type: 'triangle', vol: 0.18 }));
export const fanfare = () => {
  [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.13, 0.25, { type: 'square', vol: 0.07 }));
  tone(1046.5, 0.42, 0.7, { type: 'square', vol: 0.08 });
  tone(1046.5, 0.42, 0.7, { type: 'triangle', vol: 0.15 });
};
