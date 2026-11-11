// Farm HUD chrome shared by the engine (which lays the cells out) and the Enhanced renderer
// (which colours and draws them). Text glyphs only; no game state.

/** Cells from one fence post to the next along a rail. */
export const FENCE_PITCH = 6;

/** Is cell `i` of a `w`-cell rail a post? Both ends are, then one per pitch, never crowding the end post. */
export function fencePost(i: number, w: number): boolean {
  return i === 0 || i === w - 1 || (i % FENCE_PITCH === 0 && w - 1 - i >= 3);
}

/** One glyph per season, spring first: blossom, clover, leaf, snowflake. */
export const SEASON_GLYPHS = ['❀', '☘', '❦', '❆'] as const;
