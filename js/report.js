// 📈 學習報告 — learning report for parents: how the child is doing in each section and game.
// Uses the activity log (per day, per game) and the per-item stats (what he gets wrong most).
import * as store from './store.js';
import { h } from './ui.js';
import { allWords, englishWords } from './catalog.js';
import { FILL_ITEMS } from './lessons.js';
import { EN_FILL, NUMBER_WORDS } from './english-lessons.js';

export const SECTIONS = [
  { key: 'zh', name: '📖 中文', games: [
    ['zh-flip', '翻翻卡'], ['zh-pick', '聽聽揀揀'], ['zh-match', '配對遊戲'],
    ['zh-trace', '寫寫字'], ['zh-radical', '部首'], ['zh-fill', '填字'],
  ] },
  { key: 'en', name: '🔤 English', games: [
    ['en-flip', 'Flip Cards'], ['en-pick', 'Listen & Pick'], ['en-match', 'Match'],
    ['en-spell', 'Spelling'], ['en-fill', 'Fill In'], ['en-clock', 'Clock & Numbers'],
  ] },
  { key: 'math', name: '🔢 數學', games: [['maths', '加數・減數']] },
];

const PERIODS = [[1, '今日'], [7, '7 日'], [30, '30 日']];
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

const empty = () => ({ right: 0, wrong: 0, seen: 0, rounds: 0, gained: 0, lost: 0 });
const add = (a, b) => { for (const k of Object.keys(a)) a[k] += b[k] || 0; return a; };
const answered = t => t.right + t.wrong;
const pct = t => (answered(t) ? Math.round((t.right / answered(t)) * 100) : null);

function lastDays(n) {
  const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date();
    d.setDate(d.getDate() - k);
    out.push(d);
  }
  return out;
}

function totalsFor(days) {
  const act = store.activity();
  const byGame = {};
  for (const d of days) {
    const day = act[store.dayKey(d)] || {};
    for (const [game, t] of Object.entries(day)) add(byGame[game] ||= empty(), t);
  }
  return byGame;
}

// What a stats id is, and which section it belongs to.
function describe(id) {
  if (id.startsWith('math-')) {
    const [, op, d] = id.match(/^math-([+-])-(\d)d$/) || [];
    return op ? { section: 'math', label: `${op === '+' ? '加數' : '減數'}（${d} 位數）` } : null;
  }
  if (id.startsWith('rad-')) return { section: 'zh', label: `「${id.slice(4)}」嘅部首` };
  if (id.startsWith('fill-')) {
    const f = FILL_ITEMS.find(x => x.id === id);
    return f && { section: 'zh', label: f.text.replace('__', `【${f.answer}】`) };
  }
  if (id.startsWith('enfill-')) {
    const f = EN_FILL.find(x => x.id === id);
    return f && { section: 'en', label: f.text.replace('__', `[${f.answer}]`) };
  }
  if (id.startsWith('clock-')) return { section: 'en', label: `🕒 ${NUMBER_WORDS[Number(id.slice(6)) - 1]} o'clock` };
  if (id.startsWith('numword-')) {
    const n = Number(id.slice(8));
    return { section: 'en', label: `${n} → ${NUMBER_WORDS[n - 1]}` };
  }
  if (id.startsWith('en-') || id.startsWith('enc-')) {
    const w = englishWords().find(x => x.id === id);
    return w && { section: 'en', label: `${w.char}${w.zh ? `（${w.zh}）` : ''}` };
  }
  const w = allWords().find(x => x.id === id);
  return w && { section: 'zh', label: w.char };
}

// Items answered at least twice and right less than 80% of the time, weakest first.
function needsPractice() {
  const out = { zh: [], en: [], math: [] };
  for (const [id, s] of Object.entries(store.allStats())) {
    const tries = (s.right || 0) + (s.wrong || 0);
    if (tries < 2 || !s.wrong) continue;
    const rate = s.right / tries;
    if (rate >= 0.8) continue;
    const d = describe(id);
    if (d) out[d.section].push({ ...d, right: s.right, tries, rate });
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.rate - b.rate || b.tries - a.tries).splice(5);
  return out;
}

function meter(p) {
  return h('div', { class: 'r-meter', role: 'img', 'aria-label': p == null ? '未有' : `${p}%` },
    h('span', { style: { width: `${p ?? 0}%` } }));
}

function gameRow(game, name, t) {
  let detail;
  if (game.endsWith('-flip')) detail = `睇咗 ${t.seen} 張`;
  else if (game.endsWith('-match')) detail = `配啱 ${t.right} 對`;
  else detail = answered(t) ? `答咗 ${answered(t)} 題` : '—';
  const p = game.endsWith('-flip') || game.endsWith('-match') ? null : pct(t);
  return h('div', { class: 'r-game' },
    h('div', { class: 'r-game-name' }, name, h('span', { class: 'r-sub' }, `${t.rounds} 回合 · ${detail}`)),
    p == null ? h('div', { class: 'r-na' }, game.endsWith('-flip') || game.endsWith('-match') ? '' : '—')
      : h('div', { class: 'r-acc' }, meter(p), h('span', { class: 'r-pct' }, `${p}%`)));
}

// Single-series bar chart: questions per day for the last 7 days, tap a bar to read it.
function weekChart() {
  const days = lastDays(7);
  const act = store.activity();
  const data = days.map(d => {
    const t = Object.values(act[store.dayKey(d)] || {}).reduce((a, b) => add(a, b), empty());
    return { d, n: answered(t) + t.seen, p: pct(t), stars: t.gained - t.lost };
  });
  const max = Math.max(1, ...data.map(x => x.n));
  const readout = h('div', { class: 'r-readout' });
  const show = x => {
    const when = x.d.toDateString() === new Date().toDateString() ? '今日' : `${x.d.getMonth() + 1}月${x.d.getDate()}日（${WEEKDAY[x.d.getDay()]}）`;
    readout.textContent = x.n ? `${when}：${x.n} 題${x.p != null ? ` · 一次答啱 ${x.p}%` : ''} · 淨攞 ⭐ ${x.stars}` : `${when}：冇玩`;
  };
  const bars = data.map(x => {
    const bar = h('button', { class: 'r-bar', 'aria-label': `${x.d.getMonth() + 1}月${x.d.getDate()}日 ${x.n} 題` },
      h('span', { class: 'r-bar-fill', style: { height: `${x.n ? Math.max(4, (x.n / max) * 100) : 0}%` } }));
    bar.addEventListener('pointerenter', () => show(x));
    bar.addEventListener('click', () => show(x));
    return h('div', { class: 'r-col' }, bar,
      h('div', { class: 'r-day' }, x.d.toDateString() === new Date().toDateString() ? '今日' : WEEKDAY[x.d.getDay()]));
  });
  show(data[data.length - 1]);
  return h('div', { class: 'r-chart-wrap' },
    h('div', { class: 'r-chart-title' }, '過去 7 日：每日答題數'),
    h('div', { class: 'r-chart' }, bars),
    readout);
}

export function reportScreen({ show, back }) {
  let period = 7;

  function render() {
    const byGame = totalsFor(lastDays(period));
    const all = Object.values(byGame).reduce((a, b) => add(a, b), empty());
    const weak = needsPractice();

    const seg = h('div', { class: 'p-seg r-period' }, PERIODS.map(([n, label]) =>
      h('button', { class: n === period ? 'on' : '', onclick: () => { period = n; render(); } }, label)));

    const tiles = h('div', { class: 'r-tiles' },
      [['回合', all.rounds], ['答題', answered(all) + all.seen],
        ['一次答啱', pct(all) == null ? '—' : `${pct(all)}%`], ['淨攞星星', `⭐ ${all.gained - all.lost}`]]
        .map(([label, value]) => h('div', { class: 'r-tile' }, h('div', { class: 'r-tile-value' }, value), h('div', { class: 'r-tile-label' }, label))));

    const sections = SECTIONS.map(sec => {
      const t = sec.games.reduce((a, [g]) => add(a, byGame[g] || empty()), empty());
      const played = sec.games.filter(([g]) => byGame[g]);
      const p = pct(t);
      return h('section', { class: 'p-section r-section' },
        h('div', { class: 'r-section-head' },
          h('h3', {}, sec.name),
          h('div', { class: 'r-section-acc' }, p == null ? (t.rounds ? '' : '未玩') : `一次答啱 ${p}%`)),
        played.length
          ? played.map(([g, name]) => gameRow(g, name, byGame[g]))
          : h('p', { class: 'p-muted' }, '呢段時間未玩。'),
        weak[sec.key].length
          ? h('div', { class: 'r-weak' },
            h('div', { class: 'r-weak-title' }, '要多練習'),
            weak[sec.key].map(x => h('div', { class: 'r-weak-item' },
              h('span', { class: 'r-weak-label' }, x.label),
              h('span', { class: 'r-sub' }, `啱 ${x.right} / ${x.tries} 次`))))
          : null);
    });

    show(h('div', { class: 'screen parent report' },
      h('div', { class: 'topbar' },
        h('button', { class: 'icon-btn', 'aria-label': '返回', onclick: back }, '⬅️'),
        h('div', { class: 'title' }, '📈 學習報告'),
        h('div', {})),
      h('div', { class: 'body' },
        seg,
        all.rounds || answered(all) || all.seen ? tiles : h('p', { class: 'p-muted r-empty' }, '呢段時間未有紀錄。玩完一回合就會見到。'),
        h('section', { class: 'p-section' }, weekChart()),
        sections,
        h('p', { class: 'p-foot' }, '「一次答啱」：第一次就揀啱嘅百分比。「要多練習」：答過最少 2 次而啱少過 8 成嘅題目（計晒所有紀錄）。'))));
  }

  render();
}
