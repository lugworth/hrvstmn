// Regression tests for engine bugs found by fuzzing and save/load diffing.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { Screen } from './screen';
import { Game } from './engine';
import {
  ITEMS,
  FORAGE,
  FORAGE_GLYPH,
  PALETTE,
  SEASONS,
  REGION_FORAGE,
  REGION_CATCH,
  LIGHTHOUSE_LOG,
  LOOKOUT_VIEW,
  LOOKOUT_STAMINA,
  TIDE_POOL_TEXT,
  RIDGE_HUB,
  NPCS,
  TILES,
} from './constants';

const store: Record<string, string> = {};
before(() => {
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const fresh = () => {
  const g = new Game(new Screen(132, 30), true) as any;
  g.new_game('Pete', 'Moon');
  return g;
};

describe('engine regressions', () => {
  test("Shift+H whistles the horse; plain 'h' still moves left (hjkl)", async () => {
    const g = fresh();
    // find a spot on the farm whose left neighbour is walkable
    let spot: [number, number] | null = null;
    for (let y = 2; y < 26 && !spot; y++) for (let x = 3; x < 60 && !spot; x++) {
      if (g.walkable('farm', x, y) && g.walkable('farm', x - 1, y) && !(`${x - 1},${y}` in g.maps.farm.doors)) spot = [x, y];
    }
    assert.ok(spot);
    g.warp('farm', spot![0], spot![1]);
    const x0 = g.px;
    await g.handle('h');
    assert.equal(g.px, x0 - 1, 'h moves left');
    assert.equal(g.riding_horse, false);
    await g.handle('H');
    assert.equal(g.riding_horse, true, 'H whistles the horse');
  });

  test('barn animals and once-per-day flags survive save/load', () => {
    const a = fresh();
    a.animals = [{ kind: 'cow', name: 'Bess', aff: 40 }];
    a.talked = ['Ann'];
    a.gifted = ['Ann'];
    a.honey_picked = true;
    a.prayed = true;
    a.save(2);
    const b = new Game(new Screen(132, 30), true) as any;
    b.load(2);
    assert.deepEqual(b.animals, a.animals);
    assert.deepEqual(b.gifted, ['Ann']);
    assert.deepEqual(b.talked, ['Ann']);
    assert.equal(b.honey_picked, true);
    assert.equal(b.prayed, true);
  });

  test('older saves without the new fields still load', () => {
    const a = fresh();
    a.save(1);
    const d = JSON.parse(store['hrvstmn-save']);
    for (const k of ['animals', 'talked', 'gifted', 'honey_picked']) delete d[k];
    store['hrvstmn-save'] = JSON.stringify(d);
    const b = new Game(new Screen(132, 30), true) as any;
    assert.doesNotThrow(() => b.load(1));
    assert.ok(Array.isArray(b.animals));
  });
});

/** Capture dialog text instead of waiting for a key. */
const quiet = (g: any) => {
  const said: string[] = [];
  g.say = async (text: string) => { said.push(text); };
  return said;
};

/** Run `fn` with Math.random pinned to `v` (py_rng draws from it). */
const pinned = async <T>(v: number, fn: () => T | Promise<T>): Promise<T> => {
  const orig = Math.random;
  Math.random = () => v;
  try {
    return await fn();
  } finally {
    Math.random = orig;
  }
};

const REGIONS = ['woods', 'ridge', 'river', 'point'];

describe('Skyline Ridge destinations and tool dock controls', () => {
  test('the mine, forge and Goddess Pond move to reachable Ridge sites without duplicating old entrances', () => {
    const g = fresh();
    assert.equal(g.maps.ridge.doors[RIDGE_HUB.mine.join(',')], 'mine');
    assert.equal(g.maps.ridge.doors[RIDGE_HUB.forge.join(',')], 'blacksmith');
    assert.ok(!Object.values(g.maps.mountain.doors).includes('mine'));
    assert.ok(!Object.values(g.maps.town.doors).includes('blacksmith'));
    assert.equal(g.maps.mountain.doors['15,8'], 'lakemine', 'winter Lake Mine stays on the lake');
    const ridge = g.maps.ridge;
    const queue = Object.keys(ridge.warps).map((key) => key.split(',').map(Number));
    const seen = new Set<string>();
    while (queue.length) {
      const [x, y] = queue.pop()!;
      const key = `${x},${y}`;
      if (seen.has(key) || !TILES[ridge.tile(x, y)]?.[3]) continue;
      seen.add(key);
      queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
    }
    for (const [x, y] of [RIDGE_HUB.mineExit, RIDGE_HUB.forgeFront, RIDGE_HUB.goddess, RIDGE_HUB.gray]) {
      assert.ok(seen.has(`${x},${y}`), `reachable approach ${x},${y}`);
    }
    assert.equal(ridge.tile(RIDGE_HUB.pond.x, RIDGE_HUB.pond.y), 'pond');
    assert.equal(NPCS.Gray.where[0], 'ridge');
    assert.equal(NPCS['Harvest Goddess'].where[0], 'ridge');
  });

  test('the Spring Mine ladder returns to the Ridge and the Lake Mine ladder still returns to the lake', async () => {
    const g = fresh();
    for (const [kind, map, point] of [['spring', 'ridge', RIDGE_HUB.mineExit], ['lake', 'mountain', [15, 9]]] as const) {
      g.enter_mine(1, kind);
      g.px = 3; g.py = 3;
      await g.move(0, -1);
      assert.equal(g.mapname, map);
      assert.deepEqual([g.px, g.py], [...point]);
    }
  });

  test('Saibara opens the relocated forge and its door returns to Skyline Ridge', async () => {
    const g = fresh();
    g.day = 2;
    g.minutes = 12 * 60;
    g.warp('ridge', ...RIDGE_HUB.forgeFront);
    await g.move(0, -1);
    assert.equal(g.mapname, 'in_blacksmith');
    assert.equal(g.keeper_of('blacksmith'), 'Saibara');
    assert.equal(g.indoor_npcs.Saibara?.map, 'in_blacksmith');
    const services = await g.shop_options('blacksmith');
    assert.ok(services.some(([label]: [string]) => label.startsWith('Upgrade a Tool')));
    await g.move(0, 1);
    assert.equal(g.mapname, 'ridge');
    assert.deepEqual([g.px, g.py], [...RIDGE_HUB.forgeFront]);
  });

  test('only the relocated Goddess Pond accepts Goddess offerings', async () => {
    const g = fresh();
    quiet(g);
    g.warp('ridge', 24, 7, [0, -1]);
    g.give('Egg', 2); g.held = 'Egg';
    await g.interact();
    assert.equal(g.goddess_gifts, 1);
    assert.equal(g.inv.Egg, 1);
    g.warp('point', 10, 10, [0, 1]);
    g.maps.point.set(10, 11, 'pond');
    await g.interact();
    assert.equal(g.goddess_gifts, 1, 'tide pools keep their own interaction');
    assert.equal(g.inv.Egg, 1);
  });

  test('all relocated landmarks have Teleport Stone stops on valid ground', async () => {
    const g = fresh();
    for (const label of ['Spring Mine (Skyline Ridge)', 'Goddess Pond (Skyline Ridge)', "Saibara's Forge (Skyline Ridge)"]) {
      g.menu = async (_title: string, options: string[]) => options.indexOf(label);
      await g.use_teleport_stone();
      assert.equal(g.mapname, 'ridge');
      assert.ok(TILES[g.map.tile(g.px, g.py)]?.[3], label);
    }
  });

  test('older saves relocate forage covered by the forge and still reopen in the farmhouse', () => {
    const g = fresh();
    const data = g.snapshot();
    data.forage.ridge = { '41,12': 'Juniper Berry' };
    g.applySaveData(data);
    assert.equal(g.mapname, 'house');
    const found = Object.entries(g.forage.ridge) as [string, string][];
    assert.equal(found.length, 1);
    assert.equal(found[0][1], 'Juniper Berry');
    const [x, y] = found[0][0].split(',').map(Number);
    assert.ok(TILES[g.maps.ridge.tile(x, y)]?.[3]);
    assert.deepEqual(data.forage.ridge, { '41,12': 'Juniper Berry' });
  });
});

describe('outer-region content', () => {
  test('each region forages from its own seasonal pool, with full item data', () => {
    const g = fresh();
    for (const region of REGIONS) {
      for (let season = 0; season < 4; season++) {
        g.season = season;
        const pool = REGION_FORAGE[region][SEASONS[season]];
        assert.deepEqual(g.forage_pool(region), pool, `${region} ${SEASONS[season]}`);
        const generic = new Set(FORAGE[SEASONS[season]]);
        assert.ok(pool.some((i: string) => !generic.has(i)), `${region} ${SEASONS[season]} has something of its own`);
        for (const item of pool) {
          const [price, , cat] = ITEMS[item] || [];
          assert.equal(cat, 'forage', `${item} is forage`);
          assert.ok(price > 0, `${item} ships for gold`);
          const [ch, fg] = FORAGE_GLYPH[item] || [];
          assert.equal(String(ch).length, 1, `${item} has a glyph`);
          assert.ok(fg in PALETTE, `${item} glyph colour`);
          assert.ok(g.museum_pool('forage').includes(item), `${item} can be donated`);
        }
        g.spawn_forage();
        const placed = Object.values(g.forage[region]) as string[];
        assert.ok(placed.length > 0, `${region} gets forage`);
        assert.ok(placed.every((i) => pool.includes(i)), `${region} only grows its own pool`);
      }
    }
    // the first four maps keep the valley-wide lists
    g.season = 2;
    assert.deepEqual(g.forage_pool('mountain'), FORAGE.Fall);
  });

  test('river and sea catches come from their own tables, and cook like any fish', () => {
    const g = fresh();
    for (const region of ['river', 'point']) {
      const table = REGION_CATCH[region];
      const allowed = new Set([...table.fish.map((f) => f.item), table.rare]);
      for (const item of allowed) assert.ok(ITEMS[item], `${item} exists`);
      assert.equal(ITEMS[table.rare][2], 'fish');
      assert.ok(ITEMS[table.rare][0] >= 500, 'the rare catch is worth the trip');
      g.mapname = region;
      g.levels['Fishing Rod'] = 4;
      for (let i = 0; i < 300; i++) assert.ok(allowed.has(g.roll_catch()), region);
      assert.equal(await_rare(g), table.rare, `${region} rare catch`);
    }
    g.mapname = 'mountain';
    for (let i = 0; i < 300; i++) assert.ok(!['Willow Chub', 'Mackerel', 'Elder Sturgeon', 'Storm Marlin'].includes(g.roll_catch()));
    g.inv = { Flour: 1, Egg: 1, Oil: 1, 'Willow Chub': 1 };
    assert.ok(g.ingredient_plan('Tempura'), 'new fish count as any:fish');
    g.inv = { Blackberry: 2 };
    assert.ok(g.ingredient_plan('Fruit Juice'), 'blackberries count as fruit');
  });

  test('Skyline Ridge lookout: a view of tomorrow, and a once-a-day lift', async () => {
    const g = fresh();
    const said = quiet(g);
    assert.equal(g.maps.ridge.signs['33,6'], 'ridge_lookout');
    g.warp('ridge', 33, 5, [0, 1]);
    g.tomorrow = 'Rain';
    g.stamina = 50;
    g.fatigue = 30;
    await g.interact();
    assert.equal(g.stamina, 50 + LOOKOUT_STAMINA);
    assert.equal(g.fatigue, 20);
    assert.ok(said[0].includes(LOOKOUT_VIEW.Rain));
    await g.interact();
    assert.equal(g.stamina, 50 + LOOKOUT_STAMINA, 'only once a day');
    assert.ok(said[1].includes(LOOKOUT_VIEW.Rain));
    g.day += 1;
    await g.interact();
    assert.equal(g.stamina, 50 + 2 * LOOKOUT_STAMINA, 'again the next day');
  });

  test("Lighthouse Point: the keeper's log reads one page a day and leaves Sea Glass at the end", async () => {
    const g = fresh();
    const said = quiet(g);
    assert.equal(g.maps.point.signs['45,10'], 'lighthouse_log');
    g.warp('point', 45, 11, [0, -1]);
    await g.interact();
    assert.equal(g.lighthouse_log, 1);
    assert.ok(said[0].includes(LIGHTHOUSE_LOG[0]));
    await g.interact();
    assert.equal(g.lighthouse_log, 1, 'one new page a day');
    assert.ok(said[1].includes('Come back tomorrow'));
    for (let page = 2; page <= LIGHTHOUSE_LOG.length; page++) {
      g.day += 1;
      await g.interact();
      assert.equal(g.lighthouse_log, page);
      assert.ok(said[said.length - 1].includes(LIGHTHOUSE_LOG[page - 1]));
    }
    assert.equal(g.inv['Sea Glass'], 1);
    g.day += 1;
    await g.interact();
    assert.equal(g.lighthouse_log, LIGHTHOUSE_LOG.length);
    assert.equal(g.inv['Sea Glass'], 1, 'the keepsake is given once');
  });

  test('Cedar Hollow pond takes a wild gift for a lucky day; it is not the Goddess Pond', async () => {
    const g = fresh();
    quiet(g);
    g.warp('woods', 47, 19, [1, 0]);
    assert.equal(g.maps.woods.tile(48, 19), 'pond');
    assert.equal(g.context_action().label, 'OFFER');
    g.inv = { Turnip: 1, Fiddlehead: 2 };
    g.held = 'Turnip';
    await g.interact();
    assert.equal(g.inv.Turnip, 1, 'crops are refused');
    assert.equal(g.hollow_luck_day, -1);
    g.held = 'Fiddlehead';
    await g.interact();
    assert.equal(g.inv.Fiddlehead, 1);
    assert.equal(g.hollow_luck_day, g.absday());
    assert.equal(g.goddess_gifts, 0, 'no Goddess offering here');
    await g.interact();
    assert.equal(g.inv.Fiddlehead, 1, 'once a day');
    // lucky pickups can come in pairs, today only
    g.face = [0, -1];
    g.forage.woods = { '47,18': 'Chanterelle' };
    await pinned(0, () => g.interact());
    assert.equal(g.inv.Chanterelle, 2);
    g.day += 1;
    g.forage.woods = { '47,18': 'Chanterelle' };
    await pinned(0, () => g.interact());
    assert.equal(g.inv.Chanterelle, 3, 'the luck lapses overnight');
  });

  test('Lighthouse Point tide pools are for looking at, not offerings', async () => {
    const g = fresh();
    const said = quiet(g);
    const m = g.maps.point;
    let spot: [number, number] | null = null;
    for (let y = 1; y < m.h - 1 && !spot; y++) for (let x = 2; x < m.w - 1 && !spot; x++) if (m.tile(x, y) === 'pond') spot = [x, y];
    assert.ok(spot, 'the point has tide pools');
    g.warp('point', spot![0] - 1, spot![1], [1, 0]);
    g.inv = { Fiddlehead: 1 };
    g.held = 'Fiddlehead';
    assert.equal(g.context_action().label, 'LOOK');
    await g.interact();
    assert.equal(said[0], TIDE_POOL_TEXT);
    assert.equal(g.inv.Fiddlehead, 1);
    assert.equal(g.goddess_gifts, 0);
  });

  test('Willow Bend: skip stones across the river and keep a record', async () => {
    const g = fresh();
    const m = g.maps.river;
    let spot: [number, number] | null = null;
    for (let y = 2; y < m.h - 2 && !spot; y++) for (let x = 2; x < m.w - 2 && !spot; x++) {
      if (m.tile(x, y) === 'grass' && m.tile(x + 1, y) === 'water') spot = [x, y];
    }
    assert.ok(spot);
    g.warp('river', spot![0], spot![1], [1, 0]);
    g.tool = 'Hoe';
    assert.deepEqual(g.context_action(), { key: 'x', label: 'SKIP' });
    g.tool = 'Fishing Rod';
    assert.equal(g.context_action().label, 'CAST');
    const stamina = g.stamina;
    await pinned(0, () => g.interact());
    assert.equal(g.skip_best, 12);
    assert.ok(g.stamina < stamina, 'skipping costs a little stamina');
    await pinned(0.99, () => g.interact());
    assert.equal(g.skip_best, 12, 'a short skip keeps the record');
    assert.ok(g.msgs.some(([t]: [string]) => t.includes('Record: 12')));
  });

  test('landmark progress saves, loads, and defaults in older saves', () => {
    const a = fresh();
    Object.assign(a, { lookout_day: 7, hollow_luck_day: 7, skip_best: 9, lighthouse_log: 3, lighthouse_day: 6 });
    a.save(2);
    const b = new Game(new Screen(132, 30), true) as any;
    b.load(2);
    for (const k of ['lookout_day', 'hollow_luck_day', 'skip_best', 'lighthouse_log', 'lighthouse_day']) assert.equal(b[k], a[k], k);
    const d = JSON.parse(store['hrvstmn-save-2']);
    for (const k of ['lookout_day', 'hollow_luck_day', 'skip_best', 'lighthouse_log', 'lighthouse_day']) delete d[k];
    store['hrvstmn-save-2'] = JSON.stringify(d);
    const c = new Game(new Screen(132, 30), true) as any;
    c.load(2);
    assert.deepEqual(
      [c.lookout_day, c.hollow_luck_day, c.skip_best, c.lighthouse_log, c.lighthouse_day],
      [-1, -1, 0, 0, -1]
    );
    // a new farm starts the landmarks over
    a.new_game('Pete', 'Moon');
    assert.equal(a.skip_best, 0);
    assert.equal(a.lighthouse_log, 0);
  });
});

/** Roll until the rare catch shows up (it is a few percent with a Mystrile rod). */
function await_rare(g: any): string | null {
  const rare = REGION_CATCH[g.mapname].rare;
  for (let i = 0; i < 5000; i++) if (g.roll_catch() === rare) return rare;
  return null;
}
