# Daily Challenge — 中文 · English · 數學

A phone-friendly daily learning game for a young child: Traditional Chinese with a Cantonese voice, English words with an English voice, and simple maths.

## Subjects and games
The home screen has three subjects: **📖 中文**, **🔤 English** and **🔢 數學**. Each opens its own list of games (⬅️ goes back one step, 🏠 goes home).

- **翻翻卡 Flip & Listen**: see the picture, tap to flip, then hear and see the word.
- **聽聽揀揀 Listen & Pick**: hear 「邊個係…字？」 and tap the right character.
- **配對遊戲 Matching Pairs**: match each picture card with its character card.
- **寫寫字 Tracing**: watch the stroke order, then trace the character with a finger. This mode needs internet the first time.
- **🔤 English**: Flip Cards, Listen & Pick ("Which one is cat?"), Match and **🔡 Spelling**, using the same pictures and categories with English words and an English voice (British accent preferred). Flip cards show the Chinese word as a small hint.
- **🔡 Spelling**: see the picture, hear "Spell cat.", then tap the letter tiles in order. 💡 shows the next letter, and after 2 wrong taps the right tile glows by itself. Each word earns +1 ⭐ and loses at most 1 ⭐.
- **🔢 數學 Maths**: adding and taking away. Tap the right answer from 3–4 choices. 1-digit questions show apples to count; 2–3 digit questions are laid out in columns (豎式).

Every round ends with stars and a new sticker for the sticker book (📒).

## Stars and gifts
- Each right answer (or flipped card, matched pair, traced word) earns 1 ⭐, up to a **daily limit** (20 by default). Stars lost for wrong answers don't free up room under the limit.
- In 聽聽揀揀 (Listen & Pick), English Listen & Pick and 數學 (Maths), each **wrong answer loses 1 ⭐**. The bank never goes below 0.
- Stars are kept in the **⭐ 星星銀行** (star bank) on the home screen, where the child can swap them for gifts. Each swap asks the child to confirm first.

## Parent corner
Press and hold ⚙️ on the home screen for 2 seconds. There you can:
- choose the Cantonese and English voices and the speed, turn Jyutping on or off, set cards per round, pick categories, and reset progress;
- **⭐ 星星規則 (star rules):** set the daily star limit (or 不限 for no limit) and turn star loss for wrong answers on or off;
- **🔤 English:** the longest word in the spelling game (≤4 letters by default, ≤6, or all);
- **🔢 數學 (maths):** numbers up to 1, 2 or 3 digits (0–9 / 0–99 / 0–999), and turn 加數 (adding) and 減數 (taking away) on or off;
- **🎁 禮物 (gifts):** add gifts (emoji, name, star cost), change a gift's cost or delete it, and see the exchange record. Mark each gift **已俾** (given) when you hand it over, or **退還** (refund) to put the stars back if it was tapped by mistake.

## Run it
```
node serve.js
```
Then open http://localhost:3000. A phone on the same Wi-Fi can use the address the server prints, for example `http://192.168.x.x:3000`.

To install it on the home screen and use it offline, host the folder over **https** (for example GitHub Pages or Netlify). Then use "Add to Home Screen" in Safari (iPhone) or Chrome (Android).

## Cantonese voice
The game uses the phone's built-in Cantonese voice:
- **iPhone / iPad**: Settings › Accessibility › Spoken Content › Voices › Chinese › Chinese (Hong Kong). Download a voice.
- **Android**: Settings › Text-to-speech output › Speech Services by Google › Install voice data › Cantonese (Hong Kong).

## Add your own words
**On the phone:** open the parent corner and use **✏️ 自己加字**. Type 1–4 Chinese characters, then add an emoji or take/choose a photo. Jyutping, category, an English word (so it also appears in English) and a "讀法" (spelling for the voice to read, if it mispronounces the word) are optional. Words go into **💖 我的字** by default, or any existing category. They're saved on that phone only, and resetting progress keeps them.

**In the code:** edit `js/words.js`. Each line looks like `['貓', 'maau1', '🐱']`: the character, its Jyutping and an emoji. After that, bump `VERSION` in `sw.js` so phones pick up the change.

## Cloud sync (☁️ 雲端同步)
Linked phones share parent settings, gifts, your own words (with photos), stars, stickers and the exchange record. Voice choices stay per phone.
- It uses **Firebase Firestore** (free). Put the project's web config in `js/firebase-config.js`, and paste `firestore.rules` into Firestore › Rules.
- **First phone:** parent corner › ☁️ 雲端同步 › **建立家庭代碼**. **Other phones:** type that 16-character code and tap **連結** (that phone's data is replaced by the cloud copy).
- Keep the family code private, because anyone with it can see and change your family's data.
- If two phones change the same part at the same time, the later change wins.
