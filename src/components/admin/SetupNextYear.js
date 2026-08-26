'use client';

import { useEffect, useState } from 'react';
import { Column, Row, Text, Heading, Button, Card, Tag } from '@once-ui-system/core';
import DashboardSection from '../dashboard/DashboardSection';
import useAppToast from '../../hooks/useAppToast';
import Modal from '../ui/Modal';

function formatDueDate(value) {
  if (!value) return 'No date yet';
  const stamp = String(value).slice(0, 10);
  return stamp || 'No date yet';
}

export default function SetupNextYear({ onCreated }) {
  const toast = useAppToast();
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/school-year');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load school years');
      setCycle(data.cycle || null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupNextYear = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/school-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromYear: cycle?.sourceYear }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not set up the next school year');
      }
      toast.success(`${data.schoolYear} is ready. Existing plans were not changed.`);
      setConfirming(false);
      await load();
      if (onCreated) onCreated(data.schoolYear);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const nextYear = cycle?.nextYear;
  const term = cycle?.term;
  const carryOver = cycle?.carryOver;
  const alreadyExists = Boolean(cycle?.nextYearExists);

  return (
    <>
    <DashboardSection
      title="Next school year"
      description="Create the next July–June cycle from the latest year already in the system. This does not copy school plans."
      actions={
        <Button
          onClick={() => setConfirming(true)}
          disabled={loading || !nextYear || alreadyExists}
        >
          {alreadyExists ? `${nextYear} is already set up` : `Set Up Next Year (${nextYear || '…'})`}
        </Button>
      }
    >
      <Column gap="12">
        {loading && !cycle ? (
          <Text onBackground="neutral-weak">Loading…</Text>
        ) : (
          <Row gap="8" wrap>
            <Tag size="s" variant="neutral" label={`Latest: ${cycle?.latestYear || '—'}`} />
            <Tag size="s" variant="brand" label={`Next: ${nextYear || '—'}`} />
            {term && (
              <Tag size="s" variant="neutral" label={`${term.startLabel} – ${term.endLabel}`} />
            )}
          </Row>
        )}
        <Text variant="body-default-s" onBackground="neutral-weak">
          Goals, due dates, and the pinned question bank carry forward. Use Copy last year into this year below when you are ready to duplicate school plans.
        </Text>
      </Column>
    </DashboardSection>

      {confirming && cycle && (
        <Modal
          onClose={saving ? undefined : () => setConfirming(false)}
          size="md"
          labelledBy="setup-next-year-title"
        >
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '36rem' }}>
            <Column gap="16">
              <Heading id="setup-next-year-title" variant="heading-strong-m">Set up {nextYear}?</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                The latest year in the system is {cycle.sourceYear}. {nextYear} will be created as a live cycle. Historical plans stay as they are.
              </Text>
              <Column gap="8" padding="16" background="neutral-weak" radius="m">
                <Text variant="label-strong-s">Term dates</Text>
                <Text variant="body-default-s">
                  {term?.startLabel} – {term?.endLabel}
                </Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {term?.start} through {term?.end}
                </Text>
              </Column>
              <Column gap="8">
                <Text variant="label-strong-s">Carried over from {cycle.sourceYear}</Text>
                <Text variant="body-default-s">
                  Question bank: {carryOver?.questionBankVersion ? `v${carryOver.questionBankVersion}` : 'Latest published'}
                </Text>
                {(carryOver?.districtGoals || []).map((goal) => (
                  <Text key={goal.key || goal.label} variant="body-default-s" onBackground="neutral-weak">
                    Goal · {goal.label}
                    {goal.target ? ` (${goal.target}${goal.unit ? ` ${goal.unit}` : ''})` : ''}
                  </Text>
                ))}
                {(carryOver?.deadlines || []).length > 0 ? (
                  (carryOver.deadlines || []).slice(0, 8).map((item) => (
                    <Text key={item.stepKey} variant="body-default-s" onBackground="neutral-weak">
                      Due date · {item.label || item.stepKey}: {formatDueDate(item.dueDate)}
                    </Text>
                  ))
                ) : (
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    No section due dates are set yet. You can add them after setup.
                  </Text>
                )}
              </Column>
              <Text variant="body-default-s" onBackground="neutral-weak">
                School plans are not copied and {cycle.sourceYear} is not archived.
              </Text>
              <Row gap="8" horizontal="end" wrap>
                <Button variant="secondary" onClick={() => setConfirming(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={setupNextYear} disabled={saving || alreadyExists}>
                  {saving ? 'Setting up…' : `Set up ${nextYear}`}
                </Button>
              </Row>
            </Column>
          </Card>
        </Modal>
      )}
    </>
  );
}
