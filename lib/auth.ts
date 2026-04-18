/**
 * Auth.js v5 configuration.
 *
 * Only used when FEATURE_AUTH=true. Defaults to magic-link email provider via
 * Resend. Add Google / GitHub providers by setting the corresponding env vars
 * (see .env.example) — they'll be appended automatically.
 *
 * Sessions use JWT strategy by default (no DB required). Switch to `strategy: 'database'`
 * and add the DrizzleAdapter when you enable FEATURE_EMAIL_VERIFY or need session
 * persistence across devices.
 */

import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import type { NextAuthConfig } from 'next-auth';

const providers: NextAuthConfig['providers'] = [];

if (process.env.RESEND_API_KEY) {
  providers.push(
    Resend({
      from: process.env.EMAIL_FROM ?? 'App <onboarding@resend.dev>',
    }),
  );
}
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
});
