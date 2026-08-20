'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Column,
  Row,
  Grid,
  Text,
  Button,
  Card,
  Heading,
  Tag,
  ProgressBar,
} from '@once-ui-system/core';
import StatCard from './dashboard/StatCard';
import DashboardSection from './dashboard/DashboardSection';
import FormStatusTag from './dashboard/FormStatusTag';

const TIER_TAG = {
  Platinum: { label: 'Platinum', variant: 'brand' },
  Gold: { label: 'Gold', variant: 'warning' },
  Silver: { label: 'Silver', variant: 'neutral' },
  Bronze: { label: 'Bronze', variant: 'danger' },
};

const SORT_OPTIONS = [
  { field: 'overallScore', label: 'Score' },
  { field: 'completionRate', label: 'Completion' },
  { field: 'speedScore', label: 'Speed' },
  { field: 'qualityScore', label: 'Quality' },
  { field: 'schoolName', label: 'School' },
];

function scoreSchool(form) {
  const completedSteps = form.completedSteps?.length || 0;
  const completionRate = Math.round((completedSteps / 14) * 100);
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(form.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
  );
  const speedScore = Math.max(0, Math.min(100, 100 - daysSinceCreated * 1.5));

  let qualityScore = completionRate;
  if (form.status === 'approved') qualityScore += 10;
  if (form.status === 'rejected') qualityScore -= 20;
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  const deadlineMet = daysSinceCreated <= 30 ? 100 : Math.max(0, 100 - (daysSinceCreated - 30) * 2);
  const complianceScore = Math.round((deadlineMet + (form.status === 'approved' ? 100 : 0)) / 2);
  const overallScore = Math.round(speedScore * 0.3 + qualityScore * 0.4 + complianceScore * 0.3);

  let tier = 'Bronze';
  if (overallScore >= 90) tier = 'Platinum';
  else if (overallScore >= 80) tier = 'Gold';
  else if (overallScore >= 70) tier = 'Silver';

  const expectedCompletionRate = Math.max(0, 100 - daysSinceCreated * 2);
  const improvement = Math.round(completionRate - expectedCompletionRate);

  return {
    ...form,
    completionRate,
    speedScore,
    qualityScore,
    complianceScore,
    overallScore,
    tier,
    daysSinceCreated,
    improvement,
    lastSubmission: form.submittedAt || form.updatedAt || form.createdAt,
  };
}

export default function SchoolPerformanceScoring({ forms = [] }) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState('overallScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [showDetails, setShowDetails] = useState(null);

  const schoolPerformance = useMemo(() => {
    return forms
      .map(scoreSchool)
      .sort((a, b) => {
        const aValue = a[sortBy] ?? '';
        const bValue = b[sortBy] ?? '';
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [forms, sortBy, sortOrder]);

  const filteredSchools = useMemo(() => {
    if (filterBy === 'all') return schoolPerformance;
    return schoolPerformance.filter((school) => school.tier.toLowerCase() === filterBy);
  }, [schoolPerformance, filterBy]);

  const overallStats = useMemo(() => {
    const total = schoolPerformance.length;
    const avg = (key) =>
      total > 0
        ? Math.round(schoolPerformance.reduce((sum, school) => sum + school[key], 0) / total)
        : 0;

    return {
      total,
      avgOverallScore: avg('overallScore'),
      avgCompletionRate: avg('completionRate'),
      avgSpeedScore: avg('speedScore'),
      tierDistribution: {
        Platinum: schoolPerformance.filter((s) => s.tier === 'Platinum').length,
        Gold: schoolPerformance.filter((s) => s.tier === 'Gold').length,
        Silver: schoolPerformance.filter((s) => s.tier === 'Silver').length,
        Bronze: schoolPerformance.filter((s) => s.tier === 'Bronze').length,
      },
    };
  }, [schoolPerformance]);

  const handleExport = () => {
    if (schoolPerformance.length === 0) return;

    const rows = schoolPerformance.map((school) => ({
      'School Name': school.schoolName,
      Principal: school.principalName,
      'Overall Score': school.overallScore,
      Tier: school.tier,
      'Completion Rate': `${school.completionRate}%`,
      'Speed Score': school.speedScore,
      'Quality Score': school.qualityScore,
      'Compliance Score': school.complianceScore,
      'Days Since Created': school.daysSinceCreated,
      Improvement: school.improvement,
      Status: school.status,
      'Last Activity': school.lastSubmission
        ? new Date(school.lastSubmission).toLocaleDateString()
        : '',
    }));

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => headers.map((key) => `"${row[key] ?? ''}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const selectedSchool = schoolPerformance.find((school) => school._id === showDetails);

  if (!forms.length) {
    return (
      <Column horizontal="center" paddingY="48" gap="8">
        <Text variant="heading-strong-l" align="center">
          No performance data yet
        </Text>
        <Text onBackground="neutral-weak" align="center">
          School scores will appear here once plans are created.
        </Text>
      </Column>
    );
  }

  return (
    <Column gap="24" fillWidth>
      <Grid columns="4" gap="16" fillWidth s={{ columns: '2' }}>
        <StatCard
          accentKey="total"
          label="Avg. overall score"
          value={overallStats.avgOverallScore}
          hint={`${overallStats.total} schools`}
        />
        <StatCard
          accentKey="approved"
          label="Avg. completion"
          value={overallStats.avgCompletionRate}
          suffix="%"
        />
        <StatCard
          accentKey="submitted"
          label="Avg. speed"
          value={overallStats.avgSpeedScore}
        />
        <StatCard
          accentKey="underReview"
          label="Schools"
          value={overallStats.total}
        />
      </Grid>

      <Grid columns="4" gap="16" fillWidth s={{ columns: '2' }}>
        {Object.entries(overallStats.tierDistribution).map(([tier, count]) => (
          <StatCard
            key={tier}
            accentKey={
              tier === 'Platinum'
                ? 'submitted'
                : tier === 'Gold'
                  ? 'underReview'
                  : tier === 'Silver'
                    ? 'total'
                    : 'rejected'
            }
            label={tier}
            value={count}
            hint={`${overallStats.total ? Math.round((count / overallStats.total) * 100) : 0}%`}
            selected={filterBy === tier.toLowerCase()}
            onClick={() =>
              setFilterBy(filterBy === tier.toLowerCase() ? 'all' : tier.toLowerCase())
            }
          />
        ))}
      </Grid>

      <DashboardSection
        title={`Schools (${filteredSchools.length} of ${schoolPerformance.length})`}
        description="Ranked by speed, quality, and compliance"
        actions={
          <Row gap="8" wrap>
            {SORT_OPTIONS.map((option) => (
              <Button
                key={option.field}
                size="s"
                variant={sortBy === option.field ? 'primary' : 'secondary'}
                onClick={() => handleSort(option.field)}
              >
                {option.label}
                {sortBy === option.field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
              </Button>
            ))}
            <Button size="s" variant="tertiary" onClick={handleExport}>
              Export CSV
            </Button>
          </Row>
        }
      >
        {filteredSchools.length === 0 ? (
          <Column horizontal="center" paddingY="32" gap="8">
            <Text variant="heading-strong-m" align="center">
              No schools in this tier
            </Text>
            <Button size="s" variant="secondary" onClick={() => setFilterBy('all')}>
              Show all
            </Button>
          </Column>
        ) : (
          <Column gap="12" fillWidth>
            {filteredSchools.map((school, index) => {
              const tier = TIER_TAG[school.tier] || TIER_TAG.Bronze;
              return (
                <Row
                  key={school._id}
                  fillWidth
                  gap="16"
                  padding="16"
                  border="neutral-medium"
                  radius="m"
                  vertical="center"
                  wrap
                >
                  <Text variant="label-strong-s" style={{ width: 28 }}>
                    {index + 1}
                  </Text>
                  <Column gap="4" style={{ flex: 2, minWidth: 180 }}>
                    <Text weight="strong">{school.schoolName}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {school.principalName}
                    </Text>
                  </Column>
                  <Tag size="s" variant={tier.variant} label={school.tier} />
                  <FormStatusTag status={school.status} />
                  <Column gap="4" style={{ flex: 1.2, minWidth: 140 }}>
                    <ProgressBar value={school.overallScore} label={false} barBackground="brand-strong" />
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Score {school.overallScore} · {school.completionRate}% complete
                    </Text>
                  </Column>
                  <Row gap="8">
                    <Button
                      size="s"
                      variant="secondary"
                      onClick={() => setShowDetails(school._id)}
                    >
                      Details
                    </Button>
                    <Button size="s" onClick={() => router.push(`/form/${school._id}`)}>
                      View
                    </Button>
                  </Row>
                </Row>
              );
            })}
          </Column>
        )}
      </DashboardSection>

      {selectedSchool && (
        <div className="app-modal-backdrop">
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '40rem' }}>
            <Column gap="20">
              <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
                <Column gap="4">
                  <Heading variant="heading-strong-m">{selectedSchool.schoolName}</Heading>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {selectedSchool.principalName} · {selectedSchool.principalEmail}
                  </Text>
                </Column>
                <Button size="s" variant="tertiary" onClick={() => setShowDetails(null)}>
                  Close
                </Button>
              </Row>

              <Grid columns="4" gap="12" fillWidth s={{ columns: '2' }}>
                <StatCard accentKey="total" label="Overall" value={selectedSchool.overallScore} />
                <StatCard accentKey="approved" label="Completion" value={selectedSchool.completionRate} suffix="%" />
                <StatCard accentKey="submitted" label="Speed" value={selectedSchool.speedScore} />
                <StatCard accentKey="underReview" label="Quality" value={selectedSchool.qualityScore} />
              </Grid>

              <Row gap="8" wrap>
                <Tag
                  size="s"
                  variant={(TIER_TAG[selectedSchool.tier] || TIER_TAG.Bronze).variant}
                  label={selectedSchool.tier}
                />
                <FormStatusTag status={selectedSchool.status} />
              </Row>

              <Grid columns="2" gap="16" fillWidth s={{ columns: '1' }}>
                <Column gap="8">
                  <Text variant="label-strong-s">Timeline</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Created {selectedSchool.createdAt ? new Date(selectedSchool.createdAt).toLocaleDateString() : '—'}
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Active {selectedSchool.daysSinceCreated} days
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Last activity{' '}
                    {selectedSchool.lastSubmission
                      ? new Date(selectedSchool.lastSubmission).toLocaleDateString()
                      : '—'}
                  </Text>
                </Column>
                <Column gap="8">
                  <Text variant="label-strong-s">Progress</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {selectedSchool.completedSteps?.length || 0}/14 steps
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Compliance {selectedSchool.complianceScore}
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    vs expected {selectedSchool.improvement > 0 ? `+${selectedSchool.improvement}` : selectedSchool.improvement}
                  </Text>
                </Column>
              </Grid>

              <Row gap="8" horizontal="end">
                <Button variant="secondary" onClick={() => setShowDetails(null)}>
                  Close
                </Button>
                <Button onClick={() => router.push(`/form/${selectedSchool._id}`)}>
                  Open form
                </Button>
              </Row>
            </Column>
          </Card>
        </div>
      )}
    </Column>
  );
}
