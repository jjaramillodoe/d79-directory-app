'use client';

import { Column, Row, Text, Grid, Flex } from '@once-ui-system/core';
import { Check, X, ListOrdered } from 'lucide-react';
import DashboardSection from './DashboardSection';
import { getRoleGuide } from '../../lib/roleGuides';

function GuideList({ items, icon: Icon, background }) {
  return (
    <Column gap="8" padding="16" background={background} radius="m" fillWidth>
      {items.map((item) => (
        <Row key={item} gap="8" vertical="start">
          <Flex paddingTop="2" style={{ flexShrink: 0 }}>
            <Icon size={14} strokeWidth={2} />
          </Flex>
          <Text variant="body-default-s">{item}</Text>
        </Row>
      ))}
    </Column>
  );
}

export default function RoleHowTo({ userLevel, compact = false }) {
  const guide = getRoleGuide(userLevel);

  return (
    <DashboardSection
      title={`How to · ${guide.title}`}
      description={guide.summary}
    >
      <Column gap="16" fillWidth>
        <Grid columns="2" s={{ columns: '1' }} gap="16" fillWidth>
          <Column gap="8">
            <Text variant="label-strong-s">You can</Text>
            <GuideList items={guide.can} icon={Check} background="brand-alpha-weak" />
          </Column>
          <Column gap="8">
            <Text variant="label-strong-s">You cannot</Text>
            <GuideList items={guide.cannot} icon={X} background="danger-alpha-weak" />
          </Column>
        </Grid>

        {(!compact || userLevel <= 4) && (
          <Column gap="8">
            <Row gap="8" vertical="center">
              <ListOrdered size={16} strokeWidth={1.75} />
              <Text variant="label-strong-s">Start here</Text>
            </Row>
            <Column gap="8" padding="16" background="neutral-alpha-weak" radius="m">
              {guide.startHere.map((step, index) => (
                <Text key={step} variant="body-default-s">
                  {index + 1}. {step}
                </Text>
              ))}
            </Column>
          </Column>
        )}
      </Column>
    </DashboardSection>
  );
}
