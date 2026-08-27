import Image from 'next/image';
import { Column, Row, Heading, Text, Button, Card, Tag, Flex } from '@once-ui-system/core';
import { MapPin } from 'lucide-react';
import AppFooter from '../../components/AppFooter';
import { metadata as noIndex } from '../../lib/privateRobots';

export const metadata = {
  title: 'Not available from this location',
  description:
    'District 79 Consolidated School Plans can only be opened from New York State.',
  robots: noIndex.robots,
};

export default function UnavailablePage() {
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
        <Row gap="12" vertical="center">
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
        <Tag size="s" variant="neutral" label="New York State only" />
      </Row>

      <Column
        as="main"
        fillWidth
        flex={1}
        paddingX="24"
        paddingY="32"
        horizontal="center"
        vertical="center"
      >
        <Card padding="32" radius="l" fillWidth style={{ maxWidth: '32rem' }}>
          <Column gap="24" horizontal="center">
            <Flex padding="12" background="brand-alpha-weak" radius="l">
              <MapPin size={24} strokeWidth={1.75} aria-hidden="true" />
            </Flex>
            <Column gap="8" horizontal="center">
              <Heading as="h1" variant="heading-strong-l" style={{ textAlign: 'center' }}>
                This site is only available in New York
              </Heading>
              <Text
                variant="body-default-m"
                onBackground="neutral-weak"
                style={{ textAlign: 'center' }}
              >
                District 79 Consolidated School Plans can only be opened from New York
                State. That keeps student and staff data on school and DOE networks in
                the state.
              </Text>
            </Column>
            <Column gap="8" fillWidth>
              <Text variant="body-default-s" onBackground="neutral-weak">
                If you work at a District 79 school, connect from a New York campus or
                DOE network. A personal VPN that exits in another state will be blocked.
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Already in New York and still seeing this page? Try again from the
                school network, or email the contacts below.
              </Text>
            </Column>
            <Button size="m" href="/">
              Try again
            </Button>
          </Column>
        </Card>
      </Column>

      <AppFooter compact signedIn={false} />
    </Column>
  );
}
