# 粵語識字卡 — Cantonese Flash Cards

A phone-friendly flash card game for a young child learning to read Traditional Chinese characters, with Cantonese voice.

## Modes
- **翻翻卡 Flip & Listen**: see the picture, tap to flip, then hear and see the word.
- **聽聽揀揀 Listen & Pick**: hear 「邊個係…呀？」 and tap the right character.
- **配對遊戲 Matching Pairs**: match each picture card with its character card.
- **寫寫字 Tracing**: watch the stroke order, then trace the character with a finger. This mode needs internet the first time.

Every round ends with stars and a new sticker for the sticker book (📒).

## Parent corner
Press and hold ⚙️ on the home screen for 2 seconds. There you can choose the voice and speed, turn Jyutping on or off, set cards per round, pick categories, and reset progress.

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
Edit `js/words.js`. Each line looks like `['貓', 'maau1', '🐱']`: the character, its Jyutping and an emoji. After that, bump `VERSION` in `sw.js` so phones pick up the change.
