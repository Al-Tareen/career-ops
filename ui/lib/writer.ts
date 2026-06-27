import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Application } from './types';
import { parseApplications } from './parser';
import { isCanonicalStatus, getCanonicalStatuses } from './states';

const LOCK_RETRIES = 25;
const LOCK_RETRY_MS = 80;

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

function lockPath(careerOpsRoot: string): string {
  return path.join(careerOpsRoot, '.ui-update.lock');
}

async function acquireLock(careerOpsRoot: string): Promise<string> {
  const lockFile = lockPath(careerOpsRoot);
  const id = randomUUID();
  for (let i = 0; i < LOCK_RETRIES; i++) {
    try {
      const handle = await fsp.open(lockFile, 'wx');
      await handle.writeFile(id, 'utf-8');
      await handle.close();
      return id;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'EEXIST') throw err;
      await sleep(LOCK_RETRY_MS);
    }
  }
  throw new Error('Timed out waiting for applications.md lock');
}

async function releaseLock(careerOpsRoot: string, id: string): Promise<void> {
  const lockFile = lockPath(careerOpsRoot);
  try {
    const current = await fsp.readFile(lockFile, 'utf-8').catch(() => '');
    if (current === id) {
      await fsp.unlink(lockFile);
    }
  } catch {
    /* already released */
  }
}

const PREFIX = '| ';
const FIELD_DELIM = ' | ';
const SUFFIX = ' |';

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function serializeRow(app: Application): string {
  const scoreText = app.scoreRaw || (app.score != null ? `${app.score}/5` : '');
  const pdf = app.hasPdf ? '✅' : '❌';
  const reportCell = app.reportLink ?? (app.reportPath ? `[${app.numberRaw}](${app.reportPath})` : '');
  const fields = [
    app.numberRaw,
    app.date,
    app.company,
    app.role,
    scoreText,
    app.status,
    pdf,
    reportCell,
    app.notes,
  ];
  return `${PREFIX}${fields.join(FIELD_DELIM)}${SUFFIX}`;
}

function detectSeparator(line: string): 'tab' | 'pipe' {
  return line.includes('\t') ? 'tab' : 'pipe';
}

function buildLine(fields: string[], sep: 'tab' | 'pipe'): string {
  if (sep === 'tab') return `${PREFIX}${fields.join(FIELD_DELIM)}\t`;
  return `${PREFIX}${fields.join(FIELD_DELIM)}${SUFFIX}`;
}

export async function writeApplications(careerOpsRoot: string, apps: Application[]): Promise<void> {
  const filePath = path.join(careerOpsRoot, 'data', 'applications.md');
  const raw = await fsp.readFile(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  const headerLines: string[] = [];
  let pastHeader = false;
  for (const line of lines) {
    if (pastHeader) break;
    headerLines.push(line);
    const t = line.trim();
    if (t.startsWith('|---') || t.startsWith('|#') || t.startsWith('| #')) {
      pastHeader = true;
    }
  }

  const trailingLines: string[] = [];
  for (let i = lines.length - 1; i >= headerLines.length; i--) {
    const t = lines[i].trim();
    if (t.startsWith('|')) break;
    trailingLines.unshift(lines[i]);
  }

  const updated = [
    ...headerLines,
    ...apps.map((a) => serializeRow(a)),
    ...trailingLines,
  ];

  const tmp = `${filePath}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, updated.join('\n'), 'utf-8');
  await fsp.rename(tmp, filePath);
}

export async function updateStatus(
  careerOpsRoot: string,
  number: number,
  newStatus: string,
): Promise<Application | null> {
  if (!isCanonicalStatus(newStatus, careerOpsRoot)) {
    throw new Error(`Status "${newStatus}" is not canonical. Allowed: ${getCanonicalStatuses(careerOpsRoot).join(', ')}`);
  }
  const lockId = await acquireLock(careerOpsRoot);
  try {
    const apps = parseApplications(careerOpsRoot);
    const target = apps.find((a) => a.number === number);
    if (!target) return null;
    target.status = newStatus;
    await writeApplications(careerOpsRoot, apps);
    return target;
  } finally {
    await releaseLock(careerOpsRoot, lockId);
  }
}

export async function updateNotes(
  careerOpsRoot: string,
  number: number,
  newNotes: string,
): Promise<Application | null> {
  const lockId = await acquireLock(careerOpsRoot);
  try {
    const apps = parseApplications(careerOpsRoot);
    const target = apps.find((a) => a.number === number);
    if (!target) return null;
    target.notes = newNotes;
    await writeApplications(careerOpsRoot, apps);
    return target;
  } finally {
    await releaseLock(careerOpsRoot, lockId);
  }
}

export async function deleteApplication(
  careerOpsRoot: string,
  number: number,
): Promise<Application | null> {
  const lockId = await acquireLock(careerOpsRoot);
  try {
    const apps = parseApplications(careerOpsRoot);
    const idx = apps.findIndex((a) => a.number === number);
    if (idx < 0) return null;
    const [removed] = apps.splice(idx, 1);
    await writeApplications(careerOpsRoot, apps);
    return removed;
  } finally {
    await releaseLock(careerOpsRoot, lockId);
  }
}
