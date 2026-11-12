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
  DIG_CAP,
  DIG_MAPS,
  DIG_RELICS,
  INN_SCENES,
  INN_EVENING_DAY,
  INN_LISTEN_FRIEND,
  INN_JOIN_FRIEND,
  GRAY_COPPER_QTY,
  GRAY_COPPER_REWARD,
  GRAY_QUEST_FRIEND,
  VALLEY_LANDMARKS,
  PUBLIC_WORKS,
} from './constants';
import { footbridge_cells, FOOTBRIDGE_SIGN } from './map';

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
  test('the clock and villagers wait while the game menu is open', async () => {
    const g = fresh();
    g.warp('farm', 14, 10); // outdoors, where the clock runs
    g.paused = true;
    const [minutes, acc, npcAcc] = [g.minutes, g.acc, g.npc_acc];
    g.last = Date.now() / 1000 - 10; // ten seconds pass with the menu open
    await g.update();
    assert.deepEqual([g.minutes, g.acc, g.npc_acc], [minutes, acc, npcAcc]);
    g.paused = false;
    g.last = Date.now() / 1000 - 0.2;
    await g.update();
    assert.ok(g.acc > acc, 'time runs again once the menu closes');
  });

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

/** Run fn with Math.random returning the given values first, then real randomness. */
const withRandom = <T,>(values: number[], fn: () => T): T => {
  const real = Math.random;
  let i = 0;
  Math.random = () => (i < values.length ? values[i++] : real());
  try {
    return fn();
  } finally {
    Math.random = real;
  }
};

describe('the rearranged valley', () => {
  test('forage saved under a building that has since moved in is dropped on load', () => {
    const g = fresh();
    const door = Object.keys(g.maps.river.doors)[0].split(',').map(Number);
    g.forage.river = { [`${door[0]},${door[1] - 1}`]: 'Watercress', '3,3': 'Watercress' };
    g.save(2);
    const b = new Game(new Screen(132, 30), true) as any;
    b.load(2);
    assert.deepEqual(Object.keys(b.forage.river), ['3,3']);
  });

  test('dig spots and forage turn up in Ironwood Grove, and the Teleport Stone reaches the forge', () => {
    const g = fresh();
    assert.ok(DIG_MAPS.includes('grove'));
    for (const season of SEASONS) assert.ok(REGION_FORAGE.grove[season].length >= 3, season);
    for (const pool of Object.values(REGION_FORAGE.grove)) for (const item of pool) assert.ok(ITEMS[item], `${item} is a real item`);
    g.spawn_forage();
    assert.ok(Object.keys(g.forage.grove).length > 0);
    assert.ok(g.walkable('grove', 22, 18), 'the Teleport Stone lands on open ground by the forge');
  });
});

describe('daily surprises', () => {
  const digsOn = (g: any, map: string) => Object.entries(g.objs[map] || {}).filter(([, o]) => o === 'dig').map(([k]) => k);

  test('dig spots grow on open ground, never more than DIG_CAP a map, and not on frozen farmland', () => {
    const g = fresh();
    for (let day = 0; day < 20; day++) g.spawn_digs();
    for (const map of DIG_MAPS) {
      const spots = digsOn(g, map);
      assert.ok(spots.length <= DIG_CAP, `${map} holds at most ${DIG_CAP}`);
      for (const k of spots) {
        const [x, y] = k.split(',').map(Number);
        const tile = g.maps[map].tile(x, y);
        assert.ok(map === 'farm' ? tile === 'field' : tile === 'grass' || tile === 'sand', `${map} ${k} is open ground (${tile})`);
        assert.ok(!(k in (g.forage[map] || {})), 'not on forage');
      }
    }
    assert.ok(DIG_MAPS.some((m) => digsOn(g, m).length > 0), 'twenty mornings grow some dig spots');
    const w = fresh();
    w.season = 3;
    for (const k of digsOn(w, 'farm')) delete w.objs.farm[k]; // the new game's spring spot
    for (let day = 0; day < 20; day++) w.spawn_digs();
    assert.equal(digsOn(w, 'farm').length, 0, 'none on the farm in Winter');
  });

  test('the Hoe digs a spot up for coins, ore, seeds, forage or a relic', async () => {
    const outcomes = new Set<string>();
    for (const roll of [0.05, 0.2, 0.45, 0.65, 0.9]) {
      const g = fresh();
      g.warp('farm', 14, 10);
      const [tx, ty] = g.target();
      g.objs.farm[`${tx},${ty}`] = 'dig';
      g.tool = 'Hoe';
      assert.deepEqual(g.context_action(), { key: 'space', label: 'DIG' });
      const [gold, inv] = [g.gold, JSON.stringify(g.inv)];
      await withRandom([roll, 0], () => g.use_tool());
      assert.equal(g.objs.farm[`${tx},${ty}`], undefined, 'the spot is used up');
      assert.ok(g.gold > gold || JSON.stringify(g.inv) !== inv, `roll ${roll} finds something`);
      if (Object.keys(g.inv).some((i) => DIG_RELICS.includes(i))) outcomes.add('relic');
      if (g.gold > gold) outcomes.add('gold');
    }
    assert.deepEqual([...outcomes].sort(), ['gold', 'relic']);
  });

  test('relics have their own museum wing, Star Fragment included', () => {
    const g = fresh();
    assert.ok(g.museum_categories().some(([, c]: [string, string]) => c === 'relic'));
    const wing = g.museum_pool('relic');
    for (const r of [...DIG_RELICS, 'Star Fragment']) assert.ok(wing.includes(r), `${r} can be donated`);
  });

  test('a falling star lands on open field and the Hammer cracks it open', async () => {
    const g = fresh();
    const report: string[] = [];
    withRandom([0, 0], () => g.night_surprise(report)); // surprise roll passes, first kind is the star
    const star = Object.entries(g.objs.farm).find(([, o]) => o === 'starrock');
    assert.ok(star, 'a star landed');
    assert.match(report[0], /falling star/);
    const [sx, sy] = star![0].split(',').map(Number);
    g.warp('farm', sx, sy + 1);
    g.face = [0, -1];
    g.tool = 'Hammer';
    assert.equal(g.context_action().label, 'CRACK');
    await g.use_tool();
    assert.equal(g.objs.farm[star![0]], undefined);
    assert.equal(g.inv['Star Fragment'], 1);
  });

  test('glowmoths grow some crops a day; most nights nothing happens', () => {
    const g = fresh();
    const keys = ['20,12', '21,12', '22,12', '23,12'];
    for (const k of keys) g.crops[k] = ['Turnip', 0];
    const report: string[] = [];
    withRandom([0, 0.99, 0.5], () => g.night_surprise(report)); // the last kind on the list is glowmoths
    assert.match(report[0], /Glowmoths/);
    assert.equal(keys.reduce((n, k) => n + g.crops[k][1], 0), 4, 'each of the four crops grew a day');
    const quiet: string[] = [];
    withRandom([0.99], () => g.night_surprise(quiet));
    assert.deepEqual(quiet, []);
  });

  test('a doorstep parcel brings forage from a friend', () => {
    const g = fresh();
    g.friend = { Ann: 40 };
    const report: string[] = [];
    withRandom([0, 0.6, 0], () => g.night_surprise(report)); // kinds: star, parcel -> parcel
    assert.match(report[0], /^Ann left a parcel by your door: 2 /);
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

describe("Friday evenings at Doug's Inn (task 01)", () => {
  // Spring 5, Year 1 is a Friday (absday 4).
  const friday = (minutes = 19 * 60) => {
    const g = fresh();
    g.day = 5;
    g.minutes = minutes;
    assert.equal(g.weekday, INN_EVENING_DAY);
    return g;
  };
  const labels = async (g: any) => (await g.shop_options('inn')).map((o: any) => o[0]);

  test('the inn offers one scene on Friday evenings only', async () => {
    const g = friday();
    assert.ok((await labels(g))[0].startsWith('Friday evening: '));
    assert.ok(!(await labels(friday(15 * 60))).some((l: string) => l.startsWith('Friday')), 'not in the afternoon');
    assert.ok(!(await labels(friday(22 * 60))).some((l: string) => l.startsWith('Friday')), 'not after 10 PM');
    const thu = friday();
    thu.day = 4;
    assert.ok(!(await labels(thu)).some((l: string) => l.startsWith('Friday')), 'not on Thursday');
  });

  test('listening raises friendship once and the scene leaves the menu for the night', async () => {
    const g = friday();
    const said = quiet(g);
    g.menu = async () => 0; // Listen
    const scene = g.inn_scene();
    const before = scene.cast.map((n: string) => g.friend[n] || 0);
    await g.inn_evening();
    assert.deepEqual(scene.cast.map((n: string) => g.friend[n]), before.map((f: number) => f + INN_LISTEN_FRIEND));
    assert.equal(said.length, scene.listen.length);
    assert.ok(g.inn_scenes_seen.includes(scene.id));
    assert.ok(!(await labels(g)).some((l: string) => l.startsWith('Friday')));
  });

  test('joining gives more friendship and the scene payoff', async () => {
    const g = friday();
    quiet(g);
    g.menu = async () => 1; // join in
    while (g.inn_scene().id !== 'recipes') g.inn_scenes_seen.push(g.inn_scene().id);
    const before = g.friend['Ann'] || 0;
    const cookies = g.inv['Cookies'] || 0;
    await g.inn_evening();
    assert.equal(g.friend['Ann'], before + INN_JOIN_FRIEND);
    assert.equal(g.inv['Cookies'], cookies + 1);
  });

  test('a scene you have seen waits until the others have been seen', () => {
    const g = friday();
    const first = g.inn_scene().id;
    g.day = 12; // the next Friday
    g.inn_scenes_seen = [first];
    assert.notEqual(g.inn_scene().id, first);
    g.inn_scenes_seen = INN_SCENES.map((s) => s.id);
    assert.ok(INN_SCENES.some((s) => s.id === g.inn_scene().id), 'all seen: the rotation repeats');
  });

  test("Today's Plan names the evening on Fridays, and the attendance survives a reload", async () => {
    const g = friday();
    assert.ok(g.today_lines().some((l: string) => l.includes(g.inn_scene().title)));
    quiet(g);
    g.menu = async () => 0;
    await g.inn_evening();
    assert.ok(g.today_lines().some((l: string) => l.includes("Friday evening at Doug's")));
    const h = fresh();
    h.applySaveData(JSON.parse(JSON.stringify(g.snapshot())));
    assert.deepEqual(h.inn_scenes_seen, g.inn_scenes_seen);
    assert.equal(h.inn_evening_day, g.absday());
    const old = JSON.parse(JSON.stringify(g.snapshot()));
    delete old.inn_scenes_seen;
    delete old.inn_evening_day;
    const k = fresh();
    k.applySaveData(old);
    assert.deepEqual(k.inn_scenes_seen, []);
    assert.equal(k.inn_evening_day, -1);
  });
});

describe("Gray's two-chapter copper request (task 04)", () => {
  const talkGray = async (g: any) => {
    const said: string[] = [];
    g.say = async (text: string) => { said.push(text); };
    await g.talk('Gray');
    return said;
  };

  test('chapter one: Gray asks for copper, then reminds you once a day', async () => {
    const g = fresh();
    const ask = await talkGray(g);
    assert.equal(g.gray_quest, 1);
    assert.ok(ask[0].includes(`${GRAY_COPPER_QTY} Copper`));
    g.talked.clear();
    const remind = await talkGray(g);
    assert.ok(remind[0].includes('Still need'));
    assert.equal(g.gray_quest, 1, 'nothing delivered without copper');
    assert.ok(g.today_lines().some((l: string) => l.includes('Copper from the Spring Mine')));
  });

  test('delivering copper pays, starts chapter two and leaves a note for the next can upgrade', async () => {
    const g = fresh();
    await talkGray(g);
    g.give('Copper', GRAY_COPPER_QTY + 1);
    const [gold, friend, done] = [g.gold, g.friend['Gray'] || 0, g.requests_done];
    g.talked.clear();
    const said = await talkGray(g);
    assert.equal(g.inv['Copper'], 1, 'takes exactly the copper asked for');
    assert.equal(g.gold, gold + GRAY_COPPER_REWARD);
    assert.ok(g.friend['Gray'] >= friend + GRAY_QUEST_FRIEND);
    assert.equal(g.requests_done, done + 1);
    assert.equal(g.gray_quest, 2);
    assert.equal(g.gray_note_level, 1, 'a Basic can is pointed at Copper');
    assert.ok(said.some((l) => l.includes('Copper is the one to save for') && l.includes('1000G')));
    assert.ok(said.some((l) => l.includes('Mystrile') && l.includes('15 tiles')), 'names the big jump');
    assert.ok(g.today_lines().some((l: string) => l.includes('Take Saibara 1000G + 1 Copper')));
  });

  test('chapter two closes once the can reaches the noted level', async () => {
    const g = fresh();
    await talkGray(g);
    g.give('Copper', GRAY_COPPER_QTY);
    g.talked.clear();
    await talkGray(g);
    g.talked.clear();
    assert.ok((await talkGray(g))[0].includes('Remember my note'));
    g.levels['Watering Can'] = 1;
    const friend = g.friend['Gray'];
    const said = await talkGray(g);
    assert.equal(g.gray_quest, 3);
    assert.ok(said[0].includes('Copper can'));
    assert.ok(g.friend['Gray'] >= friend + GRAY_QUEST_FRIEND);
    assert.ok(!g.today_lines().some((l: string) => l.startsWith('  Note')));
    g.talked.clear();
    await talkGray(g); // ordinary chatter afterwards
    assert.equal(g.gray_quest, 3);
  });

  for (const [lvl, words] of [[4, 'Lake Mine'], [5, 'Carter'], [6, 'Mythic'], [7, 'nothing left']] as const) {
    test(`a level ${lvl} can gets a closing line about ${words}, and no note`, async () => {
      const g = fresh();
      g.levels['Watering Can'] = lvl;
      await talkGray(g);
      g.give('Copper', GRAY_COPPER_QTY);
      g.talked.clear();
      const said = await talkGray(g);
      assert.equal(g.gray_quest, 3);
      assert.ok(said.some((l) => l.includes(words)), said.join(' / '));
      assert.ok(!g.today_lines().some((l: string) => l.startsWith('  Note')));
    });
  }

  test('from a Silver can, Gold is next and Mystrile is named as the big jump without "everything between"', async () => {
    const g = fresh();
    g.levels['Watering Can'] = 2;
    await talkGray(g);
    g.give('Copper', GRAY_COPPER_QTY);
    g.talked.clear();
    const said = await talkGray(g);
    assert.ok(said.some((l) => l.includes('Gold is the one to save for')));
    const jump = said.find((l) => l.includes('Mystrile'))!;
    assert.ok(jump && !jump.includes('Everything between'), jump);
  });

  test('a can already at the forge is counted: the advice and note point past it', async () => {
    const g = fresh();
    await talkGray(g);
    g.give('Copper', GRAY_COPPER_QTY);
    g.upgrading = ['Watering Can', g.absday() + 1];
    g.talked.clear();
    const said = await talkGray(g);
    assert.ok(said.some((l) => l.startsWith("Once Saibara's done") && l.includes('Silver is the one to save for')));
    assert.equal(g.gray_note_level, 2);
    assert.ok(g.today_lines().some((l: string) => l.includes('Take Saibara 2000G + 1 Silver')));
    // paying for the noted upgrade turns the note into a pick-up reminder
    g.upgrading = null;
    g.levels['Watering Can'] = 1;
    g.upgrading = ['Watering Can', g.absday() + 1];
    assert.ok(g.today_lines().some((l: string) => l.includes('Saibara has your can')));
  });

  test('marrying Gray mid-quest does not strand it', async () => {
    const g = fresh();
    await talkGray(g);
    g.married = 'Gray';
    g.mapname = 'house';
    g.give('Copper', GRAY_COPPER_QTY);
    g.talked.clear();
    await talkGray(g);
    assert.equal(g.gray_quest, 2);
    assert.equal(g.inv['Copper'] || 0, 0);
  });

  test("quest talks still check for the Mary & Gray rival event", async () => {
    const g = fresh();
    let checked = 0;
    g.check_heart_and_rival_events = async () => { checked++; };
    await talkGray(g);
    assert.equal(checked, 1);
  });

  test('a held gift still goes to Gray as a gift, not to the quest', async () => {
    const g = fresh();
    g.give('Copper', 1);
    g.held = 'Copper';
    await talkGray(g);
    assert.equal(g.gray_quest, 0);
    assert.ok(g.gifted.has('Gray'));
  });

  test('quest progress survives a reload; old saves start before chapter one', () => {
    const g = fresh();
    g.gray_quest = 2;
    g.gray_note_level = 2;
    const h = fresh();
    h.applySaveData(JSON.parse(JSON.stringify(g.snapshot())));
    assert.equal(h.gray_quest, 2);
    assert.equal(h.gray_note_level, 2);
    const old = JSON.parse(JSON.stringify(g.snapshot()));
    delete old.gray_quest;
    delete old.gray_note_level;
    const k = fresh();
    k.applySaveData(old);
    assert.equal(k.gray_quest, 0);
  });
});

describe('labeled valley map (task 33)', () => {
  const rowText = (g: any, y: number) => g.scr.buf[y].map((c: any) => c[0]).join('');
  const screenText = (g: any) => g.scr.buf.map((r: any) => r.map((c: any) => c[0]).join('')).join('\n');

  test('every landmark sits on a real door or sign of its map', () => {
    const g = fresh();
    for (const lm of VALLEY_LANDMARKS) {
      const m = g.maps[lm.map];
      assert.ok(m, `${lm.id}: map ${lm.map}`);
      const k = `${lm.x},${lm.y}`;
      assert.ok(k in m.doors || k in m.signs, `${lm.id} at ${k} on ${lm.map}`);
      if (lm.bid) assert.equal(m.doors[k], lm.bid, `${lm.id} door is ${lm.bid}`);
    }
    const glyphs = VALLEY_LANDMARKS.map((l) => l.glyph);
    assert.equal(new Set(glyphs).size, glyphs.length, 'symbols are distinct');
  });

  test('the pin points to the next map exit, then to the landmark itself', () => {
    const g = fresh();
    g.map_pin = 'forge';
    g.warp('farm', 14, 10);
    let r = g.pin_route();
    assert.equal(r.text, 'west exit to Ironwood Grove');
    assert.equal(r.cell[0], 0, 'the exit cell is on the west edge');
    assert.equal(g.maps.farm.warps[`${r.cell[0]},${r.cell[1]}`][0], 'grove');
    g.warp('woods', 30, 2);
    assert.equal(g.pin_route().text, 'north exit to Your Farm, toward Ironwood Grove');
    g.warp('grove', 30, 16);
    r = g.pin_route();
    assert.match(r.text, /^\d+ steps west$/);
    assert.deepEqual(r.cell, [18, 16]);
    g.warp('in_inn', ...g.interiors.inn.entry);
    assert.equal(g.pin_route().text, 'step outside to Mineral Town');
    g.map_pin = 'lookout';
    g.warp('beach', 30, 5);
    assert.equal(g.pin_route().text, "north exit to Mineral Town, toward Skyline Ridge");
  });

  test('the minimap and the map view show where to go while a pin is set', () => {
    const g = fresh();
    g.warp('farm', 14, 10);
    g.map_pin = 'forge';
    g.show_minimap = true;
    g.render();
    const tags = g.scr.tags.flat().filter(Boolean).map((t: any) => t.k);
    assert.ok(tags.includes('minimap:pin'), 'exit marked on the minimap');
    assert.ok(screenText(g).includes(' < Ironwood Grove '), 'minimap title names the next region');
    // the title stays inside the minimap's frame: its top row ends in a corner, and nothing spills past it
    const top = g.scr.buf.findIndex((r: any) => r.map((c: any) => c[0]).join('').includes('< Ironwood Grove'));
    const row = rowText(g, top);
    const start = row.indexOf('+-');
    const end = row.indexOf('+', start + 1);
    assert.ok(end > row.indexOf('Ironwood Grove'), row);
    // a next region too long for the frame is clipped with an ellipsis, still inside the corner
    g.map_pin = 'lighthouse';
    g.warp('beach', 30, 5);
    g.render();
    const lrow = g.scr.buf.map((r: any) => r.map((c: any) => c[0]).join('')).find((r: string) => r.includes('> Lighthouse'));
    assert.ok(lrow && lrow.includes('…'), lrow);
    assert.ok(lrow.indexOf('+', lrow.indexOf('…')) === lrow.indexOf('…') + 2, lrow);
    g.map_pin = 'forge';
    g.warp('farm', 14, 10);
    g.show_minimap = false;
    g.render();
    const hint = g.scr.buf[0].map((c: any) => c[0]).join('');
    assert.ok(hint.includes("⚒ Saibara's Forge: west exit"), hint);
    g.map_pin = null;
    g.render();
    assert.ok(!rowText(g, 0).includes("Saibara's Forge"), 'no pointer without a pin');
  });

  test('G opens the map; arrows pick a landmark, Enter pins and unpins, Esc closes', async () => {
    const g = fresh();
    g.warp('farm', 14, 10);
    for (const k of ['right', 'enter', 'esc']) g.scr.pushKey(k);
    await g.handle('g');
    assert.equal(g.map_pin, 'forge', 'from the farmhouse, one step right is the forge');
    for (const k of ['enter', 'esc']) g.scr.pushKey(k);
    await g.handle('G');
    assert.equal(g.map_pin, null, 'Enter on the pinned landmark clears it');
    for (const k of ['down', 'enter', 'esc']) g.scr.pushKey(k);
    await g.valley_map();
    assert.equal(g.map_pin, 'forge', 'down moves to the next region');
  });

  for (const [w, h] of [[80, 24], [50, 24], [50, 28], [132, 40]]) {
    test(`the valley map fits a ${w}x${h} screen with every symbol and the forge hours`, () => {
      const g = fresh();
      g.scr = new Screen(w, h);
      g.warp('town', 30, 12);
      g.render();
      g.draw_valley(0);
      const text = screenText(g);
      for (const lm of g.valley_landmarks()) assert.ok(text.includes(lm.glyph), `${lm.id} ${lm.glyph}`);
      assert.ok(text.includes('Forge '), 'forge status line');
      assert.ok(text.includes(w < 80 ? '<> pick  ^v region  Enter pin  Esc' : 'Left/Right landmark  Up/Down region  Enter pin  Esc close'), 'whole key hint');
      for (const row of g.scr.buf) assert.equal(row.length, w);
      // the right border of the overlay is intact on the region rows
      for (let y = 1; y < 16; y++) assert.equal(g.scr.buf[y][w - 1][0], '|', `row ${y}: ${rowText(g, y)}`);
    });
  }

  test("Today's Plan shows the forge hours always and the pin when set; the pin survives a reload", () => {
    const g = fresh();
    g.day = 2;
    g.minutes = 12 * 60;
    assert.ok(g.today_lines().includes('  Forge  open until 4PM'));
    g.day = 4; // Thursday
    assert.ok(g.today_lines().includes('  Forge  closed today (Thu); opens tomorrow 10AM'));
    g.day = 7; // Spring 7, 5 PM: the eve of the Spring 8 festival
    g.minutes = 17 * 60;
    assert.ok(g.fest_on(1), 'Spring 8 is a festival');
    assert.ok(!g.today_lines().includes('  Forge  closed for the day; opens tomorrow 10AM'), 'not "tomorrow" on a festival eve');
    g.day = 2;
    g.minutes = 12 * 60;
    g.map_pin = 'museum';
    g.warp('farm', 14, 10);
    assert.ok(g.today_lines().some((l: string) => l.includes('Pin    Museum: east exit to Mineral Town')));
    const h = fresh();
    h.applySaveData(JSON.parse(JSON.stringify(g.snapshot())));
    assert.equal(h.map_pin, 'museum');
    const old = JSON.parse(JSON.stringify(g.snapshot()));
    delete old.map_pin;
    const k = fresh();
    k.applySaveData(old);
    assert.equal(k.map_pin, null);
  });

  test("inside the pinned building you're there; in a mine the pin points up the ladder", () => {
    const g = fresh();
    g.map_pin = 'museum';
    g.warp('in_museum', ...g.interiors.museum.entry);
    assert.equal(g.pin_route().text, "you're there");
    g.map_pin = 'farmhouse';
    g.warp('house', 5, 5);
    assert.equal(g.pin_route().text, "you're there");
    g.map_pin = 'forge';
    g.enter_mine(3, 'spring');
    const r = g.pin_route();
    assert.equal(r.text, "climb out to Mother's Hill");
    assert.equal(g.map.tile(r.cell[0], r.cell[1]), 'up');
    assert.notEqual(r.arrow, '>', 'points at the ladder, not a default arrow');
  });

  test('at 50 columns the on-map pointer uses its short form, whole', () => {
    const g = fresh();
    g.scr = new Screen(50, 24);
    g.warp('farm', 14, 10);
    g.map_pin = 'forge';
    g.render();
    const row = g.scr.buf[1].map((c: any) => c[0]).join(''); // row 0 is the compact top bar
    assert.ok(row.includes('⚒ west exit: Ironwood Grove'), row);
    assert.ok(!row.includes('…'));
  });

  test('the forge reads as closed on its closed day and on festival days', () => {
    const g = fresh();
    g.day = 4; // absday 3: Thursday
    g.minutes = 12 * 60;
    assert.equal(g.weekday, 3);
    assert.equal(g.forge_status().open, false);
    g.day = 2;
    g.fest_on = () => ['Test Festival', 9, 17];
    assert.equal(g.forge_status().open, false);
    g.fest_on = () => null;
    assert.equal(g.forge_status().open, true);
  });
});

describe('the Willow Bend footbridge (task 12)', () => {
  const [SX, SY] = FOOTBRIDGE_SIGN;
  /** Walk the river's south bank (below the road) from the sign's west side; can we reach the dock path? */
  const crosses = (g: any): boolean => {
    const seen = new Set<string>();
    const queue: [number, number][] = [[SX - 1, SY]];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      const k = `${x},${y}`;
      if (seen.has(k) || y < 15 || !g.walkable('river', x, y)) continue;
      seen.add(k);
      if (g.maps.river.tile(x, y) === 'path' && x > SX + 4) return true; // the far-bank path behind the dock
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return false;
  };
  /** Hand Gotz everything the project needs, with Turnips as the crop. */
  const deliverAll = (g: any) => {
    g.give('Lumber', PUBLIC_WORKS.needs.Lumber);
    g.give('Copper', PUBLIC_WORKS.needs.Copper);
    g.give('Turnip', PUBLIC_WORKS.crop_qty);
    for (const i of ['Lumber', 'Copper', 'Turnip']) g.works_deliver(i);
  };
  const sleep = async (g: any) => {
    const said = quiet(g);
    await g.new_day('passout');
    return said;
  };

  test('a washed-out crossing beside a readable sign, reachable from the west bank', async () => {
    const g = fresh();
    const m = g.maps.river;
    assert.equal(m.tile(SX, SY), 'sign');
    assert.equal(m.signs[`${SX},${SY}`], 'footbridge');
    assert.ok(footbridge_cells().some(([x, y]) => x === SX + 1 && y === SY), 'the sign stands beside the water');
    for (const [x, y] of footbridge_cells()) {
      assert.equal(m.tile(x, y), 'water', `${x},${y}`);
      assert.equal(m.tile(x + 1, y) === 'bridge' || footbridge_cells().some(([a, b]) => a === x + 1 && b === y), true, 'the dock planks are east of the gap');
    }
    assert.equal(crosses(g), false, 'no way across below the road yet');
    // read it in game: stand west of the sign, face it, press X
    g.warp('river', SX - 1, SY);
    g.face = [1, 0];
    const said = quiet(g);
    await g.handle('x');
    assert.match(said.join(' '), /washed out.*Gotz could rebuild it/);
  });

  test("Gotz's menu offers the project; partial deliveries count and only what is missing is taken", () => {
    const g = fresh();
    g.give('Lumber', 5);
    assert.equal(g.works_deliver('Lumber'), 5);
    assert.equal(g.inv['Lumber'] ?? 0, 0);
    g.give('Lumber', 10);
    assert.equal(g.works_deliver('Lumber'), 7, 'only the 7 still needed');
    assert.equal(g.inv['Lumber'], 3);
    assert.equal(g.public_works.delivered['Lumber'], 12);
    assert.equal(g.works_deliver('Lumber'), 0, 'lumber is done');
    g.give('Copper', 1);
    g.works_deliver('Copper');
    assert.equal(g.works_line(), 'Gotz needs 1 Copper, 3 of one farm crop');
    assert.equal(g.public_works.done_day, null);
  });

  test('the crop slot takes any one farm crop you carry, then sticks to it', () => {
    const g = fresh();
    g.give('Turnip', 2);
    g.give('Potato', 5);
    g.give('Egg', 4);
    g.give('Grass', 9);
    const offered = g.works_offers().map(([i]: [string, number]) => i).sort();
    assert.deepEqual(offered, ['Potato', 'Turnip'], 'crops only');
    assert.equal(g.works_deliver('Turnip'), 2);
    assert.equal(g.public_works.crop, 'Turnip');
    assert.deepEqual(g.works_offers(), [], 'Potatoes no longer count');
    assert.equal(g.works_deliver('Potato'), 0);
    g.give('Turnip', 4);
    assert.equal(g.works_deliver('Turnip'), 1);
    assert.equal(g.inv['Turnip'], 3);
  });

  test('the menu shows progress and hands over what you carry', async () => {
    const g = fresh();
    const opts = await g.shop_options('carpenter');
    assert.equal(opts[0][0], `Village project: ${PUBLIC_WORKS.name}`);
    g.give('Lumber', 4);
    g.give('Potato', 3);
    const said = quiet(g);
    let info: string[] = [];
    g.menu = async (_t: string, o: string[], _s: number, i: string[]) => {
      info = i;
      return o.indexOf('Hand over 4 Lumber') >= 0 ? o.indexOf('Hand over 4 Lumber') : null;
    };
    await g.works_menu();
    assert.match(said[0], /Basil/, 'Gotz names the neighbour who wants the bridge');
    assert.equal(g.public_works.delivered['Lumber'], 4);
    assert.ok(info.some((l) => l.includes('Lumber 4/12')), info.join('|'));
    assert.ok(info.some((l) => l.includes('Still needed: 8 Lumber')), info.join('|'));
  });

  test('the last delivery starts the build; two nights later the river can be crossed', async () => {
    const g = fresh();
    const f0 = { Gotz: g.friend['Gotz'], Basil: g.friend['Basil'] };
    deliverAll(g);
    assert.equal(g.public_works.done_day, g.absday() + PUBLIC_WORKS.days);
    assert.match(g.works_line(), /^Gotz and Basil are building the footbridge \(done Spring 3\)$/);
    assert.ok(g.today_lines().includes('  Bridge Gotz and Basil are building the footbridge (done Spring 3)'));
    assert.equal(g.valley_landmarks().some((l: any) => l.id === 'footbridge'), false, 'no landmark yet');
    await sleep(g);
    assert.equal(g.public_works.built, false, 'one night is not enough');
    assert.equal(crosses(g), false);
    const said = await sleep(g);
    assert.equal(g.public_works.built, true);
    assert.ok(said.some((t) => t.includes('finished the Willow Bend footbridge')), said.join('|'));
    for (const [x, y] of footbridge_cells()) {
      assert.equal(g.maps.river.tile(x, y), 'bridge');
      assert.equal(g.walkable('river', x, y), true);
    }
    assert.equal(crosses(g), true, 'the west bank reaches the dock path');
    assert.equal(g.friend['Gotz'], f0.Gotz + PUBLIC_WORKS.friend);
    assert.equal(g.friend['Basil'], f0.Basil + PUBLIC_WORKS.friend);
    assert.equal(g.works_line(), null);
    assert.ok(!g.today_lines().some((l: string) => l.includes('Bridge')));
    assert.match(g.footbridge_sign(), /^Willow Bend footbridge — Rebuilt by Gotz, Basil and Pete, Spring 3, Year 1\.$/);
    const opts = await g.shop_options('carpenter');
    assert.ok(!opts.some(([o]: [string]) => o.startsWith('Village project')), 'the project leaves the menu');
  });

  test('the Valley Map shows the footbridge only once it is built', () => {
    const g = fresh();
    const lm = VALLEY_LANDMARKS.find((l) => l.id === 'footbridge')!;
    assert.deepEqual([lm.map, lm.x, lm.y], ['river', SX, SY], 'it stands on the sign');
    assert.ok(!VALLEY_LANDMARKS.some((l) => l !== lm && l.glyph === lm.glyph));
    g.map_pin = 'footbridge';
    assert.equal(g.pin_route(), null, 'cannot route to an unbuilt bridge');
    g.map_pin = null;
    // before the build the map neither draws nor lists it, whichever landmark is selected
    for (const [w, h] of [[80, 24], [50, 24]]) {
      for (let sel = 0; sel < g.valley_landmarks().length; sel++) {
        g.scr = new Screen(w, h);
        g.draw_valley(sel);
        const text = g.scr.buf.map((r: any) => r.map((c: any) => c[0]).join('')).join('\n');
        assert.ok(!text.includes('≡'), `no bridge symbol at ${w}x${h}, selection ${sel}`);
        assert.ok(!text.includes('footbridge'), `no bridge name at ${w}x${h}, selection ${sel}`);
      }
    }
    g.public_works.built = true;
    g.map_pin = 'footbridge';
    assert.ok(g.valley_landmarks().includes(lm));
    assert.ok(g.pin_route());
    for (const [w, h] of [[80, 24], [50, 24]]) {
      g.scr = new Screen(w, h);
      g.draw_valley(g.valley_landmarks().indexOf(lm));
      const text = g.scr.buf.map((r: any) => r.map((c: any) => c[0]).join('')).join('\n');
      assert.ok(text.includes('≡'), `${w}x${h}`);
      assert.ok(text.includes('Willow Bend footbridge'), `${w}x${h}`);
    }
  });

  test('the unbuilt footbridge cannot be chosen or pinned on the Valley Map', async () => {
    const g = fresh();
    g.warp('river', 10, 12);
    // step right 0..N times from the starting landmark, pin whatever is selected, close
    for (let steps = 0; steps <= VALLEY_LANDMARKS.length; steps++) {
      g.map_pin = null;
      for (let i = 0; i < steps; i++) g.scr.pushKey('right');
      g.scr.pushKey('enter');
      g.scr.pushKey('esc');
      await g.valley_map();
      assert.ok(g.map_pin, 'something was pinned');
      assert.notEqual(g.map_pin, 'footbridge', `after ${steps} steps right`);
    }
  });

  test('progress and the built bridge survive a reload; old saves start the project fresh', () => {
    const a = fresh();
    a.give('Lumber', 6);
    a.works_deliver('Lumber');
    const b = new Game(new Screen(132, 30), true) as any;
    b.applySaveData(JSON.parse(JSON.stringify(a.snapshot())));
    assert.deepEqual(b.public_works, a.public_works);
    deliverAll(a);
    a.public_works.done_day = a.absday();
    a.works_day();
    a.save(2);
    const c = new Game(new Screen(132, 30), true) as any;
    c.load(2);
    assert.equal(c.public_works.built, true);
    for (const [x, y] of footbridge_cells()) assert.equal(c.maps.river.tile(x, y), 'bridge', 'tiles re-applied on load');
    assert.ok(c.valley_landmarks().some((l: any) => l.id === 'footbridge'));
    // an older save, loaded into the same game: the project is open again and the water is back
    const old = JSON.parse(store['hrvstmn-save-2']);
    delete old.public_works;
    c.applySaveData(old);
    assert.deepEqual(c.public_works, { delivered: {}, crop: null, done_day: null, built: false });
    for (const [x, y] of footbridge_cells()) assert.equal(c.maps.river.tile(x, y), 'water');
    assert.equal(c.works_line(), 'Gotz needs 12 Lumber, 2 Copper, 3 of one farm crop');
  });
});
