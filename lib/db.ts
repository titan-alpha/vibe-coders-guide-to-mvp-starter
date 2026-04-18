/**
 * Database client — Drizzle + libsql (SQLite for local, Turso for prod).
 *
 * Lazy-initialized so the starter runs without a DB until a feature needs one.
 * Schema lives in db/schema.ts.
 *
 * Local dev: DATABASE_URL=file:./local.db
 * Prod:      DATABASE_URL=libsql://... + DATABASE_AUTH_TOKEN=... (from Turso)
 */

import 'server-only';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

let dbCache: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (!dbCache) {
    const url = process.env.DATABASE_URL ?? 'file:./local.db';
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    const client = createClient({ url, authToken });
    dbCache = drizzle(client, { schema });
  }
  return dbCache;
}

export { schema };
