// The full word pool: built-in words plus the parent's own words.
import { WORDS, CATEGORIES, MY_CATEGORY, ENGLISH } from './words.js';
import * as store from './store.js';

export const allWords = () => [...WORDS, ...store.customWords()];

// "我的字" only shows up once it has words in it.
export const allCategories = () =>
  (store.customWords().some(w => w.cat === MY_CATEGORY.id) ? [...CATEGORIES, MY_CATEGORY] : CATEGORIES);

export function enabledCategories() {
  const off = store.settings().catsOff || [];
  const on = allCategories().filter(c => !off.includes(c.id));
  return on.length ? on : allCategories();
}

// Categories a parent can file a new word under.
export const categoryOptions = () => [MY_CATEGORY, ...CATEGORIES];

// English versions of every word that has an English word (built-in or the parent's own).
// They keep the same picture; the Chinese word rides along as a small hint.
export function englishWords() {
  return allWords()
    .map(w => ({ w, en: (w.en || ENGLISH[w.char] || '').trim() }))
    .filter(x => x.en)
    .map(({ w, en }) => ({
      ...w,
      id: `en-${w.id}`,
      char: en,
      say: en,
      zh: w.char,
      jyutping: '',
      lang: 'en',
    }));
}

// Enabled categories that have at least one English word.
export function englishCategories() {
  const words = englishWords();
  return enabledCategories().filter(c => words.some(w => w.cat === c.id));
}
