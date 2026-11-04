# Handoff: HRVSTMN

> Snapshot of `main` @ `dad620f` (PR #16, live in production) plus this file, on branch
> `ccr-b79130da-9ckgjo`, 2026-11-04, written by Claude (Claude Code).
> Read this whole file before changing anything. If something here contradicts the code, trust the
> code and update this file.

## Kickoff prompt

```
You're picking up HRVSTMN, an ASCII farming sim (Next.js 15 + TypeScript, drawn on an HTML canvas):
github.com/lugworth/hrvstmn, live at https://hrvstmn.vercel.app (Vercel deploys main).
Read HANDOFF.md fully before changing anything. All 16 PRs are merged and deployed; nothing is in flight.
First: ask the user what's next
(they keep asking for "more detail in the graphics"; open ideas: a toggle for the high-res detail, a wider map view on big monitors).
Rules most likely to be broken: every colour must come from base16 Isotope Dark (snapped by toIsotope());
the world is black-and-white, colour only on things of interest; text/HUD/people/crops/obstacles stay full-size;
keep frames ~15-20 ms. Workflow: branch ccr-b79130da-9ckgjo -> draft PR -> Vercel preview green -> ready -> squash-merge
(never leave PRs open; force-push is blocked, sync with `git merge -s ours`). Don't recreate Harvest Moon: Friends of Mineral Town exactly (declined).
```

## TL;DR

- **What it is:** a browser farming sim drawn in ASCII on a canvas, with three visual styles (Large, Enhanced, Classic) and a heavily detailed "Enhanced" renderer.
- **State:** working. 77/77 tests pass, typecheck clean, build OK. Deployed at https://hrvstmn.vercel.app (production = `dad620f`, #16).
- **Next up:** ask the user which of the open graphics items to do next.
- **Watch out for:** `next build` does **not** type-check or lint (`next.config.ts` turns both off). Run `npx tsc --noEmit` yourself. Also, force-push is blocked, so use the `merge -s ours` sync below or your push will be rejected.

## Goal and scope

- An ASCII farming-sim game for the web: farming, animals, villagers, festivals, mines, house upgrades.
  The original was a Python terminal game (`hrvstmn.py`, Oct 2026); the user ported it to Next.js 15 on 2026-11-02.
  Since then, almost all work has been on **visual richness**: the Enhanced/Large renderer.
- The user's standing request is "keep adding more detail to the graphics", within the rules below.
- **Out of scope / declined:** an exact replica of *Harvest Moon: Friends of Mineral Town* (its mechanics, content and
  visuals). See Decisions.
- No backend: saves live in the browser's `localStorage`. No accounts, no server API.

## Current state

| Area | Status | Notes |
|------|--------|-------|
| Core game (crops, animals, NPCs, festivals, mines, carpentry, cooking) | ✅ done | Ported from Python. Covered by `rules.test.ts`, `engine.test.ts`, `render.test.ts` |
| Save/load (2 slots) | ✅ done | `localStorage` keys `hrvstmn-save`, `hrvstmn-save-2`. #8 fixed barn animals and once-per-day flags being lost |
| Visual styles | ✅ done | Large (default, 2 cells per tile) → Enhanced → Classic. **V** or the Style button cycles them; `?style=large\|enhanced\|classic` forces one; the choice is kept in `localStorage` key `hrvstmn-style` |
| Lighting, seasons, weather, scene extras | ✅ done | Day/night, lanterns, lit windows, rain/typhoon/snow, reflections, footprints, birds, chimney smoke, fireflies, etc. |
| Black-and-white world + colour accents | ✅ done | #9. `monochrome()` pass, `accent` flag |
| High-res textures | ✅ done | 2×2 half-size glyphs per cell at font ≥ 12px; 3×3 when font ≥ 14px and font×DPR ≥ 28 (#12–#14) |
| Small objects as tile-wide clusters | ✅ done | #15 |
| Dappled sunlight, path kerbs, morning dew | ✅ done | #16, latest, in production |
| Touch controls | ✅ done (from code) | D-pad with hold-to-repeat and action buttons in `GameScreen.tsx`. Not re-tested on a device this session |
| Optional toggle for high-res detail | ⏳ not started | Idea from the user; see Open work |
| Wider map view on big monitors | ⏳ not started | Idea from the user; see Open work |
| Lint | ⏳ not set up | No ESLint installed or configured |
| Exact Harvest Moon replica | 🚫 declined | See Decisions |
| This HANDOFF.md | 🟡 committed locally | Not pushed and no PR yet (this session wasn't allowed to push) |

## Quick start

Requires Node 22 (verified with v22.23.4, npm 10.9.9). No env vars are needed to run, test or build.

| Step | Command | Verified |
|------|---------|----------|
| Install | `npm ci` | ✅ verified 2026-11-04: clean install from the committed lockfile, 62 packages in ~29 s, next 15.5.28 |
| Run locally | `npm run dev`, then open http://localhost:3000 (binds `0.0.0.0:3000`). `?autostart=1` skips the title screen | ⚠️ not verified: needs a running dev server, which wasn't started while writing this file |
| Test | `npm test` (= `tsx --test src/game/*.test.ts`) | ✅ verified 2026-11-04: 77 passed, 0 failed, 5 suites, ~6 s |
| Typecheck | `npx tsc --noEmit` | ✅ verified 2026-11-04: clean (exit 0), ~6 s. **Needed because the build skips it** |
| Build | `npm run build` (= `next build`, `output: "standalone"`) | ✅ verified 2026-11-04: compiled in 10 s (24 s total); `/` is static, 80 kB, 182 kB first-load JS. Prints "Skipping validation of types / Skipping linting" |
| Lint | `npm run lint` | ⚠️ not verified: ESLint isn't installed or configured, so `next lint` (deprecated in Next 15.5) would start an interactive setup. Not part of the user's workflow |
| Deploy | Automatic. Vercel's Git integration deploys **Production from `main`** and Preview builds for pushes to other branches | ✅ verified 2026-11-04 with the GitHub API: Production deployment of `dad620f` succeeded 2026-11-03 19:53 UTC; https://hrvstmn.vercel.app returns HTTP 200 |

Environment variables (names only): `GEMINI_API_KEY` is listed in `.env.example`, but **no code reads it**. It's left over
from the Google AI Studio scaffold, like `metadata.json` and `.aistudio/`. `.gitignore` ignores `.env*` except `.env.example`.

## Architecture map

```
app/page.tsx, app/layout.tsx   Next.js App Router shell: one page that renders GameScreen. Metadata, viewport
app/globals.css                Bundled font "HRVSTMN Mono" (DejaVu Sans Mono subset) + the 16 Isotope colours as CSS vars
components/GameScreen.tsx      Client component: canvas sizing (layout(), :114), keyboard/touch input, style button,
                               classic diff-painter, and the Enhanced path (renderEnhanced, :176), plus a 100 ms
                               animation tick (:281) that keeps water and weather moving while menus wait for input
src/game/screen.ts             Screen: the cell buffer (glyph, fg, bg, bold), semantic CellTags, RenderCtx, the async
                               key queue, VisualStyle and the style cycle. setSize clamps to 80-160 × 24-50 (:84)
src/game/engine.ts   (4.9k)    class Game, the whole game: run loop (:554), handle(k) key dispatch (:645), save/load
                               (:488/:509, SAVE_FIELDS :232), render() (:4064) → draw_topbar/draw_map (:4122)/draw_side/draw_msgs,
                               menus, festivals, barn/coop, mines, NPC schedules
src/game/constants.ts (3.1k)   Data: PALETTE (:3), SAVE_KEY, SECS_PER_10MIN, CROPS, BUILDINGS, NPCS, DIRS (:2427), HELP (:2489)
src/game/map.ts                build_farm/town/mountain/beach/house/mine/interior. Uses prebuilt_maps.json
src/game/rules.ts              Pure rule functions (stamina, tool areas, gift points, product quality, mine drops)
src/game/runtime_helpers.ts    py_* helpers left over from the Python→TS port (py_range, py_dict_get, ...)
src/game/enhanced.ts (1.6k)    The Enhanced/Large renderer (pure presentation, never touches game state)
src/game/*.test.ts             node:test, 77 tests: enhanced (60), render (7), rules (7), engine regressions (3)
public/fonts/                  DejaVu Sans Mono subset + licence
```

**Control flow.** `GameScreen` creates a `Screen` and a `Game` and calls `game.run()`. Each loop pass waits for a key
(`getKey(1/20)`), runs `handle(k)`, then `update()`: the clock runs 6 real seconds per 10 game minutes when outdoors, and NPCs
move every 0.7 s. Then `render()` writes cells, tags and a per-frame `RenderCtx` (clock, season, weather, indoor, view rect,
zoom) into the Screen, and `flush()` calls `screen.onRender`:

- **Classic:** diff-paints changed cells straight from `PALETTE`.
- **Large/Enhanced:** `computeFrame(screen, t)` → `OutCell[][]`. If `frameSignature()` is unchanged, the paint is skipped.
  Otherwise `drawFrame(ctx, frame, metrics)` paints.

**Inside `computeFrame` (`enhanced.ts:709`), in order:** a per-cell pass (`styleTile()` :415 for terrain, objects, crops
and structures; round "tokens" for creatures; UI box glyphs) → Isotope neon-on-black look → ground-edge dithering → HUD
chrome → contact shadows (plus dappled sunlight) → cloud shadows → chimneys/critters → weather → footprints/birds →
lighting (lightning in typhoons) → reflections → `shoreFoam()` (plus path kerbs) → `monochrome()` (:170) →
`decorateBoxes()` (:1358) → `snapFrame()` (:124, every colour goes through `toIsotope()` :98).

**Inside `drawFrame` (:1494):** `hiresLevel(fontPx, dpr)` (:1456) picks 1, 2 or 3. Ground texture cells use `SUBPIX`
(:1388) via `subPattern()`. Small objects use `SPRITE_POOLS` (:1408) via `spritePattern()`. Both return null for UI,
token and glow cells, which keeps sprites and text full-size. Mini-glyphs are collected into arrays and painted in
batches.

**Large mode:** each map tile is two screen cells, tagged `sub: 0/1` with `zw: 2`. The camera works in tiles
(`draw_map`, `engine.ts:4122`). Any plain `put()` clears a cell's tag, so dialogs drawn over the map always render as UI.

## Conventions and user preferences

1. **Colours come from the base16 Isotope Dark palette only** (the 16 values in `PALETTE`, `constants.ts:3`).
   Inside the renderer you may compute any intermediate hex, because `snapFrame()` maps every fg/bg onto ramps built only
   from those 16 colours. The test `every output colour comes from the Isotope ramps` (`enhanced.test.ts:303`) enforces
   this. So don't add colours after `snapFrame()`, and don't add new literal colours in `drawFrame()`; alpha over
   already-snapped colours is the existing exception.
2. **The world is black and white; colour is reserved for accents on things of interest:** people, animals, ripe crops,
   flowers/forage, doors, lit windows, fixtures (the `INTEREST` set, `enhanced.ts:404`), torches and ore. To keep
   something coloured, set `accent: true` on its `OutCell`. Everything else is turned grey by brightness in
   `monochrome()`.
3. **Keep text, HUD, people, crops and obstacles full-size and readable.** New detail goes into textures (ground and
   texture cells, small-object clusters), never into shrinking sprites or UI.
4. **Keep it fast: frame time ~15-20 ms. Batch canvas work.** Avoid per-glyph font or `fillStyle` churn (follow the
   batching in `drawFrame`). Use the seeded `hash(wx, wy, seed)` / `valueNoise()`, never `Math.random()`, in the
   renderer, so textures don't shimmer when the camera scrolls. Let `frameSignature()` skip unchanged frames.
5. **Streamline the code.** Reuse existing passes instead of adding parallel systems. For example, #16's path kerbs reused
   the shoreline edge-line pass.
6. **The renderer is pure presentation.** `enhanced.ts` must never change game state, and game logic must never depend
   on the visual style.
7. **Every visual feature gets a `computeFrame` test** in `enhanced.test.ts`, including the negative cases (#16 tested
   "none in rain / at midday"). Engine bugs get a regression test in `engine.test.ts`.
8. **Hotkeys:** arrows, `wasd` and **`hjkl`** all move. `space/z` use the tool, `x/e/enter` interact, `tab`/Shift+Tab
   switch tools, `1-6` pick a tool, `i m H b t v ? esc Q` are taken, and `q` cancels in menus. Read `handle()`
   (`engine.ts:645`) and `DIRS` before binding a key. The horse whistle had to move to **Shift+H** because `h` is
   "move left".
9. **Commit/PR style:** Conventional-commit titles (`feat: ...`, `fix: ...`) in lower case, with a bullet-point body
   explaining what the player sees. PR title = commit title. Squash commits on `main` end in `(#N)`.

## Decisions and constraints

- **Declined: an exact replica of *Harvest Moon: Friends of Mineral Town*** (mechanics, content and visuals). We would
  not recreate that specific game, and offered to build original farming-sim mechanics in the genre instead. If this
  comes up again, hold that line and offer original mechanics. The repo already contains tribute-style content from
  before this decision (README and page metadata call it "an ASCII tribute", the rules test suite is named after the
  game, and NPC names and festivals come from the Python original). Don't extend it toward a faithful copy. Raise any
  question about the existing content with the user rather than rewriting it unasked.
- **Next.js pinned to `15.5.28`** (exact version in `package.json`). Vercel blocked 15.2.1 for CVE-2025-66478, and the
  upgrade (#1) unblocked deploys. Don't downgrade, and check Vercel's advisories before changing the version.
- **Large is the default style** (`initialStyle()` in `GameScreen.tsx` falls back to `'large'`). The style cycle order is
  Large → Enhanced → Classic.
- **Black-and-white with accents (#9)** replaced full-colour Enhanced. Colour snapping to hue-shifted Isotope ramps came
  first (#4), then the neon-on-black look (#6).
- **High-res thresholds:** `HIRES_MIN_FONT = 12` (`enhanced.ts:1447`) for 2×2. 3×3 needs font ≥ 14 and font×DPR ≥ 28;
  it's drawn one row per call to stay fast.
- **`next.config.ts`** has `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` on, plus
  `reactStrictMode: false` (for the canvas loop) and `output: "standalone"`. These were already set; no reason has been
  recorded for changing them.

## Workflow

The user's rules: **work on branch `ccr-b79130da-9ckgjo`, open a draft PR into `main`, wait for the Vercel preview to go
green, then mark it ready and squash-merge. The user wants PRs merged, not left open.** One feature per PR. Every PR so
far (#1–#16) came from this same branch.

Force-push is blocked, and the branch is reused after each squash-merge. So start each new PR from `main` and fold the old
branch tip in with an `ours` merge, which makes the push a fast-forward:

```bash
timeout 60 git fetch origin                     # ✅ 2026-11-04 (fetch can hang without the timeout)
git checkout -B ccr-b79130da-9ckgjo origin/main # start from the latest squash-merged main
git branch -u origin/ccr-b79130da-9ckgjo        # checkout -B switches the upstream to origin/main; put it back
# ...edit, then: npm test && npx tsc --noEmit && npm run build
git commit -m "feat: ..."                       # body: bullets of what changed, plus your attribution trailers
git merge -s ours origin/ccr-b79130da-9ckgjo -m "Merge previous branch tip (already squash-merged as #N)"
git push origin ccr-b79130da-9ckgjo             # plain push, no force needed
```

Opening, readying and merging the PR (✅ verified 2026-11-04 with the GitHub MCP tools: `create_pull_request` with
`draft: true`, then `update_pull_request` with `draft: false`, then `merge_pull_request` with `merge_method: squash`.
⚠️ The `gh api` forms below were not run):

- Outside Claude Code cloud sessions: `gh pr create --draft --base main`, then `gh pr ready N`, then
  `gh pr merge N --squash`.
- **In Claude Code cloud sessions, `gh` GraphQL commands fail** (`gh pr list` → HTTP 403 "GraphQL is not available";
  seen 2026-11-04). Use REST or the GitHub MCP tools:
  `gh api repos/lugworth/hrvstmn/pulls -f title=... -f head=ccr-b79130da-9ckgjo -f base=main -F draft=true -f body=...`.
  The error message names `POST /repos/lugworth/hrvstmn/pulls/N/ccr/ready_for_review` for draft → ready, and the standard
  `gh api -X PUT repos/lugworth/hrvstmn/pulls/N/merge -f merge_method=squash` merges.
- **Wait for the Vercel preview without a Vercel login** by polling the commit status (✅ works, 2026-11-04):
  `gh api repos/lugworth/hrvstmn/commits/$(git rev-parse HEAD)/statuses --jq '.[0] | "\(.context) \(.state) \(.description)"'`.
  Wait for `Vercel success`. Without `gh`, the public combined status works too (✅ 2026-11-04):
  `curl -s https://api.github.com/repos/lugworth/hrvstmn/commits/$(git rev-parse HEAD)/status` and read `state`. Preview URLs themselves
  need a Vercel login (deployment protection).
- **Live check:** after the merge, the same status call on the new `main` SHA shows the Production deploy. Then load
  https://hrvstmn.vercel.app.
- PR list (REST, ✅ 2026-11-04): `gh api 'repos/lugworth/hrvstmn/pulls?state=all&per_page=20' --jq '.[] | "#\(.number) \(.state) \(.title)"'`.

## History

Newest first. All PRs were squash-merged into `main` on 2026-11-02/03.

- 2026-11-04: this HANDOFF.md, added through its own docs PR.
- #16 `dad620f`: dappled sunlight under trees, path kerbs, morning dew. **Live in production.**
- #15 `225a9a3`: small objects as tile-wide clusters, meadow stipple, batched small glyphs.
- #14 `3462ee1`: 3×3 high-res textures on sharp screens. #13 `545e491`: shading inside high-res cells, shoreline foam.
  #12 `cdea680`: high-res map textures (2×2 half-size glyphs per cell).
- #11 `6f7ab18`: footprints in snow/sand, icicles, bird flocks, autumn leaf litter. #10 `c746f0d`: water reflections,
  forest-edge trunks, top-lit canopies, dithered light falloff.
- #9 `6d37cec`: black-and-white world with colour accents on things of interest.
- #8 `118ecf9`: **bug hunt with a headless fuzzer.** Fixed: horse whistle unreachable (now Shift+H), and barn animals and
  daily flags lost on save/load. The fuzzer was an ad-hoc script and is **not in the repo**; its findings live on as
  `engine.test.ts`.
- #7 `6b79cff`: mine torches, ore glints, flickering lights, swaying grass, rug. #6 `5e25358`: neon-on-black Isotope look.
  #5 `2e63be5`: top-left lighting, water depth, framed buildings. #4 `c33468c`: snap colours to Isotope ramps.
- #3 `6355031`: more Enhanced detail (title sky, creature tokens, smoke, critters, weather). #2 `154fafc`: Enhanced and
  Large styles with lighting, seasons and weather.
- #1 `aec62c2`: Next.js 15.2.1 → 15.5.28 to unblock Vercel (CVE-2025-66478).
- 2026-11-02 (the user, before these sessions): `0e332e9` migrated from the Python/Pyodide browser build to Next.js 15;
  `7182dfe` and `190161b` expanded mechanics and UI.
- 2026-10-28: original Python terminal game and Pyodide web build (`46e8560` … `5e48fb0`).

## Open work and next steps

1. **Keep this HANDOFF.md current.** Refresh it after meaningful changes (merged features, new rules from the user,
   workflow changes): update Current state, Quick start results, History and this list.
2. **Ask the user what's next.** The standing request is more graphics detail. Good places to add it: new texture
   variants in `SUBPIX`/`SPRITE_POOLS`, new cases in `styleTile()`, or a new scene pass slotted into `computeFrame`
   before lighting (or after it, if the feature should glow or reflect). Respect rules 1-4, add tests, and re-check speed.
3. **Optional toggle for the high-res detail** (user idea, not started, design not agreed). A natural shape: a
   preference stored like `hrvstmn-style` (e.g. a new `hrvstmn-hires` key), passed into `drawFrame` through `Metrics`
   (`enhanced.ts:1379`) to cap `hiresLevel()`, with a free hotkey (check rule 8) and a toolbar/touch button next to
   Style in `GameScreen.tsx`. Confirm the UX with the user first.
4. **Wider map view on big monitors** (user idea, not started). The current caps are `MAX_COLS = 160` and
   `MAX_ROWS = 50` (`GameScreen.tsx:27-28`), **and** the same clamp in `Screen.setSize` (`screen.ts:84`). The side panel
   is a fixed 29 columns (`engine.ts:4076`), and Large mode halves the tiles visible. Cost grows with cell count:
   `computeFrame` alone measured 14-18 ms/frame at 160×50 in Large mode headless (below), so a bigger grid needs perf
   work. A larger font with the same cells is the cheaper option. Ask the user which they mean.

## Known issues and gotchas

- **`git fetch` sometimes hangs.** Wrap it: `timeout 60 git fetch origin`.
- **`pkill -f "pattern"` can kill the shell running it.** Find the PID (`pgrep -f "next dev"`) and `kill` that PID.
- **Force-push is blocked.** After a squash-merge, sync with `git merge -s ours` (Workflow), never by rebasing.
- **Vercel preview URLs need a Vercel login.** Check the GitHub commit status instead.
- **`gh pr ...` fails in Claude Code cloud sessions** (GraphQL 403). Use `gh api` REST (Workflow).
- **The build doesn't type-check or lint.** Run `npx tsc --noEmit`. There is no ESLint config, so `npm run lint` starts
  an interactive setup.
- **The local `origin/HEAD` points at `ccr-b79130da-9ckgjo`, not `main`**, and `origin/main` goes stale until you fetch
  (before this session's fetch it still showed `190161b`). Always fetch, then compare against `origin/main` explicitly.
- The style button's tooltip in `GameScreen.tsx` still says "Switch between Enhanced and Classic" (there are three
  styles now). Trivial.
- The React toolbar in `GameScreen.tsx` uses a few greys that aren't in the 16-colour palette (`#202020`, `#080808`).
  They predate the palette rule. Ask before "fixing" them.
- Leftovers from Google AI Studio: `GEMINI_API_KEY` in `.env.example` (unused), `metadata.json`, and eight PNGs under
  `.aistudio/artifacts/...`. Harmless. Don't delete them without asking.
- `engine.ts` is a mechanical port from Python (snake_case, `py_*` helpers, `as any` in places, `strict: false`). Keep
  changes there small and covered by tests.
- No in-browser frame-time harness is committed. The 15-20 ms target is the user's, and the headless benchmark below
  covers only `computeFrame`, not the canvas paint.

## How to verify things still work

1. `npm test`: expect **77 passing** (more if you added tests), 0 failing.
2. `npx tsc --noEmit`: expect no output, exit 0.
3. `npm run build`: expect "Compiled successfully", with `/` as a static route.
4. Speed (optional, ✅ run 2026-11-04). Save this as `bench.ts` in the repo root (don't commit it) and run
   `npx tsx bench.ts`:
   ```ts
   import { Screen } from './src/game/screen'; import { Game } from './src/game/engine'; import { computeFrame } from './src/game/enhanced';
   (globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
   for (const [w, h, st] of [[132, 30, 'large'], [160, 50, 'large'], [160, 50, 'enhanced']] as const) {
     const s = new Screen(w, h); s.style = st as any; const g = new Game(s, true) as any;
     g.new_game('Pete', 'Moon'); g.warp('farm', 23, 9); g.render();
     for (let i = 0; i < 10; i++) computeFrame(s, i / 10);
     const t0 = performance.now(); for (let i = 0; i < 60; i++) computeFrame(s, 1 + i / 30);
     console.log(st, w, h, ((performance.now() - t0) / 60).toFixed(2), 'ms/frame');
   }
   process.exit(0);
   ```
   Baseline over two runs in this container: Large 132×30 ≈ 10 ms, Large 160×50 ≈ 14-18 ms, Enhanced 160×50 ≈ 11-12 ms.
   The numbers are noisy, so compare before and after on the same machine. A change that moves them noticeably needs a
   look.
5. Manual smoke test (needs a browser): `npm run dev`, open `http://localhost:3000/?autostart=1`. Walk around the farm,
   press **V** through all three styles, and check that the world is grey with coloured accents, that text and HUD are
   crisp, and that weather and water animate.
6. After the merge: the `main` commit status reads `Vercel success`, and https://hrvstmn.vercel.app loads.

## Where to look for more

- `README.md`: feature list, controls, and a good explanation of the colour rules and how the Enhanced renderer works.
- `src/game/enhanced.test.ts`: the most precise spec of the intended visual behaviour.
- `git log`: commit bodies list what each change looks like in game. PRs #1–#16 on GitHub hold the same text.
- Vercel dashboard for the project: needs the user's login. GitHub deployment and commit statuses show the same pass/fail.
