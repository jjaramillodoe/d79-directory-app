'use client';

import { Card, Column, Row, Heading, Text } from '@once-ui-system/core';

export default function DashboardSection({ title, description, actions, children, fillHeight = false }) {
  return (
    <Card
      padding="0"
      radius="l"
      fillWidth
      overflow="hidden"
      direction="column"
      style={fillHeight ? { height: '100%', minHeight: '36rem' } : undefined}
    >
      <Row
        fillWidth
        horizontal="between"
        vertical="center"
        paddingX="24"
        paddingY="20"
        background="neutral-weak"
        borderBottom="neutral-medium"
        wrap
        gap="16"
      >
        <Column gap="4">
          <Heading variant="heading-strong-m">{title}</Heading>
          {description && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {description}
            </Text>
          )}
        </Column>
        {actions}
      </Row>
      <Column padding="24" fillWidth gap="16" style={fillHeight ? { flex: 1 } : undefined}>
        {children}
      </Column>
    </Card>
  );
}
