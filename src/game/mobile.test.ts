// Phone/tablet support: grid sizing, touch-input helpers, compact layout text helpers and the
// engine's compact (no side panel) layout.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { Screen } from './screen';
import { Game } from './engine';
import { computeFrame } from './enhanced';
import { COMPACT_MIN_COLS, FULL_MIN_COLS, MIN_ROWS, fitMessages, fitText, isCompact, reflowPages, wrapLine } from './compact';
import { chooseGrid, dirToward, dpadDirection, firstStep, lineHeight } from './viewport';

/** DejaVu Sans Mono advance width (0.602 em), what the canvas measures for the bundled font. */
const mono = (px: number) => px * 0.602;

const store: Record<string, string> = {};
before(() => {
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
});

const rowText = (s: Screen, y: number) => s.buf[y].map((c) => c[0]).join('');

function farm(cols: number, rows: number) {
  const s = new Screen(cols, rows);
  const g = new Game(s, true) as any;
  g.new_game('Pete', 'Moon');
  g.warp('farm', 23, 9);
  g.render();
  return { s, g };
}

describe('chooseGrid', () => {
  test('desktop keeps the original rule: 16px, shrunk only to fit 80x24', () => {
    const g = chooseGrid(1272, 600, mono, false);
    assert.deepEqual(g, { fontPx: 16, cols: Math.floor(1272 / mono(16)), rows: Math.floor(600 / lineHeight(16)), compact: false });
    const small = chooseGrid(500, 400, mono, false);
    assert.ok(small.fontPx < 16);
    assert.ok(small.cols >= FULL_MIN_COLS && small.cols * mono(small.fontPx) <= 500);
    assert.equal(small.compact, false, 'desktop never switches to the compact layout');
  });

  test('a portrait phone gets the compact layout at a readable size instead of a tiny 80-column grid', () => {
    const g = chooseGrid(386, 434, mono, true); // iPhone 13 portrait stage
    assert.equal(g.compact, true);
    assert.ok(g.fontPx >= 12, `font ${g.fontPx}px`);
    assert.ok(g.cols >= COMPACT_MIN_COLS && g.cols < FULL_MIN_COLS);
    assert.ok(g.rows >= MIN_ROWS);
    assert.ok(g.cols * mono(g.fontPx) <= 386 && g.rows * lineHeight(g.fontPx) <= 434, 'grid fits the stage');
  });

  test('a landscape phone keeps 24 rows and widens the map', () => {
    const g = chooseGrid(457, 342, mono, true); // iPhone 13 landscape, controls either side
    assert.equal(g.compact, true);
    assert.equal(g.rows, MIN_ROWS);
    assert.ok(g.cols > 60);
    assert.ok(g.rows * lineHeight(g.fontPx) <= 342);
  });

  test('tablets keep the full layout with the side panel', () => {
    const g = chooseGrid(768, 790, mono, true); // iPad Mini portrait
    assert.equal(g.compact, false);
    assert.ok(g.cols >= FULL_MIN_COLS);
    assert.ok(g.fontPx >= 12);
  });

  test('tiny screens shrink to the compact minimum rather than overflow', () => {
    const g = chooseGrid(200, 200, mono, true);
    assert.ok(g.cols >= COMPACT_MIN_COLS && g.cols * mono(g.fontPx) <= 200);
    assert.ok(g.rows >= MIN_ROWS && g.rows * lineHeight(g.fontPx) <= 200);
    assert.ok(g.fontPx >= 5 && g.fontPx < 9);
  });
});

describe('touch input helpers', () => {
  test('dpadDirection picks the dominant axis and ignores the dead zone', () => {
    assert.equal(dpadDirection(2, 3, 10), null);
    assert.equal(dpadDirection(40, 5, 10), 'right');
    assert.equal(dpadDirection(-40, 5, 10), 'left');
    assert.equal(dpadDirection(5, -40, 10), 'up');
    assert.equal(dpadDirection(5, 40, 10), 'down');
  });

  test('dpadDirection holds the current axis near a diagonal (no flicker)', () => {
    assert.equal(dpadDirection(30, 33, 10), 'down');
    assert.equal(dpadDirection(30, 33, 10, 'right'), 'right', 'stays right until vertical clearly wins');
    assert.equal(dpadDirection(30, 45, 10, 'right'), 'down');
  });

  test('firstStep finds the first move of a shortest path around walls', () => {
    // 5x3 room with a wall in the middle column except the bottom row
    const wall = new Set(['2,0', '2,1']);
    const passable = (x: number, y: number) => x >= 0 && x < 5 && y >= 0 && y < 3 && !wall.has(`${x},${y}`);
    const r = firstStep([0, 0], (x, y) => x === 4 && y === 0, passable);
    assert.deepEqual(r, { dir: 'down', dist: 8 });
    assert.deepEqual(firstStep([4, 0], (x, y) => x === 4 && y === 0, passable), { dir: null, dist: 0 });
    assert.equal(firstStep([0, 0], (x, y) => x === 9 && y === 9, passable), null, 'unreachable goal');
  });

  test('firstStep can stop beside a blocked target', () => {
    const passable = (x: number, y: number) => x >= 0 && x < 6 && y === 0 && x !== 5;
    const beside = (x: number, y: number) => Math.abs(x - 5) + Math.abs(y - 0) === 1 && passable(x, y);
    assert.deepEqual(firstStep([1, 0], beside, passable), { dir: 'right', dist: 3 });
    assert.equal(dirToward(4, 0, 5, 0), 'right');
    assert.equal(dirToward(3, 3, 3, 2), 'up');
  });
});

describe('compact text helpers', () => {
  test('wrapLine leaves short lines alone and never exceeds the width', () => {
    assert.deepEqual(wrapLine('short', 20), ['short']);
    const long = 'Zack collects at 5:00 PM (11h 00m from now) and pays for everything in the bin.';
    for (const w of [20, 33, 46]) {
      const out = wrapLine(long, w);
      assert.ok(out.length > 1);
      for (const l of out) assert.ok(l.length <= w, `"${l}" > ${w}`);
      assert.equal(out.join(' ').replace(/\s+/g, ' ').trim(), long);
    }
  });

  test('wrapLine hangs continuation lines under a label column', () => {
    const out = wrapLine('  Ship   Zack collects at 5:00 PM (11h 00m from now).', 30);
    assert.equal(out[0], '  Ship   Zack collects at 5:00');
    assert.ok(out[1].startsWith('         PM'), out[1]);
  });

  test('wrapLine hard-breaks words longer than a line', () => {
    const out = wrapLine('x'.repeat(30), 12);
    assert.ok(out.every((l) => l.length <= 12));
    assert.equal(out.join('').replace(/ /g, ''), 'x'.repeat(30));
  });

  test('reflowPages only splits pages that no longer fit', () => {
    assert.deepEqual(reflowPages([['a', 'b'], ['c']], 40, 10), [['a', 'b'], ['c']]);
    const page = Array.from({ length: 6 }, (_, i) => `line ${i} with quite a few words in it`);
    const out = reflowPages([page], 20, 8);
    assert.ok(out.length >= 2);
    assert.ok(out.every((p) => p.length <= 8));
    assert.ok(out.flat().every((l) => l.length <= 20));
  });

  test('fitMessages wraps the newest message and drops older ones that do not fit', () => {
    const msgs = ['old one', 'middle message', 'the newest message is rather long and wraps onto a second line'];
    const out = fitMessages(msgs, 40, 3);
    assert.equal(out.length, 3);
    assert.deepEqual(out.map((l) => l.age), [1, 0, 0]);
    assert.equal(out[0].text, 'middle message');
    const tight = fitMessages(['x '.repeat(80).trim()], 20, 2);
    assert.equal(tight.length, 2);
    assert.ok(tight[1].text.endsWith('…') && tight[1].text.length <= 20);
  });

  test('fitText picks the longest variant that fits', () => {
    assert.equal(fitText(10, 'a long title', 'short'), 'short');
    assert.equal(fitText(20, 'a long title', 'short'), 'a long title');
    assert.equal(isCompact(79), true);
    assert.equal(isCompact(80), false);
  });
});

describe('compact engine layout', () => {
  test('Screen accepts phone-sized grids down to the compact minimum', () => {
    const s = new Screen(30, 10);
    assert.equal(s.w, COMPACT_MIN_COLS);
    assert.equal(s.h, MIN_ROWS);
  });

  test('narrow screens drop the side panel and give the map the full width', () => {
    const { s } = farm(53, 28);
    assert.equal(s.ctx?.divX, 53);
    assert.equal(s.ctx?.view.x, 0);
    assert.equal(s.ctx?.view.w, 53);
    for (let y = 1; y < 24; y++) assert.notEqual(s.buf[y][52][0], '|', 'no panel divider');
    assert.ok(!rowText(s, 2).includes('H R V S T M N'), 'no side panel title');
  });

  test('the divider row carries the tool and stamina, and hyphens stay hyphens', () => {
    const { s } = farm(53, 28);
    const status = rowText(s, 28 - 4);
    assert.match(status, /\[\d\] Hoe/);
    assert.match(status, /-2st/);
    assert.match(status, /150/);
    const out = computeFrame(s, 0);
    const i = status.indexOf('-2st');
    assert.equal(out[24][i].ch, '-', 'the cost keeps its minus sign');
    assert.ok(out[24].some((o) => o.ch === '█'), 'stamina bar drawn as a bar');
  });

  test('the top bar fits a narrow screen', () => {
    const { s } = farm(53, 28);
    const top = rowText(s, 0);
    assert.match(top, /Spring 1 Mon Y1/);
    assert.match(top, /Your Farm/);
  });

  test("'p' overlays the status panel on narrow screens only", async () => {
    const { s, g } = farm(53, 28);
    await g.handle('p');
    g.render();
    assert.ok(s.boxes.some((b) => b.x === 53 - 29 && b.w === 29), 'status box drawn');
    assert.ok(s.buf.some((row) => row.map((c) => c[0]).join('').includes('Stam')));
    await g.handle('p');
    g.render();
    assert.equal(s.boxes.length, 0);

    const wide = farm(132, 30);
    await wide.g.handle('p');
    assert.equal(wide.g.show_panel, false, 'wide screens always show the panel');
  });

  test('messages wrap on narrow screens instead of being cut off', () => {
    const { s, g } = farm(53, 28);
    g.msg('Wheeeet! Your horse gallops to your side! Riding at 2x speed! (Press Shift+H to dismount)', '09');
    g.render();
    const lines = [25, 26, 27].map((y) => rowText(s, y).trim());
    assert.ok(lines.some((l) => l.endsWith('(Press Shift+H')) || lines.join(' ').includes('to dismount)'), lines.join(' | '));
  });

  test('desktop layout is unchanged at 80 columns', () => {
    const { s } = farm(80, 24);
    assert.equal(s.ctx?.divX, 50);
    assert.equal(s.buf[5][50][0], '|');
  });

  test('paged screens re-wrap long lines on narrow screens', async () => {
    const s = new Screen(53, 28);
    const g = new Game(s, true) as any;
    g.new_game('Pete', 'Moon');
    s.pushKey('space');
    await g.show_pages('Notes', [['  Plan: clear weeds, water crops, care for animals, then ship before 5 PM.']]);
    const text = s.buf.map((row) => row.map((c) => c[0]).join('')).join('\n');
    assert.match(text, /Plan: clear weeds, water crops, care for/);
    assert.match(text, /animals, then ship before 5 PM\./);
  });

  test('the title screen fits a phone', () => {
    const s = new Screen(53, 28);
    const g = new Game(s, false) as any;
    g.render();
    const text = s.buf.map((row) => row.map((c) => c[0]).join(''));
    assert.ok(text.some((l) => l.includes('~ Harvest Moon: Friends of Mineral Town ~')));
    assert.ok(!text.some((l) => l.includes('(Complete')), 'long subtitle dropped');
  });
});

describe('touch context action', () => {
  test('the watering can waters a dry growing crop instead of just checking it', () => {
    const { g } = farm(53, 28);
    const [tx, ty] = g.target();
    g.crops[`${tx},${ty}`] = ['Turnip', 1];
    g.tool = 'Hoe';
    assert.deepEqual(g.context_action(), { key: 'x', label: 'CHECK' });
    g.tool = 'Watering Can';
    assert.deepEqual(g.context_action(), { key: 'space', label: 'WATER' });
    g.wet.add(`${tx},${ty}`);
    assert.deepEqual(g.context_action(), { key: 'x', label: 'CHECK' });
    g.crops[`${tx},${ty}`] = ['Turnip', 4];
    assert.deepEqual(g.context_action(), { key: 'x', label: 'HARVEST' });
  });

  test('during text entry the touch action is DONE (enter), not a space', async () => {
    const s = new Screen(53, 28);
    const g = new Game(s, true) as any;
    const p = g.text_input("What's your name?", 'Pete');
    assert.equal(g.typing, true);
    assert.deepEqual(g.context_action(), { key: 'enter', label: 'DONE' });
    s.pushKey('A');
    s.pushKey('space');
    s.pushKey('B');
    s.pushKey('enter');
    assert.equal(await p, 'A B');
    assert.equal(g.typing, false);
  });

  test('a name prompt opens inside the tap that asked for it, so the phone keyboard can come up', async () => {
    const s = new Screen(53, 28);
    const g = new Game(s, false) as any;
    g.intro = async () => {};
    let opened = 0;
    g.onTyping = () => opened++;
    // Promise steps only: no timer may run between the key and the prompt (iOS ends the tap there).
    const promiseSteps = async () => {
      for (let i = 0; i < 100; i++) await Promise.resolve();
    };
    const done = g.title();
    await new Promise((r) => setTimeout(r, 5)); // the title menu is up, waiting for a key
    s.pushKey('enter'); // New Game
    await promiseSteps();
    assert.equal(opened, 1, 'the name prompt opened within the tap');
    assert.equal(g.typing, true);
    s.pushKey('enter'); // keep the default name
    await promiseSteps();
    assert.equal(opened, 2, 'the farm-name prompt opened within the DONE tap');
    s.pushKey('enter');
    await done;
    assert.equal(g.typing, false);
  });
});
