import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { usePlayerStore } from '@/state/playerStore';
import { useUIStore } from '@/state/uiStore';
import { useSeriesStore } from '@/state/seriesStore';
import { useSettingsStore, SUBTITLE_SIZE_PX } from '@/state/settingsStore';
import { usePlayer } from '@/hooks/usePlayer';
import { usePlayerController } from '@/hooks/usePlayerController';
import { useRemote } from '@/hooks/useRemote';
import { useAudioWatchdog } from '@/hooks/useAudioWatchdog';
import { useStreamWatchdog } from '@/hooks/useStreamWatchdog';
import { OSD } from './OSD';
import { ErrorOverlay } from './ErrorOverlay';
import { Spinner } from '@/components/common/Spinner';
import type { PlaybackAttempt } from '@/types/player';

export function VideoPlayer() {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const subtitleEnabled = useSettingsStore((s) => s.subtitleEnabled);
  const subtitleSize    = useSettingsStore((s) => s.subtitleSize);
  const playerState = usePlayerStore((s) => s.state);
  const error = usePlayerStore((s) => s.error);
  const currentSource = usePlayerStore((s) => s.currentSource);
  const setSource = usePlayerStore((s) => s.setSource);
  const clearError = usePlayerStore((s) => s.setError);
  const playingEpisode = useSeriesStore((s) => s.playingEpisode);
  const canPlayAdjacentEpisode = useSeriesStore((s) => s.canPlayAdjacentEpisode);
  const playAdjacentEpisode = useSeriesStore((s) => s.playAdjacentEpisode);

  const navigate = useUIStore((s) => s.navigate);
  const lastMainScreen = useUIStore((s) => s.lastMainScreen);

  // Player controls use the same TV spatial-navigation system as the rest of the app.
  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'PLAYER_ROOT',
    isFocusBoundary: true,
    trackChildren: true,
    saveLastFocusedChild: true,
    autoRestoreFocus: false,
  });
  useEffect(() => {
    const timer = setTimeout(() => setFocus('OSD_PLAY_PAUSE'), 80);
    return () => clearTimeout(timer);
  }, [currentSource?.id, setFocus]);

  const [autoNextSeconds, setAutoNextSeconds] = useState<number | null>(null);
  const cancelAutoNext = () => setAutoNextSeconds(null);
  const { ref: cancelAutoNextRef, focused: cancelAutoNextFocused } = useFocusable({
    focusKey: 'AUTO_NEXT_CANCEL',
    onEnterPress: cancelAutoNext,
  });

  // ─── Persistent error state ─────────────────────────────────────────────────
  // Set by onFatalError (all url × strategy combinations exhausted) OR by a
  // non-recoverable post-attach error from strategy.onError().
  const [persistentError, setPersistentError] = useState<{
    message: string;
    attempts: PlaybackAttempt[];
  } | null>(null);

  // D-031: onFatalError callback — called by usePlayer when all attempts fail.
  // useCallback so the ref identity is stable across renders (avoids usePlayer
  // effect re-firing just because the callback was re-created).
  const onFatalError = useCallback(
    (message: string, attempts: PlaybackAttempt[]) => {
      setPersistentError({ message, attempts });
    },
    [],
  );

  // Watchdog escalation: when all 3 retries fail, restart the full fallback chain.
  // Spread creates a new object → usePlayer effect dependency changes → re-run
  const handleWatchdogEscalation = useCallback(() => {
    if (currentSource) {
      console.warn('[player] watchdog escalated, restarting full fallback chain');
      setSource({ ...currentSource });
    }
  }, [currentSource, setSource]);

  const handleWatchdogRetry = useCallback(() => {
    if (currentSource) {
      console.log('[player] watchdog triggering stream re-init');
      setSource({ ...currentSource });
    }
  }, [currentSource, setSource]);

  // ─── Subtitle enable / disable ──────────────────────────────────────────────
  // Applies to HLS WebVTT / CEA-608 tracks embedded in the stream.
  // 'addtrack' listener ensures tracks added after playback starts are also covered.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyMode = () => {
      const mode: TextTrackMode = subtitleEnabled ? 'showing' : 'hidden';
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = mode;
      }
    };

    applyMode();
    video.textTracks.addEventListener('addtrack', applyMode);
    return () => {
      video.textTracks.removeEventListener('addtrack', applyMode);
    };
  }, [subtitleEnabled]);

  usePlayer(videoRef, onFatalError);
  const playerController = usePlayerController(videoRef, currentSource?.id);
  useRemote(playerController);
  useAudioWatchdog(videoRef);
  useStreamWatchdog({
    videoRef,
    url: currentSource?.url ?? '',
    onAllRetriesFailed: handleWatchdogEscalation,
    onRetry: handleWatchdogRetry,
    enabled: false,
  });

  // ─── Post-attach non-recoverable error → persistent error overlay ───────────
  // strategy.onError() fires mid-stream (after successful attach). Fatal
  // mid-stream errors have no URL fallback left — show persistent overlay.
  useEffect(() => {
    if (error && !error.recoverable && !persistentError) {
      setPersistentError({ message: error.message, attempts: [] });
    }
  }, [error, persistentError]);

  // Episode completion starts a cancellable 10-second next-episode countdown.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      const isCurrentEpisode = Boolean(
        playingEpisode && currentSource?.id === `series-ep-${playingEpisode.episodeId}`
      );
      if (isCurrentEpisode && canPlayAdjacentEpisode('next')) {
        setAutoNextSeconds(10);
        setTimeout(() => setFocus('AUTO_NEXT_CANCEL'), 0);
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [playingEpisode, currentSource?.id, canPlayAdjacentEpisode, setFocus]);

  useEffect(() => {
    if (autoNextSeconds === null) return;
    if (autoNextSeconds <= 0) {
      setAutoNextSeconds(null);
      playAdjacentEpisode('next');
      return;
    }
    const timer = setTimeout(() => {
      setAutoNextSeconds(value => value === null ? null : value - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoNextSeconds, playAdjacentEpisode]);

  useEffect(() => {
    setAutoNextSeconds(null);
  }, [currentSource?.id]);

  const handleBack = () => {
    setPersistentError(null);
    clearError(null);
    navigate(lastMainScreen);
  };

  const handleRetry = () => {
    if (currentSource) {
      setPersistentError(null);
      clearError(null);
      // Spread creates a new object → usePlayer effect dependency changes → re-run
      setSource({ ...currentSource });
    }
  };

  return (
    <FocusContext.Provider value={focusKey}>
    <div ref={ref as React.RefObject<HTMLDivElement>} className="relative w-full h-full bg-bg-base overflow-hidden">
      {/* Dynamic subtitle font size — targets native ::cue rendering */}
      <style>{`video::cue { font-size: ${SUBTITLE_SIZE_PX[subtitleSize]}; }`}</style>

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        playsInline
        autoPlay
      />

      {playerState === 'loading' && !persistentError && (
        <div className="absolute inset-0">
          <Spinner />
        </div>
      )}

      {/* Kurtarılabilir hata (ağ kesintisi) — retry butonu */}
      {playerState === 'error' && error?.recoverable && !persistentError && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-8">
          <div className="w-20 h-20 rounded-full bg-bg-surface flex items-center justify-center">
            <span className="text-display text-live">!</span>
          </div>
          <p className="text-h2 text-text-primary text-center max-w-xl px-12">
            {error.message}
          </p>
          <button
            className="px-10 py-4 bg-accent text-accent-text text-body font-medium rounded-lg"
            onClick={handleRetry}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          >
            {t('player.retry')}
          </button>
        </div>
      )}

      {/* Kalıcı hata — tüm URL × strateji adayları tükendi */}
      {persistentError && (
        <ErrorOverlay
          message={persistentError.message}
          attempts={persistentError.attempts}
          onBack={handleBack}
        />
      )}

      {autoNextSeconds !== null && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/55">
          <div className="w-[520px] rounded-2xl border border-[#E8B567]/35 bg-[#131110]/95 px-8 py-7 text-center shadow-[0_30px_80px_-25px_#000]">
            <div className="font-serif text-[26px] text-white">
              {t('player.next_episode_countdown', {
                count: autoNextSeconds,
                defaultValue: `Sonraki bölüm ${autoNextSeconds} saniye içinde başlayacak`,
              })}
            </div>
            <button
              ref={cancelAutoNextRef as React.RefObject<HTMLButtonElement>}
              onClick={cancelAutoNext}
              className={[
                'mt-5 px-6 h-11 rounded-full border text-[12px] uppercase tracking-[0.25em] font-semibold transition-all',
                cancelAutoNextFocused
                  ? 'border-[#E8B567]/65 bg-[#E8B567]/10 text-[#E8B567] shadow-[0_0_22px_-7px_#E8B567]'
                  : 'border-white/20 text-white/60',
              ].join(' ')}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <OSD controller={playerController} />
    </div>
    </FocusContext.Provider>
  );
}
