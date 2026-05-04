/**
 * Admin Notifications tab.
 *
 * - Compose form: pick audience (all / specific users), subject, markdown body,
 *   optional actionUrl. Submits to `sendNotificationAction`.
 * - History table: most recent 50 notifications with their delivery + read counts.
 */

import { desc, eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import {
  notifications,
  notificationRecipients,
  users,
} from '@/db/schema';
import { flag } from '@/lib/feature-flag';
import { sendNotificationAction } from './actions';

export const dynamic = 'force-dynamic';

const HISTORY_LIMIT = 50;
const USER_PICKER_LIMIT = 200;

export default async function NotificationsAdminPage() {
  const [adminOn, notificationsOn] = await Promise.all([
    flag('admin'),
    flag('notifications'),
  ]);
  if (!adminOn || !notificationsOn) notFound();

  const [activeUsers, history] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(USER_PICKER_LIMIT),
    db
      .select({
        id: notifications.id,
        subject: notifications.subject,
        audience: notifications.audience,
        createdAt: notifications.createdAt,
        total: sql<number>`count(${notificationRecipients.userId})`,
        readCount: sql<number>`sum(case when ${notificationRecipients.readAt} is not null then 1 else 0 end)`,
      })
      .from(notifications)
      .leftJoin(
        notificationRecipients,
        eq(notificationRecipients.notificationId, notifications.id),
      )
      .groupBy(notifications.id)
      .orderBy(desc(notifications.createdAt))
      .limit(HISTORY_LIMIT),
  ]);

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold">Notifications</h2>
        <p className="text-sm opacity-70">
          Send an in-app notification. Markdown is supported in the body.
        </p>
      </header>

      <form action={sendNotificationAction} className="card bg-base-200 border border-base-300">
        <div className="card-body space-y-4">
          <fieldset className="space-y-1">
            <legend className="text-xs uppercase tracking-wide opacity-70">Audience</legend>
            <div className="flex gap-4">
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="audience"
                  value="all"
                  defaultChecked
                  className="radio radio-sm"
                />
                <span className="label-text">All active users</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="audience"
                  value="specific"
                  className="radio radio-sm"
                />
                <span className="label-text">Specific users</span>
              </label>
            </div>
          </fieldset>

          <label className="form-control">
            <span className="label-text text-xs uppercase tracking-wide opacity-70">
              Specific recipients (used only when &ldquo;Specific&rdquo; is selected)
            </span>
            <select
              name="userIds"
              multiple
              size={Math.min(8, Math.max(3, activeUsers.length))}
              className="select select-bordered min-h-[120px]"
            >
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email ?? u.name ?? u.id}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control">
            <span className="label-text text-xs uppercase tracking-wide opacity-70">Subject</span>
            <input
              type="text"
              name="subject"
              required
              maxLength={200}
              className="input input-bordered"
              placeholder="What's this about?"
            />
          </label>

          <label className="form-control">
            <span className="label-text text-xs uppercase tracking-wide opacity-70">
              Body (markdown allowed)
            </span>
            <textarea
              name="body"
              required
              rows={6}
              maxLength={5000}
              className="textarea textarea-bordered"
              placeholder="The full message…"
            />
          </label>

          <label className="form-control">
            <span className="label-text text-xs uppercase tracking-wide opacity-70">
              Action URL (optional)
            </span>
            <input
              type="url"
              name="actionUrl"
              className="input input-bordered"
              placeholder="https://…"
            />
          </label>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              Send notification
            </button>
          </div>
        </div>
      </form>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Recent notifications</h3>
        {history.length === 0 ? (
          <p className="text-sm opacity-70">No notifications sent yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Audience</th>
                  <th>Recipients</th>
                  <th>Read</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.subject}</td>
                    <td>
                      <span className="badge badge-ghost capitalize">{row.audience}</span>
                    </td>
                    <td>{row.total ?? 0}</td>
                    <td>
                      {row.readCount ?? 0} / {row.total ?? 0}
                    </td>
                    <td className="text-xs opacity-70">
                      {row.createdAt.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
