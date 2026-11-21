import Link from 'next/link';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { recordCustomerConsentAction, withdrawCustomerConsentAction } from './actions';

export const dynamic = 'force-dynamic';

type ConsentEvent = {
  id: string; subject_name: string; contact: string | null; record_type: string;
  channel: string; consent_status: string; consent_text: string | null;
  source: string | null; recorded_at: Date | string; recorded_by_name: string | null;
};
type Customer = { id: string; display_name: string; email: string | null; phone: string | null };
type CampaignPreview = {
  id: string; name: string; channel: string; status: string;
  eligible: number; withdrawn: number; unknown_or_missing: number;
  eligible_customers: number; withdrawn_customers: number; unknown_or_missing_customers: number;
};

export default async function ConsentAuditPage() {
  const { membership } = await requireMembership();
  if (!['admin', 'support_agent'].includes(membership.role)) {
    return <main className="p-8">Not permitted. <Link href="/dashboard">Back</Link></main>;
  }

  const [events, previews, customers] = await Promise.all([
    db`select mc.id, coalesce(l.full_name, cu.display_name) as subject_name,
               coalesce(l.email, cu.email) as email, coalesce(l.phone, cu.phone) as phone,
               case when mc.lead_id is not null then 'Lead' else 'Customer' end as record_type,
               mc.channel, mc.consent_status, mc.consent_text, mc.source, mc.recorded_at,
               u.name as recorded_by_name
        from support.marketing_consents mc
        left join support.leads l on l.id = mc.lead_id and l.workspace_id = mc.workspace_id
        left join support.customers cu on cu.id = mc.customer_id and cu.workspace_id = mc.workspace_id
        left join neon_auth."user" u on u.id = mc.recorded_by
        where mc.workspace_id = ${membership.workspace_id}
        order by mc.recorded_at desc, mc.id desc
        limit 250`,
    db`select c.id, c.name, c.channel, c.status,
          coalesce(p.eligible, 0)::int as eligible,
          coalesce(p.withdrawn, 0)::int as withdrawn,
          coalesce(p.unknown_or_missing, 0)::int as unknown_or_missing,
          coalesce(p.eligible_customers, 0)::int as eligible_customers,
          coalesce(p.withdrawn_customers, 0)::int as withdrawn_customers,
          coalesce(p.unknown_or_missing_customers, 0)::int as unknown_or_missing_customers
        from support.marketing_campaigns c
        left join lateral (
          with latest as (
            select distinct on (mc.lead_id) mc.lead_id, mc.consent_status
            from support.marketing_consents mc
            where mc.workspace_id = c.workspace_id and mc.channel = c.channel and mc.lead_id is not null
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
          where l.workspace_id = c.workspace_id and c.channel in ('email','whatsapp','sms')
        ) lead_preview on true
        left join lateral (
          with latest as (
            select distinct on (mc.customer_id) mc.customer_id, mc.consent_status
            from support.marketing_consents mc
            where mc.workspace_id = c.workspace_id and mc.channel = c.channel and mc.customer_id is not null
            order by mc.customer_id, mc.recorded_at desc, mc.id desc
          )
          select
            count(*) filter (where latest.consent_status = 'granted'
              and ((c.channel = 'email' and nullif(trim(cu.email), '') is not null)
                or (c.channel in ('whatsapp','sms') and nullif(trim(cu.phone), '') is not null))) as eligible_customers,
            count(*) filter (where latest.consent_status = 'withdrawn') as withdrawn_customers,
            count(*) filter (where latest.customer_id is null
              or (latest.consent_status = 'granted'
                and ((c.channel = 'email' and nullif(trim(cu.email), '') is null)
                  or (c.channel in ('whatsapp','sms') and nullif(trim(cu.phone), '') is null)))) as unknown_or_missing_customers
          from support.customers cu
          left join latest on latest.customer_id = cu.id
          where cu.workspace_id = c.workspace_id and c.channel in ('email','whatsapp','sms')
        ) customer_preview on true
        cross join lateral (
          select lead_preview.eligible, lead_preview.withdrawn, lead_preview.unknown_or_missing,
                 customer_preview.eligible_customers, customer_preview.withdrawn_customers,
                 customer_preview.unknown_or_missing_customers
        ) p
        where c.workspace_id = ${membership.workspace_id}
        order by c.created_at desc
        limit 100`,
    db`select c.id,c.display_name,c.email,c.phone from support.customers c
        where c.workspace_id = ${membership.workspace_id}
        order by c.display_name asc limit 100`
  ]);

  const rows = events as unknown as ConsentEvent[];
  const campaignRows = previews as unknown as CampaignPreview[];
  const customerRows = customers as unknown as Customer[];
  return (
    <main className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div><p className="text-xs font-bold tracking-[.16em] text-[#b88a43]">MARKETING GOVERNANCE</p><h1 className="text-xl font-bold text-[#18324d]">Consent audit & recipient checks</h1><p className="text-sm text-slate-500">Workspace-only consent history and non-sending eligibility previews</p></div>
        <Link href="/dashboard" className="rounded-lg border px-4 py-2 text-sm">Back to dashboard</Link>
      </div></header>
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Campaign recipient eligibility preview</h2>
          <p className="mt-1 text-sm text-slate-500">Counts are split between leads and existing customers. Each uses the latest consent event for that record and campaign channel, and requires a matching email or phone contact.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Campaign</th><th className="p-3">Channel</th><th className="p-3">Status</th><th className="p-3">Eligible leads</th><th className="p-3">Withdrawn leads</th><th className="p-3">Unknown / missing leads</th><th className="p-3">Eligible customers</th><th className="p-3">Withdrawn customers</th><th className="p-3">Unknown / missing customers</th></tr></thead><tbody>
            {campaignRows.map(c => <tr key={c.id} className="border-t"><td className="p-3 font-medium">{c.name}</td><td className="p-3 uppercase">{c.channel}</td><td className="p-3 capitalize">{c.status.replace('_',' ')}</td><td className="p-3 font-semibold text-emerald-700">{c.channel === 'social' ? 'N/A' : c.eligible}</td><td className="p-3">{c.channel === 'social' ? 'N/A' : c.withdrawn}</td><td className="p-3">{c.channel === 'social' ? 'N/A' : c.unknown_or_missing}</td><td className="p-3 font-semibold text-emerald-700">{c.channel === 'social' ? 'N/A' : c.eligible_customers}</td><td className="p-3">{c.channel === 'social' ? 'N/A' : c.withdrawn_customers}</td><td className="p-3">{c.channel === 'social' ? 'N/A' : c.unknown_or_missing_customers}</td></tr>)}
          </tbody></table></div>
          {!campaignRows.length && <p className="py-5 text-sm text-slate-500">No campaigns to preview yet.</p>}
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This is a planning snapshot, not send authorization. Recheck consent immediately before any future delivery; delivery remains disabled.</p>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Existing customer consent management</h2>
          <p className="mt-1 text-sm text-slate-500">Record only explicit, evidenced channel consent. These actions do not change consent for other channels.</p>
          <div className="mt-4 divide-y">{customerRows.map(c => <article key={c.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{c.display_name}</p><p className="text-xs text-slate-500">{c.email || 'No email'} · {c.phone || 'No phone'}</p></div></div><div className="mt-3 grid gap-3 md:grid-cols-3">{(['email','whatsapp','sms'] as const).map(channel => {
            const hasContact = channel === 'email' ? Boolean(c.email) : Boolean(c.phone);
            return <div key={channel} className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase">{channel}</p><form action={recordCustomerConsentAction} className="mt-2 grid gap-2"><input type="hidden" name="customerId" value={c.id}/><input type="hidden" name="channel" value={channel}/><input name="consentText" required maxLength={1000} placeholder="Exact consent wording" className="min-w-0 rounded border px-2 py-2 text-xs"/><input name="source" required maxLength={80} placeholder="Evidence source" className="min-w-0 rounded border px-2 py-2 text-xs"/><label className="flex items-start gap-2 text-xs"><input type="checkbox" name="confirmConsent" required className="mt-0.5"/>I confirm explicit consent was given for this channel.</label><button disabled={!hasContact} className="rounded bg-[#18324d] px-3 py-2 text-xs text-white disabled:opacity-40">Record consent</button></form><form action={withdrawCustomerConsentAction} className="mt-2 flex gap-2"><input type="hidden" name="customerId" value={c.id}/><input type="hidden" name="channel" value={channel}/><input name="source" maxLength={80} placeholder="Withdrawal source" className="min-w-0 flex-1 rounded border px-2 py-2 text-xs"/><button disabled={!hasContact} className="rounded border border-rose-200 px-2 py-2 text-xs text-rose-700 disabled:opacity-40">Withdraw</button></form>{!hasContact && <p className="mt-2 text-xs text-rose-700">No matching contact detail.</p>}</div>;
          })}</div></article>)}</div>
          {!customerRows.length && <p className="py-6 text-sm text-slate-500">No customer records found in this workspace.</p>}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Consent event history</h2><p className="text-sm text-slate-500">Latest 250 events · newest first · grants and withdrawals retained</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{rows.length} records</span></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Record</th><th className="p-3">Channel</th><th className="p-3">Event</th><th className="p-3">Evidence / source</th><th className="p-3">Recorded by</th><th className="p-3">Date</th></tr></thead><tbody>
            {rows.map(e => <tr key={e.id} className="border-t align-top"><td className="p-3"><p className="font-medium">{e.subject_name}</p><p className="text-xs text-slate-500">{e.record_type} · {e.contact}</p></td><td className="p-3 uppercase">{e.channel}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${e.consent_status === 'granted' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{e.consent_status}</span></td><td className="max-w-sm p-3"><p className="whitespace-pre-wrap">{e.consent_text || 'Withdrawal recorded'}</p><p className="mt-1 text-xs text-slate-500">Source: {e.source || 'Not specified'}</p></td><td className="p-3">{e.recorded_by_name || 'Former user'}</td><td className="whitespace-nowrap p-3">{new Date(e.recorded_at).toLocaleString()}</td></tr>)}
          </tbody></table></div>
          {!rows.length && <p className="py-8 text-sm text-slate-500">No channel-specific consent events recorded yet.</p>}
        </section>
        <p className="text-xs text-slate-500">Consent evidence is staff-recorded and should be checked against the original source. This screen does not certify legal compliance or independently verify consent.</p>
      </div>
    </main>
  );
}
