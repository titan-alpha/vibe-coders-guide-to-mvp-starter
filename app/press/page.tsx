export default function PressPage() {
  const PRODUCT_NAME = 'Vibe MVP';
  const PRESS_EMAIL = process.env.PRESS_EMAIL ?? 'hello@example.com';
  const PRIMARY_HEX = '#a855f7';

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Press kit</h1>
        <p className="opacity-70 mt-2">Everything you need to write about <strong>{PRODUCT_NAME}</strong>.</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold">Logos</h2>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <a href="/icon.svg" download className="card border border-base-300/60 p-6 flex items-center justify-center bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="Logo" className="w-24 h-24" />
          </a>
          <a href="/icon.svg" download className="card border border-base-300/60 p-6 flex items-center justify-center bg-neutral text-neutral-content">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="Logo on dark" className="w-24 h-24" />
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">About</h2>
        <h3 className="font-medium mt-4">One-liner</h3>
        <blockquote className="border-l-4 border-primary pl-4 mt-1 italic">
          A Vibe MVP project. Replace with your one-line tagline.
        </blockquote>
        <h3 className="font-medium mt-4">Paragraph</h3>
        <p className="mt-1">Replace with a one-paragraph description (~50 words).</p>
        <h3 className="font-medium mt-4">Long form</h3>
        <p className="mt-1">Replace with a one-page description (~300 words) including the why-now and the founder story.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Brand</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div>
            <div className="w-full aspect-square rounded" style={{ background: PRIMARY_HEX }} />
            <div className="text-xs mt-2 font-mono">{PRIMARY_HEX}</div>
            <div className="text-xs opacity-70">primary</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Press contact</h2>
        <p className="mt-1">For interviews / demos: <a href={`mailto:${PRESS_EMAIL}`} className="link">{PRESS_EMAIL}</a></p>
      </section>
    </main>
  );
}

export const metadata = { title: 'Press — Vibe MVP', description: 'Press kit and assets.' };
