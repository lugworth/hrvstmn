// Integration tests: the real engine rendering into a Screen, then the Enhanced renderer on top.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Screen, VisualStyle } from './screen';
import { Game } from './engine';
import { computeFrame } from './enhanced';

function farm(style: VisualStyle) {
  const s = new Screen(132, 30);
  s.style = style;
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
  test('large tiles: every map tile spans two cells with matching world coords', () => {
    const { s } = farm('large');
    assert.equal(s.ctx?.zoom, 2);
    let pairs = 0;
    for (let y = s.ctx!.view.y; y < s.ctx!.view.y + s.ctx!.view.h; y++) {
      for (let x = s.ctx!.view.x; x < s.ctx!.view.x + s.ctx!.view.w; x += 2) {
        const a = s.tags[y][x];
        const b = s.tags[y][x + 1];
        if (!a || !b || a.ent) continue;
        assert.equal(a.sub, 0);
        assert.equal(b.sub, 1);
        assert.equal(a.wx, b.wx);
        assert.equal(a.wy, b.wy);
        pairs++;
      }
    }
    assert.ok(pairs > 500);
  });

  test('large tiles: the player sits on the first cell and is centred across the tile', () => {
    const { s } = farm('large');
    const p = findPlayer(s);
    assert.ok(p);
    const [x, y] = p!;
    assert.equal(s.tags[y][x]?.sub, 0);
    const out = computeFrame(s, 0);
    assert.equal(out[y][x].ch, '☻');
    assert.equal(out[y][x].dx, 0.5);
    assert.equal(out[y][x + 1].ch, ' ');
  });

  test('enhanced and classic keep one cell per tile', () => {
    for (const style of ['enhanced', 'classic'] as VisualStyle[]) {
      const { s } = farm(style);
      assert.equal(s.ctx?.zoom, 1);
      const p = findPlayer(s)!;
      assert.equal(s.tags[p[1]][p[0]]?.sub, undefined);
    }
  });

  test('large mode shows fewer tiles but the same world', () => {
    const big = farm('large').s.ctx!;
    const small = farm('enhanced').s.ctx!;
    assert.ok(big.view.w / 2 <= small.view.w);
  });

  test('a dialog drawn over the map clears the map tags under it', () => {
    const { s } = farm('large');
    s.box(10, 5, 30, 6, '03', '00', 'Hello');
    assert.equal(s.tags[7][20], null);
    assert.equal(s.tags[5][10]?.k, 'box:tl');
  });

  test('every enhanced frame of the farm renders without throwing, day and night', () => {
    const { s, g } = farm('large');
    for (const minutes of [6 * 60, 12 * 60, 18 * 60, 22 * 60]) {
      g.minutes = minutes;
      g.render();
      const out = computeFrame(s, minutes);
      assert.equal(out.length, s.h);
    }
  });

  test('style cycle is Large -> Enhanced -> Classic -> Large', () => {
    const s = new Screen();
    assert.equal(s.style, 'large');
    assert.equal(s.toggleStyle(), 'enhanced');
    assert.equal(s.toggleStyle(), 'classic');
    assert.equal(s.toggleStyle(), 'large');
  });
});
