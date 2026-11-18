# Neon Managed Auth

The dedicated Support Desk Neon branch has Managed Auth provisioned. Current provider configuration was read from Neon on 18 November 2026.

- Auth base URL: `https://ep-young-shape-bag39j6g.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth`
- Email/password: enabled
- Sign-up: enabled
- Email verification requirement: currently disabled
- Shared Neon sender: `auth@mail.myneon.app`
- Trusted origins: currently empty
- Localhost: allowed

## SDK guidance

Use the current Neon Managed Better Auth Next.js SDK (`@neon/auth`), not the older deprecated `@neondatabase/auth-ui` path.

Server instance:

```ts
import { createNeonAuth } from '@neon/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
```

Client:

```ts
import { createAuthClient } from '@neon/auth';
export const authClient = createAuthClient();
```

Auth API route:

```ts
import { auth } from '@/lib/auth/server';
export const { GET, POST, PUT, PATCH, DELETE } = auth.handler();
```

Session reads must run server-side. Treat a missing session as unauthenticated. Authorize workspace membership separately; authentication alone does not grant ticket access.

## Before production launch

1. Add exact application origins (local and deployed) to Neon Auth trusted origins.
2. Enable and test required email verification.
3. Configure a dedicated SMTP sender (e.g. the Support Desk domain) and test signup, verification, reset and notification mail.
4. Configure production cookie secret in the deployment secret manager.
5. Configure each OAuth provider with the project's own credentials before exposing its button.
6. Test origin validation, session expiry, logout, password reset and cross-workspace authorization.

Do not commit `.env.local`, connection strings or cookie secrets.
