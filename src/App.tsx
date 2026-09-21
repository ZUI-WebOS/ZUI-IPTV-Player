import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { Onboarding } from '@/screens/Onboarding';
import { ChannelList } from '@/screens/ChannelList';
import { EPGScreen } from '@/screens/EPGScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { MoviesScreen } from '@/screens/MoviesScreen';
import { SeriesScreen } from '@/screens/SeriesScreen';
import { PlaylistsScreen } from '@/screens/PlaylistsScreen';
import { SplashScreen } from '@/components/SplashScreen';
import { RemoteRouter } from '@/components/RemoteRouter';
import { TopBar } from '@/components/layout/TopBar';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useUIStore } from '@/state/uiStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { useSourceStore } from '@/state/sourceStore';
import { useEpgStore } from '@/state/epgStore';
import { epgCache } from '@/services/epgCache';
import { isEPGStale } from '@/services/epg.service';
import { useParentalStore } from '@/state/parentalStore';
import { useLogoCacheStore } from '@/state/logoCacheStore';
import { Toast } from '@/components/ui/Toast';

const SIX_HOURS = 6 * 60 * 60 * 1000;

function useInitApp() {
  const navigate = useUIStore((s) => s.navigate);
  const loadAllFromDB = usePlaylistStore((s) => s.loadAllFromDB);
  const loadFromDB = useSourceStore((s) => s.loadFromDB);
  const loadEpgFromCache = useEpgStore((s) => s.loadFromCache);
  const syncEpg = useEpgStore((s) => s.syncEPG);

  useEffect(() => {
    (async () => {
      // 1. Load sources (triggers IDB v3 migration if needed)
      await loadFromDB();

      const sources = useSourceStore.getState().sources;

      if (sources.length === 0) {
        navigate('onboarding');
        return;
      }

      // 2. Load all channels from IDB into playlistStore
      await loadAllFromDB();

      // 3. Load EPG match map from cache
      await loadEpgFromCache();

      await useParentalStore.getState().loadFromDB();
      await useLogoCacheStore.getState().loadFromDB();

      // D-024 / Faz-5D: App startup'ta her zaman Home.
      // Home → Greeting + Kaldığın Yer experience. Live TV önceden default'tu,
      // artık Anasayfa default; kullanıcı oradan yönlenir.
      navigate('home');
      // lastMainScreen'i de sıfırla — localStorage'da 'epg' kalmış olabilir
      useUIStore.setState({ lastMainScreen: 'channelList' });

      // 4. Background: refresh stale sources (>6 hours old)
      const stale = sources.filter(
        (s) => s.enabled && (!s.syncedAt || Date.now() - s.syncedAt > SIX_HOURS)
      );
      for (const src of stale) {
        useSourceStore
          .getState()
          .syncSource(src.id)
          .catch((err: unknown) => console.warn(`Stale sync failed for ${src.id}:`, err));
      }

      // 5. Background: refresh stale EPG (>6 hours old)
      if (await isEPGStale()) {
        const meta = await epgCache.getEPGMeta();
        if (meta?.url) {
          syncEpg(meta.url).catch(console.error);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  const { t } = useTranslation();
  useInitApp();
  const screen = useUIStore((s) => s.currentScreen);
  const modalOpen = useUIStore((s) => s.modalOpen);
  const closeModal = useUIStore((s) => s.closeModal);

  // D-028 Patch 4: Belt-and-suspenders focus guard.
  // ChannelList's focus effect handles normal startup (waits for channels to load).
  // This 1s fallback catches edge-cases where no setFocus succeeded.
  // IMPORTANT: If channels are already loaded, prefer focusing a channel card over
  // sidebar-all — focusing sidebar-all triggers D-026 debouncedFilter(null) which
  // would overwrite the saved activeCategory and show wrong channels.
  const { getCurrentFocusKey, setFocus: setNavFocus } = useFocusable({
    focusKey: 'APP_SHELL',
    focusable: false,
  });

  // Modal kapatıldıktan sonra alttaki ekrana focus geri ver.
  // closeModal() → modal unmount → norigin focus boşa düşer.
  // setTimeout(0): bir sonraki tick'te modal DOM'dan kalkmış olur, setNavFocus güvenle çalışır.
  const handleCloseModal = () => {
    closeModal();
    setTimeout(() => {
      const currentScreen = useUIStore.getState().currentScreen;
      if (currentScreen === 'home') {
        const lastId = usePlaylistStore.getState().lastFocusedChannelId;
        setNavFocus(lastId ? 'home-resume-continue' : 'home-section-0');
      } else if (currentScreen === 'channelList') {
        const s = usePlaylistStore.getState();
        const lastId = s.lastFocusedChannelId;
        if (lastId && s.visibleChannels.some((c) => c.id === lastId)) {
          setNavFocus(`channel-${lastId}`);
        } else if (s.visibleChannels.length > 0) {
          setNavFocus(`channel-${s.visibleChannels[0].id}`);
        }
      }
      // settings / epg — isFocusBoundary ile kendi focus'larını yönetir
    }, 0);
  };
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // getCurrentFocusKey() returns null at runtime when nothing focused yet
      // (typed as string but SpatialNavigation.focusKey starts as null).
      const focusedKey = getCurrentFocusKey();
      if (!focusedKey) {
        const currentScreen = useUIStore.getState().currentScreen;

        // Home screen — focus smart default
        if (currentScreen === 'home') {
          const lastId = usePlaylistStore.getState().lastFocusedChannelId;
          const key = lastId ? 'home-resume-continue' : 'home-section-0';
          console.warn('[App] No focused component after 1s — forcing home default', key);
          setNavFocus(key);
          return;
        }

        // Movies screen — focus back button (sidebar top)
        if (currentScreen === 'movies') {
          console.warn('[App] No focused component after 1s — forcing MOVIES_BACK_HOME');
          setNavFocus('MOVIES_BACK_HOME');
          return;
        }

        // Series screen — focus back button (sidebar top)
        if (currentScreen === 'series') {
          console.warn('[App] No focused component after 1s — forcing SERIES_BACK_HOME');
          setNavFocus('SERIES_BACK_HOME');
          return;
        }

        const s = usePlaylistStore.getState();
        const lastFocused = s.lastFocusedChannelId;
        if (lastFocused && s.visibleChannels.some((c) => c.id === lastFocused)) {
          console.warn('[App] No focused component after 1s — forcing channel focus', lastFocused);
          setNavFocus(`channel-${lastFocused}`);
        } else if (s.visibleChannels.length > 0) {
          const firstId = s.visibleChannels[0].id;
          console.warn('[App] No focused component after 1s — forcing first channel', firstId);
          setNavFocus(`channel-${firstId}`);
        } else {
          console.warn('[App] No focused component after 1s — forcing sidebar-all (no channels yet)');
          setNavFocus('sidebar-all');
        }
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case 'loading':     return <SplashScreen />;
      case 'onboarding':  return <Onboarding />;
      case 'home':        return <HomeScreen />;
      case 'channelList': return <ChannelList />;
      case 'epg':         return <EPGScreen />;
      case 'settings':    return <SettingsScreen />;
      case 'movies':      return <MoviesScreen />;
      case 'series':      return <SeriesScreen />;
      case 'playlists':   return <PlaylistsScreen />;
      case 'player':      return <VideoPlayer />;
      default:            return <SplashScreen />;
    }
  };

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-bg-base text-white antialiased font-sans">
      {/* Aurora ambient washes — static, no animation cost */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[1100px] h-[1100px] rounded-full bg-[radial-gradient(circle,rgba(232,181,103,0.18),transparent_60%)] blur-3xl z-0" />
      <div className="pointer-events-none absolute -bottom-60 -left-40 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(174,118,233,0.12),transparent_60%)] blur-3xl z-0" />
      {/* Subtle grain texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px] z-0" />
      <RemoteRouter />
      <TopBar />
      <main className="relative flex-1 overflow-hidden z-10">{renderScreen()}</main>
      <Toast />

      {modalOpen === 'exit' && (
        <ConfirmModal
          title={t('app.exit_title')}
          message={t('app.exit_message')}
          confirmLabel={t('app.exit_confirm')}
          cancelLabel={t('app.exit_cancel')}
          onConfirm={() => window.close()}
          onCancel={handleCloseModal}
        />
      )}
    </div>
  );
}
