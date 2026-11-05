// Compact (phone) layout: constants and pure text helpers shared by the engine and the canvas host.
//
// The full layout is a map plus a 29-column side panel and needs at least 80 columns. A phone in
// portrait only fits ~50 readable columns, so below 80 columns the engine drops the side panel,
// moves its essentials into the divider row, and wraps long text instead of cutting it off.

/** Columns the full layout (map + side panel) needs. */
export const FULL_MIN_COLS = 80;
/** Narrowest grid the compact layout supports (festival boxes are 50 wide). */
export const COMPACT_MIN_COLS = 50;
/** Every layout needs this many rows (title menu, dialogs and pages assume it). */
export const MIN_ROWS = 24;

/** Whether a grid this wide uses the compact layout. */
export const isCompact = (cols: number): boolean => cols < FULL_MIN_COLS;

/**
 * Word-wrap one line to `width` columns. The first line keeps its indentation; continuation
 * lines hang under the value of a `label   value` row (two or more spaces after the first word),
 * or two columns past the indentation otherwise. Words longer than a line are hard-broken.
 */
export function wrapLine(line: string, width: number): string[] {
  if (line.length <= width || width < 12) return [line];
  const lead = (line.match(/^ */) as RegExpMatchArray)[0].length;
  const label = line.match(/^ *\S+ {2,}(?=\S)/);
  const half = Math.floor(width / 2);
  let hang = label ? label[0].length : lead + 2;
  if (hang > half) hang = Math.min(lead + 2, half);
  const out: string[] = [];
  let cur = ' '.repeat(Math.min(lead, half));
  let fresh = true; // `cur` holds only indentation
  let gap = '';
  for (const tok of line.slice(lead).match(/\S+| +/g) || []) {
    if (tok[0] === ' ') {
      gap = tok;
      continue;
    }
    let word = tok;
    while (word) {
      const room = width - cur.length - (fresh ? 0 : gap.length);
      if (word.length <= room) {
        cur += (fresh ? '' : gap) + word;
        word = '';
        fresh = false;
      } else if (fresh) {
        cur += word.slice(0, room);
        word = word.slice(room);
        out.push(cur);
        cur = ' '.repeat(hang);
      } else {
        out.push(cur);
        cur = ' '.repeat(hang);
        fresh = true;
      }
    }
    gap = '';
  }
  if (!fresh || !out.length) out.push(cur);
  return out;
}

export const wrapLines = (lines: string[], width: number): string[] => lines.flatMap((l) => wrapLine(l, width));

/**
 * Re-wrap paged text for a narrow screen. Each source page stays together when it fits;
 * an overlong page is split between wrapped lines, never inside one when avoidable.
 */
export function reflowPages(pages: string[][], width: number, pageSize: number): string[][] {
  const size = Math.max(1, pageSize);
  const out: string[][] = [];
  for (const page of pages) {
    let cur: string[] = [];
    for (const line of page) {
      const group = wrapLine(line, width);
      if (cur.length && cur.length + group.length > size) {
        out.push(cur);
        cur = [];
      }
      for (const g of group) {
        if (cur.length >= size) {
          out.push(cur);
          cur = [];
        }
        cur.push(g);
      }
    }
    out.push(cur);
  }
  return out.length ? out : [[]];
}

/**
 * Fit the newest messages into `rows` lines of `width` columns, wrapping instead of truncating.
 * The newest message always shows (cut with an ellipsis only if it alone overflows); older
 * messages appear above it only when they fit whole. `age` 0 is the newest message.
 */
export function fitMessages(msgs: string[], width: number, rows: number): { text: string; age: number }[] {
  const blocks: { text: string; age: number }[][] = [];
  let used = 0;
  for (let i = msgs.length - 1; i >= 0 && used < rows; i--) {
    const age = msgs.length - 1 - i;
    let lines = wrapLine(msgs[i], width);
    if (used + lines.length > rows) {
      if (age > 0) break;
      lines = lines.slice(0, rows);
      const last = lines[rows - 1];
      lines[rows - 1] = (last.length >= width ? last.slice(0, width - 1) : last) + '…';
    }
    blocks.unshift(lines.map((text) => ({ text, age })));
    used += lines.length;
  }
  return blocks.flat();
}

/** Pick the longest variant that fits in `width` columns (falls back to the last one). */
export const fitText = (width: number, ...variants: string[]): string =>
  variants.find((v) => v.length <= width) ?? variants[variants.length - 1];
