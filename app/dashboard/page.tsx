import Link from 'next/link';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { signOutAction } from '@/app/auth/actions';
import { TicketForm } from './ticket-form';
import { addWorkspaceMemberAction, manageWorkspaceMemberAction } from './actions';

export const dynamic = 'force-dynamic';

type DashboardTicket = {
  id: string;
  ticket_number: number | string;
  subject: string;
  status: string;
  priority: string;
  created_at: Date | string;
  customer_name: string;
  customer_email: string | null;
  assignee_name: string | null;
};
type DashboardAgent = { id: string; name: string | null; email: string; role: string };

const statusLabel: Record<string,string> = { open:'Open', in_progress:'In progress', waiting_on_customer:'Waiting on customer', resolved:'Resolved', closed:'Closed' };
const statusClass: Record<string,string> = { open:'bg-blue-50 text-blue-700', in_progress:'bg-amber-50 text-amber-700', waiting_on_customer:'bg-violet-50 text-violet-700', resolved:'bg-emerald-50 text-emerald-700', closed:'bg-slate-100 text-slate-600' };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; priority?: string; assigned?: string }> }) {
  const { user, membership, memberships } = await requireMembership();
  const params = await searchParams;
  const allowedStatuses = ['open','in_progress','waiting_on_customer','resolved','closed'];
  const allowedPriorities = ['low','normal','high','urgent'];
  const status = allowedStatuses.includes(params.status || '') ? params.status! : 'all';
  const priority = allowedPriorities.includes(params.priority || '') ? params.priority! : 'all';
  const assigned = ['mine','unassigned','all'].includes(params.assigned || '') ? params.assigned! : 'all';
  const search = String(params.q || '').trim().slice(0, 100);
  if (membership.role === 'customer') return <main className="p-10"><p>Customer account</p><Link href="/portal">Open customer portal</Link></main>;
  const [stats, tickets, agents] = await Promise.all([
    db`select count(*)::int as total, count(*) filter (where status in ('open','in_progress'))::int as active, count(*) filter (where status='waiting_on_customer')::int as waiting, count(*) filter (where status in ('resolved','closed'))::int as resolved from support.tickets where workspace_id=${membership.workspace_id}`,
    db`select t.id, t.ticket_number, t.subject, t.status, t.priority, t.created_at, c.display_name as customer_name, c.email as customer_email, u.name as assignee_name
       from support.tickets t join support.customers c on c.id=t.customer_id
       left join neon_auth."user" u on u.id=t.assigned_to
       where t.workspace_id=${membership.workspace_id}
         and (${status === 'all'} or t.status=${status})
         and (${priority === 'all'} or t.priority=${priority})
         and (${assigned === 'all'} or (${assigned === 'unassigned'} and t.assigned_to is null) or (${assigned === 'mine'} and t.assigned_to=${user.id}))
         and (${!search} or t.subject ilike ${'%' + search + '%'} or c.display_name ilike ${'%' + search + '%'} or c.email ilike ${'%' + search + '%'} or t.ticket_number::text ilike ${'%' + search + '%'})
       order by t.updated_at desc limit 100`,
    db`select u.id, u.name, u.email, wm.role from support.workspace_members wm join neon_auth."user" u on u.id=wm.user_id where wm.workspace_id=${membership.workspace_id} and wm.is_active=true order by wm.created_at`
  ]);
  const s = stats[0] || {total:0,active:0,waiting:0,resolved:0};
  const ticketRows = tickets as unknown as DashboardTicket[];
  const agentRows = agents as unknown as DashboardAgent[];
  return (
    <main className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div><p className="text-xs font-bold tracking-[.16em] text-[#b88a43]">EKHAYA TECHNOLOGIES</p><h1 className="text-xl font-bold text-[#18324d]">Support Desk</h1></div>
        <div className="flex items-center gap-3 text-sm"><Link href="/dashboard/leads" className="rounded-lg border border-slate-300 px-3 py-2">Enquiries & leads</Link><Link href="/dashboard/knowledge" className="rounded-lg border border-slate-300 px-3 py-2">Knowledge base</Link><Link href="/dashboard/campaigns" className="rounded-lg border border-slate-300 px-3 py-2">Campaigns</Link><Link href="/dashboard/consents" className="rounded-lg border border-slate-300 px-3 py-2">Consent audit</Link><Link href="/dashboard/reports" className="rounded-lg border border-slate-300 px-3 py-2">Reports</Link>{membership.role === 'admin' && <Link href="/dashboard/settings" className="rounded-lg border border-slate-300 px-3 py-2">Settings</Link>}<div className="text-right"><p className="font-semibold text-slate-800">{membership.workspace_name}</p><p className="text-slate-500">{user.email} · {membership.role}</p></div>{memberships.length > 1 && <Link href="/workspaces" className="rounded-lg border border-slate-300 px-3 py-2">Switch workspace</Link>}<form action={signOutAction}><button className="rounded-lg border border-slate-300 px-3 py-2">Sign out</button></form></div>
      </div></header>
      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#245b83]">Workspace overview</p><h2 className="mt-1 text-3xl font-semibold text-slate-950">Good day, {user.name || 'there'}</h2><p className="mt-1 text-slate-500">Manage customer requests and keep every conversation moving.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['All tickets',s.total],['Active tickets',s.active],['Waiting on customer',s.waiting],['Resolved / closed',s.resolved]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#18324d]">{value}</p></div>)}</div>
        <TicketForm />
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h3 className="font-semibold text-slate-900">Ticket queue</h3><p className="text-sm text-slate-500">Search and filter your workspace tickets</p></div><span className="text-sm text-slate-500">{tickets.length} shown · up to 100</span></div><form method="get" className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-4"><input name="q" defaultValue={search} maxLength={100} placeholder="Search ticket, customer or number" className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"/><select name="status" defaultValue={status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All statuses</option>{Object.entries(statusLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select name="priority" defaultValue={priority} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All priorities</option>{['low','normal','high','urgent'].map(v=><option key={v} value={v}>{v}</option>)}</select><select name="assigned" defaultValue={assigned} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All assignments</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option></select><button className="rounded-lg bg-[#18324d] px-4 py-2 text-sm font-semibold text-white">Filter</button><Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Clear</Link></form>
          {tickets.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Ticket</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Priority</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Assigned to</th></tr></thead><tbody>{ticketRows.map((t)=><tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4"><Link className="font-semibold text-[#245b83] hover:underline" href={`/dashboard/tickets/${t.id}`}>#{t.ticket_number} · {t.subject}</Link><p className="mt-1 text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}</p></td><td className="px-5 py-4"><p className="font-medium text-slate-800">{t.customer_name}</p><p className="text-xs text-slate-500">{t.customer_email}</p></td><td className="px-5 py-4 capitalize">{t.priority}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[t.status] || statusClass.open}`}>{statusLabel[t.status] || t.status}</span></td><td className="px-5 py-4 text-slate-600">{t.assignee_name || 'Unassigned'}</td></tr>)}</tbody></table></div> : <div className="p-10 text-center"><p className="font-semibold text-slate-800">No tickets yet</p><p className="mt-1 text-sm text-slate-500">Create your first ticket using the form above.</p></div>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">Workspace team</h3>{membership.role === 'admin' && <form action={addWorkspaceMemberAction} className="flex flex-wrap gap-2"><input name="email" type="email" required placeholder="Registered user email" className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm"/><select name="role" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="support_agent">Support agent</option><option value="customer">Customer</option></select><button className="rounded-lg bg-[#18324d] px-3 py-2 text-sm font-semibold text-white">Add member</button></form>}</div><p className="mt-1 text-xs text-slate-500">Users must register first, then an admin can add them to this workspace.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{agentRows.map((a)=><div key={a.id} className="rounded-lg bg-slate-50 p-3"><p className="font-medium text-slate-800">{a.name || 'Unnamed user'}</p><p className="text-sm text-slate-500">{a.email}</p><p className="mt-1 text-xs capitalize text-[#245b83]">{a.role.replace('_',' ')}</p>{membership.role === 'admin' && a.id !== user.id && <form action={manageWorkspaceMemberAction} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="memberId" value={a.id}/><select name="role" defaultValue={a.role} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"><option value="admin">Admin</option><option value="support_agent">Support agent</option><option value="customer">Customer</option></select><button name="memberAction" value="update_role" className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold">Save</button><button name="memberAction" value="deactivate" formAction={manageWorkspaceMemberAction} className="rounded-lg border border-red-200 bg-white px-2 py-2 text-xs font-semibold text-red-700">Deactivate</button></form>}</div>)}</div></section>
      </div>
    </main>
  );
}
