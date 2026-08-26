'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Column, Row, Text, Heading, Button, Card, Spinner, Grid, Tag } from '@once-ui-system/core';
import PrincipalEmailAutocomplete from '../../../components/PrincipalEmailAutocomplete';
import SCHOOL_NAMES from '../../../constants/schools';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import DashboardSection from '../../../components/dashboard/DashboardSection';
import { currentSchoolYear, previousSchoolYear } from '../../../lib/schoolYear';
import * as logger from '../../../lib/logger';

export default function NewFormPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [schoolName, setSchoolName] = useState('');
  const [initialOwnerEmail, setInitialOwnerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingFormId, setExistingFormId] = useState('');
  const thisYear = currentSchoolYear();
  const lastYear = previousSchoolYear(thisYear);

  useEffect(() => {
    if (session?.user?.schoolName) {
      setSchoolName(session.user.schoolName);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.level < 3) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (isSubmitting) return;
    if (!schoolName.trim()) {
      setError('School name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setExistingFormId('');

    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: schoolName.trim(),
          initialOwnerEmail: initialOwnerEmail.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setExistingFormId(data.existingFormId || '');
        setError(data.error || 'Failed to create form. Please try again.');
        setIsSubmitting(false);
        return;
      }
      router.push(`/form/${data.formId}`);
    } catch (err) {
      logger.error('Error creating form:', err);
      setError('Failed to create form. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading…</Text>
      </Column>
    );
  }

  if (session.user.level < 3) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page" padding="24">
        <Heading variant="heading-strong-m">You don’t have access to create a plan</Heading>
        <Text onBackground="neutral-weak">Principal access or higher is required.</Text>
        <Button href="/dashboard">Back to dashboard</Button>
      </Column>
    );
  }

  const isSuperAdmin = session.user.level === 5;
  const lockedSchool = session.user.schoolName || '';

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title="New school plan"
          description={`Start a ${thisYear} Consolidated School Plan`}
          session={session}
          userLevel={session.user.level}
          actions={
            <Button size="s" variant="secondary" href="/dashboard">
              Cancel
            </Button>
          }
        />
      }
    >
      <Grid columns="2" gap="24" fillWidth s={{ columns: '1' }} style={{ alignItems: 'stretch' }}>
        <DashboardSection
          fillHeight
          title="School information"
          description={
            isSuperAdmin
              ? `Choose the school for this ${thisYear} plan. Last year’s answers are not copied here — duplicate the ${lastYear} plan when you need them.`
              : `This ${thisYear} plan is for ${lockedSchool || 'your school'}. Last year’s answers are not copied here — duplicate the ${lastYear} plan when you need them.`
          }
        >
          <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Column gap="24" style={{ flex: 1 }}>
              {error && (
                <Column gap="12" padding="16" background="danger-alpha-weak" radius="m">
                  <Column gap="4">
                    <Text variant="label-strong-s" onBackground="danger-strong">
                      {error}
                    </Text>
                    {existingFormId && (
                      <Text variant="body-default-s">
                        Open that plan instead of starting a second {thisYear} copy. If you wanted last year’s answers, go back to Overview, open the {lastYear} plan, and choose Duplicate.
                      </Text>
                    )}
                  </Column>
                  {existingFormId && (
                    <Button variant="danger" href={`/form/${existingFormId}`}>
                      Open the existing plan
                    </Button>
                  )}
                </Column>
              )}

              <Column gap="4">
                <Text variant="label-default-s">Signed in as</Text>
                <Text variant="body-default-s">
                  {session.user.name} · {session.user.email}
                </Text>
              </Column>

              <Column gap="8">
                <Text variant="label-default-s">School</Text>
                {isSuperAdmin ? (
                  <select
                    className="app-field"
                    value={schoolName}
                    onChange={(event) => {
                      setSchoolName(event.target.value);
                      setError('');
                      setExistingFormId('');
                    }}
                    required
                  >
                    <option value="">Select your school…</option>
                    {SCHOOL_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select className="app-field" value={lockedSchool} disabled>
                    <option value={lockedSchool}>{lockedSchool || 'No school assigned'}</option>
                  </select>
                )}
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {isSuperAdmin
                    ? `The plan is stored as ${thisYear} for this school. Each school can only have one plan for the year.`
                    : `Principals can only start a plan for their own school. This ${thisYear} plan will be stored for ${lockedSchool || 'your school'}.`}
                </Text>
              </Column>

              {isSuperAdmin && (
                <Column gap="8">
                  <Text variant="label-default-s">Assign to a principal (optional)</Text>
                  <PrincipalEmailAutocomplete
                    value={initialOwnerEmail}
                    onChange={setInitialOwnerEmail}
                    placeholder="Search name or @schools.nyc.gov email"
                  />
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Leave blank to keep the plan on your account. Assign when you are creating it for a school’s principal.
                  </Text>
                </Column>
              )}

              <Row gap="8" horizontal="end" wrap>
                <Button type="button" variant="secondary" href="/dashboard">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !schoolName.trim()}>
                  {isSubmitting ? 'Creating…' : 'Start plan'}
                </Button>
              </Row>

              <Column gap="16" paddingTop="8" style={{ marginTop: 'auto' }}>
                <Column gap="8" padding="16" background="neutral-weak" radius="m">
                  <Text variant="label-strong-s">After you start</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    You will open the section editor. Answers autosave as you type. When every section is reviewed, submit the plan. Copied plans also need the principal’s attestation.
                  </Text>
                </Column>
                <Column gap="8" padding="16" background="neutral-weak" radius="m">
                  <Text variant="label-strong-s">Need last year’s answers?</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Do not create a second {thisYear} plan. Open the {lastYear} plan from Overview and choose Duplicate, or ask Super Admin to copy the school during year setup.
                  </Text>
                </Column>
              </Column>
            </Column>
          </form>
        </DashboardSection>

        <Card padding="24" radius="l" fillWidth style={{ height: '100%', minHeight: '36rem' }}>
          <Column gap="20" style={{ height: '100%' }}>
            <Row gap="8" vertical="center" wrap>
              <Heading variant="heading-strong-s">What you are starting</Heading>
              <Tag size="s" variant="brand" label={thisYear} />
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              This is the district Consolidated School Plan: child safety, attendance, temporary housing, counseling, and the other required sections for the year.
            </Text>
            <Column gap="16">
              <Column gap="4">
                <Text variant="label-strong-s">1. Blank plan for this year</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Each school can have one {thisYear} plan. If this school already has one, this page will highlight it in red so you can open that plan instead of creating a second copy.
                </Text>
              </Column>
              <Column gap="4">
                <Text variant="label-strong-s">2. Copy {lastYear} if you need it</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Start here only when the school does not yet have a {thisYear} plan. If a {lastYear} plan exists, open it and use Duplicate to bring answers forward. Compare then shows every section side by side.
                </Text>
              </Column>
              <Column gap="4">
                <Text variant="label-strong-s">3. Autosave, then submit</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Sections save as you type. When the school has reviewed every section, submit. Copied plans also need the principal’s attestation.
                </Text>
              </Column>
            </Column>
          </Column>
        </Card>
      </Grid>
    </DashboardShell>
  );
}
