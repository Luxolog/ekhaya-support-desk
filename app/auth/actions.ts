'use server';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

export async function signInAction(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  if (!email || !password) return { error: 'Enter your email and password.' };
  const { error } = await auth.signIn.email({ email, password });
  if (error) return { error: error.message || 'Unable to sign in.' };
  redirect('/dashboard');
}

export async function signUpAction(_prev: { error?: string } | null, formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const workspaceName = String(formData.get('workspace') || '').trim();
  if (!name || !email || !workspaceName || password.length < 8) {
    return { error: 'Complete all fields. Password must be at least 8 characters.' };
  }
  const { data, error } = await auth.signUp.email({ name, email, password });
  if (error) return { error: error.message || 'Unable to create account.' };

  const userId = data?.user?.id;
  if (!userId) return { error: 'Account created. Please sign in to finish workspace setup.' };

  const base = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'workspace';
  const slug = base + '-' + crypto.randomUUID().slice(0, 8);
  const workspaceRows = await db`
    insert into support.workspaces (name, slug) values (${workspaceName}, ${slug})
    returning id
  `;
  await db`
    insert into support.workspace_members (workspace_id, user_id, role, is_active)
    values (${workspaceRows[0].id}, ${userId}, 'admin', true)
  `;
  redirect('/dashboard');
}

export async function signOutAction() {
  await auth.signOut();
  redirect('/auth/sign-in');
}
