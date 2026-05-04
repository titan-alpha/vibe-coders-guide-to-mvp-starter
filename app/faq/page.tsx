const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Vibe MVP?',
    a: 'A starter scaffold for shipping a minimum viable product fast. Replace this answer with your own.',
  },
  {
    q: 'How do I get started?',
    a: 'Replace this answer with onboarding steps for your product.',
  },
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold">FAQ</h1>
      <dl className="mt-8 space-y-6">
        {FAQS.map((f) => (
          <div key={f.q}>
            <dt className="font-medium">{f.q}</dt>
            <dd className="mt-1 opacity-80">{f.a}</dd>
          </div>
        ))}
      </dl>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}

export const metadata = { title: 'FAQ — Vibe MVP', description: 'Frequently asked questions.' };
