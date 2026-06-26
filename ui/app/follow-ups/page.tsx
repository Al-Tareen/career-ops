import Link from 'next/link';
import { getFollowups } from '@/lib/followups';
import { getCareerOpsRoot } from '@/lib/pipeline';
import { StatusPill } from '@/components/StatusPill';
import type { FollowupEntry } from '@/lib/followups';

const STATUS_DISPLAY: Record<string, string> = {
  evaluated: 'Evaluated',
  applied: 'Applied',
  responded: 'Responded',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  discarded: 'Discarded',
  skip: 'SKIP',
};

function normalizeStatus(s: string): string {
  const lower = s.toLowerCase();
  return STATUS_DISPLAY[lower] ?? s;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function FollowUpsPage() {
  const data = getFollowups();
  const { metadata, entries, cadenceConfig } = data;

  const groups = {
    overdue: entries.filter((e) => e.urgency === 'overdue' || e.urgency === 'urgent'),
    waiting: entries.filter((e) => e.urgency === 'waiting'),
    cold: entries.filter((e) => e.urgency === 'cold'),
  };
  void groups;
  const ordered: FollowupEntry[] = [...entries].sort((a, b) => {
    const ao = urgencyRank(a.urgency);
    const bo = urgencyRank(b.urgency);
    if (ao !== bo) return ao - bo;
    const ad = a.daysUntilNext ?? 0;
    const bd = b.daysUntilNext ?? 0;
    return ad - bd;
  });

  const root = getCareerOpsRoot();
  void root;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <p className="text-slate-400 text-sm mt-1">
          Cadence checked {metadata.analysisDate} · {metadata.totalTracked} tracked ·{' '}
          <span className="text-rose-300">{metadata.overdue} overdue</span>
          {metadata.urgent > 0 && <> · <span className="text-amber-300">{metadata.urgent} urgent</span></>}
          {metadata.cold > 0 && <> · <span className="text-slate-400">{metadata.cold} cold</span></>}
          {metadata.waiting > 0 && <> · <span className="text-emerald-300">{metadata.waiting} waiting</span></>}
        </p>
        {cadenceConfig && (
          <p className="text-slate-500 text-xs mt-1 mono">
            cadence: applied_first {cadenceConfig.applied_first ?? 7}d · applied_subsequent {cadenceConfig.applied_subsequent ?? 7}d · responded_subsequent {cadenceConfig.responded_subsequent ?? 3}d · interview_thankyou {cadenceConfig.interview_thankyou ?? 1}d
          </p>
        )}
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Overdue" value={metadata.overdue} accent="rose" />
        <Stat label="Urgent" value={metadata.urgent} accent="amber" />
        <Stat label="Waiting" value={metadata.waiting} accent="emerald" />
        <Stat label="Cold" value={metadata.cold} accent="slate" />
      </section>

      {ordered.length === 0 && (
        <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 p-6 text-center text-emerald-200">
          No follow-ups needed. 🎉
        </div>
      )}

      {ordered.length > 0 && (
        <section className="space-y-3">
          {ordered.map((e) => (
            <article
              key={e.num}
              className={`rounded-lg border p-4 ${cardStyle(e.urgency)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/applications/${e.num}`} className="text-lg font-semibold hover:underline">
                      <span className="text-accent-300">{e.company}</span>
                    </Link>
                    <span className="text-slate-300 truncate">— {e.role}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 text-sm text-slate-400">
                    <span className="mono">#{e.num}</span>
                    <span>·</span>
                    <span className="mono">{e.date}</span>
                    <span>·</span>
                    <StatusPill status={normalizeStatus(e.status)} />
                    {e.score && (
                      <>
                        <span>·</span>
                        <span className="mono">{e.score}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <UrgencyBadge urgency={e.urgency} />
                  {e.daysUntilNext !== null && e.daysUntilNext < 0 && (
                    <p className="text-xs text-slate-400 mono mt-1">
                      {Math.abs(e.daysUntilNext)}d overdue
                    </p>
                  )}
                  {e.daysUntilNext !== null && e.daysUntilNext >= 0 && (
                    <p className="text-xs text-slate-400 mono mt-1">
                      due in {e.daysUntilNext}d
                    </p>
                  )}
                </div>
              </div>

              {e.notes && (
                <p className="text-sm text-slate-300 mt-3 border-l-2 border-ink-700 pl-3 line-clamp-2">
                  {e.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-400">
                <span className="mono">applied {e.appliedDate ?? '—'}</span>
                {e.daysSinceApplication !== null && (
                  <>
                    <span>·</span>
                    <span>{e.daysSinceApplication}d ago</span>
                  </>
                )}
                <span>·</span>
                <span>{e.followupCount === 0 ? 'no follow-ups yet' : `${e.followupCount} follow-up${e.followupCount === 1 ? '' : 's'}`}</span>
                {e.contacts.length > 0 && (
                  <>
                    <span>·</span>
                    <span>contacts: {e.contacts.join(', ')}</span>
                  </>
                )}
                {e.nextFollowupDate && (
                  <>
                    <span>·</span>
                    <span>next: <span className="mono">{e.nextFollowupDate}</span></span>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function urgencyRank(u: string): number {
  switch (u) {
    case 'urgent': return 0;
    case 'overdue': return 1;
    case 'waiting': return 2;
    case 'cold': return 3;
    default: return 4;
  }
}

function cardStyle(u: string): string {
  switch (u) {
    case 'urgent': return 'border-amber-700/50 bg-amber-950/20';
    case 'overdue': return 'border-rose-700/50 bg-rose-950/20';
    case 'waiting': return 'border-emerald-700/40 bg-emerald-950/10';
    case 'cold': return 'border-slate-700/40 bg-slate-900/40';
    default: return 'border-ink-800 bg-ink-900/60';
  }
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = {
    urgent: 'bg-amber-700/40 text-amber-200 border-amber-700/60',
    overdue: 'bg-rose-700/40 text-rose-200 border-rose-700/60',
    waiting: 'bg-emerald-700/40 text-emerald-200 border-emerald-700/60',
    cold: 'bg-slate-700/60 text-slate-300 border-slate-700/60',
  };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs uppercase tracking-wider ${colors[urgency] ?? ''}`}>
      {urgency}
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: 'rose' | 'amber' | 'emerald' | 'slate' }) {
  const colors: Record<string, string> = {
    rose: 'text-rose-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    slate: 'text-slate-300',
  };
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900/60 p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${colors[accent]}`}>{value}</p>
    </div>
  );
}
