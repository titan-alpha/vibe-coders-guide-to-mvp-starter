/**
 * Alerts dispatcher — writes to alert_events + emails the founder.
 *
 * Wired from:
 * - Route Handler errors (via withMetrics if you use that pattern)
 * - Webhook handler errors
 * - Cost-ceiling breaches (cost-rollup cron)
 * - Health-check failures
 * - Manual alert() calls anywhere
 *
 * Frequency cap: 1 email per (source, title) per 15 minutes — prevents flood.
 * The DB row is always written; only email dispatch is rate-limited.
 *
 * Set ALERT_EMAIL_RECIPIENT in env to receive alerts (founder's inbox).
 */

import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { alertEvents, featureFlags } from '@/db/schema';
import { sendEmail, emailEnabled } from './email';
import { log } from './log';

const FREQUENCY_CAP_MINUTES = 15;
const ALERT_RECIPIENT = process.env.ALERT_EMAIL_RECIPIENT ?? '';

export type AlertLevel = 'info' | 'warn' | 'error' | 'critical';

export async function alert(args: {
  level: AlertLevel;
  source: string;
  title: string;
  body: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  const id = crypto.randomUUID();

  // Always write the row, even if email is disabled or capped.
  await db.insert(alertEvents).values({
    id,
    level: args.level,
    source: args.source,
    title: args.title,
    body: args.body,
    context: args.context,
  }).catch((err) => log.error({ event: 'alerts.insert_failed', err }));

  // Email gating: info doesn't email; need recipient + email enabled +
  // error_alerts feature flag on (avoid noise during early dev).
  if (args.level === 'info') return;
  if (!emailEnabled || !ALERT_RECIPIENT) return;

  // Frequency cap.
  const recent = await db.select({ id: alertEvents.id }).from(alertEvents).where(
    sql`${alertEvents.source} = ${args.source}
        and ${alertEvents.title} = ${args.title}
        and ${alertEvents.dispatchedAt} is not null
        and ${alertEvents.dispatchedAt} > ${Date.now() - FREQUENCY_CAP_MINUTES * 60_000}`,
  );
  if (recent.length) return;

  // Verify the error_alerts flag is on (prevents alert spam during dev).
  const [flagRow] = await db.select().from(featureFlags).where(sql`${featureFlags.key} = 'error_alerts'`);
  if (!flagRow?.enabled) return;

  const subject = `[${args.level.toUpperCase()}] ${args.title}`;
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
  const html = `<h2>${escapeHtml(args.title)}</h2>
    <p>${escapeHtml(args.body)}</p>
    <pre style="background:#f4f4f5;padding:12px;border-radius:6px;font-size:12px;overflow:auto">${escapeHtml(JSON.stringify(args.context ?? {}, null, 2))}</pre>
    <p><a href="${baseUrl}/admin/alerts">View in admin</a></p>`;

  await sendEmail({ to: ALERT_RECIPIENT, subject, html }).catch((err) => log.error({ event: 'alerts.email_failed', err }));

  await db.update(alertEvents).set({ dispatchedTo: ALERT_RECIPIENT, dispatchedAt: new Date() })
    .where(sql`${alertEvents.id} = ${id}`).catch(() => {});
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
