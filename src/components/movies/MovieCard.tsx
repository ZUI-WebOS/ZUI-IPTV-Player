// MovieCard — non-virtualized poster card (used when category has < 50 movies).
// Mirrors ChannelRow.tsx: norigin focusable + long-press for favorite.

import { useRef } from 'react';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { useLongPress } from '@/hooks/useLongPress';
import { useMoviesStore } from '@/state/moviesStore';
import { useMoviePoster } from '@/hooks/useMoviePoster';
import type { Movie } from '@/types/movie';

interface Props {
  movie: Movie;
  isFirstColumn: boolean;
  sidebarFocusKey: string;
  onSelect: () => void;
  onFocus: () => void;
  onToggleFavorite: () => void;
}

export function MovieCard({
  movie,
  isFirstColumn,
  sidebarFocusKey,
  onSelect,
  onFocus,
  onToggleFavorite,
}: Props) {
  const isFavorite = useMoviesStore(s => s.favoriteIds.includes(movie.id));
  const progress = useMoviesStore(s => s.watchProgress[movie.id] ?? 0);
  const { showImg, onError, onLoad } = useMoviePoster(movie.posterUrl);

  const wasLongPressedRef = useRef(false);
  const setFocusRef = useRef<((key: string) => void) | null>(null);

  const { ref, focused, setFocus } = useFocusableScroll({
    focusKey: `movie-${movie.id}`,
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
    onLongPress: onToggleFavorite,
    onShortPress: onSelect,
    delayMs: 600,
    enabled: focused,
    triggeredRef: wasLongPressedRef,
  });

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

        {/* Badges — fav takes priority over "Yeni" */}
        {isFavorite ? (
          <div className="absolute top-2.5 left-2.5 w-6 h-6 grid place-items-center rounded-md bg-black/55 backdrop-blur-sm">
            <svg className="w-3.5 h-3.5 text-[#E8B567] fill-current" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        ) : movie.isNew && !focused && (
          <div className="absolute top-2.5 left-2.5 px-2 h-6 grid place-items-center rounded-md bg-[#E8B567] text-[#0e0b0a] text-[9px] font-bold uppercase tracking-[0.2em]">
            Yeni
          </div>
        )}

        {/* Rating chip */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 h-6 rounded-md bg-black/55 backdrop-blur-sm text-[11px] font-bold text-[#E8B567] tabular-nums">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {movie.rating.toFixed(1)}
        </div>

        {/* Play button — focused only */}
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

        {/* Watch progress */}
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
