'use client';

import {
  Card,
  Row,
  Column,
  Heading,
  Text,
  Badge,
  Flex,
} from '@once-ui-system/core';

export default function QuickActionCard({
  title,
  description,
  href,
  onClick,
  badge,
  icon: Icon,
}) {
  return (
    <Card href={href} onClick={onClick} padding="24" fillWidth fillHeight direction="column">
      <Row gap="16" vertical="start" fillWidth>
        {Icon && (
          <Flex
            padding="12"
            background="brand-alpha-weak"
            radius="m"
            vertical="center"
            horizontal="center"
            style={{ flexShrink: 0 }}
          >
            <Icon size={24} strokeWidth={1.75} />
          </Flex>
        )}
        <Column gap="8" fillWidth>
          <Row gap="8" vertical="center" wrap>
            <Heading variant="heading-strong-s">{title}</Heading>
            {badge && <Badge>{badge}</Badge>}
          </Row>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {description}
          </Text>
        </Column>
      </Row>
    </Card>
  );
}
