import { PRAISE, PRAISE_EN } from './words.js';
import { FAMILIES, TYPES, EVOLVE_AT, TOTAL_FORMS, family, formName, monsterSVG } from './monsters.js';
import * as speech from './speech.js';
import * as sfx from './sfx.js';
import * as store from './store.js';
import { h, wiggle, confetti, pickOne } from './ui.js';
import { allWords, enabledCategories, englishWords, englishCategories } from './catalog.js';
import { parentCorner } from './parent.js';
import { starBank } from './bank.js';
import * as sync from './sync.js';
import * as flipMode from './modes/flip.js';
import * as pickMode from './modes/pick.js';
import * as matchMode from './modes/match.js';
import * as traceMode from './modes/trace.js';
import * as mathsMode from './modes/maths.js';
import * as spellMode from './modes/spell.js';
import * as radicalMode from './modes/radical.js';
import * as fillMode from './modes/fill.js';
import { RADICAL_CHARS, FILL_ITEMS } from './lessons.js';
import { EN_FILL, CLOCK_ITEMS } from './english-lessons.js';
import * as enFillMode from './modes/enfill.js';
import * as clockMode from './modes/clock.js';

const MODES = {
  flip:  { name: '翻翻卡',   icon: '🃏', color: '#FF8A65', mod: flipMode },
  pick:  { name: '聽聽揀揀', icon: '👂', color: '#4FC3F7', mod: pickMode },
  match: { name: '配對遊戲', icon: '🧩', color: '#AED581', mod: matchMode },
  trace: { name: '寫寫字',   icon: '✍️', color: '#BA68C8', mod: traceMode },
  // School book games: no category picker, they use the lessons in lessons.js.
  radical: { name: '部首',   icon: '🧱', color: '#FFB300', mod: radicalMode, items: RADICAL_CHARS },
  fill:    { name: '填字',   icon: '📝', color: '#26A69A', mod: fillMode, items: FILL_ITEMS },
};

// English section: the same games with English words and an English voice.
const EN_MODES = {
  flip:  { name: 'Flip Cards',    icon: '🃏', color: '#FF8A65', mod: flipMode },
  pick:  { name: 'Listen & Pick', icon: '👂', color: '#4FC3F7', mod: pickMode },
  match: { name: 'Match',         icon: '🧩', color: '#AED581', mod: matchMode },
  spell: { name: 'Spelling',      icon: '🔡', color: '#BA68C8', mod: spellMode },
  // School English book games: no category picker.
  fill:  { name: 'Fill In',          icon: '📝', color: '#26A69A', mod: enFillMode, items: EN_FILL },
  clock: { name: 'Clock & Numbers',  icon: '🕒', color: '#FFB300', mod: clockMode, items: CLOCK_ITEMS },
};

// English words that fit the spelling game, given the parent's length setting.
const spellWords = words => words.filter(w => spellMode.spellable(w, store.settings().spellMax));

const app = document.getElementById('app');
let gameToken = 0; // bumps on every screen change so running games stop

function applySettings() {
  const s = store.settings();
  speech.configure({ voiceURI: s.voiceURI, enVoiceURI: s.enVoiceURI, rate: s.rate });
  sfx.setEnabled(s.sound);
}
applySettings();

function show(screen) {
  gameToken++;
  speech.cancel();
  app.replaceChildren(screen);
}

const say = text => speech.speak(text);
const sayEn = text => speech.speak(text, { lang: 'en' });

function starBadge() {
  return h('div', { class: 'star-badge', id: 'star-count' }, '⭐ ', h('b', {}, store.stars()));
}

function bumpStars(lost = false) {
  const el = document.querySelector('#star-count b');
  if (!el) return;
  el.textContent = store.stars();
  const badge = el.parentElement;
  badge.classList.toggle('lost', lost);
  wiggle(badge);
  if (lost) {
    const r = badge.getBoundingClientRect();
    const minus = h('div', { class: 'minus-star' }, '−1 ⭐');
    minus.style.left = `${r.left + r.width / 2}px`;
    minus.style.top = `${r.bottom}px`;
    document.getElementById('fx').append(minus);
    setTimeout(() => minus.remove(), 1300);
  }
}

// A short message that slides in under the top bar.
function toast(text) {
  const t = h('div', { class: 'toast' }, text);
  document.getElementById('fx').append(t);
  setTimeout(() => t.remove(), 2600);
}

// ---------- Splash (first tap unlocks sound on phones) ----------
function splash() {
  const go = () => {
    sfx.unlock();
    speech.unlock();
    sfx.chime();
    home();
    say('今日挑戰，開始啦！');
  };
  show(h('div', { class: 'screen splash' },
    h('div', { class: 'splash-title' }, 'Daily Challenge'),
    h('div', { class: 'splash-pics' }, '🐱 🔤 🔢 ⭐'),
    h('button', { class: 'play-btn', 'aria-label': '開始', onclick: go }, '▶'),
  ));
}

// ---------- Home: choose a subject ----------
const SUBJECTS = [
  { key: 'zh', name: '中文', sub: '認字・寫字', icon: '📖', color: '#FF8A65', speak: () => say('中文'), open: () => chooseChinese() },
  { key: 'en', name: 'English', sub: 'Words・Spelling', icon: '🔤', color: '#26A69A', speak: () => sayEn('English'), open: () => chooseEnglish() },
  { key: 'math', name: '數學', sub: '加數・減數', icon: '🔢', color: '#FFB300', speak: () => say('數學'), open: () => chooseMaths() },
];

function home() {
  const warn = speech.hasCantonese() ? null :
    h('div', { class: 'voice-warn' }, '🔇 呢部機未有廣東話聲音 — 請家長去「家長設定」睇睇');

  const subjects = SUBJECTS.map(sj => h('button', {
    class: `subject-tile s-${sj.key}`,
    style: { background: sj.color },
    onclick: () => { sfx.tap(); sj.speak(); sj.open(); },
  },
  h('div', { class: 'subject-icon' }, sj.icon),
  h('div', { class: 'subject-text' },
    h('div', { class: 'subject-name' }, sj.name),
    h('div', { class: 'subject-sub' }, sj.sub))));

  show(h('div', { class: 'screen home' },
    h('div', { class: 'topbar' },
      parentButton(),
      h('div', { class: 'title' }, 'Daily Challenge'),
      starBadge()),
    h('div', { class: 'body' },
      warn,
      h('div', { class: 'subject-list' }, subjects),
      h('div', { class: 'home-row' },
        h('button', {
          class: 'sticker-btn bank-btn',
          onclick: () => { sfx.tap(); openBank(); },
        }, '⭐ 星星銀行'),
        h('button', {
          class: 'sticker-btn',
          onclick: () => { sfx.tap(); say('怪獸圖鑑'); stickerBook(); },
        }, '📒 怪獸 ', h('span', { class: 'pill' }, `${store.formsOwned()}/${TOTAL_FORMS}`))),
    ),
  ));
}

// A screen listing one subject's games as big tiles.
function gameList(title, modes, onPick) {
  const tiles = Object.entries(modes).map(([key, m]) =>
    h('button', {
      class: 'mode-tile',
      style: { background: m.color },
      onclick: () => { sfx.tap(); onPick(key, m); },
    }, h('div', { class: 'mode-icon' }, m.icon), h('div', { class: 'mode-name' }, m.name)));
  show(h('div', { class: 'screen game-list' },
    backBar(home, h('div', { class: 'title' }, title)),
    h('div', { class: 'body' }, h('div', { class: 'mode-grid' }, tiles))));
}

function chooseChinese() {
  gameList('📖 中文', MODES, (key, m) => {
    say(m.name);
    if (m.items) startLessonGame(key); else chooseCategory(key, 'zh');
  });
}

// 部首 / 填字: a round picked from the school lessons (missed ones come up more).
function startLessonGame(key, lang = 'zh') {
  const m = (lang === 'en' ? EN_MODES : MODES)[key];
  const round = store.pickRound(m.items, Math.min(store.settings().roundSize, m.items.length));
  playScreen(key, m.mod, { words: round, pool: m.items, lang }, () => startLessonGame(key, lang));
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

// Top bar: back button (🏠 to the subject screen, ⬅️ one step back), a title, and the star badge.
function backBar(onBack, middle = null, right = null, icon = '🏠') {
  return h('div', { class: 'topbar' },
    h('button', { class: 'icon-btn', 'aria-label': '返回', onclick: () => { sfx.tap(); onBack(); } }, icon),
    middle || h('div', { class: 'title' }),
    right || starBadge());
}

// ---------- Category picker ----------
function chooseCategory(modeKey, lang = 'zh') {
  const en = lang === 'en';
  const m = en ? EN_MODES[modeKey] : MODES[modeKey];
  let cats = en ? englishCategories() : enabledCategories();
  if (modeKey === 'spell') {
    const ok = spellWords(englishWords());
    cats = cats.filter(c => ok.some(w => w.cat === c.id));
  }
  const speakName = en ? sayEn : say;
  const allName = en ? 'All' : '全部';
  const tiles = [
    h('button', {
      class: 'cat-tile all',
      onclick: () => { sfx.tap(); speakName(allName); startGame(modeKey, 'all', lang); },
    }, h('div', { class: 'cat-icon' }, '🌟'), h('div', { class: 'cat-name' }, allName)),
    ...cats.map(c => h('button', {
      class: `cat-tile ${en ? 'en' : ''}`,
      style: { background: c.color },
      onclick: () => { sfx.tap(); speakName(en ? c.en : c.name); startGame(modeKey, c.id, lang); },
    }, h('div', { class: 'cat-icon' }, c.emoji), h('div', { class: 'cat-name' }, en ? c.en : c.name))),
  ];
  show(h('div', { class: 'screen' },
    backBar(en ? chooseEnglish : chooseChinese, h('div', { class: 'title' }, `${m.icon} ${m.name}`), null, '⬅️'),
    h('div', { class: 'body' }, h('div', { class: 'cat-grid' }, tiles)),
  ));
}

// ---------- Maths: pick adding / taking away ----------
const MATH_OPS = {
  '+': { name: '加數', icon: '➕', color: '#FF8A65' },
  '-': { name: '減數', icon: '➖', color: '#4FC3F7' },
  mix: { name: '加減混合', icon: '🔀', color: '#BA68C8' },
};

function enabledMathOps() {
  const s = store.settings();
  const ops = [];
  if (s.mathAdd) ops.push('+');
  if (s.mathSub) ops.push('-');
  if (ops.length === 2) ops.push('mix');
  return ops.length ? ops : ['+'];
}

function chooseMaths() {
  const ops = enabledMathOps();
  if (ops.length === 1) { startMaths(ops[0]); return; }
  const digits = store.settings().mathDigits;
  const tiles = ops.map(op => h('button', {
    class: 'cat-tile math-op',
    style: { background: MATH_OPS[op].color },
    onclick: () => { sfx.tap(); say(MATH_OPS[op].name); startMaths(op); },
  }, h('div', { class: 'cat-icon' }, MATH_OPS[op].icon), h('div', { class: 'cat-name' }, MATH_OPS[op].name)));
  show(h('div', { class: 'screen' },
    backBar(home, h('div', { class: 'title' }, `🔢 數學`)),
    h('div', { class: 'body' },
      h('div', { class: 'math-level' }, `${digits} 位數（0–${10 ** digits - 1}）`),
      h('div', { class: 'math-op-grid' }, tiles))));
}

function startMaths(op) {
  playScreen('maths', mathsMode, { op, words: [], pool: [] }, () => startMaths(op));
}

// ---------- English: pick a game ----------
function chooseEnglish() {
  gameList('🔤 English', EN_MODES, (key, m) => {
    sayEn(m.name);
    if (m.items) startLessonGame(key, 'en'); else chooseCategory(key, 'en');
  });
}

// ---------- Game ----------
function startGame(modeKey, catId, lang = 'zh') {
  const m = (lang === 'en' ? EN_MODES : MODES)[modeKey];
  let words = lang === 'en' ? englishWords() : allWords();
  if (modeKey === 'spell') words = spellWords(words);
  const cats = (lang === 'en' ? englishCategories() : enabledCategories()).map(c => c.id);
  const seenChars = new Set();
  const pool = words
    .filter(w => (catId === 'all' ? cats.includes(w.cat) : w.cat === catId))
    .filter(w => !seenChars.has(w.char) && seenChars.add(w.char));
  if (!pool.length) { home(); return; }
  let size = store.settings().roundSize;
  if (modeKey === 'trace') size = Math.min(size, 4);
  if (modeKey === 'spell') size = Math.min(size, 5);
  const round = store.pickRound(pool, Math.min(size, pool.length));
  playScreen(modeKey, m.mod, { words: round, pool: words, lang }, () => startGame(modeKey, catId, lang));
}

// Shared game screen: top bar with progress, star rules, and the reward at the end.
function playScreen(modeKey, mod, extra, replay) {
  const progress = h('div', { class: 'progress' });
  const body = h('div', { class: 'body game-body' });
  show(h('div', { class: `screen game mode-${modeKey}` },
    backBar(home, progress),
    body));

  const token = gameToken;
  let roundStars = 0;
  let roundLost = 0;
  let capHit = false;

  const ctx = {
    ...extra,
    body,
    settings: store.settings(),
    sfx,
    alive: () => token === gameToken,
    speak: text => (token === gameToken ? speech.speak(text, { lang: extra.lang }) : Promise.resolve()),
    say: w => (token === gameToken ? speech.speak(w.say || w.char, { lang: w.lang }) : Promise.resolve()),
    praise: () => pickOne(extra.lang === 'en' ? PRAISE_EN : PRAISE),
    confetti,
    wiggle,
    level: id => store.rightCount(id),
    seen: w => store.markSeen(w.id),
    record: (w, ok) => store.record(w.id, ok),
    star: () => {
      if (store.earnStar()) {
        roundStars++;
        bumpStars();
      } else if (!capHit) {
        capHit = true;
        toast('今日嘅星星已經儲滿喇 ✔');
      }
    },
    // Wrong answer: lose a star (if the parent has this rule on).
    lose: () => {
      if (!store.settings().wrongPenalty) return;
      if (store.loseStar()) {
        roundLost++;
        bumpStars(true);
      }
    },
    progress: (i, total) => {
      progress.replaceChildren(...Array.from({ length: total }, (_, k) =>
        h('span', { class: k < i ? 'dot done' : k === i ? 'dot now' : 'dot' })));
    },
    done: () => { if (token === gameToken) reward({ gained: roundStars, lost: roundLost, replay, lang: extra.lang }); },
  };
  mod.start(ctx);
}

// ---------- Reward ----------
async function reward({ gained, lost, replay, lang }) {
  const en = lang === 'en';
  const full = store.capReached();
  const got = gained > 0 ? store.addMonster() : null;
  const fam = got && family(got.id);
  const starRow = h('div', { class: 'reward-stars' },
    Array.from({ length: Math.min(gained, 10) }, (_, i) =>
      h('span', { style: { animationDelay: `${i * 0.12}s` } }, '⭐')));
  show(h('div', { class: 'screen reward' },
    h('div', { class: 'body' },
      h('div', { class: 'reward-title' }, en ? 'Great job!' : '好叻呀！'),
      starRow,
      h('div', { class: 'reward-count' },
        `+${gained} ⭐`,
        lost ? h('span', { class: 'reward-lost' }, `  −${lost}`) : null),
      full ? h('div', { class: 'reward-full' }, '今日嘅星星儲滿喇！聽日再嚟 🌙') : null,
      h('div', { class: 'reward-bank' }, `銀行：⭐ ${store.stars()}`),
      got ? monsterReward(fam, got) : null,
      h('div', { class: 'reward-actions' },
        h('button', { class: 'big-btn', 'aria-label': '再玩', onclick: () => { sfx.tap(); replay(); } }, '🔁'),
        h('button', { class: 'big-btn', 'aria-label': '返主頁', onclick: () => { sfx.tap(); home(); } }, '🏠')),
    )));
  const token = gameToken;
  sfx.fanfare();
  confetti(40);
  if (en) {
    await speech.speak(gained > 0 ? `Great job! You got ${gained} ${gained === 1 ? 'star' : 'stars'}!` : 'Good playing!', { lang: 'en' });
    if (token !== gameToken) return;
    if (full) speech.speak("That's all the stars for today. See you tomorrow!", { lang: 'en' });
    else if (got) speech.speak(got.isNew ? 'You found a new monster!' : got.evolved ? 'Wow! Your monster evolved!' : `Another one! ${got.count} of ${EVOLVE_AT}.`, { lang: 'en' });
    return;
  }
  await speech.speak(gained > 0 ? `好叻呀！你攞咗${gained}粒星星！` : '玩得好好呀！');
  if (token !== gameToken) return;
  if (full) speech.speak('今日嘅星星已經儲滿喇，聽日再嚟儲啦！');
  else if (got) {
    speech.speak(got.isNew ? `你搵到新怪獸：${fam.name}！`
      : got.evolved ? `嘩！${fam.name}進化做${fam.evo}喇！`
        : `${fam.name}多咗一隻，有${got.count}隻喇！集齊${EVOLVE_AT}隻就會進化！`);
  }
}

// The monster card on the reward screen.
function monsterReward(fam, got) {
  const stage = got.evolved ? 2 : 1;
  const art = h('div', { class: `monster-art ${got.evolved ? 'evolving' : ''}` });
  art.innerHTML = monsterSVG(fam, stage);
  const note = got.isNew ? '新怪獸！'
    : got.evolved ? `進化喇！✨`
      : `${got.count} / ${EVOLVE_AT}`;
  return h('div', { class: 'reward-sticker monster-card' },
    art,
    h('div', { class: 'monster-name' }, `${TYPES[fam.type].icon} ${formName(fam, stage)}`),
    h('div', { class: 'sticker-note' }, note),
    !got.evolved && !got.isNew ? progressDots(got.count) : null);
}

function progressDots(count) {
  return h('div', { class: 'evo-dots' },
    Array.from({ length: EVOLVE_AT }, (_, i) => h('span', { class: i < count ? 'on' : '' })));
}

function openBank() {
  starBank({ show, header: right => backBar(home, h('div', { class: 'title' }, '星星銀行'), right), sfx });
}

// ---------- Monster book (怪獸圖鑑) ----------
function stickerBook() {
  const counts = store.monsters();
  const cell = (fam, stage) => {
    const have = (counts[fam.id] || 0) >= (stage === 2 ? EVOLVE_AT : 1);
    const art = h('div', { class: `monster-art ${have ? '' : 'mystery'}` });
    art.innerHTML = monsterSVG(fam, stage);
    const btn = h('button', { class: `monster-cell ${have ? '' : 'locked'}`, 'aria-label': have ? formName(fam, stage) : '未搵到' },
      art,
      h('div', { class: 'monster-name' }, have ? formName(fam, stage) : '？？？'));
    btn.addEventListener('click', () => {
      if (!have) { sfx.boop(); say(stage === 2 ? `集齊${EVOLVE_AT}隻${fam.name}就會見到佢` : '仲未搵到'); return; }
      sfx.pop();
      wiggle(btn);
      say(formName(fam, stage));
    });
    return btn;
  };
  const rows = FAMILIES.map(fam => {
    const n = counts[fam.id] || 0;
    return h('div', { class: 'monster-row' },
      cell(fam, 1),
      h('div', { class: 'evo-arrow' }, progressDots(Math.min(n, EVOLVE_AT)), '➜'),
      cell(fam, 2));
  });
  show(h('div', { class: 'screen' },
    backBar(home, h('div', { class: 'title' }, `📒 ${store.formsOwned()}/${TOTAL_FORMS}`)),
    h('div', { class: 'body' },
      h('p', { class: 'monster-help' }, `每玩完一回合就有一隻怪獸。集齊 ${EVOLVE_AT} 隻一樣嘅就會進化！`),
      h('div', { class: 'monster-book' }, rows))));
}

// ---------- Boot ----------
splash();

// Cloud sync: changes made on another linked phone show up here.
sync.onRemoteChange(() => {
  applySettings();
  const badge = document.querySelector('#star-count b');
  if (badge) badge.textContent = store.stars();
});
sync.start();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ });
  });
}

// Prevent double-tap zoom and long-press menus on iOS.
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
