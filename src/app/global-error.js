'use client';

import { useEffect } from 'react';
import { APP_NAME } from '../lib/branding';

/**
 * Last-resort boundary for crashes in the root layout itself.
 *
 * This replaces the root layout when it renders, which means none of the imports in
 * `layout.js` have run: no Once UI stylesheet, no tokens, no theme attributes. Using the
 * component library here would render unstyled markup, so the styling is inline and the
 * colors are literals rather than CSS custom properties.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1.5rem',
          textAlign: 'center',
          background: '#f7f7f8',
          color: '#18181b',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
          {APP_NAME} is temporarily unavailable
        </h1>
        <p style={{ margin: 0, maxWidth: '32rem', color: '#52525b', lineHeight: 1.5 }}>
          The application failed to start. Please try again in a moment. If this continues,
          contact your District 79 administrator.
        </p>
        {error?.digest && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a' }}>
            Reference: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #d4d4d8',
            background: '#18181b',
            color: '#ffffff',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
