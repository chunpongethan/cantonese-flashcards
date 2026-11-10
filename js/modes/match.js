// 配對遊戲 — Matching Pairs: find the picture card and its character card.
import { h, pic, hanzi, shuffle, wait } from '../ui.js';

export function start(ctx) {
  // Split the round into boards of at most 4 pairs (8 cards fit a phone screen).
  const words = ctx.words;
  const perBoard = words.length <= 4 ? words.length : Math.ceil(words.length / 2);
  const boards = [];
  for (let k = 0; k < words.length; k += perBoard) boards.push(words.slice(k, k + perBoard));
  let b = 0;

  function play() {
    const boardWords = boards[b];
    ctx.progress(b, boards.length);
    const cards = shuffle(boardWords.flatMap(w => [{ w, kind: 'pic' }, { w, kind: 'char' }]));
    let open = [];
    let matched = 0;
    let busy = false;

    const els = cards.map(c => {
      const el = h('button', { class: 'mcard' },
        h('div', { class: 'mface mback' }, '❓'),
        h('div', { class: `mface mfront ${c.kind}` },
          c.kind === 'pic' ? pic(c.w) : hanzi(c.w, ctx.settings.jyutping)));

      el.addEventListener('click', async () => {
        if (busy || el.classList.contains('open')) return;
        el.classList.add('open');
        ctx.sfx.flip();
        ctx.say(c.w);
        open.push({ c, el });
        if (open.length < 2) return;

        busy = true;
        const [x, y] = open;
        open = [];
        if (x.c.w.id === y.c.w.id) {
          await wait(450);
          x.el.classList.add('matched');
          y.el.classList.add('matched');
          ctx.sfx.chime();
          ctx.confetti(14);
          ctx.record(c.w, true);
          ctx.star();
          matched++;
          busy = false;
          if (matched === boardWords.length) {
            await ctx.speak(ctx.praise());
            await wait(300);
            if (!ctx.alive()) return;
            b++;
            if (b >= boards.length) ctx.done(); else play();
          }
        } else {
          await wait(1200);
          x.el.classList.remove('open');
          y.el.classList.remove('open');
          busy = false;
        }
      });
      return el;
    });

    ctx.body.replaceChildren(h('div', { class: `match-grid n${cards.length}` }, els));
  }

  play();
}
