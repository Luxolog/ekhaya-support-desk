'use server';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { revalidatePath } from 'next/cache';
export async function saveWorkspaceSettingsAction(formData:FormData){
 const {membership}=await requireMembership(); if(membership.role!=='admin') throw new Error('Only admins can update workspace settings.');
 const type=String(formData.get('organisationType')||'business'), display=String(formData.get('displayName')||'').trim(), phone=String(formData.get('phone')||'').trim(), website=String(formData.get('website')||'').trim(), address=String(formData.get('address')||'').trim(), hours=String(formData.get('supportHours')||'').trim();
 if(!['school','college','business'].includes(type)||display.length>180||phone.length>40||website.length>300||address.length>500||hours.length>240) throw new Error('Check the organisation details and field lengths.');
 if(website&&!/^https:\/\//i.test(website)) throw new Error('Website must start with https://.');
 await db`insert into support.workspace_settings(workspace_id,organisation_type,display_name,phone,website,address,support_hours,updated_at)
 values(${membership.workspace_id},${type},${display||null},${phone||null},${website||null},${address||null},${hours||null},now())
 on conflict(workspace_id) do update set organisation_type=excluded.organisation_type,display_name=excluded.display_name,phone=excluded.phone,website=excluded.website,address=excluded.address,support_hours=excluded.support_hours,updated_at=now()`;
 revalidatePath('/dashboard/settings');
}
export async function addDepartmentAction(formData:FormData){
 const {membership}=await requireMembership(); if(membership.role!=='admin') throw new Error('Only admins can manage departments.');
 const name=String(formData.get('name')||'').trim(), description=String(formData.get('description')||'').trim();
 if(!name||name.length>100||description.length>500) throw new Error('Enter a department name (100 characters max) and a short description.');
 await db`insert into support.departments(workspace_id,name,description) values(${membership.workspace_id},${name},${description||null}) on conflict(workspace_id,name) do update set description=excluded.description,is_active=true`;
 revalidatePath('/dashboard/settings');
}
export async function toggleDepartmentAction(formData:FormData){
 const {membership}=await requireMembership(); if(membership.role!=='admin') throw new Error('Only admins can manage departments.');
 const id=String(formData.get('departmentId')||''), active=String(formData.get('active')||'')==='true';
 if(!id) throw new Error('Department required.');
 await db`update support.departments set is_active=${active} where id=${id} and workspace_id=${membership.workspace_id}`;
 revalidatePath('/dashboard/settings');
}
