import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db`select 1 as ready`;
    return Response.json(
      { ok: true, service: 'ekhaya-support-desk', checks: { database: 'ok' } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { ok: false, service: 'ekhaya-support-desk', checks: { database: 'unavailable' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
