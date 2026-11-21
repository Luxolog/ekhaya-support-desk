'use server';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { revalidatePath } from 'next/cache';
export async function saveCampaignAction(formData:FormData){
 const {user,membership}=await requireMembership(); if(!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const id=String(formData.get('campaignId')||''),name=String(formData.get('name')||'').trim(),channel=String(formData.get('channel')||'email'),subject=String(formData.get('subject')||'').trim(),body=String(formData.get('body')||'').trim();
 if(!name||name.length>180||!['email','whatsapp','sms','social'].includes(channel)||!body||body.length>12000||subject.length>240) throw new Error('Check campaign fields and lengths.');
 if(id) await db`update support.marketing_campaigns set name=${name},channel=${channel},subject=${subject||null},body=${body},updated_at=now() where id=${id} and workspace_id=${membership.workspace_id} and status='draft'`;
 else await db`insert into support.marketing_campaigns(workspace_id,name,channel,subject,body,created_by) values(${membership.workspace_id},${name},${channel},${subject||null},${body},${user.id})`;
 revalidatePath('/dashboard/campaigns');
}
export async function submitCampaignAction(formData:FormData){
 const {membership}=await requireMembership(); if(!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const id=String(formData.get('campaignId')||''); if(!id) throw new Error('Campaign required.');
 const rows=await db`select channel from support.marketing_campaigns where id=${id} and workspace_id=${membership.workspace_id} and status='draft' limit 1`;
 if(!rows.length) throw new Error('Draft campaign not found in this workspace.');
 await db`update support.marketing_campaigns set status='pending_approval',updated_at=now() where id=${id} and workspace_id=${membership.workspace_id} and status='draft'`;
 revalidatePath('/dashboard/campaigns');
}
export async function reviewCampaignAction(formData:FormData){
 const {user,membership}=await requireMembership(); if(membership.role!=='admin') throw new Error('Only admins can approve campaigns.');
 const id=String(formData.get('campaignId')||''),decision=String(formData.get('decision')||'');
 if(!id||!['approved','draft','cancelled'].includes(decision)) throw new Error('Invalid review decision.');
 await db`update support.marketing_campaigns set status=${decision},approved_by=case when ${decision}='approved' then ${user.id} else null end,approved_at=case when ${decision}='approved' then now() else null end,updated_at=now() where id=${id} and workspace_id=${membership.workspace_id} and status='pending_approval'`;
 revalidatePath('/dashboard/campaigns');
}
