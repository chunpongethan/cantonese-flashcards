// 家長設定 — Parent corner: voice, game options, categories, own words, progress.
import { STICKERS } from './words.js';
import * as speech from './speech.js';
import * as store from './store.js';
import { h, pic } from './ui.js';
import { allWords, allCategories, categoryOptions } from './catalog.js';

const HANZI_RE = /^[㐀-䶿一-鿿豈-﫿]{1,4}$/u;

function firstGrapheme(text) {
  const s = text.trim();
  if (!s) return '';
  if (window.Intl && Intl.Segmenter) {
    for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)) return segment;
  }
  return [...s][0];
}

// Shrink a photo to a small centre-cropped square JPEG so it fits in storage.
function readPhoto(file, size = 320) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img,
        (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

export function parentCorner({ show, leave, applySettings }) {
  const s = store.settings();
  const section = (title, ...kids) => h('section', { class: 'p-section' }, h('h3', {}, title), ...kids);

  // ----- Voice -----
  const voiceInfo = h('div', { class: 'p-voice' });
  const renderVoice = () => {
    const list = speech.cantoneseVoices();
    const cur = speech.currentVoice();
    if (!speech.supported()) {
      voiceInfo.replaceChildren(h('p', { class: 'p-warn' }, '呢個瀏覽器唔支援語音。請用 Safari（iPhone）或 Chrome（Android）。'));
      return;
    }
    if (!list.length) {
      voiceInfo.replaceChildren(h('div', { class: 'p-warn' },
        h('p', {}, '搵唔到廣東話聲音。安裝方法：'),
        h('p', {}, 'iPhone / iPad：設定 › 輔助使用 › 朗讀內容 › 聲音 › 中文 › 中文（香港），下載一把聲音。'),
        h('p', {}, 'Android：設定 › 文字轉語音輸出 › Google 語音服務 › 安裝語音數據 › 粵語（香港）。'),
        h('p', {}, '安裝後重新開啟呢個網頁。')));
      return;
    }
    const select = h('select', {
      onchange: e => { store.setSetting('voiceURI', e.target.value); applySettings(); speech.speak('你好！我哋一齊認字。'); },
    }, list.map(v => h('option', { value: v.voiceURI, selected: cur && v.voiceURI === cur.voiceURI }, `${v.name} (${v.lang})`)));
    voiceInfo.replaceChildren(h('label', { class: 'p-row' }, '聲音', select));
  };
  renderVoice();
  const offVoices = speech.onChange(renderVoice);

  const rate = h('input', { type: 'range', min: '0.5', max: '1.2', step: '0.05', value: s.rate });
  rate.addEventListener('change', () => { store.setSetting('rate', Number(rate.value)); applySettings(); speech.speak('貓'); });

  // ----- Game options -----
  const toggle = (label, key, after) => {
    const box = h('input', { type: 'checkbox', checked: s[key] });
    box.addEventListener('change', () => { store.setSetting(key, box.checked); if (after) after(); });
    return h('label', { class: 'p-row' }, label, box);
  };

  const sizes = h('div', { class: 'p-seg' }, [4, 6, 8].map(n => {
    const b = h('button', { class: s.roundSize === n ? 'on' : '' }, String(n));
    b.addEventListener('click', () => {
      store.setSetting('roundSize', n);
      sizes.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
    return b;
  }));

  // ----- Categories -----
  const catBox = h('div', { class: 'p-cats' });
  const renderCats = () => {
    const off = new Set(store.settings().catsOff);
    const cats = allCategories();
    const words = allWords();
    catBox.replaceChildren(...cats.map(c => {
      const count = words.filter(w => w.cat === c.id).length;
      const box = h('input', { type: 'checkbox', checked: !off.has(c.id) });
      box.addEventListener('change', () => {
        if (box.checked) off.delete(c.id); else off.add(c.id);
        if (cats.every(x => off.has(x.id))) { off.delete(c.id); box.checked = true; return; }
        store.setSetting('catsOff', [...off]);
      });
      return h('label', { class: 'p-cat' }, box, `${c.emoji} ${c.name} (${count})`);
    }));
  };
  renderCats();

  // ----- Progress -----
  const progressLine = h('p', {});
  const renderProgress = () => {
    progressLine.textContent = `⭐ ${store.stars()}　📒 ${store.stickers().length}/${STICKERS.length}`;
  };
  renderProgress();
  const reset = h('button', { class: 'p-danger', onclick: () => {
    if (confirm('確定要清除所有星星、貼紙同學習紀錄？（設定同自己加嘅字會保留）')) {
      store.resetProgress();
      renderProgress();
    }
  } }, '清除進度');

  show(h('div', { class: 'screen parent' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': '返回', onclick: () => { offVoices(); leave(); } }, '🏠'),
      h('div', { class: 'title' }, '家長設定'),
      h('div', {})),
    h('div', { class: 'body' },
      section('🔊 廣東話聲音',
        voiceInfo,
        h('label', { class: 'p-row' }, '語速', rate),
        h('button', { class: 'p-btn', onclick: () => speech.speak('貓、狗、蘋果、飛機') }, '試聽')),
      section('🎮 遊戲',
        toggle('顯示粵拼 (Jyutping)', 'jyutping'),
        toggle('音效', 'sound', applySettings),
        h('div', { class: 'p-row' }, '每回合卡數', sizes)),
      section('✏️ 自己加字', customWords(renderCats)),
      section('📚 字卡類別', catBox),
      section('📊 進度', progressLine, reset),
      h('p', { class: 'p-foot' }, '小貼士：每日玩 5–10 分鐘就夠。錯咗會自動多啲出現。'),
    )));
}

// Form to add a word, plus the list of words already added.
function customWords(onChange) {
  let photo = null;

  const charIn = h('input', { class: 'p-input p-char', placeholder: '例如：學', maxlength: '4', autocomplete: 'off', lang: 'zh-HK' });
  const jpIn = h('input', { class: 'p-input', placeholder: '粵拼，例如 hok6（可留空）', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
  const emojiIn = h('input', { class: 'p-input p-emoji', placeholder: '🏫', autocomplete: 'off' });
  const fileIn = h('input', { type: 'file', accept: 'image/*', class: 'p-file' });
  const preview = h('button', { class: 'p-preview', type: 'button', 'aria-label': '圖片' });
  const catSel = h('select', { class: 'p-input' },
    categoryOptions().map(c => h('option', { value: c.id }, `${c.emoji} ${c.name}`)));
  const sayIn = h('input', { class: 'p-input', placeholder: '讀法（可留空；讀錯音先填）', autocomplete: 'off', lang: 'zh-HK' });
  const msg = h('div', { class: 'p-msg' });
  const list = h('div', { class: 'p-list' });

  const setMsg = (text, bad = false) => { msg.textContent = text; msg.classList.toggle('bad', bad); };

  const updatePreview = () => {
    const e = firstGrapheme(emojiIn.value);
    preview.replaceChildren(photo ? h('img', { src: photo, alt: '' }) : e ? h('span', {}, e) : h('span', { class: 'p-muted' }, '？'));
    preview.classList.toggle('has-photo', !!photo);
  };
  updatePreview();
  emojiIn.addEventListener('input', updatePreview);

  // Tapping the preview removes a chosen photo.
  preview.addEventListener('click', () => { if (photo) { photo = null; updatePreview(); } });

  fileIn.addEventListener('change', async () => {
    const file = fileIn.files[0];
    fileIn.value = '';
    if (!file) return;
    try {
      photo = await readPhoto(file);
      setMsg('');
    } catch {
      setMsg('讀唔到呢張相，試吓另一張', true);
    }
    updatePreview();
  });

  const testBtn = h('button', { class: 'p-btn', type: 'button', onclick: () => {
    const text = sayIn.value.trim() || charIn.value.trim();
    if (text) speech.speak(text);
  } }, '🔊 試聽');

  const addBtn = h('button', { class: 'p-btn p-primary', type: 'button', onclick: () => {
    const char = charIn.value.trim();
    if (!HANZI_RE.test(char)) return setMsg('請輸入 1 至 4 個中文字', true);
    const emoji = firstGrapheme(emojiIn.value);
    if (!emoji && !photo) return setMsg('請加一個表情符號或者一張相', true);
    if (allWords().some(w => w.char === char && w.cat === catSel.value)) return setMsg(`「${char}」已經喺呢個類別`, true);

    const word = {
      id: `custom-${Date.now().toString(36)}`,
      cat: catSel.value,
      char,
      jyutping: jpIn.value.trim(),
      emoji: photo ? '' : emoji,
      say: sayIn.value.trim() || char,
      custom: true,
    };
    if (photo) word.img = photo;
    if (!store.addCustomWord(word)) return setMsg('儲存唔到：空間可能已滿，試吓刪走一啲有相嘅字', true);

    charIn.value = jpIn.value = emojiIn.value = sayIn.value = '';
    photo = null;
    updatePreview();
    setMsg(`已加入「${char}」✔`);
    speech.speak(word.say);
    renderList();
    onChange();
  } }, '＋ 加入');

  function renderList() {
    const words = [...store.customWords()].reverse();
    const names = Object.fromEntries(categoryOptions().map(c => [c.id, `${c.emoji} ${c.name}`]));
    list.replaceChildren(
      words.length ? h('div', { class: 'p-list-title' }, `已加入 ${words.length} 個字`) : h('p', { class: 'p-muted' }, '仲未加字。'),
      ...words.map(w => h('div', { class: 'p-item' },
        pic(w, 'tiny'),
        h('div', { class: 'p-item-text' },
          h('div', { class: 'p-item-char' }, w.char),
          h('div', { class: 'p-muted' }, [w.jyutping, names[w.cat]].filter(Boolean).join(' · '))),
        h('button', { class: 'p-icon', 'aria-label': '試聽', onclick: () => speech.speak(w.say || w.char) }, '🔊'),
        h('button', { class: 'p-icon', 'aria-label': '刪除', onclick: () => {
          if (!confirm(`刪除「${w.char}」？`)) return;
          store.removeCustomWord(w.id);
          renderList();
          onChange();
        } }, '🗑️'))));
  }
  renderList();

  return h('div', { class: 'p-form' },
    h('label', { class: 'p-field' }, h('span', {}, '中文字'), charIn),
    h('label', { class: 'p-field' }, h('span', {}, '粵拼'), jpIn),
    h('div', { class: 'p-field' }, h('span', {}, '圖片'),
      h('div', { class: 'p-pic-row' },
        preview,
        emojiIn,
        h('label', { class: 'p-btn p-photo-btn' }, '📷 相片', fileIn))),
    h('label', { class: 'p-field' }, h('span', {}, '類別'), catSel),
    h('label', { class: 'p-field' }, h('span', {}, '讀法'), sayIn),
    h('div', { class: 'p-actions' }, testBtn, addBtn),
    msg,
    list);
}
