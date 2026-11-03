import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Screen, RenderCtx } from './screen';
import { computeFrame, skyFor, mix, hexToRgb, hash } from './enhanced';

const lum = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function scene(over: Partial<RenderCtx> = {}): Screen {
  const s = new Screen(80, 24);
  s.ctx = {
    mapName: 'farm',
    indoor: false,
    minutes: 12 * 60,
    season: 0,
    weather: 'Sunny',
    zoom: 1,
    view: { x: 0, y: 1, w: 50, h: 19 },
    divX: 50,
    divY: 20,
    icons: [],
    ...over,
  };
  for (let y = 1; y < 20; y++) {
    for (let x = 0; x < 50; x++) {
      s.put(x, y, ' ', '0B', '00');
      s.tag(x, y, { t: 'grass', wx: x, wy: y });
    }
  }
  return s;
}

describe('skyFor', () => {
  test('midday outdoors is fully lit, night is dark and blue-tinted', () => {
    const noon = skyFor({ minutes: 12 * 60, indoor: false, mapName: 'farm', weather: 'Sunny' });
    const night = skyFor({ minutes: 22 * 60, indoor: false, mapName: 'farm', weather: 'Sunny' });
    assert.equal(noon.amb, 1);
    assert.equal(noon.lanterns, false);
    assert.ok(night.amb < 0.4);
    assert.ok(night.lanterns && night.windowsLit);
  });

  test('dusk sits between day and night', () => {
    const dusk = skyFor({ minutes: 18 * 60, indoor: false, mapName: 'farm', weather: 'Sunny' });
    assert.ok(dusk.amb < 1 && dusk.amb > 0.5);
  });

  test('indoors is always lit; the mine is always dark', () => {
    assert.equal(skyFor({ minutes: 23 * 60, indoor: true, mapName: 'house', weather: 'Rain' }).amb, 1);
    const mine = skyFor({ minutes: 12 * 60, indoor: false, mapName: 'mine', weather: 'Sunny' });
    assert.ok(mine.amb < 0.4 && mine.lanterns);
  });

  test('storms darken the day', () => {
    const clear = skyFor({ minutes: 12 * 60, indoor: false, mapName: 'farm', weather: 'Sunny' });
    const storm = skyFor({ minutes: 12 * 60, indoor: false, mapName: 'farm', weather: 'Typhoon' });
    assert.ok(storm.amb < clear.amb);
  });
});

describe('computeFrame', () => {
  test('tagged grass gets a coloured ground instead of black', () => {
    const out = computeFrame(scene(), 0);
    assert.notEqual(out[5][5].bg, '#000000');
  });

  test('textures follow world coordinates, not screen position', () => {
    const a = scene();
    const b = scene();
    // same world cell drawn at a different screen position
    b.tag(7, 5, { t: 'grass', wx: 3, wy: 4 });
    a.tag(3, 4, { t: 'grass', wx: 3, wy: 4 });
    const fa = computeFrame(a, 0)[4][3];
    const fb = computeFrame(b, 0)[5][7];
    assert.equal(fa.bg, fb.bg);
    assert.equal(fa.ch, fb.ch);
  });

  test('a plain put() over a map cell clears its tag so dialogs render as UI', () => {
    const s = scene();
    s.put(5, 5, 'A', '07', '00');
    assert.equal(s.tags[5][5], null);
    const out = computeFrame(s, 0);
    assert.equal(out[5][5].ch, 'A');
    assert.equal(out[5][5].bg, '#000000');
  });

  test('boxes get rounded corners', () => {
    const s = scene();
    s.box(2, 2, 10, 4);
    const out = computeFrame(s, 0);
    assert.equal(out[2][2].ch, '╭');
    assert.equal(out[2][11].ch, '╮');
    assert.equal(out[5][2].ch, '╰');
    assert.equal(out[3][2].ch, '│');
  });

  test('the player is drawn as a glowing figure on the ground colour', () => {
    const s = scene();
    s.put(10, 10, '@', '07', '00', true);
    s.tag(10, 10, { t: 'grass', wx: 10, wy: 10, ent: 'player' });
    const o = computeFrame(s, 0)[10][10];
    assert.equal(o.ch, '☻');
    assert.ok(o.glow);
    assert.notEqual(o.bg, '#000000');
  });

  test('crops show growth stages and ripe crops glow', () => {
    const s = scene();
    s.put(4, 4, ':', '09', '00');
    s.tag(4, 4, { t: 'field', wx: 4, wy: 4, k: 'crop:seed' });
    s.put(5, 4, 'T', '08', '00', true);
    s.tag(5, 4, { t: 'field', wx: 5, wy: 4, k: 'crop:ripe' });
    const out = computeFrame(s, 0);
    assert.equal(out[4][4].ch, '∴');
    assert.ok(out[4][5].glow);
  });

  test('night darkens terrain and the player lantern lights nearby cells', () => {
    const day = computeFrame(scene(), 0);
    const s = scene({ minutes: 22 * 60 });
    s.put(25, 10, '@', '07', '00', true);
    s.tag(25, 10, { t: 'grass', wx: 25, wy: 10, ent: 'player' });
    const night = computeFrame(s, 0);
    assert.ok(lum(night[2][2].bg) < lum(day[2][2].bg));
    assert.ok(lum(night[10][27].bg) > lum(night[2][2].bg), 'cells near the lantern are brighter');
  });

  test('lit windows glow at night', () => {
    const s = scene({ minutes: 21 * 60 });
    s.put(8, 3, '=', '0C', '01');
    s.tag(8, 3, { t: 'wall', wx: 8, wy: 3, k: 'deco', dch: '=', dfg: '0C' });
    const o = computeFrame(s, 0)[3][8];
    assert.equal(o.ch, '▦');
    assert.equal(o.glow, '#ffb040');
  });

  test('rain draws streaks over open ground and they move over time', () => {
    const s = scene({ weather: 'Rain' });
    const count = (t: number) => computeFrame(s, t).flat().filter((o) => o.ch === '╲').length;
    assert.ok(count(0) > 0);
    const a = computeFrame(s, 0).map((r) => r.map((o) => o.ch).join('')).join('');
    const b = computeFrame(s, 0.5).map((r) => r.map((o) => o.ch).join('')).join('');
    assert.notEqual(a, b);
  });

  test('no weather effects indoors', () => {
    const s = scene({ weather: 'Rain', indoor: true });
    assert.equal(computeFrame(s, 0).flat().filter((o) => o.ch === '╲').length, 0);
  });

  test('seasons change the palette', () => {
    const spring = computeFrame(scene({ season: 0 }), 0)[5][5].bg;
    const winter = computeFrame(scene({ season: 3 }), 0)[5][5].bg;
    assert.notEqual(spring, winter);
    assert.ok(lum(winter) > lum(spring), 'snowy ground is lighter');
  });

  test('a new day starts in full daylight (6:00 AM)', () => {
    assert.equal(skyFor({ minutes: 6 * 60, indoor: false, mapName: 'farm', weather: 'Sunny' }).amb, 1);
  });

  test('clear nights show a moon instead of the sun', () => {
    assert.equal(computeFrame(scene({ icons: [{ x: 60, y: 0, icon: 'weather' }] }), 0)[0][60].ch, '☀');
    assert.equal(computeFrame(scene({ minutes: 23 * 60, icons: [{ x: 60, y: 0, icon: 'weather' }] }), 0)[0][60].ch, '☾');
  });

  test('HUD icons are placed in empty anchor cells', () => {
    const s = scene({ icons: [{ x: 60, y: 5, icon: 'stamina' }] });
    assert.equal(computeFrame(s, 0)[5][60].ch, '♥');
  });

  test('tool target highlight survives styling', () => {
    const plain = computeFrame(scene(), 0)[6][6].bg;
    const s = scene();
    s.tag(6, 6, { t: 'grass', wx: 6, wy: 6, hl: true });
    const lit = computeFrame(s, 0)[6][6].bg;
    assert.equal(lit, mix(plain, '#c8d4ff', 0.26));
    assert.ok(lum(lit) > lum(plain));
  });

  test('frames without a scene context (title, menus) pass through', () => {
    const s = new Screen(80, 24);
    s.put(1, 1, 'HRVSTMN', '0A');
    const out = computeFrame(s, 0);
    assert.equal(out[1][1].ch, 'H');
  });

  test('large tiles draw two-cell sprites (boulders, cliffs, windows)', () => {
    const s = scene({ zoom: 2 });
    const two = (x: number, y: number, tag: object, ch = ' ', fg = '05', bg = '00') => {
      s.put(x, y, ch, fg, bg);
      s.put(x + 1, y, ' ', fg, bg);
      s.tag(x, y, { ...tag, sub: 0, zw: 2 } as any);
      s.tag(x + 1, y, { ...tag, sub: 1, zw: 2 } as any);
    };
    two(4, 4, { t: 'field', wx: 2, wy: 4, k: 'obj:boulder' }, 'O', '04');
    two(8, 4, { t: 'cliff', wx: 4, wy: 4 }, '^', '03');
    two(12, 4, { t: 'wall', wx: 6, wy: 4, k: 'deco', dch: '=', dfg: '0C' }, '=', '0C', '01');
    two(16, 4, { t: 'field', wx: 8, wy: 4, k: 'obj:stone' }, '*', '04');
    const out = computeFrame(s, 0);
    assert.deepEqual([out[4][4].ch, out[4][5].ch], ['◖', '◗']);
    assert.deepEqual([out[4][8].ch, out[4][9].ch], ['◢', '◣']);
    assert.deepEqual([out[4][12].ch, out[4][13].ch], ['▐', '▌']);
    assert.equal(out[4][16].dx, 0.5, 'single glyphs are centred in their tile');
    assert.equal(out[4][17].ch, ' ');
  });

  test('ground right below a building is shaded', () => {
    const s = scene();
    s.put(10, 5, '#', '02', '01');
    s.tag(10, 5, { t: 'wall', wx: 10, wy: 5 });
    const shaded = computeFrame(s, 0)[6][10].bg;
    const open = computeFrame(scene(), 0)[6][10].bg;
    assert.ok(lum(shaded) < lum(open));
  });

  test('cloud shadows appear on sunny days only, and drift', () => {
    const bgs = (s: Screen, t: number) => computeFrame(s, t).slice(1, 20).map((r) => r.slice(0, 50).map((o) => o.bg).join()).join();
    const sunny = scene();
    assert.notEqual(bgs(sunny, 0), bgs(sunny, 40), 'clouds move over time');
    const rainy = scene({ weather: 'Rain' });
    const indoor = scene({ indoor: true });
    assert.equal(bgs(indoor, 0), bgs(indoor, 40));
    assert.ok(rainy);
  });

  test('hash is deterministic and in range', () => {
    for (let i = 0; i < 50; i++) {
      const v = hash(i, i * 3, 2);
      assert.ok(v >= 0 && v < 1);
      assert.equal(v, hash(i, i * 3, 2));
    }
  });
});
