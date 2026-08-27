import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isTokenDenied, rateLimit } from './lib/redis';

// Admin level policy lives in its own module so a test can assert it stays exhaustive over
// the filesystem. See the comment there for why the default is level 5.
import { requiredAdminLevel } from './lib/adminRouteLevels';
import { geoDecision, geoRestrictMode, readGeo } from './lib/geoRestrict';

function isAuthed(token) {
  return Boolean(token?.userId) && token.isActive !== false && Number(token.level) >= 1;
}


function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function loginRedirect(request, pathname) {
  const login = new URL('/login', request.url);
  if (pathname.startsWith('/') && !pathname.startsWith('//')) {
    login.searchParams.set('callbackUrl', pathname);
  }
  return NextResponse.redirect(login);
}

function tooMany(retryAfter = 60) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

function geoForbidden(pathname) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return new NextResponse('This application is only available from New York State.', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const failClosed = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

  // WAF Challenge/Log happen in front of this process. The proxy only enforces
  // a hard deny, and only when GEO_RESTRICT=deny, so a log-mode misconfig cannot
  // skip the session gate below by returning NextResponse.next() early.
  if (geoDecision(readGeo(request.headers), geoRestrictMode()) === 'deny') {
    return geoForbidden(pathname);
  }

  // Public pages are in the matcher so the NY gate above can cover them. They must
  // skip the session redirect or /login loops into itself.
  if (pathname === '/' || pathname === '/login' || pathname === '/about') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth')) {
    if (request.method === 'POST') {
      const limited = await rateLimit(`rl:auth:${clientIp(request)}`, 20, 60, { failClosed });
      if (!limited.ok) return tooMany(limited.retryAfter);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/public')) {
    return NextResponse.next();
  }

  // The client error sink has to work without a session, because a broken deploy strands people
  // on the sign-in page. Rate limited here rather than in the route so a flood is rejected at
  // the edge, using the same `failClosed` rule as the auth limiter above: an unauthenticated
  // write endpoint should not accept traffic it cannot meter, and production already depends on
  // Redis for that reason. Ten per five minutes is generous for a reporter that caps itself at
  // five per page load, and tight enough that this cannot be used as a log-injection channel.
  if (pathname === '/api/client-errors') {
    if (request.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }
    const limited = await rateLimit(`rl:clienterr:${clientIp(request)}`, 10, 300, { failClosed });
    if (!limited.ok) return tooMany(limited.retryAfter);
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.jti && (await isTokenDenied(token.jti))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return loginRedirect(request, pathname);
  }

  if (!isAuthed(token)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return loginRedirect(request, pathname);
  }

  const level = Number(token.level) || 0;
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const minLevel = requiredAdminLevel(pathname);
    if (level < minLevel) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/about',
    '/login',
    '/dashboard',
    '/dashboard/:path*',
    '/form/:path*',
    '/view/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
};
