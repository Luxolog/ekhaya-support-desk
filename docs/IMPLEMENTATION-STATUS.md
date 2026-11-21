# Ekhaya Support Desk — implementation status
Branch: `feature/school-support-marketing-pilot`

## Delivered on this branch
- Workspace-scoped lead CRM with statuses, follow-up dates, consent flag, private activity notes and event history.
- Workspace organisation profile and department management.
- Knowledge article drafts, editing, admin publishing and archiving.
- Campaign drafting, submission for admin approval, and approval/return/cancel workflow. Campaigns are not sent.
- Workspace-scoped operational reporting for leads, follow-ups, tickets and campaign workflow, including six-month lead volume.
- Deterministic mock AI provider foundation. It is not a live AI service and does not send messages.
- Additive migration proposal at `docs/migrations/0002-school-crm-marketing.sql`.

## Database and deployment
- Migration was syntax/DDL validated on a temporary Neon branch. It has NOT been applied to production.
- These routes require the proposed tables, so they will not operate against a database that has not had the reviewed migration applied.
- No production database changes, Vercel deployment, external provider connection or message delivery was performed.
- Development remains GitHub-only on this feature branch.

## Guardrails and outstanding work
- All CRM, campaign and report reads/writes must remain scoped to the authenticated workspace.
- Campaign workflow is planning/approval only. No delivery provider, audience selector, consent-filtered recipient export or send action exists.
- Before any sending feature: implement consent capture/withdrawal, channel-specific suppression, unsubscribe handling, recipient preview, audit trail, rate limits and provider configuration.
- Public intake endpoints need abuse prevention, validation and privacy notices before release.
- POPIA compliance is not claimed. Retention, data-subject request processes, operator agreements and organisation-specific legal review remain required.
- Automated email/WhatsApp/SMS, live AI, lead assignment, CSV export, subscription entitlements and end-to-end tests with real accounts remain outstanding.
