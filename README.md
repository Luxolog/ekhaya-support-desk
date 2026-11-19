# Ekhaya Support Desk

A multi-workspace customer support platform by **Ekhaya Technologies**.

## Current implementation

- Next.js App Router, TypeScript and Tailwind CSS.
- Neon Managed Auth email/password sign-up, sign-in, password reset and session handling.
- Automatic workspace creation for the first account.
- Workspace roles: admin, support agent and customer.
- Admin can add registered users, change workspace roles and deactivate members while preserving at least one active admin.
- Workspace-scoped dashboard and searchable/filterable ticket queue (status, priority, assignee and customer/ticket search).
- Create tickets, set priority, assign to active team members and update status.
- Ticket conversation, public replies and private internal notes.
- Customer portal for customers linked to a workspace to submit requests and follow public replies.
- Ticket activity audit events.

## Dedicated infrastructure

- Neon project: `ekhaya-support-desk-preview`
- Database: `neondb`
- App data schema: `support`
- Authentication: Neon Managed Auth (Better Auth)
- Repository: `Luxolog/ekhaya-support-desk`
- Vercel project: `ekhaya-support-desk-app` (dedicated project; deployment preparation in progress)

The production `support` schema has already been created and verified. Do not recreate it or modify provider-managed `neon_auth` tables.

## Local development

1. Install Node.js 22 LTS.
2. Copy `.env.example` to `.env.local`.
3. Add the pooled Neon connection string as `DATABASE_URL`.
4. Set `NEON_AUTH_BASE_URL` to the dedicated Neon Auth URL.
5. Generate a strong cookie secret of at least 32 characters for `NEON_AUTH_COOKIE_SECRET`.
6. Install and run:

```bash
npm install
npm run dev
```

## Environment variables

- `DATABASE_URL`: pooled connection string for the dedicated Support Desk Neon branch.
- `NEON_AUTH_BASE_URL`: Neon Managed Auth base URL.
- `NEON_AUTH_COOKIE_SECRET`: random secret (never commit it).

## First-use flow

1. Open `/auth/sign-up`.
2. Create your user account and workspace. The first account in a workspace is its admin.
3. Register support agents and customers separately.
4. From the admin dashboard, add each registered email to the workspace with the correct role.
5. Staff use `/dashboard`; linked customers use `/portal`.

## Current release boundaries

The current MVP now includes password reset request and token-based password update screens. File attachments, inbound email/WhatsApp integrations, billing, and advanced reporting remain out of scope for this MVP. Automated email notifications are not implemented. Email verification is currently disabled in Neon Auth. The current branch uses Neon's shared email sender for auth messages; configure a dedicated production sender and trusted application origin before public launch.

## Security

- All application database access is server-side and scoped to the authenticated user's active workspace.
- Customers can submit and reply only to tickets linked to their own customer profile.
- Customer conversation queries exclude internal notes.
- Roles are validated server-side; browser-supplied workspace and user IDs are not trusted.
- Workspace selection is resolved against active memberships; stale or forged workspace cookies fall back to a verified membership without mutating cookies during server rendering.
- Customer message writes verify ticket ownership on the server and reject private-note attempts.
- Member administration is admin-only and prevents deactivating or demoting the final active administrator.
- Attachments are not enabled until private object storage and signed download flows are implemented.
- Keep secrets in host environment settings, never in Git.

## Deployment

This is a dynamic Next.js application. GitHub Pages can host only the separate static design preview, not this authenticated app with server actions and database access.

Vercel is an approved deployment target for this dedicated Support Desk repository. The Vercel project must use only the `Luxolog/ekhaya-support-desk` repository and the dedicated Support Desk Neon project. Never connect it to the Ekhaya Price Checker repository, Supabase project, or credentials.

Domains.co.za Linux VPS remains an alternative Node.js hosting option. Do not change DNS or purchase hosting until the owner selects a production hostname and approves the hosting plan.
