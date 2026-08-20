'use client';

import { useEffect, useState } from 'react';
import { Column, Row, Text, Heading, Button, Card, Tag } from '@once-ui-system/core';
import DashboardSection from '../dashboard/DashboardSection';
import { currentSchoolYear } from '../../lib/schoolYear';

export default function YearSettingsPanel({ focusYear } = {}) {
  const thisYear = currentSchoolYear();
  const [schoolYear, setSchoolYear] = useState(focusYear || thisYear);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState(null);
  const [versions, setVersions] = useState([]);
  const [stepKeys, setStepKeys] = useState([]);

  const load = async (year = schoolYear) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/school-year?schoolYear=${encodeURIComponent(year)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load year settings');
      setSettings(data);
      setVersions(data.versions || []);
      setStepKeys(data.stepKeys || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(schoolYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear]);

  useEffect(() => {
    if (focusYear && focusYear !== schoolYear) {
      setSchoolYear(focusYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusYear]);

  const save = async (updates) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/school-year', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolYear, ...updates }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setSettings((current) => ({ ...current, ...data }));
      setNotice('Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <DashboardSection title="School year settings">
        <Text onBackground="neutral-weak">Loading…</Text>
      </DashboardSection>
    );
  }

  const deadlines = settings?.deadlines?.length
    ? settings.deadlines
    : stepKeys.map((stepKey) => ({ stepKey, label: stepKey, dueDate: '' }));
  const goals = settings?.districtGoals || [];

  return (
    <DashboardSection title="School year settings">
      <Column gap="16">
        <Text onBackground="neutral-weak">
          Pin the question bank, set section due dates, and archive a prior year. If some principals are still finishing last year, make that year live here or reopen one school from Submissions.
        </Text>
        <Row gap="12" wrap vertical="end">
          <Column gap="8" style={{ minWidth: 160 }}>
            <Text variant="label-default-s">School year</Text>
            <input
              className="app-field"
              value={schoolYear}
              onChange={(event) => setSchoolYear(event.target.value)}
            />
          </Column>
          {settings?.archived && <Tag size="s" variant="warning" label="Archived · read-only" />}
          {!settings?.archived && settings?.planCounts && (
            <Tag size="s" variant="success" label="Live" />
          )}
        </Row>
        {settings?.planCounts && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            {settings.planCounts.total} plans · {settings.planCounts.unfinished} unfinished · {settings.planCounts.liveOverrides} individually live
          </Text>
        )}

        <Column gap="8">
          <Text variant="label-default-s">Pinned question bank</Text>
          <select
            className="app-field"
            value={settings?.questionBankVersion || ''}
            onChange={(event) => save({ questionBankVersion: event.target.value || null })}
          >
            <option value="">Latest published</option>
            {versions.map((item) => (
              <option key={item.version} value={item.version}>
                v{item.version} · {item.status}
                {item.schoolYear ? ` · ${item.schoolYear}` : ''}
              </option>
            ))}
          </select>
        </Column>

        <Column gap="8">
          <Heading variant="heading-strong-s">District goals</Heading>
          {goals.map((goal, index) => (
            <Row key={goal.key || index} gap="8" wrap>
              <input
                className="app-field"
                style={{ flex: 2, minWidth: 180 }}
                value={goal.label || ''}
                onChange={(event) => {
                  const next = goals.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, label: event.target.value } : item
                  );
                  setSettings((current) => ({ ...current, districtGoals: next }));
                }}
              />
              <input
                className="app-field"
                style={{ flex: 1, minWidth: 100 }}
                placeholder="Target"
                value={goal.target || ''}
                onChange={(event) => {
                  const next = goals.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, target: event.target.value } : item
                  );
                  setSettings((current) => ({ ...current, districtGoals: next }));
                }}
              />
            </Row>
          ))}
          <Button size="s" variant="secondary" onClick={() => save({ districtGoals: goals })} disabled={saving}>
            Save goals
          </Button>
        </Column>

        <Column gap="8">
          <Heading variant="heading-strong-s">Due dates</Heading>
          {deadlines.map((item, index) => (
            <Row key={item.stepKey || index} gap="8" wrap vertical="center">
              <Text variant="label-default-s" style={{ minWidth: 160 }}>{item.stepKey}</Text>
              <input
                className="app-field"
                type="date"
                value={item.dueDate ? String(item.dueDate).slice(0, 10) : ''}
                onChange={(event) => {
                  const next = deadlines.map((deadline, deadlineIndex) =>
                    deadlineIndex === index
                      ? { ...deadline, dueDate: event.target.value, label: deadline.label || deadline.stepKey }
                      : deadline
                  );
                  setSettings((current) => ({ ...current, deadlines: next }));
                }}
              />
            </Row>
          ))}
          <Button size="s" variant="secondary" onClick={() => save({ deadlines })} disabled={saving}>
            Save due dates
          </Button>
        </Column>

        <Row gap="8" wrap>
          {settings?.archived ? (
            <Button variant="secondary" onClick={() => save({ archived: false })} disabled={saving}>
              Make this year live
            </Button>
          ) : (
            <Button variant="danger" onClick={() => save({ archived: true })} disabled={saving}>
              Archive and lock this year
            </Button>
          )}
          <Button
            size="s"
            variant="tertiary"
            href={`/admin/submissions?year=${encodeURIComponent(schoolYear)}`}
          >
            Open plans for this year
          </Button>
        </Row>
        {error && <Text onBackground="danger-strong">{error}</Text>}
        {notice && <Text onBackground="success-strong">{notice}</Text>}
      </Column>
    </DashboardSection>
  );
}
