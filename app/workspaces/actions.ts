'use server';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function switchWorkspaceAction(formData: FormData) {
  const {data}=await auth.getSession();
  if(!data?.user) redirect('/auth/sign-in');
  const workspaceId=String(formData.get('workspaceId')||'');
  const rows=await db`select w.id,wm.role from support.workspace_members wm join support.workspaces w on w.id=wm.workspace_id where wm.user_id=${data.user.id} and wm.workspace_id=${workspaceId} and wm.is_active=true limit 1`;
  if(!rows.length) throw new Error('You are not an active member of that workspace.');
  const jar=await cookies();
  jar.set('ekhaya_active_workspace',workspaceId,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30});
  redirect(rows[0].role==='customer'?'/portal':'/dashboard');
}
