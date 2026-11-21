# Development milestone: CRM and school foundation

## Implemented in this branch
- Workspace-scoped lead capture and pipeline at `/dashboard/leads`.
- Lead statuses, contact fields, source, interest, follow-up timestamp, consent flag and private activity notes.
- Every lead query and mutation is scoped to the authenticated active workspace; only admins and support agents can access the module.
- Lead status and creation events are written to a workspace-scoped audit table.
- Deterministic `MockAiProvider` interface for no-cost draft workflow testing. It clearly labels output as a draft, uses only supplied approved knowledge, and escalates when no approved content is supplied.
- Additive schema proposal for workspace settings, departments, leads, lead events, knowledge articles, marketing campaigns, consent evidence and AI usage.

## Database status
Migration file: `docs/migrations/0002-school-crm-marketing.sql`.

The migration was prepared and executed successfully on a temporary Neon branch for syntax/DDL validation. The eight proposed tables were confirmed on that temporary branch. It was not applied to the production branch. The production schema remains unchanged. Apply only after a human review and an explicit production migration window.

## Current limitations
- Lead assignment UI and CSV export are not yet implemented.
- Departments are represented in the schema but no administration screen is delivered yet.
- Knowledge article CRUD, campaign CRUD, consent withdrawal UI and real public intake endpoints remain outstanding.
- Mock AI is not a live AI service and does not send messages.
- No external email, WhatsApp, SMS or AI credentials are configured.
- No billing, deployment or production changes were made.

## Security notes
Lead records are distinct from learner records. Marketing consent is recorded separately from general enquiry capture; no campaign sender exists in this milestone. Internal lead notes are stored as activity events and are shown only in the staff-only lead page. POPIA compliance is not claimed; legal basis, retention, data-subject request handling, operator agreements and school operational policies still require review.
