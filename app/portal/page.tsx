import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { createCustomerTicketAction, addTicketMessageAction } from '@/app/dashboard/actions';
import { signOutAction } from '@/app/auth/actions';

export const dynamic='force-dynamic';

type PortalTicket = { id: string; ticket_number: number | string; subject: string; description: string; status: string; priority: string; created_at: Date | string; updated_at: Date | string };
type PortalMessage = { id: string; body: string; created_at: Date | string; name: string | null };

export default async function CustomerPortalPage(){
 const {user,membership,memberships}=await requireMembership();
 if(membership.role!=='customer') redirect('/dashboard');
 const tickets=await db`
  select t.id,t.ticket_number,t.subject,t.description,t.status,t.priority,t.created_at,t.updated_at
  from support.tickets t join support.customers c on c.id=t.customer_id
  where t.workspace_id=${membership.workspace_id} and c.user_id=${user.id}
  order by t.updated_at desc
 `;
 return <main className="min-h-screen bg-[#f4f6f8]">
  <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5"><div><p className="text-xs font-bold tracking-[.16em] text-[#b88a43]">EKHAYA TECHNOLOGIES</p><h1 className="text-xl font-bold text-[#18324d]">Customer Support</h1></div><div className="flex items-center gap-3">{memberships.length>1&&<a href="/workspaces" className="text-sm text-[#245b83] underline">Switch workspace</a>}<form action={signOutAction}><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Sign out</button></form></div></div></header>
  <div className="mx-auto max-w-4xl space-y-6 px-5 py-8"><div><p className="text-xs font-bold uppercase tracking-widest text-[#245b83]">Customer portal</p><h2 className="mt-1 text-3xl font-semibold">Hello, {user.name||'there'}</h2><p className="mt-1 text-slate-500">Submit a request and follow replies from your support team.</p></div>
  <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">Create a support request</h3><form action={createCustomerTicketAction} className="mt-4 space-y-3"><label className="block text-sm font-medium">Subject<input name="subject" required maxLength={180} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5"/></label><label className="block text-sm font-medium">How can we help?<textarea name="description" required rows={4} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5"/></label><button className="rounded-lg bg-[#18324d] px-5 py-2.5 font-semibold text-white">Submit request</button></form></section>
  <section className="space-y-3"><h3 className="font-semibold text-slate-900">Your support requests ({tickets.length})</h3>{tickets.length===0?<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">You have not submitted any support requests yet.</div>:tickets.map((t: PortalTicket)=><article key={t.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold text-[#b88a43]">TICKET #{t.ticket_number}</p><h4 className="mt-1 font-semibold text-slate-900">{t.subject}</h4><p className="mt-1 text-sm text-slate-500">{new Date(t.created_at).toLocaleString()}</p></div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">{t.status.replaceAll('_',' ')}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{t.description}</p><CustomerConversation ticketId={t.id}/></article>)}</section>
  </div>
 </main>
}

async function CustomerConversation({ticketId}:{ticketId:string}){
 const {user,membership}=await requireMembership();
 const msgs=await db`select m.id,m.body,m.created_at,u.name from support.ticket_messages m left join neon_auth."user" u on u.id=m.sender_user_id join support.tickets t on t.id=m.ticket_id join support.customers c on c.id=t.customer_id where m.ticket_id=${ticketId} and t.workspace_id=${membership.workspace_id} and c.user_id=${user.id} and m.is_internal_note=false order by m.created_at asc`;
 return <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversation</p><div className="mt-2 space-y-2">{msgs.map((m: PortalMessage)=><div key={m.id} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{m.name||'Support team'} · {new Date(m.created_at).toLocaleString()}</p><p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p></div>)}</div><form action={addTicketMessageAction} className="mt-3 flex flex-col gap-2"><input type="hidden" name="ticketId" value={ticketId}/><textarea name="body" required rows={2} placeholder="Write a reply…" className="w-full rounded-lg border border-slate-300 p-3 text-sm"/><button className="self-end rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Send reply</button></form></div>
}
