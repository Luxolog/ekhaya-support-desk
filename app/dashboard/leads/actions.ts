'use server';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { revalidatePath } from 'next/cache';
const statuses = ['new','contacted','follow_up_required','interested','application_started','converted','not_interested','closed'];
const channels = ['email','whatsapp','sms'];
export async function createLeadAction(formData: FormData) {
 const { user, membership } = await requireMembership();
 if (!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const fullName=String(formData.get('fullName')||'').trim(), email=String(formData.get('email')||'').trim().toLowerCase(), phone=String(formData.get('phone')||'').trim();
 const enquiryType=String(formData.get('enquiryType')||'general').trim(), interest=String(formData.get('interest')||'').trim(), message=String(formData.get('message')||'').trim(), source=String(formData.get('source')||'manual').trim(), followUp=String(formData.get('followUpAt')||'').trim();
 if(!fullName||(!email&&!phone)) throw new Error('Enter a name and at least one contact method.');
 if(fullName.length>160||email.length>320||phone.length>40||message.length>5000||interest.length>240||source.length>80) throw new Error('A field exceeds its allowed length.');
 if(email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
 const rows=await db`insert into support.leads (workspace_id,full_name,email,phone,enquiry_type,interest,message,source,follow_up_at,consent_status,created_by)
 values (${membership.workspace_id},${fullName},${email||null},${phone||null},${enquiryType},${interest||null},${message||null},${source},${followUp||null},'unknown',${user.id}) returning id`;
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
export async function recordMarketingConsentAction(formData:FormData){
 const {user,membership}=await requireMembership(); if(!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const leadId=String(formData.get('leadId')||''),channel=String(formData.get('channel')||''),consentText=String(formData.get('consentText')||'').trim(),source=String(formData.get('source')||'').trim();
 if(!leadId||!channels.includes(channel)||formData.get('confirmConsent')!=='on'||!consentText||consentText.length>1000||!source||source.length>80) throw new Error('Confirm the person explicitly agreed, and record the consent wording and source.');
 const lead=await db`select id,email,phone from support.leads where id=${leadId} and workspace_id=${membership.workspace_id} limit 1`; if(!lead.length) throw new Error('Lead not found in this workspace.');
 if(channel==='email'&&!lead[0].email) throw new Error('This lead has no email address.');
 if((channel==='whatsapp'||channel==='sms')&&!lead[0].phone) throw new Error('This lead has no phone number.');
 await db`insert into support.marketing_consents(workspace_id,lead_id,channel,consent_status,consent_text,source,recorded_by) values(${membership.workspace_id},${leadId},${channel},'granted',${consentText},${source},${user.id})`;
 await db`insert into support.lead_events(workspace_id,lead_id,actor_user_id,event_type,details) values(${membership.workspace_id},${leadId},${user.id},'marketing_consent_granted',jsonb_build_object('channel',${channel},'source',${source}))`;
 revalidatePath('/dashboard/leads');
}
export async function withdrawMarketingConsentAction(formData:FormData){
 const {user,membership}=await requireMembership(); if(!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const leadId=String(formData.get('leadId')||''),channel=String(formData.get('channel')||''),source=String(formData.get('source')||'staff_recorded').trim();
 if(!leadId||!channels.includes(channel)||!source||source.length>80) throw new Error('Invalid consent withdrawal request.');
 const lead=await db`select id,email,phone from support.leads where id=${leadId} and workspace_id=${membership.workspace_id} limit 1`; if(!lead.length) throw new Error('Lead not found in this workspace.');
 if(channel==='email'&&!lead[0].email) throw new Error('This lead has no email address.');
 if((channel==='whatsapp'||channel==='sms')&&!lead[0].phone) throw new Error('This lead has no phone number.');
 const latest=await db`select consent_status from support.marketing_consents where workspace_id=${membership.workspace_id} and lead_id=${leadId} and channel=${channel} order by recorded_at desc,id desc limit 1`; if(latest[0]?.consent_status!=='granted') throw new Error('There is no active consent to withdraw for this channel.');
 await db`insert into support.marketing_consents(workspace_id,lead_id,channel,consent_status,source,recorded_by) values(${membership.workspace_id},${leadId},${channel},'withdrawn',${source},${user.id})`;
 await db`insert into support.lead_events(workspace_id,lead_id,actor_user_id,event_type,details) values(${membership.workspace_id},${leadId},${user.id},'marketing_consent_withdrawn',jsonb_build_object('channel',${channel},'source',${source}))`;
 revalidatePath('/dashboard/leads');
}
