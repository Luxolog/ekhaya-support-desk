# Ekhaya Support Desk

A multi-workspace customer support platform by **Ekhaya Technologies**.

## Project status

- Neon project: `ekhaya-support-desk-preview`
- Database: PostgreSQL 18.7, `neondb`
- Authentication: Neon Managed Auth (Better Auth)
- Production database schema: `support` (nine tables already applied and verified)
- Application repository: this repository

## Existing database foundation

The production Neon branch already contains:

- `support.workspaces`
- `support.workspace_members`
- `support.customers`
- `support.tickets`
- `support.ticket_messages`
- `support.ticket_attachments`
- `support.ticket_events`
- `support.tags`
- `support.ticket_tags`

The database also contains the managed `neon_auth` schema. Do not recreate, migrate, or modify its managed tables.

## Planned application capabilities

1. Customer sign-up, sign-in, email verification and password recovery.
2. Workspace administration and membership.
3. Role-based access: admin, support agent and customer.
4. Customer ticket submission and ticket history.
5. Agent queues, assignment, priority and status management.
6. Public replies and private internal notes.
7. Attachments, tags and ticket activity history.
8. Audit-friendly server-side workflows.

## Development setup

The app will use Next.js App Router, TypeScript, Tailwind CSS, Neon Managed Auth and PostgreSQL.

Copy `.env.example` to `.env.local` and populate the values from the dedicated Neon project. Never commit real credentials.

```bash
npm install
npm run dev
```

## Required environment variables

- `DATABASE_URL`: pooled connection string for the dedicated Support Desk Neon branch.
- `NEON_AUTH_BASE_URL`: Managed Auth base URL for that branch.
- `NEON_AUTH_COOKIE_SECRET`: random secret with at least 32 characters.

## Security principles

- All customer-facing data access must be scoped by workspace on the server.
- Never trust a workspace ID, role, assignee ID or user ID supplied by the browser without validating it against the authenticated session and membership records.
- Customers may see only their own tickets and public messages.
- Internal notes must never be returned to customer-facing queries.
- Attachments must use private storage and server-authorized upload/download flows.
- Keep credentials in local environment variables and hosting secrets, never in source control.

## Deployment boundary

This project is independent. Do not connect it to or deploy it through Ekhaya Price Checker infrastructure. No deployment provider is configured by this repository yet.
