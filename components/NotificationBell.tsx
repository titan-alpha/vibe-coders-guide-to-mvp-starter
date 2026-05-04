/**
 * Header bell icon — only rendered when the notifications module is on.
 *
 * Per sub-skill 07's hand-off contract, consumes:
 *   GET  /api/notifications/unread-count → { count: number }
 *   GET  /api/notifications/recent?limit=10 → { items: [...] }
 *   POST /api/notifications/mark-read → marks read
 */

'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface RecentItem {
  id: string;
  subject: string;
  body: string;
  actionUrl?: string | null;
  createdAt: string;
  readAt: string | null;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const r = await fetch('/api/notifications/unread-count');
        if (!r.ok) return;
        const { count } = await r.json();
        if (!cancelled) setCount(count ?? 0);
      } catch { /* network blip; ignore */ }
    };
    void refresh();
    const t = setInterval(refresh, 30_000);    // light polling; SSE optional later
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetch('/api/notifications/recent?limit=10').then(async (r) => {
      if (!r.ok) return;
      const { items } = await r.json();
      setRecent(items ?? []);
    });
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function markAllRead() {
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setCount(0);
    setRecent((rs) => rs.map((r) => ({ ...r, readAt: new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost btn-sm btn-square relative"
        aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
        title={count > 0 ? `${count} unread` : 'Notifications'}
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-error text-error-content text-[10px] font-mono">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-base-300/60 bg-base-100 shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col"
        >
          <header className="flex items-center justify-between p-3 border-b border-base-300/40">
            <span className="text-sm font-semibold">Notifications</span>
            {count > 0 && (
              <button onClick={markAllRead} className="text-xs opacity-70 hover:opacity-100 hover:text-primary">
                Mark all read
              </button>
            )}
          </header>
          <div className="overflow-y-auto flex-1">
            {recent.length === 0 ? (
              <p className="text-sm opacity-60 text-center p-6">No notifications yet.</p>
            ) : (
              <ul>
                {recent.map((n) => (
                  <li
                    key={n.id}
                    className={`p-3 border-b border-base-300/30 text-sm ${n.readAt ? 'opacity-70' : 'bg-primary/5'}`}
                  >
                    <div className="font-medium">{n.subject}</div>
                    <p className="opacity-80 text-xs mt-1 line-clamp-3">{n.body}</p>
                    {n.actionUrl && (
                      <Link href={n.actionUrl} className="text-xs text-primary mt-1 inline-block">
                        Open →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href="/notifications"
            className="text-xs text-center p-2 border-t border-base-300/40 hover:bg-base-200"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
