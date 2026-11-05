# HRVSTMN ASCII Art Pack

Terminal-safe art for the Mineral Town tribute. Every
block below is plain text: no emoji, no double-width
symbols, no font-dependent ligatures. Rows are aligned for
a 1:2 character cell and every colour reference is an
Isotope Dark code (00-0F).

The set is built as one family: the same 5-8 column grid,
the same bottom baseline, the same fill characters. Icons
read at 100% zoom in a fixed-width terminal and degrade
cleanly at 80%.

## Palette key

Codes are the PALETTE keys in `src/game/constants.ts`.
Treat each pair as fg on 00; the renderer's `toIsotope()`
pass owns any in-between mix, so nothing here introduces a
new hue.

| Code | Hex     | Use in art                   |
|------|---------|------------------------------|
| 00 | #000000 | void, panel bg, icon bed     |
| 01 | #404040 | shadow, furrow, potato eyes  |
| 02 | #606060 | stone, haft, bark            |
| 03 | #808080 | iron, fence rail             |
| 04 | #c0c0c0 | steel, silver tools          |
| 05 | #d0d0d0 | dim text, overcast, wool     |
| 06 | #e0e0e0 | body text, cloud, livestock  |
| 07 | #ffffff | highlight, egg, milk, snow   |
| 08 | #ff0000 | tomato, strawberry, roof     |
| 09 | #ff9900 | pumpkin, corn, wood, gold    |
| 0A | #ff0099 | flower, blush                |
| 0B | #33ff00 | leaf, crop, stamina          |
| 0C | #00ffff | water sheen, glass, fish     |
| 0D | #0066ff | deep water, night sky        |
| 0E | #cc00ff | turnip skin, ore, mystrile   |
| 0F | #3300ff | sky depth, banner frame      |

Rule of thumb: produce bodies sit in 08/09, foliage in 0B,
minerals in 04/0E, and every UI chrome element in 03-06.
Keep fg and bg at least three ramp steps apart.

## Title banner

Primary title plate: 54 columns, 12 rows, double-rule
frame in 0F, letterforms in 07, subtitle band in 09 on 00.
The frame is Unicode box drawing; the letterforms are
FIGlet Doom.

```text
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║   _   _ ______ _   _ _____ ________  ___ _   _   ║
  ║  | | | || ___ \ | | /  ___|_   _|  \/  || \ | |  ║
  ║  | |_| || |_/ / | | \ `--.  | | | .  . ||  \| |  ║
  ║  |  _  ||    /| | | |`--. \ | | | |\/| || . ` |  ║
  ║  | | | || |\ \\ \_/ /\__/ / | | | |  | || |\  |  ║
  ║  \_| |_/\_| \_|\___/\____/  \_/ \_|  |_/\_| \_/  ║
  ║                                                  ║
  ╠══════════════════════════════════════════════════╣
  ║             M I N E R A L   T O W N              ║
  ╚══════════════════════════════════════════════════╝
```

Compact wordmark for narrow screens and in-game headers.
One row, safe at 40 columns, no frame:

```text
H R V S T M N   ·   M I N E R A L   T O W N
```

If the bundled font is missing box-drawing glyphs, swap
the frame for `+`, `-` and `|`; the 54-column width still
holds.

## Crop and item icons

Twelve three-row icons on an 11-column cell. Art is 5-8
columns wide and shares one baseline, so a row of icons
lines up without per-icon offsets.

```text
  ┌───────────┬───────────┬───────────┬───────────┐
  │  TURNIP   │  POTATO   │  STRAWB.  │  TOMATO   │
  ├···········┼···········┼···········┼···········┤
  │    ,*,    │    ,--.   │    ,*,    │    ,^,    │
  │   (#@#)   │   (#o#)   │   (#o#)   │   (@@@)   │
  │     '     │    `--'   │    \#/    │    `-'    │
  └───────────┴───────────┴───────────┴───────────┘
```

```text
  ┌───────────┬───────────┬───────────┬───────────┐
  │   CORN    │  PUMPKIN  │    EGG    │   MILK    │
  ├···········┼···········┼···········┼···········┤
  │    ,^,    │     ,^,   │     ,-.   │    ,--.   │
  │   |#%|    │  (@@@@)   │    (  )   │    |==|   │
  │    `|'    │    `--'   │     `-'   │    |__|   │
  └───────────┴───────────┴───────────┴───────────┘
```

```text
  ┌───────────┬───────────┬───────────┬───────────┐
  │   WOOL    │   FISH    │    ORE    │  FLOWER   │
  ├···········┼···········┼···········┼···········┤
  │    ,^^,   │     __    │      *    │    \*/    │
  │   (%%%)   │  ><(((o>  │    /#\    │   (@@@)   │
  │    `--'   │     --    │   /#%#\   │     |     │
  └───────────┴───────────┴───────────┴───────────┘
```

## Animal glyphs

Six portrait glyphs, three to four rows, 12 columns max.
These are heads on purpose: at this size a full body
collapses into a blob, and a portrait stays legible in a
ledger row or a pen header. The map keeps its round tokens
(horse, cow, sheep) for actual livestock.

```text
  ┌─────────────┬─────────────┬─────────────┐
  │   CHICKEN   │     COW     │    SHEEP    │
  ├·············┼·············┼·············┤
  │      ,^,    │    ^   ^    │    ,%%%,    │
  │     (o>     │    (o o)    │   (%o o%)   │
  │       v     │    \_o_/    │    `%%%'    │
  └─────────────┴─────────────┴─────────────┘
```

```text
  ┌─────────────┬─────────────┬─────────────┐
  │    HORSE    │     DOG     │     CAT     │
  ├·············┼·············┼·············┤
  │      ,^,    │    ,___,    │    /\_/\    │
  │    /o o\    │   (_o o_)   │   ( o.o )   │
  │    |  _ |   │      `w'    │    > ^ <    │
  │    \___/    │             │             │
  └─────────────┴─────────────┴─────────────┘
```

Chicken and cat sit at three rows; horse runs to four so
the long face reads. Keep the eye pair on the same row
across the set; that shared line is what makes them a
family.

## Tool icons

Six 3-row tool marks, 8 columns max. Heads sit high and
handles drop to the baseline, matching the crop icons.

```text
  ┌───────────┬───────────┬───────────┐
  │    HOE    │    CAN    │  SICKLE   │
  ├···········┼···········┼···········┤
  │     ||    │    ,--.   │    ,--.   │
  │     ||    │   (____>  │   (    \  │
  │   __||    │     ~ ~   │    `--\_  │
  └───────────┴───────────┴───────────┘
```

```text
  ┌───────────┬───────────┬───────────┐
  │    AXE    │  HAMMER   │    ROD    │
  ├···········┼···········┼···········┤
  │    ___    │    ____   │       /   │
  │   |###|   │  |####|   │      /    │
  │      |    │     ||    │     |~    │
  └───────────┴───────────┴───────────┘
```

Axe and hammer share a silhouette by design (head plus
haft); the wedge and the block are what separate them. At
1x they are label-assisted icons, not stand-alone sprites.

## Building badges

Four badges, three to five rows, 20 columns max. Roof
pitch and door shape carry the identity: gable for the
farmhouse, cross-braced doors for the barn, a low rounded
coop, and a column front for the museum.

```text
  ┌───────────────────┬───────────────────┐
  │     FARMHOUSE     │       BARN        │
  ├···················┼···················┤
  │          /\       │         ___       │
  │         /  \      │        /   \      │
  │       /____\      │      /_____\      │
  │       | [] |      │      | / \ |      │
  │       |_||_|      │      |/   \|      │
  └───────────────────┴───────────────────┘
```

```text
  ┌───────────────────┬───────────────────┐
  │       COOP        │      MUSEUM       │
  ├···················┼···················┤
  │        ,--.       │         ____      │
  │       /    \      │       /    \      │
  │       | oo |      │      |  __  |     │
  │       `----'      │      | |  | |     │
  │                   │      |_|__|_|     │
  └───────────────────┴───────────────────┘
```

Badges are decorative panel art, not map tiles. Draw them
at integer cell coordinates and keep one clear cell around
the frame.

## Farm vignette

A 40 x 13 morning scene: farmhouse with a smoking chimney,
fruit tree, hills, fence and sprouting field. Pure ASCII
plus `_ - | / \ ~ , . * o` so it survives any fixed-width
font, including fallbacks without box drawing.

```text
   ,--.                             \|/
 (    )     ~    v   v              -O-
   `--'      ,     v       ,***,    /|\
      ______|            ,**o****,
     /      \|          ****o****
    /________\           ***o***
    | []  [] |            *****
    |   ||   |    .-~~-.   |||
    |___||___| .-~~'    '~-|||
______,________________________,________
 _|__|__|__|__|__|__|__|__|__|__|__|_
  |  |  |  |  |  |  |  |  |  |  |  |
 ,  '  ,  '  ,  '  ,  '  ,  '  ,  '  ,
```

Palette for the vignette: sky 0F, sun 09, cloud and smoke
05, roof 08, walls 09, windows 07, tree 0B with 02 trunk,
hill 0B dimmed, fence 03, field 0B. Recolour by season
without touching the geometry.

| Season | Tree | Field | Sky |
|--------|------|-------|-----|
| Spring | 0B   | 0B    | 0D  |
| Summer | 0B   | 0B    | 0C  |
| Fall   | 09   | 09    | 0F  |
| Winter | 07   | 07    | 05  |

## Implementation notes

### Size limits

| Group     | Rows | Max cols | Cell |
|-----------|------|----------|------|
| Crops     | 3    | 8        | 11   |
| Animals   | 4    | 12       | 13   |
| Tools     | 3    | 8        | 11   |
| Buildings | 5    | 20       | 19   |
| Vignette  | 13   | 40       | 40   |
| Banner    | 12   | 54       | 54   |

### Glyph and colour map

| Asset      | Glyph | FG | BG | Accent |
|------------|-------|----|----|--------|
| Turnip     | #     | 07 | 00 | 0B leaf |
| Potato     | #     | 09 | 00 | 01 eyes |
| Strawberry | #     | 08 | 00 | 0B crown |
| Tomato     | @     | 08 | 00 | 0B calyx |
| Corn       | %     | 09 | 00 | 0B husk |
| Pumpkin    | @     | 09 | 00 | 0B stem |
| Egg        | -     | 07 | 00 | 05 shade |
| Milk       | =     | 06 | 00 | 0C glass |
| Wool       | %     | 06 | 00 | 05 curl |
| Fish       | (     | 0C | 00 | 0D back |
| Ore        | #     | 04 | 00 | 0E vein |
| Flower     | @     | 0A | 00 | 0B stem |
| Chicken    | ^     | 07 | 00 | 08 comb |
| Cow        | o     | 06 | 00 | 08 muzzle |
| Sheep      | %     | 06 | 00 | 05 wool |
| Horse      | _     | 09 | 00 | 02 mane |
| Dog        | w     | 09 | 00 | 08 tongue |
| Cat        | ^     | 09 | 00 | 0A nose |
| Hoe        | |     | 03 | 00 | 09 blade |
| Watering Can | _     | 04 | 00 | 0C water |
| Sickle     | \     | 04 | 00 | 09 grip |
| Axe        | #     | 04 | 00 | 02 haft |
| Hammer     | #     | 05 | 00 | 02 haft |
| Fishing Rod | /     | 09 | 00 | 0C line |
| Farmhouse  | _     | 09 | 00 | 07 windows |
| Barn       | /     | 08 | 00 | 02 doors |
| Coop       | -     | 09 | 00 | 0B nests |
| Museum     | |     | 06 | 00 | 04 columns |

### Single cell vs decorative

Single-cell assets must stay one glyph and one fg/bg pair:
map tiles, the cursor, HUD counters, weather particles,
ready/wet/danger marks. Never place a multi-row block on
the map grid; it will desynchronise the tile pass and the
dirty-rect cache.

Decorative blocks are the banner, building badges, ledger
headers and the vignette. Render them as one text block at
integer cell coordinates, with one transparent cell of
margin where they overlap the map.

Baselines: the last row of every icon is its ground row.
Align bottoms, not tops; the horse and the chicken differ
by a row but still sit on the same line.

Padding: rows inside a block are not all the same length.
Pad each row to the block width before drawing, then
centre the whole block. Centring rows independently shifts
the small rows by half a cell.

Palette: every fg/bg must be a PALETTE code. No colours
after `snapFrame()`; the Isotope ramp test will reject
them.

Animation: if an icon animates, flicker only the accent
char. Repainting the whole block every frame defeats the
frame cache and reads as noise at 1x.

Fallbacks: replace the box-drawing frame with `+ - |`, and
replace `%` or `@` fills with `#` if a font renders them
with visible gaps. The silhouettes survive both swaps.

