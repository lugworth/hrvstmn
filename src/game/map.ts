import prebuiltData from './prebuilt_maps.json';
import { pkey, unkey } from './constants';

export class GameMap {
  name: string;
  w: number;
  h: number;
  title: string;
  indoor: boolean;
  t: string[][];
  deco: Record<string, [string, string]>;
  doors: Record<string, string>;
  warps: Record<string, [string, number, number]>;
  signs: Record<string, string>;

  constructor(name: string, w: number, h: number, fill: string, title: string, indoor: boolean = false) {
    this.name = name;
    this.w = w;
    this.h = h;
    this.title = title;
    this.indoor = indoor;
    this.t = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
    this.deco = {};
    this.doors = {};
    this.warps = {};
    this.signs = {};
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  tile(x: number, y: number): string {
    return this.inside(x, y) ? this.t[y][x] : 'void';
  }

  set(x: number, y: number, t: string) {
    if (this.inside(x, y)) {
      this.t[y][x] = t;
    }
  }

  rect(x0: number, y0: number, x1: number, y1: number, t: string) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.set(x, y, t);
      }
    }
  }

  border(t: string) {
    for (let x = 0; x < this.w; x++) {
      this.t[0][x] = t;
      this.t[this.h - 1][x] = t;
    }
    for (let y = 0; y < this.h; y++) {
      this.t[y][0] = t;
      this.t[y][this.w - 1] = t;
    }
  }

  near(x: number, y: number, types: string[] | Set<string>, r: number = 1): boolean {
    const typeSet = types instanceof Set ? types : new Set(types);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (typeSet.has(this.tile(x + dx, y + dy))) {
          return true;
        }
      }
    }
    return false;
  }

  clone(): GameMap {
    const m = new GameMap(this.name, this.w, this.h, 'void', this.title, this.indoor);
    m.t = this.t.map((row) => [...row]);
    m.deco = { ...this.deco };
    m.doors = { ...this.doors };
    m.warps = { ...this.warps };
    m.signs = { ...this.signs };
    return m;
  }
}

function loadMapFromJson(data: any): GameMap {
  const m = new GameMap(data.name, data.w, data.h, 'void', data.title, data.indoor);
  m.t = data.t.map((row: string[]) => [...row]);
  m.deco = { ...data.deco };
  m.doors = { ...data.doors };
  m.warps = { ...data.warps };
  m.signs = { ...data.signs };
  return m;
}

export function build_farm(): GameMap {
  return loadMapFromJson(prebuiltData.farm);
}

export function build_town(): GameMap {
  return loadMapFromJson(prebuiltData.town);
}

export function build_mountain(): GameMap {
  return loadMapFromJson(prebuiltData.mountain);
}

export function build_house(): GameMap {
  return loadMapFromJson(prebuiltData.house);
}

export function build_interior(bid: string, exit_to: any): [GameMap, [number, number], Record<string, [number, number]>] {
  const info = (prebuiltData.interiors as any)[bid];
  if (!info) {
    throw new Error(`Unknown interior: ${bid}`);
  }
  const m = loadMapFromJson(info.map);
  // Assign the exit_to warp to the door tile
  for (const [k, v] of Object.entries(m.warps)) {
    m.warps[k] = exit_to;
  }
  const entry: [number, number] = info.entry ? [info.entry[0], info.entry[1]] : [1, 1];
  const spots: Record<string, [number, number]> = {};
  for (const [k, v] of Object.entries(info.spots)) {
    const val = v as [number, number];
    spots[k] = [val[0], val[1]];
  }
  return [m, entry, spots];
}

export function build_house_upgraded(flags: string[] | Set<string>): GameMap {
  const flagSet = flags instanceof Set ? flags : new Set(flags);
  const base = build_house();
  let m: GameMap;

  if (flagSet.has('Extension')) {
    m = new GameMap('house', 23, base.h, 'floor', base.title, true);
    for (let y = 0; y < base.h; y++) {
      for (let x = 0; x < base.w; x++) {
        m.t[y][x] = base.t[y][x];
      }
    }
    m.deco = { ...base.deco };
    m.doors = { ...base.doors };
    m.warps = { ...base.warps };
    m.signs = { ...base.signs };
    m.border('iwall');

    for (let y = 1; y < m.h - 1; y++) {
      m.set(14, y, y === 3 ? 'floor' : 'iwall');
    }
    m.set(16, 1, 'shelf');
    m.set(17, 1, 'shelf');
    m.set(18, 3, 'table');
    m.set(19, 3, 'table');

    if (flagSet.has('Bathroom')) {
      m.set(21, 1, 'bath');
      m.set(21, 2, 'bath');
    }
  } else {
    m = base;
  }

  if (flagSet.has('Kitchen')) {
    m.set(9, 1, 'kitchen');
    m.set(10, 1, 'kitchen');
    m.deco[pkey(9, 1)] = ['[', '09'];
    m.deco[pkey(10, 1)] = ['&', '08'];
  }

  if (flagSet.has('Big Bed')) {
    m.set(3, 1, 'bed');
    m.deco[pkey(3, 1)] = [']', '0A'];
  }

  return m;
}

export function build_mine(floor: number): [GameMap, Record<string, string>, [number, number]] {
  const m = new GameMap('mine', 40, 16, 'mfloor', `Mine  B${floor}F`);
  m.border('mwall');

  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const count = 4 + Math.floor(floor / 2);
  for (let i = 0; i < count; i++) {
    const cx = randInt(6, 36);
    const cy = randInt(3, 12);
    const blobCount = randInt(3, 9);
    for (let j = 0; j < blobCount; j++) {
      m.set(cx + randInt(-2, 2), cy + randInt(-1, 1), 'mwall');
    }
  }

  m.rect(1, 1, 3, 3, 'mfloor');
  m.set(1, 1, 'up');

  const rocks: Record<string, string> = {};
  for (let y = 1; y < m.h - 1; y++) {
    for (let x = 1; x < m.w - 1; x++) {
      if (m.tile(x, y) === 'mfloor' && Math.max(Math.abs(x - 1), Math.abs(y - 1)) > 2 && Math.random() < 0.42) {
        rocks[pkey(x, y)] = 'rock';
      }
    }
  }

  const rockKeys = Object.keys(rocks);
  const far = rockKeys.filter((k) => unkey(k)[0] > 14);
  const pool = far.length > 0 ? far : rockKeys;
  const ladderKey = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : pkey(m.w - 2, m.h - 2);
  const ladder = unkey(ladderKey);
  rocks[ladderKey] = 'rock';

  return [m, rocks, ladder];
}
