/**
 * Database client — Drizzle + libsql (SQLite for local, Turso for prod).
 *
 * Lazy-initialized so the starter runs without a DB until first query.
 * Exposed as a Proxy so callers can write `db.select(...)` directly without
 * thinking about init order.
 *
 * Local dev: DATABASE_URL=file:./local.db (default if unset)
 * Prod:      DATABASE_URL=libsql://...   + DATABASE_AUTH_TOKEN=...
 */

import 'server-only';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

type Drizzle = ReturnType<typeof drizzle>;
let cached: Drizzle | null = null;

function init(): Drizzle {
  if (!cached) {
    const url = process.env.DATABASE_URL ?? 'file:./local.db';
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    cached = drizzle(createClient({ url, authToken }), { schema });
  }
  return cached;
}

export const db = new Proxy({} as Drizzle, {
  get(_t, prop) {
    const inst = init() as unknown as Record<string | symbol, unknown>;
    const v = inst[prop];
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(inst) : v;
  },
});

export { schema };
