'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setPending(true);
    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (result.error) {
        setError('We could not process that request. Please try again shortly.');
      } else {
        setMessage('If an account exists for that email, a password reset link will arrive shortly.');
      }
    } catch {
      setError('We could not process that request. Please try again shortly.');
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium text-slate-700">Email address<input type="email" required maxLength={320} autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@company.com" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#245b83] focus:ring-2 focus:ring-blue-100"/></label>{error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}<button disabled={pending} className="w-full rounded-lg bg-[#18324d] px-4 py-3 font-semibold text-white disabled:opacity-60">{pending?'Sending…':'Send reset link'}</button></form>;
}
