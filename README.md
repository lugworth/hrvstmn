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
- **Two visual styles** (press **V**, or use the Style button; your choice is remembered):
  - **Enhanced** (default): textured ground, crafted buildings with sloped roofs and glowing windows, seasonal palettes (spring, summer, autumn leaves, winter snow), time-of-day lighting with dawn, dusk, a lantern around the player, lit windows and fireflies, and animated rain, typhoons, snow and blizzards.
  - **Classic**: the original flat base16 ASCII look.
  - Add `?style=classic` or `?style=enhanced` to the URL to force one.
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
npm test     # unit tests (game rules + enhanced renderer)
```

### How the Enhanced renderer works

The engine still writes plain `(glyph, fg, bg)` cells, and also tags each map cell with what it is
(tile name, world position, deco, entity, tool highlight). It also sets a per-frame context
(clock, season, weather, indoors). `src/game/enhanced.ts` turns that into the styled frame, so game
logic never depends on the visual style. Any ordinary write over a cell clears its tag, so dialogs
and menus drawn over the map always render as UI.

The bundled font is a subset of DejaVu Sans Mono (`public/fonts`, see `LICENSE-DejaVu.txt`), so the
block and symbol glyphs look the same on every device.
