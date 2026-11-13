// 數學 — Maths: adding and taking away, tap the right answer.
// 1-digit questions show apples to count; 2–3 digit questions are shown in columns (豎式).
import { h, shuffle, wait } from '../ui.js';

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

export function makeQuestion(op, digits) {
  const max = 10 ** digits - 1;
  let a = randInt(1, max);
  let b = randInt(1, max);
  if (op === '-' && b > a) [a, b] = [b, a]; // never a negative answer
  return { a, b, op, answer: op === '+' ? a + b : a - b };
}

// Wrong choices that look like real mistakes: off by one or two, off by ten, or the wrong sign.
export function distractors(q, digits, n) {
  const deltas = [1, -1, 2, -2];
  if (digits === 1) deltas.push(3, -3);
  if (digits >= 2) deltas.push(10, -10, 11, -9);
  if (digits >= 3) deltas.push(100, -100);
  const out = new Set();
  const wrongSign = q.op === '+' ? q.a - q.b : q.a + q.b;
  if (wrongSign >= 0 && wrongSign !== q.answer && Math.random() < 0.6) out.add(wrongSign);
  for (const d of shuffle(deltas)) {
    if (out.size >= n) break;
    const v = q.answer + d;
    if (v >= 0 && v !== q.answer) out.add(v);
  }
  return [...out].slice(0, n);
}

const SIGN = { '+': '+', '-': '−' };
const WORD = { '+': '加', '-': '減' };

function counters(n, emoji, goneFrom = Infinity) {
  return h('span', { class: 'apple-group' },
    Array.from({ length: n }, (_, k) => h('span', { class: k >= goneFrom ? 'gone' : '' }, emoji)));
}

// "3 + 2 = ?" with apples underneath.
function horizontal(q, slot) {
  const apples = q.op === '+'
    ? h('div', { class: 'apples' }, counters(q.a, '🍎'), h('span', { class: 'apple-op' }, '+'), counters(q.b, '🍏'))
    : h('div', { class: 'apples' }, counters(q.a, '🍎', q.a - q.b));
  return h('div', { class: 'maths-h' },
    h('div', { class: 'eq' },
      h('span', {}, q.a), h('span', { class: 'op' }, SIGN[q.op]), h('span', {}, q.b),
      h('span', { class: 'op' }, '='), slot),
    apples);
}

// Column layout (豎式) for bigger numbers.
function vertical(q, slot) {
  return h('div', { class: 'maths-v' },
    h('div', { class: 'vrow' }, h('span', { class: 'vop' }), h('span', { class: 'vnum' }, q.a)),
    h('div', { class: 'vrow' }, h('span', { class: 'vop' }, SIGN[q.op]), h('span', { class: 'vnum' }, q.b)),
    h('div', { class: 'vline' }),
    h('div', { class: 'vrow' }, h('span', { class: 'vop' }), slot));
}

export function start(ctx) {
  const digits = [1, 2, 3].includes(ctx.settings.mathDigits) ? ctx.settings.mathDigits : 1;
  const ops = ctx.op === 'mix' ? ['+', '-'] : [ctx.op];
  const total = ctx.settings.roundSize;
  const asked = new Set();
  let i = 0;

  function nextQuestion() {
    let q;
    for (let tries = 0; tries < 30; tries++) {
      q = makeQuestion(ops[Math.floor(Math.random() * ops.length)], digits);
      const key = `${q.a}${q.op}${q.b}`;
      if (!asked.has(key)) { asked.add(key); break; }
    }
    return q;
  }

  async function round() {
    if (!ctx.alive()) return;
    ctx.progress(i, total);
    const q = nextQuestion();
    const question = `${q.a}${WORD[q.op]}${q.b}等於幾多？`;
    const ask = () => ctx.speak(question);
    let locked = false;
    let firstTry = true;

    const slot = h('span', { class: digits === 1 ? 'ans' : 'vnum ans' }, '?');
    const n = digits === 1 ? 3 : 4;
    const choices = shuffle([q.answer, ...distractors(q, digits, n - 1)]);

    const buttons = choices.map(v => {
      const b = h('button', { class: 'choice num-choice' }, String(v));
      b.addEventListener('click', async () => {
        if (locked || b.classList.contains('dim')) return;
        if (v === q.answer) {
          locked = true;
          b.classList.add('correct');
          slot.textContent = String(q.answer);
          slot.classList.add('right');
          ctx.sfx.chime();
          ctx.confetti();
          ctx.record({ id: `math-${q.op}-${digits}d` }, firstTry);
          ctx.star();
          await ctx.speak(`${ctx.praise()}${q.a}${WORD[q.op]}${q.b}等於${q.answer}！`);
          await wait(400);
          if (!ctx.alive()) return;
          i++;
          if (i >= total) ctx.done(); else round();
        } else {
          firstTry = false;
          ctx.wiggle(b);
          b.classList.add('dim');
          ctx.sfx.boop();
          ctx.lose();
          await ctx.speak(`唔係${v}呀，再諗吓。${question}`);
        }
      });
      return b;
    });

    const speaker = h('button', { class: 'speaker-btn small', 'aria-label': '再聽', onclick: () => { ctx.sfx.tap(); ask(); } }, '🔊');

    ctx.body.replaceChildren(h('div', { class: 'maths-stage' },
      h('div', { class: 'maths-card' }, digits === 1 ? horizontal(q, slot) : vertical(q, slot)),
      speaker,
      h('div', { class: `choices n${n}` }, buttons)));

    await wait(250);
    ask();
  }

  round();
}
