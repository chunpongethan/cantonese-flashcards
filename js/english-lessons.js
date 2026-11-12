// English Class — words and practice from the school English book.
// EN_WORDS are English-only cards (they don't appear in the Chinese games).
// EN_FILL sentences are written for this app to practise the same words.

export const EN_CLASS_CAT = { id: 'enclass', name: '英文堂', en: 'English Class', emoji: '🎒', color: '#5C9CE6' };

// [english, chinese hint, emoji, group, extra]
const RAW = [
  // Daily routine
  ['face', '面', '😊', 'routine'],
  ['teeth', '牙齒', '🦷', 'routine'],
  ['hands', '手', '👐', 'routine'],
  ['wash', '洗', '🧼', 'routine'],
  ['brush', '刷', '🪥', 'routine'],
  ['Good morning', '早晨', '🌅', 'routine'],
  // Space
  ['flag', '旗', '🚩', 'space'],
  ['panda', '熊貓', '🐼', 'zoo'],
  ['rocket', '火箭', '🚀', 'space'],
  ['spaceman', '太空人', '👨‍🚀', 'space'],
  // Zoo
  ['zoo', '動物園', '🦁', 'zoo'],
  ['bear', '熊', '🐻', 'zoo'],
  ['giraffe', '長頸鹿', '🦒', 'zoo'],
  ['zebra', '斑馬', '🦓', 'zoo'],
  ['elephant', '大象', '🐘', 'zoo'],
  // Home
  ['home', '屋企', '🏠', 'home'],
  ['kitchen', '廚房', '🍳', 'home'],
  ['bathroom', '浴室', '🛁', 'home'],
  ['bedroom', '睡房', '🛏️', 'home'],
  ['dining room', '飯廳', '🍽️', 'home'],
  ['sitting room', '客廳', '🛋️', 'home'],
  ['clock', '鐘', '⏰', 'home'],
  // Numbers 11 and 12 (one–ten already come from the 數字 cards)
  ['eleven', '十一', '🍎', 'numbers', { cat: 'numbers', count: 11 }],
  ['twelve', '十二', '🍎', 'numbers', { cat: 'numbers', count: 12 }],
];

export const EN_WORDS = RAW.map(([en, zh, emoji, group, extra = {}]) => ({
  id: `enc-${en.replace(/\s+/g, '-').toLowerCase()}`,
  cat: EN_CLASS_CAT.id,
  char: en,
  say: en,
  zh,
  jyutping: '',
  emoji,
  group,
  lang: 'en',
  ...extra,
}));

// Fill-in sentences: `__` is the blank. Choices come from the same group.
const FILL = [
  ['I __ my hands with soap.', 'wash'],
  ['I __ my teeth every night.', 'brush'],
  ['I wash my __ with water.', 'face'],
  ['I brush my __ after breakfast.', 'teeth'],
  ['I wash my __ before I eat.', 'hands'],
  ['I say "__" when I wake up.', 'Good morning'],
  ['The __ has a very long neck.', 'giraffe'],
  ['The __ has black and white stripes.', 'zebra'],
  ['The __ has a long trunk.', 'elephant'],
  ['The big brown __ likes honey.', 'bear'],
  ['The __ eats bamboo.', 'panda'],
  ['We see lots of animals at the __.', 'zoo'],
  ['The __ flies up to the moon.', 'rocket'],
  ['The __ wears a big helmet.', 'spaceman'],
  ['The __ waves in the wind.', 'flag'],
  ['Mum cooks dinner in the __.', 'kitchen'],
  ['I take a bath in the __.', 'bathroom'],
  ['I sleep in my __.', 'bedroom'],
  ['We eat dinner in the __.', 'dining room'],
  ['We watch TV in the __.', 'sitting room'],
  ['I love my __.', 'home'],
];

export const EN_FILL = FILL.map(([text, answer], i) => {
  const word = EN_WORDS.find(w => w.char === answer);
  return { id: `enfill-${i}`, text, answer, emoji: word.emoji, group: word.group };
});

// Clock & Numbers
export const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

export const CLOCK_ITEMS = NUMBER_WORDS.flatMap((word, i) => [
  { id: `clock-${i + 1}`, kind: 'clock', n: i + 1, word },
  { id: `numword-${i + 1}`, kind: 'number', n: i + 1, word },
]);
