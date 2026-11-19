import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type Membership = {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  role: 'admin' | 'support_agent' | 'customer';
  user_id: string;
  email: string;
  name: string;
};

export async function requireMembership() {
  const { data } = await auth.getSession();
  if (!data?.user) redirect('/auth/sign-in');

  const cookieStore = await cookies();
  const activeWorkspace = cookieStore.get('ekhaya_active_workspace')?.value;
  const all = await db`
    select wm.workspace_id, w.name as workspace_name, w.slug as workspace_slug,
           wm.role, wm.user_id, u.email, u.name
    from support.workspace_members wm
    join support.workspaces w on w.id = wm.workspace_id
    join neon_auth."user" u on u.id = wm.user_id
    where wm.user_id = ${data.user.id} and wm.is_active = true
    order by wm.created_at asc
  `;

  if (!all.length) {
    cookieStore.delete('ekhaya_active_workspace');
    redirect('/onboarding');
  }

  const selected = activeWorkspace
    ? all.find((item: any) => item.workspace_id === activeWorkspace)
    : undefined;

  // Repair stale or forged workspace cookies by selecting a verified membership.
  const membership = selected || all[0];
  if (!selected) {
    cookieStore.set('ekhaya_active_workspace', membership.workspace_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return {
    user: data.user,
    membership: membership as Membership,
    memberships: all as Membership[],
  };
}
