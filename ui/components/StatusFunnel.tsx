'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: Record<string, number>;
}

const ORDER = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP'];

const COLORS: Record<string, string> = {
  Evaluated: '#64748b',
  Applied: '#3b82f6',
  Responded: '#f59e0b',
  Interview: '#8b5cf6',
  Offer: '#10b981',
  Rejected: '#f43f5e',
  Discarded: '#71717a',
  SKIP: '#52525b',
};

export function StatusFunnel({ data }: Props) {
  const rows = ORDER.map((s) => ({ status: s, count: data[s] ?? 0 }))
    .concat(
      Object.keys(data)
        .filter((k) => !ORDER.includes(k))
        .map((k) => ({ status: k, count: data[k] ?? 0 })),
    );

  if (rows.every((r) => r.count === 0)) {
    return <p className="text-slate-500 text-sm">No applications yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="status"
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
          cursor={{ fill: '#1e293b', opacity: 0.3 }}
          formatter={(value: number) => [`${value}`, 'count']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {rows.map((r) => (
            <Cell key={r.status} fill={COLORS[r.status] ?? '#64748b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
