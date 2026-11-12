// 🔡 Spelling — see the picture, hear the word, tap the letters in order.
import { h, pic, shuffle, wait } from '../ui.js';

const ABC = 'abcdefghijklmnopqrstuvwxyz';

// Only plain one-word English words fit this game (no "ice cream" or "T-shirt").
export const spellable = (w, maxLen) =>
  w.lang === 'en' && /^[a-z]+$/i.test(w.char) && w.char.length >= 2 && w.char.length <= maxLen;

export function start(ctx) {
  let i = 0;

  async function round() {
    if (!ctx.alive()) return;
    const w = ctx.words[i];
    ctx.progress(i, ctx.words.length);
    const letters = [...w.char.toLowerCase()];
    let pos = 0;
    let misses = 0;        // wrong taps on the current letter
    let penalised = false; // at most one star lost per word
    let locked = false;

    // The word's letters plus one or two spare letters, shuffled.
    const spare = shuffle([...ABC].filter(c => !letters.includes(c))).slice(0, letters.length <= 5 ? 2 : 1);
    const slots = letters.map(() => h('span', { class: 'slot' }));
    slots[0].classList.add('next');
    const slotRow = h('div', { class: 'slots' }, slots);
    slotRow.style.setProperty('--n', letters.length);

    const ask = () => ctx.speak(`Spell ${w.say}.`);

    let tiles = [];
    const hintNext = () => {
      const t = tiles.find(x => !x.disabled && x.dataset.l === letters[pos]);
      if (!t) return;
      t.classList.remove('hint');
      void t.offsetWidth;
      t.classList.add('hint');
    };

    async function tap(b) {
      if (locked || b.disabled) return;
      const l = b.dataset.l;
      if (l !== letters[pos]) {
        ctx.wiggle(b);
        ctx.sfx.boop();
        misses++;
        if (!penalised) { penalised = true; ctx.lose(); }
        if (misses >= 2) hintNext();
        ctx.speak(`Not ${l.toUpperCase()}. Try again.`);
        return;
      }
      b.disabled = true;
      b.classList.add('used');
      slots[pos].textContent = l;
      slots[pos].classList.replace('next', 'filled');
      ctx.sfx.pop();
      pos++;
      misses = 0;
      if (pos < letters.length) {
        slots[pos].classList.add('next');
        ctx.speak(l.toUpperCase());
        return;
      }
      // Whole word spelled.
      locked = true;
      slotRow.classList.add('done');
      ctx.sfx.chime();
      ctx.confetti();
      ctx.record(w, !penalised);
      ctx.star();
      await ctx.speak(`${letters.map(x => x.toUpperCase()).join(', ')}. ${w.say}! ${ctx.praise()}`);
      await wait(400);
      if (!ctx.alive()) return;
      i++;
      if (i >= ctx.words.length) ctx.done(); else round();
    }

    tiles = shuffle([...letters, ...spare]).map(l => {
      const b = h('button', { class: 'letter', 'data-l': l, 'aria-label': l }, l);
      b.addEventListener('click', () => tap(b));
      return b;
    });

    ctx.body.replaceChildren(h('div', { class: 'spell-stage' },
      h('div', { class: 'spell-top' },
        h('div', { class: 'spell-pic' }, pic(w), w.zh ? h('div', { class: 'zh-hint' }, w.zh) : null),
        h('div', { class: 'spell-buttons' },
          h('button', { class: 'speaker-btn small', 'aria-label': 'Listen', onclick: () => { ctx.sfx.tap(); ctx.say(w); } }, '🔊'),
          h('button', { class: 'big-btn hint-btn', 'aria-label': 'Hint', onclick: () => { ctx.sfx.tap(); hintNext(); } }, '💡'))),
      slotRow,
      h('div', { class: 'letters' }, tiles)));

    await wait(250);
    ask();
  }

  round();
}
