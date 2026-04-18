import { NextResponse } from 'next/server';
import { features } from '@/lib/features';

/**
 * Health check — always on. Useful for uptime monitors + smoke tests.
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    features,
    time: new Date().toISOString(),
  });
}
