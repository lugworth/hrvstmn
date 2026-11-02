// Terminal screen buffer and async input handling for HRVSTMN

export type Cell = [char: string, fg: string, bg: string, bold: boolean];

export class Screen {
  w: number = 80;
  h: number = 24;
  buf: Cell[][] = [];
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
  }

  put(x: number, y: number, text: string, fg: string = '05', bg: string = '00', bold: boolean = false) {
    if (y < 0 || y >= this.h) return;
    const row = this.buf[y];
    for (let i = 0; i < text.length; i++) {
      const col = x + i;
      if (col >= 0 && col < this.w) {
        row[col] = [text[i], fg, bg, bold];
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
    const edge = '+' + '-'.repeat(Math.max(0, w - 2)) + '+';
    this.put(x, y, edge, fg, bg);
    this.put(x, y + h - 1, edge, fg, bg);
    for (let j = 1; j < h - 1; j++) {
      this.put(x, y + j, '|', fg, bg);
      this.put(x + w - 1, y + j, '|', fg, bg);
    }
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
