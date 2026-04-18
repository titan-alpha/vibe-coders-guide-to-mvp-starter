import { handlers } from '@/lib/auth';
import { features } from '@/lib/features';
import { NextResponse } from 'next/server';

/**
 * Auth.js route handlers. Only served when FEATURE_AUTH=true.
 */

async function disabled() {
  return NextResponse.json({ error: 'Auth is disabled.' }, { status: 404 });
}

export const GET = features.auth ? handlers.GET : disabled;
export const POST = features.auth ? handlers.POST : disabled;
