'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: Record<string, number>;
  minScore: number;
}

const COLORS = ['#52525b', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

export function ScoreHistogram({ data, minScore }: Props) {
  const order = ['<3.0', '3.0-3.4', '3.5-3.9', '4.0-4.4', '4.5-5.0'];
  const rows = order.map((bucket, i) => ({
    bucket,
    count: data[bucket] ?? 0,
    color: COLORS[i],
    aboveThreshold: bucketStart(bucket) >= minScore,
  }));

  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  if (max === 0) return <p className="text-slate-500 text-sm">No scored applications.</p>;

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="bucket" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
            cursor={{ fill: '#1e293b', opacity: 0.3 }}
            formatter={(value: number) => [`${value}`, 'count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.color} fillOpacity={r.aboveThreshold ? 1 : 0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-2">
        Above <span className="mono text-accent-300">{minScore.toFixed(1)}</span> threshold (auto-PDF): {rows.filter((r) => r.aboveThreshold).reduce((s, r) => s + r.count, 0)} application(s)
      </p>
    </div>
  );
}

function bucketStart(bucket: string): number {
  if (bucket.startsWith('<')) return 0;
  return Number.parseFloat(bucket.split('-')[0]);
}
