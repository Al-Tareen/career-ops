import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRegistry } from '@/lib/jobs/registry';
import { JobLogStream } from '@/components/JobLogStream';

function nextStepFor(jobLabel: string): { href: string; label: string } | null {
  const l = jobLabel.toLowerCase();
  if (l.includes('scan')) return { href: '/inbox', label: 'Open inbox → review new URLs' };
  if (l.includes('pipeline') || l.includes('process'))
    return { href: '/pipeline', label: 'Open pipeline → see new applications' };
  if (l.includes('generate pdf')) return { href: '/applications', label: 'Back to pipeline' };
  if (l.includes('liveness')) return { href: '/pipeline', label: 'Open pipeline' };
  if (l.includes('follow-up')) return { href: '/follow-ups', label: 'Open follow-ups' };
  if (l.includes('apply') || l.includes('interview') || l.includes('cover') || l.includes('contact'))
    return { href: '/pipeline', label: 'Back to pipeline' };
  return { href: '/jobs', label: 'All jobs' };
}

export const dynamic = 'force-dynamic';

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const registry = getRegistry();
  const job = registry.get(params.id);
  if (!job) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/jobs" className="text-xs text-accent-300 hover:underline">← All jobs</Link>
          <h1 className="text-2xl font-bold mt-2">{job.label}</h1>
          <p className="text-slate-500 text-xs mt-1 mono">
            job {job.id.slice(0, 8)} · {job.kind} · cwd: {job.cwd}
          </p>
          {job.errorMessage && (
            <p className="text-sm text-rose-300 mt-2">{job.errorMessage}</p>
          )}
        </div>
        {(job.status === 'done' || job.status === 'failed' || job.status === 'cancelled' || job.status === 'timeout') && (() => {
          const step = nextStepFor(job.label);
          if (!step) return null;
          return (
            <Link
              href={step.href}
              className="text-sm bg-accent-500/20 hover:bg-accent-500/30 text-accent-200 border border-accent-500/40 rounded px-4 py-2"
            >
              {step.label}
            </Link>
          );
        })()}
      </div>

      <JobLogStream
        jobId={job.id}
        initialLogs={job.logs}
        initialStatus={job.status}
      />
    </div>
  );
}
