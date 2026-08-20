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
  Calendar,
  Share2,
  MessageSquare,
  Shield,
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
  { level: 'Level 1', title: 'Viewer', description: 'Open plans assigned to you.' },
  { level: 'Level 2', title: 'School staff', description: 'Open and edit plans at your school.' },
  {
    level: 'Level 3',
    title: 'Assistant Principal',
    description: 'Edit plans the principal assigned or shared — not every plan at the school.',
  },
  {
    level: 'Level 4',
    title: 'Principal',
    description: 'Own, copy, attest, and submit the school plan. Manage staff at that school.',
  },
  {
    level: 'Level 5',
    title: 'Super Admin',
    description: 'District-wide users, questions, goals, reviews, and year setup.',
  },
];

const YEAR_STEPS = [
  {
    step: '1',
    title: 'The year opens in July',
    body: 'The school year runs July–June. A new draft year becomes the working copy.',
  },
  {
    step: '2',
    title: 'Copy last year',
    body: 'Principals duplicate last year’s answers so nobody starts from a blank form.',
  },
  {
    step: '3',
    title: 'Update and share',
    body: 'Edit the required sections, compare years, and share with staff who need to help.',
  },
  {
    step: '4',
    title: 'Attest and submit',
    body: 'The principal attests, then submits. Last year stays on file, read-only.',
  },
];

const DETAIL_CARDS = [
  {
    icon: Share2,
    title: 'Sharing a plan',
    body: 'Principals keep ownership. Assistant principals need an assignment or share before they can edit. Same school is not enough for that role.',
  },
  {
    icon: MessageSquare,
    title: 'After you submit',
    body: 'District staff can review, comment, and approve. You can still open last year’s plan to compare, but it stays archived.',
  },
  {
    icon: Shield,
    title: 'How access is checked',
    body: 'Sign-in is Google with a verified @schools.nyc.gov account. Sessions expire after 8 hours. Activity is logged.',
  },
];

export default function AboutPage() {
  const steps = (formQuestionsData.steps || []).map((step, index) => ({
    number: index + 1,
    title: step.title,
  }));

  return (
    <PublicShell activePage="about">
      {({ overview, primaryHref, primaryLabel }) => (
        <Column fillWidth flex={1} gap="24">
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
          </Grid>

          <Card padding="24" fillWidth radius="l">
            <Column gap="16">
              <Row gap="8" vertical="center">
                <Flex padding="8" background="brand-alpha-weak" radius="m">
                  <Calendar size={16} strokeWidth={1.75} />
                </Flex>
                <Column gap="2">
                  <Heading as="h2" variant="heading-strong-s">
                    How a year works
                  </Heading>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {overview.currentYear} is open. {overview.previousYear} stays archived for copy
                    and compare.
                  </Text>
                </Column>
              </Row>
              <Grid columns="4" m={{ columns: '2' }} s={{ columns: '1' }} gap="16" fillWidth>
                {YEAR_STEPS.map((item) => (
                  <Column key={item.step} gap="8">
                    <Flex
                      padding="4"
                      background="brand-alpha-weak"
                      radius="s"
                      style={{ minWidth: 28, justifyContent: 'center', alignSelf: 'flex-start' }}
                    >
                      <Text variant="label-strong-s">{item.step}</Text>
                    </Flex>
                    <Text variant="label-strong-s">{item.title}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {item.body}
                    </Text>
                  </Column>
                ))}
              </Grid>
            </Column>
          </Card>

          <Column gap="12" fillWidth>
            <Heading as="h2" variant="heading-strong-s">
              Access levels
            </Heading>
            <Grid columns="3" m={{ columns: '2' }} s={{ columns: '1' }} gap="16" fillWidth>
              {ACCESS_LEVELS.map((item) => (
                <Card key={item.level} padding="24" fillWidth radius="l">
                  <Column gap="8">
                    <Tag size="s" variant="neutral" label={item.level} />
                    <Text variant="label-strong-s">{item.title}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {item.description}
                    </Text>
                  </Column>
                </Card>
              ))}
            </Grid>
          </Column>

          <Grid columns="3" s={{ columns: '1' }} gap="16" fillWidth>
            {DETAIL_CARDS.map((item) => (
              <Card key={item.title} padding="24" fillWidth radius="l">
                <Column gap="12">
                  <Flex
                    padding="8"
                    background="brand-alpha-weak"
                    radius="m"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <item.icon size={16} strokeWidth={1.75} />
                  </Flex>
                  <Column gap="4">
                    <Heading as="h2" variant="heading-strong-s">
                      {item.title}
                    </Heading>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {item.body}
                    </Text>
                  </Column>
                </Column>
              </Card>
            ))}
          </Grid>

          <Card padding="24" fillWidth radius="l">
            <Column gap="16">
              <Row horizontal="between" vertical="center" wrap gap="8">
                <Column gap="4">
                  <Heading as="h2" variant="heading-strong-s">
                    Required sections
                  </Heading>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Every school completes the same {overview.requiredPlans || steps.length}{' '}
                    sections for {overview.currentYear}.
                  </Text>
                </Column>
                <Tag
                  size="s"
                  variant="brand"
                  label={`${overview.requiredPlans || steps.length} sections`}
                />
              </Row>
              <Grid columns="2" s={{ columns: '1' }} gap="8" fillWidth>
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
