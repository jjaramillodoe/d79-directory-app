'use client';

import { useEffect, useMemo, useState } from 'react';
import { Column, Row, Text, Heading, Button, Card, Tag } from '@once-ui-system/core';
import DashboardSection from '../dashboard/DashboardSection';
import { currentSchoolYear } from '../../lib/schoolYear';
import useAppToast from '../../hooks/useAppToast';

function confidenceTag(value) {
  if (value === 'high') return { variant: 'success', label: 'High' };
  if (value === 'medium') return { variant: 'warning', label: 'Medium' };
  return { variant: 'neutral', label: 'Needs review' };
}

export default function ContactTableMigrate() {
  const toast = useAppToast();
  const [year, setYear] = useState(currentSchoolYear());
  const [questions, setQuestions] = useState([]);
  const [questionId, setQuestionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState({});
  const [openId, setOpenId] = useState('');
  const [error, setError] = useState('');

  const loadQuestions = async (nextYear = year) => {
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const response = await fetch(`/api/admin/forms/migrate-contacts?year=${encodeURIComponent(nextYear)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not scan questions');
      setQuestions(data.questions || []);
      const first = data.questions?.[0]?.id || '';
      setQuestionId((current) => (data.questions || []).some((item) => item.id === current) ? current : first);
    } catch (err) {
      setError(err.message);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scan = async () => {
    if (!questionId) return;
    setScanning(true);
    setError('');
    setConfirming(false);
    try {
      const response = await fetch('/api/admin/forms/migrate-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: year.trim(), questionId, apply: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not preview conversion');
      setPreview(data);
      const next = {};
      (data.items || []).forEach((item) => {
        next[item.formId] = true;
      });
      setSelected(next);
      setOpenId(data.items?.[0]?.formId || '');
    } catch (err) {
      setError(err.message);
      setPreview(null);
    } finally {
      setScanning(false);
    }
  };

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  const apply = async () => {
    setApplying(true);
    setError('');
    try {
      const response = await fetch('/api/admin/forms/migrate-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: year.trim(),
          questionId,
          apply: true,
          formIds: selectedIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not convert answers');
      toast.success(`Converted ${data.applied} school${data.applied === 1 ? '' : 's'}. Incomplete rows were flagged for review.`);
      setConfirming(false);
      setPreview(null);
      await loadQuestions(year);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setApplying(false);
    }
  };

  const downloadDiff = () => {
    const payload = preview?.diff || preview;
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `migration_diff_${year.trim()}_${questionId || 'question'}_${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleAll = (on) => {
    if (!preview?.items) return;
    const next = {};
    preview.items.forEach((item) => {
      next[item.formId] = on;
    });
    setSelected(next);
  };

  return (
    <DashboardSection
      title="Convert text lists into tables"
      description="Preview copied staff lists, then save them as table rows. Nothing is changed until you confirm."
    >
      <Column gap="16">
        <Text onBackground="neutral-weak">
          Preview first, then download the dry-run report. Emails and phones use regex; names and titles are best-effort.
          Original wording is kept in Notes/Raw Text so nothing is discarded. Incomplete rows get a review flag.
        </Text>
        <Row gap="16" wrap>
          <Column gap="8" style={{ minWidth: 160 }}>
            <Text variant="label-default-s">School year</Text>
            <input
              className="app-field"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              placeholder="2026-2027"
            />
          </Column>
          <Column gap="8" style={{ minWidth: 260, flex: 1 }}>
            <Text variant="label-default-s">Question</Text>
            <select
              className="app-field"
              value={questionId}
              onChange={(event) => setQuestionId(event.target.value)}
              disabled={loading || !questions.length}
            >
              {!questions.length && <option value="">No leftover text lists found</option>}
              {questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.stepTitle}: {question.title.slice(0, 80)}
                  {` (${question.stringAnswers} text${question.ready ? '' : ', set type to Table first'})`}
                </option>
              ))}
            </select>
          </Column>
        </Row>
        <Row gap="8" wrap>
          <Button variant="secondary" onClick={() => loadQuestions(year)} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh questions'}
          </Button>
          <Button onClick={scan} disabled={scanning || loading || !questionId}>
            {scanning ? 'Scanning…' : 'Preview conversion'}
          </Button>
        </Row>

        {error && (
          <Text variant="body-default-s" onBackground="danger-strong">
            {error}
          </Text>
        )}

        {preview && (
          <Column gap="12">
            <Row gap="8" wrap vertical="center">
              <Tag size="s" variant="brand" label={`${preview.matched} school${preview.matched === 1 ? '' : 's'} with text`} />
              <Tag size="s" variant="warning" label={`${preview.needingReview} need review`} />
              <Button size="s" variant="tertiary" onClick={() => toggleAll(true)}>
                Select all
              </Button>
              <Button size="s" variant="tertiary" onClick={() => toggleAll(false)}>
                Select none
              </Button>
              <Button size="s" variant="secondary" onClick={downloadDiff}>
                Download migration_diff.json
              </Button>
            </Row>

            {(preview.items || []).map((item) => {
              const open = openId === item.formId;
              return (
                <Card key={item.formId} padding="16" radius="m" fillWidth>
                  <Column gap="12">
                    <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
                      <Row gap="8" vertical="center" wrap>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[item.formId])}
                          onChange={(event) =>
                            setSelected((prev) => ({ ...prev, [item.formId]: event.target.checked }))
                          }
                        />
                        <Text variant="label-strong-s">{item.school}</Text>
                        <Tag size="s" variant="neutral" label={`${item.rows} row${item.rows === 1 ? '' : 's'}`} />
                        {item.review ? <Tag size="s" variant="warning" label="Review" /> : <Tag size="s" variant="success" label="Ready" />}
                      </Row>
                      <Button size="s" variant="tertiary" onClick={() => setOpenId(open ? '' : item.formId)}>
                        {open ? 'Hide rows' : 'Show rows'}
                      </Button>
                    </Row>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Original: {item.sourcePreview}
                      {item.sourceChars > 240 ? '…' : ''}
                    </Text>
                    {open && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr>
                              {['Name', 'Title', 'Email', 'Phone', 'Notes / original', 'Confidence'].map((header) => (
                                <th key={header} className="text-left pr-3 pb-1 font-medium">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {item.contacts.map((contact, index) => {
                              const tag = confidenceTag(contact.confidence);
                              return (
                                <tr key={`${item.formId}-${index}`}>
                                  <td className="pr-3 py-1">{contact.name || '—'}</td>
                                  <td className="pr-3 py-1">{contact.title || '—'}</td>
                                  <td className="pr-3 py-1">{contact.email || '—'}</td>
                                  <td className="pr-3 py-1">{contact.phone || '—'}</td>
                                  <td className="pr-3 py-1">{contact.unparsedNotes || '—'}</td>
                                  <td className="py-1">
                                    <Tag size="s" variant={tag.variant} label={tag.label} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Column>
                </Card>
              );
            })}

            <Row gap="8">
              <Button
                onClick={() => setConfirming(true)}
                disabled={!selectedIds.length || applying || preview.question?.type !== 'table'}
              >
                Convert {selectedIds.length} selected
              </Button>
            </Row>
            {preview.question?.type !== 'table' && (
              <Text variant="body-default-s" onBackground="warning-strong">
                Preview only until this question is published as Table in Question bank.
              </Text>
            )}
          </Column>
        )}

        {confirming && (
          <Card padding="16" radius="m" background="neutral-weak">
            <Column gap="12">
              <Heading variant="heading-strong-s">Save table rows for {selectedIds.length} school{selectedIds.length === 1 ? '' : 's'}?</Heading>
              <Text variant="body-default-s">
                Download migration_diff.json first and spot-check parsed rows against the original text. The original
                wording is kept in Notes/Raw Text. Incomplete rows are flagged for review.
              </Text>
              <Row gap="8" horizontal="end">
                <Button variant="secondary" onClick={() => setConfirming(false)} disabled={applying}>
                  Cancel
                </Button>
                <Button onClick={apply} disabled={applying}>
                  {applying ? 'Converting…' : 'Convert now'}
                </Button>
              </Row>
            </Column>
          </Card>
        )}
      </Column>
    </DashboardSection>
  );
}
