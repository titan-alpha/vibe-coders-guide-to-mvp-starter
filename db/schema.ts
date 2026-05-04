/**
 * Drizzle schema — every module's tables in one place, gated at the route
 * layer by the feature_flags table (see lib/feature-flag.ts).
 *
 * Tables exist whether their module is enabled or not; an empty table
 * costs ~zero. Migration is one-shot: `npm run db:generate && npm run db:migrate`.
 */

import { sqliteTable, text, integer, primaryKey, real } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Auth.js core tables (module: auth)
// ---------------------------------------------------------------------------

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp_ms' }),
  image: text('image'),
  passwordHash: text('password_hash'),                  // null for OAuth-only users
  intendedUse: text('intended_use'),                    // signup-form optional textarea
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  lastSignInAt: integer('last_sign_in_at', { mode: 'timestamp_ms' }),
  deactivatedAt: integer('deactivated_at', { mode: 'timestamp_ms' }),
  // Per-user usage budget (module: usage_gating)
  usageGranted: integer('usage_granted').notNull().default(0),
  usageConsumed: integer('usage_consumed').notNull().default(0),
  // Lifecycle email tracking (module: lifecycle_email)
  emailLifecycle: integer('email_lifecycle', { mode: 'boolean' }).notNull().default(true),
  welcomedAt: integer('welcomed_at', { mode: 'timestamp_ms' }),
  // Notification preference
  emailNotifications: integer('email_notifications', { mode: 'boolean' }).notNull().default(true),
});

export const accounts = sqliteTable(
  'accounts',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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

// Waitlist + email allowlist + auth tokens (module: auth, waitlist mode)
export const waitlist = sqliteTable('waitlist', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  intendedUse: text('intended_use'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
  rejectedAt: integer('rejected_at', { mode: 'timestamp_ms' }),
});

export const allowedEmails = sqliteTable('allowed_emails', {
  email: text('email').primaryKey(),
  invitedBy: text('invited_by'),
  invitedAt: integer('invited_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  inviteTokenHash: text('invite_token_hash'),
  inviteAcceptedAt: integer('invite_accepted_at', { mode: 'timestamp_ms' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
});

export const authTokens = sqliteTable('auth_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(),                   // 'verify' | 'reset'
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }),
});

// ---------------------------------------------------------------------------
// Compliance (module: legal)
// ---------------------------------------------------------------------------

export const userConsents = sqliteTable('user_consents', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(),          // 'terms' | 'privacy' | 'marketing'
  version: text('version').notNull(),                    // policy last-updated date
  acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
});

// ---------------------------------------------------------------------------
// Analytics events (module: analytics)
// ---------------------------------------------------------------------------

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  properties: text('properties', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Backend system-health metrics (module: analytics, backend KPIs)
export const requestMetrics = sqliteTable('request_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id'),
  route: text('route').notNull(),
  method: text('method').notNull(),
  status: integer('status').notNull(),
  errorClass: text('error_class'),
  durationMs: integer('duration_ms').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Feature flags (module: features_admin — but the table is core)
// ---------------------------------------------------------------------------

export const featureFlags = sqliteTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  rolloutPct: integer('rollout_pct').notNull().default(100),
  scheduledActivation: integer('scheduled_activation', { mode: 'timestamp_ms' }),
  description: text('description'),
  addedBy: text('added_by').notNull().default('agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Notifications (module: notifications)
// ---------------------------------------------------------------------------

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),                          // markdown allowed
  actionUrl: text('action_url'),
  audience: text('audience').notNull(),                  // 'all' | 'specific'
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  createdBy: text('created_by').notNull().default('admin'),
});

export const notificationRecipients = sqliteTable(
  'notification_recipients',
  {
    notificationId: text('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    readAt: integer('read_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.notificationId, t.userId] }) }),
);

// ---------------------------------------------------------------------------
// Feedback (module: feedback)
// ---------------------------------------------------------------------------

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  surface: text('surface').notNull(),                    // 'general' | platform-specific
  rating: integer('rating'),                              // 1-5 thumbs/stars
  category: text('category'),                             // 'bug' | 'idea' | 'praise' | 'other'
  body: text('body').notNull(),
  contextUrl: text('context_url'),
  contextMeta: text('context_meta', { mode: 'json' }),
  status: text('status').notNull().default('new'),       // 'new' | 'seen' | 'resolved' | 'wontfix'
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
  resolvedBy: text('resolved_by'),
  internalNote: text('internal_note'),
});

// ---------------------------------------------------------------------------
// Cost monitoring (module: cost_monitoring)
// ---------------------------------------------------------------------------

export const serviceUnitCosts = sqliteTable('service_unit_costs', {
  service: text('service').primaryKey(),                 // 'openai_gpt5_nano' | 'resend_email' | etc.
  unitLabel: text('unit_label').notNull(),               // 'per 1k input tokens', 'per email'
  unitCostUsd: real('unit_cost_usd').notNull(),
  source: text('source'),                                 // 'OpenAI pricing page YYYY-MM-DD'
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const serviceUsageDaily = sqliteTable('service_usage_daily', {
  id: text('id').primaryKey(),
  service: text('service').notNull(),
  day: text('day').notNull(),                             // YYYY-MM-DD
  units: real('units').notNull(),
  costUsd: real('cost_usd').notNull(),
});

export const serviceCeilings = sqliteTable('service_ceilings', {
  service: text('service').primaryKey(),
  monthlyCapUsd: real('monthly_cap_usd').notNull(),
  alertAtPct: integer('alert_at_pct').notNull().default(80),
  hardBlock: integer('hard_block', { mode: 'boolean' }).notNull().default(false),
});

// ---------------------------------------------------------------------------
// Alerts (module: error_alerts)
// ---------------------------------------------------------------------------

export const alertEvents = sqliteTable('alert_events', {
  id: text('id').primaryKey(),
  level: text('level').notNull(),                         // 'info' | 'warn' | 'error' | 'critical'
  source: text('source').notNull(),                       // 'sentry' | 'cost_ceiling' | 'health_check' | 'manual'
  title: text('title').notNull(),
  body: text('body').notNull(),
  context: text('context', { mode: 'json' }),
  status: text('status').notNull().default('new'),       // 'new' | 'acknowledged' | 'resolved'
  dispatchedTo: text('dispatched_to'),
  dispatchedAt: integer('dispatched_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  acknowledgedAt: integer('acknowledged_at', { mode: 'timestamp_ms' }),
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
});

// ---------------------------------------------------------------------------
// AI cache (module: ai_cache)
// ---------------------------------------------------------------------------

export const aiCache = sqliteTable('ai_cache', {
  cacheKey: text('cache_key').primaryKey(),               // sha256 of normalized request
  model: text('model').notNull(),
  schemaName: text('schema_name').notNull(),
  response: text('response', { mode: 'json' }).notNull(),
  hitCount: integer('hit_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  lastHitAt: integer('last_hit_at', { mode: 'timestamp_ms' }),
});

// ---------------------------------------------------------------------------
// Admin password (module: admin)
// Single-row table; password hash stored after the founder's first-login change.
// ---------------------------------------------------------------------------

export const adminSettings = sqliteTable('admin_settings', {
  id: integer('id').primaryKey().default(1),
  passwordHash: text('password_hash'),
  passwordSetAt: integer('password_set_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});
