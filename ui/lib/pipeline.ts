import path from 'node:path';
import { parseApplications, parseReport } from './parser';
import type { Application, PipelineFilters, PipelineResponse } from './types';

export function getCareerOpsRoot(): string {
  return process.env.CAREER_OPS_ROOT || path.resolve(process.cwd(), '..');
}

function searchReports(careerOpsRoot: string, query: string): Set<number> | null {
  if (!query) return null;
  const apps = parseApplications(careerOpsRoot);
  const matches = new Set<number>();
  const q = query.toLowerCase();
  for (const a of apps) {
    if (!a.reportPath) continue;
    const summary = parseReport(careerOpsRoot, a.reportPath);
    if (!summary) continue;
    const haystack = [
      summary.company,
      summary.role,
      summary.archetype ?? '',
      summary.tldr ?? '',
      summary.remote ?? '',
      summary.comp ?? '',
      summary.legitimacy ?? '',
      summary.url ?? '',
      summary.body,
    ].join('\n').toLowerCase();
    if (haystack.includes(q)) matches.add(a.number);
  }
  return matches;
}

function bucketFor(score: number | null): string {
  if (score == null) return 'unknown';
  if (score >= 4.5) return '4.5-5.0';
  if (score >= 4.0) return '4.0-4.4';
  if (score >= 3.5) return '3.5-3.9';
  if (score >= 3.0) return '3.0-3.4';
  return '<3.0';
}

export function getPipeline(filters: PipelineFilters = {}): PipelineResponse {
  const root = getCareerOpsRoot();
  const apps = parseApplications(root);

  let rows = apps.slice();

  if (filters.status) {
    const wanted = filters.status.toLowerCase();
    rows = rows.filter((a) => a.status.toLowerCase() === wanted);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const reportMatches = searchReports(root, filters.search);
    rows = rows.filter((a) => {
      const inBasic =
        a.company.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q);
      if (inBasic) return true;
      return reportMatches?.has(a.number) ?? false;
    });
  }
  if (filters.minScore != null) rows = rows.filter((a) => (a.score ?? -1) >= filters.minScore!);
  if (filters.maxScore != null) rows = rows.filter((a) => (a.score ?? -1) <= filters.maxScore!);

  const sort = filters.sort ?? 'date';
  const order = filters.order ?? 'desc';
  rows.sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case 'score': cmp = (a.score ?? -1) - (b.score ?? -1); break;
      case 'company': cmp = a.company.localeCompare(b.company); break;
      case 'status': cmp = a.status.localeCompare(b.status); break;
      case 'date':
      default:
        cmp = a.date.localeCompare(b.date);
    }
    return order === 'asc' ? cmp : -cmp;
  });

  const total = rows.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 200;
  rows = rows.slice(offset, offset + limit);

  const all = apps;
  const byStatus: Record<string, number> = {};
  const byScoreBucket: Record<string, number> = {};
  for (const a of all) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const b = bucketFor(a.score);
    byScoreBucket[b] = (byScoreBucket[b] ?? 0) + 1;
  }

  return { total, rows, stats: { byStatus, byScoreBucket } };
}

export function getApplication(num: number): Application | null {
  const root = getCareerOpsRoot();
  const apps = parseApplications(root);
  return apps.find((a) => a.number === num) ?? null;
}
