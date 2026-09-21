// SeriesGrid — 5-col virtualized grid + section header.
// Mirrors MoviesGrid; key differences: series badges + status chip,
// watchlist instead of favorites on long-press.

import { useEffect, useState, useCallback, useRef } from 'react';
import { Grid } from 'react-window';
import type { GridImperativeAPI } from 'react-window';
import type { CSSProperties, ReactElement } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useSeriesStore } from '@/state/seriesStore';
import { useSettingsStore, LANGUAGE_LOCALES } from '@/state/settingsStore';
import { useSeriesPoster } from '@/hooks/useSeriesPoster';
import { SeriesCard } from './SeriesCard';
import type { Series, SeriesSort } from '@/types/series';

const VIRTUALIZATION_THRESHOLD = 50;
const GRID_COLS = 5;
const GAP = 20;
const CARD_ASPECT = 2 / 3;

const SORT_KEYS: Record<SeriesSort, string> = {
  newEpisode: 'grid.sort_new_episode',
  added: 'grid.sort_added',
  rating: 'grid.sort_rating',
  year: 'grid.sort_year',
  title: 'grid.sort_title',
};

interface Props {
  focusedSeriesId: string | null;
  onFocusSeries: (id: string | null) => void;
}

// ─── Virtual cell inner ─────────────────────────────────────────────────

function VirtualSeriesCellInner({
  series,
  isFocused,
  onSelect,
}: {
  series: Series;
  isFocused: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const isInWatchlist = useSeriesStore(s => s.watchlistIds.includes(series.id));
  const progress = useSeriesStore(s => s.watchProgress[series.id] ?? 0);
  const { showImg, onError, onLoad } = useSeriesPoster(series.posterUrl);

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
    <div onClick={onSelect} className="flex flex-col gap-2.5 cursor-pointer">
      <div
        className={[
          'relative aspect-[2/3] rounded-2xl overflow-hidden bg-bg-elevated transition-all duration-150',
          isFocused
            ? 'border border-[#E8B567]/55 scale-[1.04] shadow-[0_30px_60px_-15px_rgba(232,181,103,0.5)]'
            : 'border border-white/[0.06]',
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
        {isFocused && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-14 h-14 rounded-full bg-[#E8B567]/95 grid place-items-center shadow-[0_0_28px_-4px_#E8B567]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0e0b0a] translate-x-[1px]">
                <path d="M7 4v16l13-8z" />
              </svg>
            </div>
          </div>
        )}

        {/* Progress strip */}
        {progress > 0 && (
          <div className="absolute left-3 right-3 bottom-3 h-[3px] rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-[#E8B567] shadow-[0_0_8px_#E8B567]" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-0.5">
        <div
          className={[
            'font-serif text-[15px] font-light tracking-tight leading-tight line-clamp-2 min-h-[36px]',
            isFocused ? 'text-[#E8B567]' : 'text-white',
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

// ─── Virtual cell wrapper ───────────────────────────────────────────────

interface VirtualCellProps {
  seriesList: Series[];
  focusedSeriesId: string | null;
  onSelectSeries: (id: string) => void;
}

function VirtualCell({
  columnIndex,
  rowIndex,
  style,
  seriesList,
  focusedSeriesId,
  onSelectSeries,
}: {
  // Only 'aria-colindex' + role — matches what react-window Grid actually provides.
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
} & VirtualCellProps): ReactElement | null {
  const idx = rowIndex * GRID_COLS + columnIndex;
  const series = seriesList[idx];
  if (!series) return <div style={style} />;

  const adjusted: CSSProperties = {
    ...style,
    paddingLeft: columnIndex === 0 ? 0 : GAP / 2,
    paddingRight: columnIndex === GRID_COLS - 1 ? 0 : GAP / 2,
    paddingBottom: GAP,
  };

  return (
    <div style={adjusted}>
      <VirtualSeriesCellInner
        series={series}
        isFocused={series.id === focusedSeriesId}
        onSelect={() => onSelectSeries(series.id)}
      />
    </div>
  );
}

// ─── Section header ─────────────────────────────────────────────────────

function SectionHeader() {
  const { t } = useTranslation();
  const language = useSettingsStore(s => s.language);
  const locale = LANGUAGE_LOCALES[language] ?? 'en-US';
  const categorySearch = useSeriesStore(s => s.categorySearch);
  const activeCategoryLabel = useSeriesStore(s =>
    s.categories.find(c => c.id === s.activeCategory)?.label ?? t('grid.all')
  );
  const visibleCount = useSeriesStore(s => s.visibleSeries.length);
  const newThisWeek = useSeriesStore(s => s.newThisWeekCount ?? 0);
  const sortBy = useSeriesStore(s => s.sortBy);
  const cycleSort = useSeriesStore(s => s.cycleSort);
  const isSearchMode = categorySearch.trim().length > 0;

  const { ref, focused } = useFocusable({
    focusKey: 'SERIES_SORT',
    onEnterPress: cycleSort,
  });

  return (
    <div className="flex items-center gap-4 shrink-0">
      <h3 className="font-serif italic text-[24px] font-light text-white shrink-0">
        {isSearchMode ? t('grid.search_results') : activeCategoryLabel}
      </h3>
      <span className="text-[11px] uppercase tracking-[0.3em] text-white/40 font-semibold shrink-0">
        {t('grid.title_count', { count: visibleCount.toLocaleString(locale) })}
      </span>
      {!isSearchMode && newThisWeek > 0 && (
        <>
          <span className="w-px h-6 bg-white/[0.08] shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold shrink-0">
            {t('grid.this_week')}
          </span>
          <span className="font-serif italic text-[14px] font-light text-[#E8B567]/85 shrink-0">
            {t('grid.new_episode_count', { count: newThisWeek })}
          </span>
        </>
      )}

      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        onClick={cycleSort}
        className={[
          'ml-auto flex items-center gap-2 px-3 h-9 rounded-full text-[11px] uppercase tracking-[0.25em] font-semibold transition-all shrink-0',
          focused
            ? 'border border-[#E8B567]/55 text-[#E8B567] bg-[#E8B567]/[0.06] shadow-[0_0_20px_-8px_#E8B567]'
            : 'border border-white/[0.06] text-white/55 hover:text-white',
        ].join(' ')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5">
          <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{t(SORT_KEYS[sortBy])}</span>
      </button>
    </div>
  );
}

// ─── Main grid ───────────────────────────────────────────────────────────

export function SeriesGrid({ focusedSeriesId, onFocusSeries }: Props) {
  const { t } = useTranslation();
  const seriesList = useSeriesStore(s => s.visibleSeries);
  const activeCategory = useSeriesStore(s => s.activeCategory);
  const toggleWatchlist = useSeriesStore(s => s.toggleWatchlist);
  const playSeries = useSeriesStore(s => s.playSeries);
  const sidebarFocusKey = activeCategory
    ? `series-cat-${activeCategory}`
    : 'SERIES_CATEGORY_SEARCH';
  const setFocusRef = useRef<((key: string) => void) | null>(null);

  const gridRef = useRef<GridImperativeAPI>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 600 });
  const focusedRowRef = useRef(0);
  const focusedColRef = useRef(0);

  const isVirtualized = seriesList.length >= VIRTUALIZATION_THRESHOLD;
  const rowCount = Math.ceil(seriesList.length / GRID_COLS);
  const cellWidth = Math.floor((containerSize.width - GAP * (GRID_COLS - 1)) / GRID_COLS);
  const cellHeight = Math.floor(cellWidth / CARD_ASPECT) + 60;

  // ─── D-pad navigation in virtualized mode ────────────────────────────

  const handleArrowPress = useCallback((direction: string) => {
    if (!isVirtualized) return true;

    const moveTo = (row: number, col: number) => {
      const idx = row * GRID_COLS + col;
      if (idx >= 0 && idx < seriesList.length && col >= 0 && col < GRID_COLS) {
        focusedRowRef.current = row;
        focusedColRef.current = col;
        const s = seriesList[idx];
        if (s) {
          onFocusSeries(s.id);
          gridRef.current?.scrollToCell({ rowIndex: row, columnIndex: col, rowAlign: 'smart' });
        }
        return false; // consumed
      }
      return true; // escape to sidebar/hero
    };

    switch (direction) {
      case 'up':    return moveTo(focusedRowRef.current - 1, focusedColRef.current);
      case 'down':  return moveTo(focusedRowRef.current + 1, focusedColRef.current);
      case 'left':
        if (focusedColRef.current === 0) {
          setFocusRef.current?.(sidebarFocusKey);
          return false;
        }
        return moveTo(focusedRowRef.current, focusedColRef.current - 1);
      case 'right': return moveTo(focusedRowRef.current, focusedColRef.current + 1);
      default:      return true;
    }
  }, [isVirtualized, seriesList, onFocusSeries, sidebarFocusKey]);

  // Long-press = toggle watchlist; short-press = play series
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);

  const handleEnterPress = useCallback(() => {
    if (!isVirtualized) return;
    wasLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      const idx = focusedRowRef.current * GRID_COLS + focusedColRef.current;
      const s = seriesList[idx];
      if (s) toggleWatchlist(s.id);
    }, 600);
  }, [isVirtualized, seriesList, toggleWatchlist]);

  const handleEnterRelease = useCallback(() => {
    if (!isVirtualized) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!wasLongPressRef.current) {
      const idx = focusedRowRef.current * GRID_COLS + focusedColRef.current;
      const s = seriesList[idx];
      if (s) playSeries(s.id);
    }
  }, [isVirtualized, seriesList, playSeries]);

  const { ref: focusRef, focusKey, focused, setFocus } = useFocusable({
    focusKey: 'SERIES_GRID_VIRTUAL',
    onArrowPress: handleArrowPress,
    onEnterPress: handleEnterPress,
    onEnterRelease: handleEnterRelease,
  });
  setFocusRef.current = setFocus;

  // Sync external focused id
  useEffect(() => {
    if (!focusedSeriesId || !isVirtualized) return;
    const idx = seriesList.findIndex(s => s.id === focusedSeriesId);
    if (idx >= 0) {
      focusedRowRef.current = Math.floor(idx / GRID_COLS);
      focusedColRef.current = idx % GRID_COLS;
      gridRef.current?.scrollToCell({
        rowIndex: focusedRowRef.current,
        columnIndex: focusedColRef.current,
        rowAlign: 'smart',
      });
    }
  }, [focusedSeriesId, seriesList, isVirtualized]);

  // First-time focus — land on current (row, col)
  useEffect(() => {
    if (focused && isVirtualized && seriesList.length > 0) {
      const idx = focusedRowRef.current * GRID_COLS + focusedColRef.current;
      const s = seriesList[Math.min(idx, seriesList.length - 1)];
      if (s) onFocusSeries(s.id);
    }
  }, [focused, isVirtualized, seriesList, onFocusSeries]);

  // ResizeObserver for grid container
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) setContainerSize({ width: e.contentRect.width, height: e.contentRect.height });
    });
    observer.observe(node);
  }, []);

  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    measuredRef(node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (focusRef as any).current = node;
  }, [measuredRef, focusRef]);

  // ─── Empty state ───────────────────────────────────────────────────────
  if (seriesList.length === 0) {
    return (
      <>
        <SectionHeader />
        <div className="flex-1 grid place-items-center text-white/40 font-serif italic text-[16px]">
          {t('grid.series_empty')}
        </div>
      </>
    );
  }

  // ─── Non-virtualized path (< 50 series) ───────────────────────────────
  if (!isVirtualized) {
    return (
      <FocusContext.Provider value={focusKey}>
        <SectionHeader />
        <div
          ref={focusRef as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-5 gap-5 flex-1 min-h-0 overflow-y-auto pr-1 pb-2"
        >
          {seriesList.map((s, index) => (
            <SeriesCard
              key={s.id}
              series={s}
              isFirstColumn={index % GRID_COLS === 0}
              sidebarFocusKey={sidebarFocusKey}
              onSelect={() => playSeries(s.id)}
              onFocus={() => onFocusSeries(s.id)}
              onToggleWatchlist={() => toggleWatchlist(s.id)}
            />
          ))}
        </div>
      </FocusContext.Provider>
    );
  }

  // ─── Virtualized path (50+ series) ────────────────────────────────────
  return (
    <>
      <SectionHeader />
      <div ref={combinedRef} className="flex-1 min-h-0 overflow-hidden">
        <Grid
          gridRef={gridRef}
          rowCount={rowCount}
          columnCount={GRID_COLS}
          rowHeight={cellHeight}
          columnWidth={cellWidth + (GAP * (GRID_COLS - 1)) / GRID_COLS}
          overscanCount={2}
          cellComponent={VirtualCell}
          cellProps={{
            seriesList,
            focusedSeriesId,
            onSelectSeries: playSeries,
          }}
          style={{ width: containerSize.width, height: containerSize.height }}
        />
      </div>
    </>
  );
}
