'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signInAction, signUpAction } from './actions';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const action = mode === 'sign-in' ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, null);
  const signup = mode === 'sign-up';
  return (
    <form action={formAction} className="mt-7 space-y-4">
      {signup && <Field label="Your name" name="name" placeholder="Your full name" />}
      {signup && <Field label="Workspace name" name="workspace" placeholder="Your business or team" />}
      <Field label="Email address" name="email" type="email" placeholder="you@company.com" />
      <Field label="Password" name="password" type="password" placeholder="8–128 characters" />
      {!signup && <p className="text-right text-sm"><Link className="font-semibold text-[#245b83] underline" href="/auth/forgot-password">Forgot password?</Link></p>}
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-[#18324d] px-4 py-3 font-semibold text-white hover:bg-[#244b70] disabled:opacity-60">
        {pending ? 'Please wait…' : signup ? 'Create workspace' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-slate-500">
        {signup ? 'Already have an account?' : 'New to Ekhaya Support Desk?'}{' '}
        <Link className="font-semibold text-[#245b83] underline" href={signup ? '/auth/sign-in' : '/auth/sign-up'}>
          {signup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}

function Field({ label, name, type = 'text', placeholder }: { label: string; name: string; type?: string; placeholder: string }) {
  const maxLength = name === 'email' ? 320 : name === 'password' ? 128 : 120;
  return <label className="block text-sm font-medium text-slate-700">{label}
    <input name={name} type={type} required maxLength={maxLength}
      minLength={name === 'password' ? 8 : undefined} autoComplete={name === 'password' ? (type === 'password' ? 'current-password' : undefined) : name === 'email' ? 'email' : 'name'}
      placeholder={placeholder}
      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:border-[#245b83] focus:ring-2 focus:ring-blue-100" />
  </label>;
}
