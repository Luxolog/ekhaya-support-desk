import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/auth/sign-in');

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div><p className="text-sm font-semibold text-blue-950">EKHAYA TECHNOLOGIES</p><h1 className="mt-1 text-2xl font-semibold">Support Desk</h1></div>
        <div className="text-sm text-slate-600">Signed in as {session.user.email}</div>
      </header>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Your workspace</h2>
        <p className="mt-2 text-slate-600">The secure dashboard shell is in place. Workspace provisioning, ticket queues and role-aware views are the next build layer.</p>
      </section>
    </main>
  );
}
