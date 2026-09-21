// SeriesCard — non-virtualized card (used when category has < 50 series).
// Mirrors MovieCard but with series-specific badges and meta line.

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { useLongPress } from '@/hooks/useLongPress';
import { useSeriesStore } from '@/state/seriesStore';
import { useSeriesPoster } from '@/hooks/useSeriesPoster';
import type { Series } from '@/types/series';

interface Props {
  series: Series;
  isFirstColumn: boolean;
  sidebarFocusKey: string;
  onSelect: () => void;
  onFocus: () => void;
  onToggleWatchlist: () => void;
}

export function SeriesCard({
  series,
  isFirstColumn,
  sidebarFocusKey,
  onSelect,
  onFocus,
  onToggleWatchlist,
}: Props) {
  const { t } = useTranslation();
  const isInWatchlist = useSeriesStore(s => s.watchlistIds.includes(series.id));
  const progress = useSeriesStore(s => s.watchProgress[series.id] ?? 0);
  const { showImg, onError, onLoad } = useSeriesPoster(series.posterUrl);

  const wasLongPressedRef = useRef(false);
  const setFocusRef = useRef<((key: string) => void) | null>(null);

  const { ref, focused, setFocus } = useFocusableScroll({
    focusKey: `series-${series.id}`,
    onFocus,
    onArrowPress: (direction) => {
      if (direction === 'left' && isFirstColumn) {
        setFocusRef.current?.(sidebarFocusKey);
        return false;
      }
      return true;
    },
    block: 'nearest',
    inline: 'nearest',
  });
  setFocusRef.current = setFocus;

  useLongPress({
    onLongPress: onToggleWatchlist,
    onShortPress: onSelect,
    delayMs: 600,
    enabled: focused,
    triggeredRef: wasLongPressedRef,
  });

  const seasonsText = series.seasons === 1
    ? t('hero.one_season')
    : t('hero.seasons', { count: series.seasons });

  const seasonSummary =
    series.seasons === 1
      ? series.totalEpisodes > 0
        ? t('hero.episodes', { count: series.totalEpisodes })
        : t('hero.one_season')
      : t('hero.seasons', { count: series.seasons });

  const statusLabel =
    series.status === 'final'
      ? `Final · ${seasonsText}`
      : seasonsText;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onSelect}
      className="group flex flex-col gap-2.5 cursor-pointer"
    >
      <div
        className={[
          'relative aspect-[2/3] rounded-2xl overflow-hidden bg-bg-elevated transition-all duration-150',
          focused
            ? 'border border-[#E8B567]/55 scale-[1.04] shadow-[0_30px_60px_-15px_rgba(232,181,103,0.5)]'
            : 'border border-white/[0.06] hover:border-white/15',
        ].join(' ')}
      >
        {showImg && series.posterUrl ? (
          <img
            src={series.posterUrl}
            alt={series.title}
            className="w-full h-full object-cover"
            onError={onError}
            onLoad={onLoad}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(155deg, ${series.gradient?.[0] ?? '#3A3A3A'}, ${series.gradient?.[1] ?? '#1A1A1A'})`,
            }}
          >
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="font-serif italic font-light text-white/[0.10] text-[150px] leading-none">
                {series.title.charAt(0)}
              </span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b0a]/85 via-transparent to-transparent" />

        {/* Top-left badge: new episode > unwatched count > watchlist */}
        {series.isNewEpisode ? (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 h-6 rounded-md bg-[#E8B567] text-[#0e0b0a] text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0e0b0a] animate-pulse" />
            {t('grid.sort_new_episode')}
          </div>
        ) : series.unwatchedCount && series.unwatchedCount > 0 ? (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 h-6 rounded-md bg-black/65 backdrop-blur-sm text-[11px] font-bold text-[#E8B567] tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8B567] shadow-[0_0_6px_#E8B567]" />
            +{series.unwatchedCount}
          </div>
        ) : isInWatchlist ? (
          <div className="absolute top-2.5 left-2.5 w-6 h-6 grid place-items-center rounded-md bg-black/55 backdrop-blur-sm">
            <svg className="w-3.5 h-3.5 text-[#E8B567] fill-current" viewBox="0 0 24 24">
              <path d="M6 4h12v17l-6-4-6 4z" />
            </svg>
          </div>
        ) : null}

        {/* Rating — top right */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 h-6 rounded-md bg-black/55 backdrop-blur-sm text-[11px] font-bold text-[#E8B567] tabular-nums">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {series.rating.toFixed(1)}
        </div>

        {/* Status chip — bottom right */}
        <div
          className={[
            'absolute bottom-2.5 right-2.5 px-2 h-5 grid place-items-center rounded-md bg-black/55 backdrop-blur-sm text-[9px] uppercase tracking-[0.2em] font-semibold',
            series.status === 'final' ? 'text-[#C9A063]/85' : 'text-white/60',
          ].join(' ')}
        >
          {statusLabel}
        </div>

        {/* Play overlay — focused only */}
        <div
          className={[
            'absolute inset-0 grid place-items-center transition-opacity duration-200',
            focused ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          <div className="w-14 h-14 rounded-full bg-[#E8B567]/95 grid place-items-center shadow-[0_0_28px_-4px_#E8B567]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0e0b0a] translate-x-[1px]">
              <path d="M7 4v16l13-8z" />
            </svg>
          </div>
        </div>

        {/* Progress strip */}
        {progress > 0 && (
          <div className="absolute left-3 right-3 bottom-3 h-[3px] rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-[#E8B567] shadow-[0_0_8px_#E8B567]" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <div
          className={[
            'font-serif text-[15px] font-light tracking-tight leading-tight line-clamp-2 min-h-[36px]',
            focused ? 'text-[#E8B567]' : 'text-white',
          ].join(' ')}
        >
          {series.title}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={[
              'text-[12px] tabular-nums',
              series.isNewEpisode ? 'font-bold text-[#E8B567]' : 'font-medium text-white/55',
            ].join(' ')}
          >
            {seasonSummary}
          </span>
          <span className="font-serif italic text-[12px] font-light text-white/45 truncate">
            {series.genre}
          </span>
        </div>
      </div>
    </div>
  );
}
