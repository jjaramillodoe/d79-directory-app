'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Column, Row, Text, Button, Tag } from '@once-ui-system/core';
import DashboardSection from '../dashboard/DashboardSection';
import { currentSchoolYear, previousSchoolYear } from '../../lib/schoolYear';
import useAppToast from '../../hooks/useAppToast';

export default function YearLockPanel() {
  const toast = useAppToast();
  const [schoolYear, setSchoolYear] = useState(() => previousSchoolYear(currentSchoolYear()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  const load = async (year = schoolYear) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/school-year?schoolYear=${encodeURIComponent(year)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load year settings');
      setSettings(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(schoolYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear]);

  const setArchived = async (archived) => {
    setSaving(true);
    try {
      const response = await fetch('/api/school-year', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolYear, archived }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update year');
      setSettings((current) => ({ ...current, ...data }));
      toast.success(archived ? `${schoolYear} is archived and read-only.` : `${schoolYear} is live. Principals can finish those plans.`);
      await load(schoolYear);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const counts = settings?.planCounts || {};
  const archived = Boolean(settings?.archived);

  return (
    <DashboardSection
      title="Reopen an archived year"
      description="Use this when principals still need to finish last year’s plan. Unlock the whole year, or keep the year archived and make individual plans live from Submissions."
    >
      <Column gap="16" fillWidth>
        <Row gap="12" wrap vertical="end">
          <Column gap="8" style={{ minWidth: 160 }}>
            <Text variant="label-default-s">School year</Text>
            <input
              className="app-field"
              value={schoolYear}
              onChange={(event) => setSchoolYear(event.target.value)}
            />
          </Column>
          {archived ? (
            <Tag size="s" variant="warning" label="Archived · read-only" />
          ) : (
            <Tag size="s" variant="success" label="Live" />
          )}
        </Row>

        {loading && !settings ? (
          <Text onBackground="neutral-weak">Loading…</Text>
        ) : (
          <Column gap="8">
            <Text variant="body-default-s">
              {counts.total || 0} plans · {counts.unfinished || 0} unfinished · {counts.liveOverrides || 0} individually live
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Unlocking the year makes every {schoolYear} plan editable. Prefer “Make live” on one school in Submissions if only a few principals are late.
            </Text>
          </Column>
        )}

        <Row gap="8" wrap>
          {archived ? (
            <Button onClick={() => setArchived(false)} disabled={saving || loading}>
              {saving ? 'Updating…' : 'Make this year live'}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setArchived(true)} disabled={saving || loading}>
              {saving ? 'Updating…' : 'Archive this year'}
            </Button>
          )}
          <Button variant="secondary" href={`/admin/submissions?year=${encodeURIComponent(schoolYear)}`}>
            Open unfinished plans
          </Button>
          <Link href="/dashboard?view=bulk-create" style={{ textDecoration: 'none' }}>
            <Button variant="tertiary" size="s">
              Year setup
            </Button>
          </Link>
        </Row>
      </Column>
    </DashboardSection>
  );
}
