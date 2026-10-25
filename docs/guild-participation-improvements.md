# Proposed Guild participation improvements

Reviewed October 25, 2026, late morning in America/Los_Angeles. This is a proposal, not an implemented feature list or a statement of Guild endorsement.

This proposal was accepted for implementation in the project chat. It records the pre-implementation assessment; the delivered scope and checked results are in the [README](../README.md) and [playtest report](playtest-report.md). Guild review and adoption remain pending.

## Recommendation

Keep the cartoon map and interactive learning. Make a real Guild activity the clearest next step after learning, and demonstrate one reusable organizer workflow.

The focused journey should be:

**Explore a place → learn something useful → find a Guild activity → prepare and RSVP through its existing tool → find a reason to return.**

Keep **Discovery and mapping** as the primary pathway. A workday kit provides a bounded contribution to volunteer learning and organizer capacity. The brief explicitly allows this scope; a complete CRM, campaign system, and volunteer platform are unnecessary for the first demonstration. [1]

Choose first-time residents and young volunteers as the main audience. The game should remain optional: someone who already wants to volunteer should reach the official event information immediately.

## What the feedback gets right

The current app has a coherent learning experience and useful participation links, but Guild activities are absent from the directory. Its community model supports resident garden proposals, not scheduled Guild events, workday attendance, or a returning-volunteer relationship. The listing review desk is local to a browser, and the community server is local to this computer.

The important gap is the connection to the Guild's actual operations. More geographic coverage would not close that gap.

Two qualifications matter:

- The Guild already has public newcomer and volunteer-interest forms. Common Ground should connect people to the chosen form before creating another intake process. The volunteer form already asks about OPC garden work, meeting support, expertise, and listserv interest. [8, 9]
- The Lovable link is a broader Collective Resilience website containing a Community Resource Map and Guild pages. The challenge explicitly cautions teams to confirm which product they are assessing. Reviewing its public interface does not establish access to its code, data, or administrator workflow. [1, 2, 3]

## Existing tools: review and reuse decision

| Existing resource | What I verified | Proposed relationship |
| --- | --- | --- |
| Lovable Community Resource Map | A Leaflet map, organization-type filters, and an organization submission form. The form says submissions are reviewed before appearing. | Treat it as an existing discovery and contribution interface. Document how our learning, participation information, and source dates complement it. Confirm reuse access before proposing a migration or synchronization. |
| Lovable Guild page | Guild background, meeting information, and links to Partiful and a volunteer-interest form. Its “next meeting” text still points to July 13, 2026. | Link to current official event records. Keep the Guild's organizational website as its organizational front door. |
| Guild Partiful profile | A public event history and an October 25 workday, with an official RSVP destination. | Use canonical event links for real RSVPs. A Common Ground role preference must not imply registration, attendance, or a reserved place. |
| Existing Google Forms | Separate contact and volunteer-interest forms. The latter includes a returning listserv member option. | Let the Guild choose its preferred intake link. Avoid copying private responses into Common Ground. |
| Workday SOP and agendas | Setup, arrival, introductions, garden tasks, lunch, reflection, and next steps; notes on operational roles and existing coordination tools. | Turn these into editable preparation and organizer templates, with their source and review status visible. |
| OPC property walk | Observation questions covering sunlight, water, shade, fauna, potential contamination, and planting choices. | Adapt a short observation activity to connect the game and site check to the Guild's existing practice. |

Sources: [2–10]. This was a public, read-only review. I did not submit forms, RSVP, inspect private guest lists, or test administrator publishing. Record counts, backend permissions, code/data exports, and integrations remain unverified.

The SOP notes a Partiful CSV-to-Network for Good workflow at OPC. The separate volunteer brief says the Guild has not adopted its own email/SMS provider. Those describe different organizational contexts; neither proves that Common Ground has an available integration. [4, 5]

## First judging pass

### 1. Add a small Guild activity layer

Add Oakland Peace Center as a public destination and connect it to source-checked activity cards. Keep the initial map view, large text, and short copy.

Use three clear activity types: **Workday / skill share**, **Potluck / community evening**, and **Garden planning**. These should be separate from resident garden proposals.

For each activity, show only the decision-making essentials:

- What it is and who hosts it.
- Date, time, and a public venue when the source publishes one.
- What to expect and how to prepare.
- One prominent official participation link.
- Source-check date and current event status.

Public examples verified for this review:

| Activity | Date | Appropriate use |
| --- | --- | --- |
| OPC Community Garden Work Day and Skill Share, Round 7 | October 25, 2026, 10 a.m.–2 p.m. | A same-day activity, already in progress at review time. After its end time, present it as past. |
| EBPG October Potluck and Community Hangout | October 12, 2026 | A past example of a community evening with a speaker and group discussion. |
| OPC Community Garden Planning Meeting | October 15, 2026 | A past example connecting garden visioning to volunteer roles and ongoing care. |

Sources: [6, 11, 12]. Do not label the past examples as upcoming. The Guild publishes a second-Monday meeting pattern, but that is not confirmation of the next specific event's date, venue, or registration. [3, 7, 11]

When no later event is confirmed, show **“Find the next Guild gathering”** linking to the official profile. Do not manufacture future dates or copy the website's stale “next meeting” label.

A lightweight implementation would keep public activity records in Git, with a venue reference, category, practice tags, start/end timestamps, timezone, source URL, registration URL, cancellation status, and last-checked date. Use the timestamps to distinguish upcoming, in-progress, and past events. Keep recurring programs separate from dated occurrences.

### 2. Connect learning to workday preparation

After a soil or water experiment, offer a short card such as **“Try this with neighbors at an OPC workday.”** Open event information without requiring completion of the game.

Adapt three questions from the existing property walk: where water is available, what creates shade, and what needs checking before planting. The current site-check inputs provide a natural starting point. [10]

Show a concise preparation view:

**Before:** official RSVP, what to bring, arrival information, and a task to ask about.

**On the day:** welcome and orientation, join a lead-supported task, and take part in the meal or reflection.

**After:** note a discovery and open the Guild's next-event or ongoing-volunteer link.

The linked workday agendas support this structure. The actual event's instructions should determine its details. Completing the preparation activity is not evidence of gardening competence, an orientation waiver, or attendance. [4, 6]

A fuller OPC cartoon learning scene can follow later. The property-walk questions are a useful starting point; precise placement of beds, taps, and other objects would need appropriate site information and steward review.

### 3. Demonstrate an organizer workday kit

This is the most useful first organizer feature: **start from a reusable template instead of writing each workday from scratch.**

The organizer supplies a draft title, date, public venue, tasks, desired help, and an official participation URL. The kit produces:

- An editable agenda and setup checklist.
- Short role descriptions and space for assignments.
- A preparation note for volunteers.
- A print view and CSV export of the role/task plan.
- A closing prompt and draft follow-up invitation.

Draft responsibilities should map explicitly to the source: event/facilities leadership, comfort and care, arrival/sign-in duties, garden team leadership, and cleanup. The meeting agendas also contain facilitation and note-taking roles. These are template suggestions for review, not a fixed official role taxonomy. [4, 6]

For judging, use clearly labeled example assignments. Do not imply the exported plan is an official attendee roster. A later roster import should use an organizer-provided CSV sample and confirmed permissions; automatic Partiful or CRM synchronization is unverified.

Show the organizer duplicating the kit for another draft, changing the tasks, and exporting it. That demonstrates reusable output. Measuring actual minutes saved requires a comparison with an organizer's current workflow.

### 4. Add a modest return loop and clearer Guild context

After an activity or preparation session, offer **“See the next gathering”** and the existing volunteer-interest link. Offer a calendar download only for a source-confirmed dated event.

Draft follow-up copy for the organizer to review and copy into its chosen channel. Publishing and sending remain human actions. Avoid introducing a new messaging service for the judging pass.

Retain Common Ground's identity while adding **“Built for the East Bay Permaculture Guild challenge.”** Attribute Guild activity cards to their actual hosts. Use short, welcoming invitations grounded in the provider's wording, and keep detailed background behind an expansion control.

Do not present the prototype as Guild-owned or endorsed without confirmation.

### 5. Document the reuse decision and review status

Add a short existing-tools comparison to the README, including this public review's limits. Move tool evaluation out of the future-only roadmap: the public review has now been done.

Prepare a content-review pack containing lesson links, sources, authored game assumptions, and questions for a knowledgeable reviewer. A documented review with resulting corrections would close the content-review gap; a prepared checklist alone would not.

## Next operational pilot

| Need | Proposed next step |
| --- | --- |
| Access from different devices | Host the app with a working service/database and appropriate organizer access. Confirm the journey on two separate devices. Static hosting alone does not provide the existing garden API. |
| Shared listing maintenance | Keep approved public records in GitHub, following the mapping brief's preference, and add a simple contributor/reviewer interface. Review decisions must persist centrally and update the published record. |
| Returning volunteers | Use the Guild's approved intake and coordination tools as the relationship record. Add recoverable identity, consent, and private attendance history only where the chosen workflow needs them. |
| Reminders and follow-up | Begin with reusable drafts. Connect approved channels and consent preferences after confirming owners, access, and publishing responsibilities. |
| Handover and reuse | Confirm code/data reuse terms, choose the project's code license with the owner, and identify someone responsible for updates and content review. |

The mapping brief favors GitHub-managed data and Netlify, but its starter-data access and reuse fields are unanswered. Public event metadata and source links are enough for the first pass; a real data migration needs additional confirmation. [13]

A local demo can show the workday kit and link to a real provider. It cannot establish that neighbors can use Common Ground's own garden coordination service remotely.

## Demonstration and evidence

Suggested short demonstration:

1. Open the existing East Bay view and try one soil/water interaction.
2. Find the OPC destination and identify a real Guild activity's date and status.
3. Open its official participation link and preparation card.
4. Switch to an organizer draft, reuse the workday template, and export its role/task plan.
5. Finish with the next-gathering link and explain which parts are demonstrated versus pending partner review.

Useful checks for the first pass:

- A newcomer can find an appropriate official participation link without completing a game or creating another profile.
- Past, in-progress, canceled, and undated recurring records produce appropriate labels and actions.
- A workday draft is visibly distinct from a source-checked real event.
- The kit exports the organizer's edited tasks and dates, and duplication does not carry over example assignments.
- Private contact details and attendee lists do not become public map data.
- An organizer can explain whether the template replaces repeated work and what still needs changing.

Before a real pilot, separately verify cross-device access, organizer authorization, shared publishing, and the chosen participation system. Do not report a click, RSVP-link visit, or lesson completion as attendance, retention, or ecological impact.

## Sources

Read directly from the linked public pages and Google Docs on October 25, 2026.

1. [Growing Participation in East Bay Permaculture — current challenge](https://hackforsocialimpact.notion.site/Growing-Participation-in-East-Bay-Permaculture-4022cb772f1e80dabe47cd94b010654e)
2. [Lovable Community Resource Map — public interface reviewed](https://strength-weave-net.lovable.app/community-resources)
3. [Lovable East Bay Permaculture Guild page — public interface reviewed](https://strength-weave-net.lovable.app/east-bay-permaculture-guild)
4. [OPC garden workday SOP, agendas, and debriefs](https://docs.google.com/document/d/1T-lPrgM3dPlboTDOcU-ODvnFgtNQyguP5td1CtvXHOg/edit?usp=sharing)
5. [Volunteer and Event Management V2 brief](https://docs.google.com/document/d/1m9Oc5qZ_Gla9vVhpRFqsx2wpiXLr2jGbMJTLzlc1s48/edit?tab=t.66zvp590e72p)
6. [OPC Community Garden Work Day and Skill Share, Round 7 — October 25](https://partiful.com/e/y11uw9Cv7OA7BVn8LSVC)
7. [Guild background and monthly meeting information](https://collectiveresiliencenow.org/east-bay-permaculture-guild/)
8. [Guild contact-information form](https://docs.google.com/forms/d/e/1FAIpQLSeOsRcMnW2NFCFLemG9S7bgbUgVxIjOIoiKAdr0ukfdWkDokg/viewform)
9. [Guild Volunteer and Interest Form — linked from the Lovable Guild page](https://docs.google.com/forms/d/e/1FAIpQLScWYNUTGP3sdrGopwEcImSZ--WlXjbktrZH6KJ5ptlR3p3xLQ/viewform?usp=publish-editor)
10. [OPC property walk — linked from the Guild's Linktree](https://docs.google.com/document/d/1KzH6SQ_T65FXoSWJB_hPVGtevyWb3qqSL6NuPx5NzPQ/edit?usp=drivesdk)
11. [EBPG October Potluck and Community Hangout — October 12](https://partiful.com/e/Ndbcr15Aa142zBLZZU3U)
12. [OPC Community Garden Planning Meeting — October 15](https://partiful.com/e/HZPB5ZAkhvFUePeQGwgt)
13. [Mapping Project V2 brief](https://docs.google.com/document/d/1m9Oc5qZ_Gla9vVhpRFqsx2wpiXLr2jGbMJTLzlc1s48/edit?tab=t.45jzotseqcp8)
14. [Guild's Partiful profile — event history and next-event destination](https://partiful.com/u/PcnFYcpQOwCLdVFxzZ3i)
15. [Guild's Linktree — current participation and resource links](https://linktr.ee/eastbaypermacultureguild)
