// Integration tests: the real engine rendering into a Screen, then the Enhanced renderer on top.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Screen, VisualStyle } from './screen';
import { Game, MASTERY_DISCIPLINES } from './engine';
import { computeFrame } from './enhanced';
import { TILES } from './constants';

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

  test('the valley spreads over eight outdoor areas, all linked both ways and reachable from the farm', () => {
    const { g } = farm();
    const outdoor = ['farm', 'town', 'mountain', 'beach', 'woods', 'ridge', 'river', 'point'];
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
    for (const name of ['woods', 'ridge', 'river', 'point']) {
      const m = g.maps[name];
      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) if (pass(m, x, y)) assert.ok(seen.has(`${name}:${x},${y}`), `${name} ${x},${y} is unreachable`);
      }
    }
    // the road out of town to Willow Bend joins the town's paths
    for (let x = 61; x <= 71; x++) assert.ok(pass(g.maps.town, x, 13), `town ${x},13`);
  });

  test('the outer regions get forage, and fallen branches gather in the woods each day', () => {
    const { g } = farm();
    g.objs.woods = {};
    g.spawn_forage();
    for (const name of ['woods', 'ridge', 'river', 'point']) assert.ok(Object.keys(g.forage[name] || {}).length > 0, name);
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
