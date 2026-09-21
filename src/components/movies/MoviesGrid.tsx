// MoviesGrid — 5-col virtualized poster grid + section header (sort only).
// For < 50 movies: non-virtualized (MovieCard with norigin focus).
// For 50+ movies: react-window Grid with D-pad managed in parent useFocusable.

import { useEffect, useState, useCallback, useRef } from 'react';
import { Grid } from 'react-window';
import type { GridImperativeAPI } from 'react-window';
import type { CSSProperties, ReactElement } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useMoviesStore } from '@/state/moviesStore';
import { useSettingsStore, LANGUAGE_LOCALES } from '@/state/settingsStore';
import { useMoviePoster } from '@/hooks/useMoviePoster';
import { MovieCard } from './MovieCard';
import type { Movie, MovieSort } from '@/types/movie';

const VIRTUALIZATION_THRESHOLD = 50;
const GRID_COLS = 5;
const GAP = 20;
const CARD_ASPECT = 2 / 3;

const SORT_KEYS: Record<MovieSort, string> = {
  added: 'grid.sort_added',
  rating: 'grid.sort_rating',
  year: 'grid.sort_year',
  title: 'grid.sort_title',
};

interface Props {
  focusedMovieId: string | null;
  onFocusMovie: (id: string | null) => void;
}

// ─── Virtual grid cell (presentational — no norigin hooks) ──────────────────

function VirtualMovieCellInner({
  movie,
  isFocused,
  onSelect,
}: {
  movie: Movie;
  isFocused: boolean;
  onSelect: () => void;
}) {
  const isFavorite = useMoviesStore(s => s.favoriteIds.includes(movie.id));
  const progress = useMoviesStore(s => s.watchProgress[movie.id] ?? 0);
  const { showImg, onError, onLoad } = useMoviePoster(movie.posterUrl);

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
        {showImg && movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={onError}
            onLoad={onLoad}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(155deg, ${movie.gradient?.[0] ?? '#3A3A3A'}, ${movie.gradient?.[1] ?? '#1A1A1A'})`,
            }}
          >
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="font-serif italic font-light text-white/[0.10] text-[160px] leading-none">
                {movie.title.charAt(0)}
              </span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b0a]/85 via-transparent to-transparent" />

        {movie.isNew && !isFavorite && !isFocused && (
          <div className="absolute top-2.5 left-2.5 px-2 h-6 grid place-items-center rounded-md bg-[#E8B567] text-[#0e0b0a] text-[9px] font-bold uppercase tracking-[0.2em]">
            Yeni
          </div>
        )}
        {isFavorite && (
          <div className="absolute top-2.5 left-2.5 w-6 h-6 grid place-items-center rounded-md bg-black/55 backdrop-blur-sm">
            <svg className="w-3.5 h-3.5 text-[#E8B567] fill-current" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        )}

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 h-6 rounded-md bg-black/55 backdrop-blur-sm text-[11px] font-bold text-[#E8B567] tabular-nums">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {movie.rating.toFixed(1)}
        </div>

        {isFocused && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-14 h-14 rounded-full bg-[#E8B567]/95 grid place-items-center shadow-[0_0_28px_-4px_#E8B567]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0e0b0a] translate-x-[1px]">
                <path d="M7 4v16l13-8z" />
              </svg>
            </div>
          </div>
        )}

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
          {movie.title}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-medium tabular-nums text-white/55">{movie.year}</span>
          <span className="font-serif italic text-[12px] font-light text-white/45 truncate">
            {movie.genre}
          </span>
        </div>
      </div>
    </div>
  );
}

interface VirtualCellProps {
  movies: Movie[];
  focusedMovieId: string | null;
  onSelectMovie: (id: string) => void;
}

function VirtualCell({
  columnIndex,
  rowIndex,
  style,
  movies,
  focusedMovieId,
  onSelectMovie,
}: {
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
} & VirtualCellProps): ReactElement | null {
  const idx = rowIndex * GRID_COLS + columnIndex;
  const movie = movies[idx];
  if (!movie) return <div style={style} />;

  const adjusted: CSSProperties = {
    ...style,
    paddingLeft: columnIndex === 0 ? 0 : GAP / 2,
    paddingRight: columnIndex === GRID_COLS - 1 ? 0 : GAP / 2,
    paddingBottom: GAP,
  };

  return (
    <div style={adjusted}>
      <VirtualMovieCellInner
        movie={movie}
        isFocused={movie.id === focusedMovieId}
        onSelect={() => onSelectMovie(movie.id)}
      />
    </div>
  );
}

// ─── Section header (category title + sort) ──────────────────────────────────

function SectionHeader() {
  const { t } = useTranslation();
  const language = useSettingsStore(s => s.language);
  const locale = LANGUAGE_LOCALES[language] ?? 'en-US';
  const categorySearch = useMoviesStore(s => s.categorySearch);
  const activeCategoryLabel = useMoviesStore(s =>
    s.categories.find(c => c.id === s.activeCategory)?.label ?? t('grid.all')
  );
  const visibleCount = useMoviesStore(s => s.visibleMovies.length);
  const newThisWeek = useMoviesStore(s => s.newThisWeekCount ?? 0);
  const sortBy = useMoviesStore(s => s.sortBy);
  const cycleSort = useMoviesStore(s => s.cycleSort);
  const isSearchMode = categorySearch.trim().length > 0;

  const { ref, focused } = useFocusable({
    focusKey: 'MOVIES_SORT',
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
            {t('grid.new_count', { count: newThisWeek })}
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

// ─── Main grid ────────────────────────────────────────────────────────────────

export function MoviesGrid({ focusedMovieId, onFocusMovie }: Props) {
  const { t } = useTranslation();
  const movies = useMoviesStore(s => s.visibleMovies);
  const activeCategory = useMoviesStore(s => s.activeCategory);
  const toggleFavorite = useMoviesStore(s => s.toggleFavorite);
  const playMovie = useMoviesStore(s => s.playMovie);
  const sidebarFocusKey = activeCategory
    ? `movie-cat-${activeCategory}`
    : 'MOVIES_CATEGORY_SEARCH';
  const setFocusRef = useRef<((key: string) => void) | null>(null);

  const gridRef = useRef<GridImperativeAPI>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 600 });
  const focusedRowRef = useRef(0);
  const focusedColRef = useRef(0);

  const isVirtualized = movies.length >= VIRTUALIZATION_THRESHOLD;
  const rowCount = Math.ceil(movies.length / GRID_COLS);
  const cellWidth = Math.floor((containerSize.width - GAP * (GRID_COLS - 1)) / GRID_COLS);
  const cellHeight = Math.floor(cellWidth / CARD_ASPECT) + 60; // poster + title + meta

  // ─── D-pad navigation in virtualized mode ──────────────────────────────────

  const handleArrowPress = useCallback((direction: string) => {
    if (!isVirtualized) return true;

    const moveTo = (row: number, col: number) => {
      const idx = row * GRID_COLS + col;
      if (idx >= 0 && idx < movies.length && col >= 0 && col < GRID_COLS) {
        focusedRowRef.current = row;
        focusedColRef.current = col;
        const m = movies[idx];
        if (m) {
          onFocusMovie(m.id);
          gridRef.current?.scrollToCell({ rowIndex: row, columnIndex: col, rowAlign: 'smart' });
        }
        return false; // consumed — don't let norigin move focus
      }
      return true; // out of bounds — let norigin escape to sidebar/hero
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
  }, [isVirtualized, movies, onFocusMovie, sidebarFocusKey]);

  // Long-press fav / short-press play
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);

  const handleEnterPress = useCallback(() => {
    if (!isVirtualized) return;
    wasLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      const idx = focusedRowRef.current * GRID_COLS + focusedColRef.current;
      const m = movies[idx];
      if (m) toggleFavorite(m.id);
    }, 600);
  }, [isVirtualized, movies, toggleFavorite]);

  const handleEnterRelease = useCallback(() => {
    if (!isVirtualized) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!wasLongPressRef.current) {
      const idx = focusedRowRef.current * GRID_COLS + focusedColRef.current;
      const m = movies[idx];
      if (m) playMovie(m.id);
    }
  }, [isVirtualized, movies, playMovie]);

  const { ref: focusRef, focusKey, focused, setFocus } = useFocusable({
    focusKey: 'MOVIES_GRID_VIRTUAL',
    onArrowPress: handleArrowPress,
    onEnterPress: handleEnterPress,
    onEnterRelease: handleEnterRelease,
  });
  setFocusRef.current = setFocus;

  // Sync external focused id (e.g. category change → first cell)
  useEffect(() => {
    if (!focusedMovieId || !isVirtualized) return;
    const idx = movies.findIndex(m => m.id === focusedMovieId);
    if (idx >= 0) {
      focusedRowRef.current = Math.floor(idx / GRID_COLS);
      focusedColRef.current = idx % GRID_COLS;
      gridRef.current?.scrollToCell({
        rowIndex: focusedRowRef.current,
        columnIndex: focusedColRef.current,
        rowAlign: 'smart',
      });
    }
  }, [focusedMovieId, movies, isVirtualized]);

  // On first focus → land on current (row, col)
  useEffect(() => {
    if (focused && isVirtualized && movies.length > 0) {
      const idx = focusedRowRef.current * GRID_COLS + focusedColRef.current;
      const m = movies[Math.min(idx, movies.length - 1)];
      if (m) onFocusMovie(m.id);
    }
  }, [focused, isVirtualized, movies, onFocusMovie]);

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

  // ─── Empty state ────────────────────────────────────────────────────────────

  if (movies.length === 0) {
    return (
      <>
        <SectionHeader />
        <div className="flex-1 grid place-items-center text-white/40 font-serif italic text-[16px]">
          {t('grid.movies_empty')}
        </div>
      </>
    );
  }

  // ─── Non-virtualized path (< 50 movies) ─────────────────────────────────────

  if (!isVirtualized) {
    return (
      <FocusContext.Provider value={focusKey}>
        <SectionHeader />
        <div
          ref={focusRef as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-5 gap-5 flex-1 min-h-0 overflow-y-auto pr-1 pb-2"
        >
          {movies.map((m, index) => (
            <MovieCard
              key={m.id}
              movie={m}
              isFirstColumn={index % GRID_COLS === 0}
              sidebarFocusKey={sidebarFocusKey}
              onSelect={() => playMovie(m.id)}
              onFocus={() => onFocusMovie(m.id)}
              onToggleFavorite={() => toggleFavorite(m.id)}
            />
          ))}
        </div>
      </FocusContext.Provider>
    );
  }

  // ─── Virtualized path (50+ movies) ──────────────────────────────────────────

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
            movies,
            focusedMovieId,
            onSelectMovie: playMovie,
          }}
          style={{ width: containerSize.width, height: containerSize.height }}
        />
      </div>
    </>
  );
}
