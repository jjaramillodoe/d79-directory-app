'use client';

import { useMemo, useState } from 'react';
import { Column, Row, Text, Heading, Button, Card, Tag } from '@once-ui-system/core';
import DashboardSection from '../dashboard/DashboardSection';
import { currentSchoolYear } from '../../lib/schoolYear';

export default function YearRollover({ onComplete }) {
  const thisYear = currentSchoolYear();
  const [sourceYear, setSourceYear] = useState(() => {
    const start = Number(thisYear.slice(0, 4)) - 1;
    return `${start}-${start + 1}`;
  });
  const [targetYear, setTargetYear] = useState(thisYear);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const summary = useMemo(() => {
    if (!result) return null;
    return [
      { label: 'Schools found', value: result.considered || 0 },
      { label: 'Copied', value: result.created?.length || 0 },
      { label: 'Already had a form', value: result.skipped?.length || 0 },
      { label: 'Errors', value: result.errors?.length || 0 },
    ];
  }, [result]);

  const runRollover = async () => {
    setConfirming(false);
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/admin/forms/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceYear: sourceYear.trim(), targetYear: targetYear.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not copy school plans');
      }
      setResult(data);
      if (onComplete) onComplete(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardSection title="Copy last year into this year">
      <Column gap="16">
        <Text onBackground="neutral-weak">
          Super Admins can copy every school’s latest {sourceYear || 'prior-year'} plan into a new
          {' '}{targetYear || 'current-year'} draft. All answers are copied. Reviews and comments are not.
          Schools that already have a {targetYear} form are skipped. After a successful copy, {sourceYear} is archived and becomes read-only.
        </Text>
        <Row gap="16" wrap>
          <Column gap="8" style={{ minWidth: 160, flex: 1 }}>
            <Text variant="label-default-s">Copy from</Text>
            <input
              className="app-field"
              value={sourceYear}
              onChange={(event) => setSourceYear(event.target.value)}
              placeholder="2025-2026"
            />
          </Column>
          <Column gap="8" style={{ minWidth: 160, flex: 1 }}>
            <Text variant="label-default-s">Create drafts for</Text>
            <input
              className="app-field"
              value={targetYear}
              onChange={(event) => setTargetYear(event.target.value)}
              placeholder="2026-2027"
            />
          </Column>
        </Row>
        {error && (
          <Text variant="body-default-s" onBackground="danger-strong">
            {error}
          </Text>
        )}
        <Row gap="8">
          <Button onClick={() => setConfirming(true)} disabled={running || !sourceYear || !targetYear}>
            {running ? 'Copying schools…' : 'Copy all schools'}
          </Button>
        </Row>

        {confirming && (
          <Card padding="16" radius="m" background="neutral-weak">
            <Column gap="12">
              <Heading variant="heading-strong-s">Copy every {sourceYear} plan?</Heading>
              <Text variant="body-default-s">
                This creates a new {targetYear} draft for each school that has a {sourceYear} form
                and does not already have one for {targetYear}. Original forms are left unchanged.
              </Text>
              <Row gap="8" horizontal="end">
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button onClick={runRollover}>Start copy</Button>
              </Row>
            </Column>
          </Card>
        )}

        {summary && (
          <Column gap="12">
            <Row gap="8" wrap>
              {summary.map((item) => (
                <Tag key={item.label} size="s" variant="neutral" label={`${item.label}: ${item.value}`} />
              ))}
            </Row>
            {(result.skipped || []).slice(0, 8).map((item) => (
              <Text key={item.school} variant="body-default-s" onBackground="neutral-weak">
                Skipped {item.school}: {item.error}
              </Text>
            ))}
            {(result.errors || []).map((item) => (
              <Text key={item.school} variant="body-default-s" onBackground="danger-strong">
                {item.school}: {item.error}
              </Text>
            ))}
          </Column>
        )}
      </Column>
    </DashboardSection>
  );
}
