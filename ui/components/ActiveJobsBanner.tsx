'use client';

import { useEffect, useState } from 'react';

interface JobSummary {
  id: string;
  label: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled' | 'timeout';
  finishedAt: number | null;
}

interface JobsResponse {
  jobs: JobSummary[];
  busy: boolean;
}

const POLL_MS = 4000;

export function ActiveJobsBanner() {
  const [data, setData] = useState<JobsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const res = await fetch('/api/jobs', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as JobsResponse;
        if (cancelled) return;
        setData(body);
      } catch { /* ignore */ }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!data || data.jobs.length === 0) return null;

  const active = data.jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const recent = data.jobs.filter((j) => j.status === 'done' || j.status === 'failed' || j.status === 'cancelled' || j.status === 'timeout').slice(0, 3);

  return (
    <div className="space-y-2">
      {active.length > 0 && (
        <div className="rounded-lg border border-blue-700/40 bg-blue-950/30 px-4 py-3 flex items-center gap-3 text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-200 mono">
            {active.length} job{active.length === 1 ? '' : 's'} running: {active.map((j) => j.label).join(', ')}
          </span>
          <Link href={`/jobs/${active[0].id}`} className="ml-auto text-xs text-accent-300 hover:underline">
            View live →
          </Link>
        </div>
      )}
      {active.length === 0 && recent.length > 0 && (
        <div className="rounded-lg border border-ink-800 bg-ink-950/40 px-4 py-2 flex items-center gap-3 text-xs text-slate-400">
          <span className="mono">
            Last: {recent[0].label} · {recent[0].status}
          </span>
          <Link href={`/jobs/${recent[0].id}`} className="ml-auto text-accent-300 hover:underline">
            View →
          </Link>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
