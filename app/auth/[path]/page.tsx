import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const dynamicParams = false;

const allowedPaths = ['sign-in', 'sign-up', 'forgot-password', 'reset-password', 'verify-email'];

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!allowedPaths.includes(path)) redirect('/auth/sign-in');

  const { data: session } = await auth.getSession();
  if (session?.user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-blue-950">← Ekhaya Support Desk</Link>
        <h1 className="mt-8 text-2xl font-semibold text-slate-950">{path === 'sign-up' ? 'Create your account' : path === 'forgot-password' ? 'Reset your password' : path === 'verify-email' ? 'Verify your email' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">The authentication interface is being connected to Neon Managed Auth. This page is a safe placeholder until the matching supported UI package is added.</p>
        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Authentication backend is provisioned. Do not enter credentials on this temporary page.</div>
        <p className="mt-6 text-sm text-slate-600"> {path === 'sign-up' ? 'Already registered?' : 'Need an account?'} <Link className="font-semibold text-blue-900 underline" href={path === 'sign-up' ? '/auth/sign-in' : '/auth/sign-up'}>{path === 'sign-up' ? 'Sign in' : 'Sign up'}</Link></p>
      </section>
    </main>
  );
}
