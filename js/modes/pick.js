// 聽聽揀揀 — Listen & Pick: hear a word, tap the matching character.
import { h, pic, hanzi, shuffle, sample, wait } from '../ui.js';

// What the voice says, in Cantonese or English.
const TEXT = {
  zh: {
    // Colour words read the bare character here ("紅" not "紅色") so it sounds like 「邊個係紅字？」.
    ask: w => `邊個係${w.color ? w.char : w.say}字？`,
    right: (praise, w) => `${praise}${w.say}！`,
    wrong: (c, question) => `呢個係${c.say}。再試吓，${question}`,
  },
  en: {
    ask: w => `Which one is ${w.say}?`,
    right: (praise, w) => `${praise} ${w.say}!`,
    wrong: (c, question) => `That is ${c.say}. Try again. ${question}`,
  },
};

export function start(ctx) {
  let i = 0;
  const english = ctx.lang === 'en';
  const t = english ? TEXT.en : TEXT.zh;

  function distractors(w, n) {
    // Chinese: prefer words with the same number of characters. English: any word.
    const ok = x => x.id !== w.id && x.char !== w.char &&
      (english || [...x.char].length === [...w.char].length);
    const same = ctx.pool.filter(x => ok(x) && x.cat === w.cat);
    let out = sample(same, n);
    if (out.length < n) {
      const others = ctx.pool.filter(x => ok(x) && x.cat !== w.cat);
      out = out.concat(sample(others, n - out.length));
    }
    if (out.length < n) { // e.g. few 2-character words: allow any length
      const any = ctx.pool.filter(x => x.id !== w.id && x.char !== w.char && !out.includes(x));
      out = out.concat(sample(any, n - out.length));
    }
    return out;
  }

  async function round() {
    if (!ctx.alive()) return;
    const w = ctx.words[i];
    ctx.progress(i, ctx.words.length);
    const nChoices = ctx.level(w.id) >= 3 ? 4 : 3;
    const choices = shuffle([w, ...distractors(w, nChoices - 1)]);
    let firstTry = true;
    let locked = false;

    const question = t.ask(w);
    const ask = () => ctx.speak(question);

    const reveal = h('div', { class: 'reveal' }, h('div', { class: 'reveal-q' }, '❓'), pic(w));
    const speaker = h('button', { class: 'speaker-btn', 'aria-label': '再聽', onclick: () => { ctx.sfx.tap(); ask(); } }, '🔊');

    const buttons = choices.map(c => {
      const b = h('button', { class: 'choice' }, hanzi(c, false));
      b.addEventListener('click', async () => {
        if (locked || b.classList.contains('dim')) return;
        if (c === w) {
          locked = true;
          b.classList.add('correct');
          reveal.classList.add('show');
          ctx.sfx.chime();
          ctx.confetti();
          ctx.record(w, firstTry);
          ctx.star();
          await ctx.speak(t.right(ctx.praise(), w));
          await wait(400);
          if (!ctx.alive()) return;
          i++;
          if (i >= ctx.words.length) ctx.done(); else round();
        } else {
          firstTry = false;
          ctx.wiggle(b);
          b.classList.add('dim');
          ctx.sfx.boop();
          ctx.lose();
          await ctx.speak(t.wrong(c, question));
        }
      });
      return b;
    });

    ctx.body.replaceChildren(h('div', { class: 'pick-stage' },
      h('div', { class: 'pick-top' }, reveal, speaker),
      h('div', { class: `choices n${choices.length}` }, buttons)));

    await wait(250);
    ask();
  }

  round();
}
