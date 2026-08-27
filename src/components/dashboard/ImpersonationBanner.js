'use client';

import { useSession } from 'next-auth/react';
import { Column, Row, Text, Button } from '@once-ui-system/core';

export default function ImpersonationBanner() {
  const { data: session, update } = useSession();

  if (!session?.impersonating) return null;

  const stop = async () => {
    await update({ stopImpersonation: true });
    // Full reload so NextAuth re-reads the JWT after impersonation ends.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/dashboard');
  };

  return (
    <Row
      fillWidth
      paddingX="24"
      paddingY="12"
      horizontal="between"
      vertical="center"
      wrap
      gap="12"
      background="warning-alpha-weak"
      className="once-ui-root no-print"
      style={{ borderBottom: '1px solid var(--neutral-alpha-medium)' }}
    >
      <Column gap="2">
        <Text variant="label-strong-s">
          Viewing as {session.user.name} · Level {session.user.level}
        </Text>
        <Text variant="label-default-s" onBackground="neutral-weak">
          {session.user.schoolName} · signed in as {session.actorEmail}
        </Text>
      </Column>
      <Button size="s" variant="secondary" onClick={stop}>
        Exit preview
      </Button>
    </Row>
  );
}
