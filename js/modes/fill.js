// 填字 — Fill in the sentence, like the bottom of each school book page:
// a sentence with a blank, and a choice of characters (the page's pair plus one more).
import { h, shuffle, sample, wait } from '../ui.js';

export function start(ctx) {
  let i = 0;
  const allChars = [...new Set(ctx.pool.flatMap(x => x.pair))];

  async function round() {
    if (!ctx.alive()) return;
    const item = ctx.words[i];
    ctx.progress(i, ctx.words.length);
    const [before, after] = item.text.split('__');
    const extra = sample(allChars.filter(c => !item.pair.includes(c)), 1);
    const choices = shuffle([...item.pair, ...extra]);
    const full = before + item.answer + after;
    let firstTry = true;
    let locked = false;

    // Read the sentence with a short pause where the blank is.
    const readWithGap = async () => {
      if (before) await ctx.speak(before);
      if (!ctx.alive()) return;
      await wait(450);
      if (after.replace(/[。？！，]/g, '')) await ctx.speak(after);
    };

    const slot = h('span', { class: 'fill-slot' }, '？');
    const sentence = h('div', { class: 'fill-sentence' }, before, slot, after);
    const speaker = h('button', { class: 'speaker-btn small', 'aria-label': '再聽', onclick: () => { ctx.sfx.tap(); readWithGap(); } }, '🔊');

    const buttons = choices.map(c => {
      const b = h('button', { class: 'choice fill-choice' }, c);
      b.addEventListener('click', async () => {
        if (locked || b.classList.contains('dim')) return;
        if (c === item.answer) {
          locked = true;
          b.classList.add('correct');
          slot.textContent = c;
          slot.classList.add('right');
          ctx.sfx.chime();
          ctx.confetti();
          ctx.record(item, firstTry);
          ctx.star();
          await ctx.speak(`${ctx.praise()}${full}`);
          await wait(500);
          if (!ctx.alive()) return;
          i++;
          if (i >= ctx.words.length) ctx.done(); else round();
        } else {
          firstTry = false;
          ctx.wiggle(b);
          b.classList.add('dim');
          ctx.sfx.boop();
          ctx.lose();
          await ctx.speak(`唔係「${c}」，再試吓。`);
        }
      });
      return b;
    });

    ctx.body.replaceChildren(h('div', { class: 'fill-stage' },
      h('div', { class: 'fill-card' }, sentence),
      speaker,
      h('div', { class: 'fill-hint' }, '揀啱嘅字填入格仔'),
      h('div', { class: `choices n${choices.length}` }, buttons)));

    await wait(250);
    readWithGap();
  }

  round();
}
