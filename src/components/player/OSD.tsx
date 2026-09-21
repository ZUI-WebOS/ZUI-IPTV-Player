// OSD — On-Screen Display for the video player.
// Top bar: channel/film name + clock.
// Bottom bar: play/pause · rewind · fast-forward · seek bar · time (VOD only).

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { usePlayerStore } from '@/state/playerStore';
import { useSeriesStore } from '@/state/seriesStore';
import { useSettingsStore, LANGUAGE_LOCALES } from '@/state/settingsStore';
import { useToast } from '@/components/ui/Toast';
import type { PlayerController } from '@/hooks/usePlayerController';

// ─── Clock ───────────────────────────────────────────────────────────────────

function useClock() {
  const language   = useSettingsStore(s => s.language);
  const timeFormat = useSettingsStore(s => s.timeFormat);
  const locale     = LANGUAGE_LOCALES[language] ?? 'en-US';
  const hour12     = timeFormat === '12h';

  const fmt = () =>
    new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12 });

  const [time, setTime] = useState(fmt);

  useEffect(() => {
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, hour12]);

  return time;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '--:--';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─── Subtitle quick-toggle (CC button) ───────────────────────────────────────

function SubtitleToggleOSDBtn() {
  const { t } = useTranslation();
  const showToast          = useToast(s => s.show);
  const subtitleEnabled    = useSettingsStore(s => s.subtitleEnabled);
  const setSubtitleEnabled = useSettingsStore(s => s.setSubtitleEnabled);

  const toggle = () => {
    const next = !subtitleEnabled;
    setSubtitleEnabled(next);
    showToast(next ? `🔤 ${t('player.sub_on')}` : `✕ ${t('player.sub_off')}`);
  };

  const setFocusRef = useRef<((key: string) => void) | null>(null);
  const { ref, focused, setFocus } = useFocusable({
    focusKey: 'OSD_SUBTITLE',
    onEnterPress: toggle,
    onArrowPress: (direction) => {
      if (direction === 'up') {
        setFocusRef.current?.('OSD_TIMELINE');
        return false;
      }
      if (direction === 'left' || direction === 'down') {
        setFocusRef.current?.('OSD_PLAY_PAUSE');
        return false;
      }
      // There is no control to the right; keep focus on subtitles.
      return false;
    },
  });
  setFocusRef.current = setFocus;

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={toggle}
      className="flex flex-col items-center gap-1 transition-colors group"
    >
      <div className={[
        'w-11 h-11 rounded-full border grid place-items-center transition-all',
        focused
          ? 'border-[#E8B567]/60 bg-[#E8B567]/10 shadow-[0_0_24px_-6px_#E8B567]'
          : subtitleEnabled
            ? 'border-[#E8B567]/40'
            : 'border-white/20',
      ].join(' ')}>
        {/* Closed-caption icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={[
            'w-5 h-5 transition-colors',
            focused || subtitleEnabled ? 'text-[#E8B567]' : 'text-white/50',
          ].join(' ')}
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M7 12H6a2 2 0 000 4h1" />
          <path d="M14 12h-1a2 2 0 000 4h1" />
        </svg>
      </div>
      <span className={[
        'text-[9px] uppercase tracking-[0.2em] font-semibold',
        focused || subtitleEnabled ? 'text-[#E8B567]' : 'text-white/40',
      ].join(' ')}>
        {subtitleEnabled ? t('player.sub_on') : t('player.sub_off')}
      </span>
    </button>
  );
}

// ─── Bottom controls bar (VOD) ───────────────────────────────────────────────

interface ControlsProps {
  controller: PlayerController;
}

function BottomControls({ controller }: ControlsProps) {
  const { t } = useTranslation();
  const currentSource = usePlayerStore(s => s.currentSource);
  const playingEpisode = useSeriesStore(s => s.playingEpisode);
  const canPlayAdjacentEpisode = useSeriesStore(s => s.canPlayAdjacentEpisode);
  const playAdjacentEpisode = useSeriesStore(s => s.playAdjacentEpisode);
  const { currentTime, duration, paused, isLive, canSeek, seeking } = controller;
  const progress = isLive || duration === 0 ? 0 : Math.min(1, currentTime / duration);

  const seekToPointer = (clientX: number, track: HTMLElement) => {
    if (!canSeek) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    controller.seekToRatio(ratio);
  };

  const timelineSetFocusRef = useRef<((key: string) => void) | null>(null);
  const { ref: timelineRef, focused: timelineFocused, setFocus: setTimelineFocus } = useFocusable({
    focusKey: 'OSD_TIMELINE',
    focusable: canSeek,
    onArrowPress: (direction) => {
      if (direction === 'left') {
        controller.seekBy(-30);
        return false;
      }
      if (direction === 'right') {
        controller.seekBy(30);
        return false;
      }
      if (direction === 'down') {
        timelineSetFocusRef.current?.('OSD_PLAY_PAUSE');
        return false;
      }
      // Timeline is the top row; do not let UP escape the player boundary.
      return false;
    },
  });
  timelineSetFocusRef.current = setTimelineFocus;

  const isEpisode = Boolean(
    playingEpisode && currentSource?.id === `series-ep-${playingEpisode.episodeId}`
  );
  const canPlayPrevious = isEpisode && canPlayAdjacentEpisode('previous');
  const canPlayNext = isEpisode && canPlayAdjacentEpisode('next');

  const rewindFocusable = useFocusable({
    focusKey: 'OSD_REWIND',
    focusable: canSeek,
    onEnterPress: () => controller.seekBy(-10),
  });
  const playFocusable = useFocusable({
    focusKey: 'OSD_PLAY_PAUSE',
    onEnterPress: controller.togglePlay,
  });
  const forwardFocusable = useFocusable({
    focusKey: 'OSD_FORWARD',
    focusable: canSeek,
    onEnterPress: () => controller.seekBy(10),
  });
  const previousEpisodeFocusable = useFocusable({
    focusKey: 'OSD_PREVIOUS_EPISODE',
    focusable: Boolean(canPlayPrevious),
    onEnterPress: () => { if (canPlayPrevious) playAdjacentEpisode('previous'); },
  });
  const nextEpisodeFocusable = useFocusable({
    focusKey: 'OSD_NEXT_EPISODE',
    focusable: Boolean(canPlayNext),
    onEnterPress: () => { if (canPlayNext) playAdjacentEpisode('next'); },
  });

  return (
    <div className="px-12 pb-8 flex flex-col gap-3">
      {/* Seek bar — only for VOD */}
      {!isLive && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium tabular-nums text-white/80 shrink-0 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          {/* Track */}
          <div
            ref={timelineRef as React.RefObject<HTMLDivElement>}
            onClick={(event) => seekToPointer(event.clientX, event.currentTarget)}
            className={[
              'flex-1 h-3 rounded-full bg-white/20 relative overflow-hidden cursor-pointer transition-all border',
              timelineFocused
                ? 'border-[#E8B567]/70 shadow-[0_0_18px_-5px_#E8B567] scale-y-125'
                : 'border-transparent',
              seeking ? 'opacity-75' : '',
              canSeek ? '' : 'cursor-default opacity-50',
            ].join(' ')}
          >
            <div
              className="h-full bg-[#E8B567] rounded-full transition-none"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-[13px] font-medium tabular-nums text-white/50 shrink-0 w-12">
            {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Controls row — subtitle CC button is anchored to the right edge */}
      <div className="relative flex items-center justify-center gap-6">
        {isEpisode && (
          <button
            ref={previousEpisodeFocusable.ref as React.RefObject<HTMLButtonElement>}
            onClick={() => { if (canPlayPrevious) playAdjacentEpisode('previous'); }}
            disabled={!canPlayPrevious}
            className={[
              'flex flex-col items-center gap-1 transition-all',
              canPlayPrevious ? 'text-white/70' : 'text-white/20',
              previousEpisodeFocusable.focused ? 'text-[#E8B567] scale-[1.06]' : '',
            ].join(' ')}
          >
            <div className={[
              'w-11 h-11 rounded-full border grid place-items-center transition-all',
              previousEpisodeFocusable.focused ? 'border-[#E8B567]/60 bg-[#E8B567]/10 shadow-[0_0_20px_-6px_#E8B567]' : 'border-white/20',
            ].join(' ')}>
              <span className="text-[17px]">|◀</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.16em] font-semibold">
              {t('player.previous_episode', { defaultValue: 'Önceki Bölüm' })}
            </span>
          </button>
        )}

        {/* Rewind 10s */}
        {!isLive && (
          <button
            ref={rewindFocusable.ref as React.RefObject<HTMLButtonElement>}
            onClick={() => controller.seekBy(-10)}
            className={[
              'flex flex-col items-center gap-1 text-white/70 transition-all group',
              rewindFocusable.focused ? 'text-[#E8B567] scale-[1.06]' : 'hover:text-white',
            ].join(' ')}
          >
            <div className={[
              'w-11 h-11 rounded-full border grid place-items-center transition-all',
              rewindFocusable.focused ? 'border-[#E8B567]/60 bg-[#E8B567]/10 shadow-[0_0_20px_-6px_#E8B567]' : 'border-white/20 group-hover:border-white/40',
            ].join(' ')}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 5V2L7 7l5 5V9c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                <text x="50%" y="67%" textAnchor="middle" fontSize="5" fill="currentColor" dy=".1em">10</text>
              </svg>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold">−10s</span>
          </button>
        )}

        {/* Play / Pause */}
        <button
          ref={playFocusable.ref as React.RefObject<HTMLButtonElement>}
          onClick={controller.togglePlay}
          className={[
            'flex flex-col items-center gap-1.5 group transition-transform',
            playFocusable.focused ? 'scale-[1.08]' : '',
          ].join(' ')}
        >
          <div className={[
            'w-14 h-14 rounded-full bg-[#E8B567] grid place-items-center transition-all',
            playFocusable.focused ? 'shadow-[0_0_38px_-2px_#E8B567]' : 'shadow-[0_0_28px_-4px_#E8B567] group-hover:scale-[1.08]',
          ].join(' ')}>
            {paused ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#0e0b0a] translate-x-[1px]">
                <path d="M7 4v16l13-8z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#0e0b0a]">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-white/60">
            {paused ? t('player.play') : t('player.pause')}
          </span>
        </button>

        {/* Fast-forward 10s */}
        {!isLive && (
          <button
            ref={forwardFocusable.ref as React.RefObject<HTMLButtonElement>}
            onClick={() => controller.seekBy(10)}
            className={[
              'flex flex-col items-center gap-1 text-white/70 transition-all group',
              forwardFocusable.focused ? 'text-[#E8B567] scale-[1.06]' : 'hover:text-white',
            ].join(' ')}
          >
            <div className={[
              'w-11 h-11 rounded-full border grid place-items-center transition-all',
              forwardFocusable.focused ? 'border-[#E8B567]/60 bg-[#E8B567]/10 shadow-[0_0_20px_-6px_#E8B567]' : 'border-white/20 group-hover:border-white/40',
            ].join(' ')}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 5V2l5 5-5 5V9c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                <text x="50%" y="67%" textAnchor="middle" fontSize="5" fill="currentColor" dy=".1em">10</text>
              </svg>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold">+10s</span>
          </button>
        )}

        {isEpisode && (
          <button
            ref={nextEpisodeFocusable.ref as React.RefObject<HTMLButtonElement>}
            onClick={() => { if (canPlayNext) playAdjacentEpisode('next'); }}
            disabled={!canPlayNext}
            className={[
              'flex flex-col items-center gap-1 transition-all',
              canPlayNext ? 'text-white/70' : 'text-white/20',
              nextEpisodeFocusable.focused ? 'text-[#E8B567] scale-[1.06]' : '',
            ].join(' ')}
          >
            <div className={[
              'w-11 h-11 rounded-full border grid place-items-center transition-all',
              nextEpisodeFocusable.focused ? 'border-[#E8B567]/60 bg-[#E8B567]/10 shadow-[0_0_20px_-6px_#E8B567]' : 'border-white/20',
            ].join(' ')}>
              <span className="text-[17px]">▶|</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.16em] font-semibold">
              {t('player.next_episode', { defaultValue: 'Sonraki Bölüm' })}
            </span>
          </button>
        )}

        {/* Subtitle (CC) quick-toggle — right edge, visible on all content types */}
        <div className="absolute right-0">
          <SubtitleToggleOSDBtn />
        </div>
      </div>

      {/* Live badge */}
      {isLive && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-3 h-7 rounded-full bg-red-500/20 border border-red-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">{t('player.live')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main OSD ─────────────────────────────────────────────────────────────────

interface OSDProps {
  controller: PlayerController;
}

export function OSD({ controller }: OSDProps) {
  const osdVisible = usePlayerStore((s) => s.osdVisible);
  const currentSource = usePlayerStore((s) => s.currentSource);
  const audioWarning = usePlayerStore((s) => s.audioWarning);
  const playerState = usePlayerStore((s) => s.state);
  const time = useClock();

  if (playerState === 'error') return null;

  return (
    <div
      className={[
        'absolute inset-0 pointer-events-none transition-opacity duration-300 flex flex-col justify-between',
        osdVisible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-black/75 to-transparent px-12 pt-8 pb-10">
        <div className="flex items-center justify-between">
          <span className="font-serif text-[22px] font-light tracking-tight text-white drop-shadow">
            {currentSource?.name ?? ''}
          </span>
          <span className="font-serif text-[20px] font-light tabular-nums text-white/70">{time}</span>
        </div>

        {/* Audio warning */}
        {audioWarning && (
          <div className="mt-3 px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg inline-flex">
            <span className="text-[13px] text-yellow-300">{audioWarning}</span>
          </div>
        )}
      </div>

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      <div className={[
        'bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12',
        osdVisible ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}>
        <BottomControls controller={controller} />
      </div>
    </div>
  );
}
