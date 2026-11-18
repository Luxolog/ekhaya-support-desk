import Link from 'next/link';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { signOutAction } from '@/app/auth/actions';
import { TicketForm } from './ticket-form';
import { addWorkspaceMemberAction } from './actions';

export const dynamic = 'force-dynamic';

const statusLabel: Record<string,string> = { open:'Open', in_progress:'In progress', waiting_on_customer:'Waiting on customer', resolved:'Resolved', closed:'Closed' };
const statusClass: Record<string,string> = { open:'bg-blue-50 text-blue-700', in_progress:'bg-amber-50 text-amber-700', waiting_on_customer:'bg-violet-50 text-violet-700', resolved:'bg-emerald-50 text-emerald-700', closed:'bg-slate-100 text-slate-600' };

export default async function DashboardPage() {
  const { user, membership } = await requireMembership();
  if (membership.role === 'customer') return <main className="p-10"><p>Customer account</p><Link href="/portal">Open customer portal</Link></main>;
  const [stats, tickets, agents] = await Promise.all([
    db`select count(*)::int as total, count(*) filter (where status in ('open','in_progress'))::int as active, count(*) filter (where status='waiting_on_customer')::int as waiting, count(*) filter (where status in ('resolved','closed'))::int as resolved from support.tickets where workspace_id=${membership.workspace_id}`,
    db`select t.id, t.ticket_number, t.subject, t.status, t.priority, t.created_at, c.display_name as customer_name, c.email as customer_email, u.name as assignee_name
       from support.tickets t join support.customers c on c.id=t.customer_id
       left join neon_auth."user" u on u.id=t.assigned_to
       where t.workspace_id=${membership.workspace_id}
       order by t.updated_at desc limit 50`,
    db`select u.id, u.name, u.email, wm.role from support.workspace_members wm join neon_auth."user" u on u.id=wm.user_id where wm.workspace_id=${membership.workspace_id} and wm.is_active=true and wm.role in ('admin','support_agent') order by wm.created_at`
  ]);
  const s = stats[0] || {total:0,active:0,waiting:0,resolved:0};
  return (
    <main className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div><p className="text-xs font-bold tracking-[.16em] text-[#b88a43]">EKHAYA TECHNOLOGIES</p><h1 className="text-xl font-bold text-[#18324d]">Support Desk</h1></div>
        <div className="flex items-center gap-4 text-sm"><div className="text-right"><p className="font-semibold text-slate-800">{membership.workspace_name}</p><p className="text-slate-500">{user.email} · {membership.role}</p></div><form action={signOutAction}><button className="rounded-lg border border-slate-300 px-3 py-2">Sign out</button></form></div>
      </div></header>
      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#245b83]">Workspace overview</p><h2 className="mt-1 text-3xl font-semibold text-slate-950">Good day, {user.name || 'there'}</h2><p className="mt-1 text-slate-500">Manage customer requests and keep every conversation moving.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['All tickets',s.total],['Active tickets',s.active],['Waiting on customer',s.waiting],['Resolved / closed',s.resolved]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#18324d]">{value}</p></div>)}</div>
        <TicketForm />
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h3 className="font-semibold text-slate-900">Recent tickets</h3><p className="text-sm text-slate-500">Latest activity in your workspace</p></div><span className="text-sm text-slate-500">{tickets.length} shown</span></div>
          {tickets.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Ticket</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Priority</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Assigned to</th></tr></thead><tbody>{tickets.map((t:any)=><tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4"><Link className="font-semibold text-[#245b83] hover:underline" href={`/dashboard/tickets/${t.id}`}>#{t.ticket_number} · {t.subject}</Link><p className="mt-1 text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}</p></td><td className="px-5 py-4"><p className="font-medium text-slate-800">{t.customer_name}</p><p className="text-xs text-slate-500">{t.customer_email}</p></td><td className="px-5 py-4 capitalize">{t.priority}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[t.status] || statusClass.open}`}>{statusLabel[t.status] || t.status}</span></td><td className="px-5 py-4 text-slate-600">{t.assignee_name || 'Unassigned'}</td></tr>)}</tbody></table></div> : <div className="p-10 text-center"><p className="font-semibold text-slate-800">No tickets yet</p><p className="mt-1 text-sm text-slate-500">Create your first ticket using the form above.</p></div>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">Workspace team</h3>{membership.role === 'admin' && <form action={addWorkspaceMemberAction} className="flex flex-wrap gap-2"><input name="email" type="email" required placeholder="Registered user email" className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm"/><select name="role" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="support_agent">Support agent</option><option value="customer">Customer</option></select><button className="rounded-lg bg-[#18324d] px-3 py-2 text-sm font-semibold text-white">Add member</button></form>}</div><p className="mt-1 text-xs text-slate-500">Users must register first, then an admin can add them to this workspace.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{agents.map((a:any)=><div key={a.id} className="rounded-lg bg-slate-50 p-3"><p className="font-medium text-slate-800">{a.name}</p><p className="text-sm text-slate-500">{a.email}</p><p className="mt-1 text-xs capitalize text-[#245b83]">{a.role.replace('_',' ')}</p></div>)}</div></section>
      </div>
    </main>
  );
}
