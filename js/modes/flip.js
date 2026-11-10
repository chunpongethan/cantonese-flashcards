// 翻翻卡 — Flip & Listen: see the picture, tap to flip, hear and see the word.
import { h, pic, hanzi } from '../ui.js';

export function start(ctx) {
  let i = 0;

  const next = () => {
    ctx.sfx.tap();
    i++;
    if (i >= ctx.words.length) ctx.done();
    else showCard();
  };

  function showCard() {
    const w = ctx.words[i];
    ctx.progress(i, ctx.words.length);
    let flipped = false;
    let revealed = false;

    const card = h('button', { class: 'flipcard', 'aria-label': '翻卡' },
      h('div', { class: 'face front' }, pic(w), h('div', { class: 'tap-hint' }, '👆')),
      h('div', { class: 'face back' }, hanzi(w, ctx.settings.jyutping), pic(w, 'small')));

    const nextBtn = h('button', { class: 'big-btn next hidden', 'aria-label': '下一張', onclick: next }, '➡️');
    const sayBtn = h('button', { class: 'big-btn', 'aria-label': '再聽', onclick: () => { ctx.sfx.tap(); ctx.say(w); } }, '🔊');

    const flip = () => {
      ctx.sfx.flip();
      flipped = !flipped;
      card.classList.toggle('flipped', flipped);
      if (flipped) ctx.say(w);
      if (flipped && !revealed) {
        revealed = true;
        nextBtn.classList.remove('hidden');
        ctx.seen(w);
        ctx.star();
      }
    };

    // Tap flips; swipe left goes to the next card once it has been revealed.
    let startX = null;
    let moved = false;
    card.addEventListener('pointerdown', e => { startX = e.clientX; moved = false; });
    card.addEventListener('pointermove', e => { if (startX !== null && Math.abs(e.clientX - startX) > 15) moved = true; });
    card.addEventListener('pointerup', e => {
      const dx = startX === null ? 0 : e.clientX - startX;
      startX = null;
      if (moved && dx < -60 && revealed) next();
    });
    card.addEventListener('click', () => { if (!moved) flip(); });

    ctx.body.replaceChildren(
      h('div', { class: 'flip-stage' }, card),
      h('div', { class: 'controls' }, sayBtn, nextBtn));
  }

  showCard();
}
