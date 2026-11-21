import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { getUnsubscribeExpiryDays } from '@/lib/marketing/policy';

type UnsubscribeTokenInput = {
  workspaceId: string;
  subjectId: string;
  subjectType: 'customer' | 'lead';
  channel: 'email' | 'whatsapp' | 'sms';
  expiresInDays?: number;
};

/** Issue a one-time token bound to the exact currently-granted consent event. */
export async function createUnsubscribeToken(input: UnsubscribeTokenInput) {
  const days = getUnsubscribeExpiryDays(input.expiresInDays);
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const rows = input.subjectType === 'customer'
    ? await db`select id from support.customers where id=${input.subjectId} and workspace_id=${input.workspaceId} limit 1`
    : await db`select id from support.leads where id=${input.subjectId} and workspace_id=${input.workspaceId} limit 1`;
  if (!rows.length) throw new Error('Recipient not found in this workspace.');

  const consent = input.subjectType === 'customer'
    ? await db`select id,consent_status from support.marketing_consents where workspace_id=${input.workspaceId} and customer_id=${input.subjectId} and channel=${input.channel} order by recorded_at desc,id desc limit 1`
    : await db`select id,consent_status from support.marketing_consents where workspace_id=${input.workspaceId} and lead_id=${input.subjectId} and channel=${input.channel} order by recorded_at desc,id desc limit 1`;
  if (consent[0]?.consent_status !== 'granted') {
    throw new Error('An unsubscribe link can only be issued for an actively consented recipient and channel.');
  }

  const consentEventId = consent[0].id;
  if (input.subjectType === 'customer') {
    await db`insert into support.marketing_unsubscribe_tokens(workspace_id,customer_id,channel,consent_event_id,token_hash,expires_at) values(${input.workspaceId},${input.subjectId},${input.channel},${consentEventId},${tokenHash},${expiresAt.toISOString()})`;
  } else {
    await db`insert into support.marketing_unsubscribe_tokens(workspace_id,lead_id,channel,consent_event_id,token_hash,expires_at) values(${input.workspaceId},${input.subjectId},${input.channel},${consentEventId},${tokenHash},${expiresAt.toISOString()})`;
  }
  return { token, expiresAt };
}
