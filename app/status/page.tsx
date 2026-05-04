export const dynamic = 'force-static';

export default function StatusPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold">Status</h1>
      <div className="mt-6 rounded-lg border border-success/40 bg-success/5 p-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="font-medium">All systems normal</span>
      </div>
      <p className="mt-6 opacity-70 text-sm">
        Last checked: deploy time. For incident updates, follow our X / Twitter or check this page.
      </p>
    </main>
  );
}

export const metadata = { title: 'Status — Vibe MVP', description: 'System status.' };
