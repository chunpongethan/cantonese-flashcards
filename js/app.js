import { STICKERS, PRAISE } from './words.js';
import * as speech from './speech.js';
import * as sfx from './sfx.js';
import * as store from './store.js';
import { h, wiggle, confetti, pickOne } from './ui.js';
import { allWords, enabledCategories } from './catalog.js';
import { parentCorner } from './parent.js';
import * as flipMode from './modes/flip.js';
import * as pickMode from './modes/pick.js';
import * as matchMode from './modes/match.js';
import * as traceMode from './modes/trace.js';

const MODES = {
  flip:  { name: '翻翻卡',   icon: '🃏', color: '#FF8A65', mod: flipMode },
  pick:  { name: '聽聽揀揀', icon: '👂', color: '#4FC3F7', mod: pickMode },
  match: { name: '配對遊戲', icon: '🧩', color: '#AED581', mod: matchMode },
  trace: { name: '寫寫字',   icon: '✍️', color: '#BA68C8', mod: traceMode },
};

const app = document.getElementById('app');
let gameToken = 0; // bumps on every screen change so running games stop

function applySettings() {
  const s = store.settings();
  speech.configure({ voiceURI: s.voiceURI, rate: s.rate });
  sfx.setEnabled(s.sound);
}
applySettings();

function show(screen) {
  gameToken++;
  speech.cancel();
  app.replaceChildren(screen);
}

const say = text => speech.speak(text);

function starBadge() {
  return h('div', { class: 'star-badge', id: 'star-count' }, '⭐ ', h('b', {}, store.stars()));
}

function bumpStars() {
  const el = document.querySelector('#star-count b');
  if (!el) return;
  el.textContent = store.stars();
  wiggle(el.parentElement);
}

// ---------- Splash (first tap unlocks sound on phones) ----------
function splash() {
  const go = () => {
    sfx.unlock();
    speech.unlock();
    sfx.chime();
    home();
    say('我哋一齊嚟認字啦！');
  };
  show(h('div', { class: 'screen splash' },
    h('div', { class: 'splash-title' }, '粵語識字卡'),
    h('div', { class: 'splash-pics' }, '🐱 🍎 ☀️ 🚗'),
    h('button', { class: 'play-btn', 'aria-label': '開始', onclick: go }, '▶'),
  ));
}

// ---------- Home ----------
function home() {
  const tiles = Object.entries(MODES).map(([key, m]) =>
    h('button', {
      class: 'mode-tile',
      style: { background: m.color },
      onclick: () => { sfx.tap(); say(m.name); chooseCategory(key); },
    }, h('div', { class: 'mode-icon' }, m.icon), h('div', { class: 'mode-name' }, m.name)));

  const warn = speech.hasCantonese() ? null :
    h('div', { class: 'voice-warn' }, '🔇 呢部機未有廣東話聲音 — 請家長去「家長設定」睇睇');

  show(h('div', { class: 'screen home' },
    h('div', { class: 'topbar' },
      parentButton(),
      h('div', { class: 'title' }, '粵語識字卡'),
      starBadge()),
    h('div', { class: 'body' },
      warn,
      h('div', { class: 'mode-grid' }, tiles),
      h('button', {
        class: 'sticker-btn',
        onclick: () => { sfx.tap(); say('我嘅貼紙'); stickerBook(); },
      }, '📒 我嘅貼紙 ', h('span', { class: 'pill' }, `${store.stickers().length}/${STICKERS.length}`)),
    ),
  ));
}

// Parent corner opens only after holding the button for 2 seconds.
function parentButton() {
  let timer = null;
  const btn = h('button', { class: 'parent-btn', 'aria-label': '家長設定（長按）' }, '⚙️');
  const cancel = () => { clearTimeout(timer); btn.classList.remove('holding'); };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    btn.classList.add('holding');
    timer = setTimeout(() => {
      cancel();
      sfx.tap();
      parentCorner({ show, leave: home, applySettings });
    }, 2000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
  btn.addEventListener('contextmenu', e => e.preventDefault());
  return btn;
}

function backBar(onBack, middle = null, right = null) {
  return h('div', { class: 'topbar' },
    h('button', { class: 'icon-btn', 'aria-label': '返回', onclick: () => { sfx.tap(); onBack(); } }, '🏠'),
    middle || h('div', { class: 'title' }),
    right || starBadge());
}

// ---------- Category picker ----------
function chooseCategory(modeKey) {
  const m = MODES[modeKey];
  const cats = enabledCategories();
  const tiles = [
    h('button', {
      class: 'cat-tile all',
      onclick: () => { sfx.tap(); say('全部'); startGame(modeKey, 'all'); },
    }, h('div', { class: 'cat-icon' }, '🌟'), h('div', { class: 'cat-name' }, '全部')),
    ...cats.map(c => h('button', {
      class: 'cat-tile',
      style: { background: c.color },
      onclick: () => { sfx.tap(); say(c.name); startGame(modeKey, c.id); },
    }, h('div', { class: 'cat-icon' }, c.emoji), h('div', { class: 'cat-name' }, c.name))),
  ];
  show(h('div', { class: 'screen' },
    backBar(home, h('div', { class: 'title' }, `${m.icon} ${m.name}`)),
    h('div', { class: 'body' }, h('div', { class: 'cat-grid' }, tiles)),
  ));
}

// ---------- Game ----------
function startGame(modeKey, catId) {
  const m = MODES[modeKey];
  const words = allWords();
  const cats = enabledCategories().map(c => c.id);
  const pool = words.filter(w => (catId === 'all' ? cats.includes(w.cat) : w.cat === catId));
  if (!pool.length) { home(); return; }
  let size = store.settings().roundSize;
  if (modeKey === 'trace') size = Math.min(size, 4);
  const round = store.pickRound(pool, Math.min(size, pool.length));

  const progress = h('div', { class: 'progress' });
  const body = h('div', { class: 'body game-body' });
  show(h('div', { class: `screen game mode-${modeKey}` },
    backBar(home, progress),
    body));

  const token = gameToken;
  let roundStars = 0;

  const ctx = {
    body,
    words: round,
    pool: words,
    settings: store.settings(),
    sfx,
    alive: () => token === gameToken,
    speak: text => (token === gameToken ? speech.speak(text) : Promise.resolve()),
    say: w => (token === gameToken ? speech.speak(w.say || w.char) : Promise.resolve()),
    praise: () => pickOne(PRAISE),
    confetti,
    wiggle,
    level: id => store.rightCount(id),
    seen: w => store.markSeen(w.id),
    record: (w, ok) => store.record(w.id, ok),
    star: () => { roundStars++; store.addStars(1); bumpStars(); },
    progress: (i, total) => {
      progress.replaceChildren(...Array.from({ length: total }, (_, k) =>
        h('span', { class: k < i ? 'dot done' : k === i ? 'dot now' : 'dot' })));
    },
    done: () => { if (token === gameToken) reward(modeKey, catId, roundStars); },
  };
  m.mod.start(ctx);
}

// ---------- Reward ----------
async function reward(modeKey, catId, roundStars) {
  const { sticker, isNew } = roundStars > 0 ? store.addSticker(STICKERS) : { sticker: null };
  const starRow = h('div', { class: 'reward-stars' },
    Array.from({ length: Math.min(roundStars, 10) }, (_, i) =>
      h('span', { style: { animationDelay: `${i * 0.12}s` } }, '⭐')));
  show(h('div', { class: 'screen reward' },
    h('div', { class: 'body' },
      h('div', { class: 'reward-title' }, '好叻呀！'),
      starRow,
      h('div', { class: 'reward-count' }, `+${roundStars} ⭐`),
      sticker ? h('div', { class: 'reward-sticker' },
        h('div', { class: 'sticker-big' }, sticker),
        h('div', { class: 'sticker-note' }, isNew ? '新貼紙！' : '貼紙')) : null,
      h('div', { class: 'reward-actions' },
        h('button', { class: 'big-btn', 'aria-label': '再玩', onclick: () => { sfx.tap(); startGame(modeKey, catId); } }, '🔁'),
        h('button', { class: 'big-btn', 'aria-label': '返主頁', onclick: () => { sfx.tap(); home(); } }, '🏠')),
    )));
  const token = gameToken;
  sfx.fanfare();
  confetti(40);
  await speech.speak(`好叻呀！你攞咗${roundStars}粒星星！`);
  if (sticker && token === gameToken) speech.speak(isNew ? '仲有一張新貼紙添！' : '再送你一張貼紙！');
}

// ---------- Sticker book ----------
function stickerBook() {
  const owned = new Set(store.stickers());
  const grid = h('div', { class: 'sticker-grid' }, STICKERS.map(s => {
    const has = owned.has(s);
    return h('button', {
      class: `sticker ${has ? '' : 'locked'}`,
      onclick: e => { if (has) { sfx.pop(); wiggle(e.currentTarget); } },
    }, has ? s : '❔');
  }));
  show(h('div', { class: 'screen' },
    backBar(home, h('div', { class: 'title' }, `📒 ${owned.size}/${STICKERS.length}`)),
    h('div', { class: 'body' }, grid)));
}

// ---------- Boot ----------
splash();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ });
  });
}

// Prevent double-tap zoom and long-press menus on iOS.
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
