// 家長設定 — Parent corner: voice, game options, categories, own words, progress.
import { TOTAL_FORMS } from './monsters.js';
import * as speech from './speech.js';
import * as store from './store.js';
import { h, pic } from './ui.js';
import { allWords, allCategories, categoryOptions } from './catalog.js';
import * as sync from './sync.js';
import { reportScreen, SECTIONS } from './report.js';

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
    if (!speech.supported()) {
      voiceInfo.replaceChildren(h('p', { class: 'p-warn' }, '呢個瀏覽器唔支援語音。請用 Safari（iPhone）或 Chrome（Android）。'));
      return;
    }
    const list = speech.cantoneseVoices();
    const cur = speech.currentVoice();
    const zhPart = list.length
      ? h('label', { class: 'p-row' }, '廣東話', h('select', {
        onchange: e => { store.setSetting('voiceURI', e.target.value); applySettings(); speech.speak('你好！我哋一齊認字。'); },
      }, list.map(v => h('option', { value: v.voiceURI, selected: cur && v.voiceURI === cur.voiceURI }, `${v.name} (${v.lang})`))))
      : h('div', { class: 'p-warn' },
        h('p', {}, '搵唔到廣東話聲音。安裝方法：'),
        h('p', {}, 'iPhone / iPad：設定 › 輔助使用 › 朗讀內容 › 聲音 › 中文 › 中文（香港），下載一把聲音。'),
        h('p', {}, 'Android：設定 › 文字轉語音輸出 › Google 語音服務 › 安裝語音數據 › 粵語（香港）。'),
        h('p', {}, '安裝後重新開啟呢個網頁。'));

    const enList = speech.englishVoices();
    const enCur = speech.currentEnglishVoice();
    const enPart = enList.length
      ? h('label', { class: 'p-row' }, 'English', h('select', {
        onchange: e => { store.setSetting('enVoiceURI', e.target.value); applySettings(); speech.speak('Hello! Which one is cat?', { lang: 'en' }); },
      }, enList.map(v => h('option', { value: v.voiceURI, selected: enCur && v.voiceURI === enCur.voiceURI }, `${v.name} (${v.lang})`))))
      : h('p', { class: 'p-warn' }, '搵唔到英文聲音，English 部分會冇聲。');

    voiceInfo.replaceChildren(zhPart, enPart);
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

  // ----- Star rules -----
  const capSel = h('select', { class: 'p-select' }, [0, 5, 10, 15, 20, 30, 50, 100].map(n =>
    h('option', { value: n, selected: s.dailyCap === n }, n === 0 ? '不限' : `${n} 粒`)));
  if (![0, 5, 10, 15, 20, 30, 50, 100].includes(s.dailyCap)) {
    capSel.append(h('option', { value: s.dailyCap, selected: true }, `${s.dailyCap} 粒`));
  }
  const starInfo = h('p', { class: 'p-muted' });
  const renderStarInfo = () => {
    const cap = store.settings().dailyCap;
    starInfo.textContent = `今日淨攞 ${store.earnedToday()}${cap ? ` / ${cap}` : ''} 粒（攞到減答錯扣咗）· 銀行有 ⭐ ${store.stars()}`;
  };
  renderStarInfo();
  capSel.addEventListener('change', () => { store.setSetting('dailyCap', Number(capSel.value)); renderStarInfo(); });

  // ----- Maths -----
  const digitSeg = h('div', { class: 'p-seg' }, [1, 2, 3].map(n => {
    const b = h('button', { class: s.mathDigits === n ? 'on' : '' }, `${n} 位`);
    b.addEventListener('click', () => {
      store.setSetting('mathDigits', n);
      digitSeg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      digitHint.textContent = `數字範圍：0–${10 ** n - 1}`;
    });
    return b;
  }));
  const digitHint = h('p', { class: 'p-muted' }, `數字範圍：0–${10 ** s.mathDigits - 1}`);
  const opToggle = (label, key, otherKey) => {
    const box = h('input', { type: 'checkbox', checked: s[key] });
    box.addEventListener('change', () => {
      // Keep at least one of adding / taking away switched on.
      if (!box.checked && !store.settings()[otherKey]) { box.checked = true; return; }
      store.setSetting(key, box.checked);
    });
    return h('label', { class: 'p-row' }, label, box);
  };

  // ----- English spelling -----
  const spellSeg = h('div', { class: 'p-seg' }, [[4, '≤4'], [6, '≤6'], [10, '全部']].map(([n, label]) => {
    const b = h('button', { class: s.spellMax === n ? 'on' : '' }, label);
    b.addEventListener('click', () => {
      store.setSetting('spellMax', n);
      spellSeg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
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
    progressLine.textContent = `⭐ ${store.stars()}　📒 ${store.formsOwned()}/${TOTAL_FORMS}`;
  };
  renderProgress();
  const reset = h('button', { class: 'p-danger', onclick: () => {
    if (confirm('確定要清除所有星星、貼紙、換禮物紀錄同學習紀錄？（設定、禮物同自己加嘅字會保留）')) {
      store.resetProgress();
      renderProgress();
      renderStarInfo();
      giftsUI.refresh();
    }
  } }, '清除進度');

  const giftsUI = giftEditor(() => { renderStarInfo(); renderProgress(); });

  show(h('div', { class: 'screen parent' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': '返回', onclick: () => { offVoices(); leave(); } }, '🏠'),
      h('div', { class: 'title' }, '家長設定'),
      h('div', {})),
    h('div', { class: 'body' },
      h('button', { class: 'p-btn p-primary p-report-btn', onclick: () => {
        offVoices();
        reportScreen({ show, back: () => parentCorner({ show, leave, applySettings }) });
      } }, '📈 學習報告：睇吓佢每個部分做得點'),
      section('☁️ 雲端同步', cloudSection(() => { applySettings(); parentCorner({ show, leave, applySettings }); })),
      section('🔊 廣東話聲音',
        voiceInfo,
        h('label', { class: 'p-row' }, '語速', rate),
        h('div', { class: 'p-actions' },
          h('button', { class: 'p-btn', onclick: () => speech.speak('貓、狗、蘋果、飛機') }, '試聽廣東話'),
          h('button', { class: 'p-btn', onclick: () => speech.speak('cat, dog, apple, aeroplane', { lang: 'en' }) }, '試聽 English')),
        soundCheck()),
      section('🎮 遊戲',
        toggle('顯示粵拼 (Jyutping)', 'jyutping'),
        toggle('音效', 'sound', applySettings),
        h('div', { class: 'p-row' }, '每回合卡數', sizes)),
      section('⭐ 星星規則',
        h('label', { class: 'p-row' }, '每日最多攞幾多粒星', capSel),
        toggle('答錯扣一粒星（聽聽揀揀、English、數學）', 'wrongPenalty'),
        starInfo),
      section('🔤 English',
        h('div', { class: 'p-row' }, '拼字遊戲：最長幾多個字母', spellSeg),
        h('p', { class: 'p-muted' }, '≤4：cat、dog、milk…　≤6：apple、flower…　全部：watermelon…')),
      section('⏱️ 每日回合上限', roundLimits()),
      section('🔢 數學',
        h('div', { class: 'p-row' }, '最多幾位數', digitSeg),
        digitHint,
        opToggle('➕ 加數', 'mathAdd', 'mathSub'),
        opToggle('➖ 減數', 'mathSub', 'mathAdd')),
      section('🎁 禮物', giftsUI.el),
      section('✏️ 自己加字', customWords(renderCats)),
      section('📚 字卡類別', catBox),
      section('📊 進度', progressLine, reset),
      h('p', { class: 'p-foot' }, '小貼士：每日玩 5–10 分鐘就夠。錯咗會自動多啲出現。'),
    )));
}

// ⏱️ Daily round limit for each game (0 = no limit).
const LIMIT_OPTIONS = [0, 1, 2, 3, 4, 5, 8, 10];

function roundLimits() {
  const box = h('div', { class: 'p-limits' });
  const select = (value, onchange) => {
    const sel = h('select', { class: 'p-select' }, LIMIT_OPTIONS.map(n =>
      h('option', { value: n, selected: n === value }, n ? `${n} 回合` : '不限')));
    sel.addEventListener('change', () => onchange(Number(sel.value)));
    return sel;
  };
  const render = () => {
    const games = SECTIONS.flatMap(sec => sec.games.map(([g]) => g));
    const values = games.map(g => store.roundLimit(g));
    const same = values.every(v => v === values[0]) ? values[0] : -1;
    const all = h('select', { class: 'p-select' },
      same === -1 ? h('option', { value: -1, selected: true }, '各有不同') : null,
      LIMIT_OPTIONS.map(n => h('option', { value: n, selected: n === same }, n ? `${n} 回合` : '不限')));
    all.addEventListener('change', () => {
      const n = Number(all.value);
      if (n < 0) return;
      games.forEach(g => store.setRoundLimit(g, n));
      render();
    });
    box.replaceChildren(
      h('p', { class: 'p-muted' }, '每個遊戲每日最多玩幾多回合。玩夠之後個遊戲會鎖住，聽日再開。'),
      h('label', { class: 'p-row p-limit-all' }, '全部遊戲一齊設定', all),
      ...SECTIONS.map(sec => h('div', { class: 'p-limit-group' },
        h('div', { class: 'p-limit-title' }, sec.name),
        sec.games.map(([g, name]) => h('label', { class: 'p-row p-limit-row' },
          h('span', {}, name, h('span', { class: 'r-sub' }, `　今日玩咗 ${store.roundsToday(g)}`)),
          select(store.roundLimit(g), n => { store.setRoundLimit(g, n); render(); }))))));
  };
  render();
  return box;
}

// 🔍 Sound check: test the voice on this phone and explain what to fix.
function soundCheck() {
  const out = h('div', { class: 'p-check' });
  const btn = h('button', { class: 'p-btn p-check-btn', onclick: async () => {
    btn.disabled = true;
    out.replaceChildren(h('p', { class: 'p-muted' }, '檢查緊，請聽吓有冇聲…'));
    const r = await speech.selfTest('zh');
    btn.disabled = false;
    const line = (ok, text) => h('p', { class: ok ? 'p-ok' : 'p-bad' }, `${ok ? '✔' : '✘'} ${text}`);
    const tips = [];
    const rows = [
      line(r.supported, r.supported ? '瀏覽器支援語音' : '呢個瀏覽器唔支援語音'),
      line(r.voices > 0, `搵到 ${r.voices} 把聲（廣東話 ${r.cantonese.length} 把，英文 ${r.english} 把）`),
      line(!!r.using, r.using ? `用緊：${r.using}` : '未有廣東話聲音'),
      line(r.started || r.ended, r.started || r.ended ? '測試句子有開始讀' : `測試句子冇讀出${r.error ? `（錯誤：${r.error}）` : ''}`),
    ];
    if (!r.supported) tips.push('請用 Safari（iPhone / iPad）或者 Chrome（Android）打開。');
    if (r.supported && !r.cantonese.length) {
      tips.push(r.isIOS
        ? 'iPhone：設定 › 輔助使用 › 朗讀內容 › 聲音 › 中文 › 中文（香港），下載一把聲音，然後完全關閉再開返呢個遊戲。'
        : 'Android：設定 › 文字轉語音輸出 › 揀「Google 語音服務」› 安裝語音數據 › 粵語（香港），然後完全關閉再開返呢個遊戲。');
    }
    if (r.supported && !(r.started || r.ended)) {
      if (r.isIOS) tips.push('iPhone：檢查側邊嘅靜音掣同埋音量，再撳一次「檢查聲音」。');
      if (r.isIOS && r.standalone) tips.push('如果仲係冇聲：試吓用 Safari 直接打開遊戲網址（唔用主畫面圖示），有啲 iOS 版本喺主畫面 App 入面冇語音。');
      if (r.error === 'not-allowed') tips.push('瀏覽器要先撳一下畫面先可以出聲：撳一下畫面再試。');
      if (!r.isIOS) tips.push('Android：檢查媒體音量（唔係鈴聲音量），再試一次。');
    }
    if ((r.started || r.ended) && r.cantonese.length) tips.push('如果測試有聲但遊戲入面冇聲：完全關閉遊戲再開返，喺開頭撳一下 ▶。');
    out.replaceChildren(...rows, ...tips.map(t => h('p', { class: 'p-tip' }, `💡 ${t}`)));
  } }, '🔍 檢查聲音');
  return h('div', {}, btn, out);
}

// ☁️ Cloud sync: link phones with a family code.
function cloudSection(reopen) {
  const box = h('div', { class: 'p-form' });
  const STATUS = {
    off: '未連結',
    connecting: '連接中…',
    syncing: '同步中…',
    synced: '已同步 ✔',
    offline: '離線：上網後會自動同步',
    error: '同步出錯',
  };
  const ERRORS = {
    'bad-code': '代碼應該係 16 個英文字母同數字',
    'not-found': '搵唔到呢個代碼，請檢查清楚',
  };

  function render() {
    if (!sync.configured()) {
      box.replaceChildren(h('p', { class: 'p-muted' }, '雲端同步未設定（需要 Firebase 設定）。'));
      return;
    }
    const code = sync.familyCode();
    const msg = h('div', { class: 'p-msg' });
    const fail = e => { msg.textContent = ERRORS[e.message] || `出錯：${e.message}`; msg.classList.add('bad'); };

    if (!code) {
      const codeIn = h('input', { class: 'p-input p-code-in', placeholder: 'XXXX-XXXX-XXXX-XXXX', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
      const createBtn = h('button', { class: 'p-btn p-primary', onclick: async () => {
        createBtn.disabled = true;
        try { await sync.createFamily(); render(); } catch (e) { fail(e); createBtn.disabled = false; }
      } }, '建立家庭代碼');
      const joinBtn = h('button', { class: 'p-btn', onclick: async () => {
        if (!confirm('連結之後，呢部機嘅設定、禮物、自己加嘅字、星星同紀錄會換成雲端嗰份。繼續？')) return;
        joinBtn.disabled = true;
        try { await sync.joinFamily(codeIn.value); reopen(); } catch (e) { fail(e); joinBtn.disabled = false; }
      } }, '連結');
      box.replaceChildren(
        h('p', { class: 'p-muted' }, '用同一個家庭代碼連結幾部手機，家長設定、禮物、自己加嘅字、星星同換領紀錄會自動同步。'),
        h('p', {}, '第一部機：'),
        createBtn,
        h('p', {}, '其他手機：輸入第一部機嘅代碼'),
        h('div', { class: 'p-pic-row' }, codeIn, joinBtn),
        msg);
      return;
    }

    const statusLine = h('div', { class: 'p-sync-status' });
    const showStatus = () => {
      const { status, detail } = sync.getStatus();
      statusLine.textContent = `狀態：${STATUS[status] || status}${status === 'error' && detail ? `（${detail}）` : ''}`;
      statusLine.dataset.status = status;
    };
    showStatus();
    offStatus();
    offStatus = sync.onStatus(() => { if (box.isConnected) showStatus(); else offStatus(); });

    const copyBtn = h('button', { class: 'p-btn p-small', onclick: async () => {
      try { await navigator.clipboard.writeText(sync.formatCode(code)); copyBtn.textContent = '已複製 ✔'; } catch { copyBtn.textContent = '請手動抄低'; }
    } }, '複製');
    box.replaceChildren(
      h('p', { class: 'p-muted' }, '家庭代碼（喺其他手機輸入呢個代碼就可以連結）：'),
      h('div', { class: 'p-code-row' }, h('div', { class: 'p-code' }, sync.formatCode(code)), copyBtn),
      h('p', { class: 'p-muted' }, '⚠️ 代碼等於鎖匙，唔好俾外人睇到。'),
      statusLine,
      h('button', { class: 'p-btn', onclick: () => {
        if (!confirm('呢部機唔再同步？（資料會留喺呢部機，雲端資料唔會刪除）')) return;
        sync.unlink();
        render();
      } }, '取消連結'),
      msg);
  }

  let offStatus = () => {};
  render();
  return box;
}

// Gift list the child can exchange stars for, plus the exchange record.
function giftEditor(onChange) {
  const emojiIn = h('input', { class: 'p-input p-emoji', placeholder: '🎁', autocomplete: 'off' });
  const nameIn = h('input', { class: 'p-input', placeholder: '例如：去公園玩', maxlength: '20', autocomplete: 'off', lang: 'zh-HK' });
  const costIn = h('input', { class: 'p-input p-cost', type: 'number', inputmode: 'numeric', min: '1', max: '9999', placeholder: '⭐' });
  const msg = h('div', { class: 'p-msg' });
  const list = h('div', { class: 'p-list' });
  const history = h('div', { class: 'p-list' });

  const setMsg = (text, bad = false) => { msg.textContent = text; msg.classList.toggle('bad', bad); };
  const parseCost = v => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 1 && n <= 9999 ? n : null;
  };

  const addBtn = h('button', { class: 'p-btn p-primary', type: 'button', onclick: () => {
    const name = nameIn.value.trim();
    const cost = parseCost(costIn.value);
    if (!name) return setMsg('請輸入禮物名稱', true);
    if (!cost) return setMsg('星星數量要係 1 至 9999', true);
    store.addGift({ emoji: firstGrapheme(emojiIn.value) || '🎁', name, cost });
    emojiIn.value = nameIn.value = costIn.value = '';
    setMsg(`已加入「${name}」✔`);
    renderList();
  } }, '＋ 加禮物');

  function renderList() {
    const gifts = [...store.gifts()].sort((a, b) => a.cost - b.cost);
    list.replaceChildren(
      gifts.length ? h('div', { class: 'p-list-title' }, '禮物（可以直接改星星數量）') : h('p', { class: 'p-muted' }, '仲未有禮物。'),
      ...gifts.map(g => {
        const cost = h('input', { class: 'p-input p-cost', type: 'number', inputmode: 'numeric', min: '1', max: '9999', value: g.cost, 'aria-label': '星星數量' });
        cost.addEventListener('change', () => {
          const n = parseCost(cost.value);
          if (n) { store.updateGift(g.id, { cost: n }); setMsg(`「${g.name}」而家要 ⭐ ${n}`); } else cost.value = g.cost;
        });
        return h('div', { class: 'p-item' },
          h('div', { class: 'p-gift-emoji' }, g.emoji),
          h('div', { class: 'p-item-text' }, h('div', { class: 'p-gift-name' }, g.name)),
          h('span', { class: 'p-muted' }, '⭐'), cost,
          h('button', { class: 'p-icon', 'aria-label': '刪除', onclick: () => {
            if (!confirm(`刪除禮物「${g.name}」？`)) return;
            store.removeGift(g.id);
            renderList();
          } }, '🗑️'));
      }));
  }

  function renderHistory() {
    const items = store.redemptions();
    const fmt = t => new Date(t).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const pending = items.filter(r => !r.given).length;
    history.replaceChildren(
      h('div', { class: 'p-list-title' }, items.length ? `換領紀錄（${pending} 個未俾）` : '換領紀錄：未有'),
      ...items.map(r => h('div', { class: `p-item ${r.given ? 'given' : ''}` },
        h('div', { class: 'p-gift-emoji' }, r.emoji),
        h('div', { class: 'p-item-text' },
          h('div', { class: 'p-gift-name' }, r.name),
          h('div', { class: 'p-muted' }, `${fmt(r.at)} · ⭐ ${r.cost}`)),
        r.given
          ? h('span', { class: 'p-done' }, '已俾 ✔')
          : [
            h('button', { class: 'p-btn p-small', onclick: () => { store.markGiven(r.id); renderHistory(); } }, '已俾'),
            h('button', { class: 'p-btn p-small', onclick: () => {
              if (!confirm(`退還 ⭐ ${r.cost} 返入銀行，取消「${r.name}」？`)) return;
              store.refund(r.id);
              renderHistory();
              onChange();
            } }, '退還'),
          ])));
  }

  renderList();
  renderHistory();

  const el = h('div', { class: 'p-form' },
    h('div', { class: 'p-gift-row' }, emojiIn, nameIn, costIn),
    addBtn,
    msg,
    list,
    history);
  return { el, refresh: () => { renderList(); renderHistory(); } };
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
  const enIn = h('input', { class: 'p-input', placeholder: '例如 school（可留空；填咗會出現喺 English）', autocomplete: 'off', autocapitalize: 'off', maxlength: '30', lang: 'en' });
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
      en: enIn.value.trim().replace(/\s+/g, ' '),
      emoji: photo ? '' : emoji,
      say: sayIn.value.trim() || char,
      custom: true,
    };
    if (photo) word.img = photo;
    if (!store.addCustomWord(word)) return setMsg('儲存唔到：空間可能已滿，試吓刪走一啲有相嘅字', true);

    charIn.value = jpIn.value = emojiIn.value = sayIn.value = enIn.value = '';
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
          h('div', { class: 'p-muted' }, [w.jyutping, w.en, names[w.cat]].filter(Boolean).join(' · '))),
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
    h('label', { class: 'p-field' }, h('span', {}, 'English'), enIn),
    h('div', { class: 'p-actions' }, testBtn, addBtn),
    msg,
    list);
}
