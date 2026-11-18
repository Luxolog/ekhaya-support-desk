import { requireMembership } from '@/lib/workspace';
import { switchWorkspaceAction } from './actions';
import { redirect } from 'next/navigation';

export const dynamic='force-dynamic';

export default async function WorkspacesPage(){
 const {membership,memberships}=await requireMembership();
 if(memberships.length===1) redirect(membership.role==='customer'?'/portal':'/dashboard');
 return <main className="min-h-screen bg-[#f4f6f8] px-5 py-12"><section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-7"><p className="text-xs font-bold uppercase tracking-widest text-[#b88a43]">EKHAYA TECHNOLOGIES</p><h1 className="mt-2 text-3xl font-semibold text-[#18324d]">Choose a workspace</h1><p className="mt-2 text-sm text-slate-500">Your account belongs to more than one workspace. Select where you want to work.</p><div className="mt-6 space-y-3">{memberships.map((m:any)=><form action={switchWorkspaceAction} key={m.workspace_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><input type="hidden" name="workspaceId" value={m.workspace_id}/><div><p className="font-semibold text-slate-900">{m.workspace_name}</p><p className="text-xs capitalize text-slate-500">{m.role.replace('_',' ')}</p></div><button className="rounded-lg bg-[#18324d] px-4 py-2 text-sm font-semibold text-white">Open workspace</button></form>)}</div></section></main>;
}
