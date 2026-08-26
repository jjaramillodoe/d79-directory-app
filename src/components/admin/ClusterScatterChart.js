'use client';

import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

const SERIES_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * The only recharts usage in the goals page "Clustering" tab.
 *
 * The cluster lists around it are plain Once UI markup, so just this chart is split out —
 * the surrounding tab stays eager and cheap.
 */
export default function ClusterScatterChart({ clusters }) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-alpha-medium)" />
        <XAxis type="number" dataKey="completionRate" name="Completion" unit="%" domain={[0, 100]} />
        <YAxis type="number" dataKey="naRate" name="N/A" unit="%" domain={[0, 100]} />
        <ZAxis type="number" dataKey="stepProgress" range={[50, 400]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Legend />
        {clusters.map((cluster, idx) => (
          <Scatter
            key={idx}
            name={`Cluster ${idx + 1}`}
            data={cluster.forms.map((f) => ({
              completionRate: parseFloat(f.completionRate),
              naRate: parseFloat(f.naRate),
              stepProgress: parseFloat(f.stepProgress),
            }))}
            fill={SERIES_COLORS[idx % 5]}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
