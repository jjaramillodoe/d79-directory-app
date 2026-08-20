'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Column, Row, Text, Heading, Button, Card, Spinner, Tag } from '@once-ui-system/core';
import DashboardShell from '../../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../../components/dashboard/DashboardHeader';

export default function YearComparePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const formId = params.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (!formId || !session) return;
    fetch(`/api/forms/${formId}/compare`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not compare');
        setData(payload);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formId, session]);

  const rows = useMemo(() => {
    const all = data?.rows || [];
    return onlyChanged ? all.filter((row) => row.changed) : all;
  }, [data, onlyChanged]);

  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      if (!map.has(row.stepKey)) map.set(row.stepKey, { title: row.stepTitle, rows: [] });
      map.get(row.stepKey).rows.push(row);
    });
    return Array.from(map.values());
  }, [rows]);

  if (status === 'loading' || !session || loading) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading comparison…</Text>
      </Column>
    );
  }

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title={data?.schoolName || 'Year-over-year'}
          description={
            data
              ? `${data.compareYear} vs ${data.currentYear} · all sections`
              : 'Year-over-year'
          }
          session={session}
          userLevel={session.user.level}
          actions={
            <Row gap="8">
              <Button size="s" variant="secondary" href={`/form/${formId}`}>Back to form</Button>
            </Row>
          }
        />
      }
    >
      <Column gap="24">
        {error && <Text onBackground="danger-strong">{error}</Text>}
        {!data?.previousFormId && (
          <Text onBackground="neutral-weak">No {data?.compareYear} plan was found for this school.</Text>
        )}
        {data?.districtGoals?.some((goal) => goal.target) && (
          <Card padding="16" radius="l">
            <Column gap="8">
              <Heading variant="heading-strong-s">{data.currentYear} district targets</Heading>
              {data.districtGoals.filter((goal) => goal.target).map((goal) => (
                <Text key={goal.key}>{goal.label}: {goal.target}{goal.unit ? ` ${goal.unit}` : ''}</Text>
              ))}
            </Column>
          </Card>
        )}
        <Row gap="8" wrap vertical="center">
          <Tag size="s" variant="brand" label={`${data?.changedCount || 0} answers differ`} />
          <Tag
            size="s"
            variant="neutral"
            label={`${rows.length} of ${data?.rows?.length || 0} questions`}
          />
          <Button size="s" variant={onlyChanged ? 'primary' : 'secondary'} onClick={() => setOnlyChanged(true)}>
            Changed only
          </Button>
          <Button size="s" variant={!onlyChanged ? 'primary' : 'secondary'} onClick={() => setOnlyChanged(false)}>
            All questions
          </Button>
        </Row>
        {grouped.length === 0 && data?.previousFormId && (
          <Text onBackground="neutral-weak">
            {onlyChanged ? 'No answers differ between these years.' : 'No questions to compare.'}
          </Text>
        )}
        {grouped.map((group) => (
          <Card key={group.title} padding="20" radius="l">
            <Column gap="16">
              <Heading variant="heading-strong-s">{group.title}</Heading>
              {group.rows.map((row) => (
                <Column key={`${row.stepKey}-${row.questionId}`} gap="8" padding="12" border="neutral-medium" radius="m">
                  <Text weight="strong">{row.questionNumber ? `${row.questionNumber}. ` : ''}{row.title}</Text>
                  <Row gap="16" wrap>
                    <Column gap="4" style={{ flex: 1, minWidth: 220 }}>
                      <Text variant="label-default-s" onBackground="neutral-weak">{data.compareYear}</Text>
                      <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{row.previousValue || '—'}</Text>
                    </Column>
                    <Column gap="4" style={{ flex: 1, minWidth: 220 }}>
                      <Text variant="label-default-s" onBackground="neutral-weak">{data.currentYear}</Text>
                      <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{row.currentValue || '—'}</Text>
                    </Column>
                  </Row>
                </Column>
              ))}
            </Column>
          </Card>
        ))}
      </Column>
    </DashboardShell>
  );
}
