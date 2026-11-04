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
  /** Soft round backing disc behind a creature: fill and rim colours. */
  token?: string;
  rim?: string;
  /** Keeps its colour in the monochrome pass: things of interest. */
  accent?: boolean;
  /** HUD / panel cell: left untouched by the scene passes. */
  ui?: boolean;
  /** Per-world-cell noise for the high-resolution texture pass. */
  seed?: number;
  /** Shoreline foam on these sides (bitmask: 1 top, 2 right, 4 bottom, 8 left). */
  foam?: number;
  foamCol?: string;
};

// ---------------------------------------------------------------- colour math

type RGB = [number, number, number];
/** '#rrggbb' -> [r, g, b]. A single parseInt is cheaper than caching: lighting makes thousands of unique colours. */
export function hexToRgb(h: string): RGB {
  const n = parseInt(h.charCodeAt(0) === 35 ? h.slice(1) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
// ---------------------------------------------------------------- Isotope ramps
//
// Every colour the Enhanced renderer outputs is snapped to a ramp built only from the
// 16 base16 Isotope Dark colours. Each chromatic hue (08-0F) gets a value ramp with
// hue shifting: shadows lean toward the palette's indigo (0F), highlights toward its
// orange (09) and white. Greys come from 00-07. Darks get extra steps so night scenes
// keep their shape instead of crushing to black.

const RAMP_STEPS = 24;
let rampSet: RGB[] | null = null;
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function isotopeRamps(): RGB[] {
  if (rampSet) return rampSet;
  const p = (c: string) => hexToRgb(`#${PALETTE[c]}`);
  const black = p('00');
  const white = p('07');
  const cool = p('0F');
  const warm = p('09');
  const set: RGB[] = Object.keys(PALETTE).map(p);
  for (const code of ['08', '09', '0A', '0B', '0C', '0D', '0E', '0F']) {
    const hue = p(code);
    for (let i = 1; i <= RAMP_STEPS; i++) {
      const v = (i / (RAMP_STEPS + 1)) ** 1.7; // denser in the darks
      if (v <= 0.5) {
        const t = v / 0.5;
        set.push(lerp3(black, lerp3(hue, cool, 0.3 * (1 - t)), t));
      } else {
        const t = (v - 0.5) / 0.5;
        set.push(lerp3(hue, lerp3(white, warm, 0.2), t * 0.75));
      }
    }
  }
  // neutral ramp between the palette greys, with slightly cool darks
  for (let i = 1; i < 24; i++) {
    const g = (i / 24) ** 1.4 * 255;
    set.push([g, g, g]);
  }
  rampSet = set.map((c) => c.map(Math.round) as RGB);
  return rampSet;
}

const quantCache = new Map<string, string>();
/** Snap a colour to the nearest Isotope ramp colour (perceptually weighted RGB). */
export function toIsotope(hex: string): string {
  let q = quantCache.get(hex);
  if (q) return q;
  const [r, g, b] = hexToRgb(hex);
  let best = 0;
  let bestD = Infinity;
  const set = isotopeRamps();
  for (let i = 0; i < set.length; i++) {
    const c = set[i];
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const rm = (r + c[0]) / 2;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  q = rgbToHex(set[best]);
  if (quantCache.size > 8192) quantCache.clear();
  quantCache.set(hex, q);
  return q;
}

/** Snap every colour in a frame to the Isotope ramps. */
function snapFrame(frame: OutCell[][]) {
  for (const row of frame) {
    for (const o of row) {
      o.fg = toIsotope(o.fg);
      o.bg = toIsotope(o.bg);
      if (o.glow) o.glow = toIsotope(o.glow);
      if (o.token) o.token = toIsotope(o.token);
      if (o.rim) o.rim = toIsotope(o.rim);
      if (o.foamCol) o.foamCol = toIsotope(o.foamCol);
    }
  }
}

// Isotope Dark is pure black with saturated neon glyphs. These push map cells that way:
// backgrounds sink toward black, chromatic glyph colours move toward the nearest pure hue.
const NEON_HUES = ['08', '09', '0A', '0B', '0C', '0D', '0E', '0F'].map((c) => {
  const rgb = hexToRgb(`#${PALETTE[c]}`);
  return { hex: `#${PALETTE[c]}`, h: hsv(rgb)[0] };
});

export function hsv([r, g, b]: RGB): [number, number, number] {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
}

/** Greyscale by perceived brightness. */
export function grey(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return rgbToHex([y, y, y]);
}

/**
 * Black-and-white world with colour reserved for things of interest: everything not
 * flagged as an accent goes grey (keeping its light and shade); accents keep their hue,
 * pushed to a clear Isotope neon, over a grey background.
 */
function monochrome(out: OutCell[][], boxes: Screen['boxes']) {
  const inBox = (x: number, y: number) => boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  for (let y = 0; y < out.length; y++) {
    for (let x = 0; x < out[y].length; x++) {
      const o = out[y][x];
      if (o.ui || inBox(x, y)) continue;
      o.bg = grey(o.bg);
      if (o.token) o.token = grey(o.token);
      if (o.foamCol) o.foamCol = grey(o.foamCol);
      if (o.accent) {
        o.fg = neon(o.fg, 0.35);
        continue;
      }
      o.fg = grey(o.fg);
      if (o.glow) o.glow = grey(o.glow);
      if (o.rim) o.rim = grey(o.rim);
    }
  }
}

/** Pull a glyph colour toward the nearest pure Isotope hue (greys are left alone). */
export function neon(hex: string, k = 0.5): string {
  const [h, sat, v] = hsv(hexToRgb(hex));
  if (sat < 0.25 || v < 0.06) return hex;
  let best = NEON_HUES[0];
  let bd = 999;
  for (const n of NEON_HUES) {
    const d = Math.min(Math.abs(n.h - h), 360 - Math.abs(n.h - h));
    if (d < bd) { bd = d; best = n; }
  }
  // keep roughly the original brightness (dim details stay dim), but in the pure hue
  const pure = hexToRgb(best.hex);
  const pv = Math.max(pure[0], pure[1], pure[2]) / 255;
  const scale = Math.min(1, v * 1.25 + 0.04) / pv;
  return mix(hex, rgbToHex([pure[0] * scale, pure[1] * scale, pure[2] * scale]), k + 0.15);
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
  // the mine counts as indoors in the engine, but it's dark down there
  if (ctx.mapName === 'mine') return { amb: 0.24, tint: '#1a1208', tintAmt: 0.35, lanterns: true, windowsLit: false };
  if (ctx.indoor) return { amb: 1, tint: '#000000', tintAmt: 0, lanterns: false, windowsLit: false };
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
  weather: string;
  /** Ambient light (1 = full day). */
  amb: number;
  /** Minutes since midnight. */
  minutes: number;
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

/** A mine wall facing open floor gets a torch every so often. */
function isTorch(F: Frame, x: number, y: number, tag: CellTag): boolean {
  if ((tag.sub ?? 0) !== 0 || hash(tag.wx ?? x, tag.wy ?? y, 68) > 0.07) return false;
  const below = F.tags[y + 1]?.[x];
  return !!below && below.t === 'mfloor';
}

/** Fixtures worth noticing: they keep their colour in the monochrome look. */
const INTEREST = new Set(['bin', 'sign', 'doghouse', 'stable', 'mill', 'maker', 'incub', 'phone', 'vase', 'cave', 'bath']);

const isRainy = (F: Frame) => !F.indoor && (F.weather === 'Rain' || F.weather === 'Typhoon');

function puddle(F: Frame, wx: number, wy: number, sub: number, ground: string): OutCell {
  const bg = mix(ground, '#1a3456', 0.55);
  const ripple = hash(wx * 2 + sub, wy, 71 + (Math.floor(F.t * 2) % 50)) < 0.3;
  return { ch: ripple ? '◦' : ' ', fg: '#8ab8e8', bg, bold: false };
}

/** Style one tagged map cell (terrain, objects, crops, structures). */
export function styleTile(F: Frame, x: number, y: number, tag: CellTag, cell: Cell): OutCell {
  const th = F.theme;
  const wx = tag.wx ?? x;
  const wy = tag.wy ?? y;
  const g = cell[0];
  const fg = cell[1];
  const bold = cell[3];
  const h = hash(wx, wy);
  const hs = h;
  const k = tag.k || '';
  // Large tiles are retired. These aliases keep the shared texture code simple:
  // every cell is now its own tile, so no cell is a sub-cell or spans two cells.
  const sub = 0;
  const wide = false;
  const lead = cell;
  const centre = (o: OutCell): OutCell => o;
  const lit = (o: OutCell): OutCell => o;

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
        if (wide) return lit({ ch: sub === 0 ? '◖' : '◗', fg: '#8c8c98', bg: soil, bold: false });
        return { ch: '●', fg: '#8c8c98', bg: mix(soil, '#3a342e', 0.6), bold: false };
      case 'obj:stump':
        return centre({ ch: '◉', fg: '#b8702e', bg: soil, bold: false });
      case 'obj:branch':
        return centre({ ch: '╱', fg: '#c58a4a', bg: soil, bold: true });
    }
  }
  if (k === 'forage') {
    return centre({ ch: g, fg: pal(fg), bg: groundBg(F, tag), bold: true, glow: pal(fg), glowR: 3, accent: true });
  }
  // ---- tilled soil and crops
  if (k.startsWith('soil') || k.startsWith('crop:')) {
    const wet = k.endsWith(':wet');
    const bg = wet ? mix('#160e08', '#1a1209', hash(wx, wy, 5)) : mix('#2c1c0f', '#321f10', hash(wx, wy, 5));
    if (k.startsWith('soil')) {
      if (wet && hash(wx * 2 + sub, wy, 64) < 0.12) return { ch: '·', fg: '#4a8ad8', bg, bold: true }; // a glint of water
      return { ch: wy % 2 ? '≡' : '═', fg: wet ? '#4a3424' : '#7a5230', bg, bold: false };
    }
    if (k.startsWith('crop:seed')) return centre({ ch: '∴', fg: '#c89058', bg, bold: false });
    if (k.startsWith('crop:sprout')) return centre({ ch: ',', fg: '#7ad04a', bg, bold: true });
    if (k.startsWith('crop:young')) return centre({ ch: '"', fg: '#5ae02a', bg, bold: true });
    // ripe: the crop's own glyph and colour, with a gentle "ready" glow
    return centre({ ch: g, fg: pal(fg), bg, bold: true, glow: pal(fg), glowR: 6, accent: true });
  }

  switch (tag.t) {
    case 'void':
      return { ch: ' ', fg: '#000000', bg: '#000000', bold: false };
    case 'grass': {
      const gb = grassBg(F, wx, wy);
      const above = F.tags[y - 1]?.[x];
      if (above && above.t === 'tree' && hash(wx, wy, 72) < 0.6) {
        return centre({ ch: '╿', fg: th.snow ? '#6a5a4a' : '#6a4a2c', bg: gb, bold: false }); // trunk under the canopy
      }
      if (th.snow) {
        if (hs < 0.18) return { ch: hs < 0.08 ? '∙' : '·', fg: th.grassDetail, bg: gb, bold: false };
        return { ch: ' ', fg: th.grassDetail, bg: gb, bold: false };
      }
      // the engine's own tufts (',' and '"') stay, centred in their tile
      if (g === ',' || g === '"') {
        // tufts sway in a slow breeze
        const sway = Math.floor(F.t * 0.8 + hash(wx, wy, 66) * 4) % 4 === 0;
        return centre({ ch: g === '"' ? (sway ? '"' : 'ʷ') : sway ? '`' : ',', fg: th.tuft, bg: gb, bold: false });
      }
      const nearTree = th.leaves && [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1]].some(([dx, dy]) => F.tags[y + dy]?.[x + dx]?.t === 'tree');
      if (nearTree && hs < 0.32) return { ch: pick(['•', '❦', ','], hash(wx, wy, 9 + sub)), fg: pick(th.leaves!, hash(wx, wy, 4 + sub)), bg: gb, bold: false, accent: true }; // leaf litter
      if (th.leaves && hs < 0.07) return { ch: pick(['•', '❦', ','], hash(wx, wy, 9 + sub)), fg: pick(th.leaves, hash(wx, wy, 4 + sub)), bg: gb, bold: false };
      if (th.wildflowers && hs > 0.975) return { ch: '·', fg: pick(th.wildflowers, hash(wx, wy, 31 + sub)), bg: gb, bold: true };
      if (th.fruit && hs > 0.93) return { ch: 'ʷ', fg: th.tuft, bg: gb, bold: false }; // tall summer grass
      const dewy = !th.snow && !F.indoor && F.weather === 'Sunny' && F.minutes >= 360 && F.minutes < 480;
      if (dewy && hs < 0.03 && hash(wx * 2 + sub, wy, 140 + (Math.floor(F.t * 2) % 20)) > 0.45) {
        return { ch: '✧', fg: '#ffffff', bg: gb, bold: true }; // morning dew twinkling
      }
      if (hs < 0.1) return { ch: "'", fg: th.grassDetail, bg: gb, bold: false };
      if (hs > 0.62 && hs < 0.8) return { ch: '˙', fg: mix(gb, th.grassDetail, 0.45), bg: gb, bold: false }; // faint meadow stipple
      if (hs < 0.15) return { ch: '`', fg: th.grassDetail, bg: gb, bold: false };
      return { ch: ' ', fg: th.grassDetail, bg: gb, bold: false };
    }
    case 'flower': {
      const gb = grassBg(F, wx, wy);
      if (th.snow || g === '.') return { ch: '·', fg: th.grassDetail, bg: gb, bold: false };
      return centre({ ch: pick(['✿', '❀'], hash(wx, wy, 2)), fg: pal(fg), bg: gb, bold: true, accent: true });
    }
    case 'tree': {
      const windy = !F.indoor && (F.weather === 'Typhoon' || F.weather === 'Blizzard');
      const sway = windy ? hash(wx * 2 + sub, wy, 90 + (Math.floor(F.t * 3) % 2)) < 0.5 : false;
      const ch = (hs < 0.72) !== sway ? th.treeGlyphs[0] : th.treeGlyphs[1];
      const bg = mix(th.treeBg, '#000000', hash(wx, wy, 2) * 0.5);
      let fgc = pick(th.trees, hash(wx * 2 + sub, wy, 1));
      // canopies are lit from above: bright crown, shaded underside
      const up = F.tags[y - 1]?.[x];
      const dn = F.tags[y + 1]?.[x];
      if (!up || up.t !== 'tree') fgc = mix(fgc, '#ffffff', 0.2);
      else if (!dn || dn.t !== 'tree') fgc = mix(fgc, '#000000', 0.32);
      // seasonal accents: spring blossom, summer fruit, winter snow on the tips
      const acc = hash(wx * 2 + sub, wy, 41);
      if (th.blossom && acc < 0.12) return { ch: '❀', fg: pick(th.blossom, hash(wx, wy, 42 + sub)), bg, bold: true, accent: true };
      if (th.fruit && acc < 0.05) return { ch: '•', fg: th.fruit, bg, bold: true, accent: true };
      if (th.leaves && acc < 0.18) return lit({ ch, fg: fgc, bg, bold: true, accent: true }); // a few turning leaves
      if (th.snow && acc < 0.3) fgc = '#eef4fc';
      // summer canopies are fuller: an extra leafy glyph now and then
      const leafy = th.fruit && !wide && acc > 0.9 ? '♠' : ch;
      return lit({ ch: leafy, fg: fgc, bg, bold: true });
    }
    case 'field': {
      const soil = groundBg(F, tag);
      if (isRainy(F) && hash(wx, wy, 70) < 0.06) return puddle(F, wx, wy, sub, soil);
      if (th.snow) return { ch: hs < 0.35 ? '·' : ' ', fg: th.soilDot, bg: soil, bold: false };
      return { ch: hs < 0.45 ? '·' : ' ', fg: th.soilDot, bg: soil, bold: false };
    }
    case 'path': {
      const pb = groundBg(F, tag);
      if (isRainy(F) && hash(wx, wy, 70) < 0.16) return puddle(F, wx, wy, sub, pb);
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
        return lit({ ch: sub === 0 ? '◢' : '◣', fg: cap && hash(wx, wy, 45) < 0.6 ? '#e8eef6' : rock, bg: '#24201c', bold: false });
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
        return { ch: dch === '/' ? '◢' : '◣', fg: rc.mid, bg: outside, bold: false };
      }
      const above = y > 0 ? F.tags[y - 1][x] : null;
      if (!(above && above.t === 'roof')) {
        return { ch: '▄', fg: rc.mid, bg: outside, bold: false };
      }
      const snowCap = th.snow && hash(wx * 2 + sub, wy, 12) < 0.5;
      return lit({ ch: wy % 2 ? '▒' : '░', fg: snowCap ? '#e8eef8' : rc.lit, bg: rc.mid, bold: false });
    }
    case 'wall': {
      if (tag.k === 'deco' && tag.dch === '=') {
        if (wide) return { ch: sub === 0 ? '▐' : '▌', fg: '#7fe8ff', bg: '#3a2818', bold: false, glow: '#5fd8ff', glowR: 5, accent: true };
        return { ch: '▦', fg: '#7fe8ff', bg: '#3a2818', bold: true, glow: '#5fd8ff', glowR: 5, accent: true };
      }
      if (tag.k === 'deco' && tag.dch !== undefined) {
        return centre({ ch: tag.dch, fg: '#fff2d0', bg: '#6a4424', bold: true });
      }
      const below = y + 1 < F.tags.length ? F.tags[y + 1][x] : null;
      const base = !below || (below.t !== 'wall' && below.t !== 'door');
      const walled = (n: CellTag | null | undefined) => !!n && (n.t === 'wall' || n.t === 'door');
      const above = y > 0 ? F.tags[y - 1][x] : null;
      let o: OutCell = base
        ? { ch: '▀', fg: '#6a4a2c', bg: '#2a1c10', bold: false }
        : { ch: '═', fg: '#7c5634', bg: '#4a321e', bold: false };
      // corner posts frame each building; the row under the eaves sits in shadow
      if (!base && !walled(F.tags[y][x - 1])) o = { ...o, ch: wide ? '▐' : '║', fg: '#2a1a0e' };
      else if (!base && !walled(F.tags[y][x + 1])) o = { ...o, ch: wide ? '▌' : '║', fg: '#2a1a0e' };
      if (above && above.t === 'roof') {
        o = { ...o, bg: mix(o.bg, '#000000', 0.38), fg: mix(o.fg, '#000000', 0.3) };
        if (th.snow && hash(wx * 2 + sub, wy, 74) < 0.55) o = { ...o, ch: '╷', fg: '#e8f0ff' }; // icicles on the eaves
      }
      return o;
    }
    case 'door':
      if (wide) return sub === 0 ? { ch: '▕', fg: '#3a2010', bg: '#8a4e22', bold: false } : { ch: '·', fg: '#ffd24a', bg: '#8a4e22', bold: true, accent: true };
      return { ch: '▮', fg: '#d08a3a', bg: '#3a2818', bold: true, accent: true };
    case 'iwall':
      return { ch: '▒', fg: '#6a5844', bg: '#4a3c2e', bold: false };
    case 'mwall':
      if (isTorch(F, x, y, tag)) return centre({ ch: '†', fg: '#ff9900', bg: '#2e2924', bold: true, glow: '#ff9900', glowR: 9, accent: true });
      return { ch: hs < 0.5 ? '▓' : '▒', fg: '#4a423a', bg: '#2e2924', bold: false };
    case 'floor': {
      const nearTable = [[-2, 0], [2, 0], [0, -1], [0, 1], [-2, 1], [2, 1], [-2, -1], [2, -1]].some(([dx, dy]) => F.tags[y + dy]?.[x + dx]?.t === 'table');
      if (nearTable) return { ch: '░', fg: mix('#ff0099', '#000000', 0.45), bg: mix(groundBg(F, tag), '#ff0099', 0.1), bold: false }; // rug
      return { ch: wy % 2 ? '─' : ' ', fg: '#4a3622', bg: groundBg(F, tag), bold: false };
    }
    case 'mfloor':
      if (hash(wx * 2 + sub, wy, 67) < 0.012) return { ch: '✦', fg: '#00ffff', bg: groundBg(F, tag), bold: false, glow: '#00ffff', glowR: 4, accent: true }; // ore glint
      return { ch: hs < 0.3 ? '·' : ' ', fg: '#4a4038', bg: groundBg(F, tag), bold: false };
    case 'fireplace':
      return centre({ ch: g, fg: '#ff7a30', bg: '#3a1a0a', bold: true, glow: '#ff7a30', glowR: 8, accent: true });
    // ---- furniture
    case 'bed': {
      const left = F.tags[y][x - 1];
      const head = !left || left.t !== 'bed';
      if (head) return { ch: '▀', fg: '#f2efe8', bg: '#3a4f9a', bold: false };
      return { ch: hs < 0.5 ? '░' : '▒', fg: '#6a82d0', bg: '#3a4f9a', bold: false };
    }
    case 'tv':
      if (wide) return { ch: sub === 0 ? '▐' : '▌', fg: '#6ae0ff', bg: '#141418', bold: false, glow: '#4ac8ff', glowR: 6, accent: true };
      return { ch: '▓', fg: '#6ae0ff', bg: '#141418', bold: false, glow: '#4ac8ff', glowR: 6, accent: true };
    case 'cal':
      return centre({ ch: '▤', fg: '#f4ead8', bg: '#3a2818', bold: false });
    case 'table':
      return { ch: '▀', fg: '#b07840', bg: groundBg(F, { ...tag, t: 'floor' }), bold: false };
    case 'counter':
      return { ch: '▀', fg: '#d0a070', bg: '#5a3a20', bold: false };
    case 'kitchen':
      return centre({ ch: '◉', fg: '#ff7040', bg: '#2a2a2e', bold: true, glow: '#ff5020', glowR: 5, accent: true });
    case 'shelf':
      return { ch: '▤', fg: '#b07a48', bg: '#3a2414', bold: false };
    case 'bookcase':
      return { ch: hs < 0.5 ? '▌' : '▐', fg: pick(['#c04848', '#4868c8', '#48a868', '#c8a848', '#9858c0'], hash(wx * 2 + sub, wy, 60)), bg: '#2a1a0e', bold: false };
    case 'bath':
      return { ch: hs < 0.5 ? '≈' : '∼', fg: '#3a90d8', bg: '#d8e6ee', bold: false };
    case 'up':
    case 'down':
    case 'exit':
      return centre({ ch: g, fg: pal(fg), bg: groundBg(F, tag), bold: true, glow: pal(fg), glowR: 5, accent: true });
    case 'pond':
    case 'spring':
    case 'fountain':
    case 'water': {
      if (tag.k === 'deco' && tag.dch) return centre({ ch: tag.dch, fg: '#7fe8ff', bg: groundBg(F, tag), bold: true, accent: true }); // fountain statue
      const wb = groundBg(F, tag);
      const tint = tag.t === 'pond' ? '#0a3a2a' : tag.t === 'spring' ? '#0a3a4a' : tag.t === 'fountain' ? '#0a3a6a' : '';
      let bg = tint ? mix(wb, tint, 0.6) : wb;
      const fgc = tag.t === 'spring' ? '#9ae8ff' : tag.t === 'fountain' ? '#7fe8ff' : tag.t === 'pond' ? '#5ae0a0' : th.waterFg;
      if (g === '-' && sub === 0) return { ch: '∼', fg: '#a8d0ff', bg, bold: false };
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const n = F.tags[y + dy]?.[x + dx];
        return !!n && !WATERY.has(n.t) && n.t !== 'bridge';
      });
      if (edge) return { ch: hs < 0.5 ? '∼' : ' ', fg: mix(fgc, '#ffffff', 0.25), bg: mix(bg, '#2a5aa0', 0.4), bold: false };
      // deeper water further from the shore
      let deep = true;
      for (let dy = -2; dy <= 2 && deep; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const n = F.tags[y + dy]?.[x + dx];
          if (n && !WATERY.has(n.t) && n.t !== 'bridge') { deep = false; break; }
        }
      }
      if (deep) bg = mix(bg, '#000000', 0.32);
      if (th.lilies && tag.t === 'water' && hash(wx, wy, 46) < 0.03) return centre({ ch: '◒', fg: '#3aa040', bg, bold: false });
      const glint = hash(wx * 2 + sub, wy, 80 + (Math.floor(F.t * 3) % 97));
      if (!F.indoor && F.weather === 'Sunny' && F.amb > 0.85 && glint < 0.014) return { ch: '✦', fg: '#ffffff', bg, bold: true, glow: '#cfe8ff', glowR: 5 };
      if (!F.indoor && F.weather === 'Sunny' && F.amb < 0.5 && hash(wx * 2 + sub, wy, 85 + (Math.floor(F.t * 1.5) % 61)) < 0.012) return { ch: '·', fg: '#e8eeff', bg, bold: true };
      const f = Math.floor(F.t * 1.2);
      const hw = hash(wx * 2 + sub, wy, 20 + (f % 64));
      if (tag.t === 'spring' && hw < 0.12) return { ch: '°', fg: '#e8f8ff', bg, bold: false };
      return { ch: hw < 0.3 ? '≈' : hw < 0.55 ? '∼' : ' ', fg: fgc, bg, bold: false };
    }
  }
  // Generic: furniture, signs, bins, doghouse... keep the readable glyph on a grounded background.
  return centre({ ch: g, fg: pal(fg), bg: F.indoor || lead[2] === '01' ? '#3a2818' : groundBg(F, tag), bold, accent: INTEREST.has(tag.t) });
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
/** Creature glyphs for animals and pets (engine letters -> pictograms). */
const CREATURE_GLYPH: Record<string, string> = { H: '♞', C: '♉', S: '☁' };
const BOX: Record<string, string> = { 'box:h': '─', 'box:v': '│', 'box:tl': '╭', 'box:tr': '╮', 'box:bl': '╰', 'box:br': '╯' };

/**
 * Build the styled frame for the current screen contents.
 * @param t seconds, used for animation (water, rain, snow, fireflies)
 */
export function computeFrame(
  scr: Pick<Screen, 'buf' | 'tags' | 'ctx' | 'w' | 'h'> & Partial<Pick<Screen, 'scene' | 'boxes'>>,
  t: number,
): OutCell[][] {
  const { buf, tags, ctx } = scr;
  const boxes = scr.boxes ?? [];
  const H = buf.length;
  const W = H ? buf[0].length : 0;
  const season = ctx ? ((ctx.season % 4) + 4) % 4 : 0;
  const motion = !ctx?.reducedMotion;
  const skyNow = ctx ? skyFor(ctx) : null;
  const F: Frame = { buf, tags, theme: THEMES[season], t, indoor: !!ctx?.indoor, weather: ctx?.weather ?? 'Sunny', amb: skyNow?.amb ?? 1, minutes: ctx?.minutes ?? 720 };
  const out: OutCell[][] = new Array(H);

  for (let y = 0; y < H; y++) {
    const row: OutCell[] = new Array(W);
    for (let x = 0; x < W; x++) {
      const cell = buf[y][x];
      const tag = tags[y][x];
      let o: OutCell;
      let uiCell = !tag;
      if (tag && tag.t !== 'ui') {
        if (tag.ent) {
          const under = styleTile(F, x, y, { ...tag, ent: undefined, k: tag.k?.startsWith('obj:') ? undefined : tag.k }, cell);
          const isPlayer = tag.ent === 'player';
          const creature = tag.ent === 'animal' || tag.ent === 'pet';
          const sprite = isPlayer ? '☻' : creature ? CREATURE_GLYPH[cell[0]] ?? cell[0] : cell[0];
          o = {
            ch: sprite,
            fg: pal(cell[1]),
            bg: under.bg,
            bold: true,
            glow: isPlayer ? pal(cell[1]) : tag.ent === 'npc' ? mix(pal(cell[1]), '#000000', 0.4) : undefined,
            glowR: isPlayer ? 5 : tag.ent === 'npc' ? 3 : undefined,
            token: mix(under.bg, '#000000', 0.45),
            rim: mix(under.bg, pal(cell[1]), isPlayer ? 0.55 : 0.4),
            accent: true,
          };
        } else {
          o = styleTile(F, x, y, tag, cell);
        }
        if (tag.hl) {
          const pulse = 0.26 + 0.05 * Math.sin(F.t * 5);
          o.bg = mix(o.bg, '#c8d4ff', pulse);
          o.glow = '#d8e2ff';
          o.glowR = 4;
        } else if (tag.hlArea) {
          o.bg = mix(o.bg, '#c8d4ff', 0.11);
        }
      } else if (tag && tag.t === 'ui') {
        const k = tag.k || '';
        uiCell = true;
        if (k in BOX) o = { ch: BOX[k], fg: pal(cell[1]), bg: pal(cell[2], '#000000'), bold: false };
        else if (k === 'bar') o = { ch: '█', fg: pal(cell[1]), bg: '#0c0c11', bold: false };
        else if (k === 'bar:empty') o = { ch: '░', fg: '#2c2c36', bg: '#0c0c11', bold: false };
        else o = { ch: cell[0], fg: pal(cell[1]), bg: pal(cell[2], '#000000'), bold: cell[3] };
      } else {
        o = { ch: cell[0], fg: pal(cell[1]), bg: pal(cell[2], '#000000'), bold: cell[3] };
      }
      if (uiCell) o.ui = true;
      else if (tag) o.seed = hash((tag.wx ?? x) * 2 + (tag.sub ?? 0), tag.wy ?? y, 200);
      row[x] = o;
    }
    out[y] = row;
  }

  // ---- Isotope Dark look: black-leaning grounds, neon glyphs (before lighting)
  if (ctx) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tag = tags[y][x];
        if (!tag || tag.t === 'ui') continue;
        const o = out[y][x];
        o.bg = mix(o.bg, '#000000', 0.42);
        o.fg = neon(o.fg);
        if (o.token) o.token = mix(o.token, '#000000', 0.42);
      }
    }
  }

  // ---- ground edges: soften borders between different ground types
  if (ctx) blendGroundEdges(out, tags, ctx.view, W, H);

  if (!ctx) {
    if (scr.scene === 'title') {
      for (const row of out) for (const o of row) o.ui = false;
      titleScene(out, buf, tags, boxes, t, W, H);
      monochrome(out, boxes);
    }
    decorateBoxes(out, boxes, W, H);
    snapFrame(out);
    return out;
  }

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

  // ---- contact shadows: ground below/right of buildings, trees and cliffs is darker.
  // At dawn and dusk the shadow reaches one cell farther, like a low sun.
  const sunHour = (((ctx.minutes / 60) % 24) + 24) % 24;
  const longShadow = sunHour < 8 || sunHour > 17;
  for (let y = v.y; y < v.y + v.h && y < H; y++) {
    for (let x = v.x; x < v.x + v.w && x < W; x++) {
      const tag = tags[y][x];
      if (!tag || tag.t === 'ui' || !SHADOW_RECEIVERS.has(tag.t) || (tag.k || '').startsWith('obj:boulder')) continue;
      const up = y > 0 ? tags[y - 1][x] : null;
      const up2 = longShadow && y > 1 ? tags[y - 2][x] : null;
      const left = x > 0 ? tags[y][x - 1] : null;
      const left2 = longShadow && x > 1 ? tags[y][x - 2] : null;
      let k = 0;
      if (up && up.t !== 'ui' && SHADOW_CASTERS.has(up.t)) k = up.t === 'tree' ? 0.22 : 0.34;
      else if (up2 && up2.t !== 'ui' && SHADOW_CASTERS.has(up2.t)) k = up2.t === 'tree' ? 0.1 : 0.16;
      else if (left && left.t !== 'ui' && (left.t === 'wall' || left.t === 'door')) k = 0.16;
      else if (left2 && left2.t !== 'ui' && (left2.t === 'wall' || left2.t === 'door')) k = 0.09;
      if (k) {
        const o = out[y][x];
        o.bg = mix(o.bg, '#000000', k);
        o.fg = mix(o.fg, '#000000', k * 0.6);
        // sunlight dapples through the leaves onto the shaded ground
        if (up && up.t === 'tree' && o.ch === ' ' && !o.dx && sky.amb > 0.85 && ctx.weather === 'Sunny'
          && hash((tag.wx ?? x) * 2 + (tag.sub ?? 0), tag.wy ?? y, 150) < 0.5) {
          o.ch = '˙';
          o.fg = mix(o.bg, '#fff4d8', 0.55);
        }
      }
    }
  }

  // ---- drifting cloud shadows on fair days
  const outdoor = !ctx.indoor && ctx.mapName !== 'mine';
  if (outdoor && ctx.weather === 'Sunny' && sky.amb > 0.85 && motion) {
    const tc = Math.floor(t * 2) / 2; // step twice a second so a static scene doesn't repaint every frame
    for (let y = v.y; y < v.y + v.h && y < H; y++) {
      for (let x = v.x; x < v.x + v.w && x < W; x++) {
        const tag = tags[y][x];
        if (!tag || tag.t === 'ui') continue;
        const zw = tag.zw ?? 1;
        const px = (tag.wx ?? x) + (tag.sub ?? 0) / zw;
        const n = valueNoise(px / 9 + tc * 0.06, (tag.wy ?? y) / 5 + tc * 0.02, 51);
        if (n > 0.64) {
          const k = Math.min(1, (n - 0.64) / 0.2) * 0.3;
          const o = out[y][x];
          // value-only shade so the colour stays on its own Isotope ramp
          o.bg = mix(o.bg, '#000000', k);
          o.fg = mix(o.fg, '#000000', k * 0.7);
        }
      }
    }
  }

  // ---- chimney smoke, butterflies, falling leaves
  if (outdoor && motion) {
    chimneys(out, tags, v, t, W, H, ctx.weather);
    critters(out, tags, v, t, W, H, season, ctx.weather, sky.amb);
  }
  if (outdoor && (ctx.weather === 'Rain' || ctx.weather === 'Typhoon')) {
    // everything looks wet and a touch darker in the rain
    for (let y = v.y; y < v.y + v.h && y < H; y++) {
      for (let x = v.x; x < v.x + v.w && x < W; x++) {
        const tag = tags[y][x];
        if (tag && tag.t !== 'ui' && SHADOW_RECEIVERS.has(tag.t)) out[y][x].bg = mix(out[y][x].bg, '#000000', 0.12);
      }
    }
  }

  // ---- weather (outdoor only)
  const outdoorFx = !ctx.indoor && ctx.mapName !== 'mine';
  const w = ctx.weather;
  if (outdoorFx && w !== 'Sunny' && motion) {
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

  // ---- footprints in snow and sand, birds on fine days
  if (outdoorFx) footprints(out, tags, v, ctx, season);
  if (outdoorFx && w === 'Sunny' && sky.amb > 0.85 && motion) birds(out, tags, v, t);

  // ---- lighting (with lightning flashes in a typhoon)
  const flash = motion && outdoor && ctx.weather === 'Typhoon' && lightning(t);
  if (flash) {
    sky.amb = Math.min(1.1, sky.amb + 0.65);
    sky.tint = '#c8d8ff';
    sky.tintAmt = 0.25;
  }
  const fireflies = motion && outdoorFx && sky.amb < 0.62 && (season === 0 || season === 1) && w === 'Sunny';
  const FIREFLY = '#fff27a';
  if (sky.amb < 0.999 || flash) {
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
        if (tag.t === 'mwall' && isTorch(F, x, y, tag)) lights.push({ x: lx, y: y + 1, r: 5 * (zr > 1 ? 1.4 : 1), col: hexToRgb('#ff9900'), k: 0.85 });
      }
    }
    const tintRgb = hexToRgb(sky.tint);
    const vignette = flash ? 0 : Math.max(0, 0.8 - sky.amb) * 0.6;
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
            // flames flicker a little; each light has its own rhythm
            const flick = 0.9 + 0.1 * Math.sin(Math.floor(t * 8) * 0.9 + L.x * 1.7 + L.y * 2.3);
            const k = (1 - d / L.r) ** 1.1 * L.k * flick;
            lr += L.col[0] * k;
            lg += L.col[1] * k;
            lb += L.col[2] * k;
            ls += k;
          }
        }
        // Entities stay a little brighter so the player can always find them.
        const entBoost = tag.ent ? 0.35 : 0;
        o.bg = shade(o.bg, lr, lg, lb, ls);
        // the rim of each light pool fades out through ':' and '.' (an ASCII gradient)
        if (ls > 0.04 && ls < 0.32 && o.ch === ' ' && SHADOW_RECEIVERS.has(tag.t) && !tag.ent && !o.dx && !(x > 0 && out[y][x - 1].dx)
          && hash((tag.wx ?? x) * 2 + (tag.sub ?? 0), tag.wy ?? y, 73) < 0.45) {
          o.ch = ls < 0.14 ? '.' : ':';
          o.fg = mix(o.bg, '#ffe0a0', 0.22 + ls * 0.6);
        }
        o.fg = entBoost && ls < entBoost ? shade(o.fg, 255 * entBoost, 240 * entBoost, 210 * entBoost, entBoost) : shade(o.fg, lr, lg, lb, ls);
        if (o.token) o.token = shade(o.token, lr, lg, lb, ls);
        if (o.rim) o.rim = shade(o.rim, lr, lg, lb, ls);
        if (vignette > 0) {
          const nx = (x - (v.x + v.w / 2)) / (v.w / 2);
          const ny = (y - (v.y + v.h / 2)) / (v.h / 2);
          const d = Math.sqrt(nx * nx + ny * ny) / 1.25;
          const k = Math.max(0, Math.min(1, (d - 0.5) / 0.5)) * vignette;
          if (k > 0) {
            o.bg = mix(o.bg, '#000000', k);
            o.fg = mix(o.fg, '#000000', k * 0.8);
          }
        }
        if (sky.windowsLit && tag.t === 'wall' && tag.k === 'deco' && tag.dch === '=') {
          o.fg = '#ffd27a';
          o.bg = '#5a3410';
          o.glow = '#ffb040';
          o.glowR = 10;
          o.accent = true;
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
            o.accent = true;
          }
        }
      }
    }
  }
  // ---- reflections in calm water (after lighting, so lit windows reflect too)
  if (outdoor && ctx.weather === 'Sunny') reflections(out, tags, v, t, W, H);
  shoreFoam(out, tags, v, W, H);

  monochrome(out, boxes);
  decorateBoxes(out, boxes, W, H);
  snapFrame(out);
  return out;
}

// A short trail of where the player has been, per map (the renderer's only state).
const trail: { map: string; wx: number; wy: number }[] = [];
export function resetTrail() {
  trail.length = 0;
}

function footprints(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], ctx: RenderCtx, season: number) {
  let p: [number, number, number, number] | null = null;
  for (let y = v.y; y < v.y + v.h && !p && y < tags.length; y++) {
    for (let x = v.x; x < v.x + v.w && x < tags[y].length; x++) {
      const tg = tags[y][x];
      if (tg?.ent === 'player') { p = [x, y, tg.wx ?? x, tg.wy ?? y]; break; }
    }
  }
  if (!p) return;
  const [px, py, pwx, pwy] = p;
  const last = trail[trail.length - 1];
  if (last && last.map !== ctx.mapName) trail.length = 0;
  if (!last || last.map !== ctx.mapName || last.wx !== pwx || last.wy !== pwy) {
    trail.push({ map: ctx.mapName, wx: pwx, wy: pwy });
    if (trail.length > 16) trail.shift();
  }
  const zw = ctx.zoom || 1;
  for (let i = 0; i < trail.length - 1; i++) {
    const s = trail[i];
    const x = px + (s.wx - pwx) * zw;
    const y = py + (s.wy - pwy);
    if (y < v.y || y >= v.y + v.h || x < v.x || x >= v.x + v.w) continue;
    const tg = tags[y][x];
    if (!tg || tg.wx !== s.wx || tg.wy !== s.wy || tg.ent || tg.k) continue;
    if (!((season === 3 && GROUND.has(tg.t)) || tg.t === 'sand')) continue;
    const o = out[y][x];
    if (o.dx) continue;
    const fresh = (i + 1) / trail.length; // older prints fade
    out[y][x] = { ...o, ch: ':', fg: mix(o.bg, '#b4bccc', 0.3 + 0.55 * fresh), bold: true, glow: undefined, dx: zw > 1 ? 0.5 : undefined };
    if (zw > 1 && out[y][x + 1]) out[y][x + 1] = { ...out[y][x + 1], ch: ' ' };
  }
}

/** Now and then a small flock crosses the map in a V. */
function birds(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], t: number) {
  const period = 40;
  const n = Math.floor(t / period);
  const p = (t - n * period) / 16; // a crossing takes 16 s
  if (p > 1 || hash(n, 3, 130) > 0.65) return;
  const count = 3 + Math.floor(hash(n, 4, 131) * 3);
  const y0 = v.y + 1 + Math.floor(hash(n, 5, 132) * v.h * 0.5);
  const dir = hash(n, 6, 133) < 0.5 ? 1 : -1;
  const lead = dir > 0 ? v.x - 8 + p * (v.w + 16) : v.x + v.w + 8 - p * (v.w + 16);
  for (let i = 0; i < count; i++) {
    const rank = Math.ceil(i / 2);
    const x = Math.round(lead - dir * rank * 2);
    const y = y0 + Math.round(p * 3) + (i === 0 ? 0 : i % 2 ? -rank : rank);
    const tg = tags[y]?.[x];
    if (!tg || tg.t === 'ui' || tg.ent || out[y][x].dx) continue;
    const flap = Math.floor(t * 5 + i) % 2 === 0;
    out[y][x] = { ...out[y][x], ch: flap ? 'v' : 'ˇ', fg: '#d8d8d8', bold: true, glow: undefined };
  }
}

/** Mark water cells that touch land so the painter can draw a thin foam line on that side. */
function shoreFoam(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], W: number, H: number) {
  const land = (n: CellTag | null | undefined) => !!n && n.t !== 'ui' && !WATERY.has(n.t) && n.t !== 'bridge' && n.t !== 'void';
  for (let y = v.y; y < v.y + v.h && y < H; y++) {
    for (let x = v.x; x < v.x + v.w && x < W; x++) {
      const tg = tags[y][x];
      if (!tg || !WATERY.has(tg.t)) continue;
      let m = 0;
      if (land(tags[y - 1]?.[x])) m |= 1;
      if (land(tags[y][x + 1])) m |= 2;
      if (land(tags[y + 1]?.[x])) m |= 4;
      if (land(tags[y][x - 1])) m |= 8;
      if (!m) continue;
      const o = out[y][x];
      o.foam = m;
      o.foamCol = mix(o.bg, '#ffffff', 0.42);
    }
  }
  // the same thin edge line, fainter, gives paths a stone kerb where they meet grass or soil
  const soft = (n: CellTag | null | undefined) => !!n && (n.t === 'grass' || n.t === 'flower' || n.t === 'field');
  for (let y = v.y; y < v.y + v.h && y < H; y++) {
    for (let x = v.x; x < v.x + v.w && x < W; x++) {
      const tg = tags[y][x];
      if (!tg || tg.t !== 'path') continue;
      let m = 0;
      if (soft(tags[y - 1]?.[x])) m |= 1;
      if (soft(tags[y][x + 1])) m |= 2;
      if (soft(tags[y + 1]?.[x])) m |= 4;
      if (soft(tags[y][x - 1])) m |= 8;
      if (!m) continue;
      const o = out[y][x];
      o.foam = m;
      o.foamCol = mix(o.bg, '#ffffff', 0.2);
    }
  }
}

const MIRROR: Record<string, string> = { '▄': '▀', '▀': '▄', '◢': '◥', '◣': '◤', '▲': '▼' };
const TALL = new Set(['tree', 'wall', 'roof', 'door', 'cliff']);

/** Water mirrors what stands on its shore: dimmed, flipped, broken up by ripples. */
function reflections(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], t: number, W: number, H: number) {
  const f = Math.floor(t * 2);
  for (let y = v.y + 1; y < v.y + v.h && y < H; y++) {
    for (let x = v.x; x < v.x + v.w && x < W; x++) {
      const tag = tags[y][x];
      if (!tag || !WATERY.has(tag.t) || tag.ent) continue;
      let k = 0;
      for (let d = 1; d <= 4; d++) {
        const n = tags[y - d]?.[x];
        if (!n || n.t === 'ui') break;
        if (!WATERY.has(n.t)) {
          k = d;
          break;
        }
      }
      if (!k) continue;
      const sy = y - 2 * k + 1; // mirror line sits on the shore
      if (sy < v.y) continue;
      const st = tags[sy]?.[x];
      if (!st || st.t === 'ui') continue;
      const src = out[sy][x];
      if (!(TALL.has(st.t) || st.ent || src.accent)) continue;
      const o = out[y][x];
      if (src.ch === ' ') {
        if (x > 0 && out[sy][x - 1].dx) out[y][x] = { ...o, ch: ' ', glow: undefined };
        continue;
      }
      if (hash((tag.wx ?? x) * 2 + (tag.sub ?? 0), tag.wy ?? y, 120 + (f % 31)) < 0.22) continue; // ripple break-up
      out[y][x] = {
        ch: MIRROR[src.ch] ?? src.ch,
        fg: mix(src.fg, o.bg, 0.5 + 0.1 * k),
        bg: o.bg,
        bold: false,
        accent: src.accent,
        dx: src.dx,
        glow: src.accent && src.glow ? mix(src.glow, '#000000', 0.5) : undefined,
        glowR: 4,
      };
    }
  }
}

// ---------------------------------------------------------------- scene extras

/** Lightning pattern for typhoons: a double flash every few seconds. */
export function lightning(t: number): boolean {
  const period = 7;
  const n = Math.floor(t / period);
  if (hash(n, 0, 90) > 0.7) return false;
  const p = t - n * period;
  return p < 0.12 || (p > 0.24 && p < 0.32);
}

const GROUND = new Set(['grass', 'field', 'path', 'sand', 'flower']);

function blendGroundEdges(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], W: number, H: number) {
  // A 16-colour palette has no in-between hues, so borders are dithered (the classic
  // limited-palette technique): the softer ground (grass over soil, soil over path)
  // creeps into its neighbour as a light shade pattern in its own colour.
  const rank: Record<string, number> = { grass: 3, flower: 3, field: 2, sand: 1, path: 0 };
  const base = out.map((r) => r.map((o) => o.bg));
  const dirs: [number, number, string][] = [
    [0, -1, '▀'],
    [0, 1, '▄'],
    [-1, 0, '▌'],
    [1, 0, '▐'],
  ];
  for (let y = v.y; y < v.y + v.h && y < H; y++) {
    for (let x = v.x; x < v.x + v.w && x < W; x++) {
      const tag = tags[y][x];
      if (!tag || tag.t === 'ui' || !GROUND.has(tag.t) || tag.k || out[y][x].ch !== ' ') continue;
      if (out[y][x - 1]?.dx) continue; // under a centred sprite
      if (hash((tag.wx ?? x) * 2 + (tag.sub ?? 0), tag.wy ?? y, 61) > 0.55) continue; // ragged, not a solid band
      for (const [dx, dy, edge] of dirs) {
        const n = tags[y + dy]?.[x + dx];
        if (n && n.t !== 'ui' && GROUND.has(n.t) && !n.k && rank[n.t] > rank[tag.t]) {
          const solid = hash((tag.wx ?? x) * 2 + (tag.sub ?? 0) + dx, (tag.wy ?? y) + dy, 62) < 0.34;
          out[y][x] = { ...out[y][x], ch: solid ? edge : '░', fg: base[y + dy][x + dx] };
          break;
        }
      }
    }
  }
}

/** Chimneys on the larger roofs, with smoke curling up from them. */
function chimneys(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], t: number, W: number, H: number, weather: string) {
  if (weather === 'Typhoon') return;
  for (let y = v.y + 1; y < v.y + v.h && y < H; y++) {
    let x = v.x;
    while (x < v.x + v.w && x < W) {
      const top = (xx: number) => {
        const tg = tags[y][xx];
        const up = tags[y - 1]?.[xx];
        return !!tg && tg.t === 'roof' && (!tg.dch || tg.dch === '^') && !(up && up.t === 'roof');
      };
      if (!top(x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < v.x + v.w && x < W && top(x)) x++;
      const len = x - start;
      if (len < 5) continue;
      const cx = start + Math.floor(len * 0.72);
      const c = out[y][cx];
      out[y][cx] = { ...c, ch: '▐', fg: '#7a4a38', glow: undefined };
      const seed = hash(start, y, 33);
      for (let k = 1; k <= 3; k++) {
        const yy = y - k;
        if (yy < v.y) break;
        const drift = Math.round(Math.sin(t * 0.8 + k + seed * 6) * (k - 1) * 0.7);
        const xx = cx + drift;
        const tg = tags[yy]?.[xx];
        if (!tg || tg.t === 'ui' || tg.ent || tg.t === 'roof') continue; // smoke may drift over treetops
        const phase = (t * 0.9 + seed + k * 0.37) % 1;
        if (phase < 0.25 * k - 0.2) continue;
        const o = out[yy][xx];
        if (o.dx) continue;
        out[yy][xx] = { ...o, ch: k === 1 ? '°' : k === 2 ? '∘' : '·', fg: mix('#eeeef4', o.bg, 0.05 + k * 0.15), bold: k === 1, glow: undefined };
      }
    }
  }
}

/** Butterflies on fair spring/summer days, falling leaves in autumn. */
function critters(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], t: number, W: number, H: number, season: number, weather: string, amb: number) {
  const day = amb > 0.85;
  const butterflies = day && weather === 'Sunny' && (season === 0 || season === 1);
  const leaves = season === 2 && weather !== 'Typhoon';
  if (!butterflies && !leaves) return;
  const n = butterflies ? Math.max(3, Math.round((v.w * v.h) / 500)) : Math.max(6, Math.round((v.w * v.h) / 160));
  const cols = butterflies ? ['#ffe27a', '#ffffff', '#ff9ad0', '#9ad0ff'] : ['#ff9900', '#ff5a1a', '#e8b400'];
  for (let i = 0; i < n; i++) {
    const a = hash(i, 1, 101);
    const b = hash(i, 2, 102);
    let fx: number;
    let fy: number;
    if (butterflies) {
      fx = a * v.w + Math.sin(t * 0.45 + i * 1.7) * 9 + Math.sin(t * 1.9 + i) * 1.5;
      fy = b * v.h + Math.sin(t * 0.6 + i * 2.3) * 3 + Math.cos(t * 2.3 + i) * 0.6;
    } else {
      fx = a * v.w + Math.sin(t * 0.7 + i) * 3 + t * 1.2;
      fy = b * v.h + t * (0.9 + b * 0.6);
    }
    const x = v.x + (((Math.round(fx) % v.w) + v.w) % v.w);
    const y = v.y + (((Math.round(fy) % v.h) + v.h) % v.h);
    if (y >= H || x >= W) continue;
    const tg = tags[y][x];
    if (!tg || tg.t === 'ui' || tg.ent) continue;
    if (butterflies && !(GROUND.has(tg.t) || (tg.k || '').startsWith('soil') || (tg.k || '').startsWith('crop:'))) continue;
    if (leaves && !(GROUND.has(tg.t) || WATERY.has(tg.t) || (tg.k || '').startsWith('soil'))) continue;
    const o = out[y][x];
    if (o.dx) continue;
    const flap = Math.floor(t * 6 + i) % 2 === 0;
    out[y][x] = {
      ...o,
      ch: butterflies ? (flap ? 'ж' : '×') : '❦',
      fg: cols[i % cols.length],
      bold: true,
      glow: undefined,
      accent: true,
    };
  }
}

/** Night-sky backdrop, hills and a gradient logo for the title screen. */
function titleScene(out: OutCell[][], buf: Cell[][], tags: (CellTag | null)[][], boxes: Screen['boxes'], t: number, W: number, H: number) {
  const inBox = (x: number, y: number) => boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  const ft = Math.floor(t * 2);
  const near = (x: number) => 3.2 + 1.6 * Math.sin(x * 0.07 + 0.5) + 1.1 * Math.sin(x * 0.19 + 2);
  const far = (x: number) => 5.8 + 2.2 * Math.sin(x * 0.045 + 1.3) + 0.9 * Math.sin(x * 0.13);
  let lx0 = W;
  let lx1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tags[y][x]?.k === 'logo') { lx0 = Math.min(lx0, x); lx1 = Math.max(lx1, x); }
  const moonX = Math.floor(W * 0.82);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inBox(x, y)) continue;
      const cell = buf[y][x];
      const o = out[y][x];
      const fromBottom = H - 1 - y;
      const skyBg = mix(mix('#04051a', '#1c1240', Math.min(1, y / (H * 0.6))), '#3a1838', Math.max(0, (y - H * 0.55) / (H * 0.45)));
      const hillNear = fromBottom < near(x);
      const hillFar = !hillNear && fromBottom < far(x);
      const bg = hillNear ? '#071208' : hillFar ? '#0c1a22' : skyBg;
      if (cell[2] === '00') o.bg = bg;
      if (tags[y][x]?.k === 'logo') {
        const k = lx1 > lx0 ? (x - lx0) / (lx1 - lx0) : 0;
        o.fg = mix('#ff4fa8', '#ffb347', k);
        o.glow = mix(o.fg, '#000000', 0.4);
        o.glowR = 6;
        o.accent = true;
        continue;
      }
      if (cell[0] !== ' ') continue;
      if (x === moonX && y === 2) {
        out[y][x] = { ch: '☾', fg: '#fff4d0', bg, bold: true, glow: '#fff4d0', glowR: 12, accent: true };
        continue;
      }
      if (!hillNear && !hillFar && y < H * 0.7) {
        const h = hash(x, y, 5);
        if (h < 0.035) {
          const tw = hash(x, y, 6 + (ft % 9));
          out[y][x] = { ch: tw > 0.85 ? '✦' : '·', fg: mix('#8890b8', '#ffffff', tw), bg, bold: tw > 0.85 };
        }
      } else if (hillNear && fromBottom === Math.floor(near(x)) - 1 && hash(x, 0, 8) < 0.05) {
        out[y][x] = { ch: '▪', fg: '#ffd27a', bg, bold: true, glow: '#ffb040', glowR: 6, accent: true };
      }
    }
  }
}

/** Dialogs and menus: a raised panel and a soft drop shadow. */
function decorateBoxes(out: OutCell[][], boxes: Screen['boxes'], W: number, H: number) {
  for (const b of boxes) {
    for (let y = b.y; y < b.y + b.h && y < H; y++) {
      for (let x = b.x; x < b.x + b.w && x < W; x++) {
        if (y < 0 || x < 0) continue;
        if (out[y][x].bg === '#000000') out[y][x].bg = '#0e0e16';
      }
    }
    const shadow = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      if (boxes.some((o) => o !== b && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) return;
      out[y][x].bg = mix(out[y][x].bg, '#000000', 0.45);
      out[y][x].fg = mix(out[y][x].fg, '#000000', 0.4);
    };
    for (let y = b.y + 1; y <= b.y + b.h; y++) shadow(b.x + b.w, y);
    for (let x = b.x + 1; x < b.x + b.w; x++) shadow(x, b.y + b.h);
  }
}

// ---------------------------------------------------------------- drawing

export type Metrics = { cw: number; ch: number; fontPx: number; font: string; dpr?: number; hires?: boolean };

/** Paint a computed frame. Block shapes are drawn as rects/paths so they tile without seams. */
// ---------------------------------------------------------------- high-resolution textures
//
// Texture cells (grass, specks, cobbles, water, foliage, shingles, planks, furrows, rock) are
// drawn as a 2x2 grid of half-size glyphs: four times the detail per cell. Sprites, text and
// the HUD stay full size so everything stays readable. Each entry lists 4-glyph variants
// (top-left, top-right, bottom-left, bottom-right), picked by the cell's world seed.
const SUBPIX: Record<string, string[]> = {
  "'": ["'  `", " '` ", "` ' ", "'' `"],
  '`': ["`  '", " `' ", "' ` ", "`` '"],
  '·': ['·  ·', ' ·· ', '·   ', '  · '],
  '∙': ['∙  ·', ' ·∙ '],
  '▪': ['▪▫▫▪', '▫▪▪▫', '▪▪ ▫', '▫ ▪▪'],
  '≈': ['∼≈≈∼', '≈∼∼≈', '∼∼≈≈'],
  '∼': ['∼  ∼', ' ∼∼ ', '∼ ∼ '],
  '♣': ['♣♠♣♣', '♣♣♠♣', '♠♣♣♣', '♣♣♣♠'],
  '♠': ['♠♠♣♠', '♠♣♠♠', '♠♠♠♣'],
  '░': ['░░░░'],
  '▒': ['▒▒▒▒', '▒░▒▒'],
  '▓': ['▓▒▒▓', '▒▓▓▒'],
  '═': ['════'],
  '≡': ['≡≡≡≡'],
  '─': ['────'],
  '˙': ['˙  ˙', ' ˙  ', '  ˙ ', '˙   ', ' ˙˙ '],
};

// Small things drawn as clusters across their tile: [centre pool, edge pool].
const SPRITE_POOLS: Record<string, [string, string]> = {
  'ψ': [' ', '    ʷ, '],
  '✿': ['✿❀✿', '  ·, '],
  '❀': ['❀✿❀', '  ·, '],
  '∴': ['·∙', ' ·'],
  ',': [',ʷ,', '  , '],
  '"': ['"ʷ"', '  , '],
  'ʷ': ['ʷ,ʷ', '   ,'],
  '•': [' ', '     · '],
};
/** Field obstacles keep their full-size glyph at the centre (they must stay easy to spot). */
export const SPRITE_KEEP = new Set(['ψ', '•']);

/**
 * Rows of a small-object cluster spanning the object's tile (2 cells wide when centred in Large
 * mode): `level` rows of `level * width` glyphs, denser toward the middle. Null when the object
 * should stay a single glyph (glowing crops, tokens, the HUD, small fonts).
 */
export function spritePattern(o: OutCell, fontPx: number, level: number): string[] | null {
  if (level < 2 || fontPx < HIRES_MIN_FONT || o.ui || o.token || o.glow) return null;
  const pools = SPRITE_POOLS[o.ch];
  if (!pools) return null;
  const cols = level * (o.dx ? 2 : 1);
  const seed = o.seed ?? 0;
  const rows: string[] = [];
  for (let r = 0; r < level; r++) {
    let row = '';
    for (let c = 0; c < cols; c++) {
      const dx = (c + 0.5) / cols - 0.5;
      const dy = (r + 0.5) / level - 0.5;
      const pool = Math.sqrt(dx * dx * 1.6 + dy * dy) < 0.3 ? pools[0] : pools[1];
      const j = Math.sin(seed * 6151 + r * 17.3 + c * 41.9) * 43758.5453;
      row += pool[Math.floor((j - Math.floor(j)) * pool.length) % pool.length];
    }
    rows.push(row);
  }
  return rows;
}
/** Smallest font size at which the half-size texture glyphs are still legible. */
export const HIRES_MIN_FONT = 12;

/** Glyph pools for the 3x3 level: every variant's glyphs (spaces included, so density is kept). */
const SUBPOOL: Record<string, string[]> = Object.fromEntries(Object.entries(SUBPIX).map(([k, v]) => [k, [...v.join('')]]));

/**
 * Texture detail level for a font size and device pixel ratio: 3 (3x3 glyphs) on sharp
 * screens, 2 (2x2) where half-size glyphs are still legible, otherwise 1 (plain glyph).
 */
export function hiresLevel(fontPx: number, dpr = 1): number {
  if (fontPx >= 14 && fontPx * dpr >= 28) return 3;
  return fontPx >= HIRES_MIN_FONT ? 2 : 1;
}

/** The texture detail level after applying the player's high-res-detail preference. */
export function effectiveHiresLevel(fontPx: number, dpr = 1, hires = true): number {
  return hires ? hiresLevel(fontPx, dpr) : 1;
}

/** The n x n high-resolution pattern for a cell (n*n glyphs, row by row), or null for a plain glyph. */
export function subPattern(o: OutCell, fontPx: number, n = 2): string | null {
  if (n < 2 || fontPx < HIRES_MIN_FONT || o.ui || o.dx || o.token || o.glow) return null;
  const v = SUBPIX[o.ch];
  if (!v) return null;
  const seed = o.seed ?? 0;
  if (n === 2) return v[Math.floor(seed * v.length) % v.length];
  const pool = SUBPOOL[o.ch];
  let out = '';
  for (let k = 0; k < n * n; k++) {
    const j = Math.sin(seed * 7919 + k * 31.7) * 43758.5453;
    out += pool[Math.floor((j - Math.floor(j)) * pool.length) % pool.length];
  }
  return out;
}

/** Textures with form are lit from the top-left; the rest get a gentle per-glyph jitter. */
const LIT_SUB = new Set(['♣', '♠', '░', '▒', '▓', '═', '≡', '─']);
const LIT_ALPHA = [1, 0.84, 0.8, 0.62];

/** Brightness (as alpha over the cell background) for mini-glyph k (0..3) of a high-res cell. */
export function subAlpha(ch: string, seed: number, k: number): number {
  if (LIT_SUB.has(ch)) return LIT_ALPHA[k];
  const j = Math.sin(seed * 9301 + k * 49.3) * 43758.5453;
  return 0.6 + 0.4 * (j - Math.floor(j));
}

/** Row brightness for the 3x3 level: lit textures fade from top to bottom, others jitter per row. */
export function rowAlpha(ch: string, seed: number, r: number, n: number): number {
  if (LIT_SUB.has(ch)) return 1 - (0.36 * r) / Math.max(1, n - 1);
  return subAlpha(ch, seed, r);
}

export function drawFrame(g: CanvasRenderingContext2D, frame: OutCell[][], m: Metrics) {
  const { cw, ch, fontPx, font } = m;
  const level = effectiveHiresLevel(fontPx, m.dpr ?? 1, m.hires ?? true);
  const mx: number[] = [];
  const my: number[] = [];
  const ms: string[] = [];
  const mf: string[] = [];
  const ma: number[] = [];
  const mb: boolean[] = [];
  const mini = (x: number, y: number, str: string, fg: string, a: number, b: boolean) => {
    mx.push(x); my.push(y); ms.push(str); mf.push(fg); ma.push(a); mb.push(b);
  };
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
      // Small glyphs are queued and drawn in one batch after this loop, so the canvas font
      // switches once per frame instead of once per cell.
      const spr = spritePattern(o, fontPx, level);
      if (spr) {
        const left = px - (o.dx ?? 0) * cw; // a centred sprite spans its whole tile
        for (let r = 0; r < spr.length; r++) {
          if (spr[r].trim() !== '') mini(left, py + r * (ch / level) + ch / (2 * level) + 0.5, spr[r], o.fg, 1, o.bold);
        }
        if (!SPRITE_KEEP.has(o.ch)) continue; // obstacles also draw their full-size glyph below
      }
      const pat = spr ? null : subPattern(o, fontPx, level);
      if (pat) {
        if (level === 2) {
          for (let k = 0; k < 4; k++) {
            if (pat[k] !== ' ') mini(px + (k & 1) * (cw / 2), py + (k >> 1) * (ch / 2) + ch / 4 + 0.5, pat[k], o.fg, subAlpha(o.ch, o.seed ?? 0, k), o.bold);
          }
        } else {
          // one call per row: a monospace font at size fontPx/n advances exactly cw/n per glyph
          for (let r = 0; r < level; r++) {
            const rowStr = pat.slice(r * level, r * level + level);
            if (rowStr.trim() !== '') mini(px, py + r * (ch / level) + ch / (2 * level) + 0.5, rowStr, o.fg, rowAlpha(o.ch, o.seed ?? 0, r, level), o.bold);
          }
        }
        continue;
      }
      if (o.token) {
        if (glowOn) { g.shadowBlur = 0; glowOn = false; }
        const wide = !!o.dx;
        g.beginPath();
        g.ellipse(px + cw / 2, py + ch / 2, wide ? ch * 0.48 : cw * 0.62, ch * 0.46, 0, 0, Math.PI * 2);
        g.fillStyle = o.token;
        g.fill();
        if (o.rim) {
          g.strokeStyle = o.rim;
          g.lineWidth = 1;
          g.stroke();
        }
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
  // batched small glyphs (high-res textures and clusters)
  if (ms.length) {
    g.shadowBlur = 0;
    for (const bold of [false, true]) {
      g.font = `${bold ? 'bold ' : ''}${fontPx / Math.max(2, level)}px ${font}`;
      for (let i = 0; i < ms.length; i++) {
        if (mb[i] !== bold) continue;
        g.globalAlpha = ma[i];
        g.fillStyle = mf[i];
        g.fillText(ms[i], mx[i], my[i]);
      }
    }
    g.globalAlpha = 1;
  }

  // shoreline foam: a thin light line where water meets land
  const fw = Math.max(1, Math.round(ch / 12));
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    for (let x = 0; x < row.length; x++) {
      const o = row[x];
      if (!o.foam) continue;
      g.fillStyle = o.foamCol ?? '#c0c0c0';
      const X = Math.floor(x * cw);
      const Y = Math.floor(y * ch);
      const Wc = Math.ceil(cw);
      const Hc = Math.ceil(ch);
      if (o.foam & 1) g.fillRect(X, Y, Wc, fw);
      if (o.foam & 4) g.fillRect(X, Y + Hc - fw, Wc, fw);
      if (o.foam & 8) g.fillRect(X, Y, fw, Hc);
      if (o.foam & 2) g.fillRect(X + Wc - fw, Y, fw, Hc);
    }
  }
  g.restore();
}

/** Cheap change detection so we only repaint when something visible changed. */
export function frameSignature(frame: OutCell[][]): string {
  let s = '';
  // the seed decides which high-res pattern a texture cell shows, so it must trigger repaints too
  for (const row of frame) for (const o of row) s += o.ch + o.fg + o.bg + (o.bold ? 1 : 0) + (o.glow ? 'g' : '') + (o.seed ? (o.seed * 97) | 0 : '') + (o.foam ? 'f' + o.foam + o.foamCol : '');
  return s;
}
