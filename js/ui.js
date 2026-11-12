// Small DOM helpers shared by every screen.
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = (arr, n) => shuffle(arr).slice(0, n);
export const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
export const wait = ms => new Promise(r => setTimeout(r, ms));

// The picture side of a word: emoji, repeated emoji (numbers) or a colour swatch.
export function pic(word, extraClass = '') {
  if (word.img) {
    return h('img', { class: `pic photo ${extraClass}`, src: word.img, alt: '', draggable: 'false' });
  }
  if (word.color) {
    return h('div', { class: `pic swatch ${extraClass}`, style: { background: word.color } });
  }
  if (word.count) {
    return h('div', { class: `pic count c${word.count} ${extraClass}` },
      Array.from({ length: word.count }, () => h('span', {}, word.emoji)));
  }
  return h('div', { class: `pic emoji ${extraClass}` }, word.emoji);
}

// The character side of a word, with optional Jyutping underneath.
export function hanzi(word, showJyutping = false) {
  if (word.lang === 'en') {
    // English word, sized by length; the hint underneath is the Chinese word.
    const n = word.char.length;
    const size = n <= 4 ? 'short' : n <= 7 ? 'mid' : 'long';
    return h('div', { class: 'hanzi-wrap' },
      h('div', { class: `latin ${size}` }, word.char),
      showJyutping && word.zh ? h('div', { class: 'zh-hint' }, word.zh) : null);
  }
  const len = [...word.char].length;
  return h('div', { class: 'hanzi-wrap' },
    h('div', { class: `hanzi len${len}` }, word.char),
    showJyutping && word.jyutping ? h('div', { class: 'jyutping' }, word.jyutping) : null);
}

export function wiggle(el) {
  el.classList.remove('wiggle');
  void el.offsetWidth;
  el.classList.add('wiggle');
}

const CONFETTI = ['⭐', '🌟', '✨', '🎉', '💛', '🟡', '🔵', '🟢', '🔴', '🟣'];

export function confetti(n = 24) {
  const layer = document.getElementById('fx');
  for (let i = 0; i < n; i++) {
    const p = h('span', { class: 'confetti' }, pickOne(CONFETTI));
    p.style.left = `${Math.random() * 100}vw`;
    p.style.animationDelay = `${Math.random() * 0.3}s`;
    p.style.animationDuration = `${1.2 + Math.random() * 0.9}s`;
    p.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    p.style.setProperty('--spin', `${(Math.random() - 0.5) * 720}deg`);
    layer.append(p);
    setTimeout(() => p.remove(), 2600);
  }
}
