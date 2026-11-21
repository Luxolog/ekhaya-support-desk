'use server';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { revalidatePath } from 'next/cache';

const allowedChannels = ['email','whatsapp','sms'];

export async function recordCustomerConsentAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
  const customerId = String(formData.get('customerId') || '');
  const channel = String(formData.get('channel') || '');
  const consentText = String(formData.get('consentText') || '').trim();
  const source = String(formData.get('source') || '').trim();
  if (!customerId || !allowedChannels.includes(channel) || formData.get('confirmConsent') !== 'on' ||
      !consentText || consentText.length > 1000 || !source || source.length > 80) {
    throw new Error('Confirm explicit consent and provide the exact wording and evidence source.');
  }
  const customer = await db`select id,email,phone from support.customers
    where id=${customerId} and workspace_id=${membership.workspace_id} limit 1`;
  if (!customer.length) throw new Error('Customer not found in this workspace.');
  if (channel === 'email' && !customer[0].email) throw new Error('This customer has no email address.');
  if (channel !== 'email' && !customer[0].phone) throw new Error('This customer has no phone number.');
  await db`insert into support.marketing_consents
    (workspace_id,customer_id,channel,consent_status,consent_text,source,recorded_by)
    values (${membership.workspace_id},${customerId},${channel},'granted',${consentText},${source},${user.id})`;
  revalidatePath('/dashboard/consents');
}

export async function withdrawCustomerConsentAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
  const customerId = String(formData.get('customerId') || '');
  const channel = String(formData.get('channel') || '');
  const source = String(formData.get('source') || 'staff_recorded').trim() || 'staff_recorded';
  if (!customerId || !allowedChannels.includes(channel) || source.length > 80) throw new Error('Invalid withdrawal request.');
  const customer = await db`select id,email,phone from support.customers
    where id=${customerId} and workspace_id=${membership.workspace_id} limit 1`;
  if (!customer.length) throw new Error('Customer not found in this workspace.');
  if (channel === 'email' && !customer[0].email) throw new Error('This customer has no email address.');
  if (channel !== 'email' && !customer[0].phone) throw new Error('This customer has no phone number.');
  const latest = await db`select consent_status from support.marketing_consents
    where workspace_id=${membership.workspace_id} and customer_id=${customerId} and channel=${channel}
    order by recorded_at desc,id desc limit 1`;
  if (latest[0]?.consent_status !== 'granted') throw new Error('There is no active consent to withdraw for this channel.');
  await db`insert into support.marketing_consents
    (workspace_id,customer_id,channel,consent_status,source,recorded_by)
    values (${membership.workspace_id},${customerId},${channel},'withdrawn',${source},${user.id})`;
  revalidatePath('/dashboard/consents');
}
