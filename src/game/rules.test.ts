import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from './constants';
import {
  innSceneFor,
  innCardsWin,
  canUpgradeAdvice,
  nextRegion,
  nextRegions,
  compassWord,
  shopStatus,
  absdayLabel,
  worksNeeds,
  worksSummary,
  getMaxStamina,
  getToolArea,
  calculateStaminaSpend,
  getHeartInfo,
  calculateGiftPoints,
  getEggQuality,
  getMilkQuality,
  getWoolQuality,
  convertWithMaker,
  makerBatch,
  MAKER_INPUTS,
  rollSpringMineDrop,
  rollLakeMineDrop,
  checkSecretCropUnlock,
  getBasketTotal,
  BASKET_CAPACITY,
  rollRegionCatch,
  rollStoneSkips,
  MAX_STONE_SKIPS,
} from './rules';
import { REGION_CATCH, UPGRADE, CAN_CAP } from './constants';

describe('Harvest Moon: Friends of Mineral Town Rules & Mechanics', () => {
  test('Power Berries scale max stamina from 150 to 250 (+10 each)', () => {
    assert.equal(getMaxStamina(0), 150);
    assert.equal(getMaxStamina(5), 200);
    assert.equal(getMaxStamina(10), 250);
    assert.equal(getMaxStamina(15), 250); // Clamped at 10 Power Berries
  });

  test('Tool area scales across all 8 tool tiers (Basic to Mythic)', () => {
    // Hoe facing right [1, 0]
    assert.equal(getToolArea('Hoe', 0, 10, 10, [1, 0]).length, 1);
    assert.equal(getToolArea('Hoe', 1, 10, 10, [1, 0]).length, 2);
    assert.equal(getToolArea('Hoe', 2, 10, 10, [1, 0]).length, 3);
    assert.equal(getToolArea('Hoe', 3, 10, 10, [1, 0]).length, 4);
    assert.equal(getToolArea('Hoe', 4, 10, 10, [1, 0]).length, 6);
    assert.equal(getToolArea('Hoe', 6, 10, 10, [1, 0]).length, 36); // Blessed 3x12
    assert.equal(getToolArea('Hoe', 7, 10, 10, [1, 0]).length, 90); // Mythic 5x18

    // Watering Can
    assert.equal(getToolArea('Watering Can', 0, 10, 10, [0, 1]).length, 1);
    assert.equal(getToolArea('Watering Can', 1, 10, 10, [0, 1]).length, 3);
    assert.equal(getToolArea('Watering Can', 2, 10, 10, [0, 1]).length, 6);
    assert.equal(getToolArea('Watering Can', 3, 10, 10, [0, 1]).length, 9);
    assert.equal(getToolArea('Watering Can', 4, 10, 10, [0, 1]).length, 15);

    // Sickle centered area at Gold/Mystrile
    assert.equal(getToolArea('Sickle', 3, 10, 10, [0, 1]).length, 9);
    assert.equal(getToolArea('Sickle', 4, 10, 10, [0, 1]).length, 25);
  });

  test('Stamina, Fatigue, Mystic Berry and Fainting mechanics', () => {
    // Sunny daytime tool use only costs stamina
    const r1 = calculateStaminaSpend(100, 0, 5, { weather: 'Sunny', minutes: 12 * 60 });
    assert.equal(r1.stamina, 95);
    assert.equal(r1.fatigue, 0);
    assert.equal(r1.fainted, false);

    // Rainy late-night tool use adds environmental fatigue
    const r2 = calculateStaminaSpend(100, 10, 5, { weather: 'Rain', minutes: 23 * 60 });
    assert.equal(r2.stamina, 95);
    assert.equal(r2.fatigue, 12);

    // Mystic Berry halves environmental fatigue buildup
    const r3 = calculateStaminaSpend(100, 10, 5, {
      weather: 'Rain',
      minutes: 23 * 60,
      hasMysticBerry: true,
    });
    assert.equal(r3.fatigue, 11);

    // Zero stamina overflows into fatigue and faints at 100
    const r4 = calculateStaminaSpend(0, 96, 5, { weather: 'Sunny', minutes: 12 * 60 });
    assert.equal(r4.stamina, 0);
    assert.equal(r4.fatigue, 100);
    assert.equal(r4.fainted, true);
    assert.equal(r4.warning, 'fainted');
  });

  test('Heart color tiers and birthday gift multipliers', () => {
    assert.equal(getHeartInfo(5).label, 'Black');
    assert.equal(getHeartInfo(20).label, 'Purple');
    assert.equal(getHeartInfo(35).label, 'Blue');
    assert.equal(getHeartInfo(50).label, 'Green');
    assert.equal(getHeartInfo(65).label, 'Yellow');
    assert.equal(getHeartInfo(80).label, 'Orange');
    assert.equal(getHeartInfo(95).label, 'Red');

    assert.equal(calculateGiftPoints('love', false, false), 8);
    assert.equal(calculateGiftPoints('love', true, false), 40); // 5x on birthday
    assert.equal(calculateGiftPoints('love', true, true), 50); // 5x * 1.25 wrapped
  });

  test('Maker batches cover every tier and raise value at each step', () => {
    assert.equal(convertWithMaker('Milk'), null, 'shop milk must not become cheese');
    assert.deepEqual(makerBatch('Cheese Maker', { 'Small Milk': 2, 'P Milk': 1, Milk: 9, Egg: 4 }), [
      { input: 'P Milk', output: 'P Cheese', qty: 1 },
      { input: 'Small Milk', output: 'Small Cheese', qty: 2 },
    ]);
    for (const [maker, inputs] of Object.entries(MAKER_INPUTS)) {
      let lastIn = Infinity;
      let lastOut = Infinity;
      for (const input of inputs) {
        const res = convertWithMaker(input);
        assert.equal(res?.maker, maker, input);
        const pin = ITEMS[input][0] as number;
        const pout = ITEMS[res!.output][0] as number;
        assert.ok(pout > pin, `${res!.output} should be worth more than ${input}`);
        assert.ok(pin <= lastIn && pout <= lastOut, `${input} should not out-sell a better tier`);
        lastIn = pin;
        lastOut = pout;
      }
    }
  });

  test('Livestock quality grades and Maker conversions', () => {
    assert.equal(getEggQuality(20, false, 0), 'Egg');
    assert.equal(getEggQuality(50, false, 0), 'Good Egg');
    assert.equal(getEggQuality(80, false, 0), 'High Egg');
    assert.equal(getEggQuality(85, true, 10), 'Golden Egg');
    assert.equal(getEggQuality(95, true, 60, 0.5), 'P Egg');
    assert.equal(getEggQuality(95, true, 60, 0.001), 'X Egg');

    assert.equal(getMilkQuality(95, true, 60, 0.5), 'P Milk');
    assert.equal(getWoolQuality(95, true, 60, 0.5), 'P Wool');

    assert.deepEqual(convertWithMaker('Golden Egg'), {
      output: 'Golden Mayonnaise',
      maker: 'Mayonnaise Maker',
    });
    assert.deepEqual(convertWithMaker('Large Milk'), {
      output: 'Large Cheese',
      maker: 'Cheese Maker',
    });
    assert.deepEqual(convertWithMaker('P Wool'), {
      output: 'P Yarn',
      maker: 'Yarn Maker',
    });
  });

  test('Spring Mine and Lake Mine drop tables', () => {
    assert.equal(rollSpringMineDrop(60, true, 3), 'Mythic Stone');
    assert.equal(rollSpringMineDrop(10, false, 3), 'Adamantite');
    assert.equal(rollLakeMineDrop(50, 2), 'Pink Diamond');
    assert.equal(rollLakeMineDrop(60, 2), 'Alexandrite');
    assert.equal(rollLakeMineDrop(10, 2), 'Diamond');
  });

  test('Secret crop shipment gates and Harvest Basket capacity', () => {
    const locked = checkSecretCropUnlock('Strawberry', { Turnip: 100, Potato: 45, Cucumber: 10 });
    assert.equal(locked.unlocked, false);
    assert.equal(locked.progressText, 'Turnip: 100/100, Potato: 45/100, Cucumber: 10/100');

    const unlocked = checkSecretCropUnlock('Strawberry', { Turnip: 120, Potato: 100, Cucumber: 105 });
    assert.equal(unlocked.unlocked, true);

    assert.equal(BASKET_CAPACITY, 30);
    assert.equal(getBasketTotal({ Turnip: 12, Copper: 8, Bamboo_Shoot: 5 }), 25);
  });
});

describe('outer-region fishing and stone skipping', () => {
  /** Every result of the weighted draw, sweeping the roll across [0, 1). */
  const sweep = (region: string, season: number, rodLvl: number) => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const r = i / 400;
      seen.add(rollRegionCatch(REGION_CATCH[region], { season, weather: 'Sunny', rodLvl }, () => r));
    }
    return seen;
  };

  test('Willow Bend fish follow the seasons; the sturgeon needs a Silver rod', () => {
    const spring = sweep('river', 0, 0);
    assert.ok(spring.has('Willow Chub') && spring.has('Speckled Trout'));
    assert.ok(!spring.has('Burbot'), 'burbot only bite in winter');
    assert.ok(!spring.has('Elder Sturgeon'), 'no rare catch on a basic rod');
    const winter = sweep('river', 3, 0);
    assert.ok(winter.has('Burbot') && !winter.has('Speckled Trout'));
    const river = REGION_CATCH.river;
    assert.equal(rollRegionCatch(river, { season: 0, weather: 'Sunny', rodLvl: 1 }, () => 0), 'Small Fish');
    assert.equal(rollRegionCatch(river, { season: 0, weather: 'Sunny', rodLvl: 2 }, () => 0), 'Elder Sturgeon');
    assert.notEqual(rollRegionCatch(river, { season: 0, weather: 'Sunny', rodLvl: 2 }, () => 0.05), 'Elder Sturgeon');
  });

  test('the sea off Lighthouse Point has its own fish, and storms bring the marlin in', () => {
    const summer = sweep('point', 1, 0);
    assert.ok(summer.has('Mackerel') && summer.has('Sea Bass') && summer.has('Rockfish'));
    const winter = sweep('point', 3, 0);
    assert.ok(!winter.has('Mackerel') && !winter.has('Sea Bass') && winter.has('Rockfish'));
    const sea = REGION_CATCH.point;
    const at = (weather: string, rodLvl: number) => rollRegionCatch(sea, { season: 0, weather, rodLvl }, () => 0.05);
    assert.notEqual(at('Sunny', 3), 'Storm Marlin', '3% on a fair day');
    assert.equal(at('Rain', 3), 'Storm Marlin', 'tripled in the rain');
    assert.notEqual(at('Rain', 2), 'Storm Marlin', 'needs a Gold rod');
  });

  test('a better rod shifts the odds toward bigger fish', () => {
    // below the sturgeon's rod level the draw uses a single roll, so a sweep counts each fish's share
    const share = (rodLvl: number) => {
      let n = 0;
      for (let i = 0; i < 1000; i++) {
        if (rollRegionCatch(REGION_CATCH.river, { season: 0, weather: 'Sunny', rodLvl }, () => i / 1000) === 'Large Fish') n++;
      }
      return n;
    };
    assert.ok(share(1) > share(0));
  });

  test('stone skips: calm water skips further than rain-chopped water', () => {
    assert.equal(rollStoneSkips(() => 0), MAX_STONE_SKIPS);
    assert.equal(rollStoneSkips(() => 0.99), 1);
    assert.equal(rollStoneSkips(() => 0.6, true), MAX_STONE_SKIPS);
    assert.equal(rollStoneSkips(() => 0.6, false), 1);
  });
});

describe('inn Friday scene rotation', () => {
  const ids = ['cards', 'recipes', 'story'];
  test('unseen scenes come first, starting from the week in the rotation', () => {
    assert.equal(innSceneFor(0, ids, []), 'cards');
    assert.equal(innSceneFor(1, ids, []), 'recipes');
    assert.equal(innSceneFor(1, ids, ['recipes']), 'story');
    assert.equal(innSceneFor(2, ids, ['story', 'cards']), 'recipes');
  });
  test('once everything is seen the rotation repeats', () => {
    assert.equal(innSceneFor(4, ids, ids), 'recipes');
    assert.equal(innSceneFor(0, [], []), null);
  });
  test('the card game is deterministic and winnable', () => {
    const wins = Array.from({ length: 30 }, (_, d) => innCardsWin(d));
    assert.ok(wins.some(Boolean) && wins.some((w) => !w));
    assert.equal(innCardsWin(11), innCardsWin(11));
  });
});

describe("Gray's watering-can advice", () => {
  test('the next upgrade from Basic is Copper, and the big later jump is Mystrile', () => {
    const a = canUpgradeAdvice(0, UPGRADE, CAN_CAP)!;
    assert.deepEqual([a.now.tiles, a.next.level, a.next.cost, a.next.ore, a.next.tiles, a.next.cap], [1, 1, 1000, 'Copper', 3, 55]);
    assert.equal(a.big?.level, 4);
  });
  test('each level 0-3 points one step up; the big jump is always Mystrile when it is still ahead', () => {
    for (const lvl of [0, 1, 2, 3]) {
      const a = canUpgradeAdvice(lvl, UPGRADE, CAN_CAP)!;
      assert.equal(a.next.level, lvl + 1);
      assert.equal(a.next.cost, UPGRADE[lvl + 1][0]);
      assert.equal(a.big?.level ?? null, lvl + 1 < 4 ? 4 : null);
    }
  });
  test('Mystrile and beyond get no ore-upgrade advice', () => {
    for (const lvl of [4, 5, 6, 7]) assert.equal(canUpgradeAdvice(lvl, UPGRADE, CAN_CAP), null);
  });
});

describe('valley map rules (task 33)', () => {
  const links = {
    farm: ['town', 'woods', 'grove'], town: ['farm', 'mountain', 'beach', 'river'], mountain: ['town', 'ridge'],
    ridge: ['mountain'], beach: ['town', 'point'], point: ['beach'], river: ['town'], woods: ['farm'], grove: ['farm'],
  };
  test('the next region follows the shortest walk', () => {
    assert.equal(nextRegion(links, 'farm', 'grove'), 'grove');
    assert.equal(nextRegion(links, 'grove', 'ridge'), 'farm');
    assert.equal(nextRegion(links, 'woods', 'point'), 'farm');
    assert.equal(nextRegion(links, 'town', 'ridge'), 'mountain');
    assert.equal(nextRegion(links, 'town', 'town'), null);
    assert.equal(nextRegion({ a: [] }, 'a', 'b'), null);
  });
  test('every neighbour that starts a shortest walk is offered, so callers can break ties', () => {
    const gated = { ...links, woods: ['farm', 'beach'], beach: ['town', 'point', 'woods'] };
    assert.deepEqual(nextRegions(gated, 'woods', 'town'), ['beach', 'farm']);
    assert.deepEqual(nextRegions(gated, 'woods', 'point'), ['beach']);
    assert.deepEqual(nextRegions(gated, 'town', 'woods'), ['beach', 'farm']);
    assert.deepEqual(nextRegions(links, 'woods', 'point'), ['farm']);
    assert.deepEqual(nextRegions(links, 'town', 'town'), []);
    assert.deepEqual(nextRegions({ a: [] }, 'a', 'b'), []);
  });
  test('compass words', () => {
    assert.equal(compassWord(-5, 0), 'west');
    assert.equal(compassWord(4, 4), 'south-east');
    assert.equal(compassWord(10, -1), 'east');
    assert.equal(compassWord(0, 0), 'here');
  });
  test('shop status: open, before opening, after closing, closed day, festival', () => {
    const forge: [number, number, number[]] = [10, 16, [3]];
    assert.deepEqual(shopStatus(forge, 0, 12 * 60), { open: true, text: 'open until 4PM' });
    assert.equal(shopStatus(forge, 0, 9 * 60).text, 'opens at 10AM today');
    assert.equal(shopStatus(forge, 0, 16 * 60).text, 'closed for the day; opens tomorrow 10AM');
    assert.equal(shopStatus(forge, 2, 17 * 60).text, 'closed for the day; opens Fri 10AM', 'Wednesday evening skips closed Thursday');
    assert.equal(shopStatus(forge, 3, 12 * 60).open, false);
    assert.equal(shopStatus(forge, 3, 12 * 60).text, 'closed today (Thu); opens tomorrow 10AM');
    assert.deepEqual(shopStatus(forge, 0, 12 * 60, (d) => d === 0), { open: false, text: 'closed for the festival; opens tomorrow 10AM' });
    // festival eve: tomorrow is a festival, so the forge next opens the day after
    assert.equal(shopStatus(forge, 0, 17 * 60, (d) => d === 1).text, 'closed for the day; opens Wed 10AM');
    // a closed Thursday before a Friday festival
    assert.equal(shopStatus(forge, 3, 12 * 60, (d) => d === 1).text, 'closed today (Thu); opens Sat 10AM');
  });

  test('absday labels: season and day, with or without the year', () => {
    assert.equal(absdayLabel(0), 'Spring 1, Year 1');
    assert.equal(absdayLabel(31, false), 'Summer 2');
    assert.equal(absdayLabel(120 + 89), 'Fall 30, Year 2');
    assert.equal(absdayLabel(119, false), 'Winter 30');
  });
  test('public works needs: materials capped at what is needed, the crop slot last', () => {
    const needs = { Lumber: 12, Copper: 2 };
    let rows = worksNeeds(needs, 3, {}, null);
    assert.deepEqual(rows, [
      { item: 'Lumber', got: 0, need: 12 },
      { item: 'Copper', got: 0, need: 2 },
      { item: null, got: 0, need: 3 },
    ]);
    assert.equal(worksSummary(rows, true), '12 Lumber, 2 Copper, 3 of one farm crop');
    rows = worksNeeds(needs, 3, { Lumber: 15, Copper: 1, Turnip: 3 }, 'Turnip');
    assert.deepEqual(rows.map((r) => r.got), [12, 1, 3]);
    assert.equal(worksSummary(rows), 'Lumber 12/12, Copper 1/2, Turnip 3/3');
    assert.equal(worksSummary(rows, true), '1 Copper');
  });
});
