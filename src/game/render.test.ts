// Integration tests: the real engine rendering into a Screen, then the Enhanced renderer on top.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Screen, VisualStyle } from './screen';
import { Game, MASTERY_DISCIPLINES } from './engine';
import { computeFrame } from './enhanced';
import { TILES, NPCS } from './constants';

function farm(style?: VisualStyle) {
  const s = new Screen(132, 30);
  if (style) s.style = style;
  const g = new Game(s, true) as any;
  g.new_game('Pete', 'Moon');
  g.warp('farm', 23, 9);
  g.render();
  return { s, g };
}

const findPlayer = (s: Screen) => {
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.tags[y][x]?.ent === 'player') return [x, y];
  return null;
};

describe('engine + renderer', () => {
  test('Enhanced is the default style', () => {
    const s = new Screen();
    assert.equal(s.style, 'enhanced');
  });

  test('classic remains available programmatically', () => {
    const { s } = farm('classic');
    assert.equal(s.style, 'classic');
    assert.equal(s.ctx?.zoom, 1);
  });

  test('every map tile occupies exactly one cell with its world coords', () => {
    const { s } = farm();
    assert.equal(s.ctx?.zoom, 1);
    let tagged = 0;
    for (let y = s.ctx!.view.y; y < s.ctx!.view.y + s.ctx!.view.h; y++) {
      for (let x = s.ctx!.view.x; x < s.ctx!.view.x + s.ctx!.view.w; x++) {
        const tag = s.tags[y][x];
        if (!tag || tag.ent) continue;
        assert.equal(tag.sub, undefined);
        assert.equal(tag.zw, undefined);
        tagged++;
      }
    }
    assert.ok(tagged > 500);
  });

  test('the player is tagged once and rendered as a single creature token', () => {
    const { s } = farm();
    const p = findPlayer(s);
    assert.ok(p);
    const [x, y] = p!;
    assert.equal(s.tags[y][x]?.ent, 'player');
    const out = computeFrame(s, 0);
    assert.equal(out[y][x].ch, '☻');
  });

  test('a dialog drawn over the map clears the map tags under it', () => {
    const { s } = farm();
    s.box(10, 5, 30, 6, '03', '00', 'Hello');
    assert.equal(s.tags[7][20], null);
    assert.equal(s.tags[5][10]?.k, 'box:tl');
  });

  test('every enhanced frame of the farm renders without throwing, day and night', () => {
    const { s, g } = farm();
    for (const minutes of [6 * 60, 12 * 60, 18 * 60, 22 * 60]) {
      g.minutes = minutes;
      g.render();
      const out = computeFrame(s, minutes);
      assert.equal(out.length, s.h);
    }
  });

  test('today plan reports the daily chores and shipping cutoff', () => {
    const { g } = farm();
    g.crops = { '11,10': ['Turnip', 0] };
    g.wet = new (g.wet.constructor)();
    g.animals = [{ name: 'Bess', kind: 'cow', fed: false, ready: false, wool: 0 }];
    const text = g.today_lines().join('\n');
    assert.match(text, /Tomorrow:/);
    assert.match(text, /Zack collects at 5:00 PM/);
    assert.match(text, /1 crop still dry/);
    assert.match(text, /1 animal still hungry/);
  });

  test('action preview shows the tool cost and context action follows the facing tile', () => {
    const { g } = farm();
    assert.equal(g.tool_cost(), 2);
    assert.equal(g.action_preview().cost, 2);
    const action = g.context_action();
    assert.ok(['x', 'space'].includes(action.key));
    assert.ok(action.label.length > 0);
    g.modal_depth = 1;
    assert.deepEqual(g.context_action(), { key: 'space', label: 'OK' });
    g.modal_depth = 0;
  });

  test('the HUD facing summary names the target and stamina cost for the next action', () => {
    const { g } = farm();
    const [tx, ty] = [g.px + 1, g.py];
    g.face = [1, 0];
    g.tool = 'Watering Can';
    g.crops[`${tx},${ty}`] = ['Turnip', 0];
    const facing = g.facing_action();
    assert.equal(facing.label, 'WATER');
    assert.match(facing.summary, /Water turnip.*2 stamina/i);
  });

  test('save snapshots restore the farm state', () => {
    const { g } = farm();
    g.gold = 4321;
    g.farm = 'Willow';
    const snap = g.snapshot();
    g.gold = 0;
    g.farm = 'Other';
    g.applySaveData(snap);
    assert.equal(g.gold, 4321);
    assert.equal(g.farm, 'Willow');
  });

  test('breaking a boulder flashes, shakes, throws debris and floats the reward', async () => {
    const { g } = farm();
    g.face = [0, 1];
    const [tx, ty] = g.target();
    g.objs.farm[`${tx},${ty}`] = 'boulder';
    g.hp[`${tx},${ty}`] = 1;
    g.levels['Hammer'] = 1;
    g.tool = 'Hammer';
    g.fx = [];
    await g.use_tool();
    const kinds = g.fx.map((f: { kind: string }) => f.kind);
    for (const k of ['swing', 'flash', 'debris', 'text']) assert.ok(kinds.includes(k), k);
    assert.equal(g.fx.find((f: { kind: string }) => f.kind === 'text').text, '+1');
    assert.equal(g.shake_fx.strength, 2);
    g.render();
    assert.ok(g.scr.ctx.fx.some((f: { kind: string; stuff?: string }) => f.kind === 'debris' && f.stuff === 'stone'), 'extras reach the renderer');
  });

  test('the valley spreads over nine outdoor areas, all linked both ways and reachable from the farm', () => {
    const { g } = farm();
    const outdoor = ['farm', 'town', 'mountain', 'beach', 'woods', 'ridge', 'river', 'point', 'grove'];
    for (const name of outdoor) assert.ok(g.maps[name], name);
    const pass = (m: any, x: number, y: number) => m.inside(x, y) && !!TILES[m.tile(x, y)]?.[3];
    // every edge warp lands on open ground a step or two from a warp back
    for (const name of outdoor) {
      const m = g.maps[name];
      for (const [key, [to, wx, wy]] of Object.entries(m.warps) as [string, [string, number, number]][]) {
        const t = g.maps[to];
        assert.ok(t, `${name} ${key} -> ${to}`);
        assert.ok(pass(t, wx, wy), `${name} ${key} lands on open ground in ${to}`);
        let back = false;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (t.warps[`${wx + dx},${wy + dy}`]?.[0] === name) back = true;
        assert.ok(back, `${to} ${wx},${wy} leads back to ${name}`);
      }
    }
    // walk the open ground from the farm, through the edge warps (debris and doors aside)
    const seen = new Set<string>();
    const maps = new Set<string>();
    const queue: [string, number, number][] = [['farm', 23, 9]];
    while (queue.length) {
      const [name, x, y] = queue.pop()!;
      const id = `${name}:${x},${y}`;
      if (seen.has(id)) continue;
      seen.add(id);
      maps.add(name);
      const m = g.maps[name];
      const w = m.warps[`${x},${y}`];
      if (w && outdoor.includes(w[0])) queue.push([w[0], w[1], w[2]]);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (pass(m, x + dx, y + dy)) queue.push([name, x + dx, y + dy]);
    }
    assert.deepEqual([...maps].sort(), [...outdoor].sort());
    // inside the new regions every patch of open ground is reachable, so nothing spawns out of reach
    for (const name of ['woods', 'ridge', 'river', 'point', 'grove']) {
      const m = g.maps[name];
      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) if (pass(m, x, y)) assert.ok(seen.has(`${name}:${x},${y}`), `${name} ${x},${y} is unreachable`);
      }
    }
    // the East Road runs from Rose Square out to Willow Bend
    for (let x = 44; x <= 71; x++) for (const y of [11, 12, 13]) assert.equal(g.maps.town.tile(x, y), 'path', `town ${x},${y}`);
    // every building can be walked to, and stepping back out of it lands at its own front door
    const doors: Record<string, string[]> = {};
    for (const name of outdoor) {
      const m = g.maps[name];
      for (const [key, id] of Object.entries(m.doors) as [string, string][]) {
        (doors[name] ||= []).push(id);
        const [dx, dy] = key.split(',').map(Number);
        const inside = g.interiors[id];
        if (!inside) continue; // caves and farm buildings have no walk-in interior
        assert.equal(m.tile(dx, dy + 1), 'path', `${id}: a path leads to the door in ${name}`);
        assert.ok(seen.has(`${name}:${dx},${dy + 1}`), `${id}: its doorstep in ${name} can be reached on foot`);
        const [to, wx, wy] = Object.values(g.maps[inside.map].warps)[0] as [string, number, number];
        assert.deepEqual([to, wx, wy], [name, dx, dy + 1], `${id}: leaving it lands on its doorstep`);
      }
    }
    // the town keeps its services; the crafts and farms are out in the countryside
    assert.deepEqual(doors.town.sort(), ['church', 'clinic', 'inn', 'library', 'mayor', 'museum', 'supermarket']);
    assert.deepEqual(doors.grove, ['blacksmith']);
    assert.deepEqual(doors.woods.sort(), ['poultry', 'winery', 'yodel']);
    assert.deepEqual(doors.river, ['sprites']);
    assert.deepEqual(doors.point, ['zack']);
    assert.deepEqual(doors.beach, ['kai_shack']);
    // a building carries its lettering with it: the forge still reads BLACKSMITH in the grove
    const forge = Object.keys(g.maps.grove.doors)[0].split(',').map(Number);
    const sign = Array.from({ length: 11 }, (_, i) => g.maps.grove.deco[`${forge[0] - 5 + i},${forge[1] - 2}`]?.[0] ?? ' ').join('').trim();
    assert.equal(sign, 'BLACKSMITH');
  });

  test('the market stall is a grey booth on a weekday and lights up on a Saturday morning (task 09)', () => {
    const { s, g } = farm();
    const stallCell = () => {
      g.render();
      const frame = computeFrame(s, 0);
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.tags[y][x]?.t === 'stall') return frame[y][x];
      throw new Error('the stall is not on screen');
    };
    g.warp('town', 38, 18, [0, 1]); // near the stall, facing away so it is not the highlighted target
    g.minutes = 9 * 60;
    g.day = 5;
    const shut = stallCell();
    g.day = 6;
    const ready = stallCell();
    g.inv = { Turnip: 2 };
    g.stall_open([['Turnip', 2]]);
    const open = stallCell();
    for (const cell of [shut, ready, open]) {
      assert.equal(cell.ch, '⌂');
      assert.ok(cell.accent, 'a thing of interest: it keeps its colour in the grey world');
    }
    assert.equal(new Set([shut.fg, ready.fg, open.fg]).size, 3, 'shut, ready and trading each look different');
  });

  test('villagers whose homes moved wait outside their new front doors', () => {
    const { g } = farm();
    const homes: Record<string, [string, string]> = { Gray: ['grove', 'blacksmith'], Popuri: ['woods', 'poultry'], May: ['woods', 'yodel'], Duke: ['woods', 'winery'], Mary: ['town', 'library'] };
    for (const [who, [map, id]] of Object.entries(homes)) {
      const [mp, ax, ay] = NPCS[who].where!;
      assert.equal(mp, map, `${who} stands in ${map}`);
      const door = Object.entries(g.maps[map].doors).find(([, d]) => d === id)![0].split(',').map(Number);
      assert.ok(Math.abs(ax - door[0]) <= 2 && ay - door[1] >= 1 && ay - door[1] <= 3, `${who} is by the ${id} door`);
      assert.ok(g.walkable(map, ax, ay), `${who}'s spot is open ground`);
    }
  });


  test('the outer regions get forage, and fallen branches gather in the woods each day', () => {
    const { g } = farm();
    g.objs.woods = {};
    g.spawn_forage();
    for (const name of ['woods', 'ridge', 'river', 'point', 'grove']) assert.ok(Object.keys(g.forage[name] || {}).length > 0, name);
    const branches = Object.entries(g.objs.woods).filter(([, v]) => v === 'branch');
    assert.ok(branches.length >= 5);
    for (const [k] of branches) {
      const [x, y] = k.split(',').map(Number);
      assert.equal(g.maps.woods.tile(x, y), 'grass');
    }
  });

  test('region forage draws with its own glyph and keeps its colour in Enhanced', () => {
    const { s, g } = farm();
    g.warp('point', 20, 12);
    g.forage.point = { '22,12': 'Spiral Shell' };
    g.render();
    let cell: [number, number] | null = null;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.tags[y][x]?.k === 'forage' && s.tags[y][x]?.wx === 22) cell = [x, y];
    assert.ok(cell, 'the shell is tagged as forage');
    assert.equal(s.buf[cell![1]][cell![0]][0], '@');
    const out = computeFrame(s, 0);
    assert.ok(out[cell![1]][cell![0]].accent, 'forage stays in colour on the black-and-white world');
  });

  test('QA: cutting weeds with the sickle blinks each weed before the leaves fly', async () => {
    const { g } = farm();
    g.face = [0, 1];
    const [tx, ty] = g.target();
    g.objs.farm[`${tx},${ty}`] = 'weed';
    g.tool = 'Sickle';
    g.fx = [];
    await g.use_tool();
    const at = (k: string) => g.fx.filter((f: { kind: string; x: number; y: number }) => f.kind === k && f.x === tx && f.y === ty);
    assert.equal(at('flash').length, 1, 'the weed blinks');
    assert.ok(at('debris')[0]?.delay > 0, 'then scatters after a beat');
    assert.equal(at('swing').length, 1, 'and the swing shows');
  });

  test('an upgraded tool tags its area-of-effect cells', () => {
    const { s, g } = farm();
    g.levels['Hoe'] = 1;
    g.face = [0, -1];
    g.render();
    let target = 0;
    let area = 0;
    for (const row of s.tags) {
      for (const t of row) {
        if (t?.hl) target++;
        if (t?.hlArea) area++;
      }
    }
    assert.ok(target >= 1);
    assert.ok(area >= 1);
  });

  test('museum collection uses existing item categories', async () => {
    const { g } = farm();
    assert.ok(g.museum_pool().includes('Turnip'));
    assert.ok(g.museum_pool('fish').includes('Small Fish'));
    assert.ok(g.museum_total() > 0);
    const opts = await g.shop_options('museum');
    assert.equal(opts.length, 2);
    g.museum = ['Turnip', 'Small Fish'];
    assert.equal(g.museum.length, 2);
  });

  test('a Maker processes every quality tier in one use', () => {
    const { g } = farm();
    g.makers = ['Mayonnaise Maker'];
    g.inv['Egg'] = 3;
    g.inv['Good Egg'] = 2;
    g.inv['Golden Egg'] = 1;
    assert.match(g.maker_preview('Mayonnaise Maker'), /^6 eggs, \+\d+G$/);
    assert.equal(g.maker_ready_count(), 6);
    assert.ok(g.today_lines().some((l: string) => l.includes('Makers 6 items')));
    const xp = JSON.stringify(g.mastery_xp);
    const line = g.run_maker('Mayonnaise Maker');
    assert.match(line ?? '', /^Mayonnaise Maker made 6 mayonnaise in 3 grades! \(\+\d+G\)$/);
    assert.equal(JSON.stringify(g.mastery_xp), xp, 'Maker use grants no XP (per-press XP was farmable)');
    assert.equal(g.inv['Small Mayonnaise'], 3);
    assert.equal(g.inv['Medium Mayonnaise'], 2);
    assert.equal(g.inv['Golden Mayonnaise'], 1);
    assert.equal(g.inv['Egg'], undefined);
    assert.equal(g.run_maker('Mayonnaise Maker'), null);
    assert.equal(g.maker_preview('Mayonnaise Maker'), 'no eggs');
    assert.ok(!g.today_lines().some((l: string) => l.includes('Makers')));
  });

  test('the Maker result line fits the single desktop message row even for huge mixed stacks', () => {
    const { g } = farm();
    g.makers = ['Mayonnaise Maker', 'Cheese Maker'];
    for (const e of ['X Egg', 'P Egg', 'Golden Egg', 'High Egg', 'Good Egg', 'Egg']) g.inv[e] = 99;
    const multi = g.run_maker('Mayonnaise Maker');
    assert.ok(multi && multi.length <= 78, multi ?? '');
    g.inv['X Milk'] = 99;
    const single = g.run_maker('Cheese Maker');
    assert.equal(single, `Cheese Maker made 99 x X Cheese! (+${(1500 - 800) * 99}G)`);
    assert.ok(single.length <= 78);
  });

  test('a Maker that is not installed does nothing, and shop milk is not cheese', () => {
    const { g } = farm();
    g.inv['Wool'] = 4;
    assert.equal(g.run_maker('Yarn Maker'), null);
    assert.equal(g.inv['Wool'], 4);
    g.makers = ['Cheese Maker'];
    g.inv['Milk'] = 5;
    assert.equal(g.run_maker('Cheese Maker'), null);
    assert.equal(g.inv['Milk'], 5);
    assert.equal(g.maker_ready_count(), 0);
  });

  test('request board creates deliverable villager requests', () => {
    const { g } = farm();
    assert.equal(g.request_refresh(3), 3);
    assert.equal(g.requests.length, 3);
    const request = g.requests[0];
    assert.ok(g.request_pool().includes(request.item));
    assert.ok(request.deadline > g.absday());
    g.inv[request.item] = request.qty;
    const gold = g.gold;
    const friendship = g.friend[request.npc];
    const result = g.request_deliver(0);
    assert.ok(result?.includes('earned'));
    assert.equal(g.gold, gold + request.reward);
    assert.equal(g.friend[request.npc], friendship + 5);
    assert.equal(g.requests.length, 2);
    assert.equal(g.inv[request.item], undefined);
  });

  test('achievements derive from saved progress', () => {
    const { g } = farm();
    const list = g.achievement_list();
    assert.equal(list.length, 14);
    assert.equal(list.find((a) => a.name === 'First Shipment')?.done, false);
    g.shipped_total = 10000;
    g.museum = g.museum_pool().slice(0, 10);
    g.requests_done = 5;
    const updated = g.achievement_list();
    assert.equal(updated.find((a) => a.name === 'First Shipment')?.done, true);
    assert.equal(updated.find((a) => a.name === 'Market Regular')?.done, true);
    assert.equal(updated.find((a) => a.name === 'Museum Patron')?.done, true);
    assert.equal(updated.find((a) => a.name === 'Good Neighbor')?.done, true);
  });

  test('mastery ranks grant one reward per tier', () => {
    const { g } = farm();
    assert.equal(g.mastery_level('farming'), 0);
    const gold = g.gold;
    g.mastery_add('farming', 25);
    assert.equal(g.mastery_level('farming'), 1);
    assert.equal(g.gold, gold + 250);
    assert.ok(g.mastery_claimed.includes('farming:1'));
    g.mastery_add('farming', 25);
    assert.equal(g.gold, gold + 250);
    assert.equal(g.mastery_level('farming'), 1);
    g.mastery_add('farming', 25);
    assert.equal(g.mastery_level('farming'), 2);
    assert.equal(g.gold, gold + 750);
    for (const discipline of MASTERY_DISCIPLINES) {
      assert.ok(discipline in g.mastery_xp);
    }
  });
});

describe('right-side Contour Farm HUD', () => {
  test('date and status remain inside the right panel at every supported size', () => {
    for (const [width, height] of [[80, 24], [100, 28], [132, 30], [160, 50]]) {
      const s = new Screen(width, height);
      const g = new Game(s, true) as any;
      g.new_game('A very long player name', 'A very long farm name');
      g.warp('farm', 23, 9);
      g.tool = 'Watering Can';
      g.gold = 987654321;
      g.render();
      const labels: string[] = [];
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const label = s.tags[y][x]?.label;
        if (!label) continue;
        assert.ok(x > s.ctx!.divX);
        assert.ok(x + label.w <= s.w);
        assert.ok(y + label.h <= s.ctx!.divY);
        labels.push(label.text);
      }
      assert.deepEqual(labels, ['HRVSTMN', '01']);
      const panel = s.buf.slice(0, s.ctx!.divY).map((row) => row.slice(s.ctx!.divX + 1).map((c) => c[0]).join('')).join('\n');
      for (const text of ['EQUIPPED', 'STAMINA', 'FATIGUE', 'GOLD', 'BIN', 'HELD', '987654321G']) assert.ok(panel.includes(text), `${width}x${height}: ${text}`);
      assert.ok(computeFrame(s, 0).flat().some((o) => o.meter));
    }
  });

  test('the compact status line always shows the newest game message', () => {
    const { s, g } = farm();
    g.msgs = [['older message', '05'], ['middle message', '05'], ['Latest tool result', '0B']];
    g.render();
    assert.match(s.buf[s.h - 1].map((c) => c[0]).join(''), /Latest tool result/);
  });
});


test('empty stamina keeps the HUD meter empty and the tool fainting warning visible', () => {
  const { s, g } = farm();
  g.stamina = 0;
  g.fatigue = 99;
  g.render();
  const meters = s.tags.flat().filter((t) => t?.k?.startsWith('hud:meter'));
  assert.ok(meters.length > 0);
  assert.ok(meters.every((t) => t?.k === 'hud:meter:empty'));
  const panel = s.buf.map((r) => r.slice(s.ctx!.divX + 1).map((c) => c[0]).join('')).join('\n');
  assert.match(panel, /-2st!/);
});

describe('graphical engine integration', () => {
  test('Shift+V cycles Screen.paletteMode through mono, duotone, and isotope', async () => {
    const { s, g } = farm();
    assert.equal(s.paletteMode, 'mono');
    await g.handle('V');
    assert.equal(s.paletteMode, 'duotone');
    await g.handle('V');
    assert.equal(s.paletteMode, 'isotope');
    await g.handle('V');
    assert.equal(s.paletteMode, 'mono');
  });

  test('engine tags cropName, toolTier, player facing/riding, sheared sheep, minimap cells, and whistle emotes', () => {
    const { s, g } = farm();
    delete g.objs.farm['12,12'];
    g.tilled.add('12,12');
    g.wet.add('12,12');
    g.crops['12,12'] = ['Tomato', 6];
    g.levels['Hoe'] = 3;
    g.tool = 'Hoe';
    g.animals = [
      { name: 'Fluff', kind: 'sheep', fed: true, aff: 50, wool: 7 },
      { name: 'Clip', kind: 'sheep', fed: true, aff: 50, wool: 0 },
    ];
    g.animals_grazing = true;
    g.show_minimap = true;
    g.whistle_horse();
    g.render();

    assert.equal(s.ctx?.toolTier, 3);
    assert.ok(s.ctx?.fx?.some((f) => f.kind === 'emote' && f.emote === 'heart'), 'whistling horse emits heart emote');
    const p = findPlayer(s)!;
    assert.equal(s.tags[p[1]][p[0]]?.riding, true);
    assert.ok(Array.isArray(s.tags[p[1]][p[0]]?.face));

    const cropCell = s.tags.flat().find((t) => t?.cropName === 'Tomato');
    assert.ok(cropCell, 'cropName reaches Screen tags');
    assert.ok(s.tags.flat().some((t) => t?.k === 'minimap:player'), 'minimap player marker tagged');

    const out = computeFrame(s, 0);
    const glyphs = out.flat().map((o) => o.ch);
    assert.ok(glyphs.includes('┼'), 'Tomato renders with trellis silhouette');
    assert.ok(glyphs.includes('☁') && glyphs.includes('◦'), 'woolly and sheared sheep have distinct glyphs');
  });
});

