# Database contract

The dedicated Neon project already has a production `support` schema. The application must use it as-is and must not recreate the schema.

## Tables

### workspaces
`id`, `name`, `slug`, `created_at`, `updated_at`.

### workspace_members
`workspace_id`, `user_id` (references `neon_auth.user.id`), `role` (admin/support_agent/customer), `is_active`.

### customers
Workspace-scoped customer profile; optional managed-auth user link; name, email, phone and company.

### tickets
Workspace-scoped ticket with identity-generated ticket number, customer, assignee, subject, description, status, priority, source and lifecycle timestamps.

Valid statuses: `open`, `in_progress`, `waiting_on_customer`, `resolved`, `closed`.

Valid priorities: `low`, `normal`, `high`, `urgent`.

Valid sources: `web`, `email`, `phone`, `whatsapp`, `internal`.

### ticket_messages
Ticket conversation entries; sender types customer/agent/system; internal note boolean.

### ticket_attachments
Private-storage object metadata, file name, content type, size, uploader and optional message link.

### ticket_events
Audit events with actor, event type and old/new JSON values.

### tags and ticket_tags
Workspace-scoped labels and ticket-label join table.

## Authorization requirements

The schema is not a substitute for authorization. Every server action and query must derive the user ID from Neon Auth session data, verify active workspace membership and enforce role-specific actions.

- Admin: manage workspace membership, settings, all workspace tickets and agents.
- Support agent: view workspace queue, take/assign tickets as permitted, reply, add internal notes, update status/priority.
- Customer: create and view their own tickets, add public messages, view only public replies and their own permitted attachments.

Never return `ticket_messages.is_internal_note = true` to customer requests. Never expose storage keys or issue unvalidated storage URLs to browsers.

## Migration policy

Do not run schema migrations automatically against the production branch. Use Neon isolated migration preparation and test first. Managed `neon_auth` tables are provider-owned and must not be altered by application migrations.
