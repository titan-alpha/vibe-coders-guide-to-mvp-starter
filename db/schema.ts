/**
 * Drizzle schema — core tables every MVP tends to need.
 *
 * Tables are present even when features are off; they just stay empty.
 * Run `npm run db:generate` + `npm run db:migrate` after enabling auth
 * or email verification.
 */

import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Auth.js core tables (when FEATURE_AUTH=true with DB adapter)
// ---------------------------------------------------------------------------

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp_ms' }),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const accounts = sqliteTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }),
);

export const sessions = sqliteTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }),
);

// ---------------------------------------------------------------------------
// Compliance (sub-skill 07-compliance)
// ---------------------------------------------------------------------------

export const userConsents = sqliteTable('user_consents', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(), // 'terms' | 'privacy' | 'marketing'
  version: text('version').notNull(), // policy last-updated date
  acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
});

// ---------------------------------------------------------------------------
// Analytics events (sub-skill 06-admin + 09-performance)
// ---------------------------------------------------------------------------

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(), // e.g., 'signup', 'feature_used', 'ai_call'
  properties: text('properties', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});
