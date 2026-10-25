# Guild tools and reuse decisions

Public interfaces and source documents reviewed October 25, 2026. This is a completed public review, not a backend evaluation or an agreement to replace the Guild's tools.

The [challenge](https://hackforsocialimpact.notion.site/Growing-Participation-in-East-Bay-Permaculture-4022cb772f1e80dabe47cd94b010654e) allows one pathway and asks teams to evaluate existing tools. Common Ground keeps Discovery and mapping as its primary pathway, with a small workday preparation and organizer workflow.

## What was checked

| Tool | Observed public interface | Reuse decision and remaining uncertainty |
| --- | --- | --- |
| [Lovable Community Resource Map](https://strength-weave-net.lovable.app/community-resources) | Leaflet map; Church, Community Garden, Nonprofit, Food Bank, Shelter, Mutual Aid, Library, and Other filters; an organization form saying submissions are reviewed before map publication. | Keep it as an existing discovery/contribution interface. Common Ground adds local interactive learning and source-dated participation information. No submission, review queue, private admin access, code export, record count, or synchronization was tested. |
| [Lovable Guild page](https://strength-weave-net.lovable.app/east-bay-permaculture-guild) and [Guild website](https://collectiveresiliencenow.org/east-bay-permaculture-guild/) | Background, second-Monday meeting pattern, Partiful, partner documents, and intake links. “Next meeting” still names July 13, 2026. | Retain the organizational front door and canonical participation links. Use confirmed dated records rather than copying the stale next-meeting invitation. |
| [Guild Partiful profile](https://partiful.com/u/PcnFYcpQOwCLdVFxzZ3i) | Dated public events, event preparation, and official RSVP destinations. October 25 workday and past October 12/15 gatherings were verified. | Partiful remains the RSVP system. App cards link directly; no guest data, capacity guarantee, attendance, or calendar subscription is claimed. No later confirmed date was found during this review. |
| [Volunteer-interest form](https://docs.google.com/forms/d/e/1FAIpQLScWYNUTGP3sdrGopwEcImSZ--WlXjbktrZH6KJ5ptlR3p3xLQ/viewform?usp=publish-editor) and [contact form](https://docs.google.com/forms/d/e/1FAIpQLSeOsRcMnW2NFCFLemG9S7bgbUgVxIjOIoiKAdr0ukfdWkDokg/viewform) | Existing interest/intake fields. Volunteer interests include garden care, workdays, meeting help, expertise, and listserv membership. | Link to existing volunteer intake. No form was submitted; response access, owner preferences, and a private relationship record are unverified. |
| [Workday SOP, agendas, and debriefs](https://docs.google.com/document/d/1T-lPrgM3dPlboTDOcU-ODvnFgtNQyguP5td1CtvXHOg/edit?usp=sharing) | Arrival, setup, welcome, introductions, tasks, meal, reflection, care, and cleanup responsibilities across several agendas. | Adapt editable roles, preparation, agenda, checklist, and message drafts. Preserve the source and host-review requirement; this is not one official role taxonomy. |
| [OPC property walk](https://docs.google.com/document/d/1KzH6SQ_T65FXoSWJB_hPVGtevyWb3qqSL6NuPx5NzPQ/edit?usp=drivesdk) | Observation prompts covering sunlight, water points, shade, fauna, hazards/site history, and planting. | Adapt three water/shade/soil questions. Cartoon object positions are illustrative. Knowledgeable review is pending. |

The [Volunteer and Event Management V2 brief](https://docs.google.com/document/d/1m9Oc5qZ_Gla9vVhpRFqsx2wpiXLr2jGbMJTLzlc1s48/edit?tab=t.66zvp590e72p) prioritizes calendar and reusable human-reviewed workflows. The [mapping brief](https://docs.google.com/document/d/1m9Oc5qZ_Gla9vVhpRFqsx2wpiXLr2jGbMJTLzlc1s48/edit?tab=t.45jzotseqcp8) favors GitHub-managed data and Netlify but leaves starter-data access and reuse fields unanswered. Public browsing does not fill those gaps.

SOP notes describe a Partiful CSV-to-Network for Good workflow at OPC. The volunteer brief says the Guild has not adopted its own email/SMS provider. Those are different organizational contexts; neither establishes an integration available to Common Ground.

## One workday mapped onto the app

| Source moment/responsibility | Implemented adaptation | Review needed |
| --- | --- | --- |
| Lead arrives early; prepares space, tools, snacks, nametags | 9 a.m. setup agenda step, Space & tools, Comfort & care, and setup checklist | Host confirms access, materials, leads, timing, and participation arrangements. |
| Arrival and sign-in; introductions | 9:45 arrival and 10:15 introductions; Welcome crew; newcomer preparation | Actual sign-in stays with the host; no app attendance record. |
| Garden walk and lead-supported tasks | 10:45 tasks; Garden team; water, shade, and soil observation activity | Task suitability, supervision, and site conditions need local review. |
| Lunch and reflection | 12:30 meal and 12:50 reflection; draft closing prompt | Confirm the specific event's meal and reflection plan. |
| Cleanup and continued care | Cleanup role, suggested 13:40 cleanup/14:00 close, follow-up plan | Cleanup time and helper targets are authored suggestions, not published staffing. |
| Facilitating/capturing meeting decisions | Event lead and Notes & next steps | Meeting responsibilities are adapted to a workday, not asserted as official roles. |

Default times draw on the September 27 agenda in the linked SOP. They are editable and do not describe the current October event's confirmed schedule. Seven role descriptions and helper counts are suggested planning defaults.

## Delivered now

- Public program/event cards with canonical sources, dynamic date status, and official participation links.
- Public Peace Center map location; the October 15 planning meeting has no inferred venue pin.
- Three preparation observations, newcomer/returning guidance, and existing next-event/intake links.
- Editable workday drafts, duplication, agenda/roles/checklist, print and Markdown/CSV exports, and copyable invitation/reminder/follow-up text.
- Public Git-managed activity records, standalone readable activity pages, and `/data/guild-activities.json`.

Workday drafts stay in a browser and never appear in the public activity export. Duplication clears date, RSVP URL, and lead nicknames. CSV exports describe requested roles, not attendees. No messages are sent, events published, or Guild records modified.

## Pilot handoff still needed

Ask the Guild to review the templates and learning content, choose the preferred intake route, confirm ownership/licensing and source-update responsibility, and supply any consented roster/API sample it wants evaluated. Shared hosting, recoverable identities, shared moderation, attendance history, and approved messaging remain separate pilot work.

Measure organizer effort against the existing workflow before claiming time saved. See the [content-review pack](content-review-pack.md) and [evaluation plan](evaluation-plan.md).
