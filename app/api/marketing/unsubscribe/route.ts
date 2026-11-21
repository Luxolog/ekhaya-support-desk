import { createHash } from 'node:crypto';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const successHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe request received</title></head><body style="font-family:system-ui,sans-serif;max-width:38rem;margin:4rem auto;padding:0 1rem;color:#18324d"><h1>Unsubscribe request received</h1><p>If this link was valid and your channel consent was active, your opt-out has been recorded. You will not receive further marketing messages on this channel.</p></body></html>`;

export async function POST(request: Request) {
  let token = '';
  try {
    const form = await request.formData();
    token = String(form.get('token') || '');
  } catch {
    // Keep malformed requests indistinguishable from unknown tokens.
  }

  if (token.length >= 32 && token.length <= 128 && /^[A-Za-z0-9_-]+$/.test(token)) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    try {
      // Claim the token once. Only the exact consent event for which it was
      // issued may be withdrawn; a later fresh grant invalidates the old link.
      await db`
        with claimed as (
          update support.marketing_unsubscribe_tokens
          set consumed_at = now()
          where token_hash = ${tokenHash}
            and consumed_at is null
            and expires_at > now()
          returning workspace_id, customer_id, lead_id, channel, consent_event_id
        )
        insert into support.marketing_consents
          (workspace_id, customer_id, lead_id, channel, consent_status, consent_text, source)
        select claimed.workspace_id, claimed.customer_id, claimed.lead_id,
               claimed.channel, 'withdrawn',
               'Recipient requested marketing opt-out through a one-time unsubscribe link.',
               'self_service_unsubscribe'
        from claimed
        where (select mc.consent_status
               from support.marketing_consents mc
               where mc.id = claimed.consent_event_id
                 and mc.workspace_id = claimed.workspace_id
                 and mc.channel = claimed.channel
                 and ((claimed.customer_id is not null and mc.customer_id = claimed.customer_id)
                   or (claimed.lead_id is not null and mc.lead_id = claimed.lead_id))
               limit 1) = 'granted'
          and (select mc.id
               from support.marketing_consents mc
               where mc.workspace_id = claimed.workspace_id
                 and mc.channel = claimed.channel
                 and ((claimed.customer_id is not null and mc.customer_id = claimed.customer_id)
                   or (claimed.lead_id is not null and mc.lead_id = claimed.lead_id))
               order by mc.recorded_at desc, mc.id desc
               limit 1) = claimed.consent_event_id
      `;
    } catch {
      // Never disclose token validity, recipient identity or database details.
    }
  }

  return new Response(successHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
