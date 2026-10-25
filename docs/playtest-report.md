# Local prototype verification

Latest verification: **October 25, 2026 (UTC)**, with **51 passing automated tests**, a passing TypeScript/production build, and browser checks for Guild participation, preparation, and the reusable workday kit. Earlier sections record Bay Area zooming, planting checks, garden projects, and the prototype's successive versions.

## Initial exploration prototype — October 24, 2026

The revised Common Ground exploration game was checked locally in Chrome. These are implementation checks, not a youth learning evaluation.

## Automated checks

- `npm test`: **15 passed, 0 failed**. Covers conservation of the illustrative rain amount, constrained choices, matched comparisons, delayed tree care, validated saved progress, six connected map routes, journal contents, and directory review behavior.
- `npm run build`: TypeScript and the production build pass.
- Vite reports a bundle-size advisory for the main chunk, which includes the map geometry: approximately 918 KB uncompressed, 293 KB gzip.

## Browser playthrough

All **eight discoveries** were completed through the visible interface:

1. Followed the compost journey and checked that an incorrect answer cannot collect the discovery.
2. Changed soil cover and compost, ran matched rain, and collected the causal explanation.
3. Allocated water, saved A, rejected an over-budget drip combination, then ran and compared a different B.
4. Advanced a young tree to year five and changed care: reduced care limits the illustrated benefit.
5. Moved the sun and selected different benches before completing the shade explanation.
6. Rejected a canopy plus seating over budget, then compared two valid shared-space ideas at the same checkpoint.
7. Reflected on six outdoor discoveries at the library’s fictional journal desk.
8. Created an idea, benefit/resource explanation, and question before acting.

The downloaded Markdown contained eight discoveries, the written idea, matched comparisons, provider links, and authored assumptions. Reload preserved completed progress. Starting a fresh trip kept the previous journal; restoring it and reloading recovered all eight discoveries.

The soil revisit was also checked after using drip delivery in the water challenge. The soil experiment now uses hand watering, so hidden delivery equipment does not consume its budget.

## Layout, access, and delivery

- Desktop illustrated world, place arrival, experiments, notebook, and idea view visually inspected.
- At **390 × 844**, the map and soil lesson fit the viewport without horizontal page overflow; the wider directory is still reachable.
- Keyboard Enter activates an illustrated destination. Range controls, reduced motion, zoom, and whole-map reset were exercised.
- Provider information opens with the correct listing. The three pilot resource pages were fetched as standalone HTML with the correct titles, rather than the React fallback.
- The attributed geographic dataset is served with six connected routes and ODbL metadata.
- No browser error or warning logs were captured during the final check.
- The development server responds at `http://127.0.0.1:5173/` and listens on loopback.

The browser was left on a **fresh neighborhood screen with 0 of 8 discoveries**. The completed test trip remains available as the previous trip. A copy of the downloaded test journal is saved at `artifacts/playtest-field-journal.md`; screenshots are in `artifacts/`.

## Gravity Garden expansion — October 25, 2026 (UTC)

- Automated checks now pass **19/19**. Added coverage for constrained garden planting, matching A/B time conditions, basket conservation and unmet requests, migration from old journals, and accurate Ivy Hill geography without invented cross-town routes.
- Final TypeScript and production build pass. Ivy Hill geometry loads separately (approximately 215 KB uncompressed / 77 KB gzip); the main chunk remains approximately 936 KB / 297 KB gzip with Vite’s existing size advisory.
- Browser playthrough used the separate preview origin `127.0.0.1:4173`, preserving the user’s two existing discoveries on `127.0.0.1:5173`. The production preview also exercises the lazy Ivy Hill map chunk.
- Entered Gravity Garden through the illustrated map. Keyboard Enter planted a patch and activated the library destination.
- Rejected an elder planting that exceeded five care tokens; the existing patches and saved garden A remained unchanged. A two-vegetable mix was compared with vegetables/native flowers/native elder at both year zero and year five. Both approaches reran at the same time. Collection stayed disabled until the comparison and a written reflection.
- Pantry sharing rejected a ninth basket. Compared 4/3/1 with 3/3/2 across households/shared meal/volunteer day, showing the unfilled request shifting between groups while conserving eight baskets. Used both the side controls and clickable illustration.
- Reload preserved both discoveries, current planting and sharing choices, and saved approaches. The two Gravity Garden discoveries alone enabled a grounded idea at the library.
- The actual downloaded journal included three test discoveries, the idea, both matched comparisons, provider information, dates, and explicit learning assumptions. Copy: `artifacts/gravity-garden-playtest-journal.md`.
- At **390 × 844**, the garden activity, pantry comparison, and Ivy Hill map all had a page width of 390 pixels, with no horizontal page overflow. Temporary viewport settings were reset afterward.
- Gravity Garden’s standalone resource page, the Ivy Hill map dataset, and the 15-record directory export returned HTTP 200 with the appropriate content types and source dates.
- No browser error or warning logs were captured during the playthrough.

The added activities use fictional plots, plant factors, basket amounts, groups, and requests. This is an implementation playtest, not evidence of educational effectiveness or a real planting/pantry recommendation. The user’s main game is left at the new arrival scene, with their original discoveries preserved.


## Continuous East Bay map and readability — October 25, 2026 (UTC)

- Replaced the neighborhood switch with one large map connecting West Oakland, Lake Merritt, and Ivy Hill. All four destinations share the same view.
- Derived a 2520 × 1580 map from twelve successful official OSM API extracts. All twelve destination routes are checked against actual extracted street segments; the distributed JSON matches the source dataset.
- **19 automated tests pass.** TypeScript and the final production build pass. The main JavaScript chunk is now about 385 KB / 118 KB gzip; the 5.1 MB map JSON loads separately from a local asset. No bundle-size advisory remains.
- Shortened navigation, place arrivals, instructions, feedback, activity labels, and journal controls. Put longer place facts and teaching rules behind optional details. Retained resource limits, matched comparisons, collection guards, sources, and saved notes.
- Desktop map labels use 18-pixel type; phone labels use 16 pixels independent of map scale. Main lesson text uses 17 pixels, with larger controls and diagram labels. At 390 × 844, the arrival and soil activity have no horizontal overflow. The diagram text measured about 19 pixels in glyph height.
- Exercised zoom, drag, and whole-map reset. The rendered camera transform changed during drag and returned exactly to its initial value after reset.
- Keyboard Enter entered Farm Park and traveled across the continuous map to Gravity Garden. The soil activity rejected an incorrect explanation, then saved a discovery after the correct answer. The shortened garden activity still produced a matched A/B comparison with the expected food, pollinator, cover, and resource values.
- Used the separate production-preview origin for activity checks. The user's live game retained **2 discoveries**, one at Farm Park and one at deFremery Park, after reload. No journal reset occurred.
- No error or warning logs were captured from the playtest. The temporary phone viewport was reset and the test tab closed.
- The live game is left on the East Bay map at `http://127.0.0.1:5173/`. Screenshots: `artifacts/east-bay.jpg`, `artifacts/east-bay-mobile.jpg`, `artifacts/east-bay-farm-mobile.jpg`, and `artifacts/east-bay-soil-mobile.jpg`.

These are implementation checks, not a youth learning evaluation or pedestrian-navigation validation.

## Planting checks and shared garden projects — October 25, 2026 (UTC)

- **32 automated tests pass**, including 13 new checks for coordinate selection, unknown conditions, plant screening, primary-source data completeness, project validation, idempotent creation, separate visitors, concurrent joins, organizer controls, stale edits, persistence, damaged storage, and same-origin requests. Corrupted-store fixtures intentionally emit storage-error messages while verifying that saved data is preserved.
- The final TypeScript and production build pass. The main JavaScript chunk is approximately 443 KB / 136 KB gzip, with the map and environmental datasets served separately. No bundle-size advisory remains.
- Clicked an arbitrary map spot near Webster Street and saw its actual chosen coordinates, mapped building classification, and approximate terrain. Building/road checks requested a suitable growing area. Dragging changed the camera without opening a check; Enter checked the new center near Northgate Avenue.
- At deFremery Park, full sun and occasional water produced different matches for food crops and native flowers. Unknown soil and growing conditions remained Check first. Changing soil, drainage, water, surface, and season is also covered by the screening tests. Selected plants carried into the project form.
- Created a clearly labeled **Demo pollinator patch** on an isolated preview server with plants, a $180 budget, three additional volunteers, requested roles, a continuing care plan, and pending permission. Edited the budget to $200 and saved November 7, 2026 as the work day. No actual permission or provider partnership was claimed.
- A second visitor, using the separate `localhost:4173` cookie origin, opened the copied project link and joined. The organizer saw the same saved person and role. Updating the role kept one volunteer space; leaving reopened it; closing/reopening signups reached the neighbor view. Joining again restored one membership.
- Restarted the preview server with the same isolated SQLite directory. The project, team, and organizer controls survived. Automated tests also verified two independent server instances cannot allocate the same final volunteer space.
- Clicked the actual garden pin to open its detail, then exercised My projects and Needs help on the board. Saved site observations were visible as organizer reports, separate from measured/map-derived facts.
- At **390 × 844**, site checks, both project-form steps, and project details had a 390-pixel page width with no horizontal overflow inside the modal. Form fields measured 17 pixels. Budgets and volunteer counts use separate mobile columns, with the work day on its own row.
- Phone testing exposed destination groups whose empty bounding areas could hit a different map feature. The accessible buttons now use the visible place signs. All four place signs opened their own correct coordinates on the phone; keyboard Enter still opened the correct check on desktop. Form step changes also return to the top so budget and volunteer fields appear immediately.
- No browser error or warning logs were captured in the final live and preview checks. The live community API, environmental asset, and map returned HTTP 200.
- The live game retained the user’s **2 discoveries** and **0 test projects**. Demo projects stayed in the isolated preview database. The temporary phone viewport was reset.

Screenshots: `artifacts/east-bay-plant-check.png`, `artifacts/east-bay-plant-check-mobile.png`, `artifacts/east-bay-garden-project.png`, `artifacts/east-bay-garden-project-mobile.png`, `artifacts/east-bay-garden-form-mobile.png`, and `artifacts/east-bay-garden-resources-mobile.png`.

The site check is a preliminary, source-attributed shortlist using regional models and visitor observations. These software checks do not certify a planting site or establish educational effectiveness. Neighborhood access from other computers needs an online deployment.

## Bay Area overview and expansion — October 25, 2026 (UTC)

- **41 automated tests pass.** Nine additional checks cover the unchanged initial camera and anchor projection, regional zoom limits on desktop and phone sizes, geographic picking, panning bounds, polygon holes and actual coastline, unknown environmental coverage, source/data consistency, regional garden persistence and participation, and server water/bounds checks.
- TypeScript and the production build pass. The main JavaScript chunk is approximately 453 KB / 139 KB gzip. The locally saved regional overview is about 200 KB uncompressed, alongside the unchanged detailed Oakland geometry.
- Repeated **Zoom out** clicks reached the same fitted view as **Show whole Bay Area**, with a disabled minus button at the finite limit. The original Oakland camera transform was restored exactly by the frame button.
- City labels moved the camera to San Francisco and San Jose. Keyboard arrows and dragging changed position while retaining zoom; dragging did not open a planting check. The regional overview prioritizes fewer city labels at wider zooms, and water labels avoid occupied areas.
- A chosen San Francisco point showed its geographic coordinates, regional context, and **Unknown** elevation, slope, and summer rain. Its expanded evidence omitted the Oakland climate chart and explained the coverage gap.
- At **390 × 844**, the regional map showed Oakland, San Francisco, San Jose, and Santa Rosa with 16-pixel city labels and no horizontal page overflow. Label spacing reserves the actual phone hint and controls rather than unnecessarily blocking the lower map.
- Created a clearly labeled **Demo Bay Area garden** near San Jose on an isolated preview database, with California poppy, a $180 budget, three volunteers, planning/planting roles, a care plan, and pending permission. A separate local visitor joined as a planner. The organizer saw the same saved member and 1/3 volunteer count after reload.
- Reloading the regional project link focused its geographic area. Clicking the actual garden pin reopened the same project and saved team. The phone project detail had a 346-pixel content width within a 390-pixel page.
- Clicking **Oakland · 4 places** restored all four learning destinations. Keyboard Enter at Farm Park still opened its illustrated scene and interactive discoveries.
- The playtest and neighbor tabs had no warning/error logs. The user's live game retained **2 discoveries and one existing garden project**; the demo and participation checks stayed in the separate preview database. Temporary phone settings were reset.

Screenshots: `artifacts/bay-area-overview.png`, `artifacts/bay-area-overview-mobile.png`, `artifacts/bay-area-site-check.png`, and `artifacts/bay-area-garden-project-mobile.png`. The garden is a software playtest, not a real site-work invitation.

The wider map is generalized geographic context, not new site-level evidence or new educational destinations. Expanding detailed coverage and lessons needs additional local data, source checks, and review.

## Guild participation and workday preparation — October 25, 2026 (UTC)

- **51 automated tests pass.** Ten new checks cover event boundaries and safe calendar exports, timezone handling, saved draft validation, duplication, date/URL/agenda/helper validation, edited Markdown/CSV exports, spreadsheet formula protection, and preservation of existing listing corrections.
- TypeScript and the production build pass without a bundle-size advisory. The main JavaScript chunk is approximately 466 KB / 144 KB gzip; the Guild view loads separately at approximately 42 KB / 12 KB gzip.
- Entered Guild activities through the Peace Center's visible map sign with both mouse and keyboard. Closing a dialog restores its still-mounted trigger; when navigating from the map removes that trigger, focus returns to the Guild heading. The regional Oakland control still restores the detailed learning map.
- The October 25 workday displayed **Happening now** during the playtest, with the verified official RSVP destination. Its actual downloaded calendar contained `20261025T170000Z` to `20261025T210000Z`, matching 10 a.m.–2 p.m. Pacific. The calendar is a one-time copy, not an RSVP.
- October 12 and 15 records appeared in the past-event archive and linked to finding another gathering. The planning event showed no inferred precise venue or event pin. Past records offered no calendar download.
- Completed the garden walk's water, shade, and soil observations, tested explanatory feedback, and changed the illustrated sun. Reload preserved the three explored questions and the returning-visitor choice; neither represents attendance or assessed competence.
- Edited a clearly labeled **Demo water and planting workday** in an isolated preview origin. The fictional test date was **November 8, 2026**, with an `example.org` RSVP placeholder, custom tasks, an 8:45 setup item, eight garden helpers, and a demo lead nickname. This was not a real Guild announcement.
- Downloaded and inspected the actual Markdown and role-plan CSV. They contained the edited date, agenda, tasks, helper targets, and nickname, with draft labels. Copying the invitation succeeded; no message or form was sent.
- Reusing the kit retained tasks, agenda, and helper targets while clearing the date, RSVP link, and lead assignments. Both drafts survived reload; selecting the original restored its original fields. Date/time input changes and validation of a required role hidden inside a collapsed editor were exercised and corrected.
- Guild activities, the garden walk, and the kit fit **390 × 844** and **320 × 844** viewports without horizontal page overflow. Kit fields measured 17 pixels. Temporary viewport overrides were reset.
- The print stylesheet was visually checked through browser print-media emulation: the draft, tasks, agenda, roles, checklist, and source remained visible while navigation and controls were hidden. Native print-preview automation stalled; physical printing and printed pagination were not verified.
- Public resource/activity pages and JSON returned HTTP 200. The exports contain **16 directory entries**, **15 public map locations**, **three programs**, and **three dated activities**; no saved workday drafts are exported. The gated planning venue stays unset.
- The final browser check captured no warning/error logs. Reloading the user's live app retained **2 discoveries and one existing garden project**. Playtest drafts used a separate preview origin and database.

Screenshots: `artifacts/guild-participation-desktop.png`, `artifacts/guild-garden-walk-desktop.png`, `artifacts/guild-garden-walk-mobile.png`, `artifacts/guild-workday-mobile.png`, and `artifacts/guild-workday-print.png`. Copies of the actual demo downloads are `artifacts/guild-workday-demo.md` and `artifacts/guild-workday-demo.csv`.

The public tools/SOP review is documented in `docs/guild-tool-review.md`; knowledgeable content and host review remain pending in `docs/content-review-pack.md`. These are software checks, not evidence of improved learning, reduced organizer time, return participation, or Guild adoption. Drafts and listing corrections remain browser-local; shared hosting, attendance, and outreach integrations are future work.
