# Consent and workspace-isolation verification

These checks are required before enabling any marketing delivery. They are a manual security test plan, not a claim that authenticated end-to-end tests have already run.

## Recipient eligibility rules

For a campaign channel of email, WhatsApp or SMS:

1. Resolve the active workspace from the authenticated membership; never accept a workspace ID from the browser as authority.
2. For each lead in that workspace, use the newest consent event for the campaign channel, ordered by `recorded_at DESC, id DESC`.
3. Include a lead in the eligible count only when the newest event is `granted` and the matching contact field is present.
4. Exclude leads with no consent event, a latest `withdrawn` event, or a missing channel contact.
5. Do not use the general lead-level `consent_status` field as channel-specific authorization.
6. Re-run the check immediately before delivery. A preview is not a durable authorization.
7. Social campaigns have no recipient consent count in this feature and must not be routed through email, SMS or WhatsApp delivery.

## Two-workspace isolation test matrix

Create two test workspaces (A and B), each with an admin and support agent, and create leads/campaigns in both.

- A's admin and agent can view only A's consent audit rows and campaign preview counts.
- B's admin and agent can view only B's consent audit rows and campaign preview counts.
- Change a lead ID in a form or URL to a lead belonging to the other workspace; every mutation must reject it as not found.
- Change a campaign ID to a campaign belonging to the other workspace; no campaign details or counts from that workspace may be returned.
- A customer role cannot open the consent audit page or access consent history through a server action.
- A stale or forged active-workspace cookie must fall back to one of the user's verified active memberships; it must not grant access to a workspace without membership.

## Consent state cases

- Latest event granted + matching contact present: included in the eligible count.
- Latest event withdrawn: excluded, even if an older grant exists.
- No consent event: excluded.
- Latest grant but no email/phone for that channel: excluded.
- Email grant does not authorize SMS or WhatsApp; SMS grant does not authorize email.
- A new grant after a withdrawal becomes the latest state, but must be supported by fresh evidence and recorded as a new append-only event.
- Duplicate timestamps are resolved deterministically by descending event ID.

## Release blockers

- No provider delivery adapter or send action is enabled by this work.
- Before delivery: implement send-time revalidation, unsubscribe/opt-out intake, provider webhook handling, idempotency, rate limits, approval policy, recipient preview confirmation, and audit records for every attempted send.
- Staff-recorded evidence must be checked against the source; organisation-specific POPIA/legal review remains necessary.
