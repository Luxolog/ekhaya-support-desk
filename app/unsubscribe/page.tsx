type Props = { searchParams: Promise<{ token?: string }> };

export const dynamic = 'force-dynamic';

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;
  const validShape = typeof token === 'string' && token.length >= 32 && token.length <= 128 && /^[A-Za-z0-9_-]+$/.test(token);
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-[#18324d]">
      <p className="text-xs font-bold tracking-[.16em] text-[#b88a43]">EKHAYA TECHNOLOGIES</p>
      <h1 className="mt-3 text-2xl font-bold">Marketing unsubscribe</h1>
      {validShape ? (
        <>
          <p className="mt-3 text-sm text-slate-600">Confirm that you want to stop marketing messages on the channel associated with this link. This will not affect service or support messages.</p>
          <form action="/api/marketing/unsubscribe" method="post" className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button className="rounded-lg bg-[#18324d] px-5 py-3 text-sm font-semibold text-white">Confirm unsubscribe</button>
          </form>
          <p className="mt-4 text-xs text-slate-500">The request is recorded only after you confirm. Opening this page alone does not change your preferences.</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">This unsubscribe link is missing or invalid. Please use the latest link in your message or contact the organisation.</p>
      )}
    </main>
  );
}
