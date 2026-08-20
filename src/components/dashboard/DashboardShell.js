'use client';

import { Column, Row } from '@once-ui-system/core';
import AppFooter from '../AppFooter';

export default function DashboardShell({ sidebar, header, children }) {
  return (
    <Row
      minHeight="100"
      background="page"
      fillWidth
      className="once-ui-root"
      style={{ minHeight: '100vh', alignItems: 'stretch' }}
    >
      {sidebar}
      <Column fillWidth style={{ minWidth: 0, flex: 1, minHeight: '100vh' }}>
        {header}
        <Column
          as="main"
          fillWidth
          paddingX="24"
          paddingY="24"
          gap="24"
          style={{ flex: 1 }}
        >
          {children}
        </Column>
        <AppFooter />
      </Column>
    </Row>
  );
}
