'use client';

import { useEffect, useState } from 'react';
import { Column, Row, Text, Button, Tag } from '@once-ui-system/core';
import DashboardSection from './DashboardSection';
import { currentSchoolYear } from '../../lib/schoolYear';

export default function DeadlineReminders({ forms = [], userLevel }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/school-year?schoolYear=${encodeURIComponent(currentSchoolYear())}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const year = currentSchoolYear();
  const yearForms = forms.filter((form) => (form.schoolYear || year) === year && form.status === 'draft');
  const now = new Date();
  const overdue = [];

  (settings?.deadlines || []).forEach((deadline) => {
    if (!deadline.dueDate) return;
    const due = new Date(deadline.dueDate);
    if (Number.isNaN(due.getTime()) || due >= now) return;
    yearForms.forEach((form) => {
      const completed = Boolean(
        form.stepCompletion?.[deadline.stepKey] || form.formData?.[deadline.stepKey]?.completed
      );
      if (!completed) {
        overdue.push({
          formId: form._id,
          schoolName: form.schoolName,
          stepKey: deadline.stepKey,
          dueDate: due,
        });
      }
    });
  });

  const needsAttestation = yearForms.filter((form) => form.duplicatedFrom && !form.attestation?.confirmed);
  const needsUpdateCount = yearForms.filter((form) => (form.needsUpdate || []).length > 0).length;

  if (!settings || (overdue.length === 0 && needsAttestation.length === 0 && !needsUpdateCount)) {
    return null;
  }

  return (
    <DashboardSection title={`${year} reminders`}>
      <Column gap="12">
        {overdue.slice(0, 8).map((item) => (
          <Row key={`${item.formId}-${item.stepKey}`} fillWidth horizontal="between" vertical="center" wrap gap="8">
            <Column gap="4">
              <Text weight="strong">{item.schoolName}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {item.stepKey} was due {item.dueDate.toLocaleDateString()}
              </Text>
            </Column>
            <Button size="s" href={`/form/${item.formId}`}>Open</Button>
          </Row>
        ))}
        {needsAttestation.length > 0 && (
          <Tag size="s" variant="warning" label={`${needsAttestation.length} copied plan${needsAttestation.length === 1 ? '' : 's'} still need principal sign-off`} />
        )}
        {needsUpdateCount > 0 && (
          <Tag size="s" variant="brand" label={`${needsUpdateCount} plan${needsUpdateCount === 1 ? '' : 's'} have copied answers to review`} />
        )}
        {userLevel === 5 && overdue.length > 8 && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            Showing 8 of {overdue.length} overdue sections.
          </Text>
        )}
      </Column>
    </DashboardSection>
  );
}
