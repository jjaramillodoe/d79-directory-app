'use client';

import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Card,
  Tag,
  Grid,
  Flex,
} from '@once-ui-system/core';
import { Copy, Columns, Archive, Lock } from 'lucide-react';
import PublicShell from '../components/public/PublicShell';

export default function Home() {
  return (
    <PublicShell activePage="home">
      {({ overview, primaryHref, primaryLabel }) => {
        const submittedPercent = overview.currentYearPlans
          ? Math.min(100, Math.round((overview.submittedThisYear / overview.currentYearPlans) * 100))
          : 0;

        return (
          <Grid columns="2" s={{ columns: '1' }} gap="24" fillWidth>
            <Column gap="24" vertical="center">
              <Column gap="12">
                <Row gap="8" wrap>
                  <Tag size="s" variant="success" label={`Open ${overview.currentYear}`} />
                  <Tag size="s" variant="neutral" label={`${overview.previousYear} archived`} />
                </Row>
                <Heading as="h1" variant="display-strong-l">
                  Consolidated School Plans
                </Heading>
                <Text variant="body-default-l" onBackground="neutral-weak">
                  Principals copy last year’s answers into a {overview.currentYear} draft, compare
                  attendance, housing, and counseling, then submit. {overview.previousYear} stays
                  on file, read-only.
                </Text>
              </Column>

              <Row gap="12" wrap>
                <Button size="l" href={primaryHref}>
                  {primaryLabel}
                </Button>
                <Button size="l" variant="secondary" href="/about">
                  How the plan works
                </Button>
              </Row>

              <Row gap="12" vertical="start" padding="16" background="neutral-alpha-weak" radius="l">
                <Flex padding="8" background="warning-alpha-weak" radius="m">
                  <Lock size={18} strokeWidth={1.75} />
                </Flex>
                <Column gap="4">
                  <Text variant="label-strong-s">Authorized staff only</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Sign in with a verified @schools.nyc.gov account. Principals and authorized
                    district staff can open, copy, and submit plans.
                  </Text>
                </Column>
              </Row>
            </Column>

            <Column gap="16">
              <Card padding="24" fillWidth radius="l">
                <Column gap="20">
                  <Row horizontal="between" vertical="center" wrap gap="8">
                    <Heading as="h2" variant="heading-strong-s">
                      District snapshot
                    </Heading>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Live {overview.currentYear}
                    </Text>
                  </Row>
                  <Grid columns="3" s={{ columns: '1' }} gap="12">
                    <Column gap="4">
                      <Heading variant="display-strong-s">{overview.schoolsServed}</Heading>
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        Schools
                      </Text>
                    </Column>
                    <Column gap="4">
                      <Heading variant="display-strong-s">{overview.requiredPlans}</Heading>
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        Sections
                      </Text>
                    </Column>
                    <Column gap="4">
                      <Heading variant="display-strong-s">{submittedPercent}%</Heading>
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        {overview.submittedThisYear} of {overview.currentYearPlans || 0} submitted
                      </Text>
                    </Column>
                  </Grid>
                </Column>
              </Card>

              <Card padding="24" fillWidth radius="l">
                <Column gap="16">
                  <Heading as="h2" variant="heading-strong-s">
                    This year’s path
                  </Heading>
                  <Column gap="12">
                    <WorkflowStep
                      icon={Copy}
                      step="1"
                      title="Copy last year"
                      body={`Duplicate the ${overview.previousYear} plan with every answer included.`}
                    />
                    <WorkflowStep
                      icon={Columns}
                      step="2"
                      title="Compare and update"
                      body="Review attendance, temporary housing, and counseling side by side."
                    />
                    <WorkflowStep
                      icon={Archive}
                      step="3"
                      title="Submit the new year"
                      body={`${overview.previousYear} stays archived. New work happens in ${overview.currentYear}.`}
                    />
                  </Column>
                </Column>
              </Card>
            </Column>
          </Grid>
        );
      }}
    </PublicShell>
  );
}

function WorkflowStep({ icon: Icon, step, title, body }) {
  return (
    <Row gap="12" vertical="start">
      <Flex
        padding="8"
        background="brand-alpha-weak"
        radius="m"
        vertical="center"
        horizontal="center"
        style={{ flexShrink: 0, minWidth: 36 }}
      >
        <Icon size={16} strokeWidth={1.75} />
      </Flex>
      <Column gap="2">
        <Text variant="label-strong-s">
          {step}. {title}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {body}
        </Text>
      </Column>
    </Row>
  );
}
