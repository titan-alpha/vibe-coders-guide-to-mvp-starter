/**
 * Email helper — single entry point for every outbound transactional email.
 * Uses Resend under the hood.
 *
 * For local dev + first deploy, default sender `onboarding@resend.dev` works
 * without domain verification. Switch `EMAIL_FROM` to `noreply@<your-domain>`
 * once you verify your domain in Resend (sub-skill 12-domain).
 */

import 'server-only';
import { Resend } from 'resend';
import { requireEnv } from '@/lib/features';

let clientCache: Resend | null = null;

function client(): Resend {
  if (!clientCache) {
    clientCache = new Resend(requireEnv('RESEND_API_KEY', 'emailVerify'));
  }
  return clientCache;
}

const FROM = process.env.EMAIL_FROM ?? 'App <onboarding@resend.dev>';

/**
 * Whether email sending is configured. Callers can check this before queueing
 * non-critical mail (e.g. alerts) to skip the call rather than throw.
 */
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { error } = await client().emails.send({
    from: FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
