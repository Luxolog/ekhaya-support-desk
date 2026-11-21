# Self-service unsubscribe flow

## Current implementation

- `/unsubscribe?token=...` displays a confirmation page; GET requests never mutate consent.
- The recipient must explicitly POST the form to `/api/marketing/unsubscribe`.
- Raw tokens are 256-bit random values. Only SHA-256 hashes are stored.
- Tokens are one-time and expire after a configurable period (1–90 days; default 30).
- Each token is bound to the exact consent-event ID for which it was issued. A later fresh grant invalidates an older unsubscribe link.
- The POST handler appends a `withdrawn` event only if that exact grant remains the latest event for the same subject and channel.
- Invalid, expired, reused and stale tokens receive the same generic response to avoid token enumeration.
- The endpoint does not reveal recipient identity, workspace, or whether the token was valid.
- The endpoint changes consent only. It does not send a confirmation message or trigger marketing delivery.

## Issuance

The server-side helper `lib/marketing/unsubscribe.ts` creates a token only for a subject in the specified workspace with current granted consent for the selected channel. It stores the consent event ID and returns the raw token to the caller so a future delivery adapter can place the URL in the message. Never put raw tokens in logs or analytics.

## Required before production use

- Add rate limiting / abuse controls at the edge or application gateway.
- Ensure proxy, analytics and error logs redact the token query parameter.
- Test provider link-scanner behavior and confirm scanners do not submit POST requests.
- Test replay, expiry, wrong-channel, wrong-workspace, stale-grant and concurrent POST cases.
- Include the opt-out URL in every future marketing message and implement suppression revalidation immediately before each send.
- Complete POPIA/legal review, retention policy and provider webhook integration.
- Apply the additive migration only after production schema review. No production migration or message delivery is enabled by this change.
