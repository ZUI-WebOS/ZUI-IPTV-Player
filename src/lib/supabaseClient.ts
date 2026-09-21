// supabaseClient — Supabase client factory for Cloud Sync.
//
// Each call returns a fresh client with per-device auth headers so
// Supabase Row Level Security can enforce both device_id and device_key.
// Returns null when Cloud Sync is not configured.
//
// ⚠️  Do NOT import a module-level singleton. Always call getSupabaseClient()
//     so the runtime config is picked up correctly.

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/state/cloudSyncConfigStore';
import { RELEASE_FEATURES } from '@/config/releaseFeatures';

export type SupabaseClientOpts = {
  /** Short TV identifier, e.g. "A1B2-C3D4". Sent as x-zui-device-id header. */
  deviceId?: string;
  /** 6-char device key derived from MAC. Sent as x-zui-device-key header. */
  deviceKey?: string;
};

/**
 * Creates a Supabase client with optional device auth headers baked in.
 * Returns null when Cloud Sync is not configured (no URL + anon key available).
 */
export function getSupabaseClient(opts?: SupabaseClientOpts) {
  // Network-layer release gate. Persisted legacy settings or a local .env file
  // cannot create a Supabase client while Cloud Sync is disabled.
  if (!RELEASE_FEATURES.cloudSync) return null;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;

  const extraHeaders: Record<string, string> = {};
  if (opts?.deviceId)  extraHeaders['x-zui-device-id']  = opts.deviceId;
  if (opts?.deviceKey) extraHeaders['x-zui-device-key'] = opts.deviceKey;

  return createClient(cfg.url, cfg.anonKey, {
    global: { headers: extraHeaders },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * True when a Supabase URL + anon key is available
 * (either from env vars or from the runtime Settings override).
 */
export function isCloudSyncConfigured(): boolean {
  return RELEASE_FEATURES.cloudSync && getSupabaseConfig() !== null;
}
