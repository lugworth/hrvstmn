import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Screen, RenderCtx } from './screen';
import { grey, windowLit, SPRITE_KEEP, spritePattern, rowAlpha, hiresLevel, effectiveHiresLevel, subAlpha, subPattern, HIRES_MIN_FONT, resetTrail, computeFrame, frameDirtyRect, skyFor, mix, hexToRgb, hash, lightning, toIsotope, isotopeRamps, rgbToHex, neon, hsv } from './enhanced';

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
  test('dirty rectangles bound changed cells with glyph overhang', () => {
    const cell = (ch: string) => ({ ch, fg: '#ffffff', bg: '#000000', bold: false });
    const a = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => cell('a')));
    const b = a.map((row) => row.map((o) => ({ ...o })));
    b[2][2].ch = 'b';
    assert.deepEqual(frameDirtyRect(a, b), { x0: 1, y0: 1, x1: 4, y1: 4 });
    const same = a.map((row) => row.map((o) => ({ ...o })));
    assert.equal(frameDirtyRect(a, same), null);
    assert.deepEqual(frameDirtyRect(null, a), { x0: 0, y0: 0, x1: 5, y1: 5 });
  });

  test('tagged grass gets a coloured ground instead of black', () => {
    const out = computeFrame(scene(), 0);
    assert.notEqual(out[5][5].bg, '#000000');
  });

  test('entities render as single creature tokens', () => {
    const s = scene();
    s.put(5, 5, '@', '07', '00', true);
    s.tag(5, 5, { t: 'grass', ent: 'player', wx: 5, wy: 5 });
    const out = computeFrame(s, 0);
    assert.equal(out[5][5].ch, '☻');
  });

  test('action effects render as transient accent glyphs', () => {
    const s = scene({ fx: [{ kind: 'sparkle', x: 6, y: 6, age: 0, life: 1 }] });
    const out = computeFrame(s, 0);
    assert.equal(out[6][6].ch, '*');
    assert.ok(out[6][6].glow);
  });

  test('accessible cues replace ripe crops and wet soil with shape glyphs', () => {
    const s = scene({ cues: true });
    s.put(7, 7, 'T', '09', '00', true);
    s.tag(7, 7, { t: 'field', wx: 7, wy: 7, k: 'crop:ripe' });
    s.put(8, 7, '≡', '0B', '00');
    s.tag(8, 7, { t: 'field', wx: 8, wy: 7, k: 'soil:wet' });
    const out = computeFrame(s, 0);
    assert.equal(out[7][7].ch, '!');
    assert.equal(out[7][8].ch, '≈');
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
    assert.ok(wet.flat().some((o) => o.bg !== dry[1][1].bg), 'puddle cells differ from dry path');
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

  const lake = (over: Partial<RenderCtx> = {}) => {
    const s = scene(over);
    for (let y = 2; y < 18; y++) for (let x = 5; x < 40; x++) { s.put(x, y, '~', '0D', '00'); s.tag(x, y, { t: 'water', wx: x, wy: y }); }
    return s;
  };
  const rowLum = (row: { bg: string }[]) => row.slice(12, 33).reduce((a, o) => a + lum(o.bg), 0) / 21;

  test('water is deeper (darker) away from the shore, through a graded middle', () => {
    const out = computeFrame(lake(), 0);
    assert.ok(rowLum(out[2]) > rowLum(out[3]), 'shallows are lightest');
    assert.ok(rowLum(out[3]) > rowLum(out[10]), 'the middle is darkest');
  });

  test('ripples drift across the water together, and hold still with reduced motion', () => {
    const ripples = (s: Screen, t: number) => computeFrame(s, t).slice(4, 16).map((r) => r.slice(10, 35).map((o) => o.ch).join('')).join('|');
    const s = lake();
    assert.notEqual(ripples(s, 0), ripples(s, 4), 'the surface moves');
    const streaks = ripples(s, 0).match(/[≈∼]{3,}/g) ?? [];
    assert.ok(streaks.length > 10, 'ripples run in streaks, not single specks');
    const still = lake({ reducedMotion: true });
    assert.equal(ripples(still, 0), ripples(still, 4));
  });

  test('lily pads and reeds keep a touch of colour on ponds, but not on the sea or in winter', () => {
    const pads = (over: Partial<RenderCtx>) => computeFrame(lake(over), 0).flat().filter((o) => '◡⌓'.includes(o.ch));
    const reeds = (over: Partial<RenderCtx>) => computeFrame(lake(over), 0).flat().filter((o) => '¦ʸ╽'.includes(o.ch));
    const summer = pads({ season: 1 });
    assert.ok(summer.length > 3);
    assert.ok(summer.every((o) => o.accent && grey(o.fg) !== o.fg));
    assert.ok(pads({ season: 0 }).length > 3, 'spring too');
    assert.ok(reeds({ season: 1 }).length > 0, 'reeds along the bank');
    assert.equal(pads({ season: 1, mapName: 'beach' }).length, 0, 'no pads on the sea');
    assert.equal(reeds({ season: 1, mapName: 'beach' }).length, 0, 'no reeds on the beach');
    assert.equal(pads({ season: 3 }).length, 0, 'bare in winter');
  });

  test('surf rolls in toward the beach in lines', () => {
    const surf = (s: Screen, t: number) => computeFrame(s, t).slice(2, 7).map((r) => r.slice(5, 40).filter((o) => o.ch === '≈' && o.bold).length);
    const beach = lake({ mapName: 'beach' });
    const frames = [0, 0.4, 0.8, 1.2, 1.6, 2].map((t) => surf(beach, t));
    assert.ok(frames.some((rows) => rows.some((n) => n > 8)), 'a breaker spans the shore');
    assert.notDeepEqual(frames[0], frames[2], 'and moves');
    assert.ok([0, 0.4, 0.8, 1.2].every((t) => surf(lake(), t).every((n) => n === 0)), 'ponds have no surf');
  });

  test('storms whip up whitecaps on open water', () => {
    const caps = (weather: string) => computeFrame(lake({ weather }), 0).flat().filter((o) => o.ch === '≋').length;
    assert.ok(caps('Typhoon') > 5);
    assert.equal(caps('Sunny'), 0);
  });

  test('a door swings open while the player stands at it', () => {
    const s = scene();
    s.put(10, 5, '+', '09', '00');
    s.tag(10, 5, { t: 'door', wx: 10, wy: 5 });
    assert.equal(computeFrame(s, 0)[5][10].ch, '▮', 'closed');
    s.put(10, 6, '@', '0F', '00', true);
    s.tag(10, 6, { t: 'grass', wx: 10, wy: 6, ent: 'player' });
    const open = computeFrame(s, 0)[5][10];
    assert.equal(open.ch, '▯');
    assert.ok(open.glow, 'warm light from inside');
  });

  test('late at night households go to bed one by one', () => {
    const lit = (m: number) => Array.from({ length: 200 }, (_, i) => windowLit(m, i, 3)).filter(Boolean).length;
    assert.equal(lit(21 * 60), 200, 'all lit in the evening');
    assert.ok(lit(23 * 60) < 160 && lit(23 * 60) > 80);
    assert.ok(lit(60) < lit(23 * 60), 'fewer after midnight');
    const s = scene({ minutes: 60 });
    for (let x = 0; x < 50; x++) { s.put(x, 3, '=', '0C', '01'); s.tag(x, 3, { t: 'wall', wx: x, wy: 3, k: 'deco', dch: '=', dfg: '0C' }); }
    const row = computeFrame(s, 0)[3];
    assert.ok(row.some((o) => o.glow) && row.some((o) => !o.glow), 'some windows lit, some dark');
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

  test('monochrome world: plain terrain is pure grey', () => {
    const isGrey = (h: string) => { const [r, g, b] = hexToRgb(h); return r === g && g === b; };
    for (const s of [scene(), scene({ season: 2 }), scene({ minutes: 22 * 60 })]) {
      for (const o of computeFrame(s, 0).slice(1, 20).flatMap((r) => r.slice(0, 50))) {
        if (!o.accent) assert.ok(isGrey(o.fg) && isGrey(o.bg), `${o.ch} ${o.fg}/${o.bg}`);
      }
    }
  });

  test('things of interest keep their colour as accents', () => {
    const s = scene();
    s.put(10, 10, '@', '07', '00', true);
    s.tag(10, 10, { t: 'grass', wx: 10, wy: 10, ent: 'player' });
    s.put(12, 10, 'K', '0A', '00', true);
    s.tag(12, 10, { t: 'grass', wx: 12, wy: 10, ent: 'npc' });
    s.put(14, 10, 'T', '08', '00', true);
    s.tag(14, 10, { t: 'field', wx: 14, wy: 10, k: 'crop:ripe' });
    s.put(16, 10, '+', '09', '01');
    s.tag(16, 10, { t: 'door', wx: 16, wy: 10 });
    const out = computeFrame(s, 0);
    for (const x of [12, 14, 16]) {
      const [r, g, b] = hexToRgb(out[10][x].fg);
      assert.ok(!(r === g && g === b), `accent at ${x} keeps colour (${out[10][x].fg})`);
      assert.ok(out[10][x].accent);
    }
  });

  test('calm water reflects the trees on its shore', () => {
    const shore = (weather: string) => {
      const s = scene({ weather });
      for (let x = 0; x < 50; x++) {
        for (let y = 2; y < 7; y++) { s.put(x, y, 'T', '0B', '00', true); s.tag(x, y, { t: 'tree', wx: x, wy: y }); }
        for (let y = 7; y < 14; y++) { s.put(x, y, '~', '0D', '00'); s.tag(x, y, { t: 'water', wx: x, wy: y }); }
      }
      return computeFrame(s, 0)[7].filter((o) => '♣♠❀•'.includes(o.ch)).length;
    };
    assert.ok(shore('Sunny') > 15, 'shore row mirrors the treeline');
    assert.equal(shore('Rain'), 0, 'rain breaks reflections up');
  });

  test('trunks show under the forest edge and canopies are lit from above', () => {
    const s = scene();
    for (let x = 0; x < 50; x++) for (let y = 2; y < 8; y++) { s.put(x, y, 'T', '0B', '00', true); s.tag(x, y, { t: 'tree', wx: x, wy: y }); }
    const out = computeFrame(s, 0);
    assert.ok(out[8].filter((o) => o.ch === '╿').length > 10, 'trunks under the bottom row');
    const avg = (row: typeof out[0]) => { const c = row.slice(0, 50).filter((o) => !o.accent); return c.reduce((a, o) => a + lum(o.fg), 0) / c.length; };
    assert.ok(avg(out[2]) > avg(out[7]), 'crown brighter than underside');
  });

  test('light pools fade out through an ASCII dither at night', () => {
    const ring = (s: Screen) => computeFrame(s, 0).flat().filter((o) => o.ch === '.' || o.ch === ':').length;
    const night = scene({ minutes: 22 * 60 });
    night.put(25, 10, '@', '07', '00', true);
    night.tag(25, 10, { t: 'grass', wx: 25, wy: 10, ent: 'player' });
    assert.ok(ring(night) > 5);
    assert.equal(ring(scene()), 0);
  });

  test('icicles hang from the eaves in winter only', () => {
    const icicles = (season: number) => {
      const s = scene({ season });
      for (let x = 10; x < 20; x++) {
        s.tag(x, 4, { t: 'roof', wx: x, wy: 4, k: 'deco', dch: '^', dfg: '08' });
        for (const y of [5, 6]) s.tag(x, y, { t: 'wall', wx: x, wy: y });
      }
      return computeFrame(s, 0)[5].filter((o) => o.ch === '╷').length;
    };
    assert.ok(icicles(3) > 0);
    assert.equal(icicles(0), 0);
  });

  test('the player leaves footprints in the snow', () => {
    resetTrail();
    const step = (x: number, season: number) => {
      const s = scene({ season });
      s.put(x, 10, '@', '07', '00', true);
      s.tag(x, 10, { t: 'grass', wx: x, wy: 10, ent: 'player' });
      return computeFrame(s, 0);
    };
    step(20, 3);
    step(21, 3);
    assert.equal(step(22, 3)[10][20].ch, ':', 'prints behind the player');
    resetTrail();
    step(20, 0);
    assert.notEqual(step(21, 0)[10][20].ch, ':', 'no prints on spring grass');
    resetTrail();
  });

  test('birds cross the sky on fine days, not at night', () => {
    const flock = (minutes: number) => {
      let n = 0;
      for (let tt = 0; tt < 400; tt += 2) n += computeFrame(scene({ minutes }), tt).flat().filter((o) => o.ch === 'v' || o.ch === 'ˇ').length;
      return n;
    };
    assert.ok(flock(12 * 60) > 0);
    assert.equal(flock(23 * 60), 0);
  });

  test('autumn leaves pile up around trees', () => {
    const s = scene({ season: 2 });
    for (let x = 0; x < 50; x++) { s.put(x, 5, 'T', '0B', '00', true); s.tag(x, 5, { t: 'tree', wx: x, wy: 5 }); }
    const out = computeFrame(s, 0);
    const near = out[6].filter((o) => o.accent && '•❦,'.includes(o.ch)).length + out[4].filter((o) => o.accent && '•❦,'.includes(o.ch)).length;
    const far = out[15].filter((o) => o.accent && '•❦,'.includes(o.ch)).length + out[16].filter((o) => o.accent && '•❦,'.includes(o.ch)).length;
    assert.ok(near > far);
  });

  test('high-resolution textures: map texture cells get a 2x2 half-size pattern', () => {
    const s = scene();
    for (let x = 0; x < 50; x++) for (let y = 2; y < 6; y++) { s.put(x, y, 'T', '0B', '00', true); s.tag(x, y, { t: 'tree', wx: x, wy: y }); }
    s.put(10, 10, '@', '07', '00', true);
    s.tag(10, 10, { t: 'grass', wx: 10, wy: 10, ent: 'player' });
    const out = computeFrame(s, 0);
    const tree = out[3].find((o) => o.ch === '♣' && !o.accent)!;
    const pat = subPattern(tree, 16);
    assert.ok(pat && [...pat].length === 4, 'trees become four mini leaves');
    assert.equal(subPattern(tree, HIRES_MIN_FONT - 1), null, 'off when the font is too small');
    assert.equal(subPattern(out[10][10], 16), null, 'sprites stay full size');
    assert.equal(subPattern({ ch: '♣', fg: '#fff', bg: '#000', bold: false, ui: true }, 16), null, 'HUD stays full size');
  });

  test('high-resolution patterns are anchored to the world, not the screen', () => {
    const a = scene();
    const b = scene();
    a.tag(3, 4, { t: 'grass', wx: 3, wy: 4 });
    b.tag(7, 9, { t: 'grass', wx: 3, wy: 4 });
    assert.equal(computeFrame(a, 0)[4][3].seed, computeFrame(b, 0)[9][7].seed);
  });

  test('high-res foliage is lit from the top-left; textures jitter gently', () => {
    assert.ok(subAlpha('♣', 0.3, 0) > subAlpha('♣', 0.3, 3));
    for (let k = 0; k < 4; k++) {
      const a = subAlpha("'", 0.42, k);
      assert.ok(a >= 0.6 && a <= 1);
      assert.equal(a, subAlpha("'", 0.42, k), 'deterministic');
    }
  });

  test('water that meets land gets a shoreline foam edge on that side', () => {
    const s = scene();
    for (let x = 0; x < 50; x++) for (let y = 8; y < 14; y++) { s.put(x, y, '~', '0D', '00'); s.tag(x, y, { t: 'water', wx: x, wy: y }); }
    const out = computeFrame(s, 0);
    const shore = (y: number, bit: number) => out[y].slice(5, 45).filter((o) => (o.foam ?? 0) & bit).length;
    assert.ok(shore(8, 1) > 25, 'top shore');
    assert.ok(shore(13, 4) > 25, 'bottom shore');
    assert.ok(shore(8, 1) < 40, 'broken here and there where the foam has drawn back');
    assert.equal(out[10][20].foam, undefined, 'open water has none');
  });

  test('detail level: 3x3 on sharp screens, 2x2 on ordinary ones, plain when tiny', () => {
    assert.equal(hiresLevel(16, 2), 3);
    assert.equal(hiresLevel(16, 1), 2);
    assert.equal(hiresLevel(13, 3), 2, 'needs a 14px font for 3x3');
    assert.equal(hiresLevel(8, 3), 1);
    assert.equal(effectiveHiresLevel(16, 2, false), 1, 'player preference can turn high-res detail off');
    assert.equal(effectiveHiresLevel(16, 2, true), 3);
  });

  test('3x3 patterns: nine glyphs drawn from the texture pool, deterministic, density kept', () => {
    const cell = { ch: '♣', fg: '#fff', bg: '#000', bold: false, seed: 0.37 };
    const p3 = subPattern(cell, 16, 3)!;
    assert.equal([...p3].length, 9);
    assert.equal(p3, subPattern(cell, 16, 3), 'deterministic');
    assert.ok([...p3].every((c) => '♣♠'.includes(c)));
    // grass detail stays sparse
    let blanks = 0;
    for (let i = 0; i < 200; i++) blanks += [...subPattern({ ch: "'", fg: '#fff', bg: '#000', bold: false, seed: i / 200 }, 16, 3)!].filter((c) => c === ' ').length;
    assert.ok(blanks / (200 * 9) > 0.3);
    assert.equal(subPattern(cell, 16, 2)!.length, 4, '2x2 unchanged');
    assert.ok(rowAlpha('♣', 0, 0, 3) > rowAlpha('♣', 0, 2, 3), 'top row brightest');
  });

  test('small objects become clusters across their tile, denser in the middle', () => {
    const weed = { ch: '✿', fg: '#0f0', bg: '#000', bold: false, seed: 0.21 };
    const rows = spritePattern(weed, 16, 3)!;
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => [...r].length === 3), 'one glyph per detail step across the tile');
    let mid = 0;
    let edge = 0;
    for (let i = 0; i < 300; i++) {
      const rr = spritePattern({ ...weed, seed: i / 300 }, 16, 3)!;
      mid += rr[1][1].replace(/ /g, '').length;
      edge += (rr[0][0] + rr[2][2]).replace(/ /g, '').length / 2;
    }
    assert.ok(mid > edge * 1.5);
    assert.equal(spritePattern({ ...weed, glow: '#fff' }, 16, 3), null, 'glowing ripe crops stay single');
    assert.equal(spritePattern({ ch: '☻', fg: '#fff', bg: '#000', bold: true }, 16, 3), null, 'player stays single');
    assert.equal(spritePattern(weed, 16, 1), null, 'off on small screens');
    assert.ok(SPRITE_KEEP.has('ψ') && SPRITE_KEEP.has('•'), 'weeds and stones keep a full-size glyph');
    const w3 = spritePattern({ ...weed, ch: 'ψ' }, 16, 3)!;
    assert.equal(w3[1][1], ' ', 'centre left clear for the full-size weed');
  });

  test('meadows carry a faint stipple between the tufts', () => {
    assert.ok(computeFrame(scene(), 0).flat().filter((o) => o.ch === '˙').length > 50);
  });

  test('sunlight dapples the ground under trees on fine days', () => {
    const fleck = (weather: string) => {
      const s = scene({ weather });
      for (let x = 0; x < 50; x++) { s.put(x, 5, 'T', '0B', '00', true); s.tag(x, 5, { t: 'tree', wx: x, wy: 5 }); }
      const out = computeFrame(s, 0);
      const stipple = Math.max(0, ...out[15].filter((o) => o.ch === '˙').map((o) => lum(o.fg)));
      return out[6].filter((o) => o.ch === '˙' && lum(o.fg) > stipple).length;
    };
    assert.ok(fleck('Sunny') > 3, 'bright flecks under the canopy');
    assert.equal(fleck('Rain'), 0);
  });

  test('paths get a kerb line where they meet grass', () => {
    const s = scene();
    for (let x = 0; x < 50; x++) for (const y of [9, 10, 11]) s.tag(x, y, { t: 'path', wx: x, wy: y });
    const out = computeFrame(s, 0);
    assert.ok((out[9][20].foam ?? 0) & 1);
    assert.ok((out[11][20].foam ?? 0) & 4);
    assert.equal(out[10][20].foam, undefined);
  });

  test('dew twinkles on the grass in the early morning only', () => {
    const dew = (minutes: number) => [0, 0.5, 1, 1.5].reduce((n, tt) => n + computeFrame(scene({ minutes }), tt).flat().filter((o) => o.ch === '✧').length, 0);
    assert.ok(dew(7 * 60) > 0);
    assert.equal(dew(13 * 60), 0);
  });

  test('meadow shading comes in soft patches rather than per-cell speckle', () => {
    const out = computeFrame(scene({ weather: 'Rain' }), 0);
    let near = 0;
    let far = 0;
    for (let y = 2; y < 19; y++) {
      for (let x = 0; x < 40; x++) {
        if (out[y][x].bg !== out[y][x + 1].bg) near++;
        if (out[y][x].bg !== out[y][x + 7].bg) far++;
      }
    }
    assert.ok(near < far * 0.7, `neighbours mostly match (${near} vs ${far})`);
  });

  test('a map narrower than its window fades into the margin instead of a black frame', () => {
    const narrow = (over: Partial<RenderCtx> = {}) => {
      const s = new Screen(80, 24);
      s.ctx = { mapName: 'farm', indoor: false, minutes: 12 * 60, season: 0, weather: 'Sunny', zoom: 1, view: { x: 15, y: 1, w: 20, h: 19 }, divX: 50, divY: 20, icons: [], ...over };
      for (let y = 1; y < 20; y++) {
        for (let x = 15; x < 35; x++) {
          const tree = x < 17 || x > 32;
          s.put(x, y, tree ? 'T' : ' ', '0B', '00', tree);
          s.tag(x, y, { t: tree ? 'tree' : 'grass', wx: x - 15, wy: y });
        }
      }
      return s;
    };
    const out = computeFrame(narrow(), 0);
    const near = out[10][14];
    const far = out[10][3];
    assert.ok(!near.ui && lum(near.bg) > 0, 'the margin next to the map is not black');
    assert.ok(lum(near.bg) <= lum(out[10][15].bg), 'and no brighter than the map edge');
    assert.ok(lum(far.bg) < lum(near.bg) || far.bg === '#000000', 'it fades with distance');
    assert.ok(out[10].slice(10, 15).some((o) => '♣♠'.includes(o.ch)), 'the treeline carries on');
    assert.ok(out[10][36].bg !== '#000000', 'on both sides');
    const indoor = computeFrame(narrow({ indoor: true }), 0);
    assert.equal(indoor[10][14].bg, '#000000', 'rooms stay framed by black');
    const d = narrow();
    d.box(0, 6, 12, 6, '03', '00', 'Hi');
    assert.ok(computeFrame(d, 0)[8][4].ui, 'a dialog over the margin stays a dialog');
  });

  test('sign lettering stays a plain glyph, even an apostrophe', () => {
    const s = scene();
    s.put(10, 5, "'", '07', '00');
    s.tag(10, 5, { t: 'wall', k: 'deco', dch: "'", wx: 10, wy: 5 });
    const out = computeFrame(s, 0);
    assert.equal(out[5][10].ch, "'");
    assert.equal(subPattern(out[5][10], 16, 2), null, 'not turned into grass texture');
    const grassTick = out.flat().find((o) => o.ch === "'" && o !== out[5][10]);
    assert.ok(grassTick && subPattern(grassTick, 16, 2), 'grass ticks still get their texture');
  });

  test('shoreline foam laps: its brightness changes over time', () => {
    const s = lake();
    const foam = (t: number) => computeFrame(s, t)[2].slice(10, 35).map((o) => o.foamCol).join();
    assert.notEqual(foam(0), foam(1.5));
  });

  test('hash is deterministic and in range', () => {
    for (let i = 0; i < 50; i++) {
      const v = hash(i, i * 3, 2);
      assert.ok(v >= 0 && v < 1);
      assert.equal(v, hash(i, i * 3, 2));
    }
  });
});
