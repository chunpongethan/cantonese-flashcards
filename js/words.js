// 字卡資料 — Word list.
// Add your own words here. Fields:
//   id        unique key (used to save progress)
//   char      the Traditional Chinese word shown on the card
//   jyutping  Cantonese romanisation (shown only if turned on in the parent corner)
//   say       what the voice reads aloud (defaults to char)
//   emoji     picture for the card
//   count     (numbers) repeat the emoji this many times
//   color     (colours) show a colour swatch instead of an emoji
//   cat       category id (see CATEGORIES)

export const CATEGORIES = [
  { id: 'animals', name: '動物', en: 'Animals', emoji: '🐶', color: '#FFB74D' },
  { id: 'nature',  name: '自然', en: 'Nature',  emoji: '🌈', color: '#81C784' },
  { id: 'body',    name: '身體', en: 'Body',    emoji: '✋', color: '#F48FB1' },
  { id: 'numbers', name: '數字', en: 'Numbers', emoji: '🔢', color: '#64B5F6' },
  { id: 'food',    name: '食物', en: 'Food',    emoji: '🍎', color: '#FF8A65' },
  { id: 'colors',  name: '顏色', en: 'Colours', emoji: '🎨', color: '#BA68C8' },
  { id: 'family',  name: '家人', en: 'Family',  emoji: '👨‍👩‍👧', color: '#4DB6AC' },
  { id: 'things',  name: '物件', en: 'Things',  emoji: '🚗', color: '#90A4AE' },
];

// Category for words a parent adds in the parent corner.
export const MY_CATEGORY = { id: 'mine', name: '我的字', en: 'My words', emoji: '💖', color: '#F06292' };

// English for the built-in words (same pictures). Words left out here
// (e.g. 弟弟, which would clash with 哥哥 as "brother") don't appear in English.
export const ENGLISH = {
  貓: 'cat', 狗: 'dog', 魚: 'fish', 鳥: 'bird', 牛: 'cow', 馬: 'horse', 羊: 'sheep', 豬: 'pig', 雞: 'chicken', 兔: 'rabbit',
  日: 'sun', 月: 'moon', 山: 'mountain', 水: 'water', 火: 'fire', 雨: 'rain', 花: 'flower', 樹: 'tree', 雲: 'cloud', 星: 'star',
  口: 'mouth', 手: 'hand', 目: 'eye', 耳: 'ear', 鼻: 'nose', 頭: 'head', 牙: 'tooth', 腳: 'foot',
  一: 'one', 二: 'two', 三: 'three', 四: 'four', 五: 'five', 六: 'six', 七: 'seven', 八: 'eight', 九: 'nine', 十: 'ten',
  米: 'rice', 蛋: 'egg', 奶: 'milk', 糖: 'sweets', 菜: 'vegetables', 蘋果: 'apple', 香蕉: 'banana', 西瓜: 'watermelon', 麵包: 'bread', 雪糕: 'ice cream',
  紅: 'red', 黃: 'yellow', 藍: 'blue', 綠: 'green', 白: 'white', 黑: 'black',
  爸爸: 'dad', 媽媽: 'mum', 哥哥: 'brother', 姐姐: 'sister', 妹妹: 'baby', 公公: 'grandpa', 婆婆: 'grandma',
  車: 'car', 船: 'boat', 書: 'book', 門: 'door', 球: 'ball', 杯: 'cup', 傘: 'umbrella', 鞋: 'shoes', 衫: 'T-shirt', 飛機: 'aeroplane',
};

export const PRAISE_EN = ['Great job!', 'Well done!', 'Super!', 'Good job!', 'Yes, you got it!'];

const w = (cat, list) => list.map(([char, jyutping, emoji, extra = {}]) => ({
  id: `${cat}-${char}`, cat, char, jyutping, emoji, say: char, ...extra,
}));

export const WORDS = [
  ...w('animals', [
    ['貓', 'maau1', '🐱'],
    ['狗', 'gau2', '🐶'],
    ['魚', 'jyu2', '🐟'],
    ['鳥', 'niu5', '🐦'],
    ['牛', 'ngau4', '🐮'],
    ['馬', 'maa5', '🐴'],
    ['羊', 'joeng4', '🐑'],
    ['豬', 'zyu1', '🐷'],
    ['雞', 'gai1', '🐔'],
    ['兔', 'tou3', '🐰'],
  ]),
  ...w('nature', [
    ['日', 'jat6', '☀️'],
    ['月', 'jyut6', '🌙'],
    ['山', 'saan1', '⛰️'],
    ['水', 'seoi2', '💧'],
    ['火', 'fo2', '🔥'],
    ['雨', 'jyu5', '🌧️'],
    ['花', 'faa1', '🌸'],
    ['樹', 'syu6', '🌳'],
    ['雲', 'wan4', '☁️'],
    ['星', 'sing1', '⭐'],
  ]),
  ...w('body', [
    ['口', 'hau2', '👄'],
    ['手', 'sau2', '✋'],
    ['目', 'muk6', '👁️'],
    ['耳', 'ji5', '👂'],
    ['鼻', 'bei6', '👃'],
    ['頭', 'tau4', '👦'],
    ['牙', 'ngaa4', '🦷'],
    ['腳', 'goek3', '🦶'],
  ]),
  ...w('numbers', [
    ['一', 'jat1', '🍎', { count: 1 }],
    ['二', 'ji6', '🍎', { count: 2 }],
    ['三', 'saam1', '🍎', { count: 3 }],
    ['四', 'sei3', '🍎', { count: 4 }],
    ['五', 'ng5', '🍎', { count: 5 }],
    ['六', 'luk6', '🍎', { count: 6 }],
    ['七', 'cat1', '🍎', { count: 7 }],
    ['八', 'baat3', '🍎', { count: 8 }],
    ['九', 'gau2', '🍎', { count: 9 }],
    ['十', 'sap6', '🍎', { count: 10 }],
  ]),
  ...w('food', [
    ['米', 'mai5', '🍚'],
    ['蛋', 'daan2', '🥚'],
    ['奶', 'naai5', '🥛'],
    ['糖', 'tong2', '🍬'],
    ['菜', 'coi3', '🥬'],
    ['蘋果', 'ping4 gwo2', '🍎'],
    ['香蕉', 'hoeng1 ziu1', '🍌'],
    ['西瓜', 'sai1 gwaa1', '🍉'],
    ['麵包', 'min6 baau1', '🍞'],
    ['雪糕', 'syut3 gou1', '🍦'],
  ]),
  ...w('colors', [
    ['紅', 'hung4', '', { color: '#E53935', say: '紅色' }],
    ['黃', 'wong4', '', { color: '#FDD835', say: '黃色' }],
    ['藍', 'laam4', '', { color: '#1E88E5', say: '藍色' }],
    ['綠', 'luk6', '', { color: '#43A047', say: '綠色' }],
    ['白', 'baak6', '', { color: '#FFFFFF', say: '白色' }],
    ['黑', 'hak1', '', { color: '#212121', say: '黑色' }],
  ]),
  ...w('family', [
    ['爸爸', 'baa4 baa1', '👨'],
    ['媽媽', 'maa4 maa1', '👩'],
    ['哥哥', 'go4 go1', '👦'],
    ['姐姐', 'ze4 ze1', '👧'],
    ['弟弟', 'dai4 dai2', '🧒'],
    ['妹妹', 'mui4 mui2', '👶'],
    ['公公', 'gung4 gung1', '👴'],
    ['婆婆', 'po4 po2', '👵'],
  ]),
  ...w('things', [
    ['車', 'ce1', '🚗'],
    ['船', 'syun4', '⛵'],
    ['書', 'syu1', '📖'],
    ['門', 'mun4', '🚪'],
    ['球', 'kau4', '⚽'],
    ['杯', 'bui1', '🥤'],
    ['傘', 'saan3', '☂️'],
    ['鞋', 'haai4', '👟'],
    ['衫', 'saam1', '👕'],
    ['飛機', 'fei1 gei1', '✈️'],
  ]),
];

export const PRAISE = ['好叻呀！', '啱啦！', '好犀利！', '做得好！', '叻仔！'];
