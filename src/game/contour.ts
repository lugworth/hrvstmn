// World-anchored character textures. No screen coordinates, animation, or game state.
export type ContourTexture = { x: number; y: number; kind: 'ground' | 'roof' | 'water' | 'tree' };

const patterns = new Map<string, string>();

function mark(x: number, y: number, kind: ContourTexture['kind']): string {
  if (kind === 'water') {
    return Math.abs(Math.sin(y * 3.4 + Math.sin(x * 0.35) * 0.9)) < 0.38 ? '~' : ' ';
  }
  const roof = kind === 'roof';
  const a = x * (roof ? 0.52 : 0.19);
  const b = x * 0.09 + y * 0.14;
  const field = (y + Math.sin(a) * (roof ? 0.9 : 2.4) + Math.sin(b) * 1.7) / (roof ? 1.4 : 2.5);
  if (Math.abs(field - Math.round(field)) > 0.13) return ' ';
  const slope = Math.cos(a) * (roof ? 0.47 : 0.46) + Math.cos(b) * 0.15;
  return Math.abs(slope) < 0.16 ? '-' : slope > 0 ? ')' : '(';
}

/** n*n glyphs, sampled in world space so adjoining tiles and camera moves agree. */
export function contourPattern(texture: ContourTexture, n: number): string {
  const { x, y, kind } = texture;
  const key = `${kind}:${n}:${x}:${y}`;
  const cached = patterns.get(key);
  if (cached !== undefined) return cached;
  let pattern = '';
  if (kind === 'tree') {
    pattern = n === 1 ? '♠' : n === 2 ? '/\\/\\' : ' ^ /|\\/|\\';
  } else {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) pattern += mark(x + (c + 0.5) / n, y + (r + 0.5) / n, kind);
    }
  }
  if (patterns.size >= 8192) patterns.clear();
  patterns.set(key, pattern);
  return pattern;
}
