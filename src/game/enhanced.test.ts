import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Screen, RenderCtx } from './screen';
import { computeFrame, skyFor, mix, hexToRgb, hash, lightning, toIsotope, isotopeRamps, rgbToHex, neon, hsv } from './enhanced';

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
    assert.equal(o.glow, toIsotope('#ffb040'));
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

  test('animals become pictograms on a round token', () => {
    const s = scene();
    s.put(10, 10, 'C', '07', '00', true);
    s.tag(10, 10, { t: 'grass', wx: 10, wy: 10, ent: 'animal' });
    s.put(12, 10, 'H', '04', '00', true);
    s.tag(12, 10, { t: 'grass', wx: 12, wy: 10, ent: 'pet' });
    const out = computeFrame(s, 0);
    assert.equal(out[10][10].ch, '♉');
    assert.equal(out[10][12].ch, '♞');
    assert.ok(out[10][10].token && out[10][10].rim);
  });

  test('large roofs get a chimney with smoke above it', () => {
    const s = scene();
    for (let x = 10; x < 20; x++) {
      for (const y of [6, 7]) {
        s.put(x, y, '^', '08', '00');
        s.tag(x, y, { t: 'roof', wx: x, wy: y, k: 'deco', dch: '^', dfg: '08' });
      }
    }
    const frames = [0, 0.3, 0.6, 0.9].map((tt) => computeFrame(s, tt));
    assert.ok(frames.some((f) => f[6].some((o) => o.ch === '▐')), 'chimney drawn on the roof top');
    assert.ok(frames.some((f) => f.slice(3, 6).some((r) => r.some((o) => '°∘·'.includes(o.ch) && o.ch !== ' '))), 'smoke above');
  });

  test('butterflies on sunny spring days, falling leaves in autumn, none indoors', () => {
    const count = (s: Screen, ch: string) => [0, 1, 2, 3].reduce((n, tt) => n + computeFrame(s, tt).flat().filter((o) => ch.includes(o.ch)).length, 0);
    assert.ok(count(scene({ season: 0 }), 'ж×') > 0);
    assert.ok(count(scene({ season: 2 }), '❦') > 0);
    assert.equal(count(scene({ season: 0, indoor: true }), 'ж×'), 0);
  });

  test('rain leaves puddles on paths', () => {
    const s = scene({ weather: 'Rain' });
    for (let y = 1; y < 20; y++) for (let x = 0; x < 50; x++) s.tag(x, y, { t: 'path', wx: x, wy: y });
    const dry = computeFrame(scene(), 0);
    const wet = computeFrame(s, 0);
    assert.ok(wet.flat().some((o) => o.bg !== dry[1][1].bg && hexToRgb(o.bg)[2] > hexToRgb(o.bg)[0]), 'bluish puddle cells');
  });

  test('typhoons flash with lightning now and then', () => {
    let flashes = 0;
    for (let tt = 0; tt < 140; tt += 0.05) if (lightning(tt)) flashes++;
    assert.ok(flashes > 0 && flashes < 2800 * 0.1);
  });

  test('dialog boxes cast a drop shadow and get a raised panel', () => {
    const s = scene();
    s.box(5, 3, 12, 5);
    const out = computeFrame(s, 0);
    const plain = computeFrame(scene(), 0);
    assert.equal(out[4][8].bg, toIsotope('#0e0e16'));
    assert.ok(lum(out[8][10].bg) < lum(plain[8][10].bg), 'shadow under the box');
  });

  test('title screen gets a night sky, stars and a gradient logo', () => {
    const s = new Screen(100, 30);
    s.scene = 'title';
    s.put(10, 2, 'HRVSTMN', '0A', '00', true);
    for (let i = 0; i < 7; i++) s.tag(10 + i, 2, { t: 'ui', k: 'logo' });
    const out = computeFrame(s, 0);
    assert.notEqual(out[10][50].bg, '#000000');
    assert.ok(out.flat().some((o) => o.ch === '·' || o.ch === '✦'));
    assert.notEqual(out[2][10].fg, out[2][16].fg);
  });

  test('borders between grass and field are softened', () => {
    const s = scene();
    for (let y = 1; y < 20; y++) for (let x = 25; x < 50; x++) s.tag(x, y, { t: 'field', wx: x, wy: y });
    const out = computeFrame(s, 0);
    const edge = [5, 6, 7, 8, 9, 10, 11, 12].map((y) => out[y][25]);
    assert.ok(edge.some((o) => o.ch === '░'), 'soil next to grass is dithered with the grass colour');
  });

  test('every output colour comes from the Isotope ramps', () => {
    const allowed = new Set(isotopeRamps().map((c) => rgbToHex(c)));
    for (const s of [scene(), scene({ minutes: 22 * 60 }), scene({ season: 2, weather: 'Rain' }), scene({ season: 3, weather: 'Snow' })]) {
      for (const o of computeFrame(s, 1).flat()) {
        assert.ok(allowed.has(o.fg) && allowed.has(o.bg), `${o.fg} / ${o.bg}`);
      }
    }
  });

  test('the 16 Isotope colours are kept exactly', () => {
    for (const hex of ['#000000', '#ff0000', '#ff9900', '#ff0099', '#33ff00', '#00ffff', '#0066ff', '#cc00ff', '#3300ff', '#ffffff']) {
      assert.equal(toIsotope(hex), hex);
    }
  });

  test('large sprites are lit from the top-left', () => {
    const s = scene({ zoom: 2 });
    for (const [x, sub] of [[10, 0], [11, 1]] as const) {
      s.put(x, 5, sub ? ' ' : 'T', '0B', '00', true);
      s.tag(x, 5, { t: 'tree', wx: 5, wy: 5, sub, zw: 2 });
    }
    const out = computeFrame(s, 0);
    assert.ok(lum(out[5][10].fg) > lum(out[5][11].fg));
  });

  test('water is deeper (darker) away from the shore', () => {
    const s = scene();
    for (let y = 2; y < 18; y++) for (let x = 5; x < 40; x++) { s.put(x, y, '~', '0D', '00'); s.tag(x, y, { t: 'water', wx: x, wy: y }); }
    const out = computeFrame(s, 0);
    assert.ok(lum(out[10][20].bg) < lum(out[3][20].bg));
  });

  test('walls under the eaves are shaded and building ends get corner posts', () => {
    const s = scene();
    for (let x = 10; x < 16; x++) {
      s.tag(x, 4, { t: 'roof', wx: x, wy: 4, k: 'deco', dch: '^', dfg: '08' });
      for (const y of [5, 6, 7]) s.tag(x, y, { t: 'wall', wx: x, wy: y });
    }
    const out = computeFrame(s, 0);
    assert.equal(out[6][10].ch, '║');
    assert.ok(lum(out[5][12].bg) < lum(out[6][12].bg));
  });

  test('neon pulls muted glyph colours toward the nearest pure Isotope hue', () => {
    const before = hsv(hexToRgb('#2c6e1e'));
    const after = hsv(hexToRgb(neon('#2c6e1e')));
    assert.ok(after[1] >= before[1] && after[2] > before[2], 'more saturated and brighter');
    assert.ok(Math.abs(after[0] - 108) < 20, 'stays green');
    assert.equal(neon('#808080'), '#808080', 'greys untouched');
  });

  test('mine walls carry torches that light the floor', () => {
    const s = scene({ mapName: 'mine', indoor: true });
    for (let x = 0; x < 50; x++) {
      s.tag(3, 0, null);
      s.tag(x, 3, { t: 'mwall', wx: x, wy: 3 });
      for (let y = 4; y < 19; y++) s.tag(x, y, { t: 'mfloor', wx: x, wy: y });
    }
    const out = computeFrame(s, 0);
    const torches = out[3].map((o, x) => (o.ch === '†' ? x : -1)).filter((x) => x >= 0);
    assert.ok(torches.length > 0);
    const tx = torches[0];
    assert.ok(lum(out[4][tx].bg) > lum(out[15][tx].bg), 'floor near a torch is lit');
  });

  test('a rug lies under the table', () => {
    const s = scene({ indoor: true, mapName: 'house' });
    for (let y = 1; y < 20; y++) for (let x = 0; x < 50; x++) s.tag(x, y, { t: 'floor', wx: x, wy: y });
    s.tag(10, 10, { t: 'table', wx: 10, wy: 10 });
    assert.equal(computeFrame(s, 0)[11][10].ch, '░');
  });

  test('hash is deterministic and in range', () => {
    for (let i = 0; i < 50; i++) {
      const v = hash(i, i * 3, 2);
      assert.ok(v >= 0 && v < 1);
      assert.equal(v, hash(i, i * 3, 2));
    }
  });
});
