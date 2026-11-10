// Cantonese text-to-speech using the browser's built-in voices.
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

let voices = [];
let chosen = null;
let preferredURI = '';
let rate = 0.8;
let current = null; // keep a reference so Chrome doesn't garbage-collect the utterance
const listeners = new Set();

function isCantonese(v) {
  const lang = (v.lang || '').toLowerCase().replace('_', '-');
  return lang === 'zh-hk' || lang.startsWith('yue') || lang === 'zh-yue' ||
    /cantonese|粵|廣東|hong kong/i.test(v.name);
}

function quality(v) {
  let s = 0;
  if (/premium|enhanced|natural|neural|online/i.test(v.name)) s += 3;
  if (/google/i.test(v.name)) s += 2;
  if (v.localService) s += 1;
  return s;
}

function refresh() {
  voices = synth ? synth.getVoices() : [];
  const list = cantoneseVoices();
  chosen = list.find(v => v.voiceURI === preferredURI) || list[0] || null;
  listeners.forEach(fn => fn());
}

export const supported = () => !!synth;
export const cantoneseVoices = () => voices.filter(isCantonese).sort((a, b) => quality(b) - quality(a));
export const hasCantonese = () => !!chosen;
export const currentVoice = () => chosen;
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

if (synth) {
  refresh();
  synth.onvoiceschanged = refresh;
  // Some browsers (iOS Safari) load voices late without firing the event.
  [250, 1000, 2500, 5000].forEach(ms => setTimeout(refresh, ms));
}

export function configure({ voiceURI, rate: r } = {}) {
  if (voiceURI !== undefined) { preferredURI = voiceURI; refresh(); }
  if (r !== undefined) rate = r;
}

// iOS only allows speech that starts from a tap; call this from the first tap.
export function unlock() {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}

export function cancel() {
  if (synth) synth.cancel();
}

// Speak text and resolve when finished (or after a safety timeout).
export function speak(text, opts = {}) {
  if (!synth || !text) return Promise.resolve();
  synth.cancel();
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = chosen ? chosen.lang : 'zh-HK';
    if (chosen) u.voice = chosen;
    u.rate = opts.rate ?? rate;
    u.pitch = 1.1;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (current === u) current = null;
      resolve();
    };
    const timer = setTimeout(finish, 1500 + (text.length * 550) / u.rate);
    u.onend = finish;
    u.onerror = finish;
    current = u;
    synth.speak(u);
  });
}
