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
import {
  FileText,
  Lock,
  Users,
  CheckCircle,
  Save,
  BarChart3,
} from 'lucide-react';
import PublicShell from '../../components/public/PublicShell';
import formQuestionsData from '../../data/formQuestions.json';

const FEATURES = [
  {
    icon: FileText,
    title: 'Complete plan in one place',
    description: 'Every required section, auto-save, and progress tracking.',
  },
  {
    icon: Lock,
    title: 'NYC DOE accounts only',
    description: 'Verified @schools.nyc.gov emails and role-based access.',
  },
  {
    icon: Users,
    title: 'Collaboration',
    description: 'Share a plan with staff for view or edit, then keep ownership with the principal.',
  },
  {
    icon: CheckCircle,
    title: 'Review and approval',
    description: 'District staff review, comment, and approve submitted plans.',
  },
  {
    icon: Save,
    title: 'Copy last year',
    description: 'Start from last year’s answers instead of a blank form.',
  },
  {
    icon: BarChart3,
    title: 'Year-over-year compare',
    description: 'Side-by-side attendance, housing, and counseling answers.',
  },
];

const ACCESS_LEVELS = [
  { level: 'Levels 1–2', description: 'View approved plans.' },
  { level: 'Level 3', description: 'Create and edit assigned school plans.' },
  { level: 'Level 4', description: 'Principals: own, copy, attest, and submit the school plan.' },
  { level: 'Level 5', description: 'Super Admin: district-wide users, questions, goals, and reviews.' },
];

export default function AboutPage() {
  const steps = (formQuestionsData.steps || []).map((step, index) => ({
    number: index + 1,
    title: step.title,
  }));

  return (
    <PublicShell activePage="about">
      {({ overview, primaryHref, primaryLabel }) => (
        <Column gap="24" fillWidth>
          <Grid columns="2" s={{ columns: '1' }} gap="24" fillWidth>
            <Column gap="24" vertical="center">
              <Column gap="12">
                <Row gap="8" wrap>
                  <Tag size="s" variant="success" label={`Open ${overview.currentYear}`} />
                  <Tag size="s" variant="neutral" label={`${overview.previousYear} archived`} />
                </Row>
                <Heading as="h1" variant="display-strong-l">
                  How the plan works
                </Heading>
                <Text variant="body-default-l" onBackground="neutral-weak">
                  The District 79 Consolidated School Plan is the digital workspace for principals
                  and authorized staff. Copy {overview.previousYear} into a {overview.currentYear}{' '}
                  draft, update the required sections, compare years, then submit for review.
                </Text>
              </Column>

              <Row gap="12" wrap>
                <Button size="l" href={primaryHref}>
                  {primaryLabel}
                </Button>
                <Button size="l" variant="secondary" href="/">
                  Back to home
                </Button>
              </Row>

              <Row gap="12" vertical="start" padding="16" background="neutral-alpha-weak" radius="l">
                <Flex padding="8" background="warning-alpha-weak" radius="m">
                  <Lock size={18} strokeWidth={1.75} />
                </Flex>
                <Column gap="4">
                  <Text variant="label-strong-s">Authorized staff only</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Restricted to principals and school administrators with verified
                    @schools.nyc.gov emails. Activity is logged for security.
                  </Text>
                </Column>
              </Row>
            </Column>

            <Column gap="16">
              <Card padding="24" fillWidth radius="l">
                <Column gap="16">
                  <Heading as="h2" variant="heading-strong-s">
                    What you can do
                  </Heading>
                  <Column gap="12">
                    {FEATURES.map((feature) => (
                      <Row key={feature.title} gap="12" vertical="start">
                        <Flex
                          padding="8"
                          background="brand-alpha-weak"
                          radius="m"
                          style={{ flexShrink: 0 }}
                        >
                          <feature.icon size={16} strokeWidth={1.75} />
                        </Flex>
                        <Column gap="2">
                          <Text variant="label-strong-s">{feature.title}</Text>
                          <Text variant="body-default-s" onBackground="neutral-weak">
                            {feature.description}
                          </Text>
                        </Column>
                      </Row>
                    ))}
                  </Column>
                </Column>
              </Card>

              <Card padding="24" fillWidth radius="l">
                <Column gap="16">
                  <Heading as="h2" variant="heading-strong-s">
                    Access levels
                  </Heading>
                  <Grid columns="2" s={{ columns: '1' }} gap="12">
                    {ACCESS_LEVELS.map((item) => (
                      <Column key={item.level} gap="4">
                        <Text variant="label-strong-s">{item.level}</Text>
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          {item.description}
                        </Text>
                      </Column>
                    ))}
                  </Grid>
                </Column>
              </Card>
            </Column>
          </Grid>

          <Card padding="24" fillWidth radius="l">
            <Column gap="16">
              <Row horizontal="between" vertical="center" wrap gap="8">
                <Heading as="h2" variant="heading-strong-s">
                  Required sections
                </Heading>
                <Tag
                  size="s"
                  variant="brand"
                  label={`${overview.requiredPlans || steps.length} sections`}
                />
              </Row>
              <Grid columns="3" m={{ columns: '2' }} s={{ columns: '1' }} gap="12">
                {steps.map((step) => (
                  <Row key={step.number} gap="8" vertical="center">
                    <Flex
                      padding="4"
                      background="brand-alpha-weak"
                      radius="s"
                      style={{ minWidth: 28, justifyContent: 'center' }}
                    >
                      <Text variant="label-strong-s">{step.number}</Text>
                    </Flex>
                    <Text variant="body-default-s">{step.title}</Text>
                  </Row>
                ))}
              </Grid>
            </Column>
          </Card>
        </Column>
      )}
    </PublicShell>
  );
}
