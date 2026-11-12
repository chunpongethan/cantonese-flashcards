// 🕒 Clock & Numbers — two kinds of question (mixed):
//   clock:  a clock showing an hour → "What time is it?" → pick "three o'clock"
//   number: a big number (8)       → pick the number word "eight"
import { h, shuffle, sample, wait } from '../ui.js';
import { NUMBER_WORDS } from '../english-lessons.js';

// A simple clock face showing `hour` o'clock.
function clockSVG(hour) {
  const nums = Array.from({ length: 12 }, (_, k) => {
    const n = k + 1;
    const a = (n / 12) * 2 * Math.PI - Math.PI / 2;
    return `<text x="${(50 + 34 * Math.cos(a)).toFixed(1)}" y="${(50 + 34 * Math.sin(a)).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="#3E2723" font-family="system-ui, sans-serif">${n}</text>`;
  }).join('');
  const ticks = Array.from({ length: 60 }, (_, k) => {
    const a = (k / 60) * 2 * Math.PI;
    const r1 = k % 5 ? 43 : 41;
    return `<line x1="${(50 + r1 * Math.sin(a)).toFixed(1)}" y1="${(50 - r1 * Math.cos(a)).toFixed(1)}" x2="${(50 + 45 * Math.sin(a)).toFixed(1)}" y2="${(50 - 45 * Math.cos(a)).toFixed(1)}" stroke="#BCAAA4" stroke-width="${k % 5 ? 0.6 : 1.4}"/>`;
  }).join('');
  const ha = (hour % 12) / 12 * 2 * Math.PI;
  const hx = (50 + 20 * Math.sin(ha)).toFixed(1);
  const hy = (50 - 20 * Math.cos(ha)).toFixed(1);
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="clock">
    <circle cx="50" cy="50" r="48" fill="#fff" stroke="#FF8A65" stroke-width="3.5"/>
    ${ticks}${nums}
    <line x1="50" y1="50" x2="50" y2="14" stroke="#42A5F5" stroke-width="3" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="${hx}" y2="${hy}" stroke="#E53935" stroke-width="5" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="3.5" fill="#3E2723"/>
  </svg>`;
}

export function start(ctx) {
  let i = 0;

  async function round() {
    if (!ctx.alive()) return;
    const item = ctx.words[i];
    ctx.progress(i, ctx.words.length);
    const isClock = item.kind === 'clock';
    // Wrong choices: nearby numbers first, so it's about reading, not guessing.
    const near = NUMBER_WORDS.filter((w, k) => w !== item.word && Math.abs(k + 1 - item.n) <= 3);
    const others = sample(near, 2);
    const choices = shuffle([item.word, ...others]);
    const label = w => (isClock ? `${w} o'clock` : w);
    const question = isClock ? 'What time is it?' : 'Which word is this number?';
    let firstTry = true;
    let locked = false;

    const ask = () => ctx.speak(question);
    const top = h('div', { class: `clock-card ${isClock ? '' : 'number'}` });
    if (isClock) top.innerHTML = clockSVG(item.n);
    else top.textContent = String(item.n);
    const speaker = h('button', { class: 'speaker-btn small', 'aria-label': 'Listen', onclick: () => { ctx.sfx.tap(); ask(); } }, '🔊');

    const buttons = choices.map(w => {
      const b = h('button', { class: 'choice clock-choice' }, label(w));
      b.addEventListener('click', async () => {
        if (locked || b.classList.contains('dim')) return;
        if (w === item.word) {
          locked = true;
          b.classList.add('correct');
          ctx.sfx.chime();
          ctx.confetti();
          ctx.record(item, firstTry);
          ctx.star();
          await ctx.speak(isClock ? `${ctx.praise()} It is ${item.word} o'clock.` : `${ctx.praise()} ${item.n} is ${item.word}.`);
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
          await ctx.speak(isClock ? `Not ${w}. Look at the short red hand.` : `That says ${w}. Try again.`);
        }
      });
      return b;
    });

    ctx.body.replaceChildren(h('div', { class: 'pick-stage' },
      h('div', { class: 'pick-top' }, top, speaker),
      h('div', { class: 'clock-question' }, question),
      h('div', { class: 'choices n3' }, buttons)));

    await wait(250);
    ask();
  }

  round();
}
