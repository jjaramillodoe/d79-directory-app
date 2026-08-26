'use client';

import { useEffect } from 'react';
import { Button, Column, Heading, Row, Text } from '@once-ui-system/core';
import { AlertTriangle } from 'lucide-react';

/**
 * Shared body for the route-level `error.js` files.
 *
 * Two things it deliberately does not do:
 *
 * 1. It does not render `error.message`. A render-time crash can carry anything the failing
 *    component touched, and these pages handle student and staff data. The digest is enough
 *    to tie a user report to the server log.
 * 2. It does not call `reportError` from `src/lib/reportError.js`. That helper requires
 *    `@sentry/node`, which cannot run in the browser; wiring client reporting up properly
 *    needs `instrumentation-client.ts`, which is still open. Until then the console keeps
 *    this observable in dev without pretending the error reached a monitoring backend.
 */
export default function RouteError({
  error,
  reset,
  title = 'Something went wrong',
  description = 'This page failed to load. Your saved work is not affected.',
}) {
  useEffect(() => {
    console.error('Route error boundary caught:', error);
  }, [error]);

  return (
    <Column
      minHeight="100vh"
      horizontal="center"
      vertical="center"
      gap="16"
      padding="24"
      background="page"
    >
      <AlertTriangle size={40} aria-hidden="true" color="var(--danger-on-background-weak)" />
      <Heading variant="heading-strong-l" align="center">
        {title}
      </Heading>
      <Text onBackground="neutral-weak" align="center" style={{ maxWidth: '32rem' }}>
        {description}
      </Text>
      {error?.digest && (
        <Text variant="body-default-xs" onBackground="neutral-weak" align="center">
          Reference: {error.digest}
        </Text>
      )}
      <Row gap="8" horizontal="center" wrap>
        <Button size="s" variant="primary" onClick={() => reset()}>
          Try again
        </Button>
        <Button size="s" variant="tertiary" href="/dashboard">
          Back to dashboard
        </Button>
      </Row>
    </Column>
  );
}
