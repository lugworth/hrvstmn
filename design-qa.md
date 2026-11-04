# Contour Farm UI verification

final result: passed

## Visual evidence

- Source visual truth: `docs/contour-farm-reference.png`, the approved right-side panel revision.
- Source size: 1536 x 1024 pixels.
- Implementation: the compiled production build, opened in the Cloud Browser.
- Full-view comparison: reference and live 1536 x 1024 game viewport shown together at the
  same 0.41015625 presentation scale in the browser comparison capture.
- Implementation screenshot evidence: Cloud Browser captures in the task conversation of
  the full farm, Today dialog, Villager Notes, rucksack and paired reference comparison.
  Browser image captures were displayed in chat; a standalone screenshot file was not exported.
- Session comparison route: `http://terminal.local:4173/__qa_compare.html?compiled=1`.
  The comparison fixture is preview-only and is excluded from the branch's application.
- Focused review: the right HUD and footer were inspected at the live browser's normal
  1363 x 936 viewport in addition to the normalized full-view pair.
- State: Pete of Moon Farm, Spring 1 / Year 1, sunny morning, full stamina and 500G.
  The live clock progresses normally; its minute value differs from the static 6:30 AM mock.

## Findings and repairs

1. [P2, resolved] The initial panel used more width than the reference. Its minimum width
   was reduced to 24 grid columns; normal desktop proportions now follow the 23% target.
   Tool cost moved onto the EQUIPPED caption so the tool name remains readable.
2. [P2, resolved] Contour strokes and footer controls were too quiet. Contour foregrounds
   and texture opacity were strengthened, roof edges changed to outlines, and desktop
   control text increased to 16px / 18px on wider screens. The final paired browser
   comparison shows these changes.
3. [Resolved preview issue] Running a local production build alongside a development
   preview mixed server HTML and cached client bundles. Final verification used a separate
   staged standalone production server with matching hashed assets. No application errors
   appeared in the final browser session; unrelated extension metadata errors were excluded.

No actionable P0/P1/P2 UI findings remain for the requested style implementation.

## Required surfaces

- Typography: bundled HRVSTMN Mono / DejaVu Sans Mono retained throughout; larger date and
  brand headings, bounded text, aligned values and full-size actors/crops/obstacles.
- Spacing: right panel, consistent insets, distinct date/tool/health/resources groups,
  one primary action, no repeated sidebar shortcuts, no rounded status cards.
- Color: Isotope ramps, grayscale scenery and meaningful cyan/green/orange accents.
  Palette and monochrome regressions pass.
- Artwork: actual game geometry and seeded glyph textures are rendered live; no mockup
  screenshot is embedded as gameplay. The reference drawing is interpreted through the
  existing 64x28 map, lighting, weather, seasons and one-cell tile contract, rather than
  replacing those systems with a raster illustration.
- Copy: live date, time, weather, tool tier/experience/cost, water capacity, stamina,
  fatigue, gold, bin, held item and contextual animal/forge information remain driven by
  game state. The status row displays the newest game message.

## Interaction and responsive checks

- Walked from the farmhouse onto the farm with keyboard controls.
- Cycled the toolbar tool from Hoe to Hammer and observed the HUD update.
- Opened and closed Today; paged through Villager Notes; opened and closed the rucksack.
- Toggled motion off; the control reflected the change and the choice persisted.
- Opened the game in a 390 x 844 iframe: clientWidth and scrollWidth were both 390.
- Engine tests cover HUD bounds at 80x24, 100x28, 132x30 and 160x50, long names,
  watering-can data, large gold values, empty stamina and fainting warnings.
- Final production browser console check: no application errors or warnings.

## Validation

- `npm test`: 86 passed.
- `npx tsc --noEmit`: clean.
- `npm run build`: passed; static route, 84.1 kB page / 187 kB first load.
- Warmed Node farm benchmark, 132x30, 50 samples: computeFrame + frameSignature median
  7.45ms, p95 9.36ms. This excludes Canvas painting; full browser frame timing was not measured.

## Follow-up polish / test gaps

- Native game lighting and geometry intentionally give the live world different shading
  and proportions from the generated illustration. No gameplay geometry was changed.
- The narrow viewport was tested in a desktop browser. Physical touch-device input and
  pointer-coarse emulation were not available; the existing context action logic is retained.

## Implementation checklist

- [x] Contour scenery through the existing renderer, with stable world anchoring.
- [x] Refined right-side panel, bounded headings, live state and tool warnings.
- [x] Cyan action footer, keyboard focus states and square touch controls.
- [x] Dialog/weather/sprite negative cases and frame-cache invalidation regressions.
- [x] Production browser checks, tests, type check and build.
