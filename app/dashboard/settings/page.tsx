import Link from 'next/link';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { saveWorkspaceSettingsAction,addDepartmentAction,toggleDepartmentAction } from './actions';
export const dynamic='force-dynamic';
export default async function WorkspaceSettingsPage(){
 const {membership}=await requireMembership(); if(membership.role!=='admin') return <main className="p-8">Only workspace administrators can access settings. <Link href="/dashboard">Back to dashboard</Link></main>;
 const [settings,departments]=await Promise.all([
 db`select organisation_type,display_name,phone,website,address,support_hours from support.workspace_settings where workspace_id=${membership.workspace_id} limit 1`,
 db`select id,name,description,is_active from support.departments where workspace_id=${membership.workspace_id} order by name`]);
 const s=settings[0]||{organisation_type:'business',display_name:'',phone:'',website:'',address:'',support_hours:''};
 return <main className="min-h-screen bg-[#f4f6f8]"><header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><div><p className="text-xs font-bold tracking-[.16em] text-[#b88a43]">WORKSPACE ADMINISTRATION</p><h1 className="text-xl font-bold text-[#18324d]">Organisation settings</h1><p className="text-sm text-slate-500">{membership.workspace_name}</p></div><Link href="/dashboard" className="rounded-lg border px-4 py-2 text-sm">Back to dashboard</Link></div></header>
 <div className="mx-auto grid max-w-5xl gap-5 px-5 py-7"><section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Organisation profile</h2><p className="mt-1 text-sm text-slate-500">Configure the workspace identity used by the support and school workflows.</p><form action={saveWorkspaceSettingsAction} className="mt-4 grid gap-3 sm:grid-cols-2">
 <label className="grid gap-1 text-sm">Organisation type<select name="organisationType" defaultValue={s.organisation_type} className="rounded-lg border px-3 py-2"><option value="school">School</option><option value="college">College</option><option value="business">Business</option></select></label>
 <label className="grid gap-1 text-sm">Display name<input name="displayName" maxLength={180} defaultValue={s.display_name||''} className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm">Contact phone<input name="phone" maxLength={40} defaultValue={s.phone||''} className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm">Website<input name="website" type="url" placeholder="https://example.co.za" maxLength={300} defaultValue={s.website||''} className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm sm:col-span-2">Address<textarea name="address" maxLength={500} defaultValue={s.address||''} className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm sm:col-span-2">Support / office hours<input name="supportHours" maxLength={240} defaultValue={s.support_hours||''} placeholder="e.g. Monday–Friday, 08:00–16:00" className="rounded-lg border px-3 py-2"/></label>
 <button className="w-fit rounded-lg bg-[#18324d] px-5 py-2.5 text-sm font-semibold text-white">Save organisation profile</button></form></section>
 <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Departments</h2><p className="mt-1 text-sm text-slate-500">Create teams such as Admissions, Finance, Academics, IT and General Enquiries.</p><form action={addDepartmentAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><input name="name" required maxLength={100} placeholder="Department name" className="rounded-lg border px-3 py-2 text-sm"/><input name="description" maxLength={500} placeholder="Description (optional)" className="rounded-lg border px-3 py-2 text-sm"/><button className="rounded-lg bg-[#18324d] px-4 py-2 text-sm font-semibold text-white">Add department</button></form>
 <div className="mt-4 divide-y">{departments.map((d:any)=><div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{d.name}</p><p className="text-xs text-slate-500">{d.description||'No description'} · {d.is_active?'Active':'Inactive'}</p></div><form action={toggleDepartmentAction}><input type="hidden" name="departmentId" value={d.id}/><input type="hidden" name="active" value={String(!d.is_active)}/><button className="rounded-lg border px-3 py-2 text-xs">{d.is_active?'Deactivate':'Reactivate'}</button></form></div>)}</div>
 {!departments.length&&<p className="mt-4 text-sm text-slate-500">No departments configured yet.</p>}</section></div></main>;
}
