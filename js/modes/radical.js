// 部首 — Radical game, like the school book's "find the radical" pages.
// Two kinds of question (mixed):
//   1. Show a character → "「晴」字嘅部首係乜嘢？" → pick the radical.
//   2. Show a radical  → "邊個字嘅部首係「日」？" → pick the character.
// After the right answer the character is redrawn with its radical strokes in colour.
import { h, shuffle, sample, wait } from '../ui.js';
import { RADICALS } from '../lessons.js';
import { loadChar } from './trace.js';

const RADICAL_COLOUR = '#FF7043';

// Draw `char` with its radical strokes highlighted (falls back to plain text).
async function showRadical(box, char) {
  box.replaceChildren(h('div', { class: 'rad-big' }, char));
  const data = window.HanziWriter ? await loadChar(char) : null;
  if (!data || !box.isConnected) return;
  const size = Math.round(Math.min(box.clientWidth || 150, 150));
  const holder = h('div', { class: 'rad-writer' });
  box.replaceChildren(holder);
  window.HanziWriter.create(holder, char, {
    width: size,
    height: size,
    padding: 6,
    showOutline: false,
    strokeColor: '#37474F',
    radicalColor: data.radStrokes ? RADICAL_COLOUR : null,
    charDataLoader: (c, onLoad) => onLoad(data),
  });
}

export function start(ctx) {
  let i = 0;

  async function round() {
    if (!ctx.alive()) return;
    const item = ctx.words[i];
    ctx.progress(i, ctx.words.length);
    const R = RADICALS[item.rad];
    const askRadical = Math.random() < 0.6;
    let firstTry = true;
    let locked = false;

    let question;
    let choices;
    const top = h('div', { class: 'rad-card' });
    if (askRadical) {
      question = `「${item.char}」字嘅部首係乜嘢？`;
      top.append(h('div', { class: 'rad-big' }, item.char));
      const others = sample(Object.keys(RADICALS).filter(r => r !== item.rad), 2);
      choices = shuffle([item.rad, ...others]).map(r => ({
        label: RADICALS[r].label, right: r === item.rad, wrongSay: `唔係「${RADICALS[r].say}」，再諗吓。`,
      }));
    } else {
      question = `邊個字嘅部首係「${R.say}」？`;
      top.append(h('div', { class: 'rad-big rad-radical' }, R.label), h('div', { class: 'rad-tag' }, '部首'));
      const others = sample(ctx.pool.filter(x => x.rad !== item.rad), 2);
      choices = shuffle([item, ...others]).map(x => ({
        label: x.char, right: x === item, wrongSay: `${x.char}字嘅部首係${RADICALS[x.rad].say}，再試吓。`,
      }));
    }

    const ask = () => ctx.speak(question);
    const speaker = h('button', { class: 'speaker-btn small', 'aria-label': '再聽', onclick: () => { ctx.sfx.tap(); ask(); } }, '🔊');

    const buttons = choices.map(c => {
      const b = h('button', { class: `choice rad-choice ${askRadical ? 'is-radical' : ''}` }, c.label);
      b.addEventListener('click', async () => {
        if (locked || b.classList.contains('dim')) return;
        if (c.right) {
          locked = true;
          b.classList.add('correct');
          ctx.sfx.chime();
          ctx.confetti();
          ctx.record(item, firstTry);
          ctx.star();
          top.classList.add('solved');
          showRadical(top, item.char);
          await ctx.speak(`${ctx.praise()}「${item.char}」字嘅部首係${R.say}。`);
          await wait(700);
          if (!ctx.alive()) return;
          i++;
          if (i >= ctx.words.length) ctx.done(); else round();
        } else {
          firstTry = false;
          ctx.wiggle(b);
          b.classList.add('dim');
          ctx.sfx.boop();
          ctx.lose();
          await ctx.speak(c.wrongSay);
        }
      });
      return b;
    });

    ctx.body.replaceChildren(h('div', { class: 'pick-stage' },
      h('div', { class: 'pick-top' }, top, speaker),
      h('div', { class: 'rad-question' }, askRadical ? '部首係？' : '邊個字？'),
      h('div', { class: 'choices n3' }, buttons)));

    await wait(250);
    ask();
  }

  round();
}
