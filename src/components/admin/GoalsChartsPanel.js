'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Column, Grid } from '@once-ui-system/core';
import DashboardSection from '../dashboard/DashboardSection';

const SERIES_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * The goals page "Graphs" tab, extracted so recharts can be loaded lazily.
 *
 * Extracted as a whole panel rather than by wrapping each chart individually: recharts
 * composes through its children (`ResponsiveContainer > PieChart > Pie > Cell`) and inspects
 * their types, so lazily loading the pieces separately would break the composition. The unit
 * that can move is the entire subtree.
 */
export default function GoalsChartsPanel({ chartData }) {
  return (
    <Column gap="24" fillWidth>
      <Grid columns="2" gap="16" fillWidth s={{ columns: '1' }}>
        <DashboardSection title="Form status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData.statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={88}
                dataKey="value"
                label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
              >
                {chartData.statusDistribution.map((entry, index) => (
                  <Cell key={entry.name ?? `cell-${index}`} fill={SERIES_COLORS[index % 5]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </DashboardSection>
        <DashboardSection title="Answer mix">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Answered', value: chartData.questionStatusDistribution.answered },
                  { name: 'N/A', value: chartData.questionStatusDistribution.na },
                  { name: 'Empty', value: chartData.questionStatusDistribution.empty },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={88}
                dataKey="value"
                label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
                <Cell fill="#6b7280" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </DashboardSection>
      </Grid>
      <DashboardSection title="Step completion">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData.stepCompletion} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-alpha-medium)" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="step" type="category" width={110} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value}%`, 'Completion']} />
            <Bar dataKey="percentage" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </DashboardSection>
      <DashboardSection title="N/A by step">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData.naByStep}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-alpha-medium)" />
            <XAxis dataKey="step" angle={-35} textAnchor="end" height={90} tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="naCount" fill="#f59e0b" name="N/A" />
            <Bar dataKey="totalCount" fill="#cbd5e1" name="Total" />
          </BarChart>
        </ResponsiveContainer>
      </DashboardSection>
      {chartData.trends?.length > 0 && (
        <DashboardSection title="Completion over time">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-alpha-medium)" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgCompletion"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Avg completion %"
              />
              <Line
                type="monotone"
                dataKey="forms"
                stroke="#10b981"
                strokeWidth={2}
                name="Forms updated"
              />
            </LineChart>
          </ResponsiveContainer>
        </DashboardSection>
      )}
    </Column>
  );
}
