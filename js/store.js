// Progress, settings, the parent's own words, the star bank and gifts,
// all saved on this device (localStorage).
import { CATEGORIES } from './words.js';
import { FAMILIES, EVOLVE_AT } from './monsters.js';

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
    spellMax: 4,
    roundLimits: {},   // game id (zh-pick, en-spell, maths…) -> most rounds per day (0/missing = no limit)       // longest English word in the spelling game (4, 6, or 10 = all)
  },
  stars: 0,            // the star bank balance
  daily: { date: '', earned: 0, lost: 0 }, // today's stars earned and lost in games
  activity: {},        // 'Y-M-D' -> game -> { right, wrong, seen, rounds, gained, lost } (last 60 days)
  stickers: [],        // old emoji stickers (replaced by monsters)
  monsters: {},        // monster family id -> copies collected (evolves at EVOLVE_AT)
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

// One-time move from the old emoji stickers: each old sticker becomes a monster.
if (!data.monstersMigrated) {
  for (let i = 0; i < (data.stickers || []).length; i++) awardMonster(true);
  data.monstersMigrated = true;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

// Cloud sync listens for saves (see sync.js). Changes that came FROM the cloud
// are saved quietly so they aren't sent straight back.
let onSaveHook = null;
export const onSave = fn => { onSaveHook = fn; };

function save(quiet = false) {
  let ok = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    ok = false;
  }
  if (!quiet && onSaveHook) onSaveHook();
  return ok;
}

// ---------- Cloud sync: what is shared between linked phones ----------
// Voices are different on every phone, so they stay on this device.
const LOCAL_ONLY_SETTINGS = ['voiceURI', 'enVoiceURI'];
const PHOTO_PLACEHOLDER = '🖼️';

// Plain JSON copy (drops undefined values, which the cloud can't store).
const plain = x => JSON.parse(JSON.stringify(x));

export function exportSections() {
  const settings = { ...data.settings };
  LOCAL_ONLY_SETTINGS.forEach(k => delete settings[k]);
  const words = data.customWords.map(w => {
    const { img, photoPending, ...rest } = w;
    if (!img && !photoPending) return rest;
    // Photos travel separately; the word just says it has one.
    return { ...rest, emoji: photoPending && rest.emoji === PHOTO_PLACEHOLDER ? '' : rest.emoji, photo: true };
  });
  return plain({
    settings,
    gifts: data.gifts,
    words,
    progress: { stars: data.stars, daily: data.daily, stickers: data.stickers, monsters: data.monsters, stats: data.stats, activity: data.activity },
    redemptions: data.redemptions,
  });
}

// Apply sections that came from the cloud.
export function importSections(sec) {
  if (sec.settings) {
    const local = Object.fromEntries(LOCAL_ONLY_SETTINGS.map(k => [k, data.settings[k]]));
    data.settings = { ...defaults().settings, ...sec.settings, ...local };
  }
  if (sec.gifts) data.gifts = sec.gifts;
  if (sec.words) {
    const imgs = Object.fromEntries(data.customWords.filter(w => w.img).map(w => [w.id, w.img]));
    data.customWords = sec.words.map(({ photo, ...w }) => {
      if (imgs[w.id]) return { ...w, img: imgs[w.id] };
      if (photo) return { ...w, emoji: w.emoji || PHOTO_PLACEHOLDER, photoPending: true };
      return w;
    });
  }
  if (sec.progress) {
    const p = sec.progress;
    if (p.stars !== undefined) data.stars = p.stars;
    if (p.daily) data.daily = p.daily;
    if (p.stickers) data.stickers = p.stickers;
    if (p.monsters) data.monsters = p.monsters;
    if (p.stats) data.stats = p.stats;
    if (p.activity) data.activity = p.activity;
  }
  if (sec.redemptions) data.redemptions = sec.redemptions;
  save(true);
}

// Words whose photo is in the cloud but not yet on this phone.
export const wordsMissingPhotos = () => data.customWords.filter(w => w.photoPending).map(w => w.id);

export function setWordPhoto(id, img) {
  const w = data.customWords.find(x => x.id === id);
  if (!w) return;
  w.img = img;
  delete w.photoPending;
  if (w.emoji === PHOTO_PLACEHOLDER) w.emoji = '';
  save(true);
}

const newId = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const settings = () => data.settings;
export const stars = () => data.stars;
export const monsters = () => data.monsters;
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
function today() {
  if (data.daily.date !== todayKey()) data.daily = { date: todayKey(), earned: 0, lost: 0 };
  data.daily.lost ||= 0;
  return data.daily;
}

// Net stars today: earned minus lost for wrong answers. This is what the daily limit counts.
export const earnedToday = () => (data.daily.date === todayKey() ? data.daily.earned - (data.daily.lost || 0) : 0);

export function capReached() {
  const cap = data.settings.dailyCap;
  return cap > 0 && earnedToday() >= cap;
}

// Adds one star unless today's limit is reached. Returns true if a star was added.
export function earnStar() {
  if (capReached()) return false;
  today().earned++;
  data.stars++;
  save();
  return true;
}

// Takes one star away (never below 0). Returns true if a star was taken.
export function loseStar() {
  if (data.stars <= 0) return false;
  data.stars--;
  today().lost++;
  save();
  return true;
}

// ---------- Activity log (for the parent's learning report) ----------
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const activity = () => data.activity || {};

export function logActivity(game, add) {
  data.activity ||= {};
  const day = (data.activity[todayKey()] ||= {});
  const g = (day[game] ||= { right: 0, wrong: 0, seen: 0, rounds: 0, gained: 0, lost: 0 });
  for (const [k, v] of Object.entries(add)) g[k] = (g[k] || 0) + v;
  // Keep the last 60 days.
  const keys = Object.keys(data.activity);
  if (keys.length > 60) {
    const cutoff = Date.now() - 60 * 864e5;
    for (const k of keys) {
      const [y, m, d] = k.split('-').map(Number);
      if (new Date(y, m - 1, d).getTime() < cutoff) delete data.activity[k];
    }
  }
  save();
}

export const allStats = () => data.stats;

// ---------- Daily round limits per game ----------
export const roundsToday = game => (data.activity?.[todayKey()]?.[game]?.rounds) || 0;
export const roundLimit = game => (data.settings.roundLimits || {})[game] || 0;
export function canPlay(game) {
  const limit = roundLimit(game);
  return !limit || roundsToday(game) < limit;
}
export function setRoundLimit(game, n) {
  data.settings.roundLimits = { ...(data.settings.roundLimits || {}), [game]: n };
  save();
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

// ---------- Monster stickers ----------
// Give a monster: a family not found yet if there is one, otherwise a baby that
// hasn't evolved yet. Returns { id, count, isNew, evolved }.
function awardMonster(quiet = false) {
  data.monsters ||= {};
  const count = id => data.monsters[id] || 0;
  const unseen = FAMILIES.filter(f => !count(f.id));
  const growing = FAMILIES.filter(f => count(f.id) > 0 && count(f.id) < EVOLVE_AT);
  const pool = unseen.length ? unseen : growing.length ? growing : FAMILIES;
  const f = pool[Math.floor(Math.random() * pool.length)];
  const before = count(f.id);
  data.monsters[f.id] = Math.min(before + 1, EVOLVE_AT);
  if (!quiet) save();
  return { id: f.id, count: data.monsters[f.id], isNew: before === 0, evolved: before === EVOLVE_AT - 1 };
}
export const addMonster = () => awardMonster();

// Forms collected: babies found + babies evolved (out of FAMILIES.length * 2).
export function formsOwned() {
  const m = data.monsters || {};
  return FAMILIES.reduce((n, f) => n + ((m[f.id] || 0) > 0) + ((m[f.id] || 0) >= EVOLVE_AT), 0);
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
