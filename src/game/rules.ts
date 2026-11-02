// Pure game rules and mechanics for Harvest Moon: Friends of Mineral Town (ASCII Edition)

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

