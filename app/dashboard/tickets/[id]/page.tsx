import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { addTicketMessageAction, updateTicketStatusAction, updateTicketPriorityAction, assignTicketAction } from '../../actions';
import { signOutAction } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';
type TicketTeamMember = { id: string; name: string | null; email: string };
type TicketMessage = { id: string; body: string; sender_type: string; is_internal_note: boolean; created_at: Date | string; sender_name: string | null };
type TicketEvent = { event_type: string; created_at: Date | string };

const labels: Record<string,string> = {open:'Open',in_progress:'In progress',waiting_on_customer:'Waiting on customer',resolved:'Resolved',closed:'Closed'};

export default async function TicketDetailPage({params}:{params:Promise<{id:string}>}) {
  const {membership}=await requireMembership();
  if(membership.role==='customer') redirect('/portal');
  const {id}=await params;
  const rows=await db`
    select t.*, c.display_name as customer_name, c.email as customer_email, u.name as assignee_name
    from support.tickets t join support.customers c on c.id=t.customer_id
    left join neon_auth."user" u on u.id=t.assigned_to
    where t.id=${id} and t.workspace_id=${membership.workspace_id} limit 1
  `;
  if(!rows.length) notFound();
  const ticket=rows[0];
  const [messages,team,events]=await Promise.all([
    db`select m.id,m.body,m.sender_type,m.is_internal_note,m.created_at,u.name as sender_name
       from support.ticket_messages m left join neon_auth."user" u on u.id=m.sender_user_id
       where m.ticket_id=${id} order by m.created_at asc`,
    db`select u.id,u.name,u.email from support.workspace_members wm join neon_auth."user" u on u.id=wm.user_id
       where wm.workspace_id=${membership.workspace_id} and wm.is_active=true and wm.role in ('admin','support_agent') order by u.name`,
    db`select event_type,created_at from support.ticket_events where ticket_id=${id} order by created_at desc limit 8`
  ]);
  const teamRows = team as unknown as TicketTeamMember[];
  const messageRows = messages as unknown as TicketMessage[];
  const eventRows = events as unknown as TicketEvent[];
  return <main className="min-h-screen bg-[#f4f6f8]">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><div><p className="text-xs font-bold tracking-widest text-[#b88a43]">EKHAYA TECHNOLOGIES</p><p className="font-bold text-[#18324d]">Support Desk</p></div><form action={signOutAction}><button className="rounded-lg border px-3 py-2 text-sm">Sign out</button></form></div></header>
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8">
      <Link href="/dashboard" className="text-sm font-semibold text-[#245b83]">← Back to dashboard</Link>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#b88a43]">Ticket #{ticket.ticket_number}</p><h1 className="mt-2 text-2xl font-semibold text-slate-950">{ticket.subject}</h1><p className="mt-1 text-sm text-slate-500">{ticket.customer_name} · {ticket.customer_email}</p></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{labels[ticket.status]}</span></div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{ticket.description}</p>
        <div className="mt-5 flex flex-wrap gap-6 border-t border-slate-100 pt-4 text-sm"><span>Priority: <b className="capitalize">{ticket.priority}</b></span><span>Assigned: <b>{ticket.assignee_name || 'Unassigned'}</b></span><span>Source: <b className="capitalize">{ticket.source}</b></span></div>
        <form action={updateTicketPriorityAction} className="mt-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="ticketId" value={id}/>
          <label className="text-sm font-medium text-slate-600" htmlFor="priority">Change priority</label>
          <select id="priority" name="priority" defaultValue={ticket.priority} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Save priority</button>
        </form>
        <form action={assignTicketAction} className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="ticketId" value={id}/><label className="text-sm font-medium text-slate-600" htmlFor="assignee">Assign to</label><select id="assignee" name="assignee" defaultValue={ticket.assigned_to||''} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Unassigned</option>{teamRows.map((a)=><option key={a.id} value={a.id}>{a.name} · {a.email}</option>)}</select><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Save assignment</button></form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Conversation</h2><form action={updateTicketStatusAction} className="flex items-center gap-2"><input type="hidden" name="ticketId" value={id}/><select name="status" defaultValue={ticket.status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="rounded-lg bg-[#18324d] px-3 py-2 text-sm font-semibold text-white">Update status</button></form></div>
        <div className="mt-5 space-y-3">{messageRows.map((m)=><article key={m.id} className={`rounded-xl p-4 ${m.is_internal_note?'border border-amber-200 bg-amber-50':m.sender_type==='agent'?'bg-blue-50':'bg-slate-50'}`}><div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><b>{m.sender_name || m.sender_type}{m.is_internal_note?' · INTERNAL NOTE':''}</b><time>{new Date(m.created_at).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{m.body}</p></article>)}
        {messageRows.length===0&&<p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">No replies yet. Send the first response below.</p>}</div>
        <form action={addTicketMessageAction} className="mt-6 border-t border-slate-100 pt-5"><input type="hidden" name="ticketId" value={id}/><label className="text-sm font-semibold text-slate-700">Write a reply or internal note<textarea name="body" required rows={4} className="mt-2 block w-full rounded-lg border border-slate-300 p-3 font-normal" placeholder="Type your message…"/></label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="internal"/> Add as private internal note</label><button className="rounded-lg bg-[#18324d] px-5 py-2.5 font-semibold text-white">Send message</button></div></form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Recent activity</h2><div className="mt-3 space-y-2">{eventRows.map((e,i)=><p key={i} className="flex justify-between gap-3 text-sm text-slate-600"><span>{String(e.event_type).replaceAll('_',' ')}</span><time className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString()}</time></p>)}</div></section>
    </div>
  </main>;
}
