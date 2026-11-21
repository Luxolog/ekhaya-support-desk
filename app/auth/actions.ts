'use server';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD_LENGTH = 128;

function validEmail(email: string) {
  return email.length <= 320 && EMAIL_PATTERN.test(email);
}

function workspaceSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'workspace';
  return base + '-' + crypto.randomUUID().slice(0, 8);
}

export async function signInAction(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  if (!validEmail(email) || !password || password.length > MAX_PASSWORD_LENGTH) {
    return { error: 'Enter a valid email address and password.' };
  }
  const { error } = await auth.signIn.email({ email, password });
  if (error) return { error: 'Unable to sign in with those details. Check them and try again.' };
  redirect('/dashboard');
}

export async function signUpAction(_prev: { error?: string } | null, formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const workspaceName = String(formData.get('workspace') || '').trim();

  if (!name || name.length > 120 || !validEmail(email) || !workspaceName || workspaceName.length > 120 ||
      password.length < 8 || password.length > MAX_PASSWORD_LENGTH) {
    return { error: 'Check your details. Names must be 120 characters or fewer, use a valid email, and choose a password between 8 and 128 characters.' };
  }

  const { data, error } = await auth.signUp.email({ name, email, password });
  if (error) return { error: 'Unable to create the account. Check your details or try signing in.' };

  const userId = data?.user?.id;
  if (!userId) return { error: 'Your account may have been created. Please sign in and complete workspace setup.' };

  const slug = workspaceSlug(workspaceName);
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

export async function setupWorkspaceAction(formData: FormData) {
  const { data } = await auth.getSession();
  if (!data?.user) redirect('/auth/sign-in');
  const workspaceName = String(formData.get('workspace') || '').trim();
  if (!workspaceName || workspaceName.length > 120) throw new Error('Workspace name is required and must be 120 characters or fewer.');

  const existing = await db`select workspace_id from support.workspace_members where user_id=${data.user.id} and is_active=true limit 1`;
  if (existing.length) redirect('/dashboard');

  const slug = workspaceSlug(workspaceName);
  const workspace = await db`insert into support.workspaces (name,slug) values (${workspaceName},${slug}) returning id`;
  await db`insert into support.workspace_members (workspace_id,user_id,role,is_active) values (${workspace[0].id},${data.user.id},'admin',true)`;
  redirect('/dashboard');
}
