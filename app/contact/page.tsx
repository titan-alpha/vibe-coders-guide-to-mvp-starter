export default function ContactPage() {
  const email = process.env.CONTACT_EMAIL ?? 'hello@example.com';
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 space-y-4">
      <h1 className="text-3xl font-semibold">Contact</h1>
      <p className="opacity-80">
        Reach us at{' '}
        <a className="link link-primary" href={`mailto:${email}`}>
          {email}
        </a>
        .
      </p>
      <p className="opacity-60 text-sm">
        Replace this page with your real contact form, support handle, or a feedback widget.
      </p>
    </main>
  );
}

export const metadata = { title: 'Contact — Vibe MVP' };
