'use client';

import { useEffect } from 'react';

/**
 * Forwards uncaught browser errors to `/api/client-errors`.
 *
 * Renders nothing. Mounted once in the root layout so it covers every page, including the
 * error boundaries themselves — a crash inside `global-error.js` still surfaces here.
 *
 * The hard requirement is that this can never make a bad situation worse. A page that throws in
 * a render loop can throw thousands of times a second, and a naive reporter turns that into
 * thousands of requests. Three guards, in order of importance:
 *
 *  1. `sending` suppresses reports raised while a report is in flight, so a failure inside the
 *     reporting path cannot recurse.
 *  2. `seen` drops duplicates by signature, which is what kills the render-loop case.
 *  3. `budget` caps total reports per page load, as a backstop for errors that vary slightly
 *     each time and so defeat the signature check.
 */

const MAX_REPORTS_PER_PAGE = 5;

export default function ClientErrorReporter() {
  useEffect(() => {
    // Development already shows these in the console with better stacks and source maps, and
    // reporting every hot-reload error is noise rather than signal.
    if (process.env.NODE_ENV !== 'production') return;

    const seen = new Set();
    let budget = MAX_REPORTS_PER_PAGE;
    let sending = false;

    const send = (kind, message, stack) => {
      if (sending || budget <= 0 || !message) return;

      const signature = `${kind}:${message}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      budget -= 1;

      const payload = JSON.stringify({
        kind,
        message: String(message),
        stack: stack ? String(stack) : '',
        url: window.location.href,
      });

      sending = true;
      try {
        // sendBeacon survives the navigation or tab close that often follows a crash, and
        // cannot itself throw a network error back into this handler.
        if (typeof navigator.sendBeacon === 'function') {
          navigator.sendBeacon('/api/client-errors', new Blob([payload], { type: 'application/json' }));
        } else {
          fetch('/api/client-errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Reporting is best-effort by definition. Swallowing here is what keeps a failure in
        // the reporter from becoming another error event.
      } finally {
        sending = false;
      }
    };

    const onError = (event) => {
      send('error', event.message || event.error?.message, event.error?.stack);
    };

    const onRejection = (event) => {
      const reason = event.reason;
      send(
        'unhandledrejection',
        reason instanceof Error ? reason.message : String(reason),
        reason instanceof Error ? reason.stack : ''
      );
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
