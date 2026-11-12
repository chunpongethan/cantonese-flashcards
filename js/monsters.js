// 怪獸貼紙 — original collectible monster stickers, drawn as SVG in code.
// 20 families × 2 forms (baby → evolved) = 40 stickers. Collect 3 of a baby to evolve it.

export const TYPES = {
  fire:  { name: '火', icon: '🔥' },
  water: { name: '水', icon: '💧' },
  grass: { name: '草', icon: '🌿' },
  spark: { name: '電', icon: '⚡' },
  rock:  { name: '石', icon: '🪨' },
  ice:   { name: '冰', icon: '❄️' },
  sky:   { name: '風', icon: '☁️' },
  star:  { name: '星', icon: '⭐' },
};

export const EVOLVE_AT = 3;

// shape: round | egg | bean | pear     eyes: dot | big | happy | sleepy | wink
export const FAMILIES = [
  { id: 'm01', type: 'fire',  name: '火波波', evo: '炎波王',   color: '#FF8A50', shape: 'round', eyes: 'big' },
  { id: 'm02', type: 'water', name: '水咚咚', evo: '海浪王',   color: '#4FA3F7', shape: 'round', eyes: 'dot' },
  { id: 'm03', type: 'grass', name: '芽芽',   evo: '森林芽',   color: '#7CCB6B', shape: 'egg',   eyes: 'happy' },
  { id: 'm04', type: 'spark', name: '電電',   evo: '雷電王',   color: '#9C7BE0', shape: 'round', eyes: 'big' },
  { id: 'm05', type: 'rock',  name: '石頭仔', evo: '岩石巨人', color: '#B08A6E', shape: 'pear',  eyes: 'dot' },
  { id: 'm06', type: 'ice',   name: '冰冰',   evo: '冰雪后',   color: '#9ED8F0', shape: 'egg',   eyes: 'big' },
  { id: 'm07', type: 'sky',   name: '雲朵朵', evo: '彩虹雲',   color: '#F7A8C8', shape: 'bean',  eyes: 'sleepy' },
  { id: 'm08', type: 'star',  name: '星星仔', evo: '銀河獸',   color: '#5C6BC0', shape: 'round', eyes: 'wink' },
  { id: 'm09', type: 'fire',  name: '辣椒仔', evo: '辣辣王',   color: '#EF6C5A', shape: 'bean',  eyes: 'happy' },
  { id: 'm10', type: 'water', name: '泡泡仔', evo: '泡泡大王', color: '#4DD0C8', shape: 'bean',  eyes: 'big' },
  { id: 'm11', type: 'grass', name: '花花',   evo: '花仙子',   color: '#A5D86A', shape: 'round', eyes: 'wink' },
  { id: 'm12', type: 'spark', name: '電光仔', evo: '霹靂王',   color: '#3FB8B0', shape: 'pear',  eyes: 'happy' },
  { id: 'm13', type: 'rock',  name: '小石',   evo: '山大王',   color: '#9AA3AD', shape: 'round', eyes: 'sleepy' },
  { id: 'm14', type: 'ice',   name: '雪球',   evo: '暴風雪',   color: '#CFE9F7', shape: 'round', eyes: 'happy' },
  { id: 'm15', type: 'sky',   name: '風仔',   evo: '旋風王',   color: '#8FD3F5', shape: 'pear',  eyes: 'big' },
  { id: 'm16', type: 'star',  name: '小月',   evo: '滿月仙',   color: '#F2C14E', shape: 'egg',   eyes: 'sleepy' },
  { id: 'm17', type: 'fire',  name: '火花仔', evo: '烈焰龍',   color: '#FFB74D', shape: 'pear',  eyes: 'wink' },
  { id: 'm18', type: 'water', name: '雨點點', evo: '大雨神',   color: '#6C9BE8', shape: 'egg',   eyes: 'happy' },
  { id: 'm19', type: 'grass', name: '葉仔',   evo: '大樹精',   color: '#5DB37E', shape: 'pear',  eyes: 'big' },
  { id: 'm20', type: 'star',  name: '星光仔', evo: '流星王',   color: '#B388EB', shape: 'bean',  eyes: 'dot' },
];

export const TOTAL_FORMS = FAMILIES.length * 2;
export const family = id => FAMILIES.find(f => f.id === id);
export const formName = (f, stage) => (stage === 2 ? f.evo : f.name);

// ---------- Drawing ----------
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Top of the head and eye line for each body shape.
const SHAPES = {
  round: { top: 28, eyeY: 54, body: (c, s) => `<circle cx="50" cy="60" r="30" fill="${c}" stroke="${s}" stroke-width="2.5"/>` },
  egg:   { top: 24, eyeY: 52, body: (c, s) => `<ellipse cx="50" cy="58" rx="26" ry="33" fill="${c}" stroke="${s}" stroke-width="2.5"/>` },
  bean:  { top: 32, eyeY: 55, body: (c, s) => `<rect x="17" y="32" width="66" height="56" rx="28" fill="${c}" stroke="${s}" stroke-width="2.5"/>` },
  pear:  { top: 25, eyeY: 55, body: (c, s) => `<path d="M50 25 C68 25 81 50 81 67 C81 83 67 90 50 90 C33 90 19 83 19 67 C19 50 32 25 50 25Z" fill="${c}" stroke="${s}" stroke-width="2.5"/>` },
};

const INK = '#3B2A2A';

function eye(style, x, y, big) {
  const r = big ? 1.12 : 1;
  const shine = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="${1.5 * r}" fill="#fff"/>`;
  switch (style) {
    case 'big':
      return `<ellipse cx="${x}" cy="${y}" rx="${6.5 * r}" ry="${7 * r}" fill="#fff" stroke="${INK}" stroke-width="1.2"/>` +
        `<circle cx="${x + 0.8}" cy="${y + 0.8}" r="${4.2 * r}" fill="${INK}"/>${shine(x + 2.2, y - 1.2)}`;
    case 'happy':
      return `<path d="M${x - 5} ${y + 1.5} Q${x} ${y - 5} ${x + 5} ${y + 1.5}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    case 'sleepy':
      return `<path d="M${x - 5} ${y - 0.5} Q${x} ${y + 4} ${x + 5} ${y - 0.5}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    case 'dot':
    default:
      return `<circle cx="${x}" cy="${y}" r="${4.3 * r}" fill="${INK}"/>${shine(x + 1.5, y - 1.5)}`;
  }
}

function face(f, big, eyeY) {
  const left = f.eyes === 'wink' ? 'big' : f.eyes;
  const right = f.eyes === 'wink' ? 'happy' : f.eyes;
  const my = eyeY + 11;
  const mouth = big
    ? `<path d="M43.5 ${my} Q50 ${my + 10} 56.5 ${my} Z" fill="#8E3B46" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<ellipse cx="50" cy="${my + 5}" rx="3.2" ry="2" fill="#F48FB1"/>`
    : `<path d="M45 ${my} Q50 ${my + 5} 55 ${my}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
  const blush = f.type === 'spark' ? '' :
    `<ellipse cx="31" cy="${eyeY + 8}" rx="4.5" ry="3" fill="#FF8A80" opacity=".45"/>` +
    `<ellipse cx="69" cy="${eyeY + 8}" rx="4.5" ry="3" fill="#FF8A80" opacity=".45"/>`;
  return eye(left, 40, eyeY, big) + eye(right, 60, eyeY, big) + blush + mouth;
}

// Things drawn behind the body (wings, fins).
function behind(f, big, c, dark, light) {
  if (f.type === 'sky') {
    const s = big ? 1.35 : 1;
    const wing = dir => `<path transform="translate(50 60) scale(${dir * s} ${s}) translate(-50 -60)" d="M24 56 C10 50 6 62 12 66 C6 72 16 78 24 72 Z" fill="#fff" stroke="${dark}" stroke-width="2"/>`;
    return wing(1) + wing(-1);
  }
  if (f.type === 'water' && big) {
    return `<path d="M20 62 C8 56 8 72 18 74 Z" fill="${light}" stroke="${dark}" stroke-width="2"/>` +
      `<path d="M80 62 C92 56 92 72 82 74 Z" fill="${light}" stroke="${dark}" stroke-width="2"/>`;
  }
  return '';
}

// The type mark on top of the head.
function crest(f, big, t, c, dark) {
  const k = big ? 1.3 : 1;
  const at = inner => `<g transform="translate(50 ${t + 2}) scale(${k}) translate(-50 ${-(t + 2)})">${inner}</g>`;
  switch (f.type) {
    case 'fire': {
      const flame = (dx, sc) => `<g transform="translate(${50 + dx} ${t + 2}) scale(${sc}) translate(-50 ${-(t + 2)})">` +
        `<path d="M50 ${t - 20} C59 ${t - 10} 62 ${t - 3} 58 ${t + 4} C55 ${t + 8} 45 ${t + 8} 42 ${t + 4} C38 ${t - 3} 44 ${t - 8} 46 ${t - 13} C48 ${t - 8} 50 ${t - 9} 50 ${t - 20}Z" fill="#FF7043" stroke="${dark}" stroke-width="1.5"/>` +
        `<path d="M50 ${t - 9} C54 ${t - 4} 55 ${t} 53 ${t + 3} C51 ${t + 5} 48 ${t + 5} 47 ${t + 3} C45 ${t} 47 ${t - 3} 50 ${t - 9}Z" fill="#FFD54F"/></g>`;
      return big ? flame(-13, 0.8) + flame(13, 0.8) + flame(0, 1.25) : flame(0, 1);
    }
    case 'water':
      return at(`<path d="M50 ${t + 3} Q55 ${t - 6} 50 ${t - 12}" fill="none" stroke="${dark}" stroke-width="2.2" stroke-linecap="round"/>` +
        `<path d="M50 ${t - 26} C57 ${t - 18} 58 ${t - 13} 50 ${t - 10} C42 ${t - 13} 43 ${t - 18} 50 ${t - 26}Z" fill="#4FC3F7" stroke="${dark}" stroke-width="1.5"/>` +
        `<circle cx="47.5" cy="${t - 16}" r="1.6" fill="#fff"/>`);
    case 'grass': {
      const leaf = `<path d="M50 ${t + 3} C45 ${t - 6} 36 ${t - 11} 28 ${t - 7} C34 ${t + 1} 43 ${t + 4} 50 ${t + 3}Z" fill="#43A047" stroke="${dark}" stroke-width="1.3"/>` +
        `<path d="M50 ${t + 3} C55 ${t - 6} 64 ${t - 11} 72 ${t - 7} C66 ${t + 1} 57 ${t + 4} 50 ${t + 3}Z" fill="#66BB6A" stroke="${dark}" stroke-width="1.3"/>`;
      const flower = big
        ? [0, 72, 144, 216, 288].map(a => `<circle cx="${50 + 5 * Math.cos(a * Math.PI / 180)}" cy="${t - 8 + 5 * Math.sin(a * Math.PI / 180)}" r="3.6" fill="#F48FB1"/>`).join('') +
          `<circle cx="50" cy="${t - 8}" r="2.8" fill="#FFD54F"/>`
        : '';
      return at(leaf + flower);
    }
    case 'spark': {
      const ball = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="#FFF59D" opacity=".45"/><circle cx="${x}" cy="${y}" r="4.5" fill="#FFEE58" stroke="${dark}" stroke-width="1.3"/>`;
      return at(`<path d="M42 ${t + 5} L35 ${t - 11}" stroke="${dark}" stroke-width="2.2" stroke-linecap="round"/>` +
        `<path d="M58 ${t + 5} L65 ${t - 11}" stroke="${dark}" stroke-width="2.2" stroke-linecap="round"/>` +
        ball(35, t - 13) + ball(65, t - 13) +
        (big ? `<path d="M50 ${t - 2} L46 ${t - 14} L51 ${t - 12} L49 ${t - 22}" fill="none" stroke="#FDD835" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ''));
    }
    case 'rock': {
      const horn = (x1, x2, x3, h) => `<path d="M${x1} ${t + 7} L${x2} ${t - h} L${x3} ${t + 5}Z" fill="#8D6E63" stroke="${dark}" stroke-width="1.5" stroke-linejoin="round"/>`;
      return at(horn(35, 38, 45, 9) + horn(55, 62, 65, 9) + (big ? horn(45, 50, 55, 14) : ''));
    }
    case 'ice': {
      const shard = (x, h, w) => `<path d="M${x - w} ${t + 5} L${x} ${t - h} L${x + w} ${t + 5}Z" fill="#E1F5FE" stroke="#4FC3F7" stroke-width="1.5" stroke-linejoin="round"/>`;
      return at(shard(40, 8, 4) + shard(50, 15, 5) + shard(60, 8, 4) + (big ? shard(31, 5, 3) + shard(69, 5, 3) : ''));
    }
    case 'sky':
      return at(`<circle cx="44" cy="${t - 2}" r="6" fill="#fff" stroke="${dark}" stroke-width="1.3"/>` +
        `<circle cx="52" cy="${t - 6}" r="7.5" fill="#fff" stroke="${dark}" stroke-width="1.3"/>` +
        `<circle cx="59" cy="${t - 1}" r="5" fill="#fff" stroke="${dark}" stroke-width="1.3"/>` +
        `<rect x="40" y="${t - 2}" width="22" height="6" fill="#fff"/>`);
    case 'star': {
      const star = (cx, cy, r) => {
        const pts = Array.from({ length: 10 }, (_, i) => {
          const a = -Math.PI / 2 + i * Math.PI / 5;
          const rr = i % 2 ? r * 0.45 : r;
          return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
        }).join(' ');
        return `<polygon points="${pts}" fill="#FFD54F" stroke="${dark}" stroke-width="1.3" stroke-linejoin="round"/>`;
      };
      return at(`<path d="M50 ${t + 3} L50 ${t - 9}" stroke="${dark}" stroke-width="2.2" stroke-linecap="round"/>` + star(50, t - 13, 7)) +
        (big ? star(34, t + 2, 5) + star(66, t + 2, 5) : '');
    }
    default:
      return '';
  }
}

function sparkles() {
  const s = (x, y, r) => `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="#FFD54F"/>`;
  return s(13, 22, 5) + s(87, 28, 4) + s(14, 76, 3.5) + s(88, 80, 4.5);
}

// Returns an SVG string for a monster. stage 1 = baby, 2 = evolved.
export function monsterSVG(f, stage = 1) {
  const big = stage === 2;
  const sh = SHAPES[f.shape] || SHAPES.round;
  const c = f.color;
  const dark = shade(c, -0.35);
  const light = shade(c, 0.55);
  const t = sh.top;
  const parts = [];
  if (big) parts.push(`<circle cx="50" cy="58" r="45" fill="${light}" opacity=".5"/>`, sparkles());
  parts.push(`<ellipse cx="50" cy="93" rx="${big ? 30 : 24}" ry="4" fill="#000" opacity=".12"/>`);
  if (big) {
    parts.push(`<path d="M74 78 C92 78 95 60 86 55" fill="none" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>`,
      `<path d="M74 78 C92 78 95 60 86 55" fill="none" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/>`);
  }
  parts.push(behind(f, big, c, dark, light));
  parts.push(`<ellipse cx="38" cy="89" rx="9" ry="5" fill="${dark}"/><ellipse cx="62" cy="89" rx="9" ry="5" fill="${dark}"/>`);
  parts.push(sh.body(c, dark));
  parts.push(`<ellipse cx="50" cy="${sh.eyeY + 18}" rx="15" ry="11" fill="${light}" opacity=".85"/>`);
  if (f.type === 'rock') {
    parts.push(`<path d="M26 66 l5 -3 l4 3 l-4 3Z M70 70 l4 -3 l4 3 l-4 3Z" fill="${dark}" opacity=".45"/>`);
  }
  parts.push(face(f, big, sh.eyeY));
  parts.push(crest(f, big, t, c, dark));
  const body = parts.join('');
  const inner = big ? body : `<g transform="translate(50 93) scale(.88) translate(-50 -93)">${body}</g>`;
  return `<svg viewBox="0 -6 100 106" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${formName(f, stage)}">${inner}</svg>`;
}
