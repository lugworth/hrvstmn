# Handoff: HRVSTMN

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
- **State:** working. 125/125 tests pass, typecheck clean, production build passes.
- **Visual style:** **Enhanced** only. **Classic** is retained in `screen.ts` / `GameScreen.tsx` and tests, reachable only programmatically via `screen.setStyle('classic')`. **Large** no longer exists.
- **Next up:** offscreen static-world cache/layered HUD, greenhouse, optional animated doors/windows and CRT mode. See `docs/feature-research.md`.
- **Watch out for:** `next build` skips type-checking and linting (`next.config.ts`), so always run `npx tsc --noEmit`. Force-push is blocked.

## Quick start

Requires Node 22 (verified with v22.23.4, npm 10.9.9). No environment variables are needed.

| Step | Command | Status |
|------|---------|--------|
| Install | `npm ci` | Verified 2026-11-04 |
| Run locally | `npm run dev` then http://localhost:3000; `?autostart=1` skips the title | Verified |
| Test | `npm test` (`tsx --test src/game/*.test.ts`) | 125 passed, 10 suites, ~4 s |
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
- **Phones and tablets:** `chooseGrid()` (`src/game/viewport.ts`) picks the font/grid. Desktop keeps 16px shrunk to fit 80x24. Touch screens keep the full layout (side panel) when 80x24 fits at >= 12px (tablets), otherwise use the **compact layout** (50-79 columns, 12-14px on phones): no side panel, tool/stamina in the divider row (`draw_status`), wrapped messages/pages/menu info (`src/game/compact.ts`), shorter title/top bar, and `p`/INFO overlays the side panel. Touch UI: slide D-pad with hold-to-repeat (220 ms, then 100 ms; repeats pause if a dialog pops up), USE/TOOL/MENU-BACK, utility row, a ••• sheet (Memo, Bell, previous tool, Help, Detail, Motion, haptics `hrvstmn-haptics`, full screen), tap-to-walk on the map, and a real text field for name prompts (`game.typing`). Layout is CSS grid in `globals.css` (`.touch-ui`; portrait stacks, `orientation: landscape and max-height: 540px` splits the controls either side). `viewport-fit=cover` + `env(safe-area-inset-*)`, `100dvh`, no pinch/double-tap zoom, bounce or long-press menus. A ResizeObserver re-lays out on rotation/toolbar changes.
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
src/game/*.test.ts             node:test — 125 tests: renderer, engine, rules, mobile layout and integration coverage
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
- Lint is not configured; don't run `npm run lint` unless you intend to set it up.
- `npm run build` says "Skipping validation of types / Skipping linting" by design; `npx tsc --noEmit` is the real type gate.
- Test server is for local verification only; stop it when done. If you rebuild while `next start` is running, restart the server so the HTML and chunk files match.

## Where to look for more

- `README.md`: feature list, controls, colour rules and renderer overview.
- `docs/feature-research.md`: sourced backlog of gameplay/graphics ideas with implementation notes and a recommended order.
- `src/game/enhanced.test.ts`: precise spec of the visual behaviour.
- `git log`: commit bodies and merged PRs describe each player-visible change.
