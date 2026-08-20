'use client';

import Image from 'next/image';
import { Column, Row, Text, Button, Grid, Flex } from '@once-ui-system/core';
import { Mail, Home, CircleHelp, Calendar } from 'lucide-react';
import { currentSchoolYear, previousSchoolYear } from '../lib/schoolYear';

const CONTACTS = [
  {
    name: 'Javier Jaramillo',
    title: 'Data Systems Administrator',
    email: 'jjaramillo7@schools.nyc.gov',
  },
  {
    name: 'Veronica Pichardo',
    title: 'Executive Director, School Support and Operations',
    email: 'VPichardo@schools.nyc.gov',
  },
];

export default function AppFooter({
  schoolYear,
  previousYear,
  credit,
  compact = true,
  signedIn = false,
} = {}) {
  const year = schoolYear || currentSchoolYear();
  const priorYear = previousYear || previousSchoolYear(year);
  const primaryHref = signedIn ? '/dashboard' : '/login';
  const primaryLabel = signedIn ? 'Dashboard' : 'Sign in';

  if (compact) {
    return (
      <Row
        as="footer"
        className="app-footer no-print"
        fillWidth
        paddingX="24"
        paddingY="12"
        horizontal="between"
        vertical="center"
        wrap
        gap="12"
        background="surface"
        style={{ borderTop: '1px solid var(--neutral-alpha-medium)' }}
      >
        <Row gap="8" vertical="center" wrap>
          <Mail size={14} strokeWidth={1.75} />
          <Text variant="label-default-s" onBackground="neutral-weak">
            Need help?
          </Text>
          {CONTACTS.map((person, index) => (
            <Row key={person.email} gap="8" vertical="center">
              {index > 0 && (
                <Text variant="label-default-s" onBackground="neutral-weak">
                  ·
                </Text>
              )}
              <Button size="s" variant="tertiary" href={`mailto:${person.email}`}>
                {person.name}
              </Button>
            </Row>
          ))}
        </Row>
        <Text variant="label-default-s" onBackground="neutral-weak">
          District 79 · {year}
        </Text>
      </Row>
    );
  }

  return (
    <Column
      as="footer"
      className="app-footer no-print"
      fillWidth
      paddingX="24"
      paddingY="24"
      gap="24"
      background="surface"
      style={{ borderTop: '1px solid var(--neutral-alpha-medium)' }}
    >
      <Grid columns="4" m={{ columns: '2' }} s={{ columns: '1' }} gap="24" fillWidth>
        <Column gap="12">
          <Row gap="8" vertical="center">
            <Flex padding="4" background="brand-alpha-weak" radius="s">
              <Mail size={14} strokeWidth={1.75} />
            </Flex>
            <Text variant="label-strong-s">Need help with a school plan?</Text>
          </Row>
          {CONTACTS.map((person) => (
            <Column key={person.email} gap="2">
              <Text variant="body-default-s">
                {person.name}
                <Text as="span" onBackground="neutral-weak">
                  {' '}
                  · {person.title}
                </Text>
              </Text>
              <Button size="s" variant="tertiary" href={`mailto:${person.email}`}>
                {person.email}
              </Button>
            </Column>
          ))}
        </Column>

        <Column gap="12">
          <Row gap="8" vertical="center">
            <Flex padding="4" background="brand-alpha-weak" radius="s">
              <Home size={14} strokeWidth={1.75} />
            </Flex>
            <Text variant="label-strong-s">Pages</Text>
          </Row>
          <Column gap="4">
            <Button size="s" variant="tertiary" href="/">
              Home
            </Button>
            <Button size="s" variant="tertiary" href="/about">
              How the plan works
            </Button>
            <Button size="s" variant="tertiary" href={primaryHref}>
              {primaryLabel}
            </Button>
          </Column>
        </Column>

        <Column gap="12">
          <Row gap="8" vertical="center">
            <Flex padding="4" background="brand-alpha-weak" radius="s">
              <Calendar size={14} strokeWidth={1.75} />
            </Flex>
            <Text variant="label-strong-s">This cycle</Text>
          </Row>
          <Column gap="8">
            <Text variant="body-default-s">
              {year} is open. {priorYear} is archived for copy and compare.
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Sign in with a verified @schools.nyc.gov account. The school year runs July–June.
            </Text>
          </Column>
        </Column>

        <Column gap="12">
          <Row gap="8" vertical="center">
            <Flex padding="4" background="brand-alpha-weak" radius="s">
              <CircleHelp size={14} strokeWidth={1.75} />
            </Flex>
            <Text variant="label-strong-s">District 79</Text>
          </Row>
          <Row gap="16" vertical="center" wrap>
            <Image
              src="/images/d79logo.png"
              alt="NYC District 79"
              width={40}
              height={40}
              style={{ width: 'auto', height: 'auto', objectFit: 'contain' }}
            />
            <Image
              src="/images/nycpublicshools.png"
              alt="NYC Public Schools"
              width={120}
              height={36}
              style={{ width: 'auto', height: 'auto', objectFit: 'contain' }}
            />
          </Row>
          {credit && (
            <Text variant="label-default-s" onBackground="neutral-weak">
              {credit}
            </Text>
          )}
        </Column>
      </Grid>

      <Row
        fillWidth
        horizontal="between"
        vertical="center"
        wrap
        gap="8"
        paddingTop="8"
        style={{ borderTop: '1px solid var(--neutral-alpha-weak)' }}
      >
        <Text variant="label-default-s" onBackground="neutral-weak">
          District 79 Alternative Schools · {year}
        </Text>
        <Text variant="label-default-s" onBackground="neutral-weak">
          © {new Date().getFullYear()} NYC District 79
        </Text>
      </Row>
    </Column>
  );
}
