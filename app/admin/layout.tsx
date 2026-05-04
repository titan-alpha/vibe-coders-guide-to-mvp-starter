/**
 * Admin shell — top-level navigation for the admin dashboard.
 *
 * The sidebar/tab list is gated by feature flags. Each tab requires:
 *   - the master `admin` flag, AND
 *   - a per-tab module flag (e.g. `feedback`, `notifications`).
 *
 * If the `admin` flag itself is off, the whole route 404s. Otherwise we
 * render only the tabs whose required flags are all on.
 *
 * Flags are read in one batched Promise.all via `flags()` from
 * `@/lib/feature-flag` and cached for ~30s, so this layout is cheap.
 */

import Link from 'next/link';
import { flags as readFlags } from '@/lib/feature-flag';
import { notFound } from 'next/navigation';

const TABS = [
  { href: '/admin',               label: 'Overview',       requires: ['admin'] },
  { href: '/admin/users',         label: 'Users',          requires: ['admin', 'auth'] },
  { href: '/admin/waitlist',      label: 'Waitlist',       requires: ['admin', 'auth'] },
  { href: '/admin/usage',         label: 'Usage',          requires: ['admin', 'usage_gating'] },
  { href: '/admin/notifications', label: 'Notifications',  requires: ['admin', 'notifications'] },
  { href: '/admin/feedback',      label: 'Feedback',       requires: ['admin', 'feedback'] },
  { href: '/admin/cost',          label: 'Cost',           requires: ['admin', 'cost_monitoring'] },
  { href: '/admin/alerts',        label: 'Alerts',         requires: ['admin', 'error_alerts'] },
  { href: '/admin/features',      label: 'Features',       requires: ['admin', 'features_admin'] },
  { href: '/admin/analytics',     label: 'Analytics',      requires: ['admin', 'analytics'] },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const allKeys = Array.from(new Set(TABS.flatMap((t) => t.requires)));
  const flags = await readFlags(...allKeys);
  if (!flags.admin) notFound();

  const visible = TABS.filter((t) => t.requires.every((k) => flags[k]));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <a href="/admin/change-password" className="text-xs opacity-70 hover:opacity-100">
          Change password
        </a>
      </header>
      <nav className="tabs tabs-bordered overflow-x-auto" aria-label="Admin tabs">
        {visible.map((t) => (
          <Link key={t.href} href={t.href} className="tab whitespace-nowrap">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
