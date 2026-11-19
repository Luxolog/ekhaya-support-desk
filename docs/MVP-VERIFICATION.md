# Ekhaya Support Desk — MVP verification runbook

This runbook is for a deployed Node.js instance connected only to the dedicated Support Desk Neon project. The GitHub Pages preview is static and cannot be used for these checks.

## Before testing

- Deploy the Next.js application to a Node.js host (Node.js 22+).
- Set `DATABASE_URL` to the Support Desk Neon database connection string.
- Set `NEON_AUTH_BASE_URL` to the Support Desk Neon Auth URL.
- Set `NEON_AUTH_COOKIE_SECRET` to a strong, unique secret of at least 32 characters.
- Add the exact HTTPS application origin to Neon Auth trusted origins.
- Configure a production email sender and verify delivery before inviting real customers.
- Do not use Ekhaya Price Checker credentials, databases, or infrastructure.

## Readiness

1. Open `/api/health`.
2. Expect HTTP 200 and `checks.database = "ok"` when the database is reachable.
3. Temporarily test with an unavailable database only in a disposable preview environment; expect HTTP 503 with no connection details or secrets in the response.

## Authentication

1. Register a new account and workspace.
2. Sign out and sign in again.
3. Submit a password reset request for the account.
4. Confirm the email arrives and the link opens the reset form on the correct application origin.
5. Reset the password and sign in with the new password.
6. Confirm an unknown email receives the same generic success message as a known email.
7. Confirm invalid and expired reset links cannot change a password.

## Workspace isolation and roles

1. Create a second workspace using a separate test account.
2. Add a registered test support agent and a registered test customer to the first workspace.
3. Confirm the agent can access the staff dashboard but cannot administer workspace members.
4. Confirm the customer is directed to the customer portal.
5. Confirm a user cannot open another workspace's ticket by changing the ticket URL.
6. Confirm a user cannot switch to a workspace where they are not an active member.
7. Confirm an admin cannot deactivate or demote the final active administrator.
8. Deactivate a test agent and confirm their assigned tickets become unassigned and an activity event is recorded.

## Ticket lifecycle

1. As an admin or agent, create a ticket for a customer.
2. Assign it to an active support agent and change its priority and status.
3. Add a public reply and a private internal note.
4. As the customer, confirm the public reply is visible and the internal note is not.
5. As the customer, reply to the ticket and confirm a `waiting_on_customer` ticket moves to `in_progress`.
6. Confirm the customer cannot submit a private note or reply to another customer's ticket.
7. Confirm search and status, priority, and assignee filters return only tickets in the selected workspace.

## Release evidence

Record the following before calling the MVP live-tested:

- Application URL and hosting runtime/version.
- Deployment commit SHA.
- `/api/health` HTTP status and database readiness result.
- Authentication and password-reset test outcomes.
- Workspace-isolation and role test outcomes.
- Customer/agent conversation test outcomes.
- Email delivery result and sender identity.
- Any failures, with sensitive values removed.

Do not use real customer data for initial acceptance testing. Use dedicated test accounts and clearly marked test tickets.
