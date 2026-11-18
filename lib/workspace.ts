import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db';
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
  const rows = await db`
    select wm.workspace_id, w.name as workspace_name, w.slug as workspace_slug,
           wm.role, wm.user_id, u.email, u.name
    from support.workspace_members wm
    join support.workspaces w on w.id = wm.workspace_id
    join neon_auth."user" u on u.id = wm.user_id
    where wm.user_id = ${data.user.id} and wm.is_active = true
    order by wm.created_at asc limit 1
  `;
  if (!rows.length) redirect('/onboarding');
  return { user: data.user, membership: rows[0] as Membership };
}
