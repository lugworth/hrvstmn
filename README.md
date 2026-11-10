# HRVSTMN (Next.js Edition)

An ASCII tribute to *Harvest Moon: Friends of Mineral Town*, rendered in the base16 Isotope Dark palette and rewritten as a high-performance **Next.js 15+ (App Router)** web application with React 19 and HTML5 Canvas.

## Features

- **Native Web Performance**: Rebuilt with pure TypeScript running directly in the browser—no WebAssembly/Pyodide download overhead, and no SharedArrayBuffer cross-origin isolation restrictions.
- **Complete Harvest Moon Gameplay**:
  - Full crop cycle: tilling, planting, watering, and harvesting 15 seasonal crops.
  - Animal husbandry: barns & coops with chickens, cows, and sheep (feeding, petting, brushing, milking, shearing).
  - **Town & villagers**: 18 NPCs with daily schedules, dialogue, heart levels, gift preferences, festivals, and marriage.
    - **Mineral Town Museum**: donate fish, ore, forage, crops and relics, complete the collection book, and earn milestone rewards from the curator.
    - **Daily surprises**: wriggling soil (`§`) turns up across the valley each morning; dig it with the Hoe for an old purse of gold, ore, seeds, forage or a rare relic for the museum. Some nights bring a surprise: glowmoths that hurry your crops along, a falling star (`✦`) to crack open with the Hammer, or a parcel left on your doorstep by a friend.
  - **Rose Square request board**: villagers post timed requests for seasonal crops, forage and fish; deliver them for gold and friendship.
  - **Achievements & Journal**: 14 milestone goals tied to shipping, fishing, mining, museum donations, requests, friendship, festivals, family and more.
  - **Farm Mastery**: farming, foraging, fishing, mining and ranching earn XP and rank rewards from Novice to Legend.
  - Mountain & Mines: forage wild herbs, bamboo shoots, mushrooms, and delve through 10 mine floors for ores and precious gems.
  - House expansions: carpentry upgrades (kitchen, extension, bathroom, big bed, coop expansion) and cooking with utensils and recipes.
  - Seasonal festivals: New Year's Day, Goddess Festival, Chicken Sumo, Egg Hunt, Fireworks, Harvest Festival, and more.
- **A wider valley**: eight outdoor areas. Besides the farm, town, Mother's Hill and the beach there are Cedar Hollow (woods south of the farm, with a creek, a clearing and fallen branches every morning), Skyline Ridge (switchbacks up two cliff bands to a lookout and a tarn, north of the hill), Willow Bend (a river crossing and fishing dock east of town) and Lighthouse Point (a rocky headland with tide pools east of the beach). All have forage; the Teleport Stone reaches them.
- **Enhanced ASCII presentation**: one character per map tile, with textured ground, crafted buildings, shadows under buildings and trees, drifting cloud shadows, seasonal palettes (spring blossom, summer fruit, autumn leaves, winter snow), time-of-day lighting (dawn, dusk, a lantern around the player, lit windows, fireflies, a night vignette), animated rain with puddles, typhoons with lightning and swaying trees, snow and blizzards, chimney smoke, butterflies, falling autumn leaves, water with graded depth, drifting ripple streaks, lapping shoreline foam, surf rolling onto the beach and storm whitecaps, sun glints and star reflections on water, soft meadow mottling, map edges that fade into the surrounding margin instead of a black frame, animals and villagers on round tokens (`♞` horse, `♉` cows, `☁` sheep), dialogs with a raised panel and drop shadow, and a night-sky title screen. Tool use, harvests, fishing and deliveries emit dust, sparkles, splashes and coin effects. Rain leaves puddles that linger into the next fair day, shadows swing with the sun, and water edges carry reeds, lily pads and small wildlife. Doors swing open, glowing warm, when you stand at them, and late at night the town's windows go dark one by one. The grey world takes a time-of-day duotone (sepia at dawn and golden hour, moonlit blue at night, with lamplight keeping a warm pool), and light falloff, the night vignette and the fading map margins are dithered with a blue-noise tile instead of white noise. Tool swings flash a slash in the tool's tier colour; struck rocks and stumps blink, give a short hit-pause and burst into debris, rewards float up off the spot, and heavy blows shake the view (all off with reduced motion). Where two grounds meet, each edge cell picks the block, quadrant or diagonal glyph whose shape best matches where the neighbouring ground lies (after Alex Harri's shape-vector method), and trees are two-tone: a grey canopy with a small colour blossom or fruit.
  - Enhanced is the only style shown in the game. The original flat base16 **Classic** ASCII renderer remains in the codebase for reference and tests, but there is no in-game or URL switch.
- **Controls**:
  - Keyboard: Arrow keys / WASD to move, Space / Z to use tool, X / E / Enter to interact, Tab / Shift+Tab to switch tools (or 1-6 to pick one), I for rucksack, Y for today's plan, R for villager notes, N for the corner minimap, Esc for the diary & pause menu, F10 for the game menu, ? for help. The toolbar under the map has the everyday actions and MENU, which holds saving, tools, view settings and help and pauses the clock while it is open.
  - Touch (phones and tablets, portrait or landscape): a slide-friendly D-pad (tap for one step, hold to walk, slide your thumb to turn), a context-sensitive action button that becomes Use, Water, Talk, Enter, Harvest, Ship or Sleep (OK in menus, DONE while typing), plus USE, TOOL and DIARY/BACK. Tap the map to walk to a spot (or up to a crop, door or villager and face it). BAG, TODAY, MAP, NOTES and HORSE sit above the pad; MENU opens the game menu (save, export, pick a tool, Bell, Memo, Detail/Motion/haptics/full screen, Help). Name prompts open the phone keyboard. Portrait puts the controls under the map; short landscape screens put them either side.
  - Phones get a compact layout: the map takes the full width, tool and stamina move into the divider row, long text and messages wrap, and INFO (or `p`) overlays the full status panel. Tablets keep the side panel.
- **Auto-Save**: Farm progress, crops, animals, and relationships persist in your browser's local storage.
- **Today's Plan & Villager Notes**: press **Y** for a daily checklist (weather, shipping cutoff, thirsty crops, hungry animals, ready milk/wool/eggs, birthdays and festivals) and **R** for every villager's hearts, favourite gifts and usual whereabouts. The Diary menu also includes these notes plus JSON save export/import for moving a farm between browsers.
- **Comfort options**: ambient animation honors `prefers-reduced-motion`, and the Motion button in the desktop toolbar can freeze clouds, smoke, weather particles, fireflies and camera easing. The Detail button (or the Diary menu) switches the half-size ground textures between High and Plain. Menus ease in with a short top-down wipe when motion is enabled; the canvas repaints only the cells that changed. **Accessible Cues** in the Diary menu swaps ripe crops to `!` and wet soil to `≈`, so state is readable without relying on colour.

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

**Contour Farm UI (`expirimental-ui`):** world-anchored contour glyphs replace the outdoor
ground and roof stipple, with bright conifer detail and flowing water. The right-hand HUD
groups the date, equipped tool, stamina, fatigue, shipping and held items on a black surface.
It keeps tool-cost/fainting warnings, watering-can capacity and seasonal seed warnings.
The cyan action footer uses the existing keyboard controls, and touch controls retain their
context-sensitive action. HUD headings stay in the bundled monospace font; actors, obstacles
and crops keep their full-size glyphs. Enhanced remains the only visible style.

`npm run dev` also accepts `--host` / `--port` preview flags. `npm test` uses Node's test
runner with the `tsx` import hook, avoiding the CLI's extra IPC server.

Every colour the Enhanced renderer draws is snapped to ramps built only from the 16 base16
Isotope Dark colours (`toIsotope` in `src/game/enhanced.ts`). Each hue gets a value ramp with hue
shifting: shadows lean toward the palette's indigo, highlights toward its orange and white. Where
two grounds meet, there's no in-between hue in the palette, so the border is dithered with `░`
instead of blended. Map backgrounds sink toward Isotope's pure black, and glyph colours are
pulled toward the nearest pure Isotope hue while keeping their brightness, for the theme's
neon-on-black contrast.

Enhanced is drawn **black and white**: every map cell is converted to grey by brightness,
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
(tile name, world position, deco, entity, tool highlight). It also sets a per-frame context
(clock, season, weather, indoors). `src/game/enhanced.ts` turns that into the styled frame, so game
logic never depends on the visual style. Any ordinary write over a cell clears its tag, so dialogs
and menus drawn over the map always render as UI.

The bundled font is a subset of DejaVu Sans Mono (`public/fonts`, see `LICENSE-DejaVu.txt`), so the
block and symbol glyphs look the same on every device.

### ASCII art pack

`docs/ascii-art-pack.md` holds the terminal-safe title plate, crop/item icons, animal portraits,
tool marks, building badges and a 40×13 farm vignette, with Isotope colour codes and sizing notes.
