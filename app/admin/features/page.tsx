/**
 * Admin Features tab — runtime toggles for every registered feature flag.
 *
 * Reads all rows from `feature_flags` (auto-registered by `flag()` calls
 * elsewhere). Each row exposes:
 *  - On/Off toggle (button form)
 *  - Rollout % input (0-100)
 *  - Scheduled activation datetime-local input
 *  - Delete button
 *
 * All mutations go through server actions in `./actions.ts` which call
 * `revalidatePath('/admin/features')` + `revalidateTag('feature-flags')`.
 */

import { asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { featureFlags } from '@/db/schema';
import { flag } from '@/lib/feature-flag';
import { setFlagAction, scheduleFlagAction, deleteFlagAction } from './actions';

export const dynamic = 'force-dynamic';

function toLocalInputValue(d: Date | null | undefined): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function FeaturesAdminPage() {
  if (!(await flag('features_admin'))) notFound();

  const rows = await db
    .select()
    .from(featureFlags)
    .orderBy(asc(featureFlags.key));

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Feature flags</h2>
        <p className="text-sm opacity-70">
          Toggle modules on/off, set percentage rollouts, or schedule a future activation.
          Changes propagate within ~30s.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body">
            <p className="text-sm opacity-70">
              No flags registered yet — they auto-register on first <code>flag()</code> call.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Flag</th>
                <th>Status</th>
                <th>Rollout %</th>
                <th>Scheduled</th>
                <th>Updated</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="align-top">
                    <div className="font-mono text-xs font-semibold">{row.key}</div>
                    {row.description && (
                      <div className="text-xs opacity-60 max-w-xs">{row.description}</div>
                    )}
                  </td>
                  <td className="align-top">
                    <form action={setFlagAction} className="flex items-center gap-2">
                      <input type="hidden" name="key" value={row.key} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={row.enabled ? 'false' : 'true'}
                      />
                      <input
                        type="hidden"
                        name="rolloutPct"
                        value={String(row.rolloutPct)}
                      />
                      <button
                        type="submit"
                        className={`btn btn-xs ${row.enabled ? 'btn-success' : 'btn-ghost border-base-300'}`}
                        aria-label={row.enabled ? 'Turn off' : 'Turn on'}
                      >
                        {row.enabled ? 'On' : 'Off'}
                      </button>
                    </form>
                  </td>
                  <td className="align-top">
                    <form action={setFlagAction} className="flex items-center gap-1">
                      <input type="hidden" name="key" value={row.key} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={row.enabled ? 'true' : 'false'}
                      />
                      <input
                        type="number"
                        name="rolloutPct"
                        min={0}
                        max={100}
                        defaultValue={row.rolloutPct}
                        className="input input-xs input-bordered w-20"
                      />
                      <button type="submit" className="btn btn-xs btn-ghost">
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="align-top">
                    <form action={scheduleFlagAction} className="flex items-center gap-1">
                      <input type="hidden" name="key" value={row.key} />
                      <input
                        type="datetime-local"
                        name="scheduledActivation"
                        defaultValue={toLocalInputValue(row.scheduledActivation)}
                        className="input input-xs input-bordered"
                      />
                      <button type="submit" className="btn btn-xs btn-ghost">
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="align-top text-xs opacity-70">
                    {row.updatedAt.toLocaleString()}
                  </td>
                  <td className="align-top text-right">
                    <form action={deleteFlagAction}>
                      <input type="hidden" name="key" value={row.key} />
                      <button
                        type="submit"
                        className="btn btn-xs btn-ghost text-error"
                        aria-label={`Delete ${row.key}`}
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
