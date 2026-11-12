// 📝 Fill In (English) — a sentence with a blank and a picture clue; pick the word.
import { h, shuffle, sample, wait } from '../ui.js';
import { EN_WORDS } from '../english-lessons.js';

export function start(ctx) {
  let i = 0;

  async function round() {
    if (!ctx.alive()) return;
    const item = ctx.words[i];
    ctx.progress(i, ctx.words.length);
    const [before, after] = item.text.split('__');
    const sameGroup = EN_WORDS.filter(w => w.group === item.group && w.char !== item.answer && w.cat === 'enclass').map(w => w.char);
    const others = sample(sameGroup, 2);
    const choices = shuffle([item.answer, ...others]);
    const full = before + item.answer + after;
    let firstTry = true;
    let locked = false;

    const readWithGap = async () => {
      if (before.trim()) await ctx.speak(before);
      if (!ctx.alive()) return;
      await wait(450);
      if (after.replace(/[."!?\s]/g, '')) await ctx.speak(after);
    };

    const slot = h('span', { class: 'fill-slot en' }, '?');
    const sentence = h('div', { class: 'fill-sentence en' }, before, slot, after);
    const speaker = h('button', { class: 'speaker-btn small', 'aria-label': 'Listen', onclick: () => { ctx.sfx.tap(); readWithGap(); } }, '🔊');

    const buttons = choices.map(c => {
      const b = h('button', { class: 'choice fill-choice en' }, c);
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
          await ctx.speak(`${ctx.praise()} ${full}`);
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
          await ctx.speak(`Not ${c}. Try again.`);
        }
      });
      return b;
    });

    ctx.body.replaceChildren(h('div', { class: 'fill-stage' },
      h('div', { class: 'fill-card' },
        h('div', { class: 'fill-pic' }, item.emoji),
        sentence),
      speaker,
      h('div', { class: `choices n${choices.length}` }, buttons)));

    await wait(250);
    readWithGap();
  }

  round();
}
