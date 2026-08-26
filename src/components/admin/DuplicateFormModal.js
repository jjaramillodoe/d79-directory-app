'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Column, Row, Text, Heading, Button, Card } from '@once-ui-system/core';
import { inferSchoolYear, nextSchoolYear } from '../../lib/schoolYear';
import Modal from '../ui/Modal';

export default function DuplicateFormModal({ form, onClose, onDuplicated }) {
  const router = useRouter();
  const sourceYear = inferSchoolYear(form);
  const [targetYear, setTargetYear] = useState(nextSchoolYear(sourceYear));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingFormId, setExistingFormId] = useState(null);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    setTargetYear(nextSchoolYear(inferSchoolYear(form)));
    setError('');
    setExistingFormId(null);
    setCreated(null);
  }, [form]);

  const duplicate = async (force = false) => {
    if (!form?._id) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/forms/${form._id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolYear: targetYear.trim(), force }),
      });
      const data = await response.json();
      if (!response.ok) {
        setExistingFormId(data.existingFormId || null);
        throw new Error(data.error || 'Could not duplicate this form');
      }
      setCreated(data);
      if (onDuplicated) onDuplicated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={saving ? undefined : onClose} labelledBy="duplicate-modal-title">
      <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
        <Column gap="16">
          <Heading id="duplicate-modal-title" variant="heading-strong-m">Copy for a new school year</Heading>
          <Column gap="4">
            <Text variant="body-default-s">School: {form.schoolName}</Text>
            <Text variant="body-default-s">Current year: {sourceYear}</Text>
          </Column>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Answers from last year’s plan are copied into this new draft, including every section. Reviews, comments, and sharing are not carried over. Status stays a draft so the school can update names, dates, and goals, then attest and submit.
          </Text>

          {created ? (
            <Column gap="12">
              <Text variant="body-default-s">
                Created a {created.schoolYear} draft from the {created.sourceYear} plan.
              </Text>
              <Row gap="8" horizontal="end" wrap>
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={() => router.push(`/form/${created.formId}`)}>
                  Open new form
                </Button>
              </Row>
            </Column>
          ) : (
            <>
              <Column gap="8">
                <Text as="label" htmlFor="duplicate-target-year" variant="label-default-s">New school year</Text>
                <input
                  id="duplicate-target-year"
                  className="app-field"
                  value={targetYear}
                  onChange={(event) => setTargetYear(event.target.value)}
                  placeholder="2026-2027"
                />
              </Column>
              {error && (
                <Text variant="body-default-s" onBackground="danger-strong">
                  {error}
                </Text>
              )}
              <Row gap="8" horizontal="end" wrap>
                <Button variant="secondary" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                {existingFormId && (
                  <Button
                    variant="tertiary"
                    href={`/form/${existingFormId}`}
                  >
                    Open existing
                  </Button>
                )}
                {existingFormId ? (
                  <Button onClick={() => duplicate(true)} disabled={saving}>
                    {saving ? 'Copying…' : 'Create another copy'}
                  </Button>
                ) : (
                  <Button onClick={() => duplicate(false)} disabled={saving || !targetYear.trim()}>
                    {saving ? 'Copying…' : `Create ${targetYear || 'new'} draft`}
                  </Button>
                )}
              </Row>
            </>
          )}
        </Column>
      </Card>
    </Modal>
  );
}
