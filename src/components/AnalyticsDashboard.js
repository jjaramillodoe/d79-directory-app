'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Column,
  Row,
  Grid,
  Text,
  SegmentedControl,
} from '@once-ui-system/core';
import StatCard from './dashboard/StatCard';
import DashboardSection from './dashboard/DashboardSection';
import FormStatusTag from './dashboard/FormStatusTag';

const STEP_KEYS = [
  'tableOfContents', 'childAbuseIntervention', 'sexualHarassment',
  'respectForAll', 'suicidePrevention', 'attendancePlan',
  'temporaryHousing', 'serviceInSchools', 'planningInterviews',
  'militaryRecruitment', 'schoolCulture', 'afterSchoolPrograms',
  'cellPhonePolicy', 'counselingPlan',
];

const STEP_NAMES = [
  'Table of Contents', 'Child Abuse Prevention', 'Sexual Harassment',
  'Respect for All', 'Suicide Prevention', 'Attendance Plan',
  'Temporary Housing', 'Service in Schools', 'Planning Interviews',
  'Military Recruitment', 'School Culture', 'After School Programs',
  'Cell Phone Policy', 'School Counseling',
];

const STATUS_COLORS = {
  draft: '#94a3b8',
  submitted: '#3b82f6',
  under_review: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

function ChartTooltip({ active, payload, label, valueSuffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--surface-background)',
        border: '1px solid var(--neutral-alpha-medium)',
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      {label && (
        <div style={{ fontSize: 12, marginBottom: 4, color: 'var(--neutral-on-background-weak)' }}>
          {label}
        </div>
      )}
      {payload.map((item) => (
        <div key={item.dataKey} style={{ fontSize: 12, color: item.color }}>
          {item.name}: {item.value}{valueSuffix}
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard({ forms = [], stats = {} }) {
  const [timeRange, setTimeRange] = useState('30d');
  const total = stats.total || forms.length || 0;

  const submissionTrends = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const submitted = forms.filter((form) => {
        if (!form.submittedAt) return false;
        return new Date(form.submittedAt).toDateString() === date.toDateString();
      }).length;

      const approved = forms.filter((form) => {
        if (form.status !== 'approved' || !form.updatedAt) return false;
        return new Date(form.updatedAt).toDateString() === date.toDateString();
      }).length;

      const underReview = forms.filter((form) => {
        if (form.status !== 'under_review' || !form.updatedAt) return false;
        return new Date(form.updatedAt).toDateString() === date.toDateString();
      }).length;

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        submitted,
        approved,
        underReview,
      });
    }

    return data;
  }, [forms, timeRange]);

  const stepCompletionData = useMemo(() => {
    return STEP_KEYS.map((stepKey, index) => {
      const completed = forms.filter(
        (form) => form.stepCompletion?.[stepKey] || form.formData?.[stepKey]?.completed
      ).length;
      return {
        step: STEP_NAMES[index],
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        completed,
      };
    });
  }, [forms, total]);

  const schoolPerformance = useMemo(() => {
    return forms
      .map((form) => {
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

        return {
          id: form._id,
          school: form.schoolName || 'Unknown school',
          completionRate,
          overallScore: Math.round(speedScore * 0.3 + qualityScore * 0.7),
          status: form.status,
          completedSteps,
        };
      })
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10);
  }, [forms]);

  const statusData = useMemo(() => {
    const counts = forms.reduce((acc, form) => {
      const status = form.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([status, count]) => ({
      name: status.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()),
      value: count,
      color: STATUS_COLORS[status] || '#94a3b8',
    }));
  }, [forms]);

  const progressTrend = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const key = date.toISOString().split('T')[0];
      const dayForms = forms.filter(
        (form) => new Date(form.createdAt || 0).toISOString().split('T')[0] === key
      );
      const avgProgress =
        dayForms.length > 0
          ? dayForms.reduce((sum, form) => sum + (form.completedSteps?.length || 0), 0) /
            dayForms.length
          : 0;

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgProgress: Math.round(avgProgress),
        submissions: dayForms.length,
      };
    });
  }, [forms]);

  const completedForms = forms.filter((form) => form.status === 'approved' && form.submittedAt);
  const avgCompletionTime =
    completedForms.length > 0
      ? Math.round(
          completedForms.reduce((sum, form) => {
            const days = Math.floor(
              (new Date(form.submittedAt) - new Date(form.createdAt)) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / completedForms.length
        )
      : 0;
  const completionRate = total > 0 ? Math.round(((stats.approved || 0) / total) * 100) : 0;
  const pendingReviews = (stats.underReview || 0) + (stats.submitted || 0);

  if (!forms.length) {
    return (
      <Column horizontal="center" paddingY="48" gap="8">
        <Text variant="heading-strong-l" align="center">
          No analytics yet
        </Text>
        <Text onBackground="neutral-weak" align="center">
          Charts will appear here once school plans are created.
        </Text>
      </Column>
    );
  }

  return (
    <Column gap="24" fillWidth>
      <Grid columns="4" gap="16" fillWidth s={{ columns: '2' }}>
        <StatCard
          accentKey="total"
          label="Total submissions"
          value={total}
          hint={`${stats.submitted || 0} submitted`}
        />
        <StatCard
          accentKey="submitted"
          label="Avg. completion"
          value={avgCompletionTime}
          suffix="d"
          hint={
            completedForms.length
              ? `From ${completedForms.length} approved plans`
              : 'No approved plans yet'
          }
        />
        <StatCard
          accentKey="approved"
          label="Approval rate"
          value={completionRate}
          suffix="%"
          hint={`${stats.approved || 0} approved`}
        />
        <StatCard
          accentKey="underReview"
          label="Pending review"
          value={pendingReviews}
          hint={`${stats.submitted || 0} submitted · ${stats.underReview || 0} in review`}
        />
      </Grid>

      <Grid columns="2" gap="16" fillWidth s={{ columns: '1' }}>
        <DashboardSection
          title="Submission trends"
          description="Submitted, approved, and under review over time"
          actions={
            <SegmentedControl
              buttons={[
                { value: '7d', label: '7d' },
                { value: '30d', label: '30d' },
                { value: '90d', label: '90d' },
              ]}
              selected={timeRange}
              onToggle={setTimeRange}
              compact
            />
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={submissionTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-alpha-medium)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="submitted" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.45} name="Submitted" />
              <Area type="monotone" dataKey="approved" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.45} name="Approved" />
              <Area type="monotone" dataKey="underReview" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.45} name="Under review" />
            </AreaChart>
          </ResponsiveContainer>
        </DashboardSection>

        <DashboardSection title="Status distribution" description="Current mix of school plan statuses">
          {statusData.length === 0 ? (
            <Text onBackground="neutral-weak">No status data yet.</Text>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardSection>
      </Grid>

      <Grid columns="2" gap="16" fillWidth s={{ columns: '1' }}>
        <DashboardSection
          title="Step completion"
          description="Share of plans that finished each section"
        >
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={stepCompletionData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-alpha-medium)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="step" type="category" width={128} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip valueSuffix="%" />} />
              <Bar dataKey="completionRate" name="Completion" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardSection>

        <DashboardSection
          title="Progress trend"
          description="Average completed steps for plans created each day"
        >
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={progressTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-alpha-medium)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 14]} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="avgProgress"
                name="Avg. steps"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </DashboardSection>
      </Grid>

      <DashboardSection
        title="Top performing schools"
        description="Ranked by completion speed and quality"
      >
        {schoolPerformance.length === 0 ? (
          <Text onBackground="neutral-weak">No school scores yet.</Text>
        ) : (
          <Column gap="12" fillWidth>
            {schoolPerformance.map((school, index) => (
              <Row
                key={school.id || `${school.school}-${index}`}
                fillWidth
                gap="16"
                padding="12"
                border="neutral-medium"
                radius="m"
                vertical="center"
                wrap
              >
                <Text variant="label-strong-s" style={{ width: 28 }}>
                  {index + 1}
                </Text>
                <Column gap="4" style={{ flex: 2, minWidth: 160 }}>
                  <Text weight="strong">{school.school}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {school.completedSteps}/14 steps
                  </Text>
                </Column>
                <FormStatusTag status={school.status} />
                <Column gap="4" style={{ minWidth: 80 }} horizontal="end">
                  <Text variant="heading-strong-s">{school.overallScore}</Text>
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Score
                  </Text>
                </Column>
              </Row>
            ))}
          </Column>
        )}
      </DashboardSection>
    </Column>
  );
}
