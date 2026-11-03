// Enhanced ASCII renderer for HRVSTMN.
//
// The engine writes plain (glyph, fg, bg) cells plus semantic CellTags (tile
// name, world position, deco, entity). This module turns that into a richer
// picture: textured ground, crafted buildings, seasonal palettes, time-of-day
// lighting with lanterns and lit windows, and animated weather. It never
// changes game state, so 'classic' and 'enhanced' are pure presentation.

import type { Cell, CellTag, RenderCtx, Screen } from './screen';
import { PALETTE } from './constants';

export type OutCell = {
  ch: string;
  fg: string;
  bg: string;
  bold: boolean;
  glow?: string;
  glowR?: number;
  /** Horizontal offset in cells, used to centre a glyph in a 2-cell tile. */
  dx?: number;
};

// ---------------------------------------------------------------- colour math

type RGB = [number, number, number];
const rgbCache = new Map<string, RGB>();
export function hexToRgb(h: string): RGB {
  let c = rgbCache.get(h);
  if (!c) {
    const s = h.charAt(0) === '#' ? h.slice(1) : h;
    c = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    if (rgbCache.size > 4096) rgbCache.clear();
    rgbCache.set(h, c);
  }
  return c;
}
const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
export function rgbToHex(c: RGB): string {
  return '#' + ((1 << 24) | (clamp255(c[0]) << 16) | (clamp255(c[1]) << 8) | clamp255(c[2])).toString(16).slice(1);
}
export function mix(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}
const pal = (code: string, fallback = '#ffffff') => (PALETTE[code] ? `#${PALETTE[code]}` : fallback);

/** Stable per-cell noise in [0, 1). Seeded by world coordinates so textures don't shimmer when the camera scrolls. */
export function hash(x: number, y: number, s = 0): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
}
const pick = <T,>(arr: readonly T[], h: number): T => arr[Math.floor(h * arr.length) % arr.length];

// ---------------------------------------------------------------- themes

type Theme = {
  grassBg: string;
  grassBg2: string;
  grassDetail: string;
  tuft: string;
  trees: string[];
  treeBg: string;
  treeGlyphs: [string, string];
  soilBg: string;
  soilDot: string;
  weed: string;
  waterBg: string;
  waterBg2: string;
  waterFg: string;
  leaves?: string[];
  snow?: boolean;
  blossom?: string[];
  fruit?: string;
  wildflowers?: string[];
  lilies?: boolean;
};

export const THEMES: Theme[] = [
  {
    // Spring
    grassBg: '#0c1f0b', grassBg2: '#11290f', grassDetail: '#2c6e1e', tuft: '#4fc12c',
    trees: ['#3fe01a', '#2fb814', '#24910f'], treeBg: '#071606', treeGlyphs: ['♣', '♠'],
    soilBg: '#1d150e', soilDot: '#4a3826', weed: '#3fa52a',
    waterBg: '#03204e', waterBg2: '#062c66', waterFg: '#3d8cff',
    blossom: ['#ffa8d8', '#ffd0ec', '#ff80c0'], wildflowers: ['#ffe27a', '#ff9ad0', '#ffffff', '#b8a0ff'],
  },
  {
    // Summer
    grassBg: '#0a2408', grassBg2: '#0f300b', grassDetail: '#2f8a1a', tuft: '#62dc2c',
    trees: ['#2fd010', '#22aa0c', '#188a08'], treeBg: '#041404', treeGlyphs: ['♣', '♠'],
    soilBg: '#22180e', soilDot: '#55402a', weed: '#48b82a',
    waterBg: '#022456', waterBg2: '#053272', waterFg: '#45a0ff',
    fruit: '#ff4a3a', wildflowers: ['#ffe27a', '#ff6a6a', '#ffffff'], lilies: true,
  },
  {
    // Fall
    grassBg: '#1f1a0b', grassBg2: '#272010', grassDetail: '#6e5a22', tuft: '#b0902c',
    trees: ['#ff9900', '#ff5a1a', '#e8b400', '#c8361a', '#ff7a10'], treeBg: '#170c04', treeGlyphs: ['♣', '♠'],
    soilBg: '#1f140c', soilDot: '#4a3424', weed: '#a8a030',
    waterBg: '#0a2040', waterBg2: '#0e2a52', waterFg: '#4a88d8',
    leaves: ['#ff9900', '#ff5a1a', '#e8b400'],
  },
  {
    // Winter
    grassBg: '#262e3a', grassBg2: '#2e3846', grassDetail: '#c8d4e4', tuft: '#9aa8b8',
    trees: ['#9ab8c8', '#c8d8e8', '#7a98a8'], treeBg: '#121820', treeGlyphs: ['♠', '♠'],
    soilBg: '#262a30', soilDot: '#8a96a6', weed: '#a0aab4',
    waterBg: '#10304e', waterBg2: '#143a5c', waterFg: '#8ac8ff',
    snow: true,
  },
];

// ---------------------------------------------------------------- lighting

export type Sky = {
  /** Ambient brightness multiplier 0..1. */
  amb: number;
  /** Colour the darkness leans toward, and how strongly. */
  tint: string;
  tintAmt: number;
  /** Whether lanterns / windows / fireflies should show. */
  lanterns: boolean;
  windowsLit: boolean;
};

type SkyKey = { h: number; amb: number; tint: string; tintAmt: number };
const SKY_KEYS: SkyKey[] = [
  { h: 0, amb: 0.3, tint: '#16204a', tintAmt: 0.5 },
  { h: 4, amb: 0.3, tint: '#16204a', tintAmt: 0.5 },
  { h: 5, amb: 0.62, tint: '#5a2a5a', tintAmt: 0.3 },
  { h: 6, amb: 1, tint: '#000000', tintAmt: 0 },
  { h: 16.5, amb: 1, tint: '#000000', tintAmt: 0 },
  { h: 18, amb: 0.78, tint: '#ff7a30', tintAmt: 0.22 },
  { h: 19.5, amb: 0.3, tint: '#16204a', tintAmt: 0.5 },
  { h: 24, amb: 0.3, tint: '#16204a', tintAmt: 0.5 },
];

/** Ambient light for a scene, from the in-game clock, location and weather. */
export function skyFor(ctx: Pick<RenderCtx, 'minutes' | 'indoor' | 'mapName' | 'weather'>): Sky {
  if (ctx.indoor) return { amb: 1, tint: '#000000', tintAmt: 0, lanterns: false, windowsLit: false };
  if (ctx.mapName === 'mine') return { amb: 0.24, tint: '#1a1208', tintAmt: 0.35, lanterns: true, windowsLit: false };
  const h = (((ctx.minutes / 60) % 24) + 24) % 24;
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].h <= h) i++;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
  let amb = a.amb + (b.amb - a.amb) * t;
  let tintAmt = a.tintAmt + (b.tintAmt - a.tintAmt) * t;
  let tint = a.tintAmt === 0 ? b.tint : b.tintAmt === 0 ? a.tint : mix(a.tint, b.tint, t);
  const w = ctx.weather;
  if (w === 'Rain' || w === 'Snow') {
    amb *= 0.86;
    tint = tintAmt > 0.05 ? mix(tint, '#506070', 0.4) : '#506070';
    tintAmt = Math.max(tintAmt, 0.16);
  } else if (w === 'Typhoon' || w === 'Blizzard') {
    amb *= 0.7;
    tint = tintAmt > 0.05 ? mix(tint, '#404c5c', 0.5) : '#404c5c';
    tintAmt = Math.max(tintAmt, 0.28);
  }
  return { amb, tint, tintAmt, lanterns: amb < 0.8, windowsLit: amb < 0.72 };
}

type Light = { x: number; y: number; r: number; col: RGB; k: number };

// ---------------------------------------------------------------- tile styling

const WALKABLE_OPEN = new Set(['grass', 'field', 'path', 'sand', 'flower', 'bridge']);
const WATERY = new Set(['water', 'fountain', 'spring', 'pond']);
const FLOOR_INDOOR = new Set(['floor', 'mfloor', 'exit', 'up', 'down']);

type Frame = {
  buf: Cell[][];
  tags: (CellTag | null)[][];
  theme: Theme;
  t: number;
  indoor: boolean;
};

const roofShades = (fgCode: string) => {
  const base = pal(fgCode, '#c02020');
  return { lit: mix(base, '#ffffff', 0.25), mid: mix(base, '#000000', 0.35), dark: mix(base, '#000000', 0.65) };
};

function grassBg(F: Frame, wx: number, wy: number) {
  return mix(F.theme.grassBg, F.theme.grassBg2, hash(wx, wy, 3));
}

/** Background a cell's ground would have, used under entities, roof edges and generic objects. */
function groundBg(F: Frame, tag: CellTag): string {
  const wx = tag.wx ?? 0;
  const wy = tag.wy ?? 0;
  switch (tag.t) {
    case 'field':
      return mix(F.theme.soilBg, '#000000', hash(wx, wy, 5) * 0.35);
    case 'path':
      return mix('#2a2622', '#34302a', hash(wx, wy, 6));
    case 'sand':
      return mix('#3a3020', '#443826', hash(wx, wy, 6));
    case 'floor':
      return wy % 2 ? '#3a2a1a' : '#36271a';
    case 'mfloor':
      return mix('#1e1a17', '#24201c', hash(wx, wy, 6));
    default:
      if (WATERY.has(tag.t)) return mix(F.theme.waterBg, F.theme.waterBg2, hash(wx, wy, 7));
      return F.indoor ? '#2a2018' : grassBg(F, wx, wy);
  }
}

/** Smooth 2D value noise in [0, 1). */
export function valueNoise(x: number, y: number, s = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s);
  const b = hash(x0 + 1, y0, s);
  const c = hash(x0, y0 + 1, s);
  const d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const SHADOW_CASTERS = new Set(['wall', 'door', 'roof', 'tree', 'cliff', 'bookcase', 'shelf', 'counter', 'mwall', 'iwall']);
const SHADOW_RECEIVERS = new Set(['grass', 'field', 'path', 'sand', 'flower', 'floor', 'mfloor', 'bridge']);

/** Style one tagged map cell (terrain, objects, crops, structures). */
export function styleTile(F: Frame, x: number, y: number, tag: CellTag, cell: Cell): OutCell {
  const th = F.theme;
  const wx = tag.wx ?? x;
  const wy = tag.wy ?? y;
  const sub = tag.sub ?? 0;
  const wide = (tag.zw ?? 1) > 1;
  // In large-tile mode the engine writes the tile's glyph into sub-cell 0 only.
  const lead = sub > 0 && x - sub >= 0 ? F.buf[y][x - sub] : cell;
  const g = lead[0];
  const fg = lead[1];
  const bold = lead[3];
  const h = hash(wx, wy);
  // per-sub-cell noise, so a 2-cell tile gets two independent texture samples
  const hs = wide ? hash(wx * 2 + sub, wy, 17) : h;
  const k = tag.k || '';
  /** A single glyph that should sit centred in its tile. */
  const centre = (o: OutCell): OutCell => (!wide ? o : sub === 0 ? { ...o, dx: 0.5 } : { ...o, ch: ' ', glow: undefined });

  // ---- objects on the field
  if (k.startsWith('obj:')) {
    const soil = groundBg(F, tag);
    switch (k) {
      case 'obj:weed':
        return centre({ ch: 'ψ', fg: mix(th.weed, '#000000', hash(wx, wy, 8) * 0.35), bg: soil, bold: false });
      case 'obj:stone':
        return centre({ ch: '•', fg: '#a9a9b4', bg: soil, bold: true });
      case 'obj:rock':
        return centre({ ch: '•', fg: '#78787f', bg: soil, bold: true });
      case 'obj:boulder':
        if (wide) return { ch: sub === 0 ? '◖' : '◗', fg: '#8c8c98', bg: soil, bold: false };
        return { ch: '●', fg: '#8c8c98', bg: mix(soil, '#3a342e', 0.6), bold: false };
      case 'obj:stump':
        return centre({ ch: '◉', fg: '#b8702e', bg: soil, bold: false });
      case 'obj:branch':
        return centre({ ch: '╱', fg: '#c58a4a', bg: soil, bold: true });
    }
  }
  if (k === 'forage') {
    return centre({ ch: g, fg: pal(fg), bg: groundBg(F, tag), bold: true, glow: pal(fg), glowR: 3 });
  }
  // ---- tilled soil and crops
  if (k.startsWith('soil') || k.startsWith('crop:')) {
    const wet = k.endsWith(':wet');
    const bg = wet ? mix('#160e08', '#1a1209', hash(wx, wy, 5)) : mix('#2c1c0f', '#321f10', hash(wx, wy, 5));
    if (k.startsWith('soil')) return { ch: '≡', fg: wet ? '#3c2c1e' : '#5a3e24', bg, bold: false };
    if (k.startsWith('crop:seed')) return centre({ ch: '∴', fg: '#c89058', bg, bold: false });
    if (k.startsWith('crop:sprout')) return centre({ ch: ',', fg: '#7ad04a', bg, bold: true });
    if (k.startsWith('crop:young')) return centre({ ch: '"', fg: '#5ae02a', bg, bold: true });
    // ripe: the crop's own glyph and colour, with a gentle "ready" glow
    return centre({ ch: g, fg: pal(fg), bg, bold: true, glow: pal(fg), glowR: 6 });
  }

  switch (tag.t) {
    case 'void':
      return { ch: ' ', fg: '#000000', bg: '#000000', bold: false };
    case 'grass': {
      const gb = grassBg(F, wx, wy);
      if (th.snow) {
        if (hs < 0.18) return { ch: hs < 0.08 ? '∙' : '·', fg: th.grassDetail, bg: gb, bold: false };
        return { ch: ' ', fg: th.grassDetail, bg: gb, bold: false };
      }
      // the engine's own tufts (',' and '"') stay, centred in their tile
      if (g === ',' || g === '"') return centre({ ch: g === '"' ? 'ʷ' : ',', fg: th.tuft, bg: gb, bold: false });
      if (th.leaves && hs < 0.07) return { ch: pick(['•', '❦', ','], hash(wx, wy, 9 + sub)), fg: pick(th.leaves, hash(wx, wy, 4 + sub)), bg: gb, bold: false };
      if (th.wildflowers && hs > 0.975) return { ch: '·', fg: pick(th.wildflowers, hash(wx, wy, 31 + sub)), bg: gb, bold: true };
      if (hs < 0.1) return { ch: "'", fg: th.grassDetail, bg: gb, bold: false };
      if (hs < 0.15) return { ch: '`', fg: th.grassDetail, bg: gb, bold: false };
      return { ch: ' ', fg: th.grassDetail, bg: gb, bold: false };
    }
    case 'flower': {
      const gb = grassBg(F, wx, wy);
      if (th.snow || g === '.') return { ch: '·', fg: th.grassDetail, bg: gb, bold: false };
      if (wide && sub === 1) return { ch: hash(wx, wy, 33) < 0.5 ? ',' : ' ', fg: th.tuft, bg: gb, bold: false };
      return centre({ ch: pick(['✿', '❀'], hash(wx, wy, 2)), fg: pal(fg), bg: gb, bold: true });
    }
    case 'tree': {
      const ch = hs < 0.72 ? th.treeGlyphs[0] : th.treeGlyphs[1];
      const bg = mix(th.treeBg, '#000000', hash(wx, wy, 2) * 0.5);
      let fgc = pick(th.trees, hash(wx * 2 + sub, wy, 1));
      // seasonal accents: spring blossom, summer fruit, winter snow on the tips
      const acc = hash(wx * 2 + sub, wy, 41);
      if (th.blossom && acc < 0.12) return { ch: '❀', fg: pick(th.blossom, hash(wx, wy, 42 + sub)), bg, bold: true };
      if (th.fruit && acc < 0.05) return { ch: '•', fg: th.fruit, bg, bold: true };
      if (th.snow && acc < 0.3) fgc = '#eef4fc';
      return { ch, fg: fgc, bg, bold: true };
    }
    case 'field': {
      const soil = groundBg(F, tag);
      if (th.snow) return { ch: hs < 0.35 ? '·' : ' ', fg: th.soilDot, bg: soil, bold: false };
      return { ch: hs < 0.45 ? '·' : ' ', fg: th.soilDot, bg: soil, bold: false };
    }
    case 'path': {
      const pb = groundBg(F, tag);
      return { ch: hs < 0.25 ? '▪' : hs < 0.55 ? '·' : ' ', fg: th.snow ? '#7a8494' : '#5a534b', bg: pb, bold: false };
    }
    case 'sand':
      return { ch: hs < 0.4 ? '·' : hs < 0.5 ? '∙' : ' ', fg: '#a08a5a', bg: groundBg(F, tag), bold: false };
    case 'bridge':
      return { ch: '═', fg: '#c08a4a', bg: '#3a2614', bold: false };
    case 'ice':
      return { ch: hs < 0.3 ? '╱' : ' ', fg: '#d8f0ff', bg: mix('#5a8aa8', '#6a9ab8', hash(wx, wy, 7)), bold: false };
    case 'cliff': {
      const rock = th.snow ? '#c8d0dc' : '#8a8070';
      if (wide) {
        // a small peak per tile; snowy tips in winter
        const cap = th.snow || hash(wx, wy, 44) < 0.15;
        return { ch: sub === 0 ? '◢' : '◣', fg: cap && hash(wx, wy, 45) < 0.6 ? '#e8eef6' : rock, bg: '#24201c', bold: false };
      }
      return { ch: '▲', fg: rock, bg: '#24201c', bold: false };
    }
    case 'cave':
      if (wide) return { ch: '▄', fg: '#050505', bg: '#3a342c', bold: false };
      return { ch: '●', fg: '#050505', bg: '#3a342c', bold: false };
    case 'roof': {
      const rc = roofShades(tag.dfg || fg);
      const dch = tag.dch || '^';
      const outside = F.indoor ? '#2a2018' : grassBg(F, wx, wy);
      if (dch === '/' || dch === '\\') {
        // in large-tile mode the slope takes one cell and the other is solid roof
        if (wide && ((dch === '/' && sub === 1) || (dch === '\\' && sub === 0))) return { ch: ' ', fg: rc.mid, bg: rc.mid, bold: false };
        return { ch: dch === '/' ? '◢' : '◣', fg: rc.mid, bg: outside, bold: false };
      }
      const above = y > 0 ? F.tags[y - 1][x] : null;
      if (!(above && above.t === 'roof')) {
        return { ch: '▄', fg: rc.mid, bg: outside, bold: false };
      }
      const snowCap = th.snow && hash(wx * 2 + sub, wy, 12) < 0.5;
      return { ch: wy % 2 ? '▒' : '░', fg: snowCap ? '#e8eef8' : rc.lit, bg: rc.mid, bold: false };
    }
    case 'wall': {
      if (tag.k === 'deco' && tag.dch === '=') {
        if (wide) return { ch: sub === 0 ? '▐' : '▌', fg: '#7fe8ff', bg: '#3a2818', bold: false, glow: '#5fd8ff', glowR: 5 };
        return { ch: '▦', fg: '#7fe8ff', bg: '#3a2818', bold: true, glow: '#5fd8ff', glowR: 5 };
      }
      if (tag.k === 'deco' && tag.dch !== undefined) {
        return centre({ ch: tag.dch, fg: '#fff2d0', bg: '#6a4424', bold: true });
      }
      const below = y + 1 < F.tags.length ? F.tags[y + 1][x] : null;
      const base = !below || (below.t !== 'wall' && below.t !== 'door');
      return base
        ? { ch: '▀', fg: '#6a4a2c', bg: '#2a1c10', bold: false }
        : { ch: '═', fg: '#7c5634', bg: '#4a321e', bold: false };
    }
    case 'door':
      if (wide) return sub === 0 ? { ch: '▕', fg: '#3a2010', bg: '#8a4e22', bold: false } : { ch: '·', fg: '#ffd24a', bg: '#8a4e22', bold: true };
      return { ch: '▮', fg: '#d08a3a', bg: '#3a2818', bold: true };
    case 'iwall':
      return { ch: '▒', fg: '#6a5844', bg: '#4a3c2e', bold: false };
    case 'mwall':
      return { ch: hs < 0.5 ? '▓' : '▒', fg: '#4a423a', bg: '#2e2924', bold: false };
    case 'floor':
      return { ch: wy % 2 ? '─' : ' ', fg: '#4a3622', bg: groundBg(F, tag), bold: false };
    case 'mfloor':
      return { ch: hs < 0.3 ? '·' : ' ', fg: '#4a4038', bg: groundBg(F, tag), bold: false };
    case 'fireplace':
      return centre({ ch: g, fg: '#ff7a30', bg: '#3a1a0a', bold: true, glow: '#ff7a30', glowR: 8 });
    // ---- furniture
    case 'bed': {
      const left = F.tags[y][x - 1];
      const head = !left || left.t !== 'bed';
      if (head) return { ch: '▀', fg: '#f2efe8', bg: '#3a4f9a', bold: false };
      return { ch: hs < 0.5 ? '░' : '▒', fg: '#6a82d0', bg: '#3a4f9a', bold: false };
    }
    case 'tv':
      if (wide) return { ch: sub === 0 ? '▐' : '▌', fg: '#6ae0ff', bg: '#141418', bold: false, glow: '#4ac8ff', glowR: 6 };
      return { ch: '▓', fg: '#6ae0ff', bg: '#141418', bold: false, glow: '#4ac8ff', glowR: 6 };
    case 'cal':
      return centre({ ch: '▤', fg: '#f4ead8', bg: '#3a2818', bold: false });
    case 'table':
      return { ch: '▀', fg: '#b07840', bg: groundBg(F, { ...tag, t: 'floor' }), bold: false };
    case 'counter':
      return { ch: '▀', fg: '#d0a070', bg: '#5a3a20', bold: false };
    case 'kitchen':
      return centre({ ch: '◉', fg: '#ff7040', bg: '#2a2a2e', bold: true, glow: '#ff5020', glowR: 5 });
    case 'shelf':
      return { ch: '▤', fg: '#b07a48', bg: '#3a2414', bold: false };
    case 'bookcase':
      return { ch: hs < 0.5 ? '▌' : '▐', fg: pick(['#c04848', '#4868c8', '#48a868', '#c8a848', '#9858c0'], hash(wx * 2 + sub, wy, 60)), bg: '#2a1a0e', bold: false };
    case 'bath':
      return { ch: hs < 0.5 ? '≈' : '∼', fg: '#3a90d8', bg: '#d8e6ee', bold: false };
    case 'up':
    case 'down':
    case 'exit':
      return centre({ ch: g, fg: pal(fg), bg: groundBg(F, tag), bold: true, glow: pal(fg), glowR: 5 });
    case 'pond':
    case 'spring':
    case 'fountain':
    case 'water': {
      if (tag.k === 'deco' && tag.dch) return centre({ ch: tag.dch, fg: '#e0f4ff', bg: groundBg(F, tag), bold: true });
      const wb = groundBg(F, tag);
      const tint = tag.t === 'pond' ? '#0a3a2a' : tag.t === 'spring' ? '#0a3a4a' : tag.t === 'fountain' ? '#0a3a6a' : '';
      const bg = tint ? mix(wb, tint, 0.6) : wb;
      const fgc = tag.t === 'spring' ? '#9ae8ff' : tag.t === 'fountain' ? '#7fe8ff' : tag.t === 'pond' ? '#5ae0a0' : th.waterFg;
      if (g === '-' && sub === 0) return { ch: '∼', fg: '#a8d0ff', bg, bold: false };
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const n = F.tags[y + dy]?.[x + dx];
        return !!n && !WATERY.has(n.t) && n.t !== 'bridge';
      });
      if (edge) return { ch: hs < 0.5 ? '∼' : ' ', fg: mix(fgc, '#ffffff', 0.25), bg: mix(bg, '#2a5aa0', 0.4), bold: false };
      if (th.lilies && tag.t === 'water' && hash(wx, wy, 46) < 0.03) return centre({ ch: '◒', fg: '#3aa040', bg, bold: false });
      const f = Math.floor(F.t * 1.2);
      const hw = hash(wx * 2 + sub, wy, 20 + (f % 64));
      if (tag.t === 'spring' && hw < 0.12) return { ch: '°', fg: '#e8f8ff', bg, bold: false };
      return { ch: hw < 0.3 ? '≈' : hw < 0.55 ? '∼' : ' ', fg: fgc, bg, bold: false };
    }
  }
  // Generic: furniture, signs, bins, doghouse... keep the readable glyph on a grounded background.
  return centre({ ch: g, fg: pal(fg), bg: F.indoor || lead[2] === '01' ? '#3a2818' : groundBg(F, tag), bold });
}

// ---------------------------------------------------------------- frame

const ICONS: Record<string, [string, string]> = {
  stamina: ['♥', '#ff4a6a'],
  fatigue: ['☾', '#7fa8ff'],
  gold: ['●', '#ffcc33'],
  bin: ['▣', '#c08a4a'],
  tool: ['⚒', '#c0c0c0'],
};
const WEATHER_ICON: Record<string, [string, string]> = {
  Sunny: ['☀', '#ffcc33'],
  Rain: ['☂', '#7fb8ff'],
  Snow: ['❄', '#e8f0ff'],
  Typhoon: ['☂', '#ff6a6a'],
  Blizzard: ['❄', '#9ae8ff'],
};
const BOX: Record<string, string> = { 'box:h': '─', 'box:v': '│', 'box:tl': '╭', 'box:tr': '╮', 'box:bl': '╰', 'box:br': '╯' };

/**
 * Build the styled frame for the current screen contents.
 * @param t seconds, used for animation (water, rain, snow, fireflies)
 */
export function computeFrame(scr: Pick<Screen, 'buf' | 'tags' | 'ctx' | 'w' | 'h'>, t: number): OutCell[][] {
  const { buf, tags, ctx } = scr;
  const H = buf.length;
  const W = H ? buf[0].length : 0;
  const season = ctx ? ((ctx.season % 4) + 4) % 4 : 0;
  const F: Frame = { buf, tags, theme: THEMES[season], t, indoor: !!ctx?.indoor };
  const out: OutCell[][] = new Array(H);
  const isMapCell = (x: number, y: number) => {
    const tag = tags[y][x];
    return !!tag && tag.t !== 'ui';
  };

  for (let y = 0; y < H; y++) {
    const row: OutCell[] = new Array(W);
    for (let x = 0; x < W; x++) {
      const cell = buf[y][x];
      const tag = tags[y][x];
      let o: OutCell;
      if (tag && tag.t !== 'ui') {
        const leadEnt = (tag.sub ?? 0) > 0 ? tags[y][x - (tag.sub ?? 0)]?.ent : undefined;
        if (tag.ent) {
          const under = styleTile(F, x, y, { ...tag, ent: undefined, k: tag.k?.startsWith('obj:') ? undefined : tag.k }, cell);
          const isPlayer = tag.ent === 'player';
          o = {
            ch: isPlayer ? '☻' : cell[0],
            fg: pal(cell[1]),
            bg: under.bg,
            bold: true,
            glow: isPlayer ? pal(cell[1]) : tag.ent === 'npc' ? mix(pal(cell[1]), '#000000', 0.4) : undefined,
            glowR: isPlayer ? 5 : tag.ent === 'npc' ? 3 : undefined,
            dx: (tag.zw ?? 1) > 1 ? 0.5 : undefined,
          };
        } else if (leadEnt) {
          // second cell of a large tile that holds an entity: ground only, the sprite is centred over both
          const under = styleTile(F, x, y, { ...tag, k: tag.k?.startsWith('obj:') ? undefined : tag.k }, cell);
          o = { ...under, ch: ' ', glow: undefined };
        } else {
          o = styleTile(F, x, y, tag, cell);
        }
        if (tag.hl) o.bg = mix(o.bg, '#c8d4ff', 0.26);
      } else if (tag && tag.t === 'ui') {
        const k = tag.k || '';
        if (k in BOX) o = { ch: BOX[k], fg: pal(cell[1]), bg: pal(cell[2], '#000000'), bold: false };
        else if (k === 'bar') o = { ch: '█', fg: pal(cell[1]), bg: '#0c0c11', bold: false };
        else if (k === 'bar:empty') o = { ch: '░', fg: '#2c2c36', bg: '#0c0c11', bold: false };
        else o = { ch: cell[0], fg: pal(cell[1]), bg: pal(cell[2], '#000000'), bold: cell[3] };
      } else {
        o = { ch: cell[0], fg: pal(cell[1]), bg: pal(cell[2], '#000000'), bold: cell[3] };
      }
      row[x] = o;
    }
    out[y] = row;
  }

  if (!ctx) return out;

  // ---- HUD chrome
  for (let x = 0; x < W; x++) {
    if (buf[0][x][2] === '01') out[0][x].bg = '#1a1a22';
  }
  for (let y = 1; y < Math.min(ctx.divY, H); y++) {
    if (ctx.divX < W && buf[y][ctx.divX][0] === '|' && !tags[y][ctx.divX]) out[y][ctx.divX] = { ch: '│', fg: '#3a3a48', bg: '#0c0c11', bold: false };
    for (let x = ctx.divX + 1; x < W; x++) {
      if (!tags[y][x] && buf[y][x][2] === '00') out[y][x].bg = '#0c0c11';
      else if (tags[y][x]?.t === 'ui' && (tags[y][x]?.k || '').startsWith('bar')) {
        // fade the bar slightly toward its tip
        if (tags[y][x]?.k === 'bar') out[y][x].fg = mix(out[y][x].fg, '#ffffff', ((x - ctx.divX) / Math.max(1, W - ctx.divX)) * 0.35);
      }
    }
  }
  if (ctx.divY < H) {
    for (let x = 0; x < W; x++) if (buf[ctx.divY][x][0] === '-' && !tags[ctx.divY][x]) out[ctx.divY][x] = { ch: '─', fg: '#3a3a48', bg: '#000000', bold: false };
  }
  const v = ctx.view;
  const sky = skyFor(ctx);
  for (const ic of ctx.icons) {
    if (ic.y < 0 || ic.y >= H || ic.x < 0 || ic.x >= W) continue;
    if (buf[ic.y][ic.x][0] !== ' ' || tags[ic.y][ic.x]) continue;
    const clearNight = ctx.weather === 'Sunny' && sky.amb < 0.5 && !ctx.indoor;
    const [ch, col] =
      ic.icon === 'weather' ? (clearNight ? ['☾', '#d8e0ff'] : WEATHER_ICON[ctx.weather] || ['☀', '#ffcc33']) : ICONS[ic.icon];
    out[ic.y][ic.x] = { ...out[ic.y][ic.x], ch, fg: col, bold: true };
  }

  // ---- contact shadows: ground just below/right of buildings, trees and cliffs is darker
  for (let y = v.y; y < v.y + v.h && y < H; y++) {
    for (let x = v.x; x < v.x + v.w && x < W; x++) {
      const tag = tags[y][x];
      if (!tag || tag.t === 'ui' || !SHADOW_RECEIVERS.has(tag.t) || (tag.k || '').startsWith('obj:boulder')) continue;
      const up = y > 0 ? tags[y - 1][x] : null;
      const left = x > 0 ? tags[y][x - 1] : null;
      let k = 0;
      if (up && up.t !== 'ui' && SHADOW_CASTERS.has(up.t)) k = up.t === 'tree' ? 0.22 : 0.34;
      else if (left && left.t !== 'ui' && (left.t === 'wall' || left.t === 'door')) k = 0.16;
      if (k) {
        const o = out[y][x];
        o.bg = mix(o.bg, '#000000', k);
        o.fg = mix(o.fg, '#000000', k * 0.6);
      }
    }
  }

  // ---- drifting cloud shadows on fair days
  const outdoor = !ctx.indoor && ctx.mapName !== 'mine';
  if (outdoor && ctx.weather === 'Sunny' && sky.amb > 0.85) {
    const tc = Math.floor(t * 2) / 2; // step twice a second so a static scene doesn't repaint every frame
    for (let y = v.y; y < v.y + v.h && y < H; y++) {
      for (let x = v.x; x < v.x + v.w && x < W; x++) {
        const tag = tags[y][x];
        if (!tag || tag.t === 'ui') continue;
        const zw = tag.zw ?? 1;
        const px = (tag.wx ?? x) + (tag.sub ?? 0) / zw;
        const n = valueNoise(px / 9 + tc * 0.06, (tag.wy ?? y) / 5 + tc * 0.02, 51);
        if (n > 0.64) {
          const k = Math.min(1, (n - 0.64) / 0.2) * 0.2;
          const o = out[y][x];
          o.bg = mix(o.bg, '#0a1020', k);
          o.fg = mix(o.fg, '#0a1020', k * 0.7);
        }
      }
    }
  }

  // ---- weather (outdoor only)
  const outdoorFx = !ctx.indoor && ctx.mapName !== 'mine';
  const w = ctx.weather;
  if (outdoorFx && w !== 'Sunny') {
    const rain = w === 'Rain' || w === 'Typhoon';
    const dens = w === 'Typhoon' || w === 'Blizzard' ? 0.1 : 0.055;
    const f = Math.floor(t * (rain ? 10 : 4));
    for (let y = v.y; y < v.y + v.h && y < H; y++) {
      for (let x = v.x; x < v.x + v.w && x < W; x++) {
        const tag = tags[y][x];
        if (!tag || tag.t === 'ui' || tag.ent) continue;
        const open = WALKABLE_OPEN.has(tag.t) || WATERY.has(tag.t) || (tag.k || '').startsWith('soil') || (tag.k || '').startsWith('crop:');
        if (!open) continue;
        const zw = tag.zw ?? 1;
        const wx = (tag.wx ?? x) * zw + (tag.sub ?? 0);
        const wy = tag.wy ?? y;
        const o = out[y][x];
        if (o.dx) continue; // don't paint over a centred sprite
        if (rain) {
          const drift = w === 'Typhoon' ? 2 : 1;
          if (hash(wx - f * drift, wy - f, 11) < dens) {
            out[y][x] = { ...o, ch: w === 'Typhoon' ? '─' : '╲', fg: mix(o.bg, '#9cc8ff', 0.6), bold: false, glow: undefined };
          } else if (WATERY.has(tag.t) && hash(wx, wy, 30 + (f % 50)) < 0.05) {
            out[y][x] = { ...o, ch: '◦', fg: '#cfe6ff', bold: false };
          }
        } else {
          const drift = w === 'Blizzard' ? 2 : 0;
          if (hash(wx + f * drift, wy - f, 13) < dens) {
            out[y][x] = { ...o, ch: pick(['·', '*', '∙'], hash(wx, wy, 14)), fg: '#f0f4ff', bold: w === 'Blizzard', glow: undefined };
          }
        }
      }
    }
  }

  // ---- lighting
  const fireflies = outdoorFx && sky.amb < 0.62 && (season === 0 || season === 1) && w === 'Sunny';
  const FIREFLY = '#fff27a';
  if (sky.amb < 0.999) {
    const lights: Light[] = [];
    for (let y = v.y; y < v.y + v.h && y < H; y++) {
      for (let x = v.x; x < v.x + v.w && x < W; x++) {
        const tag = tags[y][x];
        if (!tag || tag.t === 'ui') continue;
        // one light per tile, centred on it
        if ((tag.sub ?? 0) !== 0) continue;
        const lx = x + ((tag.zw ?? 1) - 1) / 2;
        const zr = tag.zw ?? 1;
        if (tag.ent === 'player' && sky.lanterns) lights.push({ x: lx, y, r: (ctx.mapName === 'mine' ? 8 : 10) * (zr > 1 ? 1.3 : 1), col: hexToRgb('#ffd890'), k: 1.15 });
        if (sky.windowsLit && tag.t === 'wall' && tag.k === 'deco' && tag.dch === '=') lights.push({ x: lx, y, r: 3.4 * (zr > 1 ? 1.4 : 1), col: hexToRgb('#ffb050'), k: 0.75 });
        if (sky.windowsLit && tag.t === 'door' && !tag.ent) lights.push({ x: lx, y, r: 4 * (zr > 1 ? 1.4 : 1), col: hexToRgb('#ffa040'), k: 0.8 });
        if (tag.t === 'fireplace') lights.push({ x: lx, y, r: 5 * (zr > 1 ? 1.4 : 1), col: hexToRgb('#ff8a40'), k: 0.8 });
      }
    }
    const tintRgb = hexToRgb(sky.tint);
    const shade = (col: string, lr: number, lg: number, lb: number, ls: number) => {
      const c = hexToRgb(col);
      const n0 = (c[0] + (tintRgb[0] - c[0]) * sky.tintAmt) * sky.amb;
      const n1 = (c[1] + (tintRgb[1] - c[1]) * sky.tintAmt) * sky.amb;
      const n2 = (c[2] + (tintRgb[2] - c[2]) * sky.tintAmt) * sky.amb;
      if (ls <= 0) return rgbToHex([n0, n1, n2]);
      const s = Math.min(1, ls);
      const w0 = lr / ls / 255;
      const w1 = lg / ls / 255;
      const w2 = lb / ls / 255;
      return rgbToHex([
        n0 + (c[0] * (0.55 + 0.45 * w0) - n0) * s,
        n1 + (c[1] * (0.55 + 0.45 * w1) - n1) * s,
        n2 + (c[2] * (0.55 + 0.45 * w2) - n2) * s,
      ]);
    };
    for (let y = v.y; y < v.y + v.h && y < H; y++) {
      for (let x = v.x; x < v.x + v.w && x < W; x++) {
        const tag = tags[y][x];
        if (!tag || tag.t === 'ui') continue;
        const o = out[y][x];
        let lr = 0;
        let lg = 0;
        let lb = 0;
        let ls = 0;
        for (const L of lights) {
          const dx = (x - L.x) * 0.5;
          const dy = y - L.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < L.r) {
            const k = (1 - d / L.r) ** 1.1 * L.k;
            lr += L.col[0] * k;
            lg += L.col[1] * k;
            lb += L.col[2] * k;
            ls += k;
          }
        }
        // Entities stay a little brighter so the player can always find them.
        const entBoost = tag.ent ? 0.35 : 0;
        o.bg = shade(o.bg, lr, lg, lb, ls);
        o.fg = entBoost && ls < entBoost ? shade(o.fg, 255 * entBoost, 240 * entBoost, 210 * entBoost, entBoost) : shade(o.fg, lr, lg, lb, ls);
        if (sky.windowsLit && tag.t === 'wall' && tag.k === 'deco' && tag.dch === '=') {
          o.fg = '#ffd27a';
          o.bg = '#5a3410';
          o.glow = '#ffb040';
          o.glowR = 10;
        }
        if (fireflies && tag.t === 'grass' && !tag.ent && !o.dx) {
          const wx = (tag.wx ?? x) * (tag.zw ?? 1) + (tag.sub ?? 0);
          const wy = tag.wy ?? y;
          if (hash(wx, wy, 77) < 0.03 && hash(wx, wy, 78 + (Math.floor(t * 1.5) % 40)) > 0.35) {
            o.ch = '·';
            o.fg = FIREFLY;
            o.bold = true;
            o.glow = FIREFLY;
            o.glowR = 8;
          }
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- drawing

export type Metrics = { cw: number; ch: number; fontPx: number; font: string };

/** Paint a computed frame. Block shapes are drawn as rects/paths so they tile without seams. */
export function drawFrame(g: CanvasRenderingContext2D, frame: OutCell[][], m: Metrics) {
  const { cw, ch, fontPx, font } = m;
  g.save();
  g.textBaseline = 'middle';
  g.shadowBlur = 0;
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    for (let x = 0; x < row.length; x++) {
      g.fillStyle = row[x].bg;
      // +1px overlap on both axes so scaled canvases show no seams between cells
      g.fillRect(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw) + 1, Math.ceil(ch) + 1);
    }
  }
  let curFont = '';
  let glowOn = false;
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    for (let x = 0; x < row.length; x++) {
      const o = row[x];
      if (o.ch === ' ') continue;
      const px = (x + (o.dx ?? 0)) * cw;
      const py = y * ch;
      if (o.ch === '▄' || o.ch === '▀' || o.ch === '█') {
        if (glowOn) { g.shadowBlur = 0; glowOn = false; }
        g.fillStyle = o.fg;
        const top = o.ch === '▄' ? ch / 2 : 0;
        const hgt = o.ch === '█' ? ch + 1 : ch / 2 + (o.ch === '▄' ? 1 : 0);
        g.fillRect(Math.floor(px), Math.floor(py + top), Math.ceil(cw) + 1, Math.ceil(hgt));
        continue;
      }
      if (o.ch === '◢' || o.ch === '◣') {
        if (glowOn) { g.shadowBlur = 0; glowOn = false; }
        g.fillStyle = o.fg;
        g.beginPath();
        if (o.ch === '◢') {
          g.moveTo(px + cw + 1, py);
          g.lineTo(px + cw + 1, py + ch);
          g.lineTo(px, py + ch);
        } else {
          g.moveTo(px, py);
          g.lineTo(px + cw + 1, py + ch);
          g.lineTo(px, py + ch);
        }
        g.closePath();
        g.fill();
        continue;
      }
      const f = `${o.bold ? 'bold ' : ''}${fontPx}px ${font}`;
      if (f !== curFont) {
        g.font = f;
        curFont = f;
      }
      if (o.glow) {
        g.shadowColor = o.glow;
        g.shadowBlur = o.glowR ?? 6;
        glowOn = true;
      } else if (glowOn) {
        g.shadowBlur = 0;
        glowOn = false;
      }
      g.fillStyle = o.fg;
      g.fillText(o.ch, px, py + ch / 2 + 1);
    }
  }
  g.restore();
}

/** Cheap change detection so we only repaint when something visible changed. */
export function frameSignature(frame: OutCell[][]): string {
  let s = '';
  for (const row of frame) for (const o of row) s += o.ch + o.fg + o.bg + (o.bold ? 1 : 0) + (o.glow ? 'g' : '');
  return s;
}
