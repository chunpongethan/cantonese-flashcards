// 聽聽揀揀 — Listen & Pick: hear a word, tap the matching character.
import { h, pic, hanzi, shuffle, sample, wait } from '../ui.js';

export function start(ctx) {
  let i = 0;

  function distractors(w, n) {
    const ok = x => x.id !== w.id && x.char !== w.char && [...x.char].length === [...w.char].length;
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

    // Colour words read the bare character here ("紅" not "紅色") so it sounds like 「邊個係紅字？」.
    const target = w.color ? w.char : w.say;
    const question = `邊個係${target}字？`;
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
          await ctx.speak(`${ctx.praise()}${w.say}！`);
          await wait(400);
          if (!ctx.alive()) return;
          i++;
          if (i >= ctx.words.length) ctx.done(); else round();
        } else {
          firstTry = false;
          ctx.wiggle(b);
          b.classList.add('dim');
          ctx.sfx.boop();
          await ctx.speak(`呢個係${c.say}。再試吓，${question}`);
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
