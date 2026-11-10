# HRVSTMN — Figma assets

Everything here was exported from the game itself (the real engine and renderer), so it looks
like the game. Drag any `.svg` onto a Figma canvas: it arrives as named, editable layers.

## What is in the folder

| Folder | What it is |
| --- | --- |
| `maps/*.svg` | Each outdoor area as layers: `ground`, `trees`, `flowers`, `fixtures`, `buildings`, `objects`, `forage`, `characters`. |
| `maps/interiors/*.svg` | The same for every building interior. |
| `maps/world-layout.svg` | The whole valley: each area is one movable picture, with the cyan paths between them. |
| `maps/png/` and `maps/interiors/png/` | The exact game render of each map at 2x, for reference or as a locked background. |
| `maps/layers/` | The ground texture of each map as a transparent PNG (also embedded in the map SVGs). |
| `components/buildings.svg` | Every building as its own group. |
| `components/tiles.svg` | A sample of every terrain and fixture. |
| `components/objects-and-forage.svg`, `crops.svg`, `characters.svg` | Field objects, forage, crops at four ages, the player, pets, livestock and every villager. |
| `ui/ui-in-game.svg` | Status panel, message bar, a dialog and the Diary menu, as real editable text. |
| `ui/ui-desktop.svg` | The toolbar and the game menu, as boxes and real text. |
| `ui/ui-touch.svg` | The phone controls: utility row, D-pad, action buttons, the menu sheet and the name entry bar. |
| `palette/isotope-dark.svg` | The 16 colours as swatches. |
| `palette/hrvstmn.tokens.json` | The same colours as design tokens (Figma: Variables > Import). |
| `fonts/` | DejaVu Sans Mono (regular and bold). Install these first. |
| `data/maps.json` | The tile grid, doors and paths of every map, to carry layout changes back into the game. |
| `_generator/` | The scripts that made all of this, to rebuild the kit after the game changes. |

## Using it in Figma

1. **Install the two fonts** in `fonts/` (double-click each `.ttf`), then restart Figma. Text layers
   (building names, the UI) use "DejaVu Sans Mono". Map art is outlined shapes and needs no font.
2. **Drag an SVG onto the canvas.** Layer names come from the group names in the file.
3. **Set the grid.** One tile is **12 x 25 px** (glyph size 20 px). In Figma: Preferences > Nudge
   amount, small nudge 12 and big nudge 25. Arrow keys then move a piece one tile sideways, and
   Shift + arrow one tile up or down. A layout grid of 12 x 25 on the frame helps too.
4. **Move things.** Each building is one group (`building-HOME`), each tree is one group
   (`tree-12-3`, the numbers are its tile position), and each object or villager is one layer.
5. **Restyle.** Ground colours are plain rectangles grouped by terrain (`ground-grass`,
   `ground-water`). A building has `fill`, `roof-texture`, `wall-texture`, `details` and its name
   as text. Select a group and change the fill.
6. **Make components.** SVG import gives groups, not Figma components. Select a group and press
   Ctrl/Cmd + Alt + K to turn it into one.

## Things to know

- Tile pieces (trees, flowers, furniture, buildings) carry their own background square, so moving
  one leaves a gap. Objects, forage and characters are art only; the ground stays where it is.
- The fine ground texture is one image per map (`ground-texture-image`), not thousands of shapes.
  Change its opacity or hide it. If your Figma does not show it after import, drag in the PNG from
  `maps/layers/` and place it at 0,0 at the size of the map.
- The world layout uses 1x pictures of each area to stay light. Swap in the 2x PNGs if you zoom in.
- These files were checked by rendering them in a browser next to the game's own output, not by
  importing them into Figma, so a detail of Figma's importer may differ.
- Everything is the state of the game on Spring 1 at 10:00 AM, sunny.
- The PNG pictures and the world layout leave the villagers out so the ground is visible. In the
  map SVGs they are the `characters` group, which you can hide.

## Rebuilding the kit

From the repository root, with dependencies installed (`npm install`) and Python 3 with fontTools:

```
cd design/figma-assets/_generator
python3 make-glyphs.py                      # fonts -> ../fonts/*.ttf and glyphs.json
npx esbuild assets.ts --bundle --format=iife --outfile=www/bundle.js
(cd .. && python3 -m http.server 3600 &)    # serves the exporter page and the fonts
node run.js ..                              # maps, components, palette, data
npm run build && npx next start -p 3500 &   # the real app, for the HTML controls
node dom-ui.js ../ui                        # toolbar, menu and phone controls
node verify.js /tmp 1 ../maps/farm.svg      # optional: render an SVG to PNG to check it
```
