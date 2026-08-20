'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Column, Row, Text, Button, Tag } from '@once-ui-system/core';
import { currentSchoolYear, previousSchoolYear } from '../../lib/schoolYear';
import AppFooter from '../AppFooter';

export function usePublicOverview() {
  const fallbackYear = currentSchoolYear();
  const [overview, setOverview] = useState({
    currentYear: fallbackYear,
    previousYear: previousSchoolYear(fallbackYear),
    requiredPlans: 15,
    schoolsServed: 24,
    currentYearPlans: 0,
    submittedThisYear: 0,
  });

  useEffect(() => {
    fetch('/api/public/overview')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.currentYear) setOverview((current) => ({ ...current, ...data }));
      })
      .catch(() => {});
  }, []);

  return overview;
}

export default function PublicShell({ activePage = 'home', children }) {
  const overview = usePublicOverview();
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  const primaryHref = signedIn ? '/dashboard' : '/login';
  const primaryLabel = signedIn ? 'Open dashboard' : 'Sign in';

  return (
    <Column fillWidth background="page" className="once-ui-root" style={{ minHeight: '100vh' }}>
      <Row
        as="header"
        fillWidth
        horizontal="between"
        vertical="center"
        paddingX="24"
        paddingY="16"
        gap="16"
        wrap
        style={{ borderBottom: '1px solid var(--neutral-alpha-medium)' }}
      >
        <Row gap="12" vertical="center" href="/" as="a" style={{ textDecoration: 'none' }}>
          <Image
            src="/images/d79logo.png"
            alt="District 79"
            width={40}
            height={40}
            style={{ width: 'auto', height: 'auto', objectFit: 'contain' }}
            priority
          />
          <Column gap="2">
            <Text variant="label-strong-m">District 79 Directory</Text>
            <Text variant="label-default-s" onBackground="neutral-weak">
              NYC Alternative Schools
            </Text>
          </Column>
        </Row>
        <Row gap="8" vertical="center" wrap>
          <Tag size="s" variant="brand" label={overview.currentYear} />
          <Button size="s" variant={activePage === 'home' ? 'secondary' : 'tertiary'} href="/">
            Home
          </Button>
          <Button size="s" variant={activePage === 'about' ? 'secondary' : 'tertiary'} href="/about">
            About
          </Button>
          {status !== 'loading' && (
            <Button size="s" href={primaryHref}>
              {primaryLabel}
            </Button>
          )}
        </Row>
      </Row>

      <Column as="main" fillWidth flex={1} paddingX="24" paddingY="32" gap="24">
        {typeof children === 'function' ? children({ overview, signedIn, primaryHref, primaryLabel }) : children}
      </Column>

      <AppFooter
        compact={false}
        signedIn={signedIn}
        schoolYear={overview.currentYear}
        credit="Developed by Javier Jaramillo for District 79 Alternative Schools"
      />
    </Column>
  );
}
