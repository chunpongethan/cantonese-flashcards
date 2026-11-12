// Text-to-speech using the browser's built-in voices:
// a Cantonese voice for Chinese, and an English voice (British first) for English.
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

let voices = [];
let chosen = null;     // Cantonese
let chosenEn = null;   // English
let preferredURI = '';
let preferredEnURI = '';
let rate = 0.8;
let current = null; // keep a reference so Chrome doesn't garbage-collect the utterance
const listeners = new Set();

function isCantonese(v) {
  const lang = (v.lang || '').toLowerCase().replace('_', '-');
  return lang === 'zh-hk' || lang.startsWith('yue') || lang === 'zh-yue' ||
    /cantonese|粵|廣東|hong kong/i.test(v.name);
}

const isEnglish = v => /^en([-_]|$)/i.test(v.lang || '');

function quality(v) {
  let s = 0;
  if (/premium|enhanced|natural|neural|online/i.test(v.name)) s += 3;
  if (/google/i.test(v.name)) s += 2;
  if (v.localService) s += 1;
  return s;
}

function englishScore(v) {
  const lang = v.lang.toLowerCase().replace('_', '-');
  return quality(v) + (lang === 'en-gb' ? 4 : lang === 'en-us' ? 2 : 0);
}

function refresh() {
  voices = synth ? synth.getVoices() : [];
  const zh = cantoneseVoices();
  chosen = zh.find(v => v.voiceURI === preferredURI) || zh[0] || null;
  const en = englishVoices();
  chosenEn = en.find(v => v.voiceURI === preferredEnURI) || en[0] || null;
  listeners.forEach(fn => fn());
}

export const supported = () => !!synth;
export const cantoneseVoices = () => voices.filter(isCantonese).sort((a, b) => quality(b) - quality(a));
export const englishVoices = () => voices.filter(isEnglish).sort((a, b) => englishScore(b) - englishScore(a));
export const hasCantonese = () => !!chosen;
export const currentVoice = () => chosen;
export const currentEnglishVoice = () => chosenEn;
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

if (synth) {
  refresh();
  synth.onvoiceschanged = refresh;
  // Some browsers (iOS Safari) load voices late without firing the event.
  [250, 1000, 2500, 5000].forEach(ms => setTimeout(refresh, ms));
}

export function configure({ voiceURI, enVoiceURI, rate: r } = {}) {
  if (voiceURI !== undefined) preferredURI = voiceURI;
  if (enVoiceURI !== undefined) preferredEnURI = enVoiceURI;
  if (voiceURI !== undefined || enVoiceURI !== undefined) refresh();
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
// opts.lang: 'en' for English, anything else for Cantonese.
export function speak(text, opts = {}) {
  if (!synth || !text) return Promise.resolve();
  synth.cancel();
  return new Promise(resolve => {
    const english = opts.lang === 'en';
    const voice = english ? chosenEn : chosen;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : english ? 'en-GB' : 'zh-HK';
    if (voice) u.voice = voice;
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
    const perChar = english ? 120 : 550;
    const timer = setTimeout(finish, 1500 + (text.length * perChar) / u.rate);
    u.onend = finish;
    u.onerror = finish;
    current = u;
    synth.speak(u);
  });
}
