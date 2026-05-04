/**
 * Admin Feedback tab — review submissions, change status, link to user.
 *
 * Filter UI uses simple GET querystring params (?q, ?status, ?surface) so the
 * server action / page is fully cacheable + linkable. Search is a case-insensitive
 * LIKE against the body.
 */

import { and, desc, eq, like, sql, type SQL } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { feedback, users } from '@/db/schema';
import { flag } from '@/lib/feature-flag';
import { markStatusAction } from './actions';

export const dynamic = 'force-dynamic';

const STATUSES = ['new', 'seen', 'resolved', 'wontfix'] as const;
type Status = (typeof STATUSES)[number];

interface SearchParams {
  q?: string;
  status?: string;
  surface?: string;
}

export default async function FeedbackAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [adminOn, feedbackOn] = await Promise.all([
    flag('admin'),
    flag('feedback'),
  ]);
  if (!adminOn || !feedbackOn) notFound();

  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const statusFilter = sp.status?.trim() ?? '';
  const surfaceFilter = sp.surface?.trim() ?? '';

  const conditions: SQL[] = [];
  if (q) conditions.push(like(feedback.body, `%${q}%`));
  if (statusFilter && (STATUSES as readonly string[]).includes(statusFilter)) {
    conditions.push(eq(feedback.status, statusFilter));
  }
  if (surfaceFilter) conditions.push(eq(feedback.surface, surfaceFilter));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, surfaceRows, statusCounts] = await Promise.all([
    db
      .select({
        id: feedback.id,
        rating: feedback.rating,
        category: feedback.category,
        surface: feedback.surface,
        body: feedback.body,
        status: feedback.status,
        createdAt: feedback.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(feedback)
      .leftJoin(users, eq(users.id, feedback.userId))
      .where(whereClause)
      .orderBy(desc(feedback.createdAt))
      .limit(200),
    db
      .selectDistinct({ surface: feedback.surface })
      .from(feedback)
      .orderBy(feedback.surface),
    db
      .select({
        status: feedback.status,
        count: sql<number>`count(*)`,
      })
      .from(feedback)
      .groupBy(feedback.status),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((c) => [c.status, c.count]),
  ) as Record<string, number>;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Feedback</h2>
        <p className="text-sm opacity-70">
          {rows.length} match{rows.length === 1 ? '' : 'es'} shown.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <span
            key={s}
            className={`badge ${statusFilter === s ? 'badge-primary' : 'badge-ghost'} capitalize`}
          >
            {s}: {countByStatus[s] ?? 0}
          </span>
        ))}
      </div>

      <form className="flex flex-wrap gap-2 items-end" method="get">
        <label className="form-control">
          <span className="label-text text-xs uppercase tracking-wide opacity-70">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search body…"
            className="input input-sm input-bordered"
          />
        </label>
        <label className="form-control">
          <span className="label-text text-xs uppercase tracking-wide opacity-70">Status</span>
          <select
            name="status"
            defaultValue={statusFilter}
            className="select select-sm select-bordered"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label-text text-xs uppercase tracking-wide opacity-70">Surface</span>
          <select
            name="surface"
            defaultValue={surfaceFilter}
            className="select select-sm select-bordered"
          >
            <option value="">All surfaces</option>
            {surfaceRows.map((s) => (
              <option key={s.surface} value={s.surface}>
                {s.surface}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-sm">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body">
            <p className="text-sm opacity-70">No feedback matches the current filters.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="card bg-base-200 border border-base-300"
            >
              <div className="card-body p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {row.rating != null && (
                    <span className="badge badge-warning">{row.rating}/5</span>
                  )}
                  {row.category && (
                    <span className="badge badge-info capitalize">{row.category}</span>
                  )}
                  <span className="badge badge-ghost">{row.surface}</span>
                  <span
                    className={`badge capitalize ${
                      row.status === 'new'
                        ? 'badge-primary'
                        : row.status === 'resolved'
                          ? 'badge-success'
                          : row.status === 'wontfix'
                            ? 'badge-error'
                            : 'badge-ghost'
                    }`}
                  >
                    {row.status}
                  </span>
                  <span className="opacity-60">
                    {row.createdAt.toLocaleString()}
                  </span>
                  <span className="opacity-60">
                    {row.userEmail ?? row.userName ?? 'anonymous'}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{row.body}</p>
                <div className="flex gap-1">
                  {(['seen', 'resolved', 'wontfix'] as Status[]).map((s) => (
                    <form key={s} action={markStatusAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="status" value={s} />
                      <button
                        type="submit"
                        className="btn btn-xs btn-ghost capitalize"
                        disabled={row.status === s}
                      >
                        Mark {s}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
