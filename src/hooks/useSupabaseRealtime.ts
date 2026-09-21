// useSupabaseRealtime — Cloud Sync gerçek zamanlı dinleme hook'u.
//
// Bu hook App.tsx seviyesinde çağrılır; uygulama açık kaldığı
// sürece cihaz Supabase'e kayıtlı kalır ve realtime kanalı dinler.
// UI durumu yerel useState yerine cloudSyncRuntimeStore'a yazılır;
// Onboarding ve diğer ekranlar oradan okur.

import { useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient, isCloudSyncConfigured } from '@/lib/supabaseClient';
import { useSourceStore } from '@/state/sourceStore';
import { useCloudSyncRuntimeStore } from '@/state/cloudSyncRuntimeStore';
import { RELEASE_FEATURES } from '@/config/releaseFeatures';

// ─── Playlist yükleme yardımcısı ─────────────────────────────────────────────

function resolveName(playlist_name: string | null, playlist_url: string): string {
  return playlist_name?.trim() ||
    (() => { try { return new URL(playlist_url).hostname; } catch { return 'Uzak Liste'; } })();
}

async function loadPlaylist(pl: {
  playlist_name: string | null;
  playlist_url:  string;
  source_type:   string | null;
  xtream_username: string | null;
  xtream_password: string | null;
}): Promise<{ ok: true; sourceId: string } | { ok: false; error: string }> {
  const name = resolveName(pl.playlist_name, pl.playlist_url);

  if (pl.source_type === 'xtream') {
    return useSourceStore.getState().addSource({
      type: 'xtream',
      name,
      config: {
        host:     pl.playlist_url,
        port:     80,
        username: pl.xtream_username ?? '',
        password: pl.xtream_password ?? '',
      },
    });
  }

  return useSourceStore.getState().addSource({
    type: 'm3u',
    name,
    config: { url: pl.playlist_url },
  });
}

// ─── Tip ─────────────────────────────────────────────────────────────────────

type SupabaseClientType = NonNullable<ReturnType<typeof getSupabaseClient>>;

// ─── Hook ─────────────────────────────────────────────────────────────────────
//
// onSuccessCallback: playlist başarıyla yüklenince çağrılır.
// App.tsx'te toast göstermek için kullanılır.
// Onboarding CloudStep'teki "ekrana dön" geçişi artık bu callback ile
// değil, Onboarding'in kendi useSourceStore dinlemesiyle yapılabilir.

export const useSupabaseRealtime = (onSuccessCallback: () => void) => {
  const successCallbackRef = useRef(onSuccessCallback);
  const clientRef          = useRef<SupabaseClientType | null>(null);

  useEffect(() => {
    successCallbackRef.current = onSuccessCallback;
  }, [onSuccessCallback]);

  // ─── Manuel yeniden yükleme ───────────────────────────────────────────────

  const checkAndLoad = useCallback(async () => {
    if (!RELEASE_FEATURES.cloudSync) return;
    const { shortDeviceId, isChecking } = useCloudSyncRuntimeStore.getState();
    const client = clientRef.current;
    if (!shortDeviceId || !client || isChecking) return;

    useCloudSyncRuntimeStore.setState({ isChecking: true, checkError: null });
    try {
      console.log('[ZUI-SYNC] checkAndLoad → device_id:', shortDeviceId);

      const { data, error } = await client
        .from('playlists')
        .select('id, playlist_url, playlist_name, source_type, xtream_username, xtream_password')
        .eq('device_id', shortDeviceId)
        .eq('loaded', false)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('[ZUI-SYNC] SELECT hatası:', error.message, error.code);
        useCloudSyncRuntimeStore.setState({ checkError: `Supabase hatası (${error.code})` });
        return;
      }
      if (!data || data.length === 0) {
        useCloudSyncRuntimeStore.setState({ checkError: 'Yüklenecek yeni liste yok. Web panelinden URL gönderin.' });
        return;
      }

      console.log('[ZUI-SYNC]', data.length, 'adet yeni liste bulundu.');

      await client
        .from('playlists')
        .update({ loaded: true })
        .in('id', data.map((pl) => pl.id));

      let okCount = 0;
      for (const pl of data) {
        const result = await loadPlaylist(pl);
        if (result.ok) {
          okCount++;
          console.log('[ZUI-SYNC] Liste başarıyla yüklendi.');
        } else {
          console.error('[ZUI-SYNC] loadPlaylist hatası:', result.error);
          await client.from('playlists').update({ loaded: false }).eq('id', pl.id);
          useCloudSyncRuntimeStore.setState({
            checkError: `"${pl.playlist_name ?? pl.playlist_url}" yüklenemedi: ${result.error}`,
          });
        }
      }

      if (okCount > 0) successCallbackRef.current();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ZUI-SYNC] checkAndLoad exception:', msg);
      useCloudSyncRuntimeStore.setState({ checkError: `Bağlantı hatası: ${msg}` });
    } finally {
      useCloudSyncRuntimeStore.setState({ isChecking: false });
    }
  }, []); // store'dan okuyup yazdığı için dışarıdan bağımlılık yok

  // ─── Cloud Sync başlatma ──────────────────────────────────────────────────

  useEffect(() => {
    if (!RELEASE_FEATURES.cloudSync) {
      clientRef.current = null;
      useCloudSyncRuntimeStore.setState({
        isConfigured: false,
        isListening: false,
        isChecking: false,
        checkError: null,
        _triggerCheckAndLoad: null,
      });
      return;
    }
    // checkAndLoad'u store'a kaydet — Onboarding butonu oradan çağırır.
    useCloudSyncRuntimeStore.setState({ _triggerCheckAndLoad: () => void checkAndLoad() });

    if (!isCloudSyncConfigured()) {
      useCloudSyncRuntimeStore.setState({ isConfigured: false });
      return;
    }
    useCloudSyncRuntimeStore.setState({ isConfigured: true });

    const { shortDeviceId, deviceKey } = useCloudSyncRuntimeStore.getState();

    let channel: any = null;
    let cancelled    = false;

    const startCloudSyncFlow = async () => {
      console.log('[ZUI-SYNC] Cihaz kimliği hazır:', shortDeviceId);

      const client = getSupabaseClient({ deviceId: shortDeviceId, deviceKey: deviceKey });
      if (!client) {
        console.warn('[ZUI-SYNC] Supabase istemcisi oluşturulamadı — yapılandırma eksik');
        return;
      }
      clientRef.current = client;

      // Cihazı Supabase'e kaydet / güncelle
      try {
        const { error: upsertErr } = await client
          .from('devices')
          .upsert(
            { device_id: shortDeviceId, device_key: deviceKey },
            { onConflict: 'device_id' },
          );
        if (upsertErr) {
          console.error('[ZUI-SYNC] Upsert hatası:', upsertErr.message);
        } else {
          console.log('[ZUI-SYNC] Cihaz Supabase\'e kaydedildi.');
        }
      } catch (upsertEx) {
        console.error('[ZUI-SYNC] Upsert exception:', upsertEx);
        // Upsert başarısız olsa bile dinlemeye devam et
      }

      if (cancelled) return;
      useCloudSyncRuntimeStore.setState({ isListening: true });

      // playlists tablosuna INSERT gelince anında yükle
      channel = client
        .channel(`zui-tv-${shortDeviceId}`)
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'playlists',
            filter: `device_id=eq.${shortDeviceId}`,
          },
          async (payload) => {
            const pl = payload.new as {
              id: number; playlist_url: string; playlist_name: string | null;
              source_type: string | null; xtream_username: string | null; xtream_password: string | null;
            };
            console.log('[ZUI-SYNC] Realtime INSERT → id:', pl.id, 'type:', pl.source_type);
            if (!pl.playlist_url) return;
            try {
              await client.from('playlists').update({ loaded: true }).eq('id', pl.id);
              const result = await loadPlaylist(pl);
              if (result.ok) {
                successCallbackRef.current();
              } else {
                console.error('[ZUI-SYNC] Realtime loadPlaylist hatası:', result.error);
                await client.from('playlists').update({ loaded: false }).eq('id', pl.id);
                useCloudSyncRuntimeStore.setState({
                  checkError: `Otomatik yükleme başarısız: ${result.error}`,
                });
              }
            } catch (err) {
              console.error('[ZUI-SYNC] Realtime exception:', err);
            }
          }
        )
        .subscribe((status) => {
          console.log('[ZUI-SYNC] Realtime subscribe durumu:', status);
        });
    };

    void startCloudSyncFlow();

    return () => {
      cancelled = true;
      useCloudSyncRuntimeStore.setState({ isListening: false, _triggerCheckAndLoad: null });
      if (channel && clientRef.current) {
        clientRef.current.removeChannel(channel);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkAndLoad]);
};
