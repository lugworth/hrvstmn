# HRVSTMN — Feature & Graphics Research Roadmap

> Research snapshot, 2026-11-04. This is a menu of implementable ideas, not a commitment.
> Each item includes why it fits HRVSTMN, the systems it can reuse, and a rough effort/impact read.

## Research inputs

Comparable farm/life sims have moved toward three things: **self-directed goals that don't require a guide**, **automation that removes repeated chores**, and **more expressive characters and places**.
Stardew Valley 1.6 added a mastery system, evolving festivals, multiple pets, an animals tab, new quest lines and eight achievements.[1]
Fields of Mistria emphasizes town restoration, 30+ villagers, animal breeding for rare colour variants, magic, and seasonal quests/festivals/outfits.[2]
Coral Island layers diving and ocean restoration over the farm loop, with ocean points feeding town rank and museum donations paying milestone rewards.[3][4][5]
The design pattern is consistent: give the player a visible next goal, then let completed goals make the farm feel different.[1][2][5]

## What the sources point to

- Stardew's 1.6 change list is a menu of retention systems: mastery, evolving festivals, more pets, an animals tab, quests and achievements all extend the same save.[1]
- Fields of Mistria's feature list shows the value of town restoration as a spine: 30+ villagers, quests, festivals, breeding and magic all feed the same fantasy.[2]
- Coral Island gives one activity a second payoff: diving produces ocean points that raise town rank, while museum donations unlock milestone rewards.[3][4][5]
- The farming-sim design codex argues that readable countdowns and reinvestment are structural, not polish: the player must see the plan and the calendar must not promise a crop that cannot finish.[6]
- Terminal-rendering research treats the cell buffer as a canvas: sub-cell glyph tiers and post-process effects add detail without abandoning the ASCII contract.[7]
- MDN's canvas guidance recommends pre-rendering static or repeated content offscreen and splitting static UI from dynamic gameplay when scenes get complex.[8]
- Wild Willows documents the accessibility floor for a cozy browser game: contrast, colourblind modes, font/text sizing, reduced motion, simpler wording and full key rebinding.[9]
- The cozy accessibility survey separates platform-level remapping from game-level motion, timing and difficulty, which means HRVSTMN must own those settings.[10]
- Stardew's animal tab and pet gifts point to a low-friction pattern: surface the collection in one place, then let affection produce small daily rewards.[1]
- Stardew's 1.6 mastery layer sits on top of actions the player already repeats, which maps naturally to HRVSTMN's existing `tool_exp`.[1]
- Coral's town rank is fed by multiple activities, not only farming, which supports a museum or request board that pays into a shared farm rank.[3][4]
- Wild Willows' code-generated art shows that a tiny browser game can keep a distinctive look without external art assets.[9]

The strongest design principle for HRVSTMN is the "plans that can come true" loop: the calendar must be readable, the player should see the critical countdowns, and reinvesting should beat hoarding.[6] HRVSTMN already has the calendar, stamina, shipping, relationships and a Today panel; the missing layer is **goal structure** and **visible progression**.

On the rendering side, ASCII has more headroom than one glyph per cell.[7]
Modern terminal work uses sub-cell glyph tiers (quadrant/half-block/sextant/octant), post-process effects over a finished cell buffer, eased animation, seeded randomness, and explicit reduced-motion fallbacks.[7]
For canvas performance, MDN recommends pre-rendering repeated work to an offscreen canvas and splitting static/dynamic content across layered canvases.[8]
Wild Willows shows the accessibility bar for a cozy browser game: dark/high-contrast modes, three colourblind modes, five interface fonts, four text sizes, reduce motion, simpler wording, and fully rebindable keys.[9]
Motion, timing and difficulty are game-layer responsibilities, not something the browser or OS will solve for us.[10]

## Recommended next five

These are ordered by player-visible value per unit of risk:

1. **Museum / Collection Hall** — a permanent "what have I found?" goal that ties fishing, mining, foraging, crops and cooking together.
2. **Villager Request Board** — a small, repeatable daily/weekly goal that gives the town a reason to be visited and makes gifts feel purposeful.
3. **Mastery perks** — long-horizon progression that rewards the actions players already repeat, without adding a new resource screen.
4. **Layered/offscreen renderer** — performance headroom before adding sprites, effects and a minimap.
5. **Composed character sprites** — the largest visual identity upgrade available without abandoning ASCII.

## Gameplay features

| # | Feature | Why it fits | Implementation sketch | Impact | Effort |
|---|---------|-------------|-----------------------|--------|--------|
| G1 | **Museum / Collection Hall** | Coral Island uses museum donations as milestone rewards;[5] HRVSTMN already has fish, ore, forage, crops and recipes with categories in `ITEMS`. | Add a `museum` record to `SAVE_FIELDS`; a curator NPC/interior; donation sets for fish/ore/forage/crops/cooked dishes; rewards at 5/10/20/40 donations. Reuse `show_pages()` for the collection book. | High | Medium |
| G2 | **Villager Request Board** | Stardew 1.6 added more quest lines and a prize machine fed by quests/special orders;[1] Fields leans on town quests.[2] A board turns the existing NPC roster into a daily reason to leave the farm. | Add `requests[]` with `{npc, item, qty, deadline, reward}`; generate 1–3 from `CROPS`/`FORAGE`/`ITEMS`; expire in `new_day`; show active requests in Today's Plan; board tile in town. | High | Medium |
| G3 | **Mastery perks** | Stardew's 1.6 mastery system grants powerful perks; Coral Island's mastery raises energy and unlocks skills.[1][3] HRVSTMN already tracks tool XP and a ranch rank. | Add per-discipline XP (farming, foraging, fishing, mining, ranching); at thresholds let the player choose one perk per tier (e.g. +1 water capacity, +10% crop value, faster fish bite, rarer mine drops). Keep modifiers in `rules.ts`. | High | Medium‑High |
| G4 | **Greenhouse / season extension** | The calendar is the genre's central constraint;[6] a greenhouse is the classic earned escape hatch. | Add a `greenhouse` flag/interior and a tile predicate for "any season"; unlock via carpentry; keep watering/stamina rules. | High | Medium |
| G5 | **Sprinklers, scarecrows, auto-feed** | Automation removes repeated chores, the main late-game fatigue in farming sims. | Placeable `objs` with a daily tick; sprinkler waters N adjacent tiles; scarecrow reduces crop loss; auto-feeder fills coop/barn. Save in `objs`/new `placeables`. | High | Medium |
| G6 | **Mine elevator / floor checkpoints** | The SoS remake added quality-of-life travel; HRVSTMN already stores `max_spring_floor`/`max_lake_floor`. | Elevator menu at the mine entrance; unlock every 25 floors; travel only to discovered checkpoints; charge a small fee or stamina. | Medium‑High | Low‑Medium |
| G7 | **Recipe discovery + food buffs** | Cooking already exists; Stardew's books/food and Coral's cooking create repeatable progression.[1][3] | Mark unknown recipes; experimenting with ingredient combinations discovers them; cooked dishes grant timed buffs (stamina cap, movement, luck, mining). | High | Medium |
| G8 | **Animal breeding / rare variants** | Fields of Mistria explicitly features breeding for rare colour variants.[2] HRVSTMN has pregnancy and affection but no genetics. | Add `coat`, `genes`, `breedQuality`; offspring inherit/combine; rare coats increase value or festival score; new animal card in the barn UI. | Medium‑High | Medium‑High |
| G9 | **Achievements / collection log** | Stardew 1.6 added eight achievements;[1] achievements give completionists a map of the content. | Derive most achievements from existing state (shipped totals, fish types, hearts, mine depth, recipes, festivals); persist only claimed IDs; add a Journal page. | Medium | Low‑Medium |
| G10 | **Festival variants** | Stardew 1.6 changes festival maps/dialogue every second year.[1] HRVSTMN has many festivals but they repeat identically. | Add `festivalYear` variants: layout, judge criteria, one new mini-game rule, seasonal outfit colours. Reuse `fest_ev_*` dispatch. | Medium | Medium |
| G11 | **Reactive NPC dialogue & outfits** | Stardew 1.6 added custom gift reactions, dynamic dialogue, winter outfits and multiple pets.[1] | Add dialogue predicates (weather, season, recent gift, marriage, festival win) and a winter sprite palette; keep the existing `lines` tiers as fallback. | Medium | Low‑Medium |
| G12 | **Farm customization / placement mode** | Fields of Mistria sells farm personalization as a core fantasy.[2] | Placement mode for paths, fences, benches, flower pots; separate `deco` layer; reject placement on crops/objects; save as `placeables`. | High | Medium‑High |
| G13 | **Daily luck / fortune** | A small variable that changes plans without adding a new system. | One `luck` value per day; modify mine drops, fish bite, gift points slightly; show in Today's Plan and on the TV. | Medium | Low |
| G14 | **Weather risk & crop protection** | HRVSTMN has weather but few decisions around it. | Typhoon can damage exposed crops; scarecrows/row cover reduce loss; snow insulates tilled soil; forecast makes preparation meaningful. | Medium | Low‑Medium |
| G15 | **Multiple pets / pet gifts** | Stardew 1.6 expanded pets and pet gifts.[1] | Unlock a second pet at max affection; pet gifts a small forage item each morning; new pet bowl object. | Medium | Low‑Medium |
| G16 | **Shipping contracts / price variation** | The economy currently has fixed prices; contracts create weekly goals. | Zack offers 1–3 contracts (e.g. 20 Turnips by Friday) with bonus gold and friendship; show in Today panel; expire at week end. | Medium | Medium |
| G17 | **Key rebinding & UI scale** | Wild Willows ships fully rebindable keys and four text sizes;[9] the cozy accessibility guide notes remapping is often left to the platform.[10] | Add a settings panel; remap movement/action/tool keys; scale canvas font independently of window size; persist in localStorage. | High | Medium |
| G18 | **Assist modes** | Cozy games increasingly separate challenge from access; motion/timing/difficulty are game-layer settings.[10] | Optional slower day clock, no-faint mode, easier fishing window, "confirm destructive actions" toggle; keep defaults unchanged. | Medium‑High | Low‑Medium |

## Graphical improvements

| # | Improvement | Why it fits | Implementation sketch | Impact | Effort |
|---|-------------|-------------|-----------------------|--------|--------|
| V1 | **Composed multi-cell character sprites** | The player is `☻` and villagers are letters; a 2×3 or 3×3 ASCII sprite with four facing directions would give the game a cast, not just tokens. Full-size cells preserve the readability rule. | Extend `CellTag` with `sprite`/`frame`/`facing`; draw 2×3 glyph blocks in `drawFrame` around the anchor; keep the anchor cell for collision; add 2-frame walk cycles. | Very high | High |
| V2 | **Action feedback layer** | Stardew-like game feel comes from immediate feedback; terminal effects research recommends post-process effects and short eased bursts.[7] | Add a transient `effects[]` queue (tool arc, hit flash, dust, sparkle, floating "+1"); render after lighting, before monochrome snap; cap particle count. | High | Medium |
| V3 | **Offscreen static-world cache** | MDN recommends pre-rendering repeated primitives and splitting static/dynamic layers.[8] Current renderer recomputes/paints the whole frame. | Cache static terrain/UI chrome to an offscreen canvas keyed by map + season + style + font; repaint only entities/weather/effects on top. | High | Medium‑High |
| V4 | **Layered canvases** | Static background, dynamic world, and UI can be separate canvases.[8] In this game the HUD changes less often than the map. | Add a background canvas for the map and a UI canvas for the HUD; composite with CSS or `drawImage`; keep the existing compositor as fallback. | High | Medium |
| V5 | **Directional / time-of-day shadows** | The current light is always top-left. A sun angle that moves from dawn to dusk makes the farm read as a place with time. | Derive shadow direction and length from `ctx.minutes`; extend contact shadows up to 3 cells at dawn/dusk; keep dappled light for tree canopies. | High | Low‑Medium |
| V6 | **Animated water flow and shoreline** | Water is a large visual surface; Coral/Stardew use it as a mood anchor.[3] HRVSTMN already has reflections, glints and foam. | Add flow-direction glyphs, wave fronts, splash particles at shore, and slower/faster ripple rates by weather; seed by world position. | Medium‑High | Medium |
| V7 | **Snow/rain accumulation** | Weather currently changes particles and tint; accumulation makes it persistent and visible. | Track `snowDepth` per map cell (or a coarse mask); draw roof caps, path slush, puddle persistence, footstep depth. | High | Medium |
| V8 | **Minimap / world map** | Stardew 1.6's world map shows real-time player position.[1] HRVSTMN has multiple maps and no overview. | Build a downsampled ASCII minimap from map tiles; show player/NPC dots in a corner or Journal page; reveal only visited areas. | Medium‑High | Medium |
| V9 | **Seasonal palette interpolation** | Current seasons snap between palettes. Gradual transitions make the year feel continuous. | Interpolate theme colours over the last/first 2 days of a season; keep Isotope snapping after interpolation. | Medium | Low |
| V10 | **UI chrome refresh** | The HUD still mixes ASCII `+ - |` boxes with Unicode glyphs. A consistent box-drawing set would feel more deliberate. | Replace box glyphs with rounded/mixed box-drawing characters in `Screen.box`/`computeFrame`; define one panel style; test at 80×24. | Medium | Low |
| V11 | **Animated menu transitions** | Menus currently pop in. Short, eased panel reveals add polish without touching gameplay. | Animate box scale/alpha over 80–120 ms in `computeFrame`; skip under reduced motion. | Medium | Low‑Medium |
| V12 | **Particle ambience** | Existing fireflies/leaves/smoke are a start; a small shared particle system would unify them.[7] | One particle pool with emitters per map/weather/season; seeded deterministic motion; cap to ~40 visible. | Medium‑High | Medium |
| V13 | **Animated doors/windows/interiors** | Buildings are static tiles. Opening doors, warm window flicker and interior reveals make the town feel inhabited. | Add small per-tile animation states; use `ctx.minutes`/weather; draw in the existing `styleTile`/decorate pass. | Medium | Low‑Medium |
| V14 | **CRT/scanline optional mode** | The terminal aesthetic invites it, but it must be optional. | A post-process pass with dim rows, subtle ghosting and jitter; off by default; respects reduced motion and high-contrast mode. | Low‑Medium | Low |
| V15 | **Colourblind-safe accent language** | Wild Willows ships three colourblind modes;[9] HRVSTMN currently encodes many states by colour alone. | Pair colour with shape/glyph: ripe = `!`, wet = `≈`, ready = `*`, danger = `×`; add a high-contrast palette option. | High | Low‑Medium |
| V16 | **Procedural audio + visual beat** | Game feel is audio + motion; no sound currently means actions feel flat. | Web Audio oscillator/chiptune cues for tool, harvest, menu, festival; separate music/SFX volume; mute on reduced-motion? no, motion and audio are separate. | High | Medium |

## What not to build next

- **Multiplayer / accounts / cloud backend.** High complexity, no current backend, and outside the single-player farm fantasy.[6]
- **An exact Harvest Moon replica.** Already declined; keep original mechanics and tribute-style content as-is.
- **A 3D or pixel-art renderer.** The ASCII/terminal identity is the differentiator; invest in sprites/effects instead.
- **Unbounded content volume** (hundreds of crops/items). Prefer systems that make existing content replayable: requests, museum, mastery, festivals.

## Suggested implementation order

| Release | Scope | Why this order |
|---------|-------|----------------|
| 1 | Museum + collection log | Pure addition; uses existing item data; creates a long-term goal. |
| 2 | Request board + Today integration | Turns the town into a daily loop; reuses `NPCS`, `ITEMS`, `new_day`, `today_lines`. |
| 3 | Offscreen/layered renderer | Performance floor for sprites, particles and minimap. |
| 4 | Composed character sprites + action feedback | Biggest visible identity jump; now has performance headroom. |
| 5 | Mastery perks + greenhouse | Long-horizon progression and a new farm goal. |
| 6 | Accessibility settings | Key rebinding, UI scale, contrast/colourblind modes, assist toggles. |

## Acceptance checks for the first three

- **Museum:** donating a new fish/ore/crop marks it collected exactly once; milestone rewards fire once; the collection book pages correctly at 80×24; save/load preserves donations.
- **Requests:** a request appears on the board and in Today; delivering the exact item completes it; expiry is reported on the next day; rewards cannot be claimed twice.
- **Renderer:** a static farm frame at 160×50 stays under the existing 15–20 ms budget; toggling season/map invalidates the cache; resize and font changes rebuild it; no visual diff versus the current renderer.

## Sources

[1] https://www.stardewvalley.net/stardew-valley-1-6-update-full-changeLog
[2] https://fieldsofmistria.wiki.gg/wiki/Fields_of_Mistria
[3] https://coralisland.wiki/wiki/Coral_Island
[4] https://coralisland.wiki/wiki/Diving
[5] https://coralisland.wiki/wiki/Museum
[6] https://hayao.dev/docs/codex/genre-farming-sim
[7] https://raw.githubusercontent.com/cyperx84/ascii-animations/main/docs/research.md
[8] https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
[9] https://www.phaser.io/news/2026/08/wild-willows-phaser-cozy-restoration-sim
[10] https://pokopia.center/posts/cozy-games-accessibility-controller-options-guide-2026
