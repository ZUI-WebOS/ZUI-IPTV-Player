// cloudSyncConfigStore — Runtime Supabase configuration for Cloud Sync.
//
// Priority: runtime config (persisted here) › build-time env vars.
// When neither is present, Cloud Sync features render a graceful
// "Yapılandırılmamış" state and no network calls are made.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RELEASE_FEATURES } from '@/config/releaseFeatures';

export type CloudSyncConfig = {
  url: string;
  anonKey: string;
};

type CloudSyncConfigStore = {
  runtimeUrl: string;
  runtimeAnonKey: string;
  setConfig: (url: string, anonKey: string) => void;
  clearConfig: () => void;
};

export const useCloudSyncConfigStore = create<CloudSyncConfigStore>()(
  persist(
    (set) => ({
      runtimeUrl: '',
      runtimeAnonKey: '',
      setConfig: (url, anonKey) =>
        set({ runtimeUrl: url.trim(), runtimeAnonKey: anonKey.trim() }),
      clearConfig: () => set({ runtimeUrl: '', runtimeAnonKey: '' }),
    }),
    { name: 'zui-cloud-sync-config' }
  )
);

/**
 * Returns the active Supabase config, or null when Cloud Sync is unconfigured.
 * Runtime store takes precedence over build-time env vars.
 */
export function getSupabaseConfig(): CloudSyncConfig | null {
  if (!RELEASE_FEATURES.cloudSync) return null;
  const { runtimeUrl, runtimeAnonKey } = useCloudSyncConfigStore.getState();
  if (runtimeUrl && runtimeAnonKey) {
    return { url: runtimeUrl, anonKey: runtimeAnonKey };
  }
  const envUrl = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  // Guard against the .env.example placeholder values
  if (envUrl && envKey && !envUrl.includes('your-project-ref')) {
    return { url: envUrl, anonKey: envKey };
  }
  return null;
}
