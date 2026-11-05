import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Screen, RenderCtx } from './screen';
import { grey, windowLit, blueNoise, toneFor, shakeOffset, TIER_COLOURS, edgeGlyph, SPRITE_KEEP, spritePattern, rowAlpha, hiresLevel, effectiveHiresLevel, subAlpha, subPattern, HIRES_MIN_FONT, resetTrail, computeFrame, drawFrame, frameSignature, frameDirtyRect, skyFor, mix, hexToRgb, hash, lightning, toIsotope, isotopeRamps, rgbToHex, neon, hsv, type OutCell } from './enhanced';

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

  test('HUD icons stay hidden under dialogs drawn over them', () => {
    const s = scene({ icons: [{ x: 60, y: 5, icon: 'stamina' }] });
    s.box(55, 3, 20, 6, '0D', '00', 'Notes');
    assert.equal(computeFrame(s, 0)[5][60].ch, ' ');
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
    assert.ok(edge.some((o) => o.ch === '▌'), 'soil next to grass takes a shape-matched half block in the grass colour');
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
    assert.equal(pads({ season: 1, mapName: 'point' }).length, 0, 'nor off Lighthouse Point');
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
    for (const s of [scene(), scene({ season: 2 }), scene({ minutes: 13 * 60, weather: 'Rain' })]) {
      for (const o of computeFrame(s, 0).slice(1, 20).flatMap((r) => r.slice(0, 50))) {
        if (!o.accent) assert.ok(isGrey(o.fg) && isGrey(o.bg), `${o.ch} ${o.fg}/${o.bg}`);
      }
    }
  });

  test('the grey world leans sepia at golden hour and moonlit blue at night, lamplight stays warm', () => {
    const lean = (over: Partial<RenderCtx>, pick = (o: { bg: string }) => o) => {
      const cells = computeFrame(scene(over), 0).slice(2, 18).flatMap((r) => r.slice(2, 48)).filter((o) => !o.accent).map(pick);
      let warm = 0;
      let cool = 0;
      for (const o of cells) {
        const [r, , b] = hexToRgb(o.bg);
        if (r > b) warm++;
        else if (b > r) cool++;
      }
      return { warm: warm / cells.length, cool: cool / cells.length };
    };
    assert.deepEqual(toneFor(12 * 60, 'Sunny', false, 'farm'), { warm: 0, cool: 0 });
    assert.equal(toneFor(17.6 * 60, 'Sunny', false, 'farm').warm, 1);
    assert.equal(toneFor(17.6 * 60, 'Rain', false, 'farm').warm, 0, 'no golden hour under cloud');
    assert.equal(toneFor(23 * 60, 'Sunny', true, 'house').cool, 0, 'rooms are not tinted');
    assert.ok(lean({ minutes: 17.6 * 60 }).warm > 0.6, 'golden hour');
    assert.ok(lean({ minutes: 23 * 60 }).cool > 0.6, 'night');
    // the player's lantern keeps a warm pool in the blue night
    const s = scene({ minutes: 23 * 60 });
    s.put(25, 10, '@', '0F', '00', true);
    s.tag(25, 10, { t: 'grass', wx: 25, wy: 10, ent: 'player' });
    const near = computeFrame(s, 0)[10].slice(22, 29).filter((o) => !o.accent);
    assert.ok(near.every((o) => { const [r, , b] = hexToRgb(o.bg); return r >= b; }), 'lamplight is warm');
  });

  test('blue noise: every level once per 4 cells of the tile, no clumps', () => {
    const vals: number[] = [];
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) vals.push(blueNoise(x, y));
    const counts = new Map<number, number>();
    for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
    assert.equal(counts.size, 256);
    assert.ok([...counts.values()].every((n) => n === 4));
    assert.equal(blueNoise(3, 5), blueNoise(35, 37), 'tiles every 32 cells');
    // neighbours differ more than white noise would (mean |diff| of uniform noise is 1/3)
    let diff = 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) diff += Math.abs(blueNoise(x, y) - blueNoise(x + 1, y));
    assert.ok(diff / 1024 > 0.36);
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
    const grass = out.flat().find((o) => o.texture?.kind === 'ground');
    assert.ok(grass && subPattern(grass, 16, 2), 'scenery still gets contour detail');
  });

  test('shoreline foam laps: its brightness changes over time', () => {
    const s = lake();
    const foam = (t: number) => computeFrame(s, t)[2].slice(10, 35).map((o) => o.foamCol).join();
    assert.notEqual(foam(0), foam(1.5));
  });

  test('a tool swing flashes a slash in the swing direction, coloured by tool tier', () => {
    const swing = (tier: number, dir: [number, number]) => computeFrame(scene({ fx: [{ kind: 'swing', x: 10, y: 5, age: 0.05, life: 0.2, dir, tier }] }), 0)[5][10];
    assert.equal(swing(0, [1, 0]).ch, '╲');
    assert.equal(swing(0, [-1, 0]).ch, '╱');
    assert.ok(swing(3, [1, 0]).accent);
    assert.notEqual(swing(0, [1, 0]).fg, swing(3, [1, 0]).fg, 'gold is not basic');
    assert.equal(TIER_COLOURS.length, 7);
  });

  test('a struck object flashes, then debris bursts out after a short hit-pause', () => {
    const at = (age: number, reducedMotion = false) => computeFrame(scene({ reducedMotion, fx: [
      { kind: 'flash', x: 20, y: 10, age: Math.min(age, 0.13), life: 0.14 },
      { kind: 'debris', x: 20, y: 10, age, life: 0.67, delay: 0.12, stuff: 'stone', seed: 5 },
    ] }), 0);
    const plain = computeFrame(scene(), 0);
    const flash = at(0.05)[10][20];
    assert.equal(flash.fg, '#ffffff');
    assert.ok(lum(flash.bg) > lum(plain[10][20].bg));
    const bits = (out: ReturnType<typeof computeFrame>) => out.flat().filter((o) => '•∙'.includes(o.ch)).length;
    assert.equal(bits(at(0.05)), 0, 'nothing flies during the hit-pause');
    assert.ok(bits(at(0.35)) >= 2, 'then a burst');
    assert.equal(bits(at(0.35, true)), 0, 'no debris with reduced motion');
  });

  test('rewards float up off the spot', () => {
    const row = (age: number) => {
      const out = computeFrame(scene({ fx: [{ kind: 'text', x: 20, y: 10, age, life: 1.22, delay: 0.12, text: '+6' }] }), 0);
      return out.findIndex((r) => r.slice(18, 22).map((o) => o.ch).join('').includes('+6'));
    };
    assert.equal(row(0.05), -1, 'waits for the hit-pause');
    assert.equal(row(0.2), 9, 'starts just above');
    assert.ok(row(0.9) < 9, 'and rises');
  });

  test('screen shake is a few pixels that die away, never with reduced motion', () => {
    const mag = (s: { age: number; strength: number }) => Math.hypot(...shakeOffset(s));
    assert.ok(mag({ age: 0.02, strength: 2 }) > 0);
    assert.ok(mag({ age: 0.02, strength: 2 }) <= 4.5);
    assert.deepEqual(shakeOffset({ age: 0.3, strength: 2 }), [0, 0], 'over within a quarter second');
    assert.deepEqual(shakeOffset({ age: 0.13, strength: 1 }), [0, 0], 'light hits are shorter');
    assert.deepEqual(shakeOffset({ age: 0.02, strength: 2 }, true), [0, 0]);
    assert.deepEqual(shakeOffset(undefined), [0, 0]);
  });

  test('edge cells pick the block glyph whose shape matches where the other ground lies', () => {
    const occ = (p: string) => { const c = p.replace(/\s/g, ''); return [[c[0] === '#', c[1] === '#', c[2] === '#'], [c[3] === '#', false, c[5] === '#'], [c[6] === '#', c[7] === '#', c[8] === '#']]; };
    assert.equal(edgeGlyph(occ('### ... ...')), '▀');
    assert.equal(edgeGlyph(occ('... ... ###')), '▄');
    assert.equal(edgeGlyph(occ('#.. #.. #..')), '▌');
    assert.equal(edgeGlyph(occ('..# ..# ..#')), '▐');
    assert.equal(edgeGlyph(occ('### #.. #..')), '▛', 'an inside corner');
    assert.equal(edgeGlyph(occ('..# ..# ###')), '▟');
    assert.equal(edgeGlyph(occ('#.. ... ...')), '▘', 'a diagonal neighbour only reaches a corner');
    assert.equal(edgeGlyph(occ('... ... ...')), ' ');
  });

  test('two-tone trees: grey canopy with a small colour blossom or fruit', () => {
    const trees = (season: number) => {
      const s = scene({ season });
      for (let y = 2; y < 18; y++) for (let x = 2; x < 48; x++) { s.put(x, y, 'T', '0B', '00', true); s.tag(x, y, { t: 'tree', wx: x, wy: y }); }
      return computeFrame(s, 0).slice(2, 18).flatMap((r) => r.slice(2, 48));
    };
    const spring = trees(0).filter((o) => o.detail);
    assert.ok(spring.length > 20);
    for (const o of spring) {
      assert.equal(o.detail!.ch, '✿');
      assert.ok(!o.accent, 'the tree itself stays grey');
    }
    const pink = spring.filter((o) => { const [r, g, b] = hexToRgb(o.detail!.fg); return !(r === g && g === b); });
    assert.ok(pink.length > spring.length / 2, 'most blossom keeps its colour (the palest is white)');
    assert.ok(trees(1).some((o) => o.detail?.ch === '●'), 'summer fruit');
    assert.equal(trees(3).filter((o) => o.detail).length, 0, 'bare in winter');
  });

  type Row = ReturnType<typeof computeFrame>[number];
  const avgLum = (row: Row, of: 'fg' | 'bg') => row.reduce((a, o) => a + lum(o[of]), 0) / row.length;

  test('Skyline Ridge cliffs are rock faces lit from above, snow-capped in winter', () => {
    const band = (over: Partial<RenderCtx>) => {
      const s = scene({ mapName: 'ridge', ...over });
      for (let x = 0; x < 50; x++) for (const y of [8, 9]) { s.put(x, y, '^', '03', '00'); s.tag(x, y, { t: 'cliff', wx: x, wy: y }); }
      const out = computeFrame(s, 0);
      return { brow: out[8].slice(0, 50), base: out[9].slice(0, 50) };
    };
    const spring = band({});
    assert.ok(spring.brow.every((o) => o.ch === '▀'), 'a lit brow along the top');
    assert.ok(avgLum(spring.brow, 'fg') > avgLum(spring.base, 'fg') + 30, 'the brow is brighter than the face');
    assert.ok(avgLum(spring.brow, 'bg') > avgLum(spring.base, 'bg'), 'the face darkens toward its base');
    assert.ok(new Set(spring.base.map((o) => o.ch).filter((c) => '─═≡'.includes(c))).size >= 2, 'bedded strata');
    const dither = spring.base.filter((o) => '░▒'.includes(o.ch)).length;
    assert.ok(dither > 3 && dither < 25, `a dithered base (${dither})`);
    assert.ok(!spring.base.some((o) => lum(o.fg) > 200), 'no snow on the ledges in spring');
    const winter = band({ season: 3 });
    assert.ok(avgLum(winter.brow, 'fg') > avgLum(spring.brow, 'fg') + 40, 'snow caps the brow in winter');
    assert.ok(winter.base.some((o) => '─═≡'.includes(o.ch) && lum(o.fg) > 200), 'and lies on some ledges');
    // other maps keep their plain cliff rows
    const s = scene({ mapName: 'mountain' });
    for (let x = 0; x < 50; x++) for (const y of [8, 9]) s.tag(x, y, { t: 'cliff', wx: x, wy: y });
    const plain = computeFrame(s, 0);
    assert.ok(plain[8].slice(0, 50).every((o) => o.ch === '▔'));
    assert.ok(plain[9].slice(0, 50).every((o) => '▲▴'.includes(o.ch)));
  });

  test('Willow Bend ripples ride the current downstream, quickest mid-channel', () => {
    const channel = (mapName: string, over: Partial<RenderCtx> = {}) => {
      const s = scene({ mapName, ...over });
      for (let y = 1; y < 20; y++) for (let x = 20; x < 25; x++) { s.put(x, y, '~', '0D', '00'); s.tag(x, y, { t: 'water', wx: x, wy: y }); }
      return s;
    };
    // how many rows a lane's ripples moved south between t = 0 and t = 3: the best-matching shift
    const drift = (s: Screen, x: number) => {
      const lane = (t: number) => computeFrame(s, t).slice(1, 20).map((r) => ('≈∼'.includes(r[x].ch) ? r[x].ch : ' '));
      const [a, b] = [lane(0), lane(3)];
      let best = { k: 0, score: -1 };
      for (let k = -6; k <= 8; k++) {
        let same = 0;
        let n = 0;
        for (let y = Math.max(0, k); y < 19 && y - k < 19; y++, n++) if (b[y] === a[y - k]) same++;
        if (same / n > best.score) best = { k, score: same / n };
      }
      return best;
    };
    const river = channel('river');
    const mid = drift(river, 22);
    const bank = drift(river, 20);
    assert.ok(mid.score > 0.85 && bank.score > 0.85, 'each lane carries its ripples along intact');
    assert.ok(bank.k > 0, `downstream (${bank.k})`);
    assert.ok(mid.k > bank.k, `faster mid-channel (${mid.k} vs ${bank.k})`);
    const streaks = (s: Screen) => computeFrame(s, 0).flat().filter((o) => '╎╲╱'.includes(o.ch)).length;
    assert.ok(streaks(river) > 0, 'flow streaks trace the current');
    // a farm pond of the same shape only drifts sideways, and reduced motion holds the river still
    const pond = drift(channel('farm'), 22);
    assert.ok(pond.k <= 0 || pond.score < mid.score - 0.1, `ponds don't flow (${pond.k}, ${pond.score})`);
    assert.equal(streaks(channel('farm')), 0);
    assert.deepEqual(drift(channel('river', { reducedMotion: true }), 22), { k: 0, score: 1 });
  });

  test('Cedar Hollow lies in gloom under the canopy, broken by shafts of sun on fine days', () => {
    // a dense grove on the left, an open clearing on the right
    const grove = (mapName: string, weather: string) => {
      const s = scene({ mapName, weather, minutes: 15 * 60 });
      for (let y = 1; y < 20; y++) for (let x = 0; x < 30; x++) if ((x + 2 * y) % 3) { s.put(x, y, 'T', '0B', '00', true); s.tag(x, y, { t: 'tree', wx: x, wy: y }); }
      return computeFrame(s, 0);
    };
    const under: [number, number][] = [];
    for (let y = 3; y < 18; y++) for (let x = 3; x < 27; x++) if ((x + 2 * y) % 3 === 0) under.push([x, y]);
    const compare = (weather: string) => {
      const [woods, farm] = [grove('woods', weather), grove('farm', weather)];
      const darker = under.filter(([x, y]) => lum(woods[y][x].bg) < lum(farm[y][x].bg)).length;
      const lit = under.filter(([x, y]) => lum(woods[y][x].bg) > lum(farm[y][x].bg)).length;
      const clearing = woods.slice(2, 18).every((r, y) => r.slice(36, 48).every((o, x) => o.bg === farm[y + 2][x + 36].bg));
      return { darker, lit, clearing };
    };
    const sun = compare('Sunny');
    assert.ok(sun.darker > under.length / 2, `ground under the canopy is gloomy (${sun.darker}/${under.length})`);
    assert.ok(sun.lit > 0 && sun.lit < under.length / 3, `with a few shafts of sun (${sun.lit})`);
    assert.ok(sun.clearing, 'the open clearing is untouched');
    const rain = compare('Rain');
    assert.ok(rain.darker > under.length / 2, 'still gloomy in the rain');
    assert.equal(rain.lit, 0, 'but no shafts of sun');
  });

  test('the lighthouse sweeps a beam over the sea at night and in storms, held still with reduced motion', () => {
    const coast = (over: Partial<RenderCtx>) => {
      const s = scene({ mapName: 'point', minutes: 23 * 60, ...over });
      for (let y = 1; y < 20; y++) {
        for (let x = 0; x < 50; x++) {
          const sea = y >= 9;
          s.put(x, y, sea ? '~' : '.', sea ? '0D' : '09', '00');
          s.tag(x, y, { t: sea ? 'water' : 'sand', wx: x, wy: y });
        }
      }
      for (let y = 3; y < 7; y++) for (let x = 10; x < 13; x++) s.tag(x, y, { t: 'wall', wx: x, wy: y });
      s.put(11, 5, '=', '0C', '01');
      s.tag(11, 5, { t: 'wall', wx: 11, wy: 5, k: 'deco', dch: '=', dfg: '0C' });
      return s;
    };
    // the beam starts out pointing south-east, out to sea, through (27, 13)
    const probe = (over: Partial<RenderCtx>, t: number) => lum(computeFrame(coast(over), t)[13][27].bg);
    const night = probe({}, 0);
    assert.ok(night > probe({ mapName: 'beach' }, 0) + 20, 'the beam brightens the sea');
    assert.ok(probe({}, 5) < night - 20, 'half a turn later it points inland');
    const window = computeFrame(coast({ minutes: 60 }), 0)[5][11];
    assert.ok(window.glow && window.accent, 'the lantern stays lit after the households sleep');
    const still = probe({ reducedMotion: true }, 0);
    assert.equal(probe({ reducedMotion: true }, 5), still, 'with reduced motion the beam holds still');
    assert.ok(still > probe({ mapName: 'beach', reducedMotion: true }, 0) + 20);
    const storm = { minutes: 12 * 60, weather: 'Typhoon', reducedMotion: true };
    assert.ok(probe(storm, 0) > probe({ ...storm, mapName: 'beach' }, 0) + 15, 'storms light it by day');
    assert.equal(probe({ minutes: 12 * 60 }, 0), probe({ minutes: 12 * 60, mapName: 'beach' }, 0), 'but not on a fair day');
    const beam = computeFrame(coast({}), 0).flat().filter((o) => o.accent && grey(o.fg) !== o.fg && lum(o.bg) > 40);
    assert.equal(beam.length, 0, 'the beam is light, not a new colour');
  });

  test('tide pools on Lighthouse Point glint now and then on fine days', () => {
    const pools = (over: Partial<RenderCtx>) => {
      const s = scene({ mapName: 'point', ...over });
      for (let y = 1; y < 20; y++) for (let x = 0; x < 50; x++) s.tag(x, y, { t: 'sand', wx: x, wy: y });
      const at: [number, number][] = [];
      for (let y = 3; y < 18; y += 4) {
        for (let x = 3; x < 48; x += 5) {
          s.put(x, y, '~', '0B', '00');
          s.tag(x, y, { t: 'pond', wx: x, wy: y });
          at.push([x, y]);
        }
      }
      return (t: number) => {
        const out = computeFrame(s, t);
        return at.filter(([x, y]) => out[y][x].ch === '✦').map(([x, y]) => `${x},${y}`).join(' ');
      };
    };
    const frames = (over: Partial<RenderCtx>) => [0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9].map(pools(over));
    const sunny = frames({});
    const count = (f: string[]) => f.reduce((n, s) => n + (s ? s.split(' ').length : 0), 0);
    assert.ok(sunny.every((s) => !s || s.split(' ').length < 12), 'only a few at a time');
    assert.ok(new Set(sunny).size > 3, 'the glints come and go');
    assert.ok(count(sunny) > 3 * count(frames({ mapName: 'farm' })), `more than a plain pond's sparkle (${count(sunny)})`);
    assert.equal(count(frames({ weather: 'Rain' })), 0, 'none under rain clouds');
  });

  test('QA: the lamp pool at dusk is never darker than the ground around it', () => {
    for (const over of [{ minutes: 17.5 * 60, weather: 'Rain' }, { minutes: 18 * 60, weather: 'Sunny' }]) {
      const s = scene(over);
      s.put(25, 10, '@', '0F', '00', true);
      s.tag(25, 10, { t: 'grass', wx: 25, wy: 10, ent: 'player' });
      const out = computeFrame(s, 0);
      const ring = (r0: number, r1: number) => {
        const cells = [];
        for (let y = 2; y < 18; y++) for (let x = 2; x < 48; x++) {
          const d = Math.hypot((x - 25) * 0.5, y - 10);
          if (d >= r0 && d < r1) cells.push(lum(out[y][x].bg));
        }
        return cells.reduce((a, b) => a + b, 0) / cells.length;
      };
      assert.ok(ring(1, 4) >= ring(8, 14), `${over.weather}: lamp ring ${ring(1, 4).toFixed(1)} vs far ${ring(8, 14).toFixed(1)}`);
    }
  });

  test('QA: every tool tier swings in its own colour, and a hit flash does not hide it', () => {
    const swing = (tier: number, flash = false) => {
      const fx: NonNullable<RenderCtx['fx']> = [{ kind: 'swing', x: 10, y: 5, age: 0.05, life: 0.2, dir: [1, 0], tier }];
      if (flash) fx.push({ kind: 'flash', x: 10, y: 5, age: 0.05, life: 0.14 });
      return computeFrame(scene({ fx }), 0)[5][10];
    };
    const cols = [0, 1, 2, 3, 4, 5, 6].map((t) => swing(t).fg);
    assert.equal(new Set(cols).size, 7, cols.join(' '));
    const hit = swing(3, true);
    assert.equal(hit.ch, '╲', 'the slash is still drawn');
    assert.equal(hit.fg, swing(3).fg, 'in its tier colour');
  });

  test('QA: a heavy hit shakes the view by a few pixels, not one or two', () => {
    const [dx] = shakeOffset({ age: 0.02, strength: 2 });
    assert.ok(Math.abs(dx) >= 3);
    const [lx] = shakeOffset({ age: 0.02, strength: 1 });
    assert.ok(Math.abs(lx) >= 1 && Math.abs(lx) <= 2);
  });

  test('QA: a lone one-cell tide pool gets no foam box', () => {
    const s = scene();
    s.put(20, 10, '~', '0D', '00');
    s.tag(20, 10, { t: 'pond', wx: 20, wy: 10 });
    assert.equal(computeFrame(s, 0)[10][20].foam, undefined);
  });

  test('QA: a prompt over the title screen keeps its punctuation as plain text', () => {
    const s = new Screen(100, 30);
    s.scene = 'title';
    s.box(20, 10, 40, 6, '0D', '00', 'Name');
    s.put(22, 12, "What's your name? (type, then enter)", '07', '00');
    const out = computeFrame(s, 0);
    const apos = out[12][22 + "What's".indexOf("'")];
    const comma = out[12][22 + "What's your name? (type".length];
    assert.equal(apos.ch, "'");
    assert.equal(comma.ch, ',');
    assert.equal(subPattern(apos, 16, 2), null, 'no texture swap');
    assert.equal(subPattern(comma, 16, 2), null);
  });

  test('hash is deterministic and in range', () => {
    for (let i = 0; i < 50; i++) {
      const v = hash(i, i * 3, 2);
      assert.ok(v >= 0 && v < 1);
      assert.equal(v, hash(i, i * 3, 2));
    }
  });
});

describe('Contour Farm presentation', () => {
  test('world-anchored contour detail follows a tile when the camera shifts', () => {
    const a = scene({ reducedMotion: true });
    const b = scene({ reducedMotion: true });
    const first = computeFrame(a, 0);
    const sourceX = first[10].findIndex((o) => o.texture?.kind === 'ground');
    assert.ok(sourceX >= 0);
    b.tag(21, 12, { ...a.tags[10][sourceX]! });
    const oa = first[10][sourceX];
    const ob = computeFrame(b, 0)[12][21];
    assert.equal(oa.texture?.kind, 'ground');
    assert.equal(subPattern(oa, 16, 3), subPattern(ob, 16, 3));
    assert.equal(subPattern(oa, 16, 2)?.length, 4);
    assert.equal(subPattern(oa, 16, 3)?.length, 9);
  });

  test('contours leave indoor floors, obstacles, crops, and the player untouched', () => {
    const s = scene({ reducedMotion: true });
    s.tag(10, 10, { t: 'field', wx: 10, wy: 10, k: 'obj:weed' });
    s.tag(12, 10, { t: 'field', wx: 12, wy: 10, k: 'crop:ripe' });
    s.put(14, 10, '@', '07');
    s.tag(14, 10, { t: 'grass', wx: 14, wy: 10, ent: 'player' });
    const out = computeFrame(s, 0);
    for (const x of [10, 12, 14]) assert.equal(out[10][x].texture, undefined);
    assert.equal(out[10][10].ch, 'ψ');
    assert.equal(out[10][14].ch, '☻');
    assert.equal(computeFrame(scene({ indoor: true }), 0)[10][10].texture, undefined);
  });

  test('later rain and dialog glyphs cannot inherit scenery patterns', () => {
    const s = scene({ weather: 'Rain' });
    const rain = computeFrame(s, 1).flat().filter((o) => o.ch === '╲');
    assert.ok(rain.length > 0);
    for (const o of rain) assert.equal(subPattern(o, 16, 3), null);
    s.put(5, 5, 'DIALOG', '07');
    assert.equal(computeFrame(s, 0)[5][5].texture, undefined);
  });

  test('HUD headings do not paint over a dialog that overlaps their reserved area', () => {
    const s = scene();
    s.put(55, 4, '0', '07');
    s.tag(55, 4, { t: 'ui', k: 'hud:label', label: { text: '01', scale: 2.6, w: 7, h: 3 } });
    assert.equal(computeFrame(s, 0)[4][55].label?.text, '01');
    s.box(60, 5, 15, 5);
    const o = computeFrame(s, 0)[4][55];
    assert.equal(o.label, undefined);
    assert.equal(o.ch, ' ');
  });
});


test('large HUD label changes invalidate the frame cache even with the same first glyph', () => {
  const s = new Screen();
  s.put(55, 4, '1', '07');
  const label = { text: '10', scale: 2.6, w: 7, h: 3 };
  s.tag(55, 4, { t: 'ui', k: 'hud:label', label });
  const before = frameSignature(computeFrame(s, 0));
  s.tag(55, 4, { t: 'ui', k: 'hud:label', label: { ...label, text: '11' } });
  assert.notEqual(frameSignature(computeFrame(s, 0)), before);
});

describe('Contour metadata with incremental repainting', () => {
  const blank = (): OutCell[][] => Array.from({ length: 9 }, () =>
    Array.from({ length: 18 }, () => ({ ch: ' ', fg: '#ffffff', bg: '#000000', bold: false })));
  const heading = () => {
    const frame = blank();
    frame[2][4] = { ...frame[2][4], ch: '1', label: { text: '10', scale: 2.6, w: 7, h: 3 } };
    return frame;
  };

  test('changing or removing the date repaints its whole old and new heading area', () => {
    const before = heading();
    const after = heading();
    after[2][4].label = { ...after[2][4].label!, text: '11' };
    for (const next of [after, blank()]) {
      const rect = frameDirtyRect(before, next)!;
      assert.ok(rect.x0 <= 4 && rect.y0 <= 2 && rect.x1 >= 11 && rect.y1 >= 5);
    }
    assert.equal(frameDirtyRect(before, heading()), null);
  });

  test('an update inside a heading includes its anchor so clearing backgrounds does not erase it', () => {
    const before = heading();
    const after = heading();
    after[4][9].bg = '#404040';
    const rect = frameDirtyRect(before, after)!;
    assert.ok(rect.x0 <= 4 && rect.y0 <= 2 && rect.x1 >= 11 && rect.y1 >= 5);
  });

  test('texture movement invalidates both caches even if the full-size glyph stays the same', () => {
    const before = blank();
    const after = blank();
    before[4][5].texture = { kind: 'water', x: 5, y: 4 };
    after[4][5].texture = { kind: 'water', x: 5.15, y: 4 };
    before[4][5].textureGlyph = after[4][5].textureGlyph = ' ';
    assert.notEqual(frameSignature(before), frameSignature(after));
    assert.ok(frameDirtyRect(before, after));
  });

  test('a blank full-size glyph still paints its smaller contour strokes', () => {
    const terrain = computeFrame(scene({ reducedMotion: true }), 0).flat().find((o) =>
      o.texture?.kind === 'ground' && o.ch === ' ' && subPattern(o, 16, 2)?.trim());
    assert.ok(terrain, 'scene contains sub-cell detail on a blank terrain glyph');
    const painted: string[] = [];
    const canvas = new Proxy({ fillText: (text: string) => painted.push(text) }, {
      get: (target, key) => key in target ? target[key as keyof typeof target] : () => {},
    }) as unknown as CanvasRenderingContext2D;
    drawFrame(canvas, [[terrain]], { cw: 10, ch: 20, fontPx: 16, font: 'monospace', dpr: 1 });
    assert.ok(painted.some((text) => text.trim()), 'contour strokes reach the canvas');
  });
});
