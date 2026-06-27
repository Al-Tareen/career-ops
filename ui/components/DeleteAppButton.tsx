'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  number: number;
  company: string;
  role: string;
}

export function DeleteAppButton({ number, company, role }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const ok = window.confirm(
      `Delete #${number} ${company} — ${role}?\n\nThis permanently removes the row from data/applications.md. This cannot be undone.`,
    );
    if (!ok) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/applications/${number}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || pending}
      title={error ?? `Delete #${number}`}
      className={`text-xs border rounded px-1.5 py-0.5 mono ${
        error
          ? 'text-rose-300 border-rose-700/60'
          : 'text-slate-500 hover:text-rose-300 border-ink-800 hover:border-rose-700/60'
      } disabled:opacity-50`}
    >
      {busy || pending ? '…' : '×'}
    </button>
  );
}
