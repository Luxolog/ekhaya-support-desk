import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { setupWorkspaceAction, signOutAction } from '@/app/auth/actions';

export const dynamic='force-dynamic';

export default async function OnboardingPage(){
 const {data}=await auth.getSession();
 if(!data?.user) redirect('/auth/sign-in');
 return <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-5"><section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8"><Link href="/" className="text-sm font-bold text-[#18324d]">EKHAYA TECHNOLOGIES</Link><p className="mt-8 text-xs font-bold uppercase tracking-widest text-[#b88a43]">One last step</p><h1 className="mt-2 text-3xl font-semibold">Set up your workspace</h1><p className="mt-2 text-sm text-slate-600">Your account is ready. Give your support workspace a name to continue.</p><form action={setupWorkspaceAction} className="mt-6 space-y-4"><label className="block text-sm font-medium">Workspace name<input name="workspace" required placeholder="e.g. Ekhaya Customer Care" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-3"/></label><button className="w-full rounded-lg bg-[#18324d] px-4 py-3 font-semibold text-white">Create workspace</button></form><form action={signOutAction} className="mt-4 text-center"><button className="text-sm text-slate-500 underline">Sign out</button></form></section></main>;
}
