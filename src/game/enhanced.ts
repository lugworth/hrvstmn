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
  /** A small second glyph in its own colour on the upper right of the cell (fruit on a tree): a two-tone tile. */
  detail?: { ch: string; fg: string };
  /** Lettering: always drawn as its own glyph, never swapped for a high-res texture. */
  plain?: boolean;
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
  searchSet = set.map((c) => c.map(Math.round) as RGB);
  // Warm (sepia) and cool (moonlit) neutrals for the time-of-day duotone. They are only ever
  // produced on purpose by toned(), so they are allowed but never picked by nearest-colour search.
  rampSet = [...searchSet, ...TONE_HEXES.map(hexToRgb)];
  return rampSet;
}
let searchSet: RGB[] = [];

const quantCache = new Map<string, string>();
/** Snap a colour to the nearest Isotope ramp colour (perceptually weighted RGB). */
export function toIsotope(hex: string): string {
  let q = quantCache.get(hex);
  if (q) return q;
  if (TONE_SET.has(hex)) return hex;
  const [r, g, b] = hexToRgb(hex);
  let best = 0;
  let bestD = Infinity;
  isotopeRamps();
  const set = searchSet;
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
      if (o.detail) o.detail = { ch: o.detail.ch, fg: toIsotope(o.detail.fg) };
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
const greyCache = new Map<string, string>();
export function grey(hex: string): string {
  const hit = greyCache.get(hex);
  if (hit) return hit;
  const [r, g, b] = hexToRgb(hex);
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const out = rgbToHex([y, y, y]);
  if (greyCache.size > 8192) greyCache.clear();
  greyCache.set(hex, out);
  return out;
}

// A 32x32 blue-noise threshold tile (void-and-cluster, generated offline). Unlike white
// noise it has no clumps, so dithered gradients read as an even stipple.
const BLUE_NOISE = Uint8Array.from(atob('Qsh93zGOVu3MZqp8w4ia+XjHVYZB6nEvwAC0Rrs3BesosAlPbBi4KH0DTf8/EkvTMhrxBbEhooPlVncl+n/PjOBolLvlnthEl7vXIZ/LZrCCo23blFzUSByc2qgTYUulEkryHj17CmX0MolZcecsC+w/wU8v+wm17mgxj+fEIXbLMn/OXfunwlERrvEGqIzZXh+REbh+Y4s7yghObzqz+GGtmQW2NiWD4mzORn40U7V3y/Nv3kHNFal4/rXUmAOKJt1R6G6T2xWhLY4c4L74FEegNFajJJf1K1mIFilY7ETAEnchRchadUDrxl6bayeJ4wGA0Q7nc0y51j6c332vbZ/9jK/wCqX3uAJMrRA70KRjv/4ssmDDBJId7GrBNQ7aKTxb1S+ETiqUZ4X7ynjxUB8+bZNIhznwfFytB032klKCugGbab/kEcbfMyBJlgy3hd+nGu3NI5vYMMh7piJnzfNy3EkcqHNfQHyiuWLjL27JB1W6eA2ralAW/EGK4bISRiSP7ss4/ZjUGfUF0n+s6zqa9zNi4UL0vqBl2gtZNZu8YK4OWYYTK65TbJBBJFYUZNkdiNKXKoQAOI4mwvBt1QfiOXWe203lhb803sef/cSTd0eqCFKzcMrprHRPkyh8VIjF9yesx2QK7x55XwyDSim07l3D/R3kW0ca1bcUpv8xoRdKawM9eqZJlrPzMLvjAtM0FnWLN50NhfpkO+pIybRi7IC+6JD5LdFaEEOocVqYfmmi4EfXa8KnLJgEiXMbjgbPLpkbVLEYg7rgj9QV70DC9SS5CqwjUc92473RW+bXdkaqX8w52W7nNWsgUoEsrxBVO4Jc+JDmPBVXRSakOFS39w/kdooMmUkApfm/nthlj8zmnMYxcAKE9q2VcPoToB9okUIl/sBg8sd5WjoHS/8ieQZoG03No7xmIN0IxYDtyS7dvJ9PGqkqhxfQjeVyuqND1bPvleEqRNaNNrRhPJRzUIEDY9J7Qty3TvAjsDMXXusohzpjF35dDfJShugZvQvWpvQ2su6SDW43nWKB2ZLEf1GrEMX0sJrAcKQn0Epl/EAib4wTLluk+cEEzEQP7zkCz/tykUgw0x4/3AF6qx6NsVzO5lPD3oAmVXriqld0tmaXHFjbBHlX/5W4V/I15HTED5k9q3EGPa/pG40t/Jwi6D6yK6HB6YsLai2HxZ4IMlDzKYQZ/JHWaZY+vWkRzk6K13rtQ2cntkvK6RhDYdOp3Hu22mC8TCDJCfVM2II3vgleGMiJFKneNp10rvaBFpA8ZABFpS7hhli1cqIjsepsp/gzmlP6fV8d0g5UK71Y/h+hxvZ1D5046hkw4l0BRZYl0Wq5DNA/lfFni92gbw=='), (c) => c.charCodeAt(0));

/** Blue-noise threshold in [0, 1) for a cell, tiled every 32 cells. */
export function blueNoise(x: number, y: number): number {
  return BLUE_NOISE[((y & 31) << 5) | (x & 31)] / 256;
}

/** How far the black-and-white world leans warm (dawn, golden hour) or cool (night), 0..1. */
export function toneFor(minutes: number, weather: string, indoor: boolean, mapName: string): { warm: number; cool: number } {
  if (indoor || mapName === 'mine') return { warm: 0, cool: 0 };
  const h = (((minutes / 60) % 24) + 24) % 24;
  const bump = (c: number, w: number) => Math.max(0, 1 - Math.abs(h - c) / w);
  const fair = weather !== 'Rain' && weather !== 'Typhoon' && weather !== 'Blizzard';
  const warm = fair ? Math.min(1, Math.max(bump(6.25, 1.25), bump(17.6, 1.4)) * 1.4) : 0;
  const cool = h >= 19 ? Math.min(1, (h - 19) / 1.5) : h < 5 ? 1 : h < 6 ? 6 - h : 0;
  return { warm, cool };
}

// Duotone tints for the grey world: a sepia lean toward Isotope orange and a moonlit lean
// toward Isotope blue. isotopeRamps() carries matching tinted neutral ramps.
const TONE_S = 0.28;
const toneHue = (code: string): RGB => {
  const c = hexToRgb(`#${PALETTE[code]}`);
  const m = Math.max(c[0], c[1], c[2]) || 1;
  return [c[0] / m, c[1] / m, c[2] / m];
};
const WARM_TONE = toneHue('09');
const COOL_TONE = toneHue('0D');
/** A grey of luminance `y` leaned toward hue `t`, keeping its luminance (the tint changes hue, not light). */
const tintGrey = (y: number, t: RGB): RGB => {
  const c: RGB = [1 - TONE_S + TONE_S * t[0], 1 - TONE_S + TONE_S * t[1], 1 - TONE_S + TONE_S * t[2]];
  const k = y / (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]);
  return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
};
// The neutral levels (palette black/white and the grey ramp) and their tinted twins.
const TONE_LEVELS = [0, ...Array.from({ length: 23 }, (_, i) => ((i + 1) / 24) ** 1.4 * 255), 255];
const tintHex = (level: number, t: RGB) => rgbToHex(tintGrey(level, t).map(Math.round) as RGB);
const TONE_HEXES = [...TONE_LEVELS.map((l) => tintHex(l, WARM_TONE)), ...TONE_LEVELS.map((l) => tintHex(l, COOL_TONE))];
const TONE_SET = new Set(TONE_HEXES);

/** Grey, or the tinted twin of the nearest neutral level (an exact ramp colour, so snapping keeps it). */
const toneCache = [new Map<string, string>(), new Map<string, string>()];
function toned(hex: string, t: RGB | null): string {
  if (!t) return grey(hex);
  const cache = toneCache[t === WARM_TONE ? 0 : 1];
  const hit = cache.get(hex);
  if (hit) return hit;
  const [r, g, b] = hexToRgb(hex);
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // TONE_LEVELS[i] = (i / 24) ** 1.4 * 255, so the nearest level sits next to this index
  const f = 24 * (y / 255) ** (1 / 1.4);
  const lo = Math.max(0, Math.min(24, Math.floor(f)));
  const hi = Math.min(24, lo + 1);
  const best = Math.abs(TONE_LEVELS[hi] - y) < Math.abs(TONE_LEVELS[lo] - y) ? TONE_LEVELS[hi] : TONE_LEVELS[lo];
  const out = tintHex(best, t);
  if (cache.size > 8192) cache.clear();
  cache.set(hex, out);
  return out;
}

type Tone = { warm: number; cool: number; light: Float32Array | null; tags: (CellTag | null)[][] };

/**
 * Black-and-white world with colour reserved for things of interest: everything not
 * flagged as an accent goes grey (keeping its light and shade); accents keep their hue,
 * pushed to a clear Isotope neon, over a grey background.
 */
function monochrome(out: OutCell[][], boxes: Screen['boxes'], tone?: Tone) {
  const inBox = (x: number, y: number) => boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  const W = out[0]?.length ?? 0;
  for (let y = 0; y < out.length; y++) {
    for (let x = 0; x < out[y].length; x++) {
      const o = out[y][x];
      if (o.ui || inBox(x, y)) continue;
      // Time of day leans the greys warm or cool; lamplight keeps its own warm pool at night.
      // Blue noise (anchored to the world) dithers the change in and out.
      let t: RGB | null = null;
      if (tone) {
        const lit = tone.light ? Math.min(1, tone.light[y * W + x] * 3) : 0;
        const warm = Math.max(tone.warm, lit);
        const cool = tone.cool * (1 - lit);
        if (warm > 0 || cool > 0) {
          const tg = tone.tags[y]?.[x];
          const bn = blueNoise(tg?.wx ?? x, tg?.wy ?? y);
          t = warm > bn ? WARM_TONE : cool > bn ? COOL_TONE : null;
        }
      }
      o.bg = toned(o.bg, t);
      if (o.detail) o.detail = { ch: o.detail.ch, fg: neon(o.detail.fg, 0.35) };
      if (o.token) o.token = toned(o.token, t);
      if (o.foamCol) o.foamCol = toned(o.foamCol, t);
      if (o.accent) {
        o.fg = neon(o.fg, 0.35);
        continue;
      }
      o.fg = toned(o.fg, t);
      if (o.glow) o.glow = toned(o.glow, t);
      if (o.rim) o.rim = toned(o.rim, t);
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
    fruit: '#ff4a3a', wildflowers: ['#ffe27a', '#ff6a6a', '#ffffff'],
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
/** Maps whose water is open sea: surf rolls in and nothing grows on it. */
const SEA_MAPS = new Set(['beach', 'point']);
/** The lighthouse beam: seconds per turn, cone half-width (as a slope) and reach in rows. */
const BEAM_PERIOD = 10;
const BEAM_SPREAD = 0.16;
const BEAM_R = 24;
/** Water colour by distance to the shore: lighter shallows (> 0), darker deeps (< 0). */
const WATER_DEPTH = [0, 0.18, 0.02, -0.3, -0.55];
/**
 * Late at night households go to bed one by one: whether a window is still lit. Every
 * window is lit until 10 PM; by about 1 AM only one in eight is.
 */
export function windowLit(minutes: number, wx: number, wy: number): boolean {
  const h = (((minutes / 60) % 24) + 24) % 24;
  const late = h >= 22 ? h - 22 : h < 6 ? h + 2 : 0;
  return hash(wx, wy, 230) < Math.max(0.12, 1 - late * 0.3);
}

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
  /** 0 = dry, 1 = fresh rain; used for lingering puddles. */
  wetness: number;
  /** The open sea, where nothing grows on the water. */
  sea: boolean;
  /** Which map is drawn (regions dress some tiles their own way). */
  map: string;
};

const roofShades = (fgCode: string) => {
  const base = pal(fgCode, '#c02020');
  return { lit: mix(base, '#ffffff', 0.25), mid: mix(base, '#000000', 0.35), dark: mix(base, '#000000', 0.65) };
};

/**
 * Soft mottling for open ground: low-frequency noise (rows count double, cells are tall)
 * with a little per-cell grain, stretched back to the full 0..1 range.
 */
function mottle(wx: number, wy: number, s: number): number {
  const n = valueNoise(wx / 5, wy / 2.5, s) * 0.8 + blueNoise(wx + s * 7, wy + s * 13) * 0.2;
  return Math.max(0, Math.min(1, (n - 0.5) * 1.6 + 0.5));
}

function grassBg(F: Frame, wx: number, wy: number) {
  return mix(F.theme.grassBg, F.theme.grassBg2, mottle(wx, wy, 3));
}

/** Background a cell's ground would have, used under entities, roof edges and generic objects. */
function groundBg(F: Frame, tag: CellTag): string {
  const wx = tag.wx ?? 0;
  const wy = tag.wy ?? 0;
  switch (tag.t) {
    case 'field':
      return mix(F.theme.soilBg, '#000000', mottle(wx, wy, 5) * 0.35);
    case 'path':
      return mix('#2a2622', '#34302a', hash(wx, wy, 6));
    case 'sand':
      return mix('#3a3020', '#443826', hash(wx, wy, 6));
    case 'floor':
      return wy % 2 ? '#3a2a1a' : '#36271a';
    case 'mfloor':
      return mix('#1e1a17', '#24201c', hash(wx, wy, 6));
    default:
      if (WATERY.has(tag.t)) return mix(F.theme.waterBg, F.theme.waterBg2, mottle(wx, wy, 7));
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
  if (hash(tag.wx ?? x, tag.wy ?? y, 68) > 0.07) return false;
  const below = F.tags[y + 1]?.[x];
  return !!below && below.t === 'mfloor';
}

/** Fixtures worth noticing: they keep their colour in the monochrome look. */
const INTEREST = new Set(['bin', 'sign', 'doghouse', 'stable', 'mill', 'maker', 'incub', 'phone', 'vase', 'cave', 'bath']);

const isRainy = (F: Frame) => !F.indoor && (F.weather === 'Rain' || F.weather === 'Typhoon');
const isWet = (F: Frame) => isRainy(F) || (!F.indoor && F.wetness > 0.06);

function puddle(F: Frame, wx: number, wy: number, ground: string, strength = 1): OutCell {
  const bg = mix(ground, '#1a3456', 0.25 + 0.45 * Math.min(1, strength));
  const ripple = hash(wx * 2, wy, 71 + (Math.floor(F.t * 2) % 50)) < 0.3 * Math.min(1, strength);
  return { ch: ripple ? '◦' : ' ', fg: '#8ab8e8', bg, bold: false };
}

/**
 * Skyline Ridge's cliff bands as rock faces lit from above: a bright brow along the top,
 * bedded strata across a face that darkens downward, and a base that dithers into shadow.
 * In winter snow caps the brow and lies on some of the ledges.
 */
function rockFace(F: Frame, x: number, y: number, wx: number, wy: number): OutCell {
  const cliff = (dy: number) => F.tags[y + dy]?.[x]?.t === 'cliff';
  let up = 0;
  while (up < 6 && cliff(-up - 1)) up++;
  let down = 0;
  while (down < 6 && cliff(down + 1)) down++;
  const snow = !!F.theme.snow;
  const depth = up + down ? up / (up + down) : 1; // 0 at the brow, 1 at the base
  const face = mix('#5e5548', '#26211c', depth);
  if (!up) {
    const cap = snow && hash(wx * 2, wy, 160) < 0.85;
    const weathered = valueNoise(wx / 4, wy, 164) * 0.45; // the lit brow is not one even line
    const rock = mix('#aca08a', '#6a6052', weathered);
    // winter: a thin line of snow lying on the lit rock, not a solid white band
    if (cap) return { ch: '▔', fg: '#eef2f8', bg: mix(rock, '#26211c', 0.25), bold: false };
    return { ch: '▀', fg: rock, bg: down ? face : '#26211c', bold: false };
  }
  // bedding planes run along the band, each stretch with its own kind of layer
  const bed = valueNoise(wx / 6, wy, 161);
  let ch = bed < 0.36 ? '─' : bed < 0.7 ? '═' : '≡';
  let fg = mix(face, '#b0a48e', 0.6 - depth * 0.25);
  if (!down) {
    // the foot of the face falls away into shadow through a blue-noise dither
    const bn = blueNoise(wx, wy);
    if (bn < 0.14) ch = '░';
    else if (bn < 0.27) ch = '▒';
  }
  if (hash(wx, wy, 162) < 0.06) {
    ch = '│'; // a joint in the rock
    fg = mix(face, '#000000', 0.5);
  } else if (snow && hash(wx * 2, wy, 163) < 0.3) fg = '#e8eef8'; // snow on a ledge
  return { ch, fg, bg: face, bold: false };
}

/**
 * The current at a Willow Bend river cell. The river runs south; `lane` is the offset from
 * mid-channel, `u` the same as a share of the half-width (-1..1), `dc` how many columns the
 * channel shifts per row downstream, and `speed` rows per second: quickest mid-channel and
 * where the channel narrows, slowest along the banks.
 */
function riverFlow(F: Frame, x: number, y: number) {
  const span = (yy: number, xx: number): [number, number] | null => {
    const row = F.tags[yy];
    if (!row) return null;
    for (const d of [0, -1, 1, -2, 2, -3, 3]) {
      if (row[xx + d]?.t !== 'water') continue;
      let a = xx + d;
      let b = a;
      while (row[a - 1]?.t === 'water' && b - a < 16) a--;
      while (row[b + 1]?.t === 'water' && b - a < 16) b++;
      return [a, b];
    }
    return null;
  };
  const [a, b] = span(y, x) ?? [x, x];
  const c = (a + b) / 2;
  const w = b - a + 1;
  const up = span(y - 1, Math.round(c));
  const dn = span(y + 1, Math.round(c));
  const cu = up ? (up[0] + up[1]) / 2 : c;
  const cd = dn ? (dn[0] + dn[1]) / 2 : c;
  const dc = up && dn ? (cd - cu) / 2 : cd - cu;
  const u = w > 1 ? (x - c) / (w / 2) : 0;
  const speed = 2 * (1 - 0.8 * u * u) * Math.max(0.7, Math.min(1.4, 5 / w));
  return { lane: x - c, u, dc, speed };
}

/** Style one tagged map cell (terrain, objects, crops, structures). */
export function styleTile(F: Frame, x: number, y: number, tag: CellTag, cell: Cell): OutCell {
  const th = F.theme;
  const wx = tag.wx ?? x;
  const wy = tag.wy ?? y;
  const g = cell[0];
  const fg = cell[1];
  const bold = cell[3];
  const hs = hash(wx, wy);
  const k = tag.k || '';

  // ---- objects on the field
  if (k.startsWith('obj:')) {
    const soil = groundBg(F, tag);
    switch (k) {
      case 'obj:weed':
        return { ch: 'ψ', fg: mix(th.weed, '#000000', hash(wx, wy, 8) * 0.35), bg: soil, bold: false };
      case 'obj:stone':
        return { ch: '•', fg: '#a9a9b4', bg: soil, bold: true };
      case 'obj:rock':
        return { ch: '•', fg: '#78787f', bg: soil, bold: true };
      case 'obj:boulder':
        return { ch: '●', fg: '#8c8c98', bg: mix(soil, '#3a342e', 0.6), bold: false };
      case 'obj:stump':
        return { ch: '◉', fg: '#b8702e', bg: soil, bold: false };
      case 'obj:branch':
        return { ch: '╱', fg: '#c58a4a', bg: soil, bold: true };
    }
  }
  if (k === 'forage') {
    return { ch: g, fg: pal(fg), bg: groundBg(F, tag), bold: true, glow: pal(fg), glowR: 3, accent: true };
  }
  // ---- tilled soil and crops
  if (k.startsWith('soil') || k.startsWith('crop:')) {
    const wet = k.endsWith(':wet');
    const bg = wet ? mix('#160e08', '#1a1209', hash(wx, wy, 5)) : mix('#2c1c0f', '#321f10', hash(wx, wy, 5));
    if (k.startsWith('soil')) {
      if (wet && hash(wx * 2, wy, 64) < 0.12) return { ch: '·', fg: '#4a8ad8', bg, bold: true }; // a glint of water
      return { ch: wy % 2 ? '≡' : '═', fg: wet ? '#4a3424' : '#7a5230', bg, bold: false };
    }
    if (k.startsWith('crop:seed')) return { ch: '∴', fg: '#c89058', bg, bold: false };
    if (k.startsWith('crop:sprout')) return { ch: ',', fg: '#7ad04a', bg, bold: true };
    if (k.startsWith('crop:young')) return { ch: '"', fg: '#5ae02a', bg, bold: true };
    // ripe: the crop's own glyph and colour, with a gentle "ready" glow
    return { ch: g, fg: pal(fg), bg, bold: true, glow: pal(fg), glowR: 6, accent: true };
  }

  switch (tag.t) {
    case 'void':
      return { ch: ' ', fg: '#000000', bg: '#000000', bold: false };
    case 'grass': {
      const gb = grassBg(F, wx, wy);
      const above = F.tags[y - 1]?.[x];
      if (above && above.t === 'tree' && hash(wx, wy, 72) < 0.6) {
        return { ch: '╿', fg: th.snow ? '#6a5a4a' : '#6a4a2c', bg: gb, bold: false }; // trunk under the canopy
      }
      if (th.snow) {
        if (hs < 0.18) return { ch: hs < 0.08 ? '∙' : '·', fg: th.grassDetail, bg: gb, bold: false };
        return { ch: ' ', fg: th.grassDetail, bg: gb, bold: false };
      }
      // the engine's own tufts (',' and '"') stay, centred in their tile
      if (g === ',' || g === '"') {
        // tufts sway in a slow breeze
        const sway = Math.floor(F.t * 0.8 + hash(wx, wy, 66) * 4) % 4 === 0;
        return { ch: g === '"' ? (sway ? '"' : 'ʷ') : sway ? '`' : ',', fg: th.tuft, bg: gb, bold: false };
      }
      const nearTree = th.leaves && [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1]].some(([dx, dy]) => F.tags[y + dy]?.[x + dx]?.t === 'tree');
      if (nearTree && hs < 0.32) return { ch: pick(['•', '❦', ','], hash(wx, wy, 9)), fg: pick(th.leaves!, hash(wx, wy, 4)), bg: gb, bold: false, accent: true }; // leaf litter
      if (th.leaves && hs < 0.07) return { ch: pick(['•', '❦', ','], hash(wx, wy, 9)), fg: pick(th.leaves, hash(wx, wy, 4)), bg: gb, bold: false };
      if (th.wildflowers && hs > 0.975) return { ch: '·', fg: pick(th.wildflowers, hash(wx, wy, 31)), bg: gb, bold: true };
      if (th.fruit && hs > 0.93) return { ch: 'ʷ', fg: th.tuft, bg: gb, bold: false }; // tall summer grass
      const dewy = !th.snow && !F.indoor && F.weather === 'Sunny' && F.minutes >= 360 && F.minutes < 480;
      if (dewy && hs < 0.03 && hash(wx * 2, wy, 140 + (Math.floor(F.t * 2) % 20)) > 0.45) {
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
      return { ch: pick(['✿', '❀'], hash(wx, wy, 2)), fg: pal(fg), bg: gb, bold: true, accent: true };
    }
    case 'tree': {
      const windy = !F.indoor && (F.weather === 'Typhoon' || F.weather === 'Blizzard');
      const sway = windy ? hash(wx * 2, wy, 90 + (Math.floor(F.t * 3) % 2)) < 0.5 : false;
      const ch = (hs < 0.72) !== sway ? th.treeGlyphs[0] : th.treeGlyphs[1];
      const bg = mix(th.treeBg, '#000000', hash(wx, wy, 2) * 0.5);
      let fgc = pick(th.trees, hash(wx * 2, wy, 1));
      // canopies are lit from above: bright crown, shaded underside
      const up = F.tags[y - 1]?.[x];
      const dn = F.tags[y + 1]?.[x];
      if (!up || up.t !== 'tree') fgc = mix(fgc, '#ffffff', 0.2);
      else if (!dn || dn.t !== 'tree') fgc = mix(fgc, '#000000', 0.32);
      // seasonal accents: spring blossom, summer fruit, winter snow on the tips
      const acc = hash(wx * 2, wy, 41);
      // two-tone canopies: the tree stays grey, the blossom or fruit is a small colour detail
      if (th.blossom && acc < 0.12) return { ch, fg: fgc, bg, bold: true, detail: { ch: '✿', fg: pick(th.blossom, hash(wx, wy, 42)) } };
      if (th.fruit && acc < 0.07) return { ch, fg: fgc, bg, bold: true, detail: { ch: '●', fg: th.fruit } };
      if (th.leaves && acc < 0.18) return { ch, fg: fgc, bg, bold: true, accent: true }; // a few turning leaves
      if (th.snow && acc < 0.3) fgc = '#eef4fc';
      // summer canopies are fuller: an extra leafy glyph now and then
      const leafy = th.fruit && acc > 0.9 ? '♠' : ch;
      return { ch: leafy, fg: fgc, bg, bold: true };
    }
    case 'field': {
      const soil = groundBg(F, tag);
      if (isWet(F) && hash(wx, wy, 70) < 0.06 * Math.max(0.25, F.wetness)) return puddle(F, wx, wy, soil, F.wetness || 1);
      if (th.snow) return { ch: hs < 0.35 ? '·' : ' ', fg: th.soilDot, bg: soil, bold: false };
      return { ch: hs < 0.45 ? '·' : ' ', fg: th.soilDot, bg: soil, bold: false };
    }
    case 'path': {
      const pb = groundBg(F, tag);
      if (th.snow && hs < 0.1) return { ch: '▁', fg: '#eef4fc', bg: pb, bold: false };
      if (isWet(F) && hash(wx, wy, 70) < 0.16 * Math.max(0.3, F.wetness)) return puddle(F, wx, wy, pb, F.wetness || 1);
      return { ch: hs < 0.25 ? '▪' : hs < 0.55 ? '·' : ' ', fg: th.snow ? '#7a8494' : '#5a534b', bg: pb, bold: false };
    }
    case 'sand':
      return { ch: hs < 0.4 ? '·' : hs < 0.5 ? '∙' : ' ', fg: '#a08a5a', bg: groundBg(F, tag), bold: false };
    case 'bridge':
      return { ch: '═', fg: '#c08a4a', bg: '#3a2614', bold: false };
    case 'ice':
      return { ch: hs < 0.3 ? '╱' : ' ', fg: '#d8f0ff', bg: mix('#5a8aa8', '#6a9ab8', hash(wx, wy, 7)), bold: false };
    case 'cliff': {
      if (F.map === 'ridge') return rockFace(F, x, y, wx, wy);
      const rock = th.snow ? '#c8d0dc' : '#8a8070';
      const above = F.tags[y - 1]?.[x];
      const exposed = !above || above.t !== 'cliff';
      return { ch: exposed ? '▔' : hs < 0.25 ? '▴' : '▲', fg: rock, bg: '#24201c', bold: false };
    }
    case 'cave':
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
      const snowCap = th.snow && hash(wx * 2, wy, 12) < 0.5;
      return { ch: wy % 2 ? '▒' : '░', fg: snowCap ? '#e8eef8' : rc.lit, bg: rc.mid, bold: false };
    }
    case 'wall': {
      if (tag.k === 'deco' && tag.dch === '=') {
        return { ch: '▦', fg: '#7fe8ff', bg: '#3a2818', bold: true, glow: '#5fd8ff', glowR: 5, accent: true };
      }
      if (tag.k === 'deco' && tag.dch !== undefined) {
        return { ch: tag.dch, fg: '#fff2d0', bg: '#6a4424', bold: true, plain: true }; // sign lettering
      }
      const below = y + 1 < F.tags.length ? F.tags[y + 1][x] : null;
      const base = !below || (below.t !== 'wall' && below.t !== 'door');
      const walled = (n: CellTag | null | undefined) => !!n && (n.t === 'wall' || n.t === 'door');
      const above = y > 0 ? F.tags[y - 1][x] : null;
      let o: OutCell = base
        ? { ch: '▀', fg: '#6a4a2c', bg: '#2a1c10', bold: false }
        : { ch: '═', fg: '#7c5634', bg: '#4a321e', bold: false };
      // corner posts frame each building; the row under the eaves sits in shadow
      if (!base && !walled(F.tags[y][x - 1])) o = { ...o, ch: '║', fg: '#2a1a0e' };
      else if (!base && !walled(F.tags[y][x + 1])) o = { ...o, ch: '║', fg: '#2a1a0e' };
      if (above && above.t === 'roof') {
        o = { ...o, bg: mix(o.bg, '#000000', 0.38), fg: mix(o.fg, '#000000', 0.3) };
        if (th.snow && hash(wx * 2, wy, 74) < 0.55) o = { ...o, ch: '╷', fg: '#e8f0ff' }; // icicles on the eaves
      }
      return o;
    }
    case 'door': {
      // the door swings open while the player stands at it, showing the warm room inside
      const open = [[0, 1], [0, -1], [-1, 0], [1, 0]].some(([dx, dy]) => F.tags[y + dy]?.[x + dx]?.ent === 'player');
      if (open) return { ch: '▯', fg: '#ffb050', bg: '#1a0e06', bold: true, glow: '#ffb050', glowR: 6, accent: true };
      return { ch: '▮', fg: '#d08a3a', bg: '#3a2818', bold: true, accent: true };
    }
    case 'iwall':
      return { ch: '▒', fg: '#6a5844', bg: '#4a3c2e', bold: false };
    case 'mwall':
      if (isTorch(F, x, y, tag)) return { ch: '†', fg: '#ff9900', bg: '#2e2924', bold: true, glow: '#ff9900', glowR: 9, accent: true };
      return { ch: hs < 0.5 ? '▓' : '▒', fg: '#4a423a', bg: '#2e2924', bold: false };
    case 'floor': {
      const nearTable = [[-2, 0], [2, 0], [0, -1], [0, 1], [-2, 1], [2, 1], [-2, -1], [2, -1]].some(([dx, dy]) => F.tags[y + dy]?.[x + dx]?.t === 'table');
      if (nearTable) return { ch: '░', fg: mix('#ff0099', '#000000', 0.45), bg: mix(groundBg(F, tag), '#ff0099', 0.1), bold: false }; // rug
      return { ch: wy % 2 ? '─' : ' ', fg: '#4a3622', bg: groundBg(F, tag), bold: false };
    }
    case 'mfloor':
      if (hash(wx * 2, wy, 67) < 0.012) return { ch: '✦', fg: '#00ffff', bg: groundBg(F, tag), bold: false, glow: '#00ffff', glowR: 4, accent: true }; // ore glint
      return { ch: hs < 0.3 ? '·' : ' ', fg: '#4a4038', bg: groundBg(F, tag), bold: false };
    case 'fireplace':
      return { ch: g, fg: '#ff7a30', bg: '#3a1a0a', bold: true, glow: '#ff7a30', glowR: 8, accent: true };
    // ---- furniture
    case 'bed': {
      const left = F.tags[y][x - 1];
      const head = !left || left.t !== 'bed';
      if (head) return { ch: '▀', fg: '#f2efe8', bg: '#3a4f9a', bold: false };
      return { ch: hs < 0.5 ? '░' : '▒', fg: '#6a82d0', bg: '#3a4f9a', bold: false };
    }
    case 'tv':
      return { ch: '▓', fg: '#6ae0ff', bg: '#141418', bold: false, glow: '#4ac8ff', glowR: 6, accent: true };
    case 'cal':
      return { ch: '▤', fg: '#f4ead8', bg: '#3a2818', bold: false };
    case 'table':
      return { ch: '▀', fg: '#b07840', bg: groundBg(F, { ...tag, t: 'floor' }), bold: false };
    case 'counter':
      return { ch: '▀', fg: '#d0a070', bg: '#5a3a20', bold: false };
    case 'kitchen':
      return { ch: '◉', fg: '#ff7040', bg: '#2a2a2e', bold: true, glow: '#ff5020', glowR: 5, accent: true };
    case 'shelf':
      return { ch: '▤', fg: '#b07a48', bg: '#3a2414', bold: false };
    case 'bookcase':
      return { ch: hs < 0.5 ? '▌' : '▐', fg: pick(['#c04848', '#4868c8', '#48a868', '#c8a848', '#9858c0'], hash(wx * 2, wy, 60)), bg: '#2a1a0e', bold: false };
    case 'bath':
      return { ch: hs < 0.5 ? '≈' : '∼', fg: '#3a90d8', bg: '#d8e6ee', bold: false };
    case 'up':
    case 'down':
    case 'exit':
      return { ch: g, fg: pal(fg), bg: groundBg(F, tag), bold: true, glow: pal(fg), glowR: 5, accent: true };
    case 'pond':
    case 'spring':
    case 'fountain':
    case 'water': {
      if (tag.k === 'deco' && tag.dch) return { ch: tag.dch, fg: '#7fe8ff', bg: groundBg(F, tag), bold: true, accent: true }; // fountain statue
      const tint = tag.t === 'pond' ? '#0a3a2a' : tag.t === 'spring' ? '#0a3a4a' : tag.t === 'fountain' ? '#0a3a6a' : '';
      const fgc = tag.t === 'spring' ? '#9ae8ff' : tag.t === 'fountain' ? '#7fe8ff' : tag.t === 'pond' ? '#5ae0a0' : th.waterFg;
      const T = Math.floor(F.t * 3) / 3; // water moves in small steps so a calm scene doesn't repaint every tick
      // depth: distance to the nearest shore, where a row counts about double (cells are tall)
      let depth = WATER_DEPTH.length - 1;
      for (let dy = -2; dy <= 2 && depth > 1; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const n = F.tags[y + dy]?.[x + dx];
          if (n && n.t !== 'ui' && !WATERY.has(n.t) && n.t !== 'bridge') depth = Math.min(depth, Math.max(Math.abs(dx), dy ? Math.abs(dy) * 2 - 1 : 0));
        }
      }
      let bg = groundBg(F, tag);
      if (tint) bg = mix(bg, tint, 0.6);
      const dk = WATER_DEPTH[depth];
      bg = dk > 0 ? mix(bg, '#3a6ab0', dk) : mix(bg, '#000000', -dk);
      // Willow Bend's river runs south, so its surface moves with the current
      const flow = F.map === 'river' && tag.t === 'water' ? riverFlow(F, x, y) : null;
      // the surface colour wanders a little around its depth colour, never drifting away from it
      const shimmer = (flow ? valueNoise(wx / 6, (wy - T * 1.2) / 3, 22) : valueNoise(wx / 6 + T * 0.25, wy / 3 - T * 0.1, 22)) - 0.5;
      bg = shimmer > 0 ? mix(bg, '#5a8ad0', shimmer * 0.18) : mix(bg, '#000000', -shimmer * 0.18);
      if (g === '-') return { ch: '∼', fg: '#a8d0ff', bg, bold: false };
      const glint = hash(wx * 2, wy, 80 + (Math.floor(T * 3) % 97));
      if (!F.indoor && F.weather === 'Sunny' && F.amb > 0.85 && glint < 0.014) return { ch: '✦', fg: '#ffffff', bg, bold: true, glow: '#cfe8ff', glowR: 5 };
      // Lighthouse Point's tide pools catch the sun now and then
      if (F.map === 'point' && tag.t === 'pond' && F.weather === 'Sunny' && F.amb > 0.6 && hash(wx, wy, 170 + (Math.floor(F.t * 1.5) % 53)) < 0.14) {
        return { ch: '✦', fg: '#ffffff', bg, bold: true, glow: '#cfe8ff', glowR: 5 };
      }
      if (!F.indoor && F.weather === 'Sunny' && F.amb < 0.5 && hash(wx * 2, wy, 85 + (Math.floor(T * 1.5) % 61)) < 0.012) return { ch: '·', fg: '#e8eeff', bg, bold: true };
      if (tag.t === 'spring' && hash(wx * 2, wy, 20 + (Math.floor(T * 1.2) % 64)) < 0.12) return { ch: '°', fg: '#e8f8ff', bg, bold: false };
      if (flow) {
        // each lane of the current carries its ripples downstream at its own speed, a whole
        // row at a time; thin streaks in the fast middle trace the line of the channel
        const s = wy - Math.floor(F.t * flow.speed);
        const r = valueNoise(flow.lane * 1.7, s / 1.6, 26);
        if (Math.abs(flow.u) < 0.5 && valueNoise(flow.lane * 1.7 + 9.3, s / 2.6, 27) > 0.74) {
          return { ch: flow.dc > 0.5 ? '╲' : flow.dc < -0.5 ? '╱' : '╎', fg: mix(fgc, '#ffffff', 0.2), bg, bold: false };
        }
        if (F.weather === 'Typhoon' && depth >= 3 && r > 0.66) return { ch: '≋', fg: '#eef2ff', bg, bold: true };
        return { ch: r > 0.64 ? '≈' : r > 0.54 ? '∼' : ' ', fg: depth <= 1 ? mix(fgc, '#ffffff', 0.25) : fgc, bg, bold: false };
      }
      if (F.sea && tag.t === 'water') {
        // breakers: lines of surf roll in toward the beach, a row at a time
        let rows = 6;
        for (let d = 1; d < rows; d++) {
          const up = F.tags[y - d]?.[x];
          const dn = F.tags[y + d]?.[x];
          if ((up && up.t !== 'ui' && !WATERY.has(up.t)) || (dn && dn.t !== 'ui' && !WATERY.has(dn.t))) rows = d;
        }
        const ph = (T * 0.4 + rows * 0.3 + valueNoise(wx / 7, 0, 24) * 0.3) % 1;
        if (rows <= 4 && ph < 0.12) return { ch: '≈', fg: '#e8f0ff', bg: mix(bg, '#5a8ad0', 0.2), bold: true };
      }
      // ripples run in short streaks that drift across the surface together; wind speeds them up
      const wind = F.indoor ? 1 : F.weather === 'Typhoon' ? 2.4 : F.weather === 'Rain' || F.weather === 'Blizzard' ? 1.5 : 1;
      const r = valueNoise(wx / 3 - T * 0.5 * wind, wy * 0.9, 21) * 0.8 + hash(wx, wy, 23) * 0.2;
      if (wind > 2 && depth >= 3 && r > 0.66) return { ch: '≋', fg: '#eef2ff', bg, bold: true }; // whitecaps in a storm
      const ch = r > 0.64 ? '≈' : r > 0.54 ? '∼' : ' ';
      return { ch, fg: depth <= 1 ? mix(fgc, '#ffffff', 0.25) : fgc, bg, bold: false };
    }
  }
  // Generic: furniture, signs, bins, doghouse... keep the readable glyph on a grounded background.
  return { ch: g, fg: pal(fg), bg: F.indoor || cell[2] === '01' ? '#3a2818' : groundBg(F, tag), bold, accent: INTEREST.has(tag.t) };
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

/** Effect colour by tool tier (Cogmind's rule: colour shows strength). Basic to Blessed. */
// Each tier must stay distinct after the Isotope neon snap: dim grey, dim orange, bright white,
// bright orange, cyan, purple, pink. Copper and gold share a hue, so they differ in brightness.
export const TIER_COLOURS = ['#8a8a8a', '#a85a10', '#f4f4f4', '#ffb347', '#33ffcc', '#cc00ff', '#ff4db8'];
const SWING: Record<string, string> = { '1,0': '╲', '-1,0': '╱', '0,-1': '╱', '0,1': '╲' };
const DEBRIS: Record<string, string[]> = { stone: ['•', '·', '∙', ','], wood: ['╱', '`', '·', ','], plant: ['ʷ', ',', '`', '·'] };
const DEBRIS_COL: Record<string, string> = { stone: '#b8b8c0', wood: '#c58a4a', plant: '#7ad04a' };

function drawFx(
  out: OutCell[][],
  fx: NonNullable<RenderCtx['fx']>,
  v: { x: number; y: number; w: number; h: number },
  W: number,
  H: number,
  motion = true
) {
  const glyph: Record<string, string> = { dust: '·', sparkle: '*', splash: '≈', coin: '$' };
  const colour: Record<string, string> = { dust: '#d8c8a8', sparkle: '#fff0a0', splash: '#9cc8ff', coin: '#ffd45a' };
  const inView = (x: number, y: number) => x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h && x < W && y < H;
  // flashes go down first, so the tier-coloured slash and the reward still show over them
  const ordered = [...fx.filter((f) => f.kind === 'flash'), ...fx.filter((f) => f.kind !== 'flash')];
  for (const f of ordered) {
    const delay = f.delay ?? 0;
    const p = (f.age - delay) / Math.max(0.01, f.life - delay);
    if (p >= 1 || (p < 0 && f.kind !== 'flash')) continue;
    if (f.kind === 'flash') {
      // the struck thing blinks white; it holds through the hit-pause before any debris flies
      if (!inView(f.x, f.y)) continue;
      const o = out[f.y][f.x];
      o.fg = '#ffffff';
      o.bg = mix(o.bg, '#ffffff', 0.35);
      o.bold = true;
      o.accent = true;
      continue;
    }
    if (f.kind === 'swing') {
      if (!inView(f.x, f.y)) continue;
      const col = TIER_COLOURS[Math.max(0, Math.min(6, f.tier ?? 0))];
      const o = out[f.y][f.x];
      out[f.y][f.x] = { ...o, ch: SWING[`${f.dir?.[0] ?? 0},${f.dir?.[1] ?? 1}`] ?? '╲', fg: mix(col, '#000000', p * 0.5), bold: true, glow: col, glowR: 4, accent: true, plain: true }; // fades on its own, whatever is under it
      continue;
    }
    if (f.kind === 'debris') {
      if (!motion) continue;
      // a short burst that arcs out and falls back under gravity
      const pool = DEBRIS[f.stuff ?? 'stone'];
      const col = DEBRIS_COL[f.stuff ?? 'stone'];
      const n = f.stuff === 'plant' ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const a = hash(i, f.seed ?? 0, 91) * Math.PI * 2;
        const sp = 0.8 + hash(i, f.seed ?? 0, 92) * 1.4;
        const r = 0.7 + sp * 2 * p; // bits start just outside the struck cell, so the burst reads at once
        const x = Math.round(f.x + Math.cos(a) * r);
        const y = Math.round(f.y + Math.sin(a) * r * 0.6 - 0.8 * p + 2.2 * p * p);
        if (!inView(x, y) || out[y][x].token || (x === f.x && y === f.y)) continue; // the struck cell keeps its slash
        const o = out[y][x];
        out[y][x] = { ...o, ch: pool[i % pool.length], fg: mix(o.bg, col, 0.95 - p * 0.6), bold: true, glow: undefined, accent: true, plain: true };
      }
      continue;
    }
    if (f.kind === 'text') {
      // the reward floats up off the spot and fades
      const txt = f.text ?? '';
      const y = f.y - 1 - (motion ? Math.floor(p * 1.6) : 0);
      const x0 = f.x - Math.floor(txt.length / 2);
      for (let i = 0; i < txt.length; i++) {
        const x = x0 + i;
        if (!inView(x, y)) continue;
        const o = out[y][x];
        out[y][x] = { ...o, ch: txt[i], fg: mix(o.bg, '#ffe27a', p < 0.6 ? 1 : 1 - (p - 0.6) * 2), bold: true, glow: undefined, accent: true, plain: true };
      }
      continue;
    }
    const jitter = hash(f.x, f.y, 88);
    const x = f.x + (f.kind === 'dust' ? (jitter < 0.5 ? -1 : 1) : 0);
    const y = f.y - (p > 0.45 ? 1 : 0);
    if (!inView(x, y)) continue;
    const o = out[y][x];
    o.ch = glyph[f.kind] || '·';
    o.fg = mix(o.bg, colour[f.kind] || '#ffffff', 0.55 + (1 - p) * 0.4);
    o.bold = true;
    o.glow = colour[f.kind] || '#ffffff';
    o.glowR = 5;
    o.accent = true;
  }
}

/**
 * Screen-shake offset in CSS pixels for a heavy hit: a few pixels that die away within a
 * quarter second (1-2 px for a crack, up to 4 for a break). None with reduced motion.
 */
export function shakeOffset(shake: RenderCtx['shake'], reducedMotion = false): [number, number] {
  if (!shake || reducedMotion) return [0, 0];
  const life = shake.strength > 1 ? 0.25 : 0.12;
  if (shake.age >= life) return [0, 0];
  // a quick back-and-forth that holds most of its size until the end, then settles
  const amp = (shake.strength > 1 ? 4 : 2) * (1 - shake.age / life) ** 0.6;
  const k = Math.floor(shake.age * 60);
  return [Math.round(amp * (k % 2 ? 1 : -1)), Math.round(amp * 0.5 * ((k >> 1) % 2 ? 1 : -1))];
}

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
  // with reduced motion every tile animation (sway, ripples, twinkles) holds its first frame
  const F: Frame = { buf, tags, theme: THEMES[season], t: motion ? t : 0, indoor: !!ctx?.indoor, weather: ctx?.weather ?? 'Sunny', amb: skyNow?.amb ?? 1, minutes: ctx?.minutes ?? 720, wetness: ctx?.wetness ?? 0, sea: SEA_MAPS.has(ctx?.mapName ?? ''), map: ctx?.mapName ?? '' };
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
      else if (tag) o.seed = hash((tag.wx ?? x) * 2, tag.wy ?? y, 200);
      row[x] = o;
    }
    out[y] = row;
  }

  // ---- colourblind-safe state cues: shape as well as colour
  if (ctx?.cues) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tag = tags[y][x];
        const o = out[y][x];
        if (!tag || tag.t === 'ui') continue;
        if ((tag.k || '').startsWith('crop:ripe')) {
          o.ch = '!';
          o.plain = true;
          o.seed = undefined;
        } else if (tag.k === 'soil:wet') {
          o.ch = '≈';
          o.plain = true;
          o.seed = undefined;
        }
      }
    }
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
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) out[y][x].ui = boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); // prompts stay plain text
      }
      titleScene(out, buf, tags, boxes, t, W, H);
      monochrome(out, boxes);
    }
    decorateBoxes(out, boxes, W, H, t);
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
    if (boxes.some((b) => ic.x >= b.x && ic.x < b.x + b.w && ic.y >= b.y && ic.y < b.y + b.h)) continue; // under a dialog
    const clearNight = ctx.weather === 'Sunny' && sky.amb < 0.5 && !ctx.indoor;
    const [ch, col] =
      ic.icon === 'weather' ? (clearNight ? ['☾', '#d8e0ff'] : WEATHER_ICON[ctx.weather] || ['☀', '#ffcc33']) : ICONS[ic.icon];
    out[ic.y][ic.x] = { ...out[ic.y][ic.x], ch, fg: col, bold: true };
  }

  // ---- contact shadows: buildings and trees throw away from the sun.
  // Morning sun casts west (left), afternoon sun casts east (right).
  const sunHour = (((ctx.minutes / 60) % 24) + 24) % 24;
  const longShadow = sunHour < 8 || sunHour > 17;
  const sunWest = sunHour >= 12;
  const sunny = sky.amb > 0.85 && ctx.weather === 'Sunny';
  const woods = ctx.mapName === 'woods';
  const shaftT = motion ? Math.floor(t * 2) / 2 : 0;
  for (let y = v.y; y < v.y + v.h && y < H; y++) {
    for (let x = v.x; x < v.x + v.w && x < W; x++) {
      const tag = tags[y][x];
      if (!tag || tag.t === 'ui' || !SHADOW_RECEIVERS.has(tag.t) || (tag.k || '').startsWith('obj:boulder')) continue;
      const wx = tag.wx ?? x;
      const wy = tag.wy ?? y;
      const up = y > 0 ? tags[y - 1][x] : null;
      const up2 = longShadow && y > 1 ? tags[y - 2][x] : null;
      const side1 = tags[y]?.[x + (sunWest ? -1 : 1)];
      const side2 = longShadow ? tags[y]?.[x + (sunWest ? -2 : 2)] : null;
      let k = 0;
      if (up && up.t !== 'ui' && SHADOW_CASTERS.has(up.t)) k = up.t === 'tree' ? 0.22 : 0.34;
      else if (up2 && up2.t !== 'ui' && SHADOW_CASTERS.has(up2.t)) k = up2.t === 'tree' ? 0.1 : 0.16;
      else if (side1 && side1.t !== 'ui' && (side1.t === 'wall' || side1.t === 'door' || side1.t === 'tree')) {
        k = side1.t === 'tree' ? 0.12 : 0.16;
      } else if (side2 && side2.t !== 'ui' && (side2.t === 'wall' || side2.t === 'door' || side2.t === 'tree')) {
        k = side2.t === 'tree' ? 0.07 : 0.09;
      }
      // Cedar Hollow: ground hemmed in by trees lies in the canopy's gloom, except where a
      // slanting shaft of sun breaks through on a fine day
      let gloom = 0;
      let shaft = 0;
      if (woods) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const row = tags[y + dy];
          if (row) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && row[x + dx]?.t === 'tree') n++;
        }
        // blue noise dithers the gloom so it deepens evenly between the dark ramp steps
        const g0 = Math.min(1, Math.max(0, (n - 2) / 7));
        gloom = g0 ? Math.max(0, g0 * 0.55 + (blueNoise(wx, wy) - 0.5) * 0.18) : 0;
        if (gloom && sunny) {
          const beam = valueNoise((wx + (sunWest ? -1.6 : 1.6) * wy) / 3.2, wy / 9 + shaftT * 0.03, 155);
          shaft = Math.min(1, Math.max(0, (beam - 0.68) / 0.1));
        }
      }
      const kb = 1 - (1 - k) * (1 - gloom * (1 - shaft));
      if (kb || shaft) {
        const o = out[y][x];
        o.bg = mix(o.bg, '#000000', kb);
        // the gloom only darkens the ground under people and things, so they stay readable
        o.fg = mix(o.fg, '#000000', (tag.ent || tag.k ? k : kb) * 0.6);
        if (shaft) o.bg = mix(o.bg, '#fff4d8', shaft * 0.1);
        // sunlight dapples through the leaves onto the shaded ground
        if (o.ch === ' ' && sunny && ((up?.t === 'tree' && hash(wx * 2, wy, 150) < 0.5) || (shaft > 0.4 && hash(wx * 2, wy, 151) < 0.4))) {
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
        const n = valueNoise((tag.wx ?? x) / 9 + tc * 0.06, (tag.wy ?? y) / 5 + tc * 0.02, 51);
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

  // ---- chimney smoke, butterflies, falling leaves, wildlife, water life
  if (outdoor && motion) {
    chimneys(out, tags, v, t, W, H, ctx.weather);
    critters(out, tags, v, t, W, H, season, ctx.weather, sky.amb);
    wildlife(out, tags, v, t, season, ctx.weather, ctx.mapName, sky.amb);
  }
  if (outdoor) waterLife(out, tags, v, season, SEA_MAPS.has(ctx.mapName));
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
        const wx = tag.wx ?? x;
        const wy = tag.wy ?? y;
        const o = out[y][x];
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
  let lightMap: Float32Array | null = null;
  const flash = motion && outdoor && ctx.weather === 'Typhoon' && lightning(t);
  if (flash) {
    sky.amb = Math.min(1.1, sky.amb + 0.65);
    sky.tint = '#c8d8ff';
    sky.tintAmt = 0.25;
  }
  const fireflies = motion && outdoorFx && sky.amb < 0.62 && (season === 0 || season === 1) && w === 'Sunny';
  const FIREFLY = '#fff27a';
  // Lighthouse Point: at night and in storms the lighthouse window turns a beam over the sea
  const beamOn = outdoor && ctx.mapName === 'point' && (sky.windowsLit || w === 'Typhoon' || w === 'Blizzard');
  let beacon: [number, number] | null = null;
  if (sky.amb < 0.999 || flash) {
    const lights: Light[] = [];
    for (let y = v.y; y < v.y + v.h && y < H; y++) {
      for (let x = v.x; x < v.x + v.w && x < W; x++) {
        const tag = tags[y][x];
        if (!tag || tag.t === 'ui') continue;
        if (tag.ent === 'player' && sky.lanterns) lights.push({ x, y, r: ctx.mapName === 'mine' ? 8 : 10, col: hexToRgb('#ffd890'), k: 1.15 });
        const pane = tag.t === 'wall' && tag.k === 'deco' && tag.dch === '=';
        if (pane && beamOn && !beacon) {
          beacon = [x, y];
          lights.push({ x, y, r: 6, col: hexToRgb('#fff0d0'), k: 1 });
        } else if (sky.windowsLit && pane && windowLit(ctx.minutes, tag.wx ?? x, tag.wy ?? y)) lights.push({ x, y, r: 3.4, col: hexToRgb('#ffb050'), k: 0.75 });
        if (sky.windowsLit && tag.t === 'door' && !tag.ent) lights.push({ x, y, r: 4, col: hexToRgb('#ffa040'), k: 0.8 });
        if (tag.t === 'fireplace') lights.push({ x, y, r: 5, col: hexToRgb('#ff8a40'), k: 0.8 });
        if (tag.t === 'mwall' && isTorch(F, x, y, tag)) lights.push({ x, y: y + 1, r: 5, col: hexToRgb('#ff9900'), k: 0.85 });
      }
    }
    lightMap = new Float32Array(W * H);
    // The beam turns once every BEAM_PERIOD seconds in small steps; with reduced motion it
    // holds still, pointing out to sea. It brightens what it crosses rather than tinting it.
    const beamA = Math.PI / 4 + (motion ? (Math.floor(t * 12) / 12 / BEAM_PERIOD) * Math.PI * 2 : 0);
    const beamCos = Math.cos(beamA);
    const beamSin = Math.sin(beamA);
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
      // light only ever adds: aim for the brighter of the ambient (which carries the sunset
      // tint at dusk) and the lamp-lit colour, plus a little of the lamp's own warmth
      const t0 = Math.max(n0, c[0] * (0.55 + 0.45 * w0)) + 14 * w0;
      const t1 = Math.max(n1, c[1] * (0.55 + 0.45 * w1)) + 14 * w1;
      const t2 = Math.max(n2, c[2] * (0.55 + 0.45 * w2)) + 14 * w2;
      return rgbToHex([n0 + (t0 - n0) * s, n1 + (t1 - n1) * s, n2 + (t2 - n2) * s]);
    };
    // Each light only touches the cells within its radius (columns count half, cells are tall),
    // so a town full of lit windows costs lights x area, not lights x screen.
    const LR = new Float32Array(W * H);
    const LG = new Float32Array(W * H);
    const LB = new Float32Array(W * H);
    const LS = new Float32Array(W * H);
    for (const L of lights) {
      // flames flicker a little; each light has its own rhythm
      const flick = 0.9 + 0.1 * Math.sin(Math.floor(F.t * 8) * 0.9 + L.x * 1.7 + L.y * 2.3);
      const y0 = Math.max(v.y, Math.floor(L.y - L.r));
      const y1 = Math.min(v.y + v.h, H, Math.ceil(L.y + L.r) + 1);
      const x0 = Math.max(v.x, Math.floor(L.x - L.r * 2));
      const x1 = Math.min(v.x + v.w, W, Math.ceil(L.x + L.r * 2) + 1);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const dx = (x - L.x) * 0.5;
          const dy = y - L.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= L.r) continue;
          const k = (1 - d / L.r) ** 1.1 * L.k * flick;
          const i = y * W + x;
          LR[i] += L.col[0] * k;
          LG[i] += L.col[1] * k;
          LB[i] += L.col[2] * k;
          LS[i] += k;
        }
      }
    }
    for (let y = v.y; y < v.y + v.h && y < H; y++) {
      for (let x = v.x; x < v.x + v.w && x < W; x++) {
        const tag = tags[y][x];
        if (!tag || tag.t === 'ui') continue;
        const o = out[y][x];
        const li = y * W + x;
        let lr = LR[li];
        let lg = LG[li];
        let lb = LB[li];
        let ls = LS[li];
        // Entities stay a little brighter so the player can always find them.
        const entBoost = tag.ent ? 0.35 : 0;
        const bn = blueNoise(tag.wx ?? x, tag.wy ?? y);
        if (ls > 0) {
          // blue-noise dither on the falloff turns banded rings into an even stipple
          const f = Math.max(0, 1 + (bn - 0.5) * 0.3);
          lr *= f;
          lg *= f;
          lb *= f;
          ls *= f;
        }
        lightMap[y * W + x] = ls;
        o.bg = shade(o.bg, lr, lg, lb, ls);
        // the rim of each light pool fades out through ':' and '.' (an ASCII gradient)
        if (ls > 0.04 && ls < 0.32 && o.ch === ' ' && SHADOW_RECEIVERS.has(tag.t) && !tag.ent && bn < 0.45) {
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
          const k = Math.max(0, Math.min(1, (d - 0.5) / 0.5 + (bn - 0.5) * 0.18)) * vignette;
          if (k > 0) {
            o.bg = mix(o.bg, '#000000', k);
            o.fg = mix(o.fg, '#000000', k * 0.8);
          }
        }
        if (beacon) {
          // a cone that widens away from the window, strongest on the water and the shore
          const bx = (x - beacon[0]) * 0.5;
          const by = y - beacon[1];
          const along = bx * beamCos + by * beamSin;
          const across = Math.abs(by * beamCos - bx * beamSin);
          const half = along * BEAM_SPREAD + 0.6;
          const surface = WATERY.has(tag.t) ? 1 : GROUND.has(tag.t) || tag.t === 'cliff' || tag.t === 'bridge' ? 0.55 : 0;
          if (surface && along > 1 && along < BEAM_R && across < half) {
            const kb = surface * (1 - across / half) ** 0.7 * (1 - along / BEAM_R) ** 0.6;
            o.bg = mix(o.bg, '#e8e8e8', kb * 0.4);
            o.fg = mix(o.fg, '#ffffff', kb * 0.55);
            if (tag.t === 'pond' && kb > 0.3) {
              o.ch = '✦'; // a tide pool flashes as the beam passes
              o.fg = '#ffffff';
              o.bold = true;
            }
          }
        }
        const beaconHere = !!beacon && beacon[0] === x && beacon[1] === y;
        if ((sky.windowsLit || beaconHere) && tag.t === 'wall' && tag.k === 'deco' && tag.dch === '=') {
          if (beaconHere || windowLit(ctx.minutes, tag.wx ?? x, tag.wy ?? y)) {
            o.fg = beaconHere ? '#fff2c8' : '#ffd27a';
            o.bg = '#5a3410';
            o.glow = '#ffb040';
            o.glowR = beaconHere ? 14 : 10;
            o.accent = true;
          } else {
            // that household has gone to bed: dark glass
            o.fg = '#3a4452';
            o.glow = undefined;
            o.accent = false;
          }
        }
        if (fireflies && tag.t === 'grass' && !tag.ent) {
          const wx = tag.wx ?? x;
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
  shoreFoam(out, tags, v, W, H, motion ? t : 0);
  if (ctx.fx?.length) drawFx(out, ctx.fx, v, W, H, motion);
  if (!ctx.indoor) worldMargin(out, tags, buf, v, ctx.divX, ctx.divY, boxes);

  const tod = toneFor(ctx.minutes, ctx.weather, !!ctx.indoor, ctx.mapName);
  monochrome(out, boxes, { ...tod, light: lightMap, tags });
  decorateBoxes(out, boxes, W, H, t);
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
  for (let i = 0; i < trail.length - 1; i++) {
    const s = trail[i];
    const x = px + (s.wx - pwx);
    const y = py + (s.wy - pwy);
    if (y < v.y || y >= v.y + v.h || x < v.x || x >= v.x + v.w) continue;
    const tg = tags[y][x];
    if (!tg || tg.wx !== s.wx || tg.wy !== s.wy || tg.ent || tg.k) continue;
    if (!((season === 3 && GROUND.has(tg.t)) || tg.t === 'sand')) continue;
    const o = out[y][x];
    const fresh = (i + 1) / trail.length; // older prints fade
    out[y][x] = { ...o, ch: ':', fg: mix(o.bg, '#b4bccc', 0.3 + 0.55 * fresh), bold: true, glow: undefined };
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
    if (!tg || tg.t === 'ui' || tg.ent) continue;
    const flap = Math.floor(t * 5 + i) % 2 === 0;
    out[y][x] = { ...out[y][x], ch: flap ? 'v' : 'ˇ', fg: '#d8d8d8', bold: true, glow: undefined };
  }
}

/** Mark water cells that touch land so the painter can draw a thin foam line on that side. */
function shoreFoam(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], W: number, H: number, t: number) {
  const T = Math.floor(t * 3) / 3;
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
      if (!m || m === 15) continue; // a lone tide pool gets no foam box
      // the foam laps: each stretch of shore brightens, fades and breaks on its own beat,
      // so the waterline reads as moving foam rather than a stone kerb
      const lap = 0.5 + 0.5 * Math.sin(T * 2.2 + (tg.wx ?? x) * 0.8 + (tg.wy ?? y) * 1.3);
      if (lap < 0.22) continue;
      const o = out[y][x];
      o.foam = m;
      o.foamCol = mix(o.bg, '#ffffff', 0.16 + 0.26 * lap);
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

/**
 * A map narrower or shorter than its window leaves a margin. Instead of a hard black frame,
 * the world's edge carries on into the dark: each margin cell borrows a cell from the map's
 * outer band (so a treeline stays a forest and a road keeps going), dimmer and sparser with
 * distance. Dialogs over the margin are left alone.
 */
function worldMargin(out: OutCell[][], tags: (CellTag | null)[][], buf: Cell[][], v: RenderCtx['view'], divX: number, divY: number, boxes: Screen['boxes']) {
  if (v.w < 2 || v.h < 2) return;
  const x1 = v.x + v.w - 1;
  const y1 = v.y + v.h - 1;
  const inBox = (x: number, y: number) => boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  for (let y = 1; y < Math.min(divY, out.length); y++) {
    for (let x = 0; x < Math.min(divX, out[y].length); x++) {
      if (x >= v.x && x <= x1 && y >= v.y && y <= y1) continue;
      if (tags[y][x] || buf[y][x][0] !== ' ' || inBox(x, y)) continue;
      const ex = x < v.x ? v.x - x : x > x1 ? x - x1 : 0;
      const ey = y < v.y ? v.y - y : y > y1 ? y - y1 : 0;
      const d = Math.max(ex, ey * 2); // rows are about twice as tall as columns are wide
      const fade = 0.4 + d * 0.07;
      if (fade >= 0.97) continue;
      // borrow from the two outermost rings, nudged a row or column so copies don't streak
      const j = hash(x, y, 210) < 0.5 ? 0 : 1;
      const n = Math.floor(hash(x, y, 211) * 3) - 1;
      const sx = x < v.x ? v.x + j : x > x1 ? x1 - j : Math.max(v.x, Math.min(x1, x + n));
      const sy = y < v.y ? v.y + j : y > y1 ? y1 - j : Math.max(v.y, Math.min(y1, y + n));
      const src = out[sy][sx];
      const st = tags[sy][sx];
      const sparse = blueNoise(x, y) < (d - 1) * 0.15; // glyphs thin out toward the far edge
      out[y][x] = {
        ch: !st || st.ent || sparse ? ' ' : src.ch,
        fg: mix(src.fg, '#000000', fade),
        bg: mix(src.bg, '#000000', fade),
        bold: false,
        seed: hash(x, y, 213),
      };
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
      if (src.ch === ' ') continue;
      if (hash((tag.wx ?? x) * 2, tag.wy ?? y, 120 + (f % 31)) < 0.22) continue; // ripple break-up
      out[y][x] = {
        ch: MIRROR[src.ch] ?? src.ch,
        fg: mix(src.fg, o.bg, 0.5 + 0.1 * k),
        bg: o.bg,
        bold: false,
        accent: src.accent,
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

// ---- shape-matched edge glyphs
// After Alex Harri's "ASCII characters are not pixels": a glyph is described by how much ink
// falls in six sampling circles (two staggered columns of three), and an edge cell picks the
// glyph whose ink best matches how far the neighbouring ground reaches into it.
const EDGE_SAMPLES: [number, number][] = [[0.27, 0.22], [0.73, 0.18], [0.27, 0.52], [0.73, 0.48], [0.27, 0.82], [0.73, 0.78]];
const EDGE_SHAPES: Record<string, (u: number, v: number) => boolean> = {
  '▀': (u, v) => v < 0.5, '▄': (u, v) => v >= 0.5, '▌': (u) => u < 0.5, '▐': (u) => u >= 0.5,
  '▘': (u, v) => u < 0.5 && v < 0.5, '▝': (u, v) => u >= 0.5 && v < 0.5, '▖': (u, v) => u < 0.5 && v >= 0.5, '▗': (u, v) => u >= 0.5 && v >= 0.5,
  '▛': (u, v) => !(u >= 0.5 && v >= 0.5), '▜': (u, v) => !(u < 0.5 && v >= 0.5), '▙': (u, v) => !(u >= 0.5 && v < 0.5), '▟': (u, v) => !(u < 0.5 && v < 0.5),
  '◤': (u, v) => u + v < 1, '◥': (u, v) => v < u, '◣': (u, v) => v > u, '◢': (u, v) => u + v > 1,
};
/** Shape vectors: the share of each sampling circle (radius 0.2) covered by the glyph's ink. */
const EDGE_VECTORS: [string, number[]][] = Object.entries(EDGE_SHAPES).map(([ch, inside]) => [
  ch,
  EDGE_SAMPLES.map(([cu, cv]) => {
    let hit = 0;
    let n = 0;
    for (let a = -1; a <= 1; a += 0.25) {
      for (let b = -1; b <= 1; b += 0.25) {
        if (a * a + b * b > 1) continue;
        n++;
        if (inside(cu + a * 0.2, cv + b * 0.2)) hit++;
      }
    }
    return hit / n;
  }),
]);
EDGE_VECTORS.push(['░', EDGE_SAMPLES.map(() => 0.25)], [' ', EDGE_SAMPLES.map(() => 0)]);

/**
 * Best glyph for an edge cell, given which of its eight neighbours ([dy+1][dx+1]) are the
 * other ground. Coverage falls off with distance from each neighbour; a contrast curve
 * sharpens it before the nearest-shape match.
 */
export function edgeGlyph(occ: boolean[][]): string {
  const want = EDGE_SAMPLES.map(([u, v]) => {
    let f = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && occ[dy + 1][dx + 1]) {
          const d = Math.hypot(u - (0.5 + dx), v - (0.5 + dy));
          f = Math.max(f, Math.min(1, Math.max(0, (1.4 - d) / 0.6)));
        }
      }
    }
    return f;
  });
  const top = Math.max(...want);
  if (top <= 0) return ' ';
  const sharp = want.map((w) => (w / top) ** 1.6 * top); // global contrast enhancement
  let best = ' ';
  let bestD = Infinity;
  for (const [ch, vec] of EDGE_VECTORS) {
    let d = 0;
    for (let k = 0; k < 6; k++) d += (vec[k] - sharp[k]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = ch;
    }
  }
  return best;
}

function blendGroundEdges(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], W: number, H: number) {
  // A 16-colour palette has no in-between hues, so where two grounds meet, the softer one
  // (grass over soil, soil over path) reaches into its neighbour as a shape-matched block glyph
  // in its own colour: straight edges get half blocks, corners get quadrants or diagonals.
  const rank: Record<string, number> = { grass: 3, flower: 3, field: 2, sand: 1, path: 0 };
  const base = out.map((r) => r.map((o) => o.bg));
  for (let y = v.y; y < v.y + v.h && y < H; y++) {
    for (let x = v.x; x < v.x + v.w && x < W; x++) {
      const tag = tags[y][x];
      if (!tag || tag.t === 'ui' || !GROUND.has(tag.t) || tag.k || out[y][x].ch !== ' ') continue;
      if (hash((tag.wx ?? x) * 2, tag.wy ?? y, 61) > 0.7) continue; // ragged, not a solid band
      const occ = [[false, false, false], [false, false, false], [false, false, false]];
      let fg = '';
      let fgRank = -1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const n = (dx || dy) ? tags[y + dy]?.[x + dx] : null;
          if (!n || n.t === 'ui' || !GROUND.has(n.t) || n.k || rank[n.t] <= rank[tag.t]) continue;
          occ[dy + 1][dx + 1] = true;
          // the colour comes from the strongest side neighbour (diagonals only if nothing else)
          const r = rank[n.t] + (dx && dy ? 0 : 0.5);
          if (r > fgRank) {
            fgRank = r;
            fg = base[y + dy][x + dx];
          }
        }
      }
      if (fgRank < 0) continue;
      const ch = edgeGlyph(occ);
      if (ch !== ' ') out[y][x] = { ...out[y][x], ch, fg: mix(fg, '#ffffff', 0.07) }; // a touch lighter, so the shape reads
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

/** Reeds and lily pads: small signs that the water is alive. */
function waterLife(out: OutCell[][], tags: (CellTag | null)[][], v: RenderCtx['view'], season: number, sea: boolean) {
  if (sea || season === 3) return; // nothing grows on the open sea, and winter water is bare
  for (let y = v.y; y < v.y + v.h && y < tags.length; y++) {
    for (let x = v.x; x < v.x + v.w && x < tags[y].length; x++) {
      const tg = tags[y][x];
      if (!tg || tg.t === 'ui' || tg.ent) continue;
      const wx = tg.wx ?? x;
      const wy = tg.wy ?? y;
      if (WATERY.has(tg.t)) {
        if ((tg.t === 'water' || tg.t === 'pond') && hash(wx, wy, 190) < 0.035) {
          const o = out[y][x];
          o.ch = hash(wx, wy, 193) < 0.6 ? '◡' : '⌓';
          o.fg = '#256a34';
          o.bold = false;
          o.accent = true;
          o.plain = true;
          o.seed = undefined;
        }
        continue;
      }
      if (!GROUND.has(tg.t)) continue;
      const nearWater = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => {
        const n = tags[y + dy]?.[x + dx];
        return !!n && WATERY.has(n.t);
      });
      if (nearWater && hash(wx, wy, 191) < 0.08) {
        const o = out[y][x];
        o.ch = pick(['¦', 'ʸ', '╽'], hash(wx, wy, 192));
        o.fg = '#4a8a52';
        o.bold = false;
        o.accent = true;
        o.plain = true;
        o.seed = undefined;
      }
    }
  }
}

/** A little non-interactive wildlife: beach crabs, farm rabbits, town cats. */
function wildlife(
  out: OutCell[][],
  tags: (CellTag | null)[][],
  v: RenderCtx['view'],
  t: number,
  season: number,
  weather: string,
  mapName: string,
  amb: number
) {
  if (weather !== 'Sunny' && weather !== 'Cloudy' && weather !== 'Snow') return;
  if (!['beach', 'farm', 'mountain', 'town', 'woods', 'ridge', 'river', 'point'].includes(mapName) || amb < 0.4) return;
  const count = SEA_MAPS.has(mapName) || mapName === 'woods' ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const x = v.x + Math.floor(hash(i, mapName.length, 201) * v.w);
    const y = v.y + Math.floor(hash(i, mapName.length, 202) * v.h);
    const tg = tags[y]?.[x];
    if (!tg || tg.t === 'ui' || tg.ent) continue;
    const o = out[y][x];
    if (SEA_MAPS.has(mapName) && tg.t === 'sand') {
      const flip = Math.floor(t * 4 + i) % 2 === 0;
      out[y][x] = { ...o, ch: flip ? 'v' : 'w', fg: '#e08040', bold: true, accent: true, plain: true, seed: undefined };
    } else if (['farm', 'mountain', 'woods', 'ridge', 'river'].includes(mapName) && tg.t === 'grass') {
      const hop = Math.floor(t * 1.5 + i) % 3 === 0;
      out[y][x] = { ...o, ch: hop ? 'ᵣ' : 'r', fg: season === 3 ? '#e8f4ff' : '#d8c8a8', bold: true, accent: true, plain: true, seed: undefined };
    } else if (mapName === 'town' && (tg.t === 'path' || tg.t === 'grass')) {
      out[y][x] = { ...o, ch: 'c', fg: '#ffb050', bold: true, accent: true, plain: true, seed: undefined };
    }
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
function decorateBoxes(out: OutCell[][], boxes: Screen['boxes'], W: number, H: number, t = 0) {
  for (const b of boxes) {
    const p = t <= 0 || b.born === undefined ? 1 : Math.min(1, Math.max(0, (t - b.born) / 0.11));
    if (p < 1) {
      // a short top-down reveal: the panel wipes in instead of popping
      const reveal = b.y + Math.ceil(b.h * p);
      for (let y = reveal; y < b.y + b.h && y < H; y++) {
        for (let x = b.x; x < b.x + b.w && x < W; x++) {
          if (x < 0 || y < 0) continue;
          out[y][x] = { ch: ' ', fg: '#000000', bg: '#000000', bold: false };
        }
      }
    }
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

export type DirtyRect = { x0: number; y0: number; x1: number; y1: number };

/** Bounding box of cells that changed between two frames, including glyph overhang. */
export function frameDirtyRect(prev: OutCell[][] | null, next: OutCell[][]): DirtyRect | null {
  if (!prev || prev.length !== next.length) return { x0: 0, y0: 0, x1: next[0]?.length ?? 0, y1: next.length };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < next.length; y++) {
    const a = prev[y];
    const b = next[y];
    if (!a || a.length !== b.length) return { x0: 0, y0: 0, x1: b.length, y1: next.length };
    for (let x = 0; x < b.length; x++) {
      const p = a[x];
      const n = b[x];
      if (
        p.ch !== n.ch || p.fg !== n.fg || p.bg !== n.bg || p.bold !== n.bold ||
        p.glow !== n.glow || p.glowR !== n.glowR || p.token !== n.token || p.rim !== n.rim ||
        p.plain !== n.plain || p.ui !== n.ui || p.accent !== n.accent || p.seed !== n.seed ||
        p.foam !== n.foam || p.foamCol !== n.foamCol || p.detail?.ch !== n.detail?.ch || p.detail?.fg !== n.detail?.fg
      ) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return {
    x0: Math.max(0, minX - 1),
    y0: Math.max(0, minY - 1),
    x1: Math.min(next[0]?.length ?? 0, maxX + 2),
    y1: Math.min(next.length, maxY + 2),
  };
}

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
  if (level < 2 || fontPx < HIRES_MIN_FONT || o.ui || o.plain || o.token || o.glow) return null;
  const pools = SPRITE_POOLS[o.ch];
  if (!pools) return null;
  const seed = o.seed ?? 0;
  const rows: string[] = [];
  for (let r = 0; r < level; r++) {
    let row = '';
    for (let c = 0; c < level; c++) {
      const dx = (c + 0.5) / level - 0.5;
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
  if (n < 2 || fontPx < HIRES_MIN_FONT || o.ui || o.plain || o.token || o.glow) return null;
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

export function drawFrame(g: CanvasRenderingContext2D, frame: OutCell[][], m: Metrics, dirty?: DirtyRect) {
  const { cw, ch, fontPx, font } = m;
  const level = effectiveHiresLevel(fontPx, m.dpr ?? 1, m.hires ?? true);
  const X0 = Math.max(0, dirty?.x0 ?? 0);
  const Y0 = Math.max(0, dirty?.y0 ?? 0);
  const X1 = Math.min(frame[0]?.length ?? 0, dirty?.x1 ?? frame[0]?.length ?? 0);
  const Y1 = Math.min(frame.length, dirty?.y1 ?? frame.length);
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
  // backgrounds go down in runs of equal colour: one rectangle per run, not per cell
  for (let y = Y0; y < Y1; y++) {
    const row = frame[y];
    let x0 = X0;
    for (let x = X0 + 1; x <= X1; x++) {
      if (x < X1 && row[x].bg === row[x0].bg) continue;
      g.fillStyle = row[x0].bg;
      // +1px overlap on both axes so scaled canvases show no seams between cells
      g.fillRect(Math.floor(x0 * cw), Math.floor(y * ch), Math.ceil((x - x0) * cw) + 1, Math.ceil(ch) + 1);
      x0 = x;
    }
  }
  let curFont = '';
  let glowOn = false;
  for (let y = Y0; y < Y1; y++) {
    const row = frame[y];
    for (let x = X0; x < X1; x++) {
      const o = row[x];
      // two-tone cells: the detail glyph sits small on the upper right, drawn with the batch
      if (o.detail) mini(x * cw + cw * 0.48, y * ch + ch * 0.3, o.detail.ch, o.detail.fg, 1, true);
      if (o.ch === ' ') continue;
      const px = x * cw;
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
        for (let r = 0; r < spr.length; r++) {
          if (spr[r].trim() !== '') mini(px, py + r * (ch / level) + ch / (2 * level) + 0.5, spr[r], o.fg, 1, o.bold);
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
        g.beginPath();
        g.ellipse(px + cw / 2, py + ch / 2, cw * 0.62, ch * 0.46, 0, 0, Math.PI * 2);
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
  // at least two device pixels: single-pixel lines vanish on low-DPI screens and in recordings
  const fw = Math.max(2 / (m.dpr ?? 1), Math.round(ch / 12));
  for (let y = Y0; y < Y1; y++) {
    const row = frame[y];
    for (let x = X0; x < X1; x++) {
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
  for (const row of frame) for (const o of row) s += o.ch + o.fg + o.bg + (o.bold ? 1 : 0) + (o.glow ? 'g' : '') + (o.seed ? (o.seed * 97) | 0 : '') + (o.foam ? 'f' + o.foam + o.foamCol : '') + (o.detail ? 'd' + o.detail.ch + o.detail.fg : '');
  return s;
}
