import { useEffect } from 'react';
import { useUIStore } from '@/state/uiStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { useSeriesStore } from '@/state/seriesStore';

export function RemoteRouter() {
  const currentScreen = useUIStore((s) => s.currentScreen);
  const modalOpen = useUIStore((s) => s.modalOpen);
  const navigate = useUIStore((s) => s.navigate);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const zapChannel = usePlaylistStore((s) => s.zapChannel);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // BACK: webOS 461, browser ESC 27
      if (e.keyCode === 461 || e.keyCode === 27) {
        e.preventDefault();
        if (modalOpen) {
          closeModal();
          return;
        }
        // EpisodeBrowserModal owns BACK while it is open. Returning here keeps
        // the global router from navigating Series straight to Home; the modal
        // listener closes itself and restores focus to SERIES_HERO_INFO.
        if (currentScreen === 'series' && useSeriesStore.getState().detailsSeriesId) {
          return;
        }
        switch (currentScreen) {
          case 'player':
            // Oynatıcıdan çık → son ana ekran (Live TV / EPG)
            navigate(useUIStore.getState().lastMainScreen);
            break;
          case 'channelList':
          case 'epg':
          case 'settings':
          case 'movies':
          case 'series':
          case 'playlists':
            // Alt sayfalardan BACK → Anasayfa
            navigate('home');
            break;
          case 'home':
            // Anasayfadan BACK → çıkış onayı
            openModal('exit');
            break;
          case 'onboarding':
          case 'loading':
            // Onboarding / yükleme ekranında BACK engelle
            break;
        }
        return;
      }

      // CH+ (33) / CH- (34)
      if (e.keyCode === 33 || e.keyCode === 34) {
        if (modalOpen) return;
        if (currentScreen === 'player' || currentScreen === 'channelList') {
          e.preventDefault();
          void zapChannel(e.keyCode === 33 ? 'next' : 'prev');
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentScreen, modalOpen, navigate, openModal, closeModal, zapChannel]);

  return null;
}
