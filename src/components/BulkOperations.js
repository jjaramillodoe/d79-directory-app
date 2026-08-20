'use client';

import { useMemo, useState } from 'react';
import {
  Column,
  Row,
  Text,
  Button,
  Card,
  ProgressBar,
  Tag,
} from '@once-ui-system/core';
import DashboardSection from './dashboard/DashboardSection';
import FormStatusTag from './dashboard/FormStatusTag';
import FormConfirmModal from './form-steps/FormConfirmModal';
import useAppToast from '../hooks/useAppToast';
import { inferSchoolYear } from '../lib/schoolYear';
import { completedStepCount, stepProgressPercent, TOTAL_STEPS } from '../lib/formProgress';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const SORT_COLUMNS = [
  { field: 'schoolName', label: 'School', width: '28%' },
  { field: 'principalName', label: 'Principal', width: '18%' },
  { field: 'schoolYear', label: 'Year', width: '12%' },
  { field: 'status', label: 'Status', width: '14%' },
  { field: 'progress', label: 'Progress', width: '16%' },
  { field: 'updatedAt', label: 'Updated', width: '12%' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function sortValue(form, field) {
  switch (field) {
    case 'schoolName':
      return (form.schoolName || '').toLowerCase();
    case 'principalName':
      return (form.principalName || '').toLowerCase();
    case 'schoolYear':
      return inferSchoolYear(form);
    case 'status':
      return form.status || '';
    case 'progress':
      return completedStepCount(form);
    case 'updatedAt':
      return new Date(form.updatedAt || form.createdAt || 0).getTime();
    default:
      return '';
  }
}

function SortHeader({ field, label, sortField, sortDirection, onSort }) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      style={{
        background: 'none',
        border: 0,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
      }}
    >
      <Text variant={active ? 'label-strong-s' : 'label-default-s'} onBackground={active ? 'brand-strong' : 'neutral-weak'}>
        {label}
        {active ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
      </Text>
    </button>
  );
}

export default function BulkOperations({ forms, onUpdateForms }) {
  const toast = useAppToast();
  const [selectedForms, setSelectedForms] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('schoolName');
  const [sortDirection, setSortDirection] = useState('asc');

  const schoolYears = useMemo(
    () =>
      Array.from(new Set(forms.map((form) => inferSchoolYear(form)).filter(Boolean))).sort().reverse(),
    [forms]
  );

  const filteredForms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return forms
      .filter((form) => {
        const matchesStatus = filterStatus === 'all' || form.status === filterStatus;
        const year = inferSchoolYear(form);
        const matchesYear = schoolYearFilter === 'all' || year === schoolYearFilter;
        const matchesSearch =
          !query ||
          (form.schoolName || '').toLowerCase().includes(query) ||
          (form.principalName || '').toLowerCase().includes(query) ||
          (form.principalEmail || '').toLowerCase().includes(query);
        return matchesStatus && matchesYear && matchesSearch;
      })
      .sort((a, b) => {
        const left = sortValue(a, sortField);
        const right = sortValue(b, sortField);
        if (left < right) return sortDirection === 'asc' ? -1 : 1;
        if (left > right) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [forms, filterStatus, schoolYearFilter, searchTerm, sortField, sortDirection]);

  const selectedCount = selectedForms.length;
  const totalCount = filteredForms.length;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'updatedAt' || field === 'progress' ? 'desc' : 'asc');
  };

  const handleSelectForm = (formId) => {
    setSelectedForms((current) =>
      current.includes(formId) ? current.filter((id) => id !== formId) : [...current, formId]
    );
  };

  const handleSelectAll = () => {
    setSelectedForms(allSelected ? [] : filteredForms.map((form) => form._id));
  };

  const handleBulkStatusUpdate = (newStatus) => {
    if (selectedCount === 0) return;
    const updatedForms = forms.map((form) =>
      selectedForms.includes(form._id)
        ? { ...form, status: newStatus, updatedAt: new Date().toISOString() }
        : form
    );
    onUpdateForms?.(updatedForms);
    setSelectedForms([]);
    setShowBulkActions(false);
    toast.success(`Updated ${selectedCount} plans to ${newStatus.replace('_', ' ')}`);
  };

  const handleBulkEmail = () => {
    if (selectedCount === 0 || !emailSubject || !emailMessage) return;
    setSelectedForms([]);
    setShowEmailComposer(false);
    setEmailSubject('');
    setEmailMessage('');
    toast.success(`Email queued for ${selectedCount} schools`);
  };

  const handleExport = () => {
    if (selectedCount === 0) return;
    const selectedFormData = forms.filter((form) => selectedForms.includes(form._id));
    const csvData = selectedFormData.map((form) => ({
      School: form.schoolName || '',
      Principal: form.principalName || '',
      Email: form.principalEmail || '',
      Year: inferSchoolYear(form),
      Status: form.status || '',
      Progress: `${completedStepCount(form)}/${TOTAL_STEPS}`,
      Updated: formatDate(form.updatedAt || form.createdAt),
    }));
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map((row) => Object.values(row).join(','));
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `school-plans-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedCount} plans`);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const responses = await Promise.all(
        selectedForms.map((formId) => fetch(`/api/forms/${formId}`, { method: 'DELETE' }))
      );
      const failed = responses.filter((response) => !response.ok).length;
      if (failed) throw new Error(`${failed} delete${failed === 1 ? '' : 's'} failed`);
      onUpdateForms?.(forms.filter((form) => !selectedForms.includes(form._id)));
      setSelectedForms([]);
      setShowBulkActions(false);
      setShowDeleteConfirm(false);
      toast.success(`Deleted ${selectedCount} plan${selectedCount === 1 ? '' : 's'}`);
    } catch (error) {
      toast.error(error.message || 'Could not delete plans');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Column gap="24" fillWidth>
      <DashboardSection
        title="Plans"
        description="Select rows, then export, email, or update status. Click a column header to sort."
        actions={
          <Row gap="8" vertical="center">
            {selectedCount > 0 && (
              <Text variant="label-default-s" onBackground="neutral-weak">
                {selectedCount} of {totalCount} selected
              </Text>
            )}
            <Button
              size="s"
              onClick={() => setShowBulkActions((open) => !open)}
              disabled={selectedCount === 0}
            >
              {showBulkActions ? 'Hide actions' : 'Bulk actions'}
            </Button>
          </Row>
        }
      >
        <Column gap="16" fillWidth>
          <Row gap="12" wrap>
            <Column gap="8" style={{ flex: 2, minWidth: 200 }}>
              <Text variant="label-default-s">Search</Text>
              <input
                className="app-field"
                type="search"
                placeholder="School, principal, or email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </Column>
            <Column gap="8" style={{ minWidth: 160 }}>
              <Text variant="label-default-s">School year</Text>
              <select
                className="app-field"
                value={schoolYearFilter}
                onChange={(event) => setSchoolYearFilter(event.target.value)}
              >
                <option value="all">All years</option>
                {schoolYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Column>
            <Column gap="8" style={{ minWidth: 160 }}>
              <Text variant="label-default-s">Status</Text>
              <select
                className="app-field"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Column>
          </Row>

          {showBulkActions && selectedCount > 0 && (
            <Card padding="16" radius="m" fillWidth background="neutral-weak">
              <Column gap="12">
                <Text variant="label-strong-s">Actions for {selectedCount} plans</Text>
                <Row gap="8" wrap>
                  <Button size="s" variant="secondary" onClick={() => handleBulkStatusUpdate('draft')}>
                    Draft
                  </Button>
                  <Button size="s" variant="secondary" onClick={() => handleBulkStatusUpdate('submitted')}>
                    Submitted
                  </Button>
                  <Button size="s" variant="secondary" onClick={() => handleBulkStatusUpdate('under_review')}>
                    Under review
                  </Button>
                  <Button size="s" variant="secondary" onClick={() => handleBulkStatusUpdate('approved')}>
                    Approve
                  </Button>
                  <Button size="s" variant="secondary" onClick={() => handleBulkStatusUpdate('rejected')}>
                    Reject
                  </Button>
                  <Button size="s" variant="secondary" onClick={() => setShowEmailComposer(true)}>
                    Email
                  </Button>
                  <Button size="s" variant="secondary" onClick={handleExport}>
                    Export CSV
                  </Button>
                  <Button size="s" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    Delete
                  </Button>
                </Row>
              </Column>
            </Card>
          )}

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--neutral-alpha-medium)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', width: 44 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all plans"
                    />
                  </th>
                  {SORT_COLUMNS.map((column) => (
                    <th
                      key={column.field}
                      style={{ textAlign: 'left', padding: '12px 8px', width: column.width }}
                    >
                      <SortHeader
                        field={column.field}
                        label={column.label}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredForms.map((form) => {
                  const selected = selectedForms.includes(form._id);
                  const progress = stepProgressPercent(form, TOTAL_STEPS);
                  const completed = completedStepCount(form);
                  return (
                    <tr
                      key={form._id}
                      style={{
                        borderBottom: '1px solid var(--neutral-alpha-medium)',
                        background: selected ? 'var(--brand-alpha-weak)' : undefined,
                      }}
                    >
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleSelectForm(form._id)}
                          aria-label={`Select ${form.schoolName}`}
                        />
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <Column gap="4">
                          <Row gap="8" vertical="center" wrap>
                            <Text variant="label-strong-s">{form.schoolName}</Text>
                            {form.locked && <Tag size="s" variant="warning" label="Archived" />}
                            {form.yearArchived && form.allowEditsWhenArchived && (
                              <Tag size="s" variant="success" label="Live" />
                            )}
                          </Row>
                          <Text variant="label-default-s" onBackground="neutral-weak">
                            {form.principalEmail}
                          </Text>
                        </Column>
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <Text variant="body-default-s">{form.principalName || '—'}</Text>
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <Text variant="body-default-s">{inferSchoolYear(form)}</Text>
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <FormStatusTag status={form.status} />
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <Column gap="4">
                          <ProgressBar value={progress} label={false} barBackground="brand-strong" />
                          <Text variant="label-default-s" onBackground="neutral-weak">
                            {completed}/{TOTAL_STEPS}
                          </Text>
                        </Column>
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {formatDate(form.updatedAt || form.createdAt)}
                        </Text>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredForms.length === 0 && (
            <Column horizontal="center" paddingY="32" gap="8">
              <Text variant="heading-strong-s">No plans match these filters</Text>
              <Text onBackground="neutral-weak">Try another year, status, or search.</Text>
            </Column>
          )}
        </Column>
      </DashboardSection>

      {showEmailComposer && (
        <div className="app-modal-backdrop">
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
            <Column gap="16">
              <Text variant="heading-strong-m">Email selected schools</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {selectedCount} recipient{selectedCount === 1 ? '' : 's'}
              </Text>
              <Column gap="8">
                <Text variant="label-default-s">Subject</Text>
                <input
                  className="app-field"
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                />
              </Column>
              <Column gap="8">
                <Text variant="label-default-s">Message</Text>
                <textarea
                  className="app-field"
                  rows={6}
                  value={emailMessage}
                  onChange={(event) => setEmailMessage(event.target.value)}
                />
              </Column>
              <Row gap="8" horizontal="end">
                <Button variant="secondary" onClick={() => setShowEmailComposer(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkEmail} disabled={!emailSubject || !emailMessage}>
                  Send
                </Button>
              </Row>
            </Column>
          </Card>
        </div>
      )}

      {showDeleteConfirm && (
        <FormConfirmModal
          title={`Delete ${selectedCount} plan${selectedCount === 1 ? '' : 's'}?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleBulkDelete}
        />
      )}
    </Column>
  );
}
