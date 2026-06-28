import { NextResponse } from 'next/server';
import { getFollowups } from '@/lib/followups';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const overdueOnly = url.searchParams.get('overdueOnly') === '1';
  const data = getFollowups({ overdueOnly });
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
  });
}
