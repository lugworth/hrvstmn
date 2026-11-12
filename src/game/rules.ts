// Pure game rules and mechanics for Harvest Moon: Friends of Mineral Town (ASCII Edition)
import { fmt_hour, SEASONS } from './constants';

import type { CatchEntry, CatchTable } from './constants';

export const TOOL_LEVEL_NAMES = [
  'Basic',
  'Copper',
  'Silver',
  'Gold',
  'Mystrile',
  'Cursed',
  'Blessed',
  'Mythic',
] as const;

export const TOOL_LEVEL_COLORS = [
  '04', // Basic
  '09', // Copper
  '05', // Silver
  '0A', // Gold
  '0C', // Mystrile
  '0E', // Cursed
  '07', // Blessed
  '0B', // Mythic
] as const;

export const WATERING_CAN_CAPACITIES = [30, 55, 85, 130, 200, 250, 250, 500] as const;

export const BASE_MAX_STAMINA = 150;
export const POWER_BERRY_BONUS = 10;
export const MAX_POWER_BERRIES = 10;
export const MAX_FATIGUE = 100;

export const CURSED_TOOL_FLOORS: Record<number, string> = {
  29: 'Fishing Rod',
  39: 'Hoe',
  49: 'Axe',
  59: 'Hammer',
  69: 'Watering Can',
  79: 'Sickle',
};

export const GODDESS_JEWEL_FLOORS = [60, 102, 123, 152, 155, 171, 190, 202, 222] as const;
export const KAPPA_JEWEL_FLOORS = [0, 40, 60, 80, 120, 140, 160, 180, 255] as const;

export function getMaxStamina(powerBerries: number): number {
  const clamped = Math.max(0, Math.min(MAX_POWER_BERRIES, powerBerries));
  return BASE_MAX_STAMINA + clamped * POWER_BERRY_BONUS;
}

export function getToolArea(
  tool: string,
  level: number,
  px: number,
  py: number,
  face: [number, number]
): [number, number][] {
  const [fx, fy] = face;
  const rx = -fy;
  const ry = fx;
  const lvl = Math.max(0, Math.min(7, level));

  const forwardRect = (depth: number, halfWidth: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let d = 1; d <= depth; d++) {
      for (let s = -halfWidth; s <= halfWidth; s++) {
        pts.push([px + fx * d + rx * s, py + fy * d + ry * s]);
      }
    }
    return pts;
  };

  const centeredSquare = (radius: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        pts.push([px + dx, py + dy]);
      }
    }
    return pts;
  };

  if (tool === 'Hoe') {
    if (lvl === 0) return forwardRect(1, 0);
    if (lvl === 1) return forwardRect(2, 0);
    if (lvl === 2) return forwardRect(3, 0);
    if (lvl === 3) return forwardRect(4, 0);
    if (lvl === 4) return forwardRect(6, 0);
    if (lvl === 5 || lvl === 6) return forwardRect(12, 1); // 3x12
    return forwardRect(18, 2); // Mythic: 5x18
  }

  if (tool === 'Watering Can') {
    if (lvl === 0) return forwardRect(1, 0);
    if (lvl === 1) return forwardRect(1, 1); // 1x3
    if (lvl === 2) return forwardRect(2, 1); // 2x3
    if (lvl === 3) return forwardRect(3, 1); // 3x3
    if (lvl === 4) return forwardRect(3, 2); // 3x5
    if (lvl === 5 || lvl === 6) return forwardRect(6, 3); // 6x7 (compact representation of 6x13)
    return forwardRect(9, 5); // Mythic wide field
  }

  if (tool === 'Sickle') {
    if (lvl === 0) return forwardRect(1, 0);
    if (lvl === 1) return forwardRect(1, 1); // 1x3
    if (lvl === 2) return forwardRect(2, 1); // 2x3
    if (lvl === 3) return centeredSquare(1); // 3x3
    if (lvl === 4) return centeredSquare(2); // 5x5
    if (lvl === 5 || lvl === 6) return centeredSquare(4); // 9x9
    return centeredSquare(6); // Mythic 13x13
  }

  if (tool === 'Hammer' || tool === 'Axe') {
    if (lvl <= 4) return forwardRect(1, 0);
    if (lvl === 5 || lvl === 6) return centeredSquare(2);
    return centeredSquare(4);
  }

  return forwardRect(1, 0);
}

export interface StaminaSpendResult {
  stamina: number;
  fatigue: number;
  fainted: boolean;
  warning: 'none' | 'tired' | 'exhausted' | 'fainted';
}

export function calculateStaminaSpend(
  currentStamina: number,
  currentFatigue: number,
  cost: number,
  options: {
    weather?: string;
    minutes?: number;
    hasMysticBerry?: boolean;
    isCursedTool?: boolean;
  } = {}
): StaminaSpendResult {
  const actualCost = options.isCursedTool ? cost * 3 : cost;
  let stamina = currentStamina;
  let fatigue = currentFatigue;

  const isHarshWeather =
    options.weather === 'Rain' ||
    options.weather === 'Snow' ||
    options.weather === 'Typhoon' ||
    options.weather === 'Blizzard';
  const isLateNight = (options.minutes ?? 360) >= 22 * 60 || (options.minutes ?? 360) < 6 * 60;
  // Kappa's Blue Berry (hasMysticBerry) negates rain/snow fatigue penalty completely
  const weatherPenalty = isHarshWeather && !options.hasMysticBerry ? 1 : 0;
  const nightPenalty = isLateNight ? 1 : 0;
  const envPenalty = weatherPenalty + nightPenalty;

  if (stamina >= actualCost) {
    stamina -= actualCost;
    if (envPenalty > 0) {
      fatigue = Math.min(MAX_FATIGUE, fatigue + envPenalty);
    }
  } else {
    const overflow = actualCost - stamina;
    stamina = 0;
    const rawFatigue = overflow + envPenalty;
    const fatGain = options.hasMysticBerry ? Math.max(1, Math.ceil(rawFatigue / 2)) : rawFatigue;
    fatigue = Math.min(MAX_FATIGUE, fatigue + fatGain);
  }

  const fainted = fatigue >= MAX_FATIGUE;
  let warning: 'none' | 'tired' | 'exhausted' | 'fainted' = 'none';
  if (fainted) warning = 'fainted';
  else if (fatigue >= 80 || stamina === 0) warning = 'exhausted';
  else if (fatigue >= 50 || stamina <= 25) warning = 'tired';

  return { stamina, fatigue, fainted, warning };
}

export function getHeartInfo(affection: number): { label: string; color: string; bar: string } {
  const clamped = Math.max(0, Math.min(100, affection));
  const hearts = Math.floor(clamped / 10);
  const bar = `[${'#'.repeat(hearts)}${'.'.repeat(10 - hearts)}]`;
  if (clamped < 15) return { label: 'Black', color: '03', bar };
  if (clamped < 30) return { label: 'Purple', color: '0E', bar };
  if (clamped < 45) return { label: 'Blue', color: '0D', bar };
  if (clamped < 60) return { label: 'Green', color: '0B', bar };
  if (clamped < 75) return { label: 'Yellow', color: '09', bar };
  if (clamped < 90) return { label: 'Orange', color: '0A', bar };
  return { label: 'Red', color: '08', bar };
}

export function calculateGiftPoints(
  preference: 'love' | 'like' | 'neutral' | 'dislike' | 'hate',
  isBirthday: boolean,
  isWrapped: boolean = false
): number {
  const baseMap = {
    love: 8,
    like: 4,
    neutral: 1,
    dislike: -3,
    hate: -6,
  };
  let pts = baseMap[preference];
  if (isBirthday) {
    pts *= 5;
  }
  if (isWrapped && pts > 0) {
    pts = Math.ceil(pts * 1.25);
  }
  return pts;
}

export function getEggQuality(affection: number, wonFestival: boolean, outdoorHours: number, rngVal = 0.5): string {
  if (wonFestival && affection >= 90 && outdoorHours >= 50) {
    return rngVal < 1 / 255 ? 'X Egg' : 'P Egg';
  }
  if (wonFestival && affection >= 80) return 'Golden Egg';
  if (affection >= 75) return 'High Egg';
  if (affection >= 40) return 'Good Egg';
  return 'Egg';
}

export function getMilkQuality(affection: number, wonFestival: boolean, outdoorHours: number, rngVal = 0.5): string {
  if (wonFestival && affection >= 90 && outdoorHours >= 50) {
    return rngVal < 1 / 255 ? 'X Milk' : 'P Milk';
  }
  if (wonFestival && affection >= 80) return 'Golden Milk';
  if (affection >= 75) return 'Large Milk';
  if (affection >= 40) return 'Medium Milk';
  return 'Small Milk';
}

export function getWoolQuality(affection: number, wonFestival: boolean, outdoorHours: number, rngVal = 0.5): string {
  if (wonFestival && affection >= 90 && outdoorHours >= 50) {
    return rngVal < 1 / 255 ? 'X Wool' : 'P Wool';
  }
  if (wonFestival && affection >= 80) return 'Golden Wool';
  if (affection >= 75) return 'Large Wool';
  if (affection >= 40) return 'Good Wool';
  return 'Wool';
}

export function convertWithMaker(inputItem: string): { output: string; maker: string } | null {
  const eggMap: Record<string, string> = {
    'Egg': 'Small Mayonnaise',
    'Good Egg': 'Medium Mayonnaise',
    'High Egg': 'Large Mayonnaise',
    'Golden Egg': 'Golden Mayonnaise',
    'P Egg': 'P Mayonnaise',
    'X Egg': 'X Mayonnaise',
  };
  if (eggMap[inputItem]) {
    return { output: eggMap[inputItem], maker: 'Mayonnaise Maker' };
  }

  const milkMap: Record<string, string> = {
    'Small Milk': 'Small Cheese',
    'Milk': 'Small Cheese',
    'Medium Milk': 'Medium Cheese',
    'Large Milk': 'Large Cheese',
    'Golden Milk': 'Golden Cheese',
    'P Milk': 'P Cheese',
    'X Milk': 'X Cheese',
  };
  if (milkMap[inputItem]) {
    return { output: milkMap[inputItem], maker: 'Cheese Maker' };
  }

  const woolMap: Record<string, string> = {
    'Wool': 'Small Yarn',
    'Good Wool': 'Medium Yarn',
    'Large Wool': 'Large Yarn',
    'Golden Wool': 'Golden Yarn',
    'P Wool': 'P Yarn',
    'X Wool': 'X Yarn',
  };
  if (woolMap[inputItem]) {
    return { output: woolMap[inputItem], maker: 'Yarn Maker' };
  }

  return null;
}

export function rollSpringMineDrop(floor: number, allToolsBlessed: boolean, rngPct: number): string | null {
  if (allToolsBlessed && (floor === 60 || floor === 102 || floor === 123 || floor === 152 || floor >= 200)) {
    if (rngPct < 8) return 'Mythic Stone';
  }
  const table: [string, number, number][] = [
    ['Adamantite', 6, 10],
    ['Orichalc', 8, 10],
    ['Mystrile', 12, 5],
    ['Gold', 14, 3],
    ['Silver', 18, 1],
    ['Copper', 24, 1],
    ['Junk Ore', 15, 1],
  ];
  let acc = 0;
  for (const [name, chance, minFloor] of table) {
    if (floor >= minFloor) {
      acc += chance;
      if (rngPct < acc) return name;
    }
  }
  return null;
}

export function rollLakeMineDrop(floor: number, rngPct: number): string | null {
  if (floor >= 50 && (floor % 10 === 0 || floor === 255) && rngPct < 5) {
    return floor % 20 === 0 ? 'Alexandrite' : 'Pink Diamond';
  }
  const table: [string, number, number][] = [
    ['Diamond', 5, 10],
    ['Emerald', 7, 8],
    ['Ruby', 8, 6],
    ['Topaz', 9, 5],
    ['Peridot', 10, 4],
    ['Fluorite', 12, 3],
    ['Agate', 14, 2],
    ['Amethyst', 15, 1],
    ['Moon Stone', 6, 5],
    ['Sand Rose', 5, 9],
  ];
  let acc = 0;
  for (const [name, chance, minFloor] of table) {
    if (floor >= minFloor) {
      acc += chance;
      if (rngPct < acc) return name;
    }
  }
  return null;
}

export const SECRET_CROP_REQS: Record<string, string[]> = {
  Strawberry: ['Turnip', 'Potato', 'Cucumber'],
  Pumpkin: ['Tomato', 'Corn', 'Onion'],
  Spinach: ['Eggplant', 'Carrot', 'Sweet Potato'],
};

export const WON_EXCLUSIVE_CROPS = new Set([
  'Cabbage',
  'Pineapple',
  'Green Pepper',
  'Moondrop Flower',
  'Toy Flower',
  'Pink Cat Flower',
  'Magic Red Flower',
]);

export function checkSecretCropUnlock(
  crop: string,
  shippedCounts: Record<string, number>
): { unlocked: boolean; progressText: string } {
  const reqs = SECRET_CROP_REQS[crop];
  if (!reqs) {
    return { unlocked: true, progressText: '' };
  }
  const unlocked = reqs.every((r) => (shippedCounts[r] || 0) >= 100);
  const progressText = reqs
    .map((r) => `${r}: ${Math.min(100, shippedCounts[r] || 0)}/100`)
    .join(', ');
  return { unlocked, progressText };
}

export const BASKET_CAPACITY = 30;

export function getBasketTotal(basket: Record<string, number>): number {
  return Object.values(basket).reduce((sum, n) => sum + n, 0);
}

// ---------------------------------------------------------------- outer regions

/** What bites in a region's waters: the rod-gated rare catch first, then a weighted draw of what is in season. */
export function rollRegionCatch(
  table: CatchTable,
  ctx: { season: number; weather: string; rodLvl: number },
  rand: () => number
): string {
  if (ctx.rodLvl >= table.rareRod) {
    const stormy = ctx.weather === 'Rain' || ctx.weather === 'Typhoon';
    const chance = (table.rareChance + 0.01 * (ctx.rodLvl - table.rareRod)) * (stormy ? table.stormBoost ?? 1 : 1);
    if (rand() < chance) return table.rare;
  }
  const pool = table.fish.filter((f) => !f.seasons || f.seasons.includes(ctx.season));
  const weight = (f: CatchEntry) => f.w + (f.rod ?? 0) * ctx.rodLvl;
  let r = rand() * pool.reduce((sum, f) => sum + weight(f), 0);
  for (const f of pool) {
    r -= weight(f);
    if (r < 0) return f.item;
  }
  return pool[pool.length - 1]?.item ?? 'Small Fish';
}

export const MAX_STONE_SKIPS = 12;

/** Skipping a stone at Willow Bend: each bounce has a fixed chance of another; rain chops the water up. */
export function rollStoneSkips(rand: () => number, calm: boolean = true): number {
  const keep = calm ? 0.72 : 0.55;
  let n = 1;
  while (n < MAX_STONE_SKIPS && rand() < keep) n++;
  return n;
}

/**
 * Which Friday scene the inn holds this week. Scenes you have not seen come first, starting
 * from this week's place in the rotation, so a missed evening comes round again; once all
 * have been seen the rotation simply repeats.
 */
export function innSceneFor(week: number, ids: string[], seen: string[]): string | null {
  const n = ids.length;
  if (!n) return null;
  const start = ((week % n) + n) % n;
  for (let i = 0; i < n; i++) {
    const id = ids[(start + i) % n];
    if (!seen.includes(id)) return id;
  }
  return ids[start];
}

/** Whether you win the inn's card game on a given day (deterministic, about two weeks in three). */
export function innCardsWin(absday: number): boolean {
  return ((absday * 2654435761) >>> 0) % 3 !== 0;
}

/** One watering-can step: the level it reaches, what Saibara charges, and what it waters. */
export interface CanStep {
  level: number;
  cost: number;
  ore: string;
  tiles: number;
  cap: number;
}

/**
 * Gray's advice on the watering can (task 04). From the current level, `next` is the upgrade
 * to save for now and `big` is the later Saibara upgrade that adds the most tiles per pour.
 * Null once the can is Mystrile or beyond: Saibara's ore upgrades stop there.
 */
export function canUpgradeAdvice(
  level: number,
  upgrade: Record<number, [number, string]>,
  caps: number[]
): { now: CanStep; next: CanStep; big: CanStep | null } | null {
  const step = (lvl: number): CanStep => ({
    level: lvl,
    cost: upgrade[lvl]?.[0] ?? 0,
    ore: upgrade[lvl]?.[1] ?? '',
    tiles: getToolArea('Watering Can', lvl, 0, 0, [0, 1]).length,
    cap: caps[lvl] ?? 0,
  });
  const lvl = Math.max(0, Math.floor(level));
  if (lvl >= 4) return null;
  const next = step(lvl + 1);
  let big: CanStep | null = null;
  let bestGain = 0;
  for (let l = lvl + 2; l <= 4; l++) {
    const gain = step(l).tiles - step(l - 1).tiles;
    if (gain > bestGain) {
      bestGain = gain;
      big = step(l);
    }
  }
  return { now: step(lvl), next, big };
}

/**
 * Task 33: the next region on the shortest walk from `from` to `to` over the valley's region
 * links (breadth-first, neighbours in sorted order so the answer is stable). Null when you
 * are already there or no route exists.
 */
export function nextRegion(links: Record<string, string[]>, from: string, to: string): string | null {
  if (from === to) return null;
  const prev: Record<string, string> = {};
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of [...(links[cur] || [])].sort()) {
      if (seen.has(n)) continue;
      seen.add(n);
      prev[n] = cur;
      if (n === to) {
        let step = n;
        while (prev[step] !== from) step = prev[step];
        return step;
      }
      queue.push(n);
    }
  }
  return null;
}

/** 'north', 'south-east', ... for a step of (dx, dy) on the map (y grows southward). */
export function compassWord(dx: number, dy: number): string {
  const ns = dy < 0 ? 'north' : dy > 0 ? 'south' : '';
  const ew = dx < 0 ? 'west' : dx > 0 ? 'east' : '';
  // Mostly-straight lines read as one direction.
  if (ns && ew && Math.abs(dx) > 2 * Math.abs(dy)) return ew;
  if (ns && ew && Math.abs(dy) > 2 * Math.abs(dx)) return ns;
  return ns && ew ? `${ns}-${ew}` : ns || ew || 'here';
}

/**
 * Whether a shop keeping `hours` ([open, close, closed weekdays]) is open, and when it next
 * opens. `festOn(d)` says whether the day `d` days from today is a festival (shops shut then).
 */
export function shopStatus(
  hours: [number, number, number[]],
  weekday: number,
  minutes: number,
  festOn: (offset: number) => boolean = () => false
): { open: boolean; text: string } {
  const [o, c, closed] = hours;
  const hr = fmt_hour;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const nextOpen = (): string => {
    for (let d = 1; d <= 14; d++) {
      const wd = (weekday + d) % 7;
      if (closed.includes(wd) || festOn(d)) continue;
      return d === 1 ? `tomorrow ${hr(o)}` : d < 7 ? `${DAYS[wd]} ${hr(o)}` : `in ${d} days`;
    }
    return 'not soon';
  };
  if (festOn(0)) return { open: false, text: `closed for the festival; opens ${nextOpen()}` };
  if (closed.includes(weekday)) return { open: false, text: `closed today (${DAYS[weekday]}); opens ${nextOpen()}` };
  if (minutes < o * 60) return { open: false, text: `opens at ${hr(o)} today` };
  if (minutes >= c * 60) return { open: false, text: `closed for the day; opens ${nextOpen()}` };
  return { open: true, text: `open until ${hr(c)}` };
}

/** An absday() as 'Summer 3, Year 1' (or 'Summer 3' with year = false). */
export function absdayLabel(n: number, year: boolean = true): string {
  const d = `${SEASONS[Math.floor((n % 120) / 30)]} ${(n % 30) + 1}`;
  return year ? `${d}, Year ${Math.floor(n / 120) + 1}` : d;
}

/**
 * Task 12: a public project's materials, delivered against needed. The crop slot comes last;
 * its item is null until the player picks which crop to bring.
 */
export function worksNeeds(
  needs: Record<string, number>,
  cropQty: number,
  delivered: Record<string, number>,
  crop: string | null
): { item: string | null; got: number; need: number }[] {
  const rows = Object.entries(needs).map(([item, need]) => ({ item: item as string | null, got: Math.min(need, delivered[item] || 0), need }));
  rows.push({ item: crop, got: crop ? Math.min(cropQty, delivered[crop] || 0) : 0, need: cropQty });
  return rows;
}

/** 'Lumber 4/12, Copper 0/2, Turnip 3/3' style summary, or just what is still missing. */
export function worksSummary(rows: { item: string | null; got: number; need: number }[], missingOnly: boolean = false): string {
  return rows
    .filter((r) => !missingOnly || r.got < r.need)
    .map((r) => (missingOnly ? `${r.need - r.got} ${r.item ?? 'of one farm crop'}` : `${r.item ?? 'One farm crop'} ${r.got}/${r.need}`))
    .join(', ');
}
