'use client';

import { useState } from 'react';
import {
  Column,
  Row,
  Text,
  Button,
  ProgressBar,
  Spinner,
  Card,
  Grid,
  Tag,
} from '@once-ui-system/core';
import FormStatusTag from '../dashboard/FormStatusTag';
import StatCard from '../dashboard/StatCard';
import DashboardSection from '../dashboard/DashboardSection';
import { inferSchoolYear } from '../../lib/schoolYear';
import { completedStepCount, stepProgressPercent, TOTAL_STEPS } from '../../lib/formProgress';

const STATUS_FILTERS = [
  { key: 'all', accentKey: 'total', label: 'Total', status: 'all' },
  { key: 'draft', accentKey: 'draft', label: 'Draft', status: 'draft' },
  { key: 'submitted', accentKey: 'submitted', label: 'Submitted', status: 'submitted' },
  { key: 'underReview', accentKey: 'underReview', label: 'Under Review', status: 'under_review' },
  { key: 'approved', accentKey: 'approved', label: 'Approved', status: 'approved' },
  { key: 'rejected', accentKey: 'rejected', label: 'Rejected', status: 'rejected' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function PermissionTag({ permission }) {
  const variant =
    permission === 'owner' ? 'success' : permission === 'edit' ? 'brand' : 'neutral';
  return <Tag size="s" variant={variant} label={permission || 'N/A'} />;
}

function CollaboratorList({ items, emptyLabel }) {
  if (!items || items.length === 0) {
    return (
      <Text variant="body-default-s" onBackground="neutral-weak">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Column gap="8">
      {items.map((item, index) => (
        <Row key={`${item.email || item.name}-${index}`} gap="8" vertical="center" wrap>
          <Text variant="label-strong-s">{item.name || item.email}</Text>
          <Tag size="s" variant={item.permissions === 'edit' ? 'brand' : 'neutral'} label={item.permissions} />
        </Row>
      ))}
    </Column>
  );
}

function SubmissionRow({ submission, onView, onPrint, onReview, onTransfer, onDuplicate, onDelete, onToggleLive }) {
  const [expanded, setExpanded] = useState(false);
  const completed = completedStepCount(submission);
  const progress = stepProgressPercent(submission, TOTAL_STEPS);
  const collaboratorCount = submission.level3Collaborators?.length || 0;
  const sharedCount = submission.sharedWithEmails?.length || 0;

  return (
    <Column
      fillWidth
      gap="12"
      padding="16"
      border="neutral-medium"
      radius="m"
    >
      <Row fillWidth gap="16" vertical="center" wrap>
        <Column gap="4" style={{ flex: 2, minWidth: 180 }}>
          <Row gap="8" vertical="center" wrap>
            <Text weight="strong">{submission.schoolName}</Text>
            <Tag size="s" variant="neutral" label={inferSchoolYear(submission)} />
            {submission.locked && <Tag size="s" variant="warning" label="Archived" />}
            {submission.yearArchived && submission.allowEditsWhenArchived && (
              <Tag size="s" variant="success" label="Live override" />
            )}
          </Row>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {submission.principalName} · {submission.principalEmail}
          </Text>
        </Column>
        <Row style={{ minWidth: 120 }}>
          <FormStatusTag status={submission.status} />
        </Row>
        <Column gap="4" style={{ flex: 1.2, minWidth: 140 }}>
          <ProgressBar value={progress} label={false} barBackground="brand-strong" />
          <Text variant="label-default-s" onBackground="neutral-weak">
            {completed}/{TOTAL_STEPS} steps · {progress}%
          </Text>
        </Column>
        <Column gap="4" style={{ minWidth: 120 }}>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Created {formatDate(submission.createdAt)}
          </Text>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Submitted {formatDate(submission.submittedAt)}
          </Text>
        </Column>
      </Row>

      <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
        <Row gap="8" vertical="center" wrap>
          <PermissionTag permission={submission.userPermission} />
          {(collaboratorCount > 0 || sharedCount > 0) && (
            <Tag
              size="s"
              variant="neutral"
              label={`${collaboratorCount + sharedCount} shared`}
            />
          )}
          <Button
            size="s"
            variant="tertiary"
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? 'Hide details' : 'Details'}
          </Button>
        </Row>
        <Row gap="8" wrap>
          <Button size="s" variant="primary" onClick={() => onView(submission)}>
            View
          </Button>
          <Button size="s" variant="tertiary" href={`/form/${submission._id}/compare`}>
            Compare
          </Button>
          <Button size="s" variant="secondary" onClick={() => onPrint(submission)}>
            Print
          </Button>
          <Button size="s" variant="secondary" onClick={() => onReview(submission)}>
            Review
          </Button>
          <Button size="s" variant="tertiary" onClick={() => onTransfer(submission)}>
            Transfer
          </Button>
          <Button size="s" variant="secondary" onClick={() => onDuplicate(submission)}>
            Duplicate
          </Button>
          {submission.yearArchived && (
            <Button
              size="s"
              variant={submission.allowEditsWhenArchived ? 'secondary' : 'primary'}
              onClick={() => onToggleLive(submission, !submission.allowEditsWhenArchived)}
            >
              {submission.allowEditsWhenArchived ? 'Return to archived' : 'Make live'}
            </Button>
          )}
          <Button size="s" variant="danger" onClick={() => onDelete(submission)}>
            Delete
          </Button>
        </Row>
      </Row>

      {expanded && (
        <Row
          fillWidth
          gap="24"
          padding="16"
          background="neutral-weak"
          radius="m"
          wrap
        >
          <Column gap="8" style={{ flex: 1, minWidth: 180 }}>
            <Text variant="label-strong-s">Edit rights</Text>
            <PermissionTag permission={submission.userPermission} />
          </Column>
          <Column gap="8" style={{ flex: 1, minWidth: 180 }}>
            <Text variant="label-strong-s">Level 3 collaborators</Text>
            <CollaboratorList items={submission.level3Collaborators} emptyLabel="None" />
          </Column>
          <Column gap="8" style={{ flex: 1, minWidth: 180 }}>
            <Text variant="label-strong-s">Shared emails</Text>
            <CollaboratorList items={submission.sharedWithEmails} emptyLabel="None" />
          </Column>
        </Row>
      )}
    </Column>
  );
}

export default function SubmissionsWorkspace({
  submissions,
  filteredSubmissions,
  loading,
  filterStatus,
  setFilterStatus,
  progressFilter,
  setProgressFilter,
  dateRange,
  setDateRange,
  searchTerm,
  setSearchTerm,
  schoolYearFilter,
  setSchoolYearFilter,
  schoolYears = [],
  schoolFilter = 'all',
  setSchoolFilter,
  schools = [],
  principalFilter = 'all',
  setPrincipalFilter,
  principals = [],
  sortField,
  handleSort,
  stats,
  onView,
  onPrint,
  onReview,
  onTransfer,
  onDuplicate,
  onDelete,
  onToggleLive,
}) {
  const sortOptions = [
    { field: 'schoolName', label: 'School' },
    { field: 'principalName', label: 'Principal' },
    { field: 'status', label: 'Status' },
    { field: 'progress', label: 'Progress' },
    { field: 'createdAt', label: 'Created' },
    { field: 'submittedAt', label: 'Submitted' },
  ];

  const hasActiveFilters =
    searchTerm ||
    filterStatus !== 'all' ||
    schoolYearFilter !== 'all' ||
    schoolFilter !== 'all' ||
    principalFilter !== 'all' ||
    progressFilter !== 'all' ||
    dateRange.startDate ||
    dateRange.endDate;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setSchoolYearFilter('all');
    setSchoolFilter?.('all');
    setPrincipalFilter?.('all');
    setProgressFilter('all');
    setDateRange({ startDate: '', endDate: '' });
  };

  return (
    <Column gap="24" fillWidth>
      <Grid columns="6" gap="16" fillWidth s={{ columns: '2' }} m={{ columns: '3' }}>
        {STATUS_FILTERS.map((item) => (
          <StatCard
            key={item.key}
            accentKey={item.accentKey}
            label={item.label}
            value={stats[item.key] ?? 0}
            selected={filterStatus === item.status}
            onClick={() => setFilterStatus(item.status)}
          />
        ))}
      </Grid>

      <Card padding="24" radius="l" fillWidth direction="column">
        <Column gap="16" fillWidth>
          <Grid columns="4" gap="16" fillWidth s={{ columns: '1' }} m={{ columns: '2' }}>
            <Column gap="8">
              <Text variant="label-default-s">Search</Text>
              <input
                className="app-field"
                type="search"
                placeholder="School, principal, or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Column>
            <Column gap="8">
              <Text variant="label-default-s">School</Text>
              <select
                className="app-field"
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
              >
                <option value="all">All schools</option>
                {schools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </Column>
            <Column gap="8">
              <Text variant="label-default-s">Principal</Text>
              <select
                className="app-field"
                value={principalFilter}
                onChange={(e) => setPrincipalFilter(e.target.value)}
              >
                <option value="all">All principals</option>
                {principals.map((principal) => (
                  <option key={principal.value} value={principal.value}>
                    {principal.email && principal.email !== principal.name
                      ? `${principal.name} · ${principal.email}`
                      : principal.name}
                  </option>
                ))}
              </select>
            </Column>
            <Column gap="8">
              <Text variant="label-default-s">School year</Text>
              <select
                className="app-field"
                value={schoolYearFilter}
                onChange={(e) => setSchoolYearFilter(e.target.value)}
              >
                <option value="all">All years</option>
                {schoolYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Column>
            <Column gap="8">
              <Text variant="label-default-s">Progress</Text>
              <select
                className="app-field"
                value={progressFilter}
                onChange={(e) => setProgressFilter(e.target.value)}
              >
                <option value="all">All progress</option>
                <option value="not_started">Not started (0/14)</option>
                <option value="partial">Partial (1–13/14)</option>
                <option value="complete">Complete (14/14)</option>
                <option value="incomplete">Incomplete (under 14)</option>
              </select>
            </Column>
            <Column gap="8">
              <Text variant="label-default-s">Created from</Text>
              <input
                className="app-field"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </Column>
            <Column gap="8">
              <Text variant="label-default-s">Created to</Text>
              <input
                className="app-field"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </Column>
          </Grid>

          <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
            <Row gap="8" wrap vertical="center">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Sort
              </Text>
              {sortOptions.map((option) => (
                <Button
                  key={option.field}
                  size="s"
                  variant={sortField === option.field ? 'primary' : 'secondary'}
                  onClick={() => handleSort(option.field)}
                >
                  {option.label}
                </Button>
              ))}
            </Row>
            <Row gap="8" wrap vertical="center">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Showing {filteredSubmissions.length} of {submissions.length}
              </Text>
              {hasActiveFilters && (
                <Button size="s" variant="tertiary" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </Row>
          </Row>
        </Column>
      </Card>

      <DashboardSection title={`Forms (${filteredSubmissions.length})`}>
        {loading ? (
          <Column horizontal="center" vertical="center" paddingY="48" gap="16">
            <Spinner size="l" />
            <Text onBackground="neutral-weak">Loading submissions...</Text>
          </Column>
        ) : filteredSubmissions.length === 0 ? (
          <Column horizontal="center" paddingY="48" gap="8">
            <Text variant="heading-strong-l" align="center">
              No submissions found
            </Text>
            <Text onBackground="neutral-weak" align="center">
              {hasActiveFilters
                ? 'Try adjusting search or filters.'
                : 'School plan submissions will appear here for review.'}
            </Text>
          </Column>
        ) : (
          <Column gap="12" fillWidth>
            {filteredSubmissions.map((submission) => (
              <SubmissionRow
                key={submission._id}
                submission={submission}
                onView={onView}
                onPrint={onPrint}
                onReview={onReview}
                onTransfer={onTransfer}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onToggleLive={onToggleLive}
              />
            ))}
          </Column>
        )}
      </DashboardSection>
    </Column>
  );
}
