// Scratch exporter (not part of the game): renders every map with the real engine + renderer and
// writes Figma-friendly layered SVGs, component sheets and PNGs. Runs in a browser page.
import { Screen } from '../../../src/game/screen';
import { Game } from '../../../src/game/engine';
import { computeFrame, drawFrame, spritePattern, subPattern, SPRITE_KEEP, subAlpha, rowAlpha, type OutCell } from '../../../src/game/enhanced';
import { NPCS, CROPS, PALETTE, ITEMS } from '../../../src/game/constants';
import GLYPHS from './glyphs.json';

const FONT = '"HRVSTMN Mono", "DejaVu Sans Mono", monospace';
const FAMILY = 'DejaVu Sans Mono';
const PX = 20; // glyph size
const CW = 12; // cell width  (the font advances 12.04 at 20px)
const CH = 25; // cell height (the game's line height at 20px)
const LV = 3; // high-res texture level: 3x3 small glyphs per cell
const MINI = PX / LV;
const ADV = (GLYPHS as any).regularMeta.advance as number;
let K = 0.26; // canvas 'middle' baseline -> alphabetic baseline, in em (measured at start)

type Tag = { t: string; k?: string; ent?: string; wx?: number; wy?: number; dch?: string } | null;
type Cell = { o: OutCell; tag: Tag };
type Grid = { name: string; w: number; h: number; cells: Cell[][] };
const files: Record<string, string> = {}; // path -> text or data: URL
const missing = new Set<string>();

// ---------------------------------------------------------------- small helpers
const r2 = (n: number) => String(Math.round(n * 100) / 100);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const idOf = (s: string) => s.replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const usedIds = new Map<string, number>();
const uid = (s: string) => {
  const base = idOf(s);
  const n = (usedIds.get(base) || 0) + 1;
  usedIds.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
};
const hex = (c: string) => {
  // the renderer hands out #rrggbb, sometimes rgb()/rgba(); normalise for Figma
  if (c.startsWith('#')) return c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c.slice(0, 7);
  const m = c.match(/[\d.]+/g);
  if (!m) return '#000000';
  return '#' + m.slice(0, 3).map((v) => Math.round(Number(v)).toString(16).padStart(2, '0')).join('');
};

const segCache = new Map<string, [string, number[]][]>();
/** One glyph as absolute path data: left edge at x, alphabetic baseline at y. */
function glyphD(ch: string, bold: boolean, x: number, y: number, size: number): string {
  const key = (bold ? 'b' : 'r') + ch;
  let segs = segCache.get(key);
  if (!segs) {
    const src: string | undefined = (GLYPHS as any)[bold ? 'bold' : 'regular'][ch] ?? (GLYPHS as any).regular[ch];
    if (src === undefined) {
      if (ch.trim()) missing.add(ch);
      segs = [];
    } else {
      segs = [];
      const re = /([MLQCZ])([^MLQCZ]*)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) segs.push([m[1], m[2].trim() ? m[2].trim().split(/[ ,]+/).map(Number) : []]);
    }
    segCache.set(key, segs);
  }
  let s = '';
  for (const [c, nums] of segs) {
    s += c;
    for (let i = 0; i < nums.length; i += 2) s += `${r2(nums[i] * size + x)} ${r2(nums[i + 1] * size + y)} `;
  }
  return s;
}
/** A run of glyphs drawn like canvas fillText(str, x, yMiddle) at the given size. */
function textD(str: string, bold: boolean, x: number, yMid: number, size: number): string {
  let d = '';
  for (let i = 0; i < str.length; i++) if (str[i] !== ' ') d += glyphD(str[i], bold, x + i * ADV * size, yMid + K * size, size);
  return d;
}

// ---------------------------------------------------------------- one cell -> vector art (mirrors drawFrame)
type Tex = { fill: string; op: number; d: string };
type Art = { tex: Tex[]; shapes: string[]; glow?: { c: string; r: number } };
function artOf(o: OutCell, X: number, Y: number): Art {
  const tex: Tex[] = [];
  const shapes: string[] = [];
  const art: Art = { tex, shapes };
  const mini = (x: number, y: number, str: string, fg: string, a: number, bold: boolean) => {
    const d = textD(str, bold, x, y, MINI);
    if (d) tex.push({ fill: hex(fg), op: a, d });
  };
  if (o.detail) mini(X + CW * 0.48, Y + CH * 0.3, o.detail.ch, o.detail.fg, 1, true);
  if (o.ch === ' ' && !(o.texture && o.ch === o.textureGlyph)) return art;
  if (o.label || o.meter) return art; // HUD only; handled by the UI exporter
  const fg = hex(o.fg);
  if (o.ch === '▄' || o.ch === '▀' || o.ch === '█') {
    const top = o.ch === '▄' ? CH / 2 : 0;
    const h = o.ch === '█' ? CH : CH / 2;
    shapes.push(`<rect x="${r2(X)}" y="${r2(Y + top)}" width="${CW}" height="${r2(h)}" fill="${fg}"/>`);
    return art;
  }
  if (o.ch === '◢' || o.ch === '◣') {
    const pts = o.ch === '◢' ? [X + CW, Y, X + CW, Y + CH, X, Y + CH] : [X, Y, X + CW, Y + CH, X, Y + CH];
    shapes.push(`<polygon points="${pts.map(r2).join(' ')}" fill="${fg}"/>`);
    return art;
  }
  const spr = spritePattern(o, PX, LV);
  if (spr) {
    for (let r = 0; r < spr.length; r++) if (spr[r].trim() !== '') mini(X, Y + r * (CH / LV) + CH / (2 * LV) + 0.5, spr[r], o.fg, 1, o.bold);
    if (!SPRITE_KEEP.has(o.ch)) return art;
  }
  const pat = spr ? null : subPattern(o, PX, LV);
  if (pat) {
    for (let r = 0; r < LV; r++) {
      const row = pat.slice(r * LV, r * LV + LV);
      if (row.trim() !== '') mini(X, Y + r * (CH / LV) + CH / (2 * LV) + 0.5, row, o.fg, rowAlpha(o.ch, o.seed ?? 0, r, LV), o.bold);
    }
    return art;
  }
  if (o.token) {
    shapes.push(
      `<ellipse cx="${r2(X + CW / 2)}" cy="${r2(Y + CH / 2)}" rx="${r2(CW * 0.62)}" ry="${r2(CH * 0.46)}" fill="${hex(o.token)}"${o.rim ? ` stroke="${hex(o.rim)}" stroke-width="1"` : ''}/>`,
    );
  }
  if (o.glow) art.glow = { c: hex(o.glow), r: o.glowR ?? 6 };
  const d = glyphD(o.ch, o.bold, X, Y + CH / 2 + 1 + K * PX, PX);
  if (d) shapes.push(`<path d="${d}" fill="${fg}"/>`);
  return art;
}
void subAlpha;

/** Merge texture runs that share a colour and (rounded) opacity into compound paths. */
function texPaths(tex: Tex[], step = 0.1): string[] {
  const by = new Map<string, string>();
  for (const t of tex) {
    const op = Math.max(step, Math.round(t.op / step) * step);
    const key = `${t.fill}|${r2(Math.min(1, op))}`;
    by.set(key, (by.get(key) || '') + t.d);
  }
  return [...by.entries()].map(([key, d]) => {
    const [fill, op] = key.split('|');
    return `<path d="${d}" fill="${fill}"${op !== '1' ? ` fill-opacity="${op}"` : ''}/>`;
  });
}
/** One cell's art as a single flat list: its texture averaged to one path, then its shapes. */
function cellNodes(art: Art, glows: Set<string>, X: number, Y: number): string[] {
  const out: string[] = [];
  if (art.glow) {
    glows.add(art.glow.c);
    out.push(`<ellipse cx="${r2(X + CW / 2)}" cy="${r2(Y + CH / 2)}" rx="${r2(CW * 0.5 + art.glow.r * 0.9)}" ry="${r2(CH * 0.36 + art.glow.r * 0.9)}" fill="url(#glow-${art.glow.c.slice(1)})"/>`);
  }
  if (art.tex.length) {
    const byFill = new Map<string, Tex[]>();
    for (const t of art.tex) byFill.set(t.fill, [...(byFill.get(t.fill) || []), t]);
    for (const [fill, list] of byFill) {
      const op = list.reduce((s, t) => s + t.op, 0) / list.length;
      out.push(`<path d="${list.map((t) => t.d).join('')}" fill="${fill}"${op < 0.975 ? ` fill-opacity="${r2(Math.round(op * 20) / 20)}"` : ''}/>`);
    }
  }
  out.push(...art.shapes);
  return out;
}
/** Background squares for a set of cells, merged into runs of equal colour per row. */
function bgRects(cells: { x: number; y: number; bg: string }[], ox = 0, oy = 0): string[] {
  const sorted = [...cells].sort((a, b) => a.y - b.y || a.x - b.x);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].y === sorted[i].y && sorted[j].x === sorted[j - 1].x + 1 && sorted[j].bg === sorted[i].bg) j++;
    out.push(`<rect x="${(sorted[i].x - ox) * CW}" y="${(sorted[i].y - oy) * CH}" width="${(j - i) * CW}" height="${CH}" fill="${hex(sorted[i].bg)}"/>`);
    i = j;
  }
  return out;
}
const group = (id: string, inner: string[], extra = '') => (inner.length ? `<g id="${uid(id)}"${extra}>${inner.join('')}</g>` : '');
const svgDoc = (w: number, h: number, body: string, glows: Set<string>, bg: string | null = '#000000') =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${r2(w)}" height="${r2(h)}" viewBox="0 0 ${r2(w)} ${r2(h)}">` +
  (glows.size
    ? `<defs>${[...glows].map((c) => `<radialGradient id="glow-${c.slice(1)}"><stop offset="0" stop-color="${c}" stop-opacity="0.55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`
    : '') +
  (bg ? `<rect id="backdrop" width="${r2(w)}" height="${r2(h)}" fill="${bg}"/>` : '') +
  body +
  `</svg>\n`;
const label = (text: string, x: number, y: number, size = 12, fill = '#c0c0c0', bold = false, id = 'label') =>
  `<text id="${uid(id)}" x="${r2(x)}" y="${r2(y)}" font-family="${FAMILY}" font-size="${size}"${bold ? ' font-weight="700"' : ''} fill="${fill}" xml:space="preserve">${esc(text)}</text>`;

// ---------------------------------------------------------------- the game
const scr = new Screen(160, 50);
scr.hires = true;
scr.reducedMotion = true;
let g: any;
function newGame() {
  g = new Game(scr, true) as any;
  g.new_game('Pete', 'Moon');
  g.minutes = 10 * 60;
  g.weather = 'Sunny';
  g.show_minimap = false;
  g.update_npcs();
}
function capture(name: string, player: [number, number] | null = null): Grid {
  g.mapname = name;
  [g.px, g.py] = player ?? [-10, -10];
  g.cam_x = g.cam_y = null;
  g.msgs = [];
  g.render();
  const frame = computeFrame(scr, 0);
  const v = scr.ctx!.view;
  const cells: Cell[][] = [];
  for (let y = 0; y < v.h; y++) {
    cells.push([]);
    for (let x = 0; x < v.w; x++) cells[y].push({ o: frame[v.y + y][v.x + x], tag: (scr.tags[v.y + y][v.x + x] as Tag) ?? null });
  }
  return { name, w: v.w, h: v.h, cells };
}
/** Paint cells with the game's own canvas renderer. keep() picks cells; clear drops backgrounds. */
function paint(grid: Grid, dpr: number, keep: (c: Cell) => boolean = () => true, clear = false): string {
  const blank: OutCell = { ch: ' ', fg: '#000000', bg: clear ? 'rgba(0,0,0,0)' : '#000000', bold: false };
  const frame = grid.cells.map((row) =>
    row.map((c) => (keep(c) ? (clear ? { ...c.o, bg: 'rgba(0,0,0,0)', foam: 0 } : c.o) : { ...blank, bg: clear ? blank.bg : c.o.bg })),
  );
  const cv = document.createElement('canvas');
  cv.width = Math.round(grid.w * CW * dpr);
  cv.height = Math.round(grid.h * CH * dpr);
  const cx = cv.getContext('2d')!;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!clear) {
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, grid.w * CW, grid.h * CH);
  }
  drawFrame(cx, frame as OutCell[][], { cw: CW, ch: CH, fontPx: PX, font: FONT, dpr: Math.max(2, dpr), hires: true });
  return cv.toDataURL('image/png');
}

// ---------------------------------------------------------------- classify cells
const AREA = new Set(['grass', 'field', 'path', 'water', 'sand', 'pond', 'spring', 'cliff', 'bridge', 'floor', 'mfloor', 'iwall', 'mwall', 'void', 'ice']);
const BUILDING = new Set(['roof', 'wall', 'door']);
const PER_CELL = new Set(['tree', 'flower']);
const isOverlay = (t: Tag) => !!t && (!!t.ent || /^(obj:|forage|crop:|soil)/.test(t.k || ''));
const typeOf = (c: Cell) => c.tag?.t ?? 'void';
const isAreaOnly = (c: Cell) => AREA.has(typeOf(c)) && !isOverlay(c.tag);

/** 4-connected groups of cells that satisfy `ok`, optionally only joining equal `key`s. */
function components(grid: Grid, ok: (c: Cell) => boolean, key: (c: Cell) => string = () => ''): [number, number][][] {
  const seen = grid.cells.map((r) => r.map(() => false));
  const out: [number, number][][] = [];
  for (let y = 0; y < grid.h; y++)
    for (let x = 0; x < grid.w; x++) {
      if (seen[y][x] || !ok(grid.cells[y][x])) continue;
      const k = key(grid.cells[y][x]);
      const comp: [number, number][] = [];
      const stack: [number, number][] = [[x, y]];
      seen[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        comp.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const [nx, ny] = [cx + dx, cy + dy];
          if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h || seen[ny][nx]) continue;
          const c = grid.cells[ny][nx];
          if (!ok(c) || key(c) !== k) continue;
          seen[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
      comp.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      out.push(comp);
    }
  return out;
}
const bounds = (comp: [number, number][]) => {
  const xs = comp.map((p) => p[0]);
  const ys = comp.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

/** A building (roof + walls + door) as one movable group; (ox, oy) is the cell offset to draw at. */
function buildingGroup(grid: Grid, comp: [number, number][], name: string, glows: Set<string>, ox = 0, oy = 0): string {
  const at = (x: number, y: number): [number, number] => [(x - ox) * CW, (y - oy) * CH];
  const parts: Record<string, Tex[]> = { roof: [], wall: [], door: [] };
  const glyphs: string[] = [];
  const letters: { x: number; y: number; ch: string; fg: string }[] = [];
  for (const [x, y] of comp) {
    const c = grid.cells[y][x];
    const [X, Y] = at(x, y);
    if (c.o.plain && /[A-Za-z0-9/'&.]/.test(c.o.ch) && c.tag?.k === 'deco') {
      letters.push({ x, y, ch: c.o.ch, fg: hex(c.o.fg) });
      continue;
    }
    const art = artOf(c.o, X, Y);
    (parts[typeOf(c)] ||= []).push(...art.tex);
    const kind = typeOf(c) === 'door' ? 'door' : art.glow ? 'window' : `glyph-${c.o.ch}`;
    const nodes = cellNodes({ ...art, tex: [] }, glows, X, Y);
    if (nodes.length) glyphs.push(nodes.length === 1 ? nodes[0].replace(/^<(\w+)/, `<$1 id="${uid(`${name}-${kind}`)}"`) : group(`${name}-${kind}`, nodes));
  }
  // lettering: consecutive letters on a row become one editable text layer
  const texts: string[] = [];
  letters.sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < letters.length; ) {
    let j = i + 1;
    let str = letters[i].ch;
    while (j < letters.length && letters[j].y === letters[i].y && letters[j].x - letters[j - 1].x <= 2) {
      str += (letters[j].x - letters[j - 1].x === 2 ? ' ' : '') + letters[j].ch;
      j++;
    }
    const [X, Y] = at(letters[i].x, letters[i].y);
    texts.push(label(str, X, Y + CH / 2 + 1 + K * PX, PX, letters[i].fg, true, `${name}-name`));
    i = j;
  }
  return group(`building-${name}`, [
    group(`${name}-fill`, bgRects(comp.map(([x, y]) => ({ x, y, bg: grid.cells[y][x].o.bg })), ox, oy)),
    group(`${name}-roof-texture`, texPaths(parts.roof)),
    group(`${name}-wall-texture`, texPaths([...parts.wall, ...parts.door])),
    group(`${name}-details`, glyphs),
    ...texts,
  ]);
}

function buildingName(grid: Grid, comp: [number, number][]): string {
  const m = g.maps[grid.name];
  for (const [x, y] of comp) {
    const c = grid.cells[y][x];
    const id = m.doors[`${c.tag?.wx},${c.tag?.wy}`];
    if (id) {
      const dest = g.maps[id] || g.maps[`in_${id}`];
      const ls = comp.filter((p) => grid.cells[p[1]][p[0]].o.plain && grid.cells[p[1]][p[0]].tag?.k === 'deco');
      const row = ls.map((p, n) => (n && p[1] === ls[n - 1][1] && p[0] - ls[n - 1][0] === 2 ? ' ' : '') + grid.cells[p[1]][p[0]].o.ch).join('');
      return (row || dest?.title || id).replace(/\s+/g, '-').toUpperCase();
    }
  }
  const b = bounds(comp);
  return grid.name === 'point' ? 'LIGHTHOUSE' : `no-door-${b.x0}-${b.y0}`;
}

// ---------------------------------------------------------------- a whole map as layered SVG
type MapInfo = { buildings: { name: string; grid: Grid; comp: [number, number][] }[] };
/** The same map with no villagers on it: used for pictures and the ground texture. */
function captureEmpty(name: string): Grid {
  const [out, inside] = [g.npc_pos, g.indoor_npcs];
  g.npc_pos = {};
  g.indoor_npcs = {};
  const grid = capture(name);
  g.npc_pos = out;
  g.indoor_npcs = inside;
  return grid;
}
function mapSvg(grid: Grid, info: MapInfo, empty: Grid): string {
  usedIds.clear();
  const glows = new Set<string>();
  const all: [number, number, Cell][] = [];
  for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) all.push([x, y, grid.cells[y][x]]);

  // ground: background squares per terrain, the texture as one image, shoreline foam
  const ground: string[] = [];
  const types = [...new Set(all.filter(([, , c]) => AREA.has(typeOf(c))).map(([, , c]) => typeOf(c)))];
  for (const t of types) ground.push(group(`ground-${t}`, bgRects(all.filter(([, , c]) => typeOf(c) === t).map(([x, y, c]) => ({ x, y, bg: c.o.bg })))));
  const texUrl = paint(empty, 2, isAreaOnly, true);
  files[`maps/layers/${grid.name}-ground-texture.png`] = texUrl;
  ground.push(`<image id="${uid('ground-texture-image')}" x="0" y="0" width="${grid.w * CW}" height="${grid.h * CH}" href="${texUrl}"/>`);
  const foam = new Map<string, string>();
  const fw = 2;
  for (const [x, y, c] of all) {
    if (!c.o.foam) continue;
    const col = hex(c.o.foamCol ?? '#c0c0c0');
    const [X, Y] = [x * CW, y * CH];
    let d = foam.get(col) || '';
    const box = (a: number, b: number, w: number, h: number) => (d += `M${a} ${b}h${w}v${h}h${-w}Z`);
    if (c.o.foam & 1) box(X, Y, CW, fw);
    if (c.o.foam & 4) box(X, Y + CH - fw, CW, fw);
    if (c.o.foam & 8) box(X, Y, fw, CH);
    if (c.o.foam & 2) box(X + CW - fw, Y, fw, CH);
    foam.set(col, d);
  }
  ground.push(group('ground-shoreline', [...foam.entries()].map(([col, d]) => `<path d="${d}" fill="${col}"/>`)));

  // tile pieces: trees and flowers one by one, other fixtures as connected pieces (each carries its square)
  const isPiece = (c: Cell) => !AREA.has(typeOf(c)) && !BUILDING.has(typeOf(c));
  const pieces = new Map<string, string[]>();
  const pieceGroup = (comp: [number, number][]) => {
    const t = typeOf(grid.cells[comp[0][1]][comp[0][0]]);
    const c0 = grid.cells[comp[0][1]][comp[0][0]];
    const name = `${t}-${c0.tag?.wx ?? comp[0][0]}-${c0.tag?.wy ?? comp[0][1]}`;
    const nodes: string[] = [...bgRects(comp.map(([x, y]) => ({ x, y, bg: grid.cells[y][x].o.bg })))];
    for (const [x, y] of comp) {
      const c = grid.cells[y][x];
      if (isOverlay(c.tag)) continue; // whatever stands on it is drawn by the overlay pass
      nodes.push(...cellNodes(artOf(c.o, x * CW, y * CH), glows, x * CW, y * CH));
    }
    pieces.set(t, [...(pieces.get(t) || []), group(name, nodes)]);
  };
  for (const [x, y, c] of all) if (isPiece(c) && PER_CELL.has(typeOf(c))) pieceGroup([[x, y]]);
  for (const comp of components(grid, (c) => isPiece(c) && !PER_CELL.has(typeOf(c)), typeOf)) pieceGroup(comp);
  const trees = group('trees', pieces.get('tree') || []);
  const flowers = group('flowers', pieces.get('flower') || []);
  const fixtures = group('fixtures', [...pieces.entries()].filter(([t]) => !PER_CELL.has(t)).map(([t, list]) => group(`fixtures-${t}`, list)));

  // buildings
  const buildings: string[] = [];
  for (const comp of components(grid, (c) => BUILDING.has(typeOf(c)))) {
    const name = buildingName(grid, comp);
    info.buildings.push({ name, grid, comp });
    buildings.push(buildingGroup(grid, comp, name, glows));
  }

  // overlays: things lying or standing on the ground (art only; the ground square stays put)
  const overlays = new Map<string, string[]>();
  const who = new Map<string, string>();
  for (const [n, p] of Object.entries<any>(g.npc_pos)) if (NPCS[n]?.where?.[0] === grid.name) who.set(`${p[0]},${p[1]}`, n);
  for (const [n, d] of Object.entries<any>(g.indoor_npcs || {})) if (d.map === grid.name) who.set(`${d.pos[0]},${d.pos[1]}`, n);
  for (const [x, y, c] of all) {
    if (!isOverlay(c.tag)) continue;
    const key = `${c.tag!.wx},${c.tag!.wy}`;
    let layer = 'objects';
    let name = (c.tag!.k || 'thing').replace(/^obj:/, '');
    if (c.tag!.ent) {
      layer = 'characters';
      name = c.tag!.ent === 'npc' ? `npc-${who.get(key) || c.o.ch}` : `${c.tag!.ent}-${c.o.ch}`;
    } else if (c.tag!.k === 'forage') {
      layer = 'forage';
      name = `forage-${g.forage[grid.name]?.[key] || c.o.ch}`;
    } else if (/^(crop:|soil)/.test(c.tag!.k || '')) {
      layer = 'crops';
      name = g.crops[key] ? `${g.crops[key][0]}-${c.tag!.k}` : c.tag!.k!;
    }
    const nodes = cellNodes(artOf(c.o, x * CW, y * CH), glows, x * CW, y * CH);
    if (!nodes.length) continue;
    const id = `${name}-${c.tag!.wx}-${c.tag!.wy}`;
    overlays.set(layer, [...(overlays.get(layer) || []), nodes.length === 1 ? nodes[0].replace(/^<(\w+)/, `<$1 id="${uid(id)}"`) : group(id, nodes)]);
  }

  const body = group(`map-${grid.name}`, [
    group('ground', ground),
    trees,
    flowers,
    fixtures,
    group('buildings', buildings),
    group('crops', overlays.get('crops') || []),
    group('objects', overlays.get('objects') || []),
    group('forage', overlays.get('forage') || []),
    group('characters', overlays.get('characters') || []),
  ]);
  return svgDoc(grid.w * CW, grid.h * CH, body, glows);
}

// ---------------------------------------------------------------- component sheets
/** Lay out pre-built items left to right with wrapping; each item is { svg, w, h, title } in px. */
function sheet(title: string, items: { svg: string; w: number; h: number; title: string }[], glows: Set<string>, maxW = 1500): string {
  const pad = 28;
  let x = pad;
  let y = 70;
  let rowH = 0;
  let W = 0;
  const out: string[] = [label(title, pad, 38, 22, '#00ffff', true, 'sheet-title')];
  for (const it of items) {
    const w = Math.max(it.w, it.title.length * 6.7 + 4);
    if (x + w > maxW && x > pad) {
      x = pad;
      y += rowH + 46;
      rowH = 0;
    }
    out.push(`<g transform="translate(${r2(x)} ${r2(y + 18)})">${it.svg}</g>`);
    out.push(label(it.title, x, y + 8, 11, '#c0c0c0', false, 'caption'));
    x += w + 24;
    W = Math.max(W, x);
    rowH = Math.max(rowH, it.h + 18);
  }
  return svgDoc(Math.max(W + pad - 24, 520), y + rowH + pad, out.join(''), glows);
}
/** A rectangular block of cells as a self-contained group (squares + art), drawn from (0,0). */
function blockGroup(grid: Grid, x0: number, y0: number, w: number, h: number, id: string, glows: Set<string>, split = false, bare = false): string {
  const cells: { x: number; y: number; bg: string }[] = [];
  const tex: Tex[] = [];
  const nodes: string[] = [];
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const c = grid.cells[y]?.[x];
      if (!c) continue;
      cells.push({ x, y, bg: c.o.bg });
      if (bare && isOverlay(c.tag)) continue;
      const art = artOf(c.o, (x - x0) * CW, (y - y0) * CH);
      tex.push(...art.tex);
      nodes.push(...cellNodes({ ...art, tex: [] }, glows, (x - x0) * CW, (y - y0) * CH));
    }
  return group(id, split ? [group(`${id}-square`, bgRects(cells, x0, y0)), group(`${id}-art`, [...texPaths(tex), ...nodes])] : [...bgRects(cells, x0, y0), ...texPaths(tex), ...nodes]);
}

// ---------------------------------------------------------------- engine-drawn UI (HUD, dialogs) as real text
/** Cells as editable text: runs of equal style per row become text layers; squares merge by colour. */
function uiGroup(frame: OutCell[][], x0: number, y0: number, w: number, h: number, id: string): string {
  const rects: { x: number; y: number; bg: string }[] = [];
  const texts: string[] = [];
  const shapes: string[] = [];
  for (let y = y0; y < y0 + h; y++) {
    const row = frame[y];
    if (!row) continue;
    const skip = new Set<number>();
    for (let x = x0; x < x0 + w; x++) {
      const o = row[x];
      if (!o) continue;
      rects.push({ x: x - x0, y: y - y0, bg: o.bg });
      if (o.label) {
        const size = PX * o.label.scale;
        texts.push(label(o.label.text, (x - x0) * CW, (y - y0) * CH + (o.label.h * CH) / 2 + K * size, r2(size) as any, hex(o.fg), o.bold, `${id}-heading-${o.label.text}`));
        for (let k = 0; k < o.label.w; k++) skip.add(x + k);
      }
    }
    for (let x = x0; x < x0 + w; ) {
      const o = row[x];
      if (!o || skip.has(x) || o.ch === ' ' || o.label) {
        x++;
        continue;
      }
      if (o.meter) {
        let j = x;
        while (j < x0 + w && row[j]?.meter && row[j].fg === o.fg) j++;
        shapes.push(`<rect id="${uid(`${id}-meter`)}" x="${(x - x0) * CW}" y="${r2((y - y0) * CH + CH * 0.4)}" width="${(j - x) * CW}" height="${Math.max(2, Math.round(CH * 0.2))}" fill="${hex(o.fg)}"/>`);
        x = j;
        continue;
      }
      // a run: same colour and weight; single spaces inside a run are kept
      let j = x;
      let str = '';
      while (j < x0 + w && row[j] && !row[j].meter && !row[j].label && !skip.has(j)) {
        const c = row[j];
        if (c.ch === ' ') {
          const next = row[j + 1];
          if (!next || next.ch === ' ' || next.fg !== o.fg || next.bold !== o.bold || next.meter || next.label) break;
          str += ' ';
          j++;
          continue;
        }
        if (c.fg !== o.fg || c.bold !== o.bold) break;
        str += c.ch;
        j++;
      }
      texts.push(label(str, (x - x0) * CW, (y - y0) * CH + CH / 2 + 1 + K * PX, PX, hex(o.fg), o.bold, `${id}-text-${str.trim().slice(0, 18)}`));
      x = j;
    }
  }
  return group(id, [group(`${id}-fill`, bgRects(rects)), ...shapes, ...texts]);
}

// ---------------------------------------------------------------- everything
(window as any).buildAssets = async () => {
  await Promise.all([document.fonts.load(`${PX}px ${FONT}`), document.fonts.load(`bold ${PX}px ${FONT}`)]);
  {
    const c = document.createElement('canvas').getContext('2d')!;
    c.font = `100px ${FONT}`;
    c.textBaseline = 'alphabetic';
    const a = c.measureText('H').actualBoundingBoxAscent;
    c.textBaseline = 'middle';
    K = (a - c.measureText('H').actualBoundingBoxAscent) / 100;
  }
  newGame();
  const info: MapInfo = { buildings: [] };
  const grids: Record<string, Grid> = {};
  const data: Record<string, unknown> = {};
  const names = Object.keys(g.maps);
  for (const name of names) {
    const m = g.maps[name];
    const grid = capture(name);
    const empty = (grids[name] = captureEmpty(name));
    const dir = m.indoor ? 'maps/interiors' : 'maps';
    files[`${dir}/${name}.svg`] = mapSvg(grid, info, empty);
    files[`${dir}/png/${name}@2x.png`] = paint(empty, 2);
    data[name] = { title: m.title, indoor: !!m.indoor, w: m.w, h: m.h, tiles: m.t, doors: m.doors, warps: m.warps, deco: m.deco, forage: g.forage[name] || {}, objects: g.objs[name] || {} };
  }
  files['data/maps.json'] = JSON.stringify({ cell: { width: CW, height: CH, glyphPx: PX }, maps: data }, null, 1);

  // ---- world layout: every outdoor area as one movable picture, with the paths between them
  {
    usedIds.clear();
    const G = 2;
    const PLACE: Record<string, [number, number, string]> = {
      ridge: [0, -52 - 2 * G, 'SKYLINE RIDGE'], mountain: [0, -26 - G, "MOTHER'S HILL"], farm: [-64 - G, 0, 'YOUR FARM'], town: [0, 0, 'MINERAL TOWN'],
      river: [72 + G, 0, 'WILLOW BEND'], woods: [-64 - G, 28 + G, 'CEDAR HOLLOW'], beach: [4, 32 + G, 'BEACH'], point: [4 + 64 + G, 32 + G, 'LIGHTHOUSE POINT'],
    };
    const minX = -64 - G - 3;
    const minY = -52 - 2 * G - 4;
    const px = (t: number) => (t - minX) * CW;
    const py = (t: number) => (t - minY) * CH;
    const parts: string[] = [];
    const links: string[] = [];
    for (const [name, [x, y, title]] of Object.entries(PLACE)) {
      const grid = grids[name];
      parts.push(
        group(`area-${name}`, [
          `<image id="${uid(`${name}-picture`)}" x="${px(x)}" y="${py(y)}" width="${grid.w * CW}" height="${grid.h * CH}" href="${paint(grid, 1)}"/>`,
          `<rect id="${uid(`${name}-frame`)}" x="${px(x)}" y="${py(y)}" width="${grid.w * CW}" height="${grid.h * CH}" fill="none" stroke="#404040"/>`,
          label(`${title}  ${grid.w}×${grid.h}`, px(x) + 4, py(y) - 8, 20, '#ffffff', true, `${name}-title`),
        ]),
      );
      for (const [k, w] of Object.entries<any>(g.maps[name].warps)) {
        const dest = PLACE[w[0]];
        if (!dest || name > w[0]) continue;
        const [wx, wy] = k.split(',').map(Number);
        const [ax, ay, bx, by] = [px(x + wx + 0.5), py(y + wy + 0.5), px(dest[0] + w[1] + 0.5), py(dest[1] + w[2] + 0.5)];
        links.push(
          Math.abs(ax - bx) > Math.abs(ay - by)
            ? `<rect id="${uid(`path-${name}-${w[0]}`)}" x="${r2(Math.min(ax, bx))}" y="${r2(ay - CH * 0.3)}" width="${r2(Math.abs(ax - bx))}" height="${r2(CH * 0.6)}" fill="#00ffff"/>`
            : `<rect id="${uid(`path-${name}-${w[0]}`)}" x="${r2(ax - CW * 0.35)}" y="${r2(Math.min(ay, by))}" width="${r2(CW * 0.7)}" height="${r2(Math.abs(ay - by))}" fill="#00ffff"/>`,
        );
      }
    }
    const W = (72 + G + 64 + 64 + G + 6) * CW;
    const H = (52 + 2 * G + 32 + G + 24 + 7) * CH;
    files['maps/world-layout.svg'] = svgDoc(W, H, group('world', [group('areas', parts), group('paths-between-areas', links), label('HRVSTMN — the valley', 36, 44, 30, '#00ffff', true, 'world-title')]), new Set());
  }

  // ---- buildings sheet
  {
    usedIds.clear();
    const glows = new Set<string>();
    const items = info.buildings.map((b) => {
      const bb = bounds(b.comp);
      return { svg: buildingGroup(b.grid, b.comp, b.name, glows, bb.x0, bb.y0), w: (bb.x1 - bb.x0 + 1) * CW, h: (bb.y1 - bb.y0 + 1) * CH, title: `${b.name} · ${g.maps[b.grid.name].title} · ${bb.x1 - bb.x0 + 1}×${bb.y1 - bb.y0 + 1}` };
    });
    files['components/buildings.svg'] = sheet('HRVSTMN — buildings (each one is a group: fill, roof texture, wall texture, details, name)', items, glows);
  }

  // ---- tiles sheet: a sample block of every terrain and fixture, straight from the maps
  {
    usedIds.clear();
    const glows = new Set<string>();
    const items: { svg: string; w: number; h: number; title: string }[] = [];
    const seen = new Set<string>();
    for (const name of names) {
      const grid = grids[name];
      const types = new Set<string>();
      for (const row of grid.cells) for (const c of row) types.add(typeOf(c));
      for (const t of types) {
        if (seen.has(t) || BUILDING.has(t) || t === 'void') continue;
        const want = AREA.has(t) || PER_CELL.has(t) ? [6, 3] : [1, 1];
        let best: [number, number, number, number] | null = null;
        const fits = (x: number, y: number, w: number, h: number) => {
          for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!grid.cells[yy]?.[xx] || typeOf(grid.cells[yy][xx]) !== t || isOverlay(grid.cells[yy][xx].tag)) return false;
          return true;
        };
        for (const [w, h] of [want, [4, 2], [3, 1], [2, 1], [1, 1]] as [number, number][]) {
          for (let y = 0; y < grid.h && !best; y++) for (let x = 0; x < grid.w && !best; x++) if (fits(x, y, w, h)) best = [x, y, w, h];
          if (best) break;
        }
        if (!best) continue;
        if (!AREA.has(t) && !PER_CELL.has(t)) {
          // fixtures: take the whole connected piece
          const comp = components(grid, (c) => typeOf(c) === t).find((cp) => cp.some(([x, y]) => x === best![0] && y === best![1]))!;
          const bb = bounds(comp);
          best = [bb.x0, bb.y0, bb.x1 - bb.x0 + 1, bb.y1 - bb.y0 + 1];
        }
        seen.add(t);
        items.push({ svg: blockGroup(grid, best[0], best[1], best[2], best[3], `tile-${t}`, glows, true, true), w: best[2] * CW, h: best[3] * CH, title: `${t} (${g.maps[name].title})` });
      }
    }
    files['components/tiles.svg'] = sheet('HRVSTMN — terrain and fixtures (each sample: a square group and an art group)', items, glows);
  }

  // ---- objects, forage, crops and characters: staged on the farm, then lifted cell by cell
  {
    newGame();
    usedIds.clear();
    const glows = new Set<string>();
    const farm = g.maps.farm;
    const free: [number, number][] = [];
    for (let y = 10; y < 26; y += 2) for (let x = 4; x < 60; x += 2) if (farm.tile(x, y) === 'field') free.push([x, y]);
    g.objs.farm = {};
    g.forage.farm = {};
    let i = 0;
    const named = new Map<string, string>();
    const put = (title: string): [number, number] => {
      const p = free[i++];
      named.set(`${p[0]},${p[1]}`, title);
      return p;
    };
    for (const kind of ['weed', 'stone', 'branch', 'stump', 'boulder', 'dig', 'starrock']) g.objs.farm[put(`object · ${kind}`).join(',')] = kind;
    const forageItems = new Set<string>();
    for (const m of Object.keys(g.forage)) for (const it of Object.values<string>(g.forage[m] || {})) forageItems.add(it);
    for (const s of ['Spring', 'Summer', 'Fall', 'Winter']) for (const m of ['mountain', 'beach', 'woods', 'ridge', 'river', 'point']) { g.season = ['Spring', 'Summer', 'Fall', 'Winter'].indexOf(s); for (const it of g.forage_pool(m)) forageItems.add(it); }
    g.season = 0;
    for (const it of [...forageItems].sort()) g.forage.farm[put(`forage · ${it}`).join(',')] = it;
    const objGrid = capture('farm');
    const lift = (grid: Grid, prefix: string) => {
      const items: { svg: string; w: number; h: number; title: string }[] = [];
      for (let y = 0; y < grid.h; y++)
        for (let x = 0; x < grid.w; x++) {
          const c = grid.cells[y][x];
          const title = named.get(`${c.tag?.wx},${c.tag?.wy}`);
          if (!title || !title.startsWith(prefix)) continue;
          items.push({ svg: blockGroup(grid, x, y, 1, 1, title.replace(/ · /g, '-'), glows, true), w: CW, h: CH, title: title.replace(`${prefix} · `, '') });
        }
      return items;
    };
    files['components/objects-and-forage.svg'] = sheet('HRVSTMN — field objects and forage (square + art; drop the art onto any ground)', [...lift(objGrid, 'object'), ...lift(objGrid, 'forage')], glows);

    // crops: every crop at four ages on dry soil, plus bare and watered soil
    newGame();
    usedIds.clear();
    glows.clear();
    named.clear();
    i = 0;
    g.objs.farm = {};
    const stages: [string, (len: number) => number][] = [['seed', () => 0], ['sprout', () => 1], ['young', (n) => Math.max(2, Math.ceil(n / 2))], ['ripe', (n) => n]];
    for (const crop of Object.keys(CROPS)) {
      for (const [stage, age] of stages) {
        const p = put(`crop · ${crop} · ${stage}`);
        g.tilled.add(p.join(','));
        g.crops[p.join(',')] = [crop, age(CROPS[crop][2])];
      }
    }
    const dry = put('crop · tilled soil');
    g.tilled.add(dry.join(','));
    const wet = put('crop · watered soil');
    g.tilled.add(wet.join(','));
    g.wet.add(wet.join(','));
    files['components/crops.svg'] = sheet('HRVSTMN — crops at four ages, and soil', lift(capture('farm'), 'crop'), glows);

    // characters: the player in each condition, pets, livestock and every villager
    newGame();
    usedIds.clear();
    glows.clear();
    named.clear();
    i = 0;
    g.objs.farm = {};
    const chars: { svg: string; w: number; h: number; title: string }[] = [];
    const shoot = (title: string, setup: () => void, pos: [number, number]) => {
      newGame();
      g.objs.farm = {};
      setup();
      const grid = capture('farm', pos);
      for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) if (grid.cells[y][x].tag?.wx === pos[0] && grid.cells[y][x].tag?.wy === pos[1]) chars.push({ svg: blockGroup(grid, x, y, 1, 1, title.replace(/[ ·]+/g, '-'), glows, true), w: CW, h: CH, title });
    };
    const spot: [number, number] = free[40];
    shoot('player', () => {}, spot);
    shoot('player · tired', () => (g.stamina = Math.floor(g.max_stamina * 0.4)), spot);
    shoot('player · worn out', () => (g.stamina = Math.floor(g.max_stamina * 0.1)), spot);
    shoot('player · exhausted', () => (g.fatigue = 90), spot);
    shoot('player · riding', () => (g.riding_horse = true), spot);
    newGame();
    g.objs.farm = {};
    g.chickens = 1;
    g.animals = [{ kind: 'cow', name: 'Bess', aff: 40 }, { kind: 'sheep', name: 'Wool', aff: 40 }];
    g.animals_grazing = true;
    const everyone = Object.keys(NPCS).filter((n) => NPCS[n].g);
    const saved = everyone.map((n) => NPCS[n].where);
    g.npc_pos = {};
    everyone.forEach((n, k) => {
      const p = free[60 + k];
      NPCS[n].where = ['farm', p[0], p[1]];
      g.npc_pos[n] = p;
    });
    const crowd = capture('farm');
    everyone.forEach((n, k) => (NPCS[n].where = saved[k]));
    for (let y = 0; y < crowd.h; y++)
      for (let x = 0; x < crowd.w; x++) {
        const c = crowd.cells[y][x];
        if (!c.tag?.ent) continue;
        const n = everyone.find((nm) => g.npc_pos[nm][0] === c.tag!.wx && g.npc_pos[nm][1] === c.tag!.wy);
        const title = n ? `villager · ${n}` : c.tag.ent === 'pet' ? (c.o.ch === '♞' || c.tag.wx === 25 ? 'pet · horse' : 'pet · dog') : `livestock · ${c.o.ch}`;
        if (chars.some((ch) => ch.title === title)) continue;
        chars.push({ svg: blockGroup(crowd, x, y, 1, 1, title.replace(/[ ·]+/g, '-'), glows, true), w: CW, h: CH, title });
      }
    files['components/characters.svg'] = sheet('HRVSTMN — characters (square + token art)', chars, glows);
  }

  // ---- engine-drawn UI: the status panel, the message bar, a dialog and the in-game menu
  {
    newGame();
    usedIds.clear();
    const ui = new Screen(107, 30);
    ui.hires = true;
    ui.reducedMotion = true;
    const u = new Game(ui, true) as any;
    u.new_game('Pete', 'Moon');
    u.minutes = 6 * 60 + 30;
    u.weather = 'Sunny';
    u.mapname = 'farm';
    [u.px, u.py] = [14, 12];
    u.msg('Welcome to Mineral Town! Use Arrows/WASD to move, SPACE to use tool, X to act.', '0B');
    u.render();
    let frame = computeFrame(ui, 0);
    const divX = ui.ctx!.divX!;
    const divY = ui.ctx!.divY!;
    const blocks: { svg: string; w: number; h: number; title: string }[] = [];
    blocks.push({ svg: uiGroup(frame, divX, 0, ui.w - divX, divY, 'status-panel'), w: (ui.w - divX) * CW, h: divY * CH, title: 'status panel (right side of the screen)' });
    blocks.push({ svg: uiGroup(frame, 0, divY, ui.w, ui.h - divY, 'message-bar'), w: ui.w * CW, h: (ui.h - divY) * CH, title: 'message bar (bottom rows)' });
    const modal = async (title: string, id: string, open: () => Promise<unknown>, close: string) => {
      u.render();
      const before = computeFrame(ui, 0);
      const p = open();
      await new Promise((r) => setTimeout(r, 60));
      frame = computeFrame(ui, 0);
      // the dialog is the box the engine tagged: top-left corner to bottom-right corner
      void before;
      let [x0, y0, x1, y1] = [ui.w, ui.h, -1, -1];
      for (let y = 0; y < ui.h; y++) for (let x = 0; x < ui.w; x++) { const k = (ui.tags[y][x] as Tag)?.k; if (k === 'box:tl') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); } if (k === 'box:br') { x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
      if (x1 >= 0) blocks.push({ svg: uiGroup(frame, x0, y0, x1 - x0 + 1, y1 - y0 + 1, id), w: (x1 - x0 + 1) * CW, h: (y1 - y0 + 1) * CH, title });
      for (let k = 0; k < 4; k++) ui.pushKey(close);
      await Promise.race([p, new Promise((r) => setTimeout(r, 400))]);
    };
    await modal('dialog (a villager speaking)', 'dialog', () => u.say('Good morning! The turnips are coming in nicely. Come by the square later.', 'Ann'), 'space');
    await modal('in-game menu (Diary & Pause)', 'diary-menu', () => u.pause_menu(), 'esc');
    files['ui/ui-in-game.svg'] = sheet('HRVSTMN — in-game UI drawn on the text grid (real, editable text)', blocks, new Set(), 1400);
  }

  // ---- palette
  {
    usedIds.clear();
    const NAMES = ['black', 'grey 1', 'grey 2', 'grey 3', 'grey 4', 'grey 5 (text)', 'grey 6', 'white', 'red', 'orange', 'pink', 'green', 'cyan', 'blue', 'purple', 'indigo'];
    const keys = Object.keys(PALETTE).filter((k) => /^0[0-9A-F]$/.test(k)).sort();
    const sw = keys.map((k, n) => {
      const x = 28 + (n % 8) * 150;
      const y = 70 + Math.floor(n / 8) * 150;
      return group(`swatch-base${k}`, [
        `<rect x="${x}" y="${y}" width="130" height="84" fill="#${PALETTE[k]}" stroke="#404040"/>`,
        label(`base${k}`, x, y + 104, 13, '#ffffff', true, `name-base${k}`),
        label(`#${PALETTE[k]}  ${NAMES[n] ?? ''}`, x, y + 122, 11, '#c0c0c0', false, `hex-base${k}`),
      ]);
    });
    files['palette/isotope-dark.svg'] = svgDoc(28 * 2 + 8 * 150 - 20, 70 + 2 * 150 + 10, label('HRVSTMN — base16 Isotope Dark', 28, 38, 22, '#00ffff', true, 'palette-title') + sw.join(''), new Set());
    const tokens: Record<string, unknown> = { $description: 'HRVSTMN colours: base16 Isotope Dark. Import in Figma: Variables > Import (design tokens JSON).' };
    const color: Record<string, unknown> = {};
    keys.forEach((k, n) => (color[`base${k}`] = { $type: 'color', $value: `#${PALETTE[k]}`, $description: NAMES[n] ?? '' }));
    tokens.color = color;
    tokens.ui = {
      background: { $type: 'color', $value: `#${PALETTE['00']}` }, text: { $type: 'color', $value: `#${PALETTE['05']}` }, 'text-strong': { $type: 'color', $value: `#${PALETTE['07']}` },
      'text-muted': { $type: 'color', $value: `#${PALETTE['03']}` }, border: { $type: 'color', $value: `#${PALETTE['02']}` }, 'button-fill': { $type: 'color', $value: `#${PALETTE['01']}` },
      primary: { $type: 'color', $value: `#${PALETTE['0C']}` }, 'on-primary': { $type: 'color', $value: `#${PALETTE['00']}` }, checked: { $type: 'color', $value: `#${PALETTE['0B']}` },
      warning: { $type: 'color', $value: `#${PALETTE['09']}` }, danger: { $type: 'color', $value: `#${PALETTE['08']}` },
    };
    tokens.grid = { 'cell-width': { $type: 'number', $value: CW }, 'cell-height': { $type: 'number', $value: CH }, 'glyph-size': { $type: 'number', $value: PX } };
    files['palette/hrvstmn.tokens.json'] = JSON.stringify(tokens, null, 2);
  }
  void ITEMS;
  return { files, missing: [...missing], K };
};
