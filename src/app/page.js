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
  ProgressBar,
} from '@once-ui-system/core';
import { Copy, Columns, Archive, Lock, School, Users, Landmark } from 'lucide-react';
import PublicShell from '../components/public/PublicShell';
import { APP_NAME } from '../lib/branding';

const PLAN_SECTIONS = [
  'Table of Contents',
  'Child Abuse and Neglect Intervention',
  'Student to Student Sexual Harassment',
  'Respect For All Plan',
  'Suicide Prevention and Crisis Intervention',
  'School Attendance Plan',
  'Students in Temporary Housing Program',
  'Service In Schools Plan',
  'Planning Interviews',
  'Military Recruitment Opt-Out',
  'School Culture Plan',
  'After School Programs',
  'Cell Phone Policy',
  'School Counseling Plan',
];

const AUDIENCES = [
  {
    icon: School,
    title: 'Principals',
    body: 'Copy last year’s answers, update each section, attest, and submit the new year.',
  },
  {
    icon: Users,
    title: 'School staff',
    body: 'Help on assigned or shared plans. The principal keeps ownership of the submission.',
  },
  {
    icon: Landmark,
    title: 'District staff',
    body: 'Review, comment, and track live submissions. Last year stays on file, read-only.',
  },
];

export default function Home() {
  return (
    <PublicShell activePage="home">
      {({ overview, primaryHref, primaryLabel }) => {
        const submittedPercent = overview.currentYearPlans
          ? Math.min(100, Math.round((overview.submittedThisYear / overview.currentYearPlans) * 100))
          : 0;
        const sectionCount = overview.requiredPlans || PLAN_SECTIONS.length;

        return (
          <Column fillWidth flex={1} gap="24">
            <Grid columns="2" s={{ columns: '1' }} gap="24" fillWidth>
              <Column gap="24" vertical="center">
                <Column gap="12">
                  <Row gap="8" wrap>
                    <Tag size="s" variant="success" label={`Open ${overview.currentYear}`} />
                    <Tag size="s" variant="neutral" label={`${overview.previousYear} archived`} />
                  </Row>
                  <Heading as="h1" variant="display-strong-l">
                    {APP_NAME}
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
                    <Column gap="8">
                      <ProgressBar value={submittedPercent} label={false} barBackground="brand-strong" />
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        School year runs July–June. {overview.previousYear} is archived for compare
                        and copy.
                      </Text>
                    </Column>
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
                        body="Review every section side by side with last year’s answers."
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

            <Card padding="24" fillWidth radius="l">
              <Column gap="16">
                <Row horizontal="between" vertical="center" wrap gap="8">
                  <Column gap="4">
                    <Heading as="h2" variant="heading-strong-s">
                      What’s in this year’s plan
                    </Heading>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Every school completes the same required sections. Open About for access
                      levels and a fuller walkthrough.
                    </Text>
                  </Column>
                  <Tag size="s" variant="brand" label={`${sectionCount} sections`} />
                </Row>
                <Grid columns="2" s={{ columns: '1' }} gap="8" fillWidth>
                  {PLAN_SECTIONS.map((title, index) => (
                    <Row key={title} gap="8" vertical="center">
                      <Flex
                        padding="4"
                        background="brand-alpha-weak"
                        radius="s"
                        style={{ minWidth: 28, justifyContent: 'center' }}
                      >
                        <Text variant="label-strong-s">{index + 1}</Text>
                      </Flex>
                      <Text variant="body-default-s">{title}</Text>
                    </Row>
                  ))}
                </Grid>
              </Column>
            </Card>

            <Grid columns="3" s={{ columns: '1' }} gap="16" fillWidth>
              {AUDIENCES.map((item) => (
                <AudienceCard key={item.title} {...item} />
              ))}
            </Grid>
          </Column>
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

function AudienceCard({ icon: Icon, title, body }) {
  return (
    <Card padding="24" fillWidth radius="l">
      <Column gap="12">
        <Flex padding="8" background="brand-alpha-weak" radius="m" style={{ alignSelf: 'flex-start' }}>
          <Icon size={16} strokeWidth={1.75} />
        </Flex>
        <Column gap="4">
          <Heading as="h2" variant="heading-strong-s">
            {title}
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {body}
          </Text>
        </Column>
      </Column>
    </Card>
  );
}
