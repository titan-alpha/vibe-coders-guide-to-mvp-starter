import { features } from '@/lib/features';
import { signIn } from '@/lib/auth';
import { notFound } from 'next/navigation';

/**
 * Login page — enabled when FEATURE_AUTH=true.
 *
 * Renders a Sign In action per configured provider. Auth.js chooses the right
 * flow (magic link email, OAuth redirect) based on what the user clicks.
 * Custom auth UI should wait until after v1 — DaisyUI buttons are enough.
 */
export default function LoginPage() {
  if (!features.auth) notFound();

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 opacity-75">
        We&rsquo;ll email you a one-tap link, or you can use a provider.
      </p>

      <div className="mt-8 space-y-3">
        {process.env.RESEND_API_KEY && (
          <form
            action={async (formData: FormData) => {
              'use server';
              await signIn('resend', { email: formData.get('email') });
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="email" className="text-sm opacity-80">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input input-bordered"
              placeholder="you@example.com"
            />
            <button className="btn btn-primary">Send magic link</button>
          </form>
        )}

        {process.env.AUTH_GOOGLE_ID && (
          <form
            action={async () => {
              'use server';
              await signIn('google');
            }}
          >
            <button className="btn w-full">Continue with Google</button>
          </form>
        )}

        {process.env.AUTH_GITHUB_ID && (
          <form
            action={async () => {
              'use server';
              await signIn('github');
            }}
          >
            <button className="btn w-full">Continue with GitHub</button>
          </form>
        )}
      </div>

      <p className="mt-10 text-sm opacity-60">
        By signing in you agree to the{' '}
        <a href="/terms" className="link">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="link">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
