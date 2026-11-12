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

// Last real speech error (for the parent corner's sound check).
let lastError = '';

// The voice list can be rebuilt after page load (iOS/Android); always use the current object.
function liveVoice(v) {
  if (!v || !synth) return v;
  return synth.getVoices().find(x => x.voiceURI === v.voiceURI && x.name === v.name) || v;
}

// iOS only allows speech that starts from a tap; call this from the first tap.
export function unlock() {
  if (!synth) return;
  // Keep playing even when the iPhone's silent switch is on (Safari 16.4+).
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
  try {
    if (synth.paused) synth.resume();
    const u = new SpeechSynthesisUtterance('ok');
    u.volume = 0;
    u.rate = 2;
    synth.speak(u);
  } catch (e) { /* ignore */ }
}

export function cancel() {
  if (synth) synth.cancel();
}

function buildUtterance(text, opts) {
  const english = opts.lang === 'en';
  const voice = liveVoice(english ? chosenEn : chosen);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice ? voice.lang : english ? 'en-GB' : 'zh-HK';
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? rate;
  u.pitch = 1.1;
  return u;
}

// Speak text and resolve when finished (or after a safety timeout).
// opts.lang: 'en' for English, anything else for Cantonese.
export function speak(text, opts = {}) {
  if (!synth || !text) return Promise.resolve();
  // iOS Safari can silently drop an utterance queued in the same moment as cancel(),
  // so only cancel when something is playing, and then wait a beat before speaking.
  const busy = synth.speaking || synth.pending;
  if (busy) synth.cancel();
  // Android Chrome sometimes gets stuck "paused".
  if (synth.paused) synth.resume();
  return new Promise(resolve => {
    const u = buildUtterance(text, opts);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (current === u) current = null;
      resolve();
    };
    const perChar = opts.lang === 'en' ? 120 : 550;
    const timer = setTimeout(finish, 1800 + (text.length * perChar) / u.rate);
    u.onend = finish;
    u.onerror = e => {
      if (e && e.error && e.error !== 'interrupted' && e.error !== 'canceled') lastError = e.error;
      finish();
    };
    current = u;
    const go = () => { try { synth.speak(u); } catch (e) { lastError = e.message; finish(); } };
    if (busy) setTimeout(go, 80); else go();
  });
}

// Sound check for the parent corner: what this phone has, and whether a test sentence plays.
export async function selfTest(lang = 'zh') {
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  const r = {
    supported: !!synth,
    voices: synth ? synth.getVoices().length : 0,
    cantonese: cantoneseVoices().map(v => `${v.name} (${v.lang})`),
    english: englishVoices().length,
    using: chosen ? `${chosen.name} (${chosen.lang})` : '',
    isIOS,
    standalone,
    started: false,
    ended: false,
    error: lastError,
  };
  if (!synth) return r;
  refresh();
  synth.cancel();
  if (synth.paused) synth.resume();
  await new Promise(res => setTimeout(res, 100));
  await new Promise(res => {
    const u = buildUtterance(lang === 'en' ? 'Hello! This is a sound check.' : '你好！我係聲音測試。', { lang });
    const t = setTimeout(res, 5000);
    u.onstart = () => { r.started = true; };
    u.onend = () => { r.ended = true; clearTimeout(t); res(); };
    u.onerror = e => { r.error = (e && e.error) || 'error'; clearTimeout(t); res(); };
    current = u;
    synth.speak(u);
  });
  return r;
}
