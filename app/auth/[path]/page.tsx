import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { AuthForm } from '../auth-form';

export const dynamic = 'force-dynamic';
export const dynamicParams = false;
const allowedPaths = ['sign-in', 'sign-up'];

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!allowedPaths.includes(path)) redirect('/auth/sign-in');
  const { data: session } = await auth.getSession();
  if (session?.user) redirect('/dashboard');
  const signup = path === 'sign-up';
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-bold tracking-wide text-[#18324d]">EKHAYA TECHNOLOGIES</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#b88a43]">Support Desk</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{signup ? 'Create your workspace' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm text-slate-600">{signup ? 'Set up your support team and start managing customer requests.' : 'Sign in to manage your customer conversations.'}</p>
        <AuthForm mode={signup ? 'sign-up' : 'sign-in'} />
        <p className="mt-6 text-center text-xs text-slate-400">Secure account access powered by Neon Managed Auth.</p>
      </section>
    </main>
  );
}
