'use client';

import { Flex, Row, Column, Heading, Text, Badge } from '@once-ui-system/core';

export default function DashboardHeader({
  title,
  description,
  session,
  userLevel,
  notificationsCount = 0,
  actions,
}) {
  return (
    <Flex
      as="header"
      background="surface"
      paddingX="24"
      paddingY="16"
      fillWidth
      style={{
        borderBottom: '1px solid var(--neutral-alpha-medium)',
      }}
    >
      <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
        <Column gap="4">
          <Heading variant="heading-strong-l">{title}</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {description || `Welcome back, ${session.user.name}`}
          </Text>
        </Column>
        <Row gap="8" vertical="center" wrap>
          {userLevel < 4 && notificationsCount > 0 && (
            <Badge>
              {notificationsCount} Review{notificationsCount !== 1 ? 's' : ''} Available
            </Badge>
          )}
          {actions}
        </Row>
      </Row>
    </Flex>
  );
}
