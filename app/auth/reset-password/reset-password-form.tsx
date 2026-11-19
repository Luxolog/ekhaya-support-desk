'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';

export function ResetPasswordForm({ token, invalid }: { token: string; invalid: boolean }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (token || invalid) window.history.replaceState({}, '', window.location.pathname);
  }, [token, invalid]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!token || invalid) {
      setError('This reset link is invalid or expired. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError('The reset link may have expired. Request a new password reset link and try again.');
      } else {
        setSuccess(true);
        setPassword('');
        setConfirm('');
      }
    } catch {
      setError('We could not reset your password. Request a new link and try again.');
    } finally {
      setPending(false);
    }
  }

  if (success) return <div className="mt-7 space-y-4"><p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Your password has been updated. You can now sign in with your new password.</p><Link href="/auth/sign-in" className="block rounded-lg bg-[#18324d] px-4 py-3 text-center font-semibold text-white">Continue to sign in</Link></div>;

  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium text-slate-700">New password<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#245b83] focus:ring-2 focus:ring-blue-100"/></label><label className="block text-sm font-medium text-slate-700">Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={event=>setConfirm(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#245b83] focus:ring-2 focus:ring-blue-100"/></label>{(error || invalid || !token)&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || 'This reset link is missing or expired. Request a new one.'}</p>}<button disabled={pending || !token || invalid} className="w-full rounded-lg bg-[#18324d] px-4 py-3 font-semibold text-white disabled:opacity-60">{pending?'Updating…':'Update password'}</button></form>;
}
