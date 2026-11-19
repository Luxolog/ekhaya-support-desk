# Deploy Ekhaya Support Desk on Domains.co.za VPS

This application is a dynamic Next.js server, not a static website. Deploy it to a Linux VPS with root access. Ordinary shared PHP/cPanel hosting is not an assumed target.

## Recommended hosting profile

- Provider: Domains.co.za
- Product: Linux VPS (self-managed)
- OS: Ubuntu 24.04 LTS
- Runtime: Node.js 22 LTS
- Reverse proxy: Nginx
- Process manager: PM2
- Database: existing dedicated Neon Support Desk database (do not migrate or recreate it)

For a small production Next.js application, prefer at least 4 GB RAM if the budget permits. A 2 GB VPS may be usable when builds happen in CI and only the production server runs on the VPS, but memory must be monitored. Confirm the current VPS plan, resources, billing and OS availability in the Domains.co.za account before ordering.

## DNS and application origin

Choose a dedicated hostname such as `support.ekhayatech.co.za` or another domain/subdomain explicitly selected by the owner. Do not change DNS until the VPS has been provisioned and its public IP is known.

After the hostname is selected and DNS resolves to the VPS:
- Issue an SSL certificate with Let's Encrypt.
- Add the exact HTTPS origin (for example, `https://support.example.co.za`) to the dedicated Support Desk Neon Auth trusted origins.
- Use that same public origin for password-reset redirect configuration and browser access.

## Server preparation (Ubuntu)

Run as a sudo-capable server administrator. Keep the OS patched and restrict SSH to trusted administrators.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl build-essential
```

Install Node.js 22 LTS using the official NodeSource distribution instructions or an approved Node version manager. Confirm:

```bash
node --version
npm --version
```

Use Node 22.x. Do not expose the Node application port directly to the public internet; Nginx should proxy HTTPS traffic to the local app port.

## Application setup

Create a dedicated unprivileged Linux user and application directory. Clone only:

```text
https://github.com/Luxolog/ekhaya-support-desk
```

Use the `main` branch and record the deployed commit SHA. In the application root:

```bash
npm ci
npm run typecheck
npm run build
```

If the repository does not yet contain a committed npm lockfile, `npm ci` will fail. In that case, stop and create/commit a reviewed lockfile first; do not silently fall back to unpinned production dependencies.

## Environment variables

Set these in a root-readable or app-user-readable environment file outside the Git repository (for example, `/etc/ekhaya-support-desk.env` with restrictive permissions):

- `DATABASE_URL`: pooled connection string for the dedicated Support Desk Neon database only.
- `NEON_AUTH_BASE_URL`: the Support Desk Neon Auth base URL.
- `NEON_AUTH_COOKIE_SECRET`: a unique random secret of at least 32 characters.

Never commit environment files, paste secrets into tickets, or reuse Price Checker credentials. Restrict file permissions to the app user and administrators.

## Run the Next.js server

Use a process manager such as PM2 or a hardened systemd service to keep the production server running and restart it after host reboots. Bind the app to localhost (for example port 3000). Ensure the process receives the environment variables above.

Nginx should proxy HTTPS requests to `http://127.0.0.1:3000`, forward the original host and protocol headers, and support the standard Next.js request body limits required by the application. Do not enable public directory listing.

## Post-deployment checks

1. Open `https://YOUR-CHOSEN-HOSTNAME/api/health`; expect HTTP 200 with database status `ok`.
2. Confirm HTTP redirects to HTTPS.
3. Test sign-up and sign-in with dedicated test accounts.
4. Test password reset email delivery and the complete reset link on the selected hostname.
5. Complete the customer/agent ticket lifecycle in `MVP-VERIFICATION.md`.
6. Confirm no cross-workspace access and no customer visibility of internal notes.
7. Record deployed commit SHA, server OS, Node version, health response and test results.

## Operational security

- Configure firewall rules to allow only required inbound ports (SSH from trusted addresses, HTTP for certificate issuance/redirects, HTTPS).
- Keep SSH keys secure; disable password SSH login where operationally possible.
- Apply security updates and monitor disk, memory, CPU and application logs.
- Configure off-server backups for any server-local data. Ticket data remains in Neon; do not create a second application database.
- Configure a dedicated production auth email sender and test deliverability before public launch.
- Do not deploy this project to Vercel or connect it to the Ekhaya Price Checker project or database.
