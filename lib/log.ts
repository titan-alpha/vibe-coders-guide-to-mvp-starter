/**
 * Structured logger — pino with redaction.
 *
 * Per the SKILL.md logging discipline rule:
 * - Production floor is 'info', never 'debug'.
 * - Sensitive data (API keys, hashes, session tokens, emails, request bodies
 *   on PII routes) is redacted at two layers: pattern-based scrub + Pino's
 *   native field-name redact.
 *
 * Use everywhere instead of console.log:
 *
 *   import { log, logFor } from '@/lib/log';
 *   log.info({ event: 'order.created', orderId }, 'order created');
 *   const reqLog = logFor(req, userId);
 *   reqLog.error({ err }, 'something broke');
 */

import 'server-only';
import pino from 'pino';

const SECRET_PATTERNS: RegExp[] = [
  /sk_(test|live)_[A-Za-z0-9]{16,}/g,
  /pk_(test|live)_[A-Za-z0-9]{16,}/g,
  /re_[A-Za-z0-9]{16,}/g,
  /whsec_[A-Za-z0-9]{16,}/g,
  /phc_[A-Za-z0-9]{16,}/g,
  /SG\.[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/g,
  /\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}/g,                  // bcrypt hashes
  /\b[a-f0-9]{32,}\b/g,                                    // session-token-shaped hex
];

function scrub(value: unknown): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const pat of SECRET_PATTERNS) out = out.replace(pat, '[REDACTED]');
    return out;
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) result[k] = scrub(v);
    return result;
  }
  return value;
}

export const log = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie',
      '*.password', '*.passwordHash', '*.password_hash',
      '*.apiKey', '*.api_key', '*.secret',
      '*.token', '*.accessToken', '*.refreshToken',
      '*.email',
      '*.ssn', '*.dob', '*.phoneNumber', '*.creditCard',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    log: (obj) => scrub(obj) as Record<string, unknown>,
  },
});

/**
 * Request-scoped child logger. Auto-includes request ID + user ID + path.
 */
export function logFor(req: Request, userId?: string | null) {
  const url = new URL(req.url);
  return log.child({
    requestId: req.headers.get('x-request-id') ?? crypto.randomUUID(),
    userId: userId ?? null,
    method: req.method,
    path: url.pathname,
  });
}
