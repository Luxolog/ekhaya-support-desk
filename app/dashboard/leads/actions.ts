'use server';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { revalidatePath } from 'next/cache';
const statuses = ['new','contacted','follow_up_required','interested','application_started','converted','not_interested','closed'];
export async function createLeadAction(formData: FormData) {
 const { user, membership } = await requireMembership();
 if (!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const fullName=String(formData.get('fullName')||'').trim(), email=String(formData.get('email')||'').trim().toLowerCase(), phone=String(formData.get('phone')||'').trim();
 const enquiryType=String(formData.get('enquiryType')||'general').trim(), interest=String(formData.get('interest')||'').trim(), message=String(formData.get('message')||'').trim(), source=String(formData.get('source')||'manual').trim(), followUp=String(formData.get('followUpAt')||'').trim(), consent=formData.get('marketingConsent')==='on';
 if(!fullName||(!email&&!phone)) throw new Error('Enter a name and at least one contact method.');
 if(fullName.length>160||email.length>320||phone.length>40||message.length>5000||interest.length>240) throw new Error('A field exceeds its allowed length.');
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
 const rows=await db`insert into support.leads (workspace_id,full_name,email,phone,enquiry_type,interest,message,source,follow_up_at,consent_status,consent_at,consent_source,created_by)
 values (${membership.workspace_id},${fullName},${email||null},${phone||null},${enquiryType},${interest||null},${message||null},${source},${followUp||null},${consent?'granted':'unknown'},${consent?new Date():null},${consent?'staff_recorded':null},${user.id}) returning id`;
 await db`insert into support.lead_events (workspace_id,lead_id,actor_user_id,event_type,details) values (${membership.workspace_id},${rows[0].id},${user.id},'lead_created',jsonb_build_object('source',${source}))`;
 revalidatePath('/dashboard/leads');
}
export async function updateLeadStatusAction(formData: FormData) {
 const {user,membership}=await requireMembership(); if(!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const id=String(formData.get('leadId')||''), status=String(formData.get('status')||''); if(!id||!statuses.includes(status)) throw new Error('Invalid lead or status.');
 const prior=await db`select status from support.leads where id=${id} and workspace_id=${membership.workspace_id} limit 1`; if(!prior.length) throw new Error('Lead not found.');
 await db`update support.leads set status=${status},updated_at=now() where id=${id} and workspace_id=${membership.workspace_id}`;
 await db`insert into support.lead_events (workspace_id,lead_id,actor_user_id,event_type,details) values (${membership.workspace_id},${id},${user.id},'status_changed',jsonb_build_object('from',${prior[0].status},'to',${status}))`;
 revalidatePath('/dashboard/leads');
}
export async function addLeadNoteAction(formData: FormData) {
 const {user,membership}=await requireMembership(); if(!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const id=String(formData.get('leadId')||''), note=String(formData.get('note')||'').trim(); if(!id||!note||note.length>3000) throw new Error('Enter a note of 3,000 characters or fewer.');
 const exists=await db`select id from support.leads where id=${id} and workspace_id=${membership.workspace_id} limit 1`; if(!exists.length) throw new Error('Lead not found.');
 await db`insert into support.lead_events (workspace_id,lead_id,actor_user_id,event_type,details) values (${membership.workspace_id},${id},${user.id},'internal_note',jsonb_build_object('note',${note}))`;
 revalidatePath('/dashboard/leads');
}
