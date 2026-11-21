# Consent and workspace-isolation verification

These checks are required before enabling any marketing delivery. They are a manual security test plan, not a claim that authenticated end-to-end tests have already run.

## Recipient eligibility rules

For a campaign channel of email, WhatsApp or SMS:
1. Resolve the active workspace from the authenticated membership; never accept a workspace ID from the browser as authority.
2. For each lead and existing customer in that workspace, use the newest consent event for that record and campaign channel, ordered by `recorded_at DESC, id DESC`.
3. Include a lead or customer in its respective eligible count only when the newest event is `granted` and the matching contact field is present.
4. Exclude leads and customers with no consent event, a latest `withdrawn` event, or a missing channel contact.
5. Do not use the general lead-level `consent_status` field as channel-specific authorization.
6. Re-run the check immediately before delivery. A preview is not a durable authorization.
7. Social campaigns have no recipient consent count in this feature and must not be routed through email, SMS or WhatsApp delivery.

## Two-workspace isolation test matrix

Create two test workspaces (A and B), each with an admin and support agent, and create leads/campaigns in both.
- A's admin and agent can view only A's consent audit rows, lead preview counts and customer preview counts.
- B's admin and agent can view only B's consent audit rows, lead preview counts and customer preview counts.
- Change a lead ID in a form or URL to a lead belonging to the other workspace; every mutation must reject it as not found.
- Change a campaign ID to a campaign belonging to the other workspace; no campaign details or counts from that workspace may be returned.
- A customer role cannot open the consent audit page or access consent history through a server action.
- A stale or forged active-workspace cookie must fall back to one of the user's verified active memberships; it must not grant access to a workspace without membership.

## Customer-specific consent checks

- Customer consent events are joined only to the matching customer ID and workspace ID.
- A customer in workspace A must never affect workspace B's eligible, withdrawn or unknown/missing counts.
- Customer channel contact validation uses email for email campaigns and phone for WhatsApp/SMS.
- A customer grant or withdrawal for one channel does not change the state for another channel.

## Consent state cases

- Latest event granted + matching contact present: included in eligible count.
- Latest event withdrawn: excluded, even if an older grant exists.
- No consent event: excluded.
- Latest grant but no email/phone for that channel: excluded.
- Email grant does not authorize SMS or WhatsApp; SMS grant does not authorize email.
- A new grant after a withdrawal becomes the latest state only when supported by fresh evidence.
- Duplicate timestamps are resolved deterministically by descending event ID.

## Self-service unsubscribe tests

- Opening the confirmation page with GET does not create a consent event or consume the token.
- Explicit POST with a valid, unexpired token appends one withdrawal for its bound workspace, subject and channel.
- Replaying a consumed token does not append another event.
- An expired, malformed, unknown or already-consumed token does not reveal whether a recipient exists.
- A token issued for email cannot alter SMS or WhatsApp consent; the stored token channel is authoritative.
- If staff withdraw consent after token issuance, the public POST does not append a duplicate withdrawal.
- If a new consent grant is recorded after token issuance, the stale token does not withdraw the renewed consent.
- A token from one workspace cannot change consent in another workspace.
- Two simultaneous POST requests using the same token result in at most one appended withdrawal.
- Verify provider link scanners only GET the confirmation page and do not automatically POST.

## Release blockers

- No provider delivery adapter or send action is enabled by this work.
- Before delivery: implement send-time revalidation, provider configuration, audit logs for attempted sends, rate limits, and a human-confirmed recipient preview.
- Public intake needs anti-abuse controls, validation and a privacy notice before release.
- Staff-recorded evidence must be checked against the source; organisation-specific POPIA/legal review remains necessary.
