// Integration tests: the real engine rendering into a Screen, then the Enhanced renderer on top.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Screen, VisualStyle } from './screen';
import { Game, MASTERY_DISCIPLINES } from './engine';
import { computeFrame } from './enhanced';

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

  test('the player is tagged once and rendered as a composed sprite', () => {
    const { s } = farm();
    const p = findPlayer(s);
    assert.ok(p);
    const [x, y] = p!;
    assert.equal(s.tags[y][x]?.ent, 'player');
    const out = computeFrame(s, 0);
    assert.equal(out[y - 2][x].ch, '@');
    assert.ok(out[y][x].ch !== ' ');
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
