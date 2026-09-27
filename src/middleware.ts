import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto');

  // 1. Enforce HTTP to HTTPS redirect in production environments
  if (proto === 'http' && process.env.NODE_ENV === 'production') {
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  // 2. CSRF Origin validation on state-changing API requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && url.pathname.startsWith('/api/')) {
    // Exempt webhooks which authenticate via cryptographic signatures (HMAC)
    if (!url.pathname.startsWith('/api/webhooks/')) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const allowedHost = hostname;

      if (origin) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== allowedHost) {
            return NextResponse.json(
              { error: 'Forbidden: Invalid CSRF origin header' },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: 'Forbidden: Malformed CSRF origin' },
            { status: 403 }
          );
        }
      } else if (referer) {
        try {
          const refererHost = new URL(referer).host;
          if (refererHost !== allowedHost) {
            return NextResponse.json(
              { error: 'Forbidden: Invalid CSRF referer header' },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: 'Forbidden: Malformed CSRF referer' },
            { status: 403 }
          );
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
