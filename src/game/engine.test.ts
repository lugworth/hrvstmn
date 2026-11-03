// Regression tests for engine bugs found by fuzzing and save/load diffing.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { Screen } from './screen';
import { Game } from './engine';

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
