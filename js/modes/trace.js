// 寫寫字 — Tracing: watch the stroke order, then trace the character with a finger.
// Uses Hanzi Writer (https://hanziwriter.org, MIT) with stroke data from hanzi-writer-data.
import { h, pic, wait } from '../ui.js';

const DATA_URL = ch => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(ch)}.json`;
const cache = new Map(); // char -> Promise<data | null>

export function loadChar(ch) {
  if (!cache.has(ch)) {
    cache.set(ch, fetch(DATA_URL(ch))
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null));
  }
  return cache.get(ch);
}

async function traceable(word) {
  const results = await Promise.all([...word.char].map(loadChar));
  return results.every(Boolean);
}

export async function start(ctx) {
  if (!window.HanziWriter) {
    ctx.body.replaceChildren(h('div', { class: 'notice' }, '🌐', h('p', {}, '寫字模式要上網先用到')));
    return;
  }

  ctx.body.replaceChildren(h('div', { class: 'notice loading' }, '✍️'));
  const ok = await Promise.all(ctx.words.map(traceable));
  if (!ctx.alive()) return;
  const words = ctx.words.filter((_, k) => ok[k]);
  if (!words.length) {
    ctx.body.replaceChildren(h('div', { class: 'notice' }, '🌐', h('p', {}, '載入唔到筆順，請檢查網絡')));
    return;
  }

  let i = 0;
  let writer = null;

  async function doWord() {
    if (!ctx.alive()) return;
    const w = words[i];
    ctx.progress(i, words.length);
    const chars = [...w.char];
    let ci = 0;
    let mistakes = 0;

    const size = Math.floor(Math.min(window.innerWidth - 40, window.innerHeight * 0.48, 380));
    const target = h('div', { class: 'trace-box', style: { width: `${size}px`, height: `${size}px` } });
    const wordLine = h('div', { class: 'trace-word' },
      chars.map((ch, k) => h('span', { class: k === 0 ? 'now' : '' }, ch)));
    const watchBtn = h('button', { class: 'big-btn', 'aria-label': '睇筆順' }, '👀');
    const sayBtn = h('button', { class: 'big-btn', 'aria-label': '再聽', onclick: () => { ctx.sfx.tap(); ctx.say(w); } }, '🔊');

    ctx.body.replaceChildren(h('div', { class: 'trace-stage' },
      h('div', { class: 'trace-top' }, pic(w, 'small'), wordLine),
      target,
      h('div', { class: 'controls' }, sayBtn, watchBtn)));

    writer = window.HanziWriter.create(target, chars[0], {
      width: size,
      height: size,
      padding: Math.round(size * 0.06),
      showOutline: true,
      showCharacter: false,
      strokeColor: '#37474F',
      outlineColor: '#E0E0E0',
      drawingColor: '#FF7043',
      drawingWidth: Math.max(20, Math.round(size / 14)),
      highlightColor: '#FFB300',
      strokeAnimationSpeed: 0.9,
      delayBetweenStrokes: 300,
      charDataLoader: (ch, onLoad, onError) => loadChar(ch).then(d => (d ? onLoad(d) : onError())),
    });

    async function demoThenQuiz() {
      writer.cancelQuiz();
      await writer.animateCharacter();
      if (!ctx.alive()) return;
      await wait(400);
      await writer.hideCharacter();
      if (!ctx.alive()) return;
      writer.quiz({
        leniency: 1.5,
        showHintAfterMisses: 2,
        highlightOnComplete: true,
        onCorrectStroke: () => ctx.sfx.pop(),
        onMistake: () => { mistakes++; ctx.sfx.boop(); },
        onComplete: () => charDone(),
      });
    }

    async function charDone() {
      ctx.sfx.chime();
      wordLine.children[ci].classList.replace('now', 'done');
      await wait(700);
      if (!ctx.alive()) return;
      ci++;
      if (ci < chars.length) {
        wordLine.children[ci].classList.add('now');
        await writer.setCharacter(chars[ci]);
        demoThenQuiz();
        return;
      }
      ctx.record(w, mistakes <= 2);
      ctx.star();
      ctx.confetti();
      await ctx.speak(`${ctx.praise()}${w.say}！`);
      await wait(300);
      if (!ctx.alive()) return;
      i++;
      if (i >= words.length) ctx.done(); else doWord();
    }

    watchBtn.addEventListener('click', () => { ctx.sfx.tap(); demoThenQuiz(); });

    await ctx.say(w);
    if (!ctx.alive()) return;
    demoThenQuiz();
  }

  doWord();
}
