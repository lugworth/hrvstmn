// Farm HUD chrome: fence rails, the painted tool sign, the ledger, season glyphs and the
// message bullet, on the desktop panel and in the compact phone layout.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Screen, VisualStyle } from './screen';
import { Game } from './engine';
import { computeFrame, drawFrame, isotopeRamps, rgbToHex, FARM_CHROME, type OutCell } from './enhanced';
import { FENCE_PITCH, SEASON_GLYPHS, fencePost } from './chrome';

const store: Record<string, string> = {};
before(() => {
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
  };
});

function farm(cols: number, rows: number, setup?: (g: any) => void, style?: VisualStyle) {
  const s = new Screen(cols, rows);
  if (style) s.style = style;
  const g = new Game(s, true) as any;
  g.new_game('Pete', 'Moon');
  g.warp('farm', 23, 9);
  setup?.(g);
  g.render();
  return { s, g, out: computeFrame(s, 0) };
}
const text = (cells: { ch: string }[]) => cells.map((o) => o.ch).join('');
const bufRow = (s: Screen, y: number) => s.buf[y].map((c) => c[0]).join('');
const FENCE = '═╪╧';

describe('fence rails', () => {
  test('a rail has a post at both ends, one per pitch, and none crowding the end post', () => {
    const posts = (w: number) => Array.from({ length: w }, (_, i) => (fencePost(i, w) ? '╪' : '═')).join('');
    assert.equal(posts(19), '╪═════╪═════╪═════╪');
    assert.equal(posts(21), '╪═════╪═════╪═══════╪', 'the post 2 cells from the end is dropped');
    assert.equal(posts(1), '╪');
    for (let w = 2; w <= 40; w++) {
      const row = posts(w);
      assert.ok(row.startsWith('╪') && row.endsWith('╪'), `width ${w}`);
      assert.ok(!/╪═{0,1}╪$/.test(row) || w <= 3, `width ${w}: ${row}`);
    }
  });

  test('desktop: the divider is one unbroken fence with the panel edge standing on it', () => {
    for (const [w, h] of [[80, 24], [110, 24], [132, 30], [160, 50]]) {
      const { s, out } = farm(w, h);
      const { divX, divY } = s.ctx!;
      const row = out[divY];
      assert.ok(row.every((o) => FENCE.includes(o.ch) && o.ui), `${w}x${h}: ${text(row)}`);
      assert.equal(row[divX].ch, '╧');
      assert.equal(text(row).split('╧').length, 2, 'exactly one edge post');
      for (let x = 0; x < w; x++) {
        const o = row[x];
        assert.equal(o.fg, o.ch === '═' ? FARM_CHROME.rail : FARM_CHROME.post);
        assert.equal(o.bg, '#000000');
        if (o.ch === '╪') {
          assert.equal(x % FENCE_PITCH, 3);
          assert.ok(Math.abs(x - divX) > 2, 'no post crowds the panel edge');
        }
      }
      for (let y = 0; y < divY; y++) {
        assert.equal(out[y][divX].ch, '│');
        assert.equal(out[y][divX].fg, FARM_CHROME.rail);
      }
      assert.equal(bufRow(s, divY), '-'.repeat(w), 'the engine still writes a plain rule');
    }
  });

  test('desktop: two panel rails replace the blank row and the old cyan rule', () => {
    const { s, out } = farm(80, 24);
    const { divX, divY } = s.ctx!;
    const rails: string[] = [];
    for (let y = 0; y < divY; y++) {
      const cells = out[y].slice(divX + 1).filter((_, i) => s.tags[y][divX + 1 + i]?.k === 'hud:fence');
      if (!cells.length) continue;
      rails.push(text(cells));
      assert.ok(cells.every((o) => o.ui && o.bg === '#000000' && o.fg === (o.ch === '═' ? FARM_CHROME.rail : FARM_CHROME.post)));
    }
    assert.deepEqual(rails, ['╪═════╪═════╪═════╪', '╪═════╪═════╪═════╪']);
    const panel = out.slice(0, divY).map((r) => text(r.slice(divX + 1))).join('\n');
    assert.ok(!panel.includes('─'), 'no plain rule is left in the panel');
  });

  test('a dialog over the divider hides the fence beneath it', () => {
    const { s } = farm(80, 24);
    const { divY } = s.ctx!;
    s.box(20, divY - 3, 30, 5, '0C', '00', 'Note');
    const row = computeFrame(s, 0)[divY];
    assert.ok(row.slice(20, 50).every((o) => !'═╪'.includes(o.ch)), text(row));
    assert.equal(row[10].ch, '═');
  });

  test('Classic keeps its plain rules, top bar and message column', () => {
    const { s } = farm(80, 24, (g) => g.msg('You feel rested.', '05'), 'classic');
    const { divX, divY } = s.ctx!;
    assert.equal(bufRow(s, divY), '-'.repeat(80));
    assert.equal(s.buf[5][divX][0], '|');
    assert.ok(!s.tags.flat().some((t) => t?.k === 'hud:fence' || t?.k === 'hud:sign'));
    assert.ok(!s.ctx!.icons.some((i) => i.icon === 'season' || i.icon === 'note'));
    assert.match(bufRow(s, 0), /^ Spring 1 Mon/);
    assert.ok(s.buf.some((r) => r.map((c) => c[0]).join('').startsWith(' You feel rested.')));
  });

  test('fence glyphs are drawn as joined lines, never as font glyphs', () => {
    const cells: OutCell[] = [...'═╪╧'].map((ch) => ({ ch, fg: FARM_CHROME.rail, bg: '#000000', bold: false, ui: true }));
    const glyphs: string[] = [];
    const rects: number[][] = [];
    const canvas = new Proxy({
      fillText: (t: string) => glyphs.push(t),
      fillRect: (...a: number[]) => rects.push(a),
    }, { get: (target, key) => (key in target ? target[key as keyof typeof target] : () => {}) }) as unknown as CanvasRenderingContext2D;
    drawFrame(canvas, [cells], { cw: 10, ch: 20, fontPx: 16, font: 'monospace', dpr: 1 });
    assert.deepEqual(glyphs, []);
    const rails = rects.filter((r) => r[3] <= 2);
    assert.equal(rails.length, 6, 'two rails per cell');
    assert.ok(rails.every((r) => Number.isInteger(r[1]) && r[2] === 12), 'whole-pixel rails lapping 1px into each neighbour');
    // the same glyph outside the HUD (a barn wall, say) is left to the font
    drawFrame(canvas, [[{ ...cells[0], ui: false }]], { cw: 10, ch: 20, fontPx: 16, font: 'monospace', dpr: 1 });
    assert.ok(glyphs.length > 0 && glyphs.every((g) => g === '═'), glyphs.join());
  });
});

describe('painted tool sign', () => {
  test('desktop: one board the width of the panel, white lettering, cyan key', () => {
    const { s, out } = farm(80, 24);
    const { divX, divY } = s.ctx!;
    const rows = out.slice(0, divY).map((r, y) => ({ y, cells: r.slice(divX + 1).filter((o) => o.bg === FARM_CHROME.board) })).filter((r) => r.cells.length);
    assert.equal(rows.length, 1, 'exactly one sign row');
    const { y, cells } = rows[0];
    assert.equal(cells.length, 19);
    assert.match(text(cells), /^ \[2\] HOE +$/);
    assert.ok(cells.every((o) => o.ui));
    assert.equal(cells[1].fg, '#00ffff');
    assert.equal(cells[5].fg, '#ffffff');
    assert.ok(cells[5].bold);
    assert.match(text(out[y - 1].slice(divX + 1)), /EQUIPPED/);
    assert.ok(out[y - 1].concat(out[y + 1]).every((o) => o.bg !== FARM_CHROME.board), 'cost and level stay off the board');
  });

  test('a long tool name is clipped inside the board, never past it', () => {
    const { s, out } = farm(80, 24, (g) => { g.tool = 'Strawberry Seeds'; g.inv['Strawberry Seeds'] = 3; });
    const { divX, divY } = s.ctx!;
    const cells = out.slice(0, divY).flatMap((r) => r.slice(divX + 1)).filter((o) => o.bg === FARM_CHROME.board);
    assert.equal(cells.length, 19);
    assert.equal(cells[0].ch, ' ');
    assert.equal(cells[18].ch, ' ');
    assert.match(text(cells), /STRAWBERRY SEEDS/);
  });

  test('compact: the tool and its icon share a board hung on the status fence', () => {
    const { s, out } = farm(50, 24, (g) => { g.tool = 'Watering Can'; g.water = 12; });
    const y = s.h - 4;
    const board = out[y].map((o, x) => ({ o, x })).filter(({ o }) => o.bg === FARM_CHROME.board);
    assert.equal(text(board.map((b) => b.o)), '⚒[5] Watering Can ');
    assert.equal(board[0].x, 1);
    assert.equal(board[board.length - 1].x - board[0].x + 1, board.length, 'one unbroken board');
    assert.match(text(out[y]), /Watering Can 12\/30 -2st /, 'the hyphen in the cost stays a hyphen');
    assert.ok(out.every((r, yy) => yy === y || r.every((o) => o.bg !== FARM_CHROME.board)));
  });
});

describe('compact status fence', () => {
  test('rail fills the gaps, posts stand only on clear rail, and the bar is untouched', () => {
    for (const cols of [50, 53, 64, 79]) {
      const { s, out } = farm(cols, 28);
      const y = s.h - 4;
      const row = out[y];
      assert.equal(row[0].ch, '═');
      assert.ok(text(row).includes('╪'), `${cols}: ${text(row)}`);
      assert.ok(!text(row).includes('╧'), 'no panel edge on a phone');
      assert.ok(!text(row).includes('─') && text(row).includes('-2st'), 'the cost keeps its hyphen');
      row.forEach((o, x) => {
        if (o.ch !== '╪') return;
        assert.ok(row[x - 1]?.ch === '═' && row[x + 1]?.ch === '═', `${cols}: post beside text at ${x}`);
      });
      assert.ok(row.some((o) => o.ch === '█'), 'stamina bar still drawn');
      assert.ok(out[0].every((o) => !FENCE.includes(o.ch)), 'the top bar has no fence');
    }
  });
});

describe('ledger', () => {
  test('accounts get dot leaders one cell clear of the label and the value', () => {
    const { s, out } = farm(80, 24);
    const { divX, divY } = s.ctx!;
    const panel = out.slice(0, divY).map((r) => text(r.slice(divX + 3)).trimEnd());
    assert.ok(panel.includes('GOLD ········· 500G'), panel.join('\n'));
    assert.ok(panel.includes('BIN ············ 0G'));
    assert.ok(panel.includes('HELD ············ —'));
    const y = panel.indexOf('GOLD ········· 500G');
    assert.equal(out[y][divX + 3 + 5].fg, '#404040', 'leaders are the dimmest grey');
  });

  test('gauges and tight rows take no leaders', () => {
    const { s, out } = farm(80, 24, (g) => { g.gold = 98765432109; g.chickens = 3; g.eggs = 2; });
    const { divX, divY } = s.ctx!;
    const panel = out.slice(0, divY).map((r) => text(r.slice(divX + 3)).trimEnd());
    const gold = panel.find((l) => l.startsWith('GOLD'))!;
    assert.match(gold, /^GOLD +98765432109G$/);
    assert.ok(!gold.includes('·'), 'fewer than three leaders are dropped');
    for (const name of ['STAMINA', 'FATIGUE', 'EQUIPPED', 'COOP']) {
      const line = panel.find((l) => l.startsWith(name));
      assert.ok(line && !line.includes('·'), `${name}: ${line}`);
    }
  });
});

describe('season glyphs and the message bullet', () => {
  const COLS = ['#ff0099', '#33ff00', '#ff9900', '#00ffff'];

  test('desktop: each season leads its line with its own glyph and colour', () => {
    for (let season = 0; season < 4; season++) {
      const { s, out } = farm(80, 24, (g) => { g.season = season; });
      const { divX, divY } = s.ctx!;
      const hits = out.slice(0, divY).flatMap((r) => r.slice(divX + 1)).filter((o) => (SEASON_GLYPHS as readonly string[]).includes(o.ch));
      assert.equal(hits.length, 1);
      assert.equal(hits[0].ch, SEASON_GLYPHS[season]);
      assert.equal(hits[0].fg, COLS[season]);
      const line = out.slice(0, divY).map((r) => text(r.slice(divX + 3))).find((l) => l.includes('YEAR'))!;
      assert.match(line, new RegExp(`^${SEASON_GLYPHS[season]} [A-Z]+ / YEAR 1`));
    }
  });

  test('winter in the snow: the season flake is not the weather flake', () => {
    const { s, out } = farm(80, 24, (g) => { g.season = 3; g.weather = 'Snow'; g.minutes = 12 * 60; });
    const panel = out.slice(0, s.ctx!.divY).map((r) => text(r.slice(s.ctx!.divX + 1))).join('\n');
    assert.ok(panel.includes('❆') && panel.includes('❄'));
    assert.notEqual(SEASON_GLYPHS[3], '❄');
  });

  test('compact: the glyph sits against the season name without costing the text', () => {
    const { out } = farm(50, 24, (g) => { g.season = 2; g.day = 14; });
    assert.match(text(out[0]), /^ ❦Fall 14 Thu Y1 /);
    assert.equal(out[0][1].fg, '#ff9900');
  });

  test('a dialog over the season line hides the glyph', () => {
    const { s } = farm(80, 24);
    s.box(s.ctx!.divX + 1, 0, 80 - s.ctx!.divX - 1, 12, '0C', '00', 'Note');
    const out = computeFrame(s, 0);
    assert.ok(!out.flat().some((o) => (SEASON_GLYPHS as readonly string[]).includes(o.ch)));
  });

  test('desktop: the newest message gets a leaf bullet in fence-post brown', () => {
    const { s, out } = farm(80, 24, (g) => { g.msgs = []; g.msg('older', '05'); g.msg('You tilled the soil.', '0B'); });
    const row = out[s.h - 1];
    assert.match(text(row), /^ ❧ You tilled the soil\. *$/);
    assert.equal(row[1].fg, FARM_CHROME.post);
    assert.equal(row[3].fg, '#33ff00', 'the message keeps its own colour');
    assert.equal(out.flat().filter((o) => o.ch === '❧').length, 1);
  });

  test('a long desktop message is cut to the row, bullet included', () => {
    const { s, out } = farm(80, 24, (g) => g.msg('x'.repeat(200), '05'));
    const row = text(out[s.h - 1]);
    assert.equal(row.length, 80);
    assert.match(row, /^ ❧ x{76} $/);
  });

  test('compact: the bullet takes the left margin and wrapping keeps its full width', () => {
    const long = 'Wheeeet! Your horse gallops to your side! Riding at 2x speed! (Press Shift+H to dismount)';
    const { s, out } = farm(53, 28, (g) => { g.msgs = []; g.msg('~ Your Farm ~', '05'); g.msg(long, '09'); });
    const rows = [25, 26, 27].map((y) => text(out[y]));
    const first = rows.findIndex((r) => r.startsWith('❧'));
    assert.ok(first >= 0, rows.join('|'));
    assert.match(rows[first], /^❧Wheeeet!/);
    assert.equal(rows.filter((r) => r.includes('❧')).length, 1, 'continuation lines have no bullet');
    assert.equal(bufRow(s, 25 + first)[1], 'W', 'text still starts in column 1');
    assert.ok(rows.join(' ').replace(/\s+/g, ' ').includes('to dismount)'));
  });

  test('no messages, no bullet', () => {
    for (const cols of [80, 50]) {
      const { out } = farm(cols, 24, (g) => { g.msgs = []; });
      assert.ok(!out.flat().some((o) => o.ch === '❧'));
    }
  });
});

describe('chrome colours', () => {
  test('wood comes from the Isotope ramps, on desktop and compact, day and night', () => {
    const allowed = new Set(isotopeRamps().map((c) => rgbToHex(c)));
    for (const hex of Object.values(FARM_CHROME)) assert.ok(allowed.has(hex), hex);
    for (const cols of [80, 50]) {
      for (const minutes of [12 * 60, 23 * 60]) {
        const { out } = farm(cols, 24, (g) => { g.minutes = minutes; g.season = 3; g.weather = 'Snow'; });
        for (const o of out.flat()) assert.ok(allowed.has(o.fg) && allowed.has(o.bg), `${o.ch} ${o.fg} / ${o.bg}`);
      }
    }
  });

  test('wood is used for chrome only: nothing else in the HUD takes the board colour', () => {
    const { s, out } = farm(80, 24);
    const { divX, divY } = s.ctx!;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const o = out[y][x];
      if (o.bg !== FARM_CHROME.board) continue;
      assert.equal(s.tags[y][x]?.k, 'hud:sign');
      assert.ok(x > divX && y < divY);
    }
  });

  test('the toolbar CSS variables mirror the colours the canvas draws', () => {
    const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
    const v = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`).exec(css)?.[1];
    assert.equal(v('fence-rail'), FARM_CHROME.rail);
    assert.equal(v('fence-post'), FARM_CHROME.post);
    assert.equal(v('sign-board'), FARM_CHROME.board);
    assert.match(css, /\.game-toolbar \{[^}]*border-top: 1px solid var\(--fence-rail\)/);
    assert.match(css, /\.game-sep::before \{ content: "╪"/);
  });
});
