/**
 * Admin Overview tab — KPI stat cards.
 *
 * Each card is gated by the relevant module flag. We batch all the
 * count() queries with Promise.all so the page renders in one DB
 * roundtrip per metric (and zero queries for cards whose flag is off).
 *
 * The wrapping `app/admin/layout.tsx` already enforces the master `admin`
 * flag — so we trust it here and only check the per-module flags.
 */

import { eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, feedback, alertEvents, notifications } from '@/db/schema';
import { flags as readFlags } from '@/lib/feature-flag';

export const dynamic = 'force-dynamic';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface Card {
  label: string;
  value: string | number;
  hint?: string;
}

export default async function AdminOverviewPage() {
  const flags = await readFlags('auth', 'feedback', 'error_alerts', 'notifications');
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const cards: Card[] = [];

  if (flags.auth) {
    const [{ count: total } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    cards.push({ label: 'Users', value: total, hint: 'Total registered' });

    const [{ count: recent } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo));
    cards.push({ label: 'New users (7d)', value: recent, hint: 'Created in last 7 days' });
  }

  if (flags.feedback) {
    const [{ count: pending } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedback)
      .where(eq(feedback.status, 'new'));
    cards.push({ label: 'Feedback', value: pending, hint: 'Awaiting review' });
  }

  if (flags.error_alerts) {
    const [{ count: openAlerts } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(alertEvents)
      .where(eq(alertEvents.status, 'new'));
    cards.push({ label: 'Alerts', value: openAlerts, hint: 'New alerts' });
  }

  if (flags.notifications) {
    const [{ count: sent } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(gte(notifications.createdAt, sevenDaysAgo));
    cards.push({ label: 'Notifications (7d)', value: sent, hint: 'Sent in last 7 days' });
  }

  return (
    <section className="space-y-6">
      {cards.length === 0 ? (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body">
            <p className="opacity-70 text-sm">
              No overview metrics available — enable the <code>auth</code>,{' '}
              <code>feedback</code>, <code>error_alerts</code>, or{' '}
              <code>notifications</code> flag to populate this page.
            </p>
          </div>
        </div>
      ) : (
        <div className="stats stats-vertical sm:stats-horizontal shadow w-full overflow-x-auto">
          {cards.map((c) => (
            <div key={c.label} className="stat">
              <div className="stat-title">{c.label}</div>
              <div className="stat-value text-2xl">{c.value}</div>
              {c.hint && <div className="stat-desc">{c.hint}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
