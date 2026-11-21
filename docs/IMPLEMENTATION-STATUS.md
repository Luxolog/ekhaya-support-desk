# Ekhaya Support Desk — implementation status
Branch: `feature/school-support-marketing-pilot`

## Delivered on this branch
- Workspace-scoped lead CRM, follow-up tracking, internal notes and lead event history.
- Explicit, channel-specific marketing consent capture for email, WhatsApp and SMS, with recorded consent wording, source, actor and timestamp.
- Channel-specific consent withdrawal recorded as a new audit row; earlier consent evidence is retained.
- New enquiry capture defaults to no marketing consent. A general enquiry checkbox cannot grant blanket consent.
- Workspace organisation settings, department management and knowledge article drafts/publishing.
- Campaign drafts and internal admin content approval. Approval is not a send authorization; no message delivery exists.
- Workspace-scoped reporting for leads, follow-ups, tickets and campaign states.
- Dedicated consent audit page with append-only event history and staff/source/evidence details.
- Campaign-level, non-sending recipient eligibility counts split between leads and existing customers, based on the latest channel-specific consent event and matching contact field. Withdrawn, unknown and missing-contact records are excluded.
- Deterministic mock AI provider foundation; no live AI calls or message sending.

## Database and deployment
- Additive migration proposal: `docs/migrations/0002-school-crm-marketing.sql`.
- Migration was syntax/DDL validated on a temporary Neon branch and has NOT been applied to production.
- New modules require the proposed schema before they can run against a database that lacks those tables.
- GitHub-only development. No Vercel deployment, production migration or external provider setup has been performed.

## Security and privacy guardrails
- All lead, consent and campaign reads/writes are scoped to the authenticated active workspace.
- Consent is captured per channel, with the exact consent statement and source stored for audit.
- Withdrawal is append-only and does not erase the historical grant.
- The consent audit view is staff-only; customer roles are denied.
- Recipient preview counts separately use the latest event per lead/channel and customer/channel, require the matching email/phone field, and remain workspace-scoped. The preview exposes counts only, not recipient contact data.
- Campaign approval is content review only. No recipient export or sending endpoint exists.
- Before delivery is implemented, require a final recipient-level consent/suppression check at send time, unsubscribe/opt-out handling, provider configuration, audit logs, rate limits and a human-confirmed recipient preview.
- Public intake needs anti-abuse controls, validation and a privacy notice before release.
- POPIA compliance is not claimed; retention, data-subject request processes, operator agreements and organisation-specific legal review remain outstanding.

## Verification and outstanding
- `docs/CONSENT-SECURITY-TESTS.md` defines two-workspace isolation, role, tampered-ID and consent-state test cases. These are a manual test plan, not completed authenticated end-to-end tests.
- Lead assignment, CSV export, public intake and real provider integrations remain outstanding.
- End-to-end tests with real staff/customer accounts and a reviewed production migration remain release blockers.
