import Link from 'next/link';
import { ResetPasswordForm } from './reset-password-form';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-5 py-12"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><Link href="/" className="text-sm font-bold tracking-wide text-[#18324d]">EKHAYA TECHNOLOGIES</Link><p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#b88a43]">Account recovery</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Choose a new password</h1><p className="mt-2 text-sm text-slate-600">Use a password you have not used on this account before.</p><ResetPasswordForm token={params.token || ''} invalid={Boolean(params.error)}/><p className="mt-6 text-center text-sm"><Link href="/auth/sign-in" className="font-semibold text-[#245b83] underline">Back to sign in</Link></p></section></main>;
}
