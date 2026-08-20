'use client';

import { Grid } from '@once-ui-system/core';
import StatCard from './StatCard';

const STAT_ITEMS = [
  { key: 'total', label: 'Total Submissions' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'underReview', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'averageProgress', label: 'Avg. Progress', suffix: '%' },
];

export default function DashboardStatsGrid({ stats }) {
  return (
    <Grid
      columns="6"
      gap="16"
      fillWidth
      s={{ columns: '2' }}
      m={{ columns: '3' }}
    >
      {STAT_ITEMS.map(({ key, label, suffix = '' }) => (
        <StatCard
          key={key}
          accentKey={key}
          label={label}
          value={stats[key] ?? 0}
          suffix={suffix}
        />
      ))}
    </Grid>
  );
}
