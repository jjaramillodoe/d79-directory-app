'use client';

import Image from 'next/image';
import { Column, Row, Text, Button } from '@once-ui-system/core';
import { Mail } from 'lucide-react';
import { currentSchoolYear } from '../lib/schoolYear';

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

export default function AppFooter({ schoolYear, credit, compact = true } = {}) {
  const year = schoolYear || currentSchoolYear();

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
      paddingY="20"
      gap="16"
      background="surface"
      style={{ borderTop: '1px solid var(--neutral-alpha-medium)' }}
    >
      <Row fillWidth horizontal="between" vertical="start" wrap gap="24">
        <Column gap="8" style={{ maxWidth: 480 }}>
          <Row gap="8" vertical="center">
            <Mail size={16} strokeWidth={1.75} />
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

        <Column gap="12" horizontal="end" s={{ horizontal: 'start' }}>
          <Row gap="16" vertical="center">
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
          <Text variant="label-default-s" onBackground="neutral-weak">
            District 79 Alternative Schools · {year}
          </Text>
          <Text variant="label-default-s" onBackground="neutral-weak">
            © {new Date().getFullYear()} NYC District 79
          </Text>
        </Column>
      </Row>
    </Column>
  );
}
