import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { getCareerOpsRoot } from './pipeline';

export type FollowupUrgency = 'overdue' | 'urgent' | 'waiting' | 'cold';

export interface FollowupEntry {
  num: number;
  date: string;
  appliedDate: string | null;
  company: string;
  role: string;
  status: string;
  score: string | null;
  notes: string;
  reportPath: string | null;
  contacts: string[];
  daysSinceApplication: number | null;
  daysSinceLastFollowup: number | null;
  followupCount: number;
  urgency: FollowupUrgency;
  nextFollowupDate: string | null;
  daysUntilNext: number | null;
}

export interface FollowupMetadata {
  analysisDate: string;
  totalTracked: number;
  actionable: number;
  overdue: number;
  urgent: number;
  cold: number;
  waiting: number;
}

export interface FollowupResponse {
  metadata: FollowupMetadata;
  entries: FollowupEntry[];
  cadenceConfig?: Record<string, number>;
}

interface CacheEntry {
  fetchedAt: number;
  data: FollowupResponse;
}

const TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

export function getFollowups(opts: { overdueOnly?: boolean } = {}): FollowupResponse {
  const root = getCareerOpsRoot();
  const key = `${root}|${opts.overdueOnly ? 'overdue' : 'all'}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.data;

  const args = [path.join(root, 'followup-cadence.mjs')];
  if (opts.overdueOnly) args.push('--overdue-only');

  let raw: string;
  try {
    raw = execFileSync(process.execPath, args, {
      cwd: root,
      encoding: 'utf-8',
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return {
      metadata: {
        analysisDate: new Date().toISOString().slice(0, 10),
        totalTracked: 0, actionable: 0, overdue: 0, urgent: 0, cold: 0, waiting: 0,
      },
      entries: [],
      cadenceConfig: {},
      _error: msg,
    } as FollowupResponse & { _error: string };
  }

  let parsed: FollowupResponse;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      metadata: {
        analysisDate: new Date().toISOString().slice(0, 10),
        totalTracked: 0, actionable: 0, overdue: 0, urgent: 0, cold: 0, waiting: 0,
      },
      entries: [],
    };
  }
  cache.set(key, { fetchedAt: Date.now(), data: parsed });
  return parsed;
}

export function clearFollowupCache(): void {
  cache.clear();
}
