import { TILES, INTERIOR_LAYOUTS, INTERIOR_LEGEND, BUILDINGS, pkey } from './constants';
import prebuiltMaps from './prebuilt_maps.json';
import { py_rng } from './runtime_helpers';

export class GameMap {
  name: string;
  title: string;
  w: number;
  h: number;
  indoor: boolean;
  t: string[][];
  doors: Record<string, string>;
  warps: Record<string, [string, number, number, [number, number]]>;
  signs: Record<string, string>;
  deco: Record<string, [string, string]>;

  constructor(name: string, title: string, w: number, h: number, fill = 'grass', indoor = false) {
    this.name = name;
    this.title = title;
    this.w = w;
    this.h = h;
    this.indoor = indoor;
    this.t = Array.from({ length: h }, () => Array(w).fill(fill));
    this.doors = {};
    this.warps = {};
    this.signs = {};
    this.deco = {};
  }

  inb(x: number, y: number): boolean {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  inside(x: number, y: number): boolean {
    return this.inb(x, y);
  }

  set(x: number, y: number, t: string) {
    if (this.inb(x, y)) {
      this.t[y][x] = t;
    }
  }

  tile(x: number, y: number): string {
    return this.inb(x, y) ? this.t[y][x] : 'void';
  }

  rect(x: number, y: number, w: number, h: number, t: string) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x + dx, y + dy, t);
      }
    }
  }

  border(t = 'tree') {
    for (let x = 0; x < this.w; x++) {
      this.set(x, 0, t);
      this.set(x, this.h - 1, t);
    }
    for (let y = 0; y < this.h; y++) {
      this.set(0, y, t);
      this.set(this.w - 1, y, t);
    }
  }

  building(x: number, y: number, w: number, h: number, door_dx: number, door_id: string, label?: string, roof_col?: string) {
    this.rect(x, y, w, 2, 'roof');
    if (roof_col) {
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < w; dx++) {
          this.deco[pkey(x + dx, y + dy)] = ['^', roof_col];
        }
      }
    }
    this.rect(x, y + 2, w, h - 2, 'wall');
    const dy = y + h - 1;
    const dx = x + door_dx;
    this.set(dx, dy, 'door');
    this.doors[pkey(dx, dy)] = door_id;
    if (label && w >= label.length + 2) {
      const lx = x + Math.floor((w - label.length) / 2);
      for (let i = 0; i < label.length; i++) {
        this.deco[pkey(lx + i, y + 2)] = [label[i], '07'];
      }
    }
  }

  near(x: number, y: number, kinds: string[], r = 1): boolean {
    const kset = new Set(kinds);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (kset.has(this.tile(x + dx, y + dy))) return true;
      }
    }
    return false;
  }

  static fromPrebuilt(key: 'farm' | 'town' | 'mountain' | 'house'): GameMap {
    const raw = (prebuiltMaps as any)[key];
    const m = new GameMap(raw.name, raw.title, raw.w, raw.h, 'grass', raw.indoor);
    m.t = raw.t.map((r: string[]) => [...r]);
    m.doors = { ...raw.doors };
    m.warps = {};
    for (const [k, v] of Object.entries(raw.warps)) {
      m.warps[k] = v as [string, number, number, [number, number]];
    }
    m.signs = { ...raw.signs };
    m.deco = {};
    for (const [k, v] of Object.entries(raw.deco)) {
      m.deco[k] = v as [string, string];
    }
    return m;
  }
}

export function build_farm(): GameMap {
  const m = GameMap.fromPrebuilt('farm');
  // Add Honey & Apple Tree next to Farmhouse
  m.set(7, 6, 'tree');
  m.signs[pkey(7, 6)] = 'honey_tree';
  // Add Doghouse & Horse Stable
  m.set(22, 6, 'doghouse');
  m.signs[pkey(22, 6)] = 'doghouse';
  m.set(24, 6, 'stable');
  m.signs[pkey(24, 6)] = 'stable';
  // Add Water Mill next to Chicken Coop to grind Corn into 30 Chicken Feed
  m.set(35, 6, 'mill');
  m.signs[pkey(35, 6)] = 'mill';
  return m;
}

export function build_town(): GameMap {
  const m = GameMap.fromPrebuilt('town');
  // Mineral Town Museum, between the blacksmith and the library on the north row.
  m.building(28, 2, 8, 5, 4, 'museum', 'MUSEUM', '0C');
  // Add Harvest Sprite Hut behind the Church in NE area (below Church at y=9..12 so Church at y=2..6 is untouched)
  m.building(61, 9, 9, 4, 4, 'sprites', 'SPRITES', '0A');
  m.rect(61, 7, 2, 2, 'path');
  m.rect(61, 13, 5, 1, 'path');
  // Add Aja Winery in NW area with cobblestone alley to the street
  m.building(3, 9, 9, 4, 4, 'winery', 'WINERY', '0E');
  m.rect(15, 7, 1, 13, 'path');
  m.rect(7, 13, 9, 1, 'path');
  // Add Rose Square Trash Can & Plaza Sign
  m.set(30, 11, 'trash');
  m.signs[pkey(30, 11)] = 'trash';
  m.set(30, 15, 'sign');
  m.signs[pkey(30, 15)] = 'Rose Square — Drop litter in the Trash Can (U) north of the plaza!';
  m.set(42, 10, 'sign');
  m.signs[pkey(42, 10)] = 'request_board';
  // Add South path & bridge across the river to Mineral Beach (warp only at the south border y=31!)
  m.rect(35, 21, 3, 7, 'path');
  m.rect(35, 28, 3, 2, 'bridge');
  m.rect(35, 30, 3, 2, 'path');
  for (const x of [35, 36, 37]) {
    m.warps[pkey(x, m.h - 1)] = ['beach', 32, 2, [0, 1]];
  }
  return m;
}

export function build_mountain(): GameMap {
  const m = GameMap.fromPrebuilt('mountain');
  // Hot Spring pool in SW Mother's Hill (soak to recover Stamina & Fatigue, or toss Egg for Spa-Boiled Egg!)
  m.rect(6, 16, 5, 3, 'spring');
  m.set(5, 17, 'sign');
  m.signs[pkey(5, 17)] = 'Hot Spring — Step in or press X to soak (+Stamina, -Fatigue). Hold an Egg and press X to make a Spa-Boiled Egg!';

  // Goddess Pond waterfall next to Spring Mine entrance
  m.rect(45, 7, 3, 2, 'pond');
  m.set(44, 8, 'sign');
  m.signs[pkey(44, 8)] = 'Goddess Pond — Hold an item and press X facing the pond to make an offering to the Harvest Goddess!';

  // Lake Mine island in the middle of Mother's Hill Lake (surrounded by water; freezes in Winter!)
  m.rect(14, 8, 3, 2, 'grass');
  m.set(15, 8, 'cave');
  m.doors[pkey(15, 8)] = 'lakemine';
  m.set(15, 15, 'sign');
  m.signs[pkey(15, 15)] = "Mother's Hill Lake — Freezes over in Winter so you can cross to the Lake Mine! (Or toss a Cucumber to summon Kappa!)";
  return m;
}

export function build_beach(): GameMap {
  const m = new GameMap('beach', 'Mineral Beach', 64, 24, 'sand');
  m.border('tree');
  // North exit back to Town
  m.rect(31, 0, 4, 4, 'path');
  for (const x of [31, 32, 33, 34]) {
    m.warps[pkey(x, 0)] = ['town', 36, 30, [0, -1]];
  }
  // Ocean water along bottom
  m.rect(1, 17, 62, 6, 'water');
  // Wooden Fishing & Fireworks Pier jutting into the sea
  m.rect(31, 4, 3, 16, 'bridge');
  m.set(30, 12, 'sign');
  m.signs[pkey(30, 12)] = 'Mineral Beach Pier — Fish in the ocean or watch the Summer 24 Fireworks!';
  // Zack & Won's Beach House
  m.building(10, 5, 10, 5, 5, 'zack', 'ZACK/WON', '0D');
  m.rect(15, 10, 2, 3, 'path');
  // Kai's Seaside Lodge
  m.building(42, 5, 10, 5, 5, 'kai_shack', 'SEASIDE', '09');
  m.rect(47, 10, 2, 3, 'path');
  return m;
}

// ---------------------------------------------------------------- outer regions
// Four original regions spread the valley out around the first four maps:
//   Skyline Ridge (north of Mother's Hill), Willow Bend (east of town),
//   Cedar Hollow (south of the farm) and Lighthouse Point (east of the beach).

/** Deterministic 0..1 noise for laying out a region (same world every game). */
function layoutNoise(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Link two maps through a 3-wide opening: stepping onto `a`'s edge cells lands just inside `b`, and back. */
function link(a: GameMap, b: GameMap, side: 'n' | 's' | 'e' | 'w', at: number, bAt: number): void {
  for (let i = 0; i < 3; i++) {
    const [ax, ay, bx, by] =
      side === 's' ? [at + i, a.h - 1, bAt + i, 0] :
      side === 'n' ? [at + i, 0, bAt + i, b.h - 1] :
      side === 'e' ? [a.w - 1, at + i, 0, bAt + i] :
      [0, at + i, b.w - 1, bAt + i];
    a.set(ax, ay, 'path');
    b.set(bx, by, 'path');
    const inA: [number, number] = side === 's' ? [0, -1] : side === 'n' ? [0, 1] : side === 'e' ? [-1, 0] : [1, 0];
    a.set(ax + inA[0], ay + inA[1], 'path');
    b.set(bx - inA[0], by - inA[1], 'path');
    a.warps[pkey(ax, ay)] = [b.name, bx - inA[0], by - inA[1], [-inA[0], -inA[1]]];
    b.warps[pkey(bx, by)] = [a.name, ax + inA[0], ay + inA[1], inA];
  }
}

/** Cedar Hollow: dense woods south of the farm, a creek with a footbridge and a mossy clearing. */
export function build_woods(): GameMap {
  const m = new GameMap('woods', 'Cedar Hollow', 64, 26, 'grass');
  for (let y = 1; y < m.h - 1; y++) {
    for (let x = 1; x < m.w - 1; x++) if (layoutNoise(x, y, 1) < 0.34) m.set(x, y, 'tree');
  }
  m.border('tree');
  // the creek
  for (let x = 1; x < m.w - 1; x++) {
    const cy = 12 + Math.round(1.5 * Math.sin(x / 5));
    m.rect(x, cy, 1, 2, 'water');
  }
  // a winding trail from the farm gate down to the clearing, on a footbridge over the creek
  for (let y = 0; y < 20; y++) {
    const cx = 31 + Math.round(5 * Math.sin(y / 3.2));
    for (let x = cx - 1; x <= cx + 1; x++) m.set(x, y, m.tile(x, y) === 'water' ? 'bridge' : 'path');
  }
  m.rect(31, 19, 16, 2, 'path');
  // the clearing, with a mossy pond and wildflowers
  m.rect(40, 17, 18, 7, 'grass');
  m.rect(48, 19, 5, 2, 'pond');
  for (let y = 17; y < 24; y++) for (let x = 40; x < 58; x++) if (m.tile(x, y) === 'grass' && layoutNoise(x, y, 2) < 0.08) m.set(x, y, 'flower');
  m.set(33, 2, 'sign');
  m.signs[pkey(33, 2)] = 'Cedar Hollow — Fallen branches gather here every morning. Bring an Axe!';
  return m;
}

/** Skyline Ridge: switchbacks through two cliff bands up to a lookout and a mountain tarn. */
export function build_ridge(): GameMap {
  const m = new GameMap('ridge', 'Skyline Ridge', 64, 26, 'grass');
  for (let y = 1; y < m.h - 1; y++) {
    for (let x = 1; x < m.w - 1; x++) {
      const n = layoutNoise(x, y, 3);
      if (n < 0.12) m.set(x, y, 'tree');
      else if (n > 0.95) m.set(x, y, 'flower');
    }
  }
  m.border('tree');
  // two cliff bands, each with one gap for the trail
  m.rect(1, 16, 62, 2, 'cliff');
  m.rect(1, 8, 62, 2, 'cliff');
  m.rect(49, 16, 3, 2, 'path');
  m.rect(12, 8, 3, 2, 'path');
  // the switchback trail
  m.rect(20, 18, 3, 8, 'path');
  m.rect(20, 18, 32, 2, 'path');
  m.rect(49, 10, 3, 8, 'path');
  m.rect(12, 10, 40, 2, 'path');
  m.rect(12, 3, 3, 7, 'path');
  m.rect(12, 3, 22, 2, 'path');
  // the lookout and a cold tarn
  m.rect(30, 2, 6, 4, 'path');
  m.rect(44, 2, 8, 4, 'water');
  m.set(33, 6, 'sign');
  m.signs[pkey(33, 6)] = 'Skyline Ridge Lookout — On a clear day you can see the whole valley, from the farm to the sea.';
  return m;
}

/** Willow Bend: a slow river east of town with a road bridge, a fishing dock and a meadow. */
export function build_river(): GameMap {
  const m = new GameMap('river', 'Willow Bend', 64, 26, 'grass');
  for (let y = 1; y < m.h - 1; y++) {
    for (let x = 1; x < m.w - 1; x++) {
      const n = layoutNoise(x, y, 4);
      if (n < 0.1) m.set(x, y, 'tree');
      else if (n > 0.93) m.set(x, y, 'flower');
    }
  }
  m.border('tree');
  for (let y = 1; y < m.h - 1; y++) {
    const cx = 36 + Math.round(5 * Math.sin(y / 4.5));
    m.rect(cx, y, 5, 1, 'water');
  }
  // the road from town crosses on a bridge
  for (let x = 0; x < m.w - 6; x++) {
    for (let y = 11; y < 14; y++) m.set(x, y, m.tile(x, y) === 'water' ? 'bridge' : 'path');
  }
  // a fishing dock on the far bank
  for (let y = 18; y < 22; y++) {
    const cx = 36 + Math.round(5 * Math.sin(y / 4.5));
    m.set(cx + 4, y, 'bridge');
    m.set(cx + 5, y, 'path');
  }
  m.set(28, 10, 'sign');
  m.signs[pkey(28, 10)] = 'Willow Bend — The river runs slow and deep here. Good fishing off the east-bank dock.';
  return m;
}

/** Lighthouse Point: a rocky headland east of the beach with tide pools and the old lighthouse. */
export function build_point(): GameMap {
  const m = new GameMap('point', 'Lighthouse Point', 64, 24, 'sand');
  m.border('tree');
  m.rect(1, 17, 62, 6, 'water');
  m.rect(54, 1, 9, 22, 'water');
  // rocks along the shore, and tide pools among them
  for (let y = 1; y < 23; y++) {
    for (let x = 1; x < 63; x++) {
      if (m.tile(x, y) !== 'sand') continue;
      const coast = m.near(x, y, ['water'], 1);
      const n = layoutNoise(x, y, 5);
      if (coast && n < 0.3) m.set(x, y, 'cliff');
      else if (n > 0.975) m.set(x, y, 'pond');
    }
  }
  // the old lighthouse on the headland (closed up: no door)
  m.rect(46, 3, 4, 2, 'roof');
  m.rect(46, 5, 4, 6, 'wall');
  m.deco[pkey(47, 7)] = ['=', '0C'];
  m.rect(1, 11, 52, 3, 'path');
  m.set(45, 12, 'sign');
  m.signs[pkey(45, 12)] = 'Lighthouse Point — The keeper left years ago, but the light still turns on stormy nights.';
  return m;
}

/** Open the edges between the first four maps and the outer regions. */
export function link_regions(maps: Record<string, GameMap>): void {
  link(maps.farm, maps.woods, 's', 30, 30);
  link(maps.mountain, maps.ridge, 'n', 20, 20);
  link(maps.town, maps.river, 'e', 11, 11);
  link(maps.beach, maps.point, 'e', 11, 11);
}

export function build_house(): GameMap {
  return GameMap.fromPrebuilt('house');
}

export function build_mine(floor: number, objs: Record<string, Record<string, string>>, mineType: 'spring' | 'lake' = 'spring'): GameMap {
  const titlePrefix = mineType === 'lake' ? 'Lake Mine' : 'Spring Mine';
  const m = new GameMap('mine', `${titlePrefix} B${floor}F`, 25, 15, 'mfloor', true);
  m.border('mwall');
  const rng = py_rng();
  for (let i = 0; i < 18; i++) {
    const x = rng.randint(2, m.w - 3);
    const y = rng.randint(2, m.h - 3);
    m.set(x, y, 'mwall');
  }
  const [ux, uy] = [3, 2];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (m.inb(ux + dx, uy + dy)) {
        m.set(ux + dx, uy + dy, 'mfloor');
      }
    }
  }
  m.set(ux, uy, 'up');

  // Lake Mine Floor 9 has an underground pond where the Coelacanth King Fish lives!
  if (mineType === 'lake' && floor === 9) {
    m.rect(10, 5, 5, 4, 'water');
  }

  let [dx, dy] = [m.w - 4, m.h - 3];
  for (let tries = 0; tries < 50; tries++) {
    const tx = rng.randint(4, m.w - 3);
    const ty = rng.randint(3, m.h - 3);
    if (m.tile(tx, ty) === 'mfloor' && Math.abs(tx - ux) + Math.abs(ty - uy) > 6) {
      dx = tx;
      dy = ty;
      break;
    }
  }
  if (floor < 255) {
    m.set(dx, dy, 'down');
  }

  const mobjs: Record<string, string> = {};
  if (floor < 255) {
    mobjs[pkey(dx, dy)] = 'rock';
  }
  const nrocks = Math.min(45, 22 + Math.floor(floor / 5));
  for (let i = 0; i < nrocks; i++) {
    const x = rng.randint(2, m.w - 3);
    const y = rng.randint(2, m.h - 3);
    if (m.tile(x, y) === 'mfloor' && !(x === ux && y === uy)) {
      mobjs[pkey(x, y)] = 'rock';
    }
  }
  objs['mine'] = mobjs;
  return m;
}

export function build_interior(bid: string, exit_to: [string, number, number]): [GameMap, [number, number], Record<string, [number, number]>] {
  const rows = INTERIOR_LAYOUTS[bid];
  const h = rows.length;
  const w = rows[0].length;
  const m = new GameMap(`in_${bid}`, BUILDINGS[bid], w, h, 'floor', true);
  const spots: Record<string, [number, number]> = {};
  let entry: [number, number] = [Math.floor(w / 2), h - 2];

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      if (ch === 'D') {
        m.set(x, y, 'exit');
        m.warps[pkey(x, y)] = [exit_to[0], exit_to[1], exit_to[2], [0, 1]];
        entry = [x, y - 1];
      } else if (ch === 'k' || (ch >= '1' && ch <= '9')) {
        spots[ch] = [x, y];
      } else if (INTERIOR_LEGEND[ch]) {
        const [tile, glyph, col] = INTERIOR_LEGEND[ch];
        m.set(x, y, tile);
        if (glyph && col) {
          m.deco[pkey(x, y)] = [glyph, col];
        }
      }
    }
  }

  // Add Inn Telephone on the counter of Doug's Inn for Saturday TV Shopping orders!
  if (bid === 'inn') {
    m.set(14, 2, 'phone');
    m.signs[pkey(14, 2)] = 'inn_phone';
  }

  return [m, entry, spots];
}

export function build_house_upgraded(flags: Set<string> | string[]): GameMap {
  const fset = new Set(flags);
  const ext = fset.has('Extension');
  const m = new GameMap('house', 'Your Farmhouse', ext ? 22 : 16, 10, 'floor', true);
  m.border('iwall');
  m.set(1, 1, 'bed');
  m.set(2, 1, 'bed');
  if (fset.has('Big Bed')) {
    m.set(3, 1, 'bed');
  }
  m.set(5, 1, 'tv');
  m.set(8, 1, 'cal');
  m.set(12, 1, 'bin');
  m.rect(3, 4, 3, 2, 'table');
  // Flower Vase on the table
  m.set(3, 4, 'vase');
  if (fset.has('Kitchen')) {
    m.set(10, 1, 'kitchen');
    m.set(11, 1, 'kitchen');
  }
  if (ext) {
    for (let y = 1; y < 9; y++) {
      if (y !== 4 && y !== 5) {
        m.set(15, y, 'iwall');
      }
    }
    m.set(17, 1, 'shelf');
    m.set(18, 1, 'shelf');
    m.rect(17, 5, 2, 2, 'table');
    if (fset.has('Bathroom')) {
      m.set(20, 1, 'bath');
      m.set(19, 1, 'fireplace');
    }
  }
  m.set(7, 9, 'exit');
  m.doors[pkey(7, 9)] = 'house_out';
  m.warps[pkey(7, 9)] = ['farm', 8, 6, [0, 1]];
  return m;
}

