// Terminal screen buffer and async input handling for HRVSTMN

export type Cell = [char: string, fg: string, bg: string, bold: boolean];

/** Visual style used by the canvas renderer. 'classic' is kept for tests and development. */
export type VisualStyle = 'enhanced' | 'classic';

/**
 * Semantic info about a screen cell, written by the engine so the enhanced
 * renderer can style terrain by what it *is* rather than guessing from glyphs.
 * Any plain `put()` over a cell clears its tag, so dialogs and menus drawn on
 * top of the map are always rendered as UI.
 */
export type CellTag = {
  /** Base tile name ('grass', 'roof', 'wall', 'mfloor', ...) or 'ui'. */
  t: string;
  /** Finer kind: 'obj:weed', 'crop:ripe', 'soil:wet', 'deco', 'box:tl', 'bar', ... */
  k?: string;
  /** Deco glyph/colour for roofs, signs and windows. */
  dch?: string;
  dfg?: string;
  /** World coordinates (map cells only). */
  wx?: number;
  wy?: number;
  /** Tool-target highlight. */
  hl?: boolean;
  /** Secondary cells covered by an upgraded tool's area of effect. */
  hlArea?: boolean;
  /** For zoomed tiles: which sub-cell of the tile this is, and the tile width in cells. */
  sub?: number;
  zw?: number;
  /** Entity standing on this cell: 'player', 'npc', 'animal', 'pet'. */
  ent?: string;
};

export type RenderFx = {
  kind: 'dust' | 'sparkle' | 'splash' | 'coin';
  x: number;
  y: number;
  age: number;
  life: number;
};

export type HudIcon = { x: number; y: number; icon: 'stamina' | 'fatigue' | 'gold' | 'bin' | 'tool' | 'weather' };

/** Per-frame scene context for the renderer (null on title/menus). */
export type RenderCtx = {
  mapName: string;
  indoor: boolean;
  /** Minutes since midnight. */
  minutes: number;
  /** 0 Spring, 1 Summer, 2 Fall, 3 Winter. */
  season: number;
  weather: string;
  /** 0 = dry ground, 1 = fresh rain. Persists and fades after the rain stops. */
  wetness?: number;
  /** Screen cells per map tile horizontally. Always 1 now that large tiles are gone. */
  zoom: number;
  /** OS-level or user-chosen reduced motion. Freezes ambient animation. */
  reducedMotion?: boolean;
  /** Screen rectangle occupied by the map viewport. */
  view: { x: number; y: number; w: number; h: number };
  /** Column of the vertical divider and row of the horizontal divider. */
  divX: number;
  divY: number;
  icons: HudIcon[];
  /** Transient action-feedback glyphs, in screen cells. */
  fx?: RenderFx[];
};

export class Screen {
  w: number = 80;
  h: number = 24;
  buf: Cell[][] = [];
  tags: (CellTag | null)[][] = [];
  ctx: RenderCtx | null = null;
  /** Special full-screen scenes the renderer can dress up (currently 'title'). */
  scene: string | null = null;
  /** Rectangles of boxes (dialogs, menus) drawn this frame, top-most last. */
  boxes: { x: number; y: number; w: number; h: number }[] = [];
  style: VisualStyle = 'enhanced';
  reducedMotion: boolean = false;
  /** Whether texture cells may use half-size 2x2/3x3 detail glyphs. */
  hires: boolean = true;
  onHiresChange?: (hires: boolean) => void;
  keyQueue: string[] = [];
  private keyWaiters: Array<{
    resolve: (key: string | null) => void;
    timer?: ReturnType<typeof setTimeout>;
  }> = [];
  onRender?: () => void;

  constructor(w: number = 80, h: number = 24) {
    this.setSize(w, h);
  }

  setSize(w: number, h: number) {
    this.w = Math.max(80, Math.min(160, w));
    this.h = Math.max(24, Math.min(50, h));
    this.clear();
  }

  clear() {
    const blank: Cell = [' ', '05', '00', false];
    this.buf = Array.from({ length: this.h }, () =>
      Array.from({ length: this.w }, () => [...blank] as Cell)
    );
    this.tags = Array.from({ length: this.h }, () => new Array<CellTag | null>(this.w).fill(null));
    this.ctx = null;
    this.scene = null;
    this.boxes = [];
  }

  /** Attach semantic info to a cell (call after `put`). */
  tag(x: number, y: number, tag: CellTag | null) {
    if (y < 0 || y >= this.h || x < 0 || x >= this.w) return;
    this.tags[y][x] = tag;
  }

  /** Choose a renderer programmatically. The UI never exposes a style switch. */
  setStyle(style: VisualStyle) {
    this.style = style;
  }

  setHires(hires: boolean) {
    if (this.hires === hires) return;
    this.hires = hires;
    this.onHiresChange?.(hires);
  }

  put(x: number, y: number, text: string, fg: string = '05', bg: string = '00', bold: boolean = false) {
    if (y < 0 || y >= this.h) return;
    const row = this.buf[y];
    const trow = this.tags[y];
    for (let i = 0; i < text.length; i++) {
      const col = x + i;
      if (col >= 0 && col < this.w) {
        row[col] = [text[i], fg, bg, bold];
        trow[col] = null;
      }
    }
  }

  box(
    x: number,
    y: number,
    w: number,
    h: number,
    fg: string = '03',
    bg: string = '00',
    title: string | null = null,
    tfg: string = '07'
  ) {
    for (let j = 0; j < h; j++) {
      this.put(x, y + j, ' '.repeat(w), fg, bg);
    }
    this.boxes.push({ x, y, w, h });
    const edge = '+' + '-'.repeat(Math.max(0, w - 2)) + '+';
    this.put(x, y, edge, fg, bg);
    this.put(x, y + h - 1, edge, fg, bg);
    for (let j = 1; j < h - 1; j++) {
      this.put(x, y + j, '|', fg, bg);
      this.put(x + w - 1, y + j, '|', fg, bg);
    }
    const corner = (cx: number, cy: number, k: string) => this.tag(cx, cy, { t: 'ui', k });
    for (let i = 1; i < w - 1; i++) {
      corner(x + i, y, 'box:h');
      corner(x + i, y + h - 1, 'box:h');
    }
    for (let j = 1; j < h - 1; j++) {
      corner(x, y + j, 'box:v');
      corner(x + w - 1, y + j, 'box:v');
    }
    corner(x, y, 'box:tl');
    corner(x + w - 1, y, 'box:tr');
    corner(x, y + h - 1, 'box:bl');
    corner(x + w - 1, y + h - 1, 'box:br');
    if (title) {
      this.put(x + 2, y, ` ${title} `, tfg, bg, true);
    }
  }

  flush() {
    if (this.onRender) {
      this.onRender();
    }
  }

  pushKey(key: string) {
    if (this.keyWaiters.length > 0) {
      const waiter = this.keyWaiters.shift()!;
      if (waiter.timer) clearTimeout(waiter.timer);
      waiter.resolve(key);
    } else {
      if (this.keyQueue.length < 256) {
        this.keyQueue.push(key);
      }
    }
  }

  async getKey(timeoutSec?: number | null): Promise<string | null> {
    if (this.keyQueue.length > 0) {
      return this.keyQueue.shift()!;
    }
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const waiter: {
        resolve: (key: string | null) => void;
        timer?: ReturnType<typeof setTimeout>;
      } = { resolve };

      if (timeoutSec !== undefined && timeoutSec !== null && timeoutSec >= 0) {
        timer = setTimeout(() => {
          const idx = this.keyWaiters.indexOf(waiter);
          if (idx >= 0) this.keyWaiters.splice(idx, 1);
          resolve(null);
        }, Math.max(1, Math.round(timeoutSec * 1000)));
        waiter.timer = timer;
      }
      this.keyWaiters.push(waiter);
    });
  }
}
