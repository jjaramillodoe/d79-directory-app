'use client';

import { Card } from '@once-ui-system/core';

export default function SuperAdminPanel({ children }) {
  return (
    <Card padding="24" radius="l" fillWidth direction="column">
      {children}
    </Card>
  );
}
