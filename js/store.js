// Progress and settings, saved on this device (localStorage).
const KEY = 'cantonese-flashcards-v1';

const defaults = () => ({
  settings: {
    cats: null,        // null = all categories on
    jyutping: false,
    roundSize: 6,
    rate: 0.8,
    voiceURI: '',
    sound: true,
  },
  stars: 0,
  stickers: [],
  stats: {},           // id -> { seen, right, wrong, last }
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const def = defaults();
      return { ...def, ...saved, settings: { ...def.settings, ...(saved.settings || {}) } };
    }
  } catch (e) { /* storage unavailable: play without saving */ }
  return defaults();
}

let data = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

export const settings = () => data.settings;
export const stars = () => data.stars;
export const stickers = () => data.stickers;

export function setSetting(key, value) {
  data.settings[key] = value;
  save();
}

function stat(id) {
  return (data.stats[id] ||= { seen: 0, right: 0, wrong: 0, last: 0 });
}

export function markSeen(id) {
  const s = stat(id);
  s.seen++;
  s.last = Date.now();
  save();
}

export function record(id, ok) {
  const s = stat(id);
  s.seen++;
  if (ok) s.right++; else s.wrong++;
  s.last = Date.now();
  save();
}

export const rightCount = id => data.stats[id]?.right || 0;

export function addStars(n) {
  data.stars += n;
  save();
  return data.stars;
}

// Give a new sticker the child doesn't have yet (or a repeat once all are collected).
export function addSticker(all) {
  const left = all.filter(s => !data.stickers.includes(s));
  const pool = left.length ? left : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (left.length) data.stickers.push(pick);
  save();
  return { sticker: pick, isNew: left.length > 0 };
}

export function resetProgress() {
  data = { ...defaults(), settings: data.settings };
  save();
}

// Words never seen, often missed, or not seen for a while come up more often.
function weight(id) {
  const s = data.stats[id];
  if (!s || !s.seen) return 3;
  const accuracy = (s.right + 1) / (s.right + s.wrong + 2);
  const days = (Date.now() - s.last) / 864e5;
  return 0.4 + (1 - accuracy) * 3 + Math.min(days, 7) * 0.15;
}

export function pickRound(pool, n) {
  const items = [...pool];
  const out = [];
  while (out.length < n && items.length) {
    const ws = items.map(w => weight(w.id));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    let i = 0;
    for (; i < ws.length - 1; i++) {
      r -= ws[i];
      if (r <= 0) break;
    }
    out.push(items.splice(i, 1)[0]);
  }
  return out;
}
