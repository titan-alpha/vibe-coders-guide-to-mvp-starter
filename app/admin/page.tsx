import { features } from '@/lib/features';
import { notFound } from 'next/navigation';

export const revalidate = 60;

/**
 * Admin dashboard — password-gated by middleware.
 *
 * Currently renders mock KPI cards. In sub-skill 06-admin-dashboard the agent:
 *  1. Analyzes the codebase to see what data is being captured.
 *  2. Proposes 4–6 tailored KPIs with rationale.
 *  3. Adds the minimum instrumentation needed (via lib/track.ts).
 *  4. Replaces the mock values below with real queries against the events table.
 */
export default async function AdminPage() {
  if (!features.admin) notFound();

  // TODO: replace mock values with real queries once instrumentation lands.
  const kpis = [
    { label: 'DAU', value: '—', hint: 'Hook up events table' },
    { label: 'Signups (7d)', value: '—', hint: 'Count users created in last 7d' },
    { label: 'Activation rate', value: '—', hint: 'Define your aha event first' },
    { label: 'AI calls (7d)', value: '—', hint: 'Log from lib/ai.ts' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="opacity-70 mt-1">
          Password-gated via middleware. Replace these placeholders in sub-skill 06.
        </p>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card bg-base-200 border border-base-300">
            <div className="card-body p-5">
              <div className="text-xs uppercase tracking-widest opacity-60">
                {k.label}
              </div>
              <div className="text-3xl font-semibold mt-1">{k.value}</div>
              <div className="text-sm opacity-60 mt-1">{k.hint}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card bg-base-200 border border-base-300">
        <div className="card-body">
          <h2 className="font-semibold">Next steps</h2>
          <ol className="mt-2 space-y-1 text-sm opacity-80 list-decimal list-inside">
            <li>
              Open sub-skill 06-admin-dashboard in the vibe-mvp skill bundle.
            </li>
            <li>Let the agent audit your codebase and propose tailored KPIs.</li>
            <li>
              Add instrumentation (<code className="font-mono">lib/track.ts</code>) where
              it&rsquo;s missing.
            </li>
            <li>Replace the cards above with real queries.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
