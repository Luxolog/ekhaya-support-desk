import { createTicketAction } from './actions';

export function TicketForm() {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-[#18324d]">＋ Create a support ticket</summary>
      <form action={createTicketAction} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Customer name<input name="customerName" required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium text-slate-700">Customer email<input name="customerEmail" type="email" required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Subject<input name="subject" required maxLength={180} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium text-slate-700">Priority<select name="priority" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Description<textarea name="description" required rows={4} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <div className="md:col-span-2"><button className="rounded-lg bg-[#18324d] px-5 py-2.5 font-semibold text-white">Create ticket</button></div>
      </form>
    </details>
  );
}
