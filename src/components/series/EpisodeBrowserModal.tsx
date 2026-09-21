// EpisodeBrowserModal — fullscreen overlay episode browser.
// Left panel: series poster + info + season pills.
// Right panel: scrollable episode list for the active season.
// TV-safe: D-pad navigates pills ↔ episodes; Back key closes.

import { useEffect, useRef } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useSeriesStore } from '@/state/seriesStore';
import type { XtreamSeriesEpisode } from '@/types/xtream';

// ─── Season Tab ────────────────────────────────────────────────────────────────

function SeasonTab({
  seasonNum,
  isActive,
  onSelect,
  previousFocusKey,
  nextFocusKey,
  episodeFocusKey,
}: {
  seasonNum: number;
  isActive: boolean;
  onSelect: () => void;
  previousFocusKey: string | null;
  nextFocusKey: string | null;
  episodeFocusKey: string | null;
}) {
  const setFocusRef = useRef<((key: string) => void) | null>(null);
  const { ref, focused, setFocus } = useFocusable({
    focusKey: `EBM_S${seasonNum}`,
    onEnterPress: onSelect,
    onArrowPress: (direction) => {
      if (direction === 'left') {
        if (previousFocusKey) setFocusRef.current?.(previousFocusKey);
        return false;
      }
      if (direction === 'right') {
        const target = nextFocusKey ?? episodeFocusKey;
        if (target) setFocusRef.current?.(target);
        return false;
      }
      if (direction === 'up') {
        setFocusRef.current?.('EBM_CLOSE');
        return false;
      }
      if (direction === 'down') {
        setFocusRef.current?.('EBM_BACK');
        return false;
      }
      return true;
    },
  });
  setFocusRef.current = setFocus;

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onSelect}
      className={[
        'px-3 h-8 rounded-lg text-[12px] font-bold tabular-nums transition-all shrink-0 border',
        focused
          ? 'border-[#E8B567]/55 bg-[#E8B567]/[0.12] text-[#E8B567] shadow-[0_0_16px_-6px_#E8B567] scale-[1.05]'
          : isActive
            ? 'border-white/35 bg-white/[0.08] text-white'
            : 'border-white/[0.08] text-white/50',
      ].join(' ')}
    >
      S{String(seasonNum).padStart(2, '0')}
    </button>
  );
}

// ─── Episode Row ───────────────────────────────────────────────────────────────

function EpisodeRow({
  episode,
  onPlay,
  previousFocusKey,
  nextFocusKey,
  seasonFocusKey,
}: {
  episode: XtreamSeriesEpisode;
  onPlay: () => void;
  previousFocusKey: string | null;
  nextFocusKey: string | null;
  seasonFocusKey: string;
}) {
  const { t } = useTranslation();
  const setFocusRef = useRef<((key: string) => void) | null>(null);
  const { ref, focused, setFocus } = useFocusable({
    focusKey: `EBM_E${episode.id}`,
    onEnterPress: onPlay,
    onArrowPress: (direction) => {
      if (direction === 'left') {
        setFocusRef.current?.(seasonFocusKey);
        return false;
      }
      if (direction === 'up') {
        setFocusRef.current?.(previousFocusKey ?? 'EBM_CLOSE');
        return false;
      }
      if (direction === 'down') {
        if (nextFocusKey) setFocusRef.current?.(nextFocusKey);
        return false;
      }
      return true;
    },
  });
  setFocusRef.current = setFocus;

  // Scroll into view when focused
  useEffect(() => {
    if (focused && ref.current) {
      (ref.current as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focused, ref]);

  const dur = episode.info?.duration;        // "00:45:00" or "45:00"
  const plot = episode.info?.plot;
  const thumb = episode.info?.movie_image;
  const epNum = episode.episode_num;

  // Strip leading "00:" so "00:45:12" → "45:12"
  const durationLabel = dur ? dur.replace(/^00:/, '') : null;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onPlay}
      className={[
        'flex items-start gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer',
        focused
          ? 'bg-[#E8B567]/[0.08] border border-[#E8B567]/30 shadow-[0_0_20px_-8px_#E8B567]'
          : 'border border-transparent',
      ].join(' ')}
    >
      {/* Episode number badge */}
      <div className={[
        'shrink-0 w-10 h-10 rounded-lg grid place-items-center text-[13px] font-bold tabular-nums border transition-all',
        focused
          ? 'border-[#E8B567]/50 bg-[#E8B567]/[0.15] text-[#E8B567]'
          : 'border-white/[0.08] bg-white/[0.03] text-white/40',
      ].join(' ')}>
        {String(epNum).padStart(2, '0')}
      </div>

      {/* Thumbnail */}
      {thumb ? (
        <div className="shrink-0 w-[88px] h-[50px] rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]">
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        </div>
      ) : null}

      {/* Title + synopsis */}
      <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
        <div className={[
          'text-[14px] font-medium leading-tight truncate transition-colors',
          focused ? 'text-[#E8B567]' : 'text-white/90',
        ].join(' ')}>
          {episode.title || t('episode_browser.episode_fallback', { num: epNum })}
        </div>
        {plot && (
          <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2">{plot}</p>
        )}
      </div>

      {/* Duration + play icon */}
      <div className="shrink-0 flex flex-col items-end justify-center gap-1.5 min-w-[52px]">
        {durationLabel && (
          <span className="text-[11px] tabular-nums text-white/35">{durationLabel}</span>
        )}
        {focused && (
          <div className="w-8 h-8 rounded-full bg-[#E8B567] grid place-items-center shadow-[0_0_16px_-4px_#E8B567]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#0e0b0a] translate-x-[1px]">
              <path d="M7 4v16l13-8z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function CloseButton({ onClose, downFocusKey }: { onClose: () => void; downFocusKey: string }) {
  const setFocusRef = useRef<((key: string) => void) | null>(null);
  const { ref, focused, setFocus } = useFocusable({
    focusKey: 'EBM_CLOSE',
    onEnterPress: onClose,
    onArrowPress: (direction) => {
      if (direction === 'down') {
        setFocusRef.current?.(downFocusKey);
        return false;
      }
      return true;
    },
  });
  setFocusRef.current = setFocus;

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onClose}
      className={[
        'absolute top-6 right-8 z-10 w-9 h-9 rounded-full border bg-[#131110] grid place-items-center transition-all',
        focused
          ? 'border-[#E8B567]/60 text-[#E8B567] shadow-[0_0_20px_-6px_#E8B567] scale-[1.08]'
          : 'border-white/[0.10] text-white/40 hover:text-white/70 hover:border-white/25',
      ].join(' ')}
      aria-label="Kapat"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function BackButton({ onClose, upFocusKey, rightFocusKey }: {
  onClose: () => void;
  upFocusKey: string;
  rightFocusKey: string;
}) {
  const { t } = useTranslation();
  const setFocusRef = useRef<((key: string) => void) | null>(null);
  const { ref, focused, setFocus } = useFocusable({
    focusKey: 'EBM_BACK',
    onEnterPress: onClose,
    onArrowPress: (direction) => {
      if (direction === 'up') {
        setFocusRef.current?.(upFocusKey);
        return false;
      }
      if (direction === 'right') {
        setFocusRef.current?.(rightFocusKey);
        return false;
      }
      return true;
    },
  });
  setFocusRef.current = setFocus;

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onClose}
      className={[
        'mt-auto px-3 h-9 rounded-lg border text-[10px] uppercase tracking-[0.3em] font-semibold text-left transition-all',
        focused
          ? 'border-[#E8B567]/55 bg-[#E8B567]/[0.08] text-[#E8B567] shadow-[0_0_18px_-7px_#E8B567]'
          : 'border-transparent text-white/25',
      ].join(' ')}
    >
      {t('episode_browser.back_hint')}
    </button>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export function EpisodeBrowserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const series = useSeriesStore(s =>
    s.detailsSeriesId
      ? (s.allSeries.find(x => x.id === s.detailsSeriesId) ?? null)
      : null
  );
  const info              = useSeriesStore(s => s.detailsInfo);
  const status            = useSeriesStore(s => s.detailsStatus);
  const error             = useSeriesStore(s => s.detailsError);
  const activeSeason      = useSeriesStore(s => s.detailsActiveSeason);
  const setDetailsActiveSeason  = useSeriesStore(s => s.setDetailsActiveSeason);
  const playEpisode             = useSeriesStore(s => s.playEpisode);
  const openSeriesDetails       = useSeriesStore(s => s.openSeriesDetails);
  const playingEpisode          = useSeriesStore(s => s.playingEpisode);

  // Back / Backspace key → close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'GoBack' || e.keyCode === 461) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'EBM_ROOT',
    isFocusBoundary: true,
    trackChildren: true,
    saveLastFocusedChild: true,
    autoRestoreFocus: false,
  });

  const { ref: seasonRailRef, focusKey: seasonRailFocusKey } = useFocusable({
    focusKey: 'EBM_SEASON_RAIL',
    trackChildren: true,
  });

  const seasonEpisodes = info?.episodes[String(activeSeason)] ?? [];
  const seasonNums = info
    ? Object.keys(info.episodes).map(Number).sort((a, b) => a - b)
    : [];
  const firstEpisodeFocusKey = seasonEpisodes[0] ? `EBM_E${seasonEpisodes[0].id}` : 'EBM_CLOSE';
  const activeSeasonFocusKey = `EBM_S${activeSeason}`;
  const seasonEntryFocusKey = seasonNums.length > 1 ? activeSeasonFocusKey : 'EBM_BACK';

  // Auto-focus the current episode after the player unmounts. Norigin may run
  // a root-level debounced restore ~300 ms after the old player tree is gone;
  // focusing after that prevents the stale restore from stealing modal focus.
  useEffect(() => {
    if (status === 'ready' && seasonEpisodes.length > 0) {
      const targetEpisode = playingEpisode?.seasonKey === String(activeSeason)
        ? seasonEpisodes.find(ep => ep.id === playingEpisode.episodeId) ?? seasonEpisodes[0]
        : seasonEpisodes[0];
      if (targetEpisode) {
        const timer = setTimeout(() => setFocus(`EBM_E${targetEpisode.id}`), 380);
        return () => clearTimeout(timer);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeSeason]);

  if (!series) return null;

  const c1 = series.gradient?.[0] ?? '#3A3A3A';
  const c2 = series.gradient?.[1] ?? '#1A1A1A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0e0b0a]/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <FocusContext.Provider value={focusKey}>
        <CloseButton onClose={onClose} downFocusKey={firstEpisodeFocusKey} />
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="relative w-[1120px] h-[660px] rounded-[28px] overflow-hidden border border-white/[0.08] flex"
          style={{ background: `linear-gradient(145deg, ${c1}18 0%, #131110 35%)` }}
        >
          {/* ── Left panel: series art + info + season pills ── */}
          <div className="w-[280px] shrink-0 flex flex-col gap-5 px-6 py-6 border-r border-white/[0.06] overflow-y-auto">

            {/* Poster */}
            <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] shrink-0">
              {series.posterUrl ? (
                <img src={series.posterUrl} alt={series.title} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="absolute inset-0 grid place-items-center"
                  style={{ background: `linear-gradient(155deg, ${c1}, ${c2})` }}
                >
                  <span className="font-serif italic text-[80px] text-white/10 leading-none">
                    {series.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div className="flex flex-col gap-1.5">
              <h2 className="font-serif text-[18px] font-light text-white leading-tight line-clamp-3">
                {series.title}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-white/45 flex-wrap">
                <span className="text-[#E8B567] font-bold">★ {series.rating.toFixed(1)}</span>
                {series.year > 0 && <><span>·</span><span>{series.year}</span></>}
                {series.genre && <><span>·</span><span className="truncate">{series.genre}</span></>}
              </div>
              {series.synopsis && (
                <p className="text-[11px] text-white/30 leading-relaxed line-clamp-3 mt-1">
                  {series.synopsis}
                </p>
              )}
            </div>

            {/* Season rail */}
            {seasonNums.length > 1 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] uppercase tracking-[0.35em] text-white/30 font-semibold">
                  {t('episode_browser.season_label')}
                </span>
                <FocusContext.Provider value={seasonRailFocusKey}>
                  <div ref={seasonRailRef as React.RefObject<HTMLDivElement>} className="flex flex-wrap gap-2">
                    {seasonNums.map((s, index) => (
                      <SeasonTab
                        key={s}
                        seasonNum={s}
                        isActive={s === activeSeason}
                        onSelect={() => setDetailsActiveSeason(s)}
                        previousFocusKey={index > 0 ? `EBM_S${seasonNums[index - 1]}` : null}
                        nextFocusKey={index < seasonNums.length - 1 ? `EBM_S${seasonNums[index + 1]}` : null}
                        episodeFocusKey={firstEpisodeFocusKey}
                      />
                    ))}
                  </div>
                </FocusContext.Provider>
              </div>
            )}

            <BackButton
              onClose={onClose}
              upFocusKey={seasonNums.length > 1 ? activeSeasonFocusKey : 'EBM_CLOSE'}
              rightFocusKey={firstEpisodeFocusKey}
            />
          </div>

          {/* ── Right panel: episode list ── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* Panel header */}
            <div className="px-6 py-5 border-b border-white/[0.06] shrink-0 flex items-baseline gap-3">
              <h3 className="font-serif text-[22px] font-light text-white leading-none">
                {seasonNums.length === 1
                  ? t('episode_browser.episodes')
                  : t('episode_browser.season', { num: String(activeSeason).padStart(2, '0') })}
              </h3>
              {status === 'ready' && (
                <span className="text-[13px] text-white/30">
                  {t('episode_browser.count', { count: seasonEpisodes.length })}
                </span>
              )}
            </div>

            {/* Loading */}
            {status === 'loading' && (
              <div className="flex-1 grid place-items-center">
                <div className="flex flex-col items-center gap-3 text-white/40">
                  <svg className="w-7 h-7 animate-spin text-[#E8B567]" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"
                      strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                  <span className="font-serif italic text-[14px]">{t('episode_browser.loading')}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="flex-1 grid place-items-center">
                <div className="flex flex-col items-center gap-3 text-center max-w-[300px]">
                  <svg className="w-10 h-10 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </svg>
                  <p className="font-serif italic text-[14px] text-white/50">{error ?? t('episode_browser.error')}</p>
                  <button
                    onClick={() => void openSeriesDetails(series.id)}
                    className="px-4 h-9 rounded-full border border-[#E8B567]/55 text-[#E8B567] text-[11px] uppercase tracking-[0.25em] font-semibold"
                  >
                    {t('episode_browser.retry')}
                  </button>
                </div>
              </div>
            )}

            {/* Empty */}
            {status === 'ready' && seasonEpisodes.length === 0 && (
              <div className="flex-1 grid place-items-center">
                <p className="font-serif italic text-[15px] text-white/35">
                  {t('episode_browser.empty')}
                </p>
              </div>
            )}

            {/* Episode list */}
            {status === 'ready' && seasonEpisodes.length > 0 && (
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {seasonEpisodes.map((ep, index) => (
                  <EpisodeRow
                    key={ep.id}
                    episode={ep}
                    onPlay={() => playEpisode(ep, series.title, String(activeSeason))}
                    previousFocusKey={index > 0 ? `EBM_E${seasonEpisodes[index - 1].id}` : null}
                    nextFocusKey={index < seasonEpisodes.length - 1 ? `EBM_E${seasonEpisodes[index + 1].id}` : null}
                    seasonFocusKey={seasonEntryFocusKey}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}
