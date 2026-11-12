// 學校字 — school lessons: each lesson is a radical (部首) with two characters,
// plus fill-in sentences (written for this app) that practise the pair.
// To add a new lesson from the school book, add one entry to LESSONS.

// Radicals: what to show, and what the voice says ("部首係「日」").
export const RADICALS = {
  口: { label: '口', say: '口' },
  土: { label: '土', say: '土' },
  人: { label: '人／亻', say: '人' },
  糸: { label: '糸', say: '絲' },
  女: { label: '女', say: '女' },
  巾: { label: '巾', say: '巾' },
  心: { label: '心／忄', say: '心' },
  手: { label: '手／扌', say: '手' },
  日: { label: '日', say: '日' },
  水: { label: '水／氵', say: '水' },
  虫: { label: '虫', say: '蟲' },
};

// `__` marks the blank; `answer` is the character that goes in it.
export const LESSONS = [
  { rad: '口', chars: ['同', '吃'], sentences: [
    { text: '我和他是__學。', answer: '同' },
    { text: '我最喜歡__蘋果。', answer: '吃' },
  ] },
  { rad: '土', chars: ['地', '場'], sentences: [
    { text: '小狗坐在__上。', answer: '地' },
    { text: '我們在操__跑步。', answer: '場' },
  ] },
  { rad: '人', chars: ['你', '位'], sentences: [
    { text: '__好嗎？', answer: '你' },
    { text: '請坐回你的座__。', answer: '位' },
  ] },
  { rad: '糸', chars: ['給', '紙'], sentences: [
    { text: '媽媽__我一個蘋果。', answer: '給' },
    { text: '我用__畫了一隻貓。', answer: '紙' },
  ] },
  { rad: '女', chars: ['妹', '媽'], sentences: [
    { text: '我的妹__今年三歲。', answer: '妹' },
    { text: '__媽每天煮飯。', answer: '媽' },
  ] },
  { rad: '巾', chars: ['師', '帶'], sentences: [
    { text: '老__在說故事。', answer: '師' },
    { text: '爸爸__我去公園。', answer: '帶' },
  ] },
  { rad: '心', chars: ['忙', '恩'], sentences: [
    { text: '爸爸今天很__。', answer: '忙' },
    { text: '我們要感__爸爸媽媽。', answer: '恩' },
  ] },
  { rad: '手', chars: ['找', '拿'], sentences: [
    { text: '我在__我的玩具車。', answer: '找' },
    { text: '請你__一本書給我。', answer: '拿' },
  ] },
  { rad: '日', chars: ['星', '晴'], sentences: [
    { text: '晚上天上有很多星__。', answer: '星' },
    { text: '今天是__天，我們去公園。', answer: '晴' },
  ] },
  { rad: '水', chars: ['海', '洋'], sentences: [
    { text: '我們去__灘堆沙。', answer: '海' },
    { text: '大__裏有很多魚。', answer: '洋' },
  ] },
  { rad: '虫', chars: ['蝴', '蝶'], sentences: [
    { text: '__蝶停在花上。', answer: '蝴' },
    { text: '蝴__有美麗的翅膀。', answer: '蝶' },
  ] },
];

// Characters for the radical game: every lesson character, plus extra
// characters from the "find the radical" activity pages.
export const RADICAL_CHARS = [
  ...LESSONS.flatMap(l => l.chars.map(char => ({ char, rad: l.rad }))),
  { char: '早', rad: '日' }, { char: '晚', rad: '日' },
  { char: '流', rad: '水' },
  { char: '蜜', rad: '虫' }, { char: '蜂', rad: '虫' }, { char: '蛇', rad: '虫' },
  { char: '蜻', rad: '虫' }, { char: '蜓', rad: '虫' }, { char: '蛙', rad: '虫' },
].map(x => ({ ...x, id: `rad-${x.char}` }));

// Fill-in questions, one per sentence.
export const FILL_ITEMS = LESSONS.flatMap(l => l.sentences.map((s, i) => ({
  id: `fill-${l.chars.join('')}-${i}`,
  rad: l.rad,
  pair: l.chars,
  text: s.text,
  answer: s.answer,
})));
