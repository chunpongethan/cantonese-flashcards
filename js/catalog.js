// The full word pool: built-in words plus the parent's own words.
import { WORDS, CATEGORIES, MY_CATEGORY } from './words.js';
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
