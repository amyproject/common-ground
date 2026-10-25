# Content review pack

**Status: knowledgeable review pending.** Prepared October 25, 2026. No reviewer has approved the learning rules, preparation questions, plant matches, or workday template. A source check and a software test are not content review.

## Review the playable content

Run `npm ci` and `npm run dev`, then open the local app. These routes refer to the local game:

| Route | Review focus | Implementation |
| --- | --- | --- |
| `/?place=farm&discovery=compost` | Compost process and explanation | `src/exploration/Place.tsx` |
| `/?place=farm&discovery=soil` | Matched rain; cover, compost, infiltration, and runoff | Place plus `src/exploration/model.ts` |
| `/?place=farm&discovery=water` | Limited water/care/credits, dry-period comparisons | Place plus model |
| `/?place=park&discovery=trees` | Establishment care and delayed tree benefits | Place plus model |
| `/?place=park&discovery=shade` | Shade moving during a day; limits of illustration | Place and art |
| `/?place=park&discovery=community` | Who benefits and who maintains shared space | Place plus model |
| `/?place=gravity&discovery=habitat` | Plant roles, diversity, and illustrative tradeoffs | `src/exploration/Gravity.tsx` plus model |
| `/?place=gravity&discovery=sharing` | Fictional harvest allocation and unmet requests | Gravity plus model |
| `/?place=library&discovery=journal` | Reflection prompts and source distinctions | Place and journal |
| `/?place=library&discovery=idea` | Benefit, resources, and questions before acting | Place and journal |
| `/?view=guild&tool=walk` | Three water/shade/soil questions and newcomer preparation | `src/guild/Preparation.tsx`, `data.ts` |
| `/?view=guild&tool=workday` | SOP adaptation, roles, timing, checklist, and follow-up | `src/guild/WorkdayKit.tsx`, `data.ts`, `model.ts` |
| Map → Check a spot | Unknown observations, plant reasons, site-history caution | `src/community/plants.ts`, `geography.ts` |

The four existing scenes and new preparation illustration are original teaching scenes. Object positions, beds, taps, benches, plant quantities, and numerical results do not establish conditions or approved programs at the real sites.

## Sources to compare

- [Guild workday SOP and agendas](https://docs.google.com/document/d/1T-lPrgM3dPlboTDOcU-ODvnFgtNQyguP5td1CtvXHOg/edit?usp=sharing): preparation, roles, timing, reflection, care.
- [OPC property walk](https://docs.google.com/document/d/1KzH6SQ_T65FXoSWJB_hPVGtevyWb3qqSL6NuPx5NzPQ/edit?usp=drivesdk): water access, sun/shade observations, site history.
- [October 25 workday](https://partiful.com/e/y11uw9Cv7OA7BVn8LSVC): published preparation and event facts, distinct from template defaults.
- [UNCCD land management and restoration](https://www.unccd.int/land-and-life/land-management-and-restoration/overview): educational framing.
- [EBMUD garden design](https://www.ebmud.com/water/conservation-and-rebates/watersmart-gardener/lawn-garden-design-center) and [EPA green infrastructure benefits](https://www.epa.gov/green-infrastructure/benefits-green-infrastructure): water/land relationships.
- [USDA NRCS pollinator conservation](https://www.nrcs.usda.gov/sites/default/files/2024-08/Basics%20of%20Pollinator%20Conserv_Sept_2020.pdf): habitat discussion.
- [UC ANR soil contaminants/testing](https://ucanr.edu/site/urban-agriculture/soil-contaminants-and-soil-testing), [vegetable handbook](https://ucanr.edu/sites/default/files/2025-03/vegetable_gardening_handbook_for_beginners.pdf), and plant-specific Calscape links in `src/community/plants.ts`: preliminary planting rules.

Place facts and additional primary sources are in `src/exploration/content.ts` and the app's Sources view. Environmental coverage/resolution and coordinates are documented in [map provenance](map-provenance.md) and [planting implementation](planting-and-projects.md).

## Authored assumptions requiring review

- Farm rain starts with an authored infiltration indicator of 36; cover/compost add illustrative increments. Dry-period moisture uses water tokens, delivery, cover, and time rather than a calibrated hydraulic model.
- The park compares tree care at year zero and five using authored shade/habitat indicators. It does not predict canopy size, survival, or a site's temperature.
- Gravity Garden uses four fictional patches, three generalized plant roles, and authored food/pollinator/cover factors. Eight fictional baskets are allocated among fictional requests. These are not yields or a real pantry policy.
- Plant matches depend on reported sun, water, drainage, surface, season, and soil review. Numerical thresholds and grouping simplify variation; the system cannot measure soil contamination, utilities, ownership, or access.
- Garden-walk answers give explanatory feedback. “Three questions explored” is not a competency, orientation, or attendance certificate.
- The workday kit adapts several agendas. Seven roles, staffing defaults, cleanup timing, and message wording are proposed, not an official event plan.

## Questions for a reviewer

1. Does each explanation teach a useful relationship without implying a guaranteed result?
2. Which regional, seasonal, soil, plant, or care exceptions should be added or change a rule?
3. Could a young or new volunteer mistake the illustration for the actual site, or preparation for permission/training?
4. Do the Guild preparation and workday kit reflect the host's current practices and welcoming voice?
5. Are source provenance, unknowns, and actions clear enough to help someone ask a steward?
6. Which tasks require different supervision, accessibility arrangements, or host-specific instructions?

Record proposed corrections against the route/file, the reason and source, then retest the relevant journey. Publish an actual review record only after the reviewer has completed it and agreed to attribution.

| Review field | Current state |
| --- | --- |
| Reviewer / relevant experience | Not assigned |
| Review date / scope | Pending |
| Findings and agreed corrections | Pending |
| Changes implemented and rechecked | Pending |
| Approved for facilitated pilot | Pending |
