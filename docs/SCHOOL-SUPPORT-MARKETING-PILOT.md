# School Support & Marketing Pilot Architecture

## Goal

Extend Ekhaya Support Desk into a school-ready, multi-workspace enquiry, support and communications platform while preserving the existing customer-support MVP and its workspace isolation guarantees.

The first pilot must be usable without requiring paid messaging or AI subscriptions. External channels and AI providers are optional adapters with per-workspace configuration and explicit usage controls.

## Existing foundation (verified on 21 November 2026)

- Next.js App Router, TypeScript and Tailwind.
- Neon Managed Auth with email/password and password-reset screens.
- Dedicated Neon project: `ekhaya-support-desk-preview`, database `neondb`, default branch `production`.
- Existing `support` schema: workspaces, workspace_members, customers, tickets, ticket_messages, ticket_attachments, ticket_events, tags and ticket_tags.
- Existing roles: admin, support_agent, customer.
- Existing ticket queue, assignment, priorities, public replies, internal notes, customer portal and audit events.
- Existing production schema must not be recreated; provider-managed `neon_auth` tables must not be modified.
- Main branch is the baseline and must remain untouched during this work.

## School workspace profile

Add an organisation profile/configuration layer for a school workspace, rather than creating a separate application or database. School-specific settings should include:

- Institution type and display name.
- Departments/queues: Admissions, Finance, Academics, IT and General Enquiries.
- Public contact details and support hours.
- Approved admissions, fee, academic-calendar and general-information content.
- Marketing consent wording, consent timestamp/source and opt-out status for contacts.
- Configurable escalation and human-approval rules.

Do not store sensitive learner records in marketing lead records. Keep learner and parent data access role-scoped and collect only what is necessary.

## Two connected workflows

### A. Support operations

- Parent, learner, teacher and staff enquiries.
- Department-based queues and assignment.
- Ticket priority, status, public replies and private internal notes.
- Customer/parent portal and public enquiry form.
- Search, audit trail and operational reporting.
- Human escalation for sensitive, uncertain or urgent matters.

### B. Admissions and marketing enquiries

- Prospective-parent lead capture.
- Lead source, programme/grade of interest and enquiry status.
- Follow-up tasks and reminders.
- Approved response templates and campaign drafts.
- Funnel reporting: enquiries, contacted leads, applications and outcomes.
- Consent and opt-out enforcement before promotional messaging.
- AI may draft responses and marketing content; sending promotional messages requires authorised staff approval and valid consent.

## Channel and AI adapter strategy

Implement provider-neutral interfaces first. Do not make paid credentials mandatory for the core app.

- Website enquiry form and in-app chat: first-party, no external chat subscription.
- Email: begin with existing Neon Auth sender for authentication only; add a configurable outbound/inbound email adapter after a dedicated sender is available.
- WhatsApp: optional Meta Cloud API adapter; each school supplies and owns its own business number and credentials.
- SMS: optional provider adapter, disabled by default.
- AI: optional OpenAI adapter, with per-workspace enablement, usage caps, redaction/minimisation, approved knowledge sources and human review.
- Education systems: optional connectors for Moodle, Google Classroom and Microsoft Graph; start with CSV import/export and add live connectors only when a pilot school requires them.

## Pilot operating mode with no additional recurring spend

- Website forms and portal tickets are fully usable without third-party messaging APIs.
- Staff can manually record phone/WhatsApp enquiries and reply through existing approved channels.
- AI workflow can be exercised using scripted test fixtures and deterministic mock responses until an API key and budget are explicitly approved.
- No paid API key, external subscription, hosting purchase, DNS change or deployment is required for the GitHub-only development phase.

## Security and POPIA safeguards

- Every record and query remains scoped to the authenticated workspace.
- Never trust browser-supplied workspace IDs, roles or user IDs.
- Keep internal notes invisible to customers.
- Restrict school staff access by department/role where appropriate.
- Store provider secrets server-side only; never expose them to the browser or commit them.
- Record consent evidence and enforce opt-outs for marketing.
- Do not let AI disclose confidential learner, parent, finance or academic information.
- Require human approval for admissions decisions, fee commitments, disciplinary matters, academic results and promotional sends.
- Use synthetic test data during the pilot; do not use real learner data for acceptance tests.

## Delivery sequence

1. Audit current repository and Neon schema; preserve main and all existing tables.
2. Build additive school profile, department/queue and lead-management functionality on a dedicated feature branch.
3. Add enquiry intake and follow-up tracking with consent records.
4. Add knowledge-base content and AI drafting adapter behind a feature flag; provide a mock mode for no-cost testing.
5. Add provider adapters for email/WhatsApp/SMS only when credentials and usage budgets are approved.
6. Add CSV import/export and later school-system connectors.
7. Test three isolated school workspaces with synthetic data, including cross-workspace access, role restrictions, internal-note privacy, consent/opt-out and ticket/lead lifecycle.
8. Do not deploy until the owner explicitly authorises a hosting target and credentials are configured.

## Current known release blockers

- Neon Auth email verification is disabled.
- Neon Auth trusted origins are empty apart from localhost.
- A dedicated production sender is not configured.
- Attachments are not enabled because private object storage and signed downloads are not implemented.
- Automated ticket email notifications and inbound email/WhatsApp integrations are not implemented.
- Vercel deployment is not part of this GitHub-only phase.

## Acceptance criteria for school pilot

- Three separate school workspaces can operate without seeing each other's data.
- Each school can configure departments and assign staff.
- A prospective-parent enquiry can be captured, classified, assigned, followed up and marked as converted or closed.
- A parent/learner enquiry can become a ticket and move through the full lifecycle.
- Public replies and private notes remain correctly separated.
- Marketing consent and opt-out status are visible and enforced.
- AI can draft from school-approved knowledge only, and staff can edit/approve before sending.
- Pilot workflows remain testable with all paid integrations disabled.
