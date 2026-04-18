import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware.
 *
 * Gates /admin behind HTTP Basic Auth when FEATURE_ADMIN=true. Other paths
 * pass through. We intentionally don't use Auth.js here — the admin dashboard
 * is for the founder only, not a user-facing account.
 *
 * Note: process.env reads on the Edge runtime work only for vars prefixed
 * with `NEXT_PUBLIC_` or set explicitly via `runtime: 'nodejs'` in route
 * segments. For the admin gate we read `FEATURE_ADMIN` + `ADMIN_PASSWORD`,
 * both of which Next.js makes available in middleware at request time.
 */

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // If the admin feature isn't enabled, 404 the route entirely.
  if (process.env.FEATURE_ADMIN !== 'true') {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Basic auth gate.
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const [user, pass] = decoded.split(':');
      if (user === 'admin' && pass === process.env.ADMIN_PASSWORD) {
        return NextResponse.next();
      }
    } catch {
      /* fall through to 401 */
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
  });
}

export const config = {
  matcher: '/admin/:path*',
};
