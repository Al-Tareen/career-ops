'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: Array<{ week: string; count: number }>;
}

export function ApplicationsTimeline({ data }: Props) {
  if (data.every((d) => d.count === 0)) {
    return <p className="text-slate-500 text-sm">No applications in the last 8 weeks.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
          formatter={(value: number) => [`${value}`, 'applications']}
        />
        <Line type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
