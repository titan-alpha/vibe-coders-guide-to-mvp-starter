/**
 * Typed feature-flag reader.
 *
 * Every optional surface of the app reads its on/off state from here.
 * Flags are set in .env.local via FEATURE_* env vars and default to `false`.
 *
 * Usage (server or client — Next.js inlines NEXT_PUBLIC_ vars on client,
 * but here all reads happen on the server; client components receive flags
 * as props from their parent server component).
 */

function on(name: string): boolean {
  return process.env[name] === 'true';
}

export const features = {
  auth: on('FEATURE_AUTH'),
  emailVerify: on('FEATURE_EMAIL_VERIFY'),
  ai: on('FEATURE_AI'),
  chatbot: on('FEATURE_CHATBOT'),
  admin: on('FEATURE_ADMIN'),
  deliverables: on('FEATURE_DELIVERABLES'),
  analytics: on('FEATURE_ANALYTICS'),
} as const;

export type Features = typeof features;

/**
 * Throw with a helpful message if a required credential for a feature
 * is missing. Call at module init inside feature-specific files.
 */
export function requireEnv(name: string, forFeature: keyof Features): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Feature "${forFeature}" is enabled but ${name} is not set. ` +
        `Add it to .env.local or disable FEATURE_${forFeature.toUpperCase()}.`,
    );
  }
  return value;
}
