/**
 * Run once after copying the template to the user's project:
 *   npx tsx scripts/setup-flags.ts
 *
 * Reads STATE.yaml from the project root (cwd) and inserts initial
 * feature_flags rows based on decisions. Idempotent — onConflictDoUpdate
 * keeps it safe to re-run after the user edits decisions in the configurator.
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { db } from '../lib/db';
import { featureFlags } from '../db/schema';

interface ProjectState {
  decisions?: {
    access_model?: string;
    notifications_enabled?: boolean;
    feedback_enabled?: boolean;
    cost_monitoring_enabled?: boolean;
    error_alerts_enabled?: boolean;
    features_admin_enabled?: boolean;
    analytics_scope?: string[];
    monetization_path?: string;
    auth_path?: string;
    [k: string]: unknown;
  };
}

const FLAG_RULES: { key: string; description: string; from: (s: ProjectState) => boolean }[] = [
  { key: 'theme_toggle',        description: 'Header theme toggle', from: () => true },
  { key: 'legal',               description: 'Terms + Privacy pages', from: (s) => !!s.decisions?.access_model },
  { key: 'auth',                description: 'Signup + login + logout', from: (s) => !!s.decisions?.auth_path },
  { key: 'admin',               description: 'Admin dashboard shell', from: (s) => !!s.decisions?.access_model || !!s.decisions?.notifications_enabled || !!s.decisions?.feedback_enabled },
  { key: 'notifications',       description: 'Notifications module', from: (s) => !!s.decisions?.notifications_enabled },
  { key: 'feedback',            description: 'Feedback collection', from: (s) => !!s.decisions?.feedback_enabled },
  { key: 'cost_monitoring',     description: 'Cost monitoring tab', from: (s) => !!s.decisions?.cost_monitoring_enabled },
  { key: 'error_alerts',        description: 'Error alerts tab', from: (s) => !!s.decisions?.error_alerts_enabled },
  { key: 'features_admin',      description: 'Runtime feature-flag UI', from: () => true },   // always on; founders want runtime control
  { key: 'analytics',           description: 'Analytics module', from: (s) => Array.isArray(s.decisions?.analytics_scope) && s.decisions!.analytics_scope!.length > 0 },
  { key: 'press',               description: 'Public press kit', from: () => true },
  { key: 'public_changelog',    description: 'Public /changelog route', from: () => true },
  { key: 'status',              description: '/status route', from: () => true },
];

async function run() {
  const statePath = join(process.cwd(), 'STATE.yaml');
  const state: ProjectState = existsSync(statePath)
    ? (yaml.load(readFileSync(statePath, 'utf8')) as ProjectState) ?? {}
    : {};

  console.log('→ Reading STATE.yaml from', statePath, '— decisions:', Object.keys(state.decisions ?? {}).length);

  for (const rule of FLAG_RULES) {
    const enabled = rule.from(state);
    await db
      .insert(featureFlags)
      .values({ key: rule.key, enabled, description: rule.description })
      .onConflictDoUpdate({
        target: featureFlags.key,
        set: { enabled, description: rule.description, updatedAt: new Date() },
      });
    console.log(`  ${enabled ? '✓' : '·'} ${rule.key}${enabled ? '' : ' (off)'}`);
  }
  console.log('Done. Open /admin/features to flip any of these at runtime.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
