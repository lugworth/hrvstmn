# Handoff: HRVSTMN

## Experimental UI integration, 2026-11-05

`expirimental-ui` includes `main` through `d39de25` via merge `678bce3`. The user asked
to repair that merge after its preview failed. Keep this branch separate from `main`;
the UI experiment has not been approved for a production merge.

- Repaired duplicate JSX roots, duplicate renderer declarations/imports, and missing
  viewport variables left by conflict resolution.
- Restored the Contour Farm right-side HUD, its proportional panel width, large labels,
  one latest-message row, readable desktop font sizing, and cyan action controls.
- Retained the newer compact phone layout, touch name entry, tap-to-walk, minimap,
  detail preference, regions, gameplay systems, duotone lighting, and water shading.
- Incremental repaints include contour coordinates and whole heading rectangles.
  A detail preference change forces a full repaint, even with motion disabled.
- Validation: 171 tests pass, TypeScript is clean, production build passes. Browser
  checks covered house-to-farm movement, tool changes, Today, minimap, detail and motion.
  Physical phone input remains covered by logic tests rather than a device session.

The main-branch reference below retains gameplay architecture and history.

> Snapshot of `main` @ `ea02386` (PR #36) plus this HANDOFF refresh, 2026-11-05.
> Read this file before changing anything. If it contradicts the code, trust the code and update this file.

## Kickoff prompt

```
You're picking up HRVSTMN, an ASCII farming sim (Next.js 15 + TypeScript, HTML canvas):
github.com/lugworth/hrvstmn, live at https://hrvstmn.vercel.app (Vercel deploys main).

Read HANDOFF.md fully before changing anything. Enhanced is the only visible visual style;
Classic remains as a code-only/test path. Large was removed in #18. All PRs through #36 are merged.

Rules most likely to be broken: every colour must come from base16 Isotope Dark (toIsotope());
the world is black-and-white, colour only on things of interest; text/HUD/people/crops/obstacles
stay full size; keep frames ~15-20 ms. Run `npm test`, `npx tsc --noEmit` and `npm run build`
before every PR. Workflow: branch -> PR -> green Vercel preview -> squash-merge; don't leave PRs open.
```

## TL;DR

- **What it is:** a browser farming sim drawn in ASCII on a canvas, built with Next.js 15 App Router, React 19 and pure TypeScript.
- **State:** working. 159/159 tests pass, typecheck clean, production build passes.
- **Visual style:** **Enhanced** only. **Classic** is retained in `screen.ts` / `GameScreen.tsx` and tests, reachable only programmatically via `screen.setStyle('classic')`. **Large** no longer exists.
- **Next up:** offscreen static-world cache/layered HUD, greenhouse, optional animated doors/windows and CRT mode. See `docs/feature-research.md`.
- **Watch out for:** `next build` skips type-checking and linting (`next.config.ts`), so always run `npx tsc --noEmit`. Force-push is blocked.

## Quick start

Requires Node 22 (verified with v22.23.4, npm 10.9.9). No environment variables are needed.

| Step | Command | Status |
|------|---------|--------|
| Install | `npm ci` | Verified 2026-11-04 |
| Run locally | `npm run dev` then http://localhost:3000; `?autostart=1` skips the title | Verified |
| Test | `npm test` (`tsx --test src/game/*.test.ts`) | 159 passed, 12 suites, ~4 s |
| Typecheck | `npx tsc --noEmit` | Clean; required because the build skips it |
| Build | `npm run build` | Passes; `/` is static, ~82 kB page / 185 kB first-load |
| Lint | not configured | `npm run lint` would start Next's interactive ESLint setup; don't run it casually |
| Deploy | automatic | Vercel Production from `main`; Preview for branches |

`.env.example` lists `GEMINI_API_KEY`, but no code reads it. It is left over from the Google AI Studio scaffold, like `metadata.json` and `.aistudio/`.

## Current feature set

- Crops, livestock, villagers, festivals, mines, house upgrades, cooking, marriage and children.
- **Mineral Town Museum**: donate fish, ore, forage and crops; a collection book tracks each wing, and milestones pay gold/items. The Curator lives in the museum and can be talked to like any villager.
- **Rose Square request board**: timed villager requests for seasonal crops, forage or fish. Deliver from the board for gold and +5 friendship; expired requests are cleared each morning.
- **Achievements & Journal**: 14 derived milestone goals (shipping, fishing, mining, museum, requests, friendship, festivals, upgrades, family, animals, gems) with progress shown from the Diary menu.
- **Farm Mastery**: five disciplines (farming, foraging, fishing, mining, ranching) earn XP from real actions; ranks run Novice → Adept → Expert → Master → Legend and pay one-time gold/item rewards.
- Two save slots in `localStorage` (`hrvstmn-save`, `hrvstmn-save-2`), plus **JSON save export/import** from the Diary menu.
- **Today's Plan (`Y`)**: date, weather, tomorrow's forecast, shipping-bin value and 5 PM cutoff, dry crops, hungry animals, ready milk/wool/eggs, birthdays, festivals, and a stamina-aware plan line.
- **Villager Notes (`R`)**: every NPC's hearts, favourite gifts, and usual whereabouts, paginated safely without splitting a villager across pages.
- **Tool previews:** the HUD shows the current tool's stamina cost (`-2st`, etc.) and a faint warning `!`; the map highlights the primary target and expanded area-of-effect cells.
- **Context-sensitive touch action:** one large button becomes `USE HOE`, `WATER` (watering can facing a dry growing crop), `TALK`, `ENTER`, `HARVEST`, `SHIP`, `SLEEP`, etc. It becomes `OK` while a modal/menu is open and `DONE` (enter) during text entry.
- **Phones and tablets:** `chooseGrid()` (`src/game/viewport.ts`) picks the font/grid. Desktop keeps 16px shrunk to fit 80x24. Touch screens keep the full layout (side panel) when 80x24 fits at >= 12px (tablets), otherwise use the **compact layout** (50-79 columns, 12-14px on phones): no side panel, tool/stamina in the divider row (`draw_status`), wrapped messages/pages/menu info (`src/game/compact.ts`), shorter title/top bar, and `p`/INFO overlays the side panel. Touch UI: slide D-pad with hold-to-repeat (220 ms, then 100 ms; repeats pause if a dialog pops up), USE/TOOL/DIARY-BACK, utility row ending in MENU (the game menu as a sheet over the map, minus the entries the utility row already has; haptics `hrvstmn-haptics`), tap-to-walk on the map, and a real text field for name prompts (`game.typing`; it stays mounted and hidden, and `game.onTyping` focuses it inside the tap that opened the prompt, because iOS only raises the keyboard for a focus() made during a tap, so keep every path to `text_input()` free of timers). In phone landscape the 24-row minimum makes height the limit: about 10px text in Safari with its toolbar, 12px when installed to the Home Screen. The bottom safe-area inset is kept on purpose, because the message log sits on the bottom rows. Layout is CSS grid in `globals.css` (`.touch-ui`; portrait stacks, `orientation: landscape and max-height: 540px` splits the controls either side). `viewport-fit=cover` + `env(safe-area-inset-*)`, `100dvh`, no pinch/double-tap zoom, bounce or long-press menus. A ResizeObserver re-lays out on rotation/toolbar changes.
- **Daily surprises:** each morning a few **dig spots** (`objs[map][k] = 'dig'`, `§` that wriggles) appear on open ground across `DIG_MAPS` (at most `DIG_CAP` per map, never on frozen farmland). The Hoe digs one up (`dig_up`): an old purse of gold, ore, in-season seeds, two local forage, or a **relic** (`DIG_RELICS`, the museum's new Relics wing). **Night surprises** (`night_surprise`, `NIGHT_SURPRISE_CHANCE` per normal sleep, never after passing out): glowmoths grow up to six crops a day, a **falling star** (`starrock`, `✦`) lands on open field and the Hammer cracks it for a Star Fragment relic plus a gem, or a friend (30+ affection) leaves a doorstep parcel. The touch action reads DIG/CRACK when facing one with the right tool.
- **Toolbar and game menu:** the desktop footer is a WAI-ARIA toolbar (one Tab stop, arrow keys/Home/End, Esc back to the game) with the reference's two groups (USE TOOL/ACT/TOOL, BAG/TODAY/NOTES/DIARY) and `[F10] MENU`. The menu (`components/GameMenu.tsx`, APG menu pattern: arrows, Left/Right between sections, type-ahead, Esc returns focus to its opener) holds Game (Diary, Save slot 1, Export, Save & quit), Farm (Minimap, Horse, Bell, Memo, Status panel when compact), Tools (equip 1-6 directly, the equipped one checked), View (Detail, Motion, Haptics on touch, Full screen) and Help. Its items send the existing engine keys or call `save()`/`export_save()`; Farm, Tools and Game are disabled while a dialog is open. `game.paused` stops the clock and villagers while it is open. Commands hand focus back to the canvas; the window key handler ignores keys from anything inside `[data-ui]`.
- **Visual polish:** eased camera follow, longer dawn/dusk shadows, directional terrain-edge glyphs, a quieter HUD, interaction pulse, short menu reveal wipes, and `prefers-reduced-motion` support with a desktop Motion toggle. A Detail button (also in the Diary menu) switches the half-size ground textures between High and Plain; the choice is saved in `hrvstmn-hires`. The Enhanced canvas repaints only changed cells (`frameDirtyRect`). **Accessible Cues** replaces ripe crops with `!` and wet soil with `≈` for colourblind-safe state reading.
  - **Action feedback:** tool use, harvests, fishing and deliveries add dust, sparkles, splashes and coin glyphs. Characters remain single full-size tokens for readability.
  - **Living world:** rain puddles persist into the following fair day, contact shadows swing with the sun, and water edges add reeds, lily pads, beach crabs, farm rabbits and town cats.
- Three styles are no longer a user-facing feature. Do not reintroduce a style switch without asking.

## Architecture map

```
app/page.tsx, app/layout.tsx   App Router shell; one page renders GameScreen
app/globals.css                Bundled "HRVSTMN Mono" font + Isotope colour CSS vars
components/GameScreen.tsx      Canvas sizing, keyboard/touch input, context-action label poll,
                               classic diff-painter, Enhanced path (renderEnhanced), reduced motion
src/game/screen.ts             Screen cell buffer, CellTags (hl/hlArea), RenderCtx, async key queue,
                               VisualStyle = 'enhanced' | 'classic', setStyle(), reducedMotion
src/game/engine.ts             class Game: run/handle/update, snapshot/save/load/export/import,
                               today_lines(), relationships(), action_preview(), context_action(),
                               camera easing, render() -> topbar/map/side/messages, menus, festivals,
                               barn/coop, mines, NPC schedules
src/game/constants.ts          PALETTE, SAVE_KEY, CROPS, BUILDINGS, NPCS, TOOLS, HELP, etc.
src/game/map.ts                build_* map functions using prebuilt_maps.json
src/game/rules.ts              Pure rule functions (stamina, tool areas, gifts, quality, mine drops)
src/game/runtime_helpers.ts    py_* helpers retained from the Python -> TypeScript port
src/game/enhanced.ts           Enhanced renderer: styleTile, computeFrame, drawFrame, monochrome
src/game/compact.ts            Compact (phone) layout constants + text wrap/reflow/message helpers
src/game/viewport.ts           chooseGrid (font/grid per stage), D-pad direction, tap-to-walk BFS
src/game/*.test.ts             node:test — 159 tests: renderer, engine, rules, mobile layout and integration coverage
public/fonts/                  DejaVu Sans Mono subset + licence
```

**Control flow.** `GameScreen` creates `Screen` and `Game`, then calls `game.run()`. Each loop waits for a key, runs `handle(k)`, calls `update()` (clock and NPC movement), then `render()` writes cells/tags/RenderCtx and `flush()` invokes `screen.onRender`.

- **Enhanced:** `computeFrame(screen, t)` -> `OutCell[][]`; `frameSignature()` skips unchanged frames; `drawFrame()` paints.
- **Classic:** diff-paints changed cells straight from `PALETTE`. Retained for reference/tests, not exposed.

Inside `computeFrame`: style each tagged cell -> Isotope neon-on-black pass -> ground-edge transitions -> HUD chrome -> contact shadows/dappled light -> cloud shadows -> chimney smoke/critters -> weather -> footprints/birds -> lighting -> reflections/shore foam -> `monochrome()` -> `decorateBoxes()` -> `snapFrame()`.

## Conventions and user preferences

1. **Colours come from base16 Isotope Dark only.** Inside the renderer you may mix intermediate hex values; `snapFrame()` maps every fg/bg onto ramps built from the 16 palette colours. Don't add colours after `snapFrame()`. The test `every output colour comes from the Isotope ramps` enforces this.
2. **The world is black-and-white (with a time-of-day duotone: sepia at dawn/golden hour, moonlit blue at night, via `toneFor()` and the tinted neutral ramps); colour is for things of interest:** people, animals, ripe crops, flowers/forage, doors, lit windows, fixtures, torches and ore. Set `accent: true` to preserve colour through `monochrome()`.
3. **Keep text, HUD, people, crops and obstacles full-size and readable.** New detail belongs in textures/small-object clusters, never in shrinking sprites or UI.
4. **Keep frames ~15-20 ms.** Batch canvas work, avoid per-glyph font/fillStyle churn, use seeded `hash()`/`valueNoise()` rather than `Math.random()` in the renderer, and let `frameSignature()` skip unchanged frames.
5. **Reuse existing passes.** Don't add a parallel system when a pass already does the job.
6. **The renderer is pure presentation.** `enhanced.ts` must never change game state.
7. **Every visual feature gets a `computeFrame` test**, including negative cases. Engine bugs get a regression test.
8. **Hotkeys:** arrows/WASD/hjkl move; `space/z` use tool; `x/e/enter` interact; `tab`/Shift+Tab cycle tools; `1-6` pick tools; `i` rucksack; `m` memo; `y` Today; `n` minimap; `r` Villager Notes; `H` horse whistle; `b` bell; `t` teleport stone if owned; `p` status panel overlay (compact layout only); `?` help; `esc` diary/pause; `Q` quit. `v` is intentionally unbound now that styles are fixed.
9. **Commit/PR style:** conventional lower-case titles (`feat: ...`, `fix: ...`), PR title = commit title, bullet body describing player-visible changes.
10. **Compact layout:** anything new drawn by the engine must also work at 50 columns (`isCompact(W)`); wrap rather than truncate there, and keep desktop (>= 80 columns) output unchanged.

## Decisions and constraints

- **Style simplification (#18):** Enhanced is the only style shown; Classic is retained in code and tests; Large and the style switcher were removed. Do not add a URL/localStorage style override back.
- **No exact Harvest Moon replica.** The project is a tribute with original mechanics; don't extend it toward a faithful copy. Raise content questions with the user rather than rewriting existing tribute content unasked.
- **Next.js pinned to `15.5.28`.** Vercel blocked 15.2.1 for CVE-2025-66478; don't downgrade without checking advisories.
- **High-res thresholds:** `HIRES_MIN_FONT = 12` for 2x2 texture glyphs; 3x3 needs font >= 14 and font x DPR >= 28, drawn one row per call.
- **`next.config.ts`** disables build-time type-checking and linting, keeps `reactStrictMode: false` for the canvas loop, and uses `output: "standalone"`.
- **No backend.** Saves are local to the browser; export/import is the portability escape hatch.

## Project subagents

`.claude/agents/` defines eight helpers that any Claude Code session in this repo can delegate to (they are picked up automatically; restart if the session started before the folder existed):

| Agent | Use it for |
|-------|-----------|
| `renderer-artist` | Graphics changes in `src/game/enhanced.ts`, under the palette, B&W and frame-budget rules |
| `gameplay-engineer` | Maps/regions, engine systems, rules, content (original, never a replica) |
| `test-guardian` | Running tests/typecheck/build, root-causing failures, adding regression tests |
| `visual-qa` | Playwright screenshots, before/after diffs, frame timing, mobile device checks |
| `mobile-ux` | Responsive layout and touch controls in `components/GameScreen.tsx` and `app/` |
| `pr-shepherd` | Commit, push to the designated branch, draft PR, Vercel status, conflicts, squash-merge |
| `web-researcher` | Sourced research on techniques before building |
| `handoff-keeper` | Refreshing this file and writing continuity briefs (context compression) |

## Workflow

The user wants changes merged, not left open. One feature per PR, squash-merge, sync `main` often.

```bash
git fetch origin --prune
git switch -c feat/short-name origin/main
# edit
npm test && npx tsc --noEmit && npm run build
git add ...
git commit -m "feat: ..."
git push -u origin feat/short-name
gh pr create --base main --head feat/short-name
gh pr checks <N> --watch      # wait for Vercel preview success
gh pr merge <N> --squash --delete-branch
git switch main && git pull --ff-only
```

- Force-push is blocked. If reusing `ccr-b79130da-9ckgjo`, start from latest `main` and use an `ours` merge of the old branch tip to make the push fast-forward.
- The Vercel preview URL needs a Vercel login; the public commit status is enough to know whether it's green.
- Production deploy follows `main`; check https://hrvstmn.vercel.app after merging.
- If another agent is working in the repo, merge/sync before starting and keep the working tree clean.

## History

Newest first.

- Task 12, the Willow Bend footbridge: the dock below the Willow Bend road is what's left of a washed-out footbridge; a sign on the west bank (`FOOTBRIDGE_SIGN`, 31,18, key `footbridge`, text from `footbridge_sign()`) says Gotz could rebuild it. Gotz's menu offers "Village project: Willow Bend footbridge" (`works_menu()`): he names Basil, who wants the far bank for his plant notes, and takes 12 Lumber, 2 Copper and 3 of any one farm crop you carry (`PUBLIC_WORKS` in constants; partial deliveries count, the first crop handed over is the one recorded; `works_offers()`/`works_deliver()`, pure `worksNeeds()`/`worksSummary()`/`absdayLabel()` in rules). The last delivery sets a finish day 2 days out; overnight `works_day()` (after `carpentry_day()` in `new_day`) opens it: the 16 water cells west of the dock planks on rows 18-21 (`footbridge_cells()` in map.ts) become `bridge`, Gotz and Basil gain +5 friendship, a morning line announces it and the sign reads "Rebuilt by Gotz, Basil and <name>, <date>". Today's Plan has a `Bridge` line (what's still needed, then "Gotz and Basil are building the footbridge (done <day>)"). The Valley Map gains the `≡` Willow Bend footbridge landmark only once built (`ValleyLandmark.when`, `valley_landmarks()`). State is one saved field, `public_works` (`worksState()` fills defaults for old saves); `apply_public_works()` re-lays or removes the planks in `new_game()` and `applySaveData()`, since maps are only built in the constructor.
- Farm HUD chrome: the HUD's grey rules became a post-and-rail fence (`═ ╪ ╧`, `src/game/chrome.ts` holds the post rule and season glyphs), the equipped tool sits on a painted sign board (`hud:sign`), GOLD/BIN/HELD rows are a ledger with dot leaders, the season line and compact top bar lead with a season glyph (`❀ ☘ ❦ ❆`, icon `season`), and the newest message gets a `❧` bullet (icon `note`). The engine still writes plain `-`/`|` and tags; `enhanced.ts` swaps glyphs and colours (`FARM_CHROME`, dark end of the orange ramp) and draws fence rails as pixel-aligned lines. The toolbar footer mirrors the colours through `--fence-rail`/`--fence-post`/`--sign-board` in `globals.css` (a test keeps them equal). Classic is unchanged. Tests: `src/game/chrome.test.ts`.
- Task 33, labeled Valley Map (`G`, or Farm > Valley map in the game menu): the nine outdoor regions drawn as boxes in their real arrangement (`VALLEY_GRID`), joined where they link, with 24 major landmarks as distinct symbols (`VALLEY_LANDMARKS`; each sits on a real door or sign, checked by a test, and every glyph is in the bundled DejaVu subset). Left/Right picks a landmark, Up/Down jumps region, Enter pins or unpins one destination (`map_pin`, saved). While pinned, `pin_route()` points to the next map exit on the shortest region walk (`nextRegion()`), or to the landmark itself on its own map, out of interiors and up the mine ladder. It shows as a pointer line at the top-left of the map view (short form at 50 columns, hidden while the minimap is open), as an arrow and title on the minimap, and in Today's Plan. The legend and Today's Plan always show whether Saibara's Forge is open, or when it next opens, skipping closed days and festivals (`shopStatus()`).
- Task 04, Gray's two-chapter request: the first time you talk to Gray he asks for 3 Copper from the Spring Mine (`gray_quest` 0 to 1; Today's Plan tracks it). Talking to him with the copper pays 300G and +5 friendship, counts as a finished request, and starts chapter two. Gray reads your watering can (`canUpgradeAdvice()` in rules, from `UPGRADE`, `CAN_CAP` and the tool's real tile area): which upgrade to save for next, and the big later jump (Mystrile). He leaves a note in Today's Plan (`gray_note()`, `gray_note_level`). An upgrade already at Saibara's forge counts (`can_level_soon()`). The chapter closes, with +5 more friendship, when the can reaches the noted level. Cans at Mystrile or beyond get a level-specific closing line instead. Works while married to Gray.
- Task 01, Friday evenings at Doug's Inn: from 6 to 10 PM on Fridays the inn menu offers one scene (`INN_SCENES` in constants: cards with Doug, Gotz and Duke; a recipe swap with Ann, Manna and Lillia; Barley's harvest story with Saibara). Listen (+1 friendship with each person there) or join in (+3, plus a payoff: the card pot of 100G about two Fridays in three via `innCardsWin()`, or a plate of Cookies). Once per Friday (`inn_evening_day`). `innSceneFor()` picks the first scene you have not seen, starting from the week's place in the rotation, so a missed scene comes round again (`inn_scenes_seen`). Today's Plan names the evening on Fridays.
- #57: the valley rearranged from the user's Figma sketch. New region **Ironwood Grove** (`grove`, west of the farm through a new west gate, `build_grove`) holds the Blacksmith. The Poultry Farm, Yodel Ranch and Winery moved to Cedar Hollow (Ranch Lane), the Sprite hut to Willow Bend, Zack & Won to Lighthouse Point; the Library and Museum share the town's south-east block. Freed town plots became the Town Green (pond), a flower garden and an orchard, and an East Road runs from Rose Square to Willow Bend. Buildings drawn into the prebuilt town are lifted and re-placed with `townBuilding()`/`placeBuilding()` in `map.ts`, so they keep their look; interiors find their exits from door positions, so nothing else needed re-pointing. Villager anchors (Gray, Popuri, May, Duke, Mary) moved with their homes. `prune_forage()` drops saved forage that now lies under a building. The Figma kit was regenerated.
- #56: `design/figma-assets/`: a Figma kit exported from the game (layered map SVGs, component sheets, UI as editable text, palette tokens, fonts, map data) with its generator in `_generator/`. Reference material only; the game does not load it, and `design` is excluded from `tsconfig.json`. Rebuild steps are in its README.
- #55: daily surprises: wriggling dig spots across the valley (Hoe them for coins, ore, seeds, forage or relics), a museum Relics wing, and night surprises (glowmoths, falling stars to crack open, doorstep parcels).
- #54: toolbar and game menu: the desktop footer follows the Contour reference (two groups plus `[F10] MENU`) as an accessible toolbar; a new game menu (Game/Farm/Tools/View/Help, direct tool choice, Save, Export) pauses the clock while open and replaces the phone ••• sheet (touch MENU; the Esc pad button now reads DIARY).
- #50: mobile name entry: the phone keyboard opens with the name prompt, no extra tap on the field.
- #49: renderer QA fixes: lamp pools only ever brighten (never darker than the dusk sky around them), seven distinct tool-tier swing colours that survive the hit flash, sickle cuts blink each weed then scatter leaves, stronger screen shake (2px light, 4px heavy), brighter terrain edges, title-screen prompt punctuation stays plain, lone tide pools get no foam box; lighting accumulated per light over its bounding box plus cached tone/grey lookups cut town-at-night frame build ~20%.
- #48: region looks: Skyline Ridge rock faces (lit brow, strata, dithered base, thin snow caps in winter), Willow Bend downstream current, Cedar Hollow under-canopy gloom with sun shafts, Lighthouse Point sweeping beam at night/storms and glinting tide pools; lamp flicker respects reduced motion.
- #47: region layout fixes from visual QA: `sealUnreachable()` closes off unreachable pockets in the four outer regions (no forage/branches out of reach), the town's east exit joins the road, signs moved off trails, the sea runs off the map edge at the beach and Lighthouse Point.
- #46: outer-region content: per-region seasonal forage pools (14 new forage items), river and sea catch tables with rare catches (Elder Sturgeon, Storm Marlin), landmarks (ridge lookout, lighthouse keeper's log, Mossy Pond offering, stone skipping); tide pools and the woods pond no longer count as Goddess Pond.
- #45: mobile support: compact phone layout (`src/game/compact.ts`, `draw_status`, wrapped text, `p` panel overlay), `chooseGrid()` font/grid sizing (`src/game/viewport.ts`), slide D-pad with hold-to-repeat, tap-to-walk, touch text entry, safe-area viewport.
- #43: eight project subagents in `.claude/agents/` (renderer-artist, gameplay-engineer, test-guardian, visual-qa, mobile-ux, pr-shepherd, web-researcher, handoff-keeper).
- #42: shape-matched terrain edges (`edgeGlyph()`: 6 staggered sampling circles, geometric glyph vectors, contrast curve, nearest match) and two-tone cells (`OutCell.detail`, drawn small top-right; used for blossom/fruit on trees).
- #41: four new original outdoor regions (`woods` Cedar Hollow, `ridge` Skyline Ridge, `river` Willow Bend, `point` Lighthouse Point) built in `map.ts` and joined by `link_regions()`; `OUTDOOR_MAPS`/`FORAGE_TARGET` in engine; daily branches in the woods; sea surf/no lilies via `SEA_MAPS`.
- #40: game feel: tier-coloured swing slashes, hit flash + hit-pause, debris bursts, floating reward text, CSS-transform screen shake (`fx_hit`/`fx_break`, `shakeOffset`).
- #39: blue-noise dithering (`blueNoise()`, 32x32 void-and-cluster tile) for light falloff, vignette and margins; time-of-day duotone in `monochrome()`; foam/kerb lines at least 2 device px.
- #38: doors swing open with warm light when the player stands at them; windows go dark one by one after 10 PM; surf rolls onto the beach; storm whitecaps and wind-driven ripples; one lily-pad/reed system (none on the sea or in winter).
- #36 `ea02386`: colourblind-safe Accessible Cues (`!` ripe crops, `≈` wet soil) in the Diary menu.
- #35 `66d44c4`: dirty-rect cell repaint for the Enhanced canvas; full repaint on resize/font/style changes.
- #34 `e15661c`: short top-down menu/dialog reveal, disabled with reduced motion.
- #33 `cba7a68`: `N` minimap toggle with centred, edge-preserving sampling and door markers.
- #32 `3aec1cc`: reverted composed stick-figure sprites; characters are single full-size tokens again. Action feedback remains.
- #31 `fc77a46`: persistent rain wetness/puddles, directional sun shadows, reeds/lily pads, wildlife, snow caps, cliff tops.
- #30 `3ac19bd`: action feedback queue (dust, sparkle, splash, coin); composed sprite portion was reverted in #32.
- #28 `fba5983`: Farm Mastery; five disciplines, XP from real actions, one-time rank rewards, Diary page.
- #26 `98ee873`: Achievements & Journal; 14 derived milestones with progress, Diary menu page, persisted request completion count.
- #24 `ae42356`: Rose Square request board; timed villager requests, delivery rewards, overnight expiry, Today's Plan integration.
- #23 `501b38e`: Mineral Town Museum; donate fish/ore/forage/crops, collection book, milestone rewards, Curator NPC.
- #22: graded water depth, drifting ripples, lapping foam, summer lily pads, soft ground mottling, map edges fading into the margin, sign apostrophes kept, background runs batched, dead Large-tile code removed.
- #21 `ca1b177`: sourced gameplay/graphics roadmap in `docs/feature-research.md`.
- #20 `6d032da`: high-res ground detail toggle in the desktop toolbar and Diary menu (`hrvstmn-hires`).
- #19 `cbfdf1f`: touch action shows `OK` inside menus/dialogs; clearer Today readiness wording.
- #18 `181eb96`: Today's Plan, Villager Notes, JSON save export/import, tool cost/footprint previews, context touch action, eased camera, longer shadows, directional terrain edges, quieter HUD, reduced motion.
- #16 `dad620f`: dappled sunlight under trees, path kerbs, morning dew.
- #15 `225a9a3`: small objects as tile-wide clusters, meadow stipple, batched small glyphs.
- #14 `3462ee1`: 3x3 high-res textures on sharp screens.
- #13 `545e491`: shading inside high-res texture cells, shoreline foam.
- #12 `cdea680`: high-res map textures (2x2 half-size glyphs per cell).
- #11 `6f7ab18`: footprints in snow/sand, icicles, bird flocks, autumn leaf litter.
- #10 `c746f0d`: water reflections, forest-edge trunks, top-lit canopies, dithered light falloff.
- #9 `6d37cec`: black-and-white world with colour accents on things of interest.
- #8 `118ecf9`: horse whistle and save/load regressions.
- #1-#7: Next.js port, Enhanced renderer, Isotope palettes, title/weather detail, consistent lighting.

## Open work / known gotchas

- Wider map view on large monitors (user idea, not started; decide whether that means more tiles or a larger font). Small maps now fade into the margin (`worldMargin()`), which fills the empty space but does not show more of the map.
- Agent worktrees under `.claude/worktrees/` with a `node_modules` symlink can crash `next build` (webpack `WasmHash` TypeError). Remove finished worktrees (`git worktree remove`) and `.next/cache` before building.
- Lint is not configured; don't run `npm run lint` unless you intend to set it up.
- `npm run build` says "Skipping validation of types / Skipping linting" by design; `npx tsc --noEmit` is the real type gate.
- Test server is for local verification only; stop it when done. If you rebuild while `next start` is running, restart the server so the HTML and chunk files match.

## Where to look for more

- `README.md`: feature list, controls, colour rules and renderer overview.
- `docs/feature-research.md`: sourced backlog of gameplay/graphics ideas with implementation notes and a recommended order.
- [docs/mechanics-tasks.md](docs/mechanics-tasks.md) lists 56 farming and slice-of-life tasks and the PR workflow for agents.
- `docs/ascii-art-pack.md`: title plate, crop/animal/tool/building ASCII art and a farm vignette with Isotope colour maps.
- `src/game/enhanced.test.ts`: precise spec of the visual behaviour.
- `git log`: commit bodies and merged PRs describe each player-visible change.
