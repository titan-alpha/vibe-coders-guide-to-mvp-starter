/**
 * Legacy env-var feature reader — kept for backwards compatibility with
 * older parts of the codebase that read `features.x` directly.
 *
 * **Prefer `flag(key, userId?)` from `@/lib/feature-flag`** for any new code.
 * The DB-backed flag system supports runtime toggling, scheduled activation,
 * percentage rollout, and the admin Features tab. The env-var system here
 * does not.
 *
 * This shim survives during the migration window. Once every site of use
 * has moved to flag(), delete this file.
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
