# HRVSTMN (Next.js Edition)

An ASCII tribute to *Harvest Moon: Friends of Mineral Town*, rendered in the base16 Isotope Dark palette and rewritten as a high-performance **Next.js 15+ (App Router)** web application with React 19 and HTML5 Canvas.

## Features

- **Native Web Performance**: Rebuilt with pure TypeScript running directly in the browser—no WebAssembly/Pyodide download overhead, and no SharedArrayBuffer cross-origin isolation restrictions.
- **Complete Harvest Moon Gameplay**:
  - Full crop cycle: tilling, planting, watering, and harvesting 15 seasonal crops.
  - Animal husbandry: barns & coops with chickens, cows, and sheep (feeding, petting, brushing, milking, shearing).
  - Town & villagers: 18 NPCs with daily schedules, dialogue, heart levels, gift preferences, festivals, and marriage.
  - Mountain & Mines: forage wild herbs, bamboo shoots, mushrooms, and delve through 10 mine floors for ores and precious gems.
  - House expansions: carpentry upgrades (kitchen, extension, bathroom, big bed, coop expansion) and cooking with utensils and recipes.
  - Seasonal festivals: New Year's Day, Goddess Festival, Chicken Sumo, Egg Hunt, Fireworks, Harvest Festival, and more.
- **Three visual styles** (press **V** to cycle, or use the Style button; your choice is remembered):
  - **Large** (default): Enhanced with square, two-character map tiles. Each tile gets more detail (peaked cliffs, round boulders, window panes, doors with knobs, furniture sprites) and single glyphs sit centred in their tile.
  - **Enhanced**: one character per tile, so more of the map fits on screen. Both Enhanced styles have textured ground, crafted buildings, shadows under buildings and trees, drifting cloud shadows, seasonal palettes (spring blossom, summer fruit, autumn leaves, winter snow), time-of-day lighting (dawn, dusk, a lantern around the player, lit windows, fireflies, a night vignette), animated rain with puddles, typhoons with lightning and swaying trees, snow and blizzards, chimney smoke, butterflies, falling autumn leaves, sun glints and star reflections on water, animals and villagers on round tokens (`♞` horse, `♉` cows, `☁` sheep), dialogs with a raised panel and drop shadow, and a night-sky title screen.
  - **Classic**: the original flat base16 ASCII look.
  - Add `?style=large`, `?style=enhanced` or `?style=classic` to the URL to force one.
- **Controls**:
  - Keyboard: Arrow keys / WASD to move, Space / Z to use tool, X / E / Enter to interact, Tab / Shift+Tab to switch tools, I for rucksack, V for visual style, Esc for menu, ? for help.
  - Touch: Full on-screen D-Pad (with tap-or-hold repeat) and action buttons for mobile & tablet gameplay.
- **Auto-Save**: Farm progress, crops, animals, and relationships persist in your browser's local storage.

## Development

```bash
npm install
npm run dev
```

Runs on [http://0.0.0.0:3000](http://0.0.0.0:3000).

```bash
npm test     # unit + integration tests (game rules, renderer, engine rendering)
```

### Colour

Every colour the Enhanced renderer draws is snapped to ramps built only from the 16 base16
Isotope Dark colours (`toIsotope` in `src/game/enhanced.ts`). Each hue gets a value ramp with hue
shifting: shadows lean toward the palette's indigo, highlights toward its orange and white. Where
two grounds meet, there's no in-between hue in the palette, so the border is dithered with `░`
instead of blended. Map backgrounds sink toward Isotope's pure black, and glyph colours are
pulled toward the nearest pure Isotope hue while keeping their brightness, for the theme's
neon-on-black contrast.

Enhanced and Large are drawn **black and white**: every map cell is converted to grey by brightness,
keeping its light and shade. Only things of interest keep their colour as accents: the player,
villagers and animals, ripe crops, forage and flowers, doors, lit windows, bins, signs, fixtures,
stairs, fires, torches and ore, and a few seasonal touches.

**High-resolution textures:** where the font is large enough (12px or more), map texture cells
(grass, specks, cobbles, water, foliage, shingles, planks, furrows, rock, floorboards) are drawn as a
2×2 grid of half-size glyphs, four times the detail per cell. On sharp screens (font size × device
pixel ratio ≥ 28, e.g. retina laptops, phones, 4K) they go to a 3×3 grid, nine glyphs per cell, drawn one row per
call so it stays fast. Sprites, text and the HUD stay full
size. The patterns are seeded by world position, so they don't shimmer when the view scrolls.

### How the Enhanced renderer works

The engine still writes plain `(glyph, fg, bg)` cells, and also tags each map cell with what it is
(tile name, world position, deco, entity, tool highlight). In Large mode each tile is drawn into
two cells tagged `sub: 0/1`, and the camera works in tiles. It also sets a per-frame context
(clock, season, weather, indoors). `src/game/enhanced.ts` turns that into the styled frame, so game
logic never depends on the visual style. Any ordinary write over a cell clears its tag, so dialogs
and menus drawn over the map always render as UI.

The bundled font is a subset of DejaVu Sans Mono (`public/fonts`, see `LICENSE-DejaVu.txt`), so the
block and symbol glyphs look the same on every device.
