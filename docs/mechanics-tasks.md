# HRVSTMN mechanics task list

Pick an unchecked task that fits the current assignment. Keep its number stable and use it in the PR description so other agents can find the work. Each task has its own PR.

## Agent workflow

1. Read [HANDOFF.md](../HANDOFF.md) in full and follow applicable `AGENTS.md` instructions and the relevant [repo agent instructions](../.claude/agents/). Follow the [PR workflow](../.claude/agents/pr-shepherd.md) and [testing rules](../.claude/agents/test-guardian.md).
2. Fetch `origin` and start the task on its own branch from current `origin/main`, or from the base the user designated. Check the current implementation and open PRs for the task before starting. Use the target branch’s actual landmark locations and game systems.
3. Implement the task through the game’s normal controls. Follow the Isotope palette, rendering, and compact-layout rules in the handoff. Add the required renderer and regression tests and verify affected keyboard, touch, and save behavior.
4. Check off the task in its implementation PR once the feature is verified. Run `npm test`, `npx tsc --noEmit`, and `npm run build` before committing. Use a conventional commit and matching PR title. Open the PR as a draft with the task number, player-visible changes, and validation results.
5. **Squash-merge the PR when its task is complete.** Require a clean PR, passing checks and a green Vercel preview on the current head, and any required approval. Mark the PR ready and merge with the expected head SHA. If the head changes, verify the new head before merging. Use the user’s branch-specific merge instructions for preview-only and experimental work.
6. Verify the merge and the deployment for its target branch, then sync before starting another task. If a merge is blocked, record the blocker and leave the task unchecked on the target branch.

## Suggested starting order

| Order | Tasks | First playable versions |
| --- | --- | --- |
| 1 | 01, 04, 33 | Three short inn scenes, one follow-up request from Gray, and named map markers. |
| 2 | 12, 34 | A public project that changes the map and a trail shortcut earned through exploration. Verify each across a reload. |
| 3 | 09, 10 | A three-slot Saturday stall, then two shoppers with different shopping lists. |
| 4 | 17, 19 | One companion planting pairing and one seed-saving recipe. Preview their effects. |
| 5 | 30, 31 | One visible maker with a batch you can collect and one preserve to use in town. |

## Neighbors and family

- [x] **01. Friday evenings at Doug’s Inn.** Rotate a card game, a recipe swap, and a story from an older villager. Let the player listen or join, and let unseen scenes recur.
- [ ] **02. Short outings with villagers.** Meet Gray for a walk or Kai for a fishing session. A ten-minute in-game outing with two bits of dialogue is enough to try it.
- [ ] **03. Villagers remember milestones.** Let Zack mention your first shipment, the curator mention a completed exhibit, and neighbors notice a path you helped repair.
- [x] **04. Requests with a second chapter.** Gray asks for copper from Spring Mine. After delivery, he shows you which watering-can upgrade is worth saving for and leaves a note about the next step.
- [ ] **05. Ask for a favor.** A close neighbor offers one specific favor on a free afternoon, such as carrying a shipment or checking shop hours. Put the promise in Today’s Plan so it feels like an arrangement.
- [ ] **06. Invite people to dinner.** Pick two guests and serve an existing recipe. Give each pairing one short exchange, with different reactions to what you serve.
- [ ] **07. Shared memories in Villager Notes.** Record moments like a first fishing trip, a favorite meal, or a request you finished together. Let the player reread the entries.
- [ ] **08. A child’s interests develop over seasons.** Show them a fish, seed, or relic to start a conversation. Later scenes reflect a few interests they’ve picked up.

## Town life and events

- [x] **09. Saturday stall in Rose Square.** Stock three goods before noon and see who stops by. Display sales and shopper comments at closing.
- [ ] **10. Shopper preferences.** Make one customer look for pantry staples and another buy an unusual flower or preserve. Offer clues ahead of time so choosing what to stock is a decision.
- [ ] **11. Guest vendors who become regulars.** Start with a traveling seed seller or carpenter who visits occasionally. A successful market or completed project earns a repeat spot.
- [x] **12. Small public works.** Help Gotz and a neighbor repair one footbridge, orchard bench, or trail shelter. Ask for materials that different farm activities supply and show the finished work on the map.
- [ ] **13. Pick a festival role.** At an existing festival, choose to cook, help set up, or join the competition. Reuse the scene and add one distinct interaction for each role.
- [ ] **14. Tiny regional contests.** Try a two-hour evening catch at Willow Bend or a winter forage hunt. Reward one small decoration or an entry in the journal.
- [ ] **15. Community pantry.** Turn surplus ingredients into a recurring shared meal. A neighbor can teach one new recipe after the first successful dinner.
- [ ] **16. Museum exhibits that tell a story.** Display an ore, a river fish, and a relic together to tell the story of one region. Add a curator note or a lead to another discovery. [Fields of Mistria’s museum set notes](https://www.fieldsofmistria.com/post/fields-of-mistria-s-second-major-update-patch-notes-are-here)

## Crops and the farm

- [ ] **17. Companion planting.** Give one flower or crop a clear benefit for an adjacent different crop. Try a single pairing first, with the benefit shown when the player aims a seed bag.
- [ ] **18. Compost from leftovers.** Turn weeds and unwanted crops into a soil dressing. Mark the improved tile and give it a small bonus on its next harvest.
- [ ] **19. Save seeds from the harvest.** Put one good crop aside for future plantings. Limit the initial yield so seeds compete with selling or cooking the crop.
- [ ] **20. Discover a few hybrids.** Let a villager help cross two specific seeds, then log combinations once discovered. Start with one hybrid per season and a visible payoff such as a new dish.
- [ ] **21. A small orchard.** Fruit trees take longer to establish and produce at predictable times. Reserve room for a walking path and let fruit feed a kitchen or preserve recipe.
- [ ] **22. Hives with seasonal honey.** Nearby blossoms change the honey’s flavor and who likes it as a gift. A hive with no flowers can still produce basic honey.
- [ ] **23. Rain barrels and irrigation.** Let a barrel collect rain, then use a repaired channel to water one strip on dry mornings. Show its coverage before building.
- [ ] **24. A planting forecast.** Show expected first and repeat harvest days from the seed bag. Indicate if the last harvest falls after the season ends.

## Animals and makers

- [ ] **25. Animal personalities.** A timid chicken hangs near its coop and a curious cow comes to the gate. Show a few behavior differences while giving animals comparable production.
- [ ] **26. Coat colors and family records.** Let breeding produce a handful of recognizable coat variants. Record parents and birthdays in the barn book.
- [ ] **27. Rotating pasture.** Offer two small grazing patches and let the player rest one to regrow. Show the remaining grass when opening its gate.
- [ ] **28. Animal enrichment.** Give chickens a perch and cows a shade tree. Add an observable behavior and a small care benefit when an animal uses it.
- [ ] **29. A pet’s morning clue.** The dog can notice a fresh trail or the cat can sit near a useful spot. Treat it as a hint about something already present in the valley.
- [ ] **30. Makers you can walk up to.** Load a batch into a visible machine, see when it will finish, and collect it there. Keep product quality visible through loading and collection.
- [ ] **31. A few preserves.** Add two or three goods, such as pickled turnips and dried herbs, with a distinct use in meals, requests, or the market.
- [ ] **32. Orders for finished goods.** Let the inn request a small bundle of bread, cheese, and herbs, or a seamstress ask for yarn. Reuse the request board and show which pieces are still missing.

## Trails, fishing, and mines

- [x] **33. A labeled valley map.** Give major landmarks distinct symbols and names. Pin one destination, point to the next map exit, and show whether the forge will be open.
- [x] **34. A shortcut earned on foot.** Open a gate from the far side of a trail or repair a crossing after seeing both banks. Make the route a permanent part of the valley once earned.
- [ ] **35. Weather worth exploring.** After a rainy night, show a mushroom flush in Cedar Hollow or an unusual tide-pool find at Lighthouse Point. Put the hint in the morning forecast or a villager’s dialogue.
- [ ] **36. People you meet along the trail.** Place a neighbor sketching the view or looking for a dropped scarf. A one-screen detour earns a story or clue.
- [ ] **37. A field notebook.** Record the place, weather, and time for interesting observations. Give the next hint in words such as “near shallow water after rain.”
- [ ] **38. Read the water before casting.** Give a few fish distinct ripple shapes or preferred pockets. Let the player learn which sign corresponds to each habitat.
- [ ] **39. Set one crab pot or fish trap.** Mark it clearly and let the player check it on the next trip. Start with one spot and one bait decision.
- [ ] **40. Mine side chambers.** Occasionally offer a visible choice between an ore pocket and the next ladder. Different rock patterns give clues about what the pocket holds.

## Home and downtime

- [ ] **41. Placeable farm details.** Let players put down paths, lamps, benches, and fences on allowed tiles. Preview each piece with the game’s existing one-cell glyphs.
- [ ] **42. Name farm plots.** Put a small sign next to a field and use its name in the daily list, such as “North Turnips have four dry tiles.”
- [ ] **43. A rainy-night coffee or tea counter.** Brew from three or four ingredients at Doug’s Inn. The drink a regular asks for starts a short conversation that can continue next week.
- [ ] **44. Places to stop and sit.** Give the Town Green bench, a porch, and the Ridge lookout a little scene at sunset or in light rain. A friend may be there on the right evening.
- [ ] **45. A mantel for festival souvenirs.** Display a ribbon, letter, or tiny sculpture from a day you remember. Interacting with it shows the date and a one-line memory.
- [ ] **46. Valley postcards.** Save a clean capture of the current scene with the location, season, and date. Keep a small album and allow a local export.
- [ ] **47. Family routines at home.** A spouse cooks breakfast on a rainy day, tends flowers in spring, or leaves a note before heading out. Let their routine make the house feel occupied.
- [ ] **48. An indoor winter hobby.** Try a small stamp-printing bench. Combine a few geometric marks and put the finished print on your wall or give it to a neighbor.

## Time, controls, and save comfort

- [ ] **49. A “Facing” row in the HUD.** Show the available action and what it affects, such as “Water turnip · 2 stamina” or “Talk to Gray.” Use the same action information on phones.
- [ ] **50. An optional first-morning checklist.** Check off tilling, planting, and watering as the player uses their starting turnip seeds. Let experienced players dismiss it.
- [ ] **51. Reminders on the calendar.** Pin a birthday, market, or personal harvest day and surface it in Today’s Plan. Keep reminders in the game clock.
- [ ] **52. A relaxed day setting.** Give players more real time per in-game hour. Keep the 5 PM shipping cutoff and shop schedules tied to the in-game clock.
- [ ] **53. A seed pouch shortcut.** Favorite one seed bag for quick planting and return to the previously equipped tool with one action.
- [ ] **54. Work along a row.** Preview a short line of reachable tiles and hold to till or water it. Stop at obstacles, an empty can, or the chosen stamina limit.
- [ ] **55. A morning save backup.** Keep a few recent dawn snapshots and show the date and farm name before restoring. Use the existing import and export format as a starting point.
- [ ] **56. Readable prompts at small sizes.** Offer a larger text setting and pair map colors with symbols and names. Try it with touch controls in portrait and landscape.

## Mechanics from other games

| Game | Published mechanic | What it suggests for HRVSTMN |
| --- | --- | --- |
| Fields of Mistria | Friday inn storylines, town repairs such as a bell tower, and rare animal coat colors. | Give villagers something to do together, make contributions visible, and let ranchers collect variants. [Developer patch notes](https://www.fieldsofmistria.com/post/fields-of-mistria-s-1-0-update-patch-notes-are-here) · [Game features](https://www.fieldsofmistria.com/) |
| Stardew Valley | A visiting bookseller, a summer environmental event, new neighbors tied to quests, and dialogue that reacts to what happened. | Put surprises on a readable schedule, and let NPCs remember things that change. [ConcernedApe’s changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/) |
| Story of Seasons: Grand Bazaar | Saturday stall sales and windmill processing that goes faster on windier days. | Give a week of production a destination, and let weather influence which chores feel worthwhile. [Official bazaar guide](https://www.storyofseasons.com/grandbazaar/bazaar/) |
| Story of Seasons: A Wonderful Life | Hybrid crops and a child who grows up and chooses a career. | Offer a few discoveries with consequences that play out across seasons. [Marvelous game overview](https://marvelous-usa.com/games/story-of-seasons-a-wonderful-life/) |
| Roots of Pacha | Discoveries lead to tools, food preservation, and village expansion. | Have a villager turn something you discover into a tool or a project that helps the valley. [Developer overview](https://rootsofpacha.com/) |
| Palia | Wild finds can yield seeds, and growing a crop can unlock a recipe to preserve it. | Connect finding, planting, and processing the same crop. [Elderwood developer notes](https://palia.com/news/patch-191) |
| A Short Hike | Marked trails, optional backcountry routes, conversations with hikers, and fishing along the way. | Make the main route readable and give curious players a reason to take a detour. [Developer’s game page](https://adamgryu.itch.io/a-short-hike) |
| Dinkum | Building up a settlement draws visitors who may decide to stay. | Make a successful market or public project earn a recurring visitor or service. [Developer press kit](https://www.playdinkum.com/media) |
| Coffee Talk | Players brew drinks from available ingredients and listen to their guests. | Give cooking a small social use where a quiet conversation is the payoff. [Toge Productions’ game page](https://www.togeproductions.com/project/coffee-talk/) |
