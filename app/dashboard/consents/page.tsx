import Link from 'next/link';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type ConsentEvent = {
  id: string; lead_name: string; email: string | null; phone: string | null;
  channel: string; consent_status: string; consent_text: string | null;
  source: string | null; recorded_at: Date | string; recorded_by_name: string | null;
};
type CampaignPreview = {
  id: string; name: string; channel: string; status: string;
  eligible: number; withdrawn: number; unknown_or_missing: number;
};

export default async function ConsentAuditPage() {
  const { membership } = await requireMembership();
  if (!['admin', 'support_agent'].includes(membership.role)) {
    return <main className="p-8">Not permitted. <Link href="/dashboard">Back</Link></main>;
  }

  const [events, previews] = await Promise.all([
    db`select mc.id, l.full_name as lead_name, l.email, l.phone, mc.channel,
               mc.consent_status, mc.consent_text, mc.source, mc.recorded_at,
               u.name as recorded_by_name
        from support.marketing_consents mc
        join support.leads l on l.id = mc.lead_id and l.workspace_id = mc.workspace_id
        left join neon_auth."user" u on u.id = mc.recorded_by
        where mc.workspace_id = ${membership.workspace_id}
        order by mc.recorded_at desc, mc.id desc
        limit 200`,
    db`select c.id, c.name, c.channel, c.status,
          coalesce(p.eligible, 0)::int as eligible,
          coalesce(p.withdrawn, 0)::int as withdrawn,
          coalesce(p.unknown_or_missing, 0)::int as unknown_or_missing
        from support.marketing_campaigns c
        left join lateral (
          with latest as (
            select distinct on (mc.lead_id) mc.lead_id, mc.consent_status
            from support.marketing_consents mc
            where mc.workspace_id = c.workspace_id and mc.channel = c.channel
            order by mc.lead_id, mc.recorded_at desc, mc.id desc
          )
          select
            count(*) filter (where latest.consent_status = 'granted'
              and ((c.channel = 'email' and nullif(trim(l.email), '') is not null)
                or (c.channel in ('whatsapp','sms') and nullif(trim(l.phone), '') is not null))) as eligible,
            count(*) filter (where latest.consent_status = 'withdrawn') as withdrawn,
            count(*) filter (where latest.lead_id is null
              or (latest.consent_status = 'granted'
                and ((c.channel = 'email' and nullif(trim(l.email), '') is null)
                  or (c.channel in ('whatsapp','sms') and nullif(trim(l.phone), '') is null)))) as unknown_or_missing
          from support.leads l
          left join latest on latest.lead_id = l.id
          where l.workspace_id = c.workspace_id
            and c.channel in ('email','whatsapp','sms')
        ) p on true
        where c.workspace_id = ${membership.workspace_id}
        order by c.created_at desc
        limit 100`
  ]);

  const rows = events as unknown as ConsentEvent[];
  const campaignRows = previews as unknown as CampaignPreview[];
  return (
    <main className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div><p className="text-xs font-bold tracking-[.16em] text-[#b88a43]">MARKETING GOVERNANCE</p><h1 className="text-xl font-bold text-[#18324d]">Consent audit & recipient checks</h1><p className="text-sm text-slate-500">Workspace-only consent history and non-sending eligibility previews</p></div>
        <Link href="/dashboard" className="rounded-lg border px-4 py-2 text-sm">Back to dashboard</Link>
      </div></header>
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Campaign recipient eligibility preview</h2>
          <p className="mt-1 text-sm text-slate-500">Counts are calculated from the latest consent event for each lead and campaign channel. No names, contact details, exports or messages are exposed here.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Campaign</th><th className="p-3">Channel</th><th className="p-3">Status</th><th className="p-3">Eligible</th><th className="p-3">Withdrawn</th><th className="p-3">Unknown / missing</th></tr></thead><tbody>
            {campaignRows.map(c => <tr key={c.id} className="border-t"><td className="p-3 font-medium">{c.name}</td><td className="p-3 uppercase">{c.channel}</td><td className="p-3 capitalize">{c.status.replace('_',' ')}</td><td className="p-3 font-semibold text-emerald-700">{c.channel === 'social' ? 'N/A' : c.eligible}</td><td className="p-3">{c.channel === 'social' ? 'N/A' : c.withdrawn}</td><td className="p-3">{c.channel === 'social' ? 'N/A' : c.unknown_or_missing}</td></tr>)}
          </tbody></table></div>
          {!campaignRows.length && <p className="py-5 text-sm text-slate-500">No campaigns to preview yet.</p>}
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This is a planning snapshot, not send authorization. Recheck consent immediately before any future delivery; delivery remains disabled.</p>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Consent event history</h2><p className="text-sm text-slate-500">Latest 200 events · newest first · grants and withdrawals retained</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{rows.length} records</span></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Lead</th><th className="p-3">Channel</th><th className="p-3">Event</th><th className="p-3">Evidence / source</th><th className="p-3">Recorded by</th><th className="p-3">Date</th></tr></thead><tbody>
            {rows.map(e => <tr key={e.id} className="border-t align-top"><td className="p-3"><p className="font-medium">{e.lead_name}</p><p className="text-xs text-slate-500">{e.channel === 'email' ? e.email : e.phone}</p></td><td className="p-3 uppercase">{e.channel}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${e.consent_status === 'granted' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{e.consent_status}</span></td><td className="max-w-sm p-3"><p className="whitespace-pre-wrap">{e.consent_text || 'Withdrawal recorded'}</p><p className="mt-1 text-xs text-slate-500">Source: {e.source || 'Not specified'}</p></td><td className="p-3">{e.recorded_by_name || 'Former user'}</td><td className="whitespace-nowrap p-3">{new Date(e.recorded_at).toLocaleString()}</td></tr>)}
          </tbody></table></div>
          {!rows.length && <p className="py-8 text-sm text-slate-500">No channel-specific consent events recorded yet.</p>}
        </section>
        <p className="text-xs text-slate-500">Consent evidence is staff-recorded and should be checked against the original source. This screen does not certify legal compliance or independently verify consent.</p>
      </div>
    </main>
  );
}
