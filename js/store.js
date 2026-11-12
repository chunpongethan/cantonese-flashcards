// Progress, settings, the parent's own words, the star bank and gifts,
// all saved on this device (localStorage).
import { CATEGORIES } from './words.js';

const KEY = 'cantonese-flashcards-v1';

const DEFAULT_GIFTS = [
  { id: 'g-cartoon', emoji: '📺', name: '睇卡通 15 分鐘', cost: 15 },
  { id: 'g-icecream', emoji: '🍦', name: '雪糕', cost: 30 },
  { id: 'g-toy', emoji: '🧸', name: '新玩具', cost: 100 },
];

const defaults = () => ({
  settings: {
    catsOff: [],       // category ids turned off in the parent corner
    jyutping: false,
    roundSize: 6,
    rate: 0.8,
    voiceURI: '',
    sound: true,
    dailyCap: 20,      // most stars that can be earned per day (0 = no limit)
    wrongPenalty: true, // lose 1 star for a wrong answer (Listen & Pick, Maths)
    mathDigits: 1,     // maths numbers up to 1, 2 or 3 digits
    mathAdd: true,
    mathSub: true,
    spellMax: 4,       // longest English word in the spelling game (4, 6, or 10 = all)
  },
  stars: 0,            // the star bank balance
  daily: { date: '', earned: 0 },
  stickers: [],
  stats: {},           // id -> { seen, right, wrong, last }
  customWords: [],     // words added in the parent corner
  gifts: DEFAULT_GIFTS.map(g => ({ ...g })),
  redemptions: [],     // gifts the child has exchanged stars for, newest first
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const def = defaults();
      const settings = { ...def.settings, ...(saved.settings || {}) };
      // Older saves kept a list of categories that were ON.
      if (Array.isArray(settings.cats)) {
        settings.catsOff = CATEGORIES.map(c => c.id).filter(id => !settings.cats.includes(id));
      }
      delete settings.cats;
      return { ...def, ...saved, settings };
    }
  } catch (e) { /* storage unavailable: play without saving */ }
  return defaults();
}

let data = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

const newId = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const settings = () => data.settings;
export const stars = () => data.stars;
export const stickers = () => data.stickers;
export const customWords = () => data.customWords;

export function setSetting(key, value) {
  data.settings[key] = value;
  save();
}

// ---------- Star bank ----------
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Stars earned today (stars lost for wrong answers don't give room back).
export const earnedToday = () => (data.daily.date === todayKey() ? data.daily.earned : 0);

export function capReached() {
  const cap = data.settings.dailyCap;
  return cap > 0 && earnedToday() >= cap;
}

// Adds one star unless today's limit is reached. Returns true if a star was added.
export function earnStar() {
  if (capReached()) return false;
  if (data.daily.date !== todayKey()) data.daily = { date: todayKey(), earned: 0 };
  data.daily.earned++;
  data.stars++;
  save();
  return true;
}

// Takes one star away (never below 0). Returns true if a star was taken.
export function loseStar() {
  if (data.stars <= 0) return false;
  data.stars--;
  save();
  return true;
}

// ---------- Gifts ----------
export const gifts = () => data.gifts;
export const redemptions = () => data.redemptions;

export function addGift({ emoji, name, cost }) {
  data.gifts.push({ id: newId('g'), emoji, name, cost });
  return save();
}

export function updateGift(id, changes) {
  const g = data.gifts.find(x => x.id === id);
  if (g) Object.assign(g, changes);
  save();
}

export function removeGift(id) {
  data.gifts = data.gifts.filter(g => g.id !== id);
  save();
}

// Spend stars on a gift. Returns the record, or null if not enough stars.
export function redeem(giftId) {
  const g = data.gifts.find(x => x.id === giftId);
  if (!g || data.stars < g.cost) return null;
  data.stars -= g.cost;
  const r = { id: newId('r'), emoji: g.emoji, name: g.name, cost: g.cost, at: Date.now(), given: false };
  data.redemptions = [r, ...data.redemptions].slice(0, 50);
  save();
  return r;
}

export function markGiven(id) {
  const r = data.redemptions.find(x => x.id === id);
  if (r) r.given = true;
  save();
}

// Undo an exchange (e.g. tapped by mistake): stars go back to the bank.
export function refund(id) {
  const r = data.redemptions.find(x => x.id === id);
  if (!r) return;
  data.stars += r.cost;
  data.redemptions = data.redemptions.filter(x => x.id !== id);
  save();
}

// ---------- Custom words ----------
// Returns false if the word could not be saved (e.g. storage full of photos).
export function addCustomWord(word) {
  data.customWords.push(word);
  if (save()) return true;
  data.customWords.pop();
  return false;
}

export function removeCustomWord(id) {
  data.customWords = data.customWords.filter(w => w.id !== id);
  delete data.stats[id];
  save();
}

// ---------- Learning stats ----------
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

// Give a new sticker the child doesn't have yet (or a repeat once all are collected).
export function addSticker(all) {
  const left = all.filter(s => !data.stickers.includes(s));
  const pool = left.length ? left : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (left.length) data.stickers.push(pick);
  save();
  return { sticker: pick, isNew: left.length > 0 };
}

// Clears stars, stickers, exchanges and learning stats.
// Keeps settings, the parent's own words and the gift list.
export function resetProgress() {
  data = { ...defaults(), settings: data.settings, customWords: data.customWords, gifts: data.gifts };
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
