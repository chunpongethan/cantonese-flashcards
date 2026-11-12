// ⭐ 星星銀行 — the child's star bank and gift shop.
import * as store from './store.js';
import * as speech from './speech.js';
import { h, confetti, wiggle } from './ui.js';

export function starBank({ show, header, sfx }) {
  let screenEl = null;

  function render() {
    const balance = store.stars();
    const cap = store.settings().dailyCap;
    // Clamp for display in case a parent lowers the limit after stars were earned today.
    const today = cap > 0 ? Math.min(store.earnedToday(), cap) : store.earnedToday();
    const gifts = [...store.gifts()].sort((a, b) => a.cost - b.cost);

    const todayBox = cap > 0
      ? h('div', { class: 'bank-today' },
        h('div', { class: 'bank-bar' }, h('span', { style: { width: `${Math.min(100, (today / cap) * 100)}%` } })),
        h('div', {}, store.capReached() ? `今日 ${today} / ${cap} ⭐ 儲滿喇！` : `今日 ${today} / ${cap} ⭐`))
      : h('div', { class: 'bank-today' }, `今日攞咗 ${today} ⭐`);

    const cards = gifts.map(g => {
      const ok = balance >= g.cost;
      const need = g.cost - balance;
      const card = h('button', { class: `gift ${ok ? 'can' : 'cant'}` },
        h('div', { class: 'gift-emoji' }, g.emoji),
        h('div', { class: 'gift-name' }, g.name),
        h('div', { class: 'gift-cost' }, `⭐ ${g.cost}`),
        ok ? h('div', { class: 'gift-tag' }, '換！') : h('div', { class: 'gift-need' }, `仲差 ${need}`));
      card.addEventListener('click', () => {
        if (ok) { sfx.tap(); confirmGift(g); return; }
        sfx.boop();
        wiggle(card);
        speech.speak(`${g.name}要${g.cost}粒星，仲差${need}粒。`);
      });
      return card;
    });

    screenEl = h('div', { class: 'screen bank' },
      header(),
      h('div', { class: 'body' },
        h('div', { class: 'bank-balance' },
          h('div', { class: 'bank-label' }, '我有'),
          h('div', { class: 'bank-amount' }, '⭐ ', h('b', {}, balance))),
        todayBox,
        h('div', { class: 'bank-shop-title' }, '🎁 換禮物'),
        gifts.length
          ? h('div', { class: 'gift-grid' }, cards)
          : h('p', { class: 'bank-empty' }, '請爸爸媽媽喺「家長設定」加禮物')));
    show(screenEl);
  }

  function modal(...content) {
    const overlay = h('div', { class: 'modal' }, h('div', { class: 'modal-card' }, ...content));
    screenEl.append(overlay);
    return overlay;
  }

  function confirmGift(g) {
    const overlay = modal(
      h('div', { class: 'gift-emoji big' }, g.emoji),
      h('div', { class: 'modal-text' }, `用 ⭐ ${g.cost} 換「${g.name}」？`),
      h('div', { class: 'modal-actions' },
        h('button', { class: 'big-btn no', 'aria-label': '唔換', onclick: () => { sfx.tap(); speech.cancel(); overlay.remove(); } }, '✖'),
        h('button', { class: 'big-btn yes', 'aria-label': '換', onclick: () => exchange(g) }, '✔')));
    speech.speak(`用${g.cost}粒星換${g.name}，好唔好？`);
  }

  function exchange(g) {
    const r = store.redeem(g.id);
    render();
    if (!r) return;
    sfx.fanfare();
    confetti(50);
    const overlay = modal(
      h('div', { class: 'gift-emoji big' }, '🎁'),
      h('div', { class: 'modal-text' }, `換咗「${g.name}」！`),
      h('div', { class: 'modal-sub' }, '快啲搵爸爸媽媽攞禮物啦！'),
      h('div', { class: 'modal-actions' },
        h('button', { class: 'big-btn yes', 'aria-label': '好', onclick: () => { sfx.tap(); overlay.remove(); } }, '👍')));
    speech.speak(`好嘢！換咗${g.name}！快啲搵爸爸媽媽攞禮物啦！`);
  }

  render();
  speech.speak(`星星銀行。你有${store.stars()}粒星星。`);
}
