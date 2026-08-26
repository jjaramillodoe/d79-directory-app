import { NextResponse } from 'next/server';

import { reportError } from '../../../lib/reportError';

/**
 * Sink for uncaught browser errors, posted by `ClientErrorReporter`.
 *
 * Deliberately not `@sentry/nextjs`. That is the richer option — breadcrumbs, session replay,
 * source-mapped stacks — but it costs roughly 35 KB gzipped on every page, which works directly
 * against the code-splitting work in the tenth pass, and `SENTRY_DSN` is blank today so it would
 * buy nothing until a DSN exists. This route adds no dependency and no client bundle weight, and
 * because it funnels into the same `reportError` the server uses, provisioning a DSN later starts
 * capturing browser errors too with no further changes. Until then the reports land in the
 * platform logs, which is still the difference between knowing and not knowing.
 *
 * Reachable without a session on purpose: the sign-in page is exactly where a broken deploy
 * would strand someone. That makes it an unauthenticated write endpoint, so it is rate limited
 * in the middleware before it gets here, and everything it accepts is truncated below.
 */

// Long enough to be diagnostic, short enough that a hostile caller cannot use this as storage.
const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_URL = 500;

const KINDS = new Set(['error', 'unhandledrejection']);

function clip(value, max) {
  if (typeof value !== 'string') return '';
  return value.length > max ? `${value.slice(0, max)}...[truncated]` : value;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const message = clip(body?.message, MAX_MESSAGE);
  if (!message) {
    return new NextResponse(null, { status: 204 });
  }

  // Reconstructed as an Error so Sentry groups these the way it groups server errors, and so
  // the stack the browser captured survives instead of being flattened into the message.
  const error = new Error(message);
  error.name = 'ClientError';
  const stack = clip(body?.stack, MAX_STACK);
  if (stack) error.stack = stack;

  reportError(error, {
    source: 'browser',
    kind: KINDS.has(body?.kind) ? body.kind : 'error',
    url: clip(body?.url, MAX_URL),
    userAgent: clip(request.headers.get('user-agent'), MAX_URL),
  });

  // 204 regardless of what happened. The browser has nothing useful to do with a failure here,
  // and an error response would invite the reporter to retry, which is how a reporting loop
  // turns one broken page into a flood.
  return new NextResponse(null, { status: 204 });
}
