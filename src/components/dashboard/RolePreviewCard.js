'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Column, Row, Text, Heading, Button, Card } from '@once-ui-system/core';

const DEMO_PRINCIPAL_EMAIL = 'd79.demo.principal@schools.nyc.gov';
const DEMO_AP_EMAIL = 'd79.demo.ap@schools.nyc.gov';
const DEMO_SCHOOL = 'Pathways to Graduation Brooklyn';

const PREVIEWS = [
  {
    label: 'Principal',
    email: DEMO_PRINCIPAL_EMAIL,
    detail: `Level 4 · ${DEMO_SCHOOL}`,
  },
  {
    label: 'Assistant Principal',
    email: DEMO_AP_EMAIL,
    detail: `Level 3 · ${DEMO_SCHOOL}`,
  },
];

export default function RolePreviewCard() {
  const { update } = useSession();
  const [pending, setPending] = useState('');

  const preview = async (email) => {
    setPending(email);
    try {
      await update({ impersonateEmail: email });
      window.location.assign('/dashboard');
    } catch (error) {
      setPending('');
    }
  };

  return (
    <Card padding="24" radius="l" fillWidth>
      <Column gap="16">
        <Column gap="4">
          <Heading as="h2" variant="heading-strong-s">
            Preview school roles
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Open the app as a demo Principal or Assistant Principal at {DEMO_SCHOOL}.
            Your Super Admin account stays signed in; use Exit preview to return.
          </Text>
        </Column>
        <Row gap="8" wrap>
          {PREVIEWS.map((item) => (
            <Button
              key={item.email}
              size="s"
              variant="secondary"
              disabled={Boolean(pending)}
              onClick={() => preview(item.email)}
            >
              {pending === item.email ? 'Opening…' : `View as ${item.label}`}
            </Button>
          ))}
        </Row>
      </Column>
    </Card>
  );
}
