'use client';

import { Card, Column, Heading, Text } from '@once-ui-system/core';

const ACCENT_MAP = {
  total: 'neutral-strong',
  draft: 'neutral-strong',
  submitted: 'brand-medium',
  underReview: 'warning-strong',
  approved: 'success-strong',
  rejected: 'danger-strong',
  averageProgress: 'accent-strong',
};

export default function StatCard({ label, value, suffix = '', accentKey, onClick, selected, hint }) {
  const accent = ACCENT_MAP[accentKey] || 'neutral-strong';

  // A card with onClick is a control, so it needs to be reachable and operable by keyboard.
  // Without these it was mouse-only, and the filters it drives were unusable without one.
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-pressed': Boolean(selected),
        onClick,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick(event);
          }
        },
      }
    : {};

  return (
    <Card
      padding="20"
      fillWidth
      radius="l"
      direction="column"
      {...interactiveProps}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        boxShadow: selected ? 'inset 0 0 0 2px var(--brand-solid-strong)' : undefined,
      }}
    >
      <Column gap="8" horizontal="center">
        <Heading variant="display-strong-l" onBackground={accent}>
          {value}
          {suffix}
        </Heading>
        <Text variant="label-default-s" onBackground="neutral-weak" align="center">
          {label}
        </Text>
        {hint && (
          <Text variant="label-default-s" onBackground="neutral-weak" align="center">
            {hint}
          </Text>
        )}
      </Column>
    </Card>
  );
}
