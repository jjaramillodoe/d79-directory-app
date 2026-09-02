'use client';

import Image from 'next/image';
import { Column, Row, Text } from '@once-ui-system/core';
import { APP_NAME, ORG_NAME, APP_TAGLINE } from '../lib/branding';

export default function BrandMark({ href, showTagline = false }) {
  const label = (
    <Column gap="2" style={{ minWidth: 0, maxWidth: '22rem' }}>
      <Text variant="label-strong-m">{ORG_NAME}</Text>
      <Text variant="label-default-s" onBackground="neutral-weak">
        {showTagline ? `${APP_NAME} · ${APP_TAGLINE}` : APP_NAME}
      </Text>
    </Column>
  );

  const inner = (
    <>
      <Image
        src="/images/d79logo.png"
        alt={ORG_NAME}
        width={40}
        height={40}
        style={{ width: 'auto', height: 'auto', objectFit: 'contain', flexShrink: 0 }}
        priority
      />
      {label}
    </>
  );

  if (href) {
    return (
      <Row as="a" href={href} gap="12" vertical="center" style={{ textDecoration: 'none', minWidth: 0 }}>
        {inner}
      </Row>
    );
  }

  return (
    <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
      {inner}
    </Row>
  );
}
