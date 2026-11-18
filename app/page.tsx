import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-950 text-lg font-bold text-white">E</div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-blue-950">EKHAYA TECHNOLOGIES</p>
            <p className="text-xs text-slate-500">Customer support platform</p>
          </div>
        </div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-800">The support workspace</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Every customer conversation, in one place.</h1>
        <p className="mt-5 max-w-xl leading-7 text-slate-600">Ekhaya Support Desk helps teams receive requests, manage tickets and keep customers informed from first message to resolution.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/auth/sign-in" className="rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900">Sign in</Link>
          <Link href="/auth/sign-up" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Create account</Link>
        </div>
        <div className="mt-12 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
          <div><p className="font-semibold text-slate-900">Tickets</p><p className="mt-1 text-sm text-slate-500">Track every request</p></div>
          <div><p className="font-semibold text-slate-900">Teamwork</p><p className="mt-1 text-sm text-slate-500">Assign and collaborate</p></div>
          <div><p className="font-semibold text-slate-900">Visibility</p><p className="mt-1 text-sm text-slate-500">Keep customers updated</p></div>
        </div>
      </section>
    </main>
  );
}
