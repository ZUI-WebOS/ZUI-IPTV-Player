// moviesStore — Zustand store for the Movies (VOD) screen.
// Fetches all VOD streams once; filters client-side by category.
// Persists: favoriteIds, watchProgress, sortBy, activeCategory.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSourceStore } from '@/state/sourceStore';
import { usePlayerStore } from '@/state/playerStore';
import { useUIStore } from '@/state/uiStore';
import { getVodCategories, getVodStreams, buildVodUrl } from '@/services/vod.service';
import type { Movie, MovieCategory, MovieSort } from '@/types/movie';
import type { XtreamCredentials } from '@/types/xtream';

// ─── Sort helpers ────────────────────────────────────────────────────────────

const SORT_ORDER: MovieSort[] = ['added', 'rating', 'year', 'title'];

function sortMovies(movies: Movie[], by: MovieSort): Movie[] {
  const copy = [...movies];
  switch (by) {
    case 'rating': return copy.sort((a, b) => b.rating - a.rating);
    case 'year':   return copy.sort((a, b) => b.year - a.year);
    case 'title':  return copy.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    case 'added':
    default:       return copy; // API order = newest first
  }
}

// ─── Client-side category filter ─────────────────────────────────────────────

function computeVisible(
  all: Movie[],
  activeCategory: string,
  favoriteIds: string[],
  watchProgress: Record<string, number>
): Movie[] {
  if (!activeCategory || activeCategory === '') return all;
  if (activeCategory === '__favorites__') {
    return all.filter(m => favoriteIds.includes(m.id));
  }
  if (activeCategory === '__resume__') {
    return all.filter(m => {
      const p = watchProgress[m.id] ?? 0;
      return p > 0 && p < 0.99;
    });
  }
  // Regular Xtream category — filter by categoryId stored on each Movie
  return all.filter(m => m.categoryId === activeCategory);
}

// ─── Helper: get first enabled Xtream source credentials ────────────────────

function getXtreamCreds(): XtreamCredentials | null {
  const sources = useSourceStore.getState().sources;
  const src = sources.find(s => s.enabled && s.type === 'xtream');
  return src ? (src.config as XtreamCredentials) : null;
}

// ─── Build category list with real counts ────────────────────────────────────

function buildCategories(
  rawCats: MovieCategory[],
  allMovies: Movie[],
  favoriteIds: string[],
  watchProgress: Record<string, number>
): MovieCategory[] {
  // Count movies per category
  const countMap: Record<string, number> = {};
  for (const m of allMovies) {
    if (m.categoryId) countMap[m.categoryId] = (countMap[m.categoryId] ?? 0) + 1;
  }

  const regularCats = rawCats.map(c => ({
    ...c,
    count: countMap[c.id] ?? 0,
  })).filter(c => c.count > 0); // hide empty categories

  // Pinned specials
  const specials: MovieCategory[] = [];
  const resumeCount = Object.values(watchProgress).filter(p => p > 0 && p < 0.99).length;
  if (resumeCount > 0) {
    specials.push({ id: '__resume__', label: 'Devam Et', count: resumeCount });
  }
  if (favoriteIds.length > 0) {
    specials.push({ id: '__favorites__', label: 'Favoriler', count: favoriteIds.length });
  }

  return [...specials, ...regularCats];
}

// ─── Store type ──────────────────────────────────────────────────────────────

export type VodStatus = 'idle' | 'loading' | 'error' | 'ready';

type MoviesStore = {
  allMovies: Movie[];
  visibleMovies: Movie[];
  categories: MovieCategory[];
  activeCategory: string;
  lastFocusedMovieId: string | null;
  favoriteIds: string[];
  watchProgress: Record<string, number>;   // 0–1
  sortBy: MovieSort;
  categorySearch: string;
  newThisWeekCount: number;
  status: VodStatus;
  error: string | null;

  hiddenCategoryIds: string[];

  // Actions
  loadVodData: () => Promise<void>;
  setActiveCategory: (id: string) => void;
  setLastFocusedMovie: (id: string | null) => void;
  setCategorySearch: (q: string) => void;
  cycleSort: () => void;
  toggleFavorite: (id: string) => void;
  setWatchProgress: (id: string, progress: number) => void;
  toggleHiddenCategory: (id: string) => void;
  playMovie: (id: string) => void;
  openMovieDetails: (id: string) => void;

  // Internal
  _recompute: () => void;
  _updateSpecials: () => void;
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useMoviesStore = create<MoviesStore>()(
  persist(
    (set, get) => ({
      allMovies: [],
      visibleMovies: [],
      categories: [],
      activeCategory: '',
      lastFocusedMovieId: null,
      favoriteIds: [],
      watchProgress: {},
      hiddenCategoryIds: [],
      sortBy: 'added',
      categorySearch: '',
      newThisWeekCount: 0,
      status: 'idle',
      error: null,

      // ── Load VOD data ───────────────────────────────────────────────────

      loadVodData: async () => {
        const creds = getXtreamCreds();
        if (!creds) {
          set({ status: 'error', error: 'Xtream kaynağı bulunamadı. Ayarlardan Xtream kaynak ekleyin.' });
          return;
        }

        set({ status: 'loading', error: null });

        try {
          const [rawCategories, allMovies] = await Promise.all([
            getVodCategories(creds),
            getVodStreams(creds),
          ]);

          const { favoriteIds, watchProgress, sortBy } = get();
          const sorted = sortMovies(allMovies, sortBy);
          const categories = buildCategories(rawCategories, sorted, favoriteIds, watchProgress);
          const newThisWeekCount = sorted.filter(m => m.isNew).length;

          // Keep persisted activeCategory if it still exists; else use first category
          const persisted = get().activeCategory;
          const validCats = categories.map(c => c.id);
          const activeCategory =
            persisted && validCats.includes(persisted)
              ? persisted
              : (categories.find(c => c.id !== '__resume__' && c.id !== '__favorites__')?.id ?? '');

          const visibleMovies = computeVisible(sorted, activeCategory, favoriteIds, watchProgress);

          set({
            allMovies: sorted,
            visibleMovies,
            categories,
            activeCategory,
            newThisWeekCount,
            status: 'ready',
            error: null,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Veri yüklenemedi';
          set({ status: 'error', error: msg });
        }
      },

      // ── Category ────────────────────────────────────────────────────────

      setActiveCategory: (id) => {
        set({ activeCategory: id });
        get()._recompute();
      },

      setLastFocusedMovie: (id) => set({ lastFocusedMovieId: id }),

      setCategorySearch: (q) => {
        set({ categorySearch: q });
        get()._recompute();
      },

      // ── Sort ────────────────────────────────────────────────────────────

      cycleSort: () => {
        const current = get().sortBy;
        const idx = SORT_ORDER.indexOf(current);
        const next = SORT_ORDER[(idx + 1) % SORT_ORDER.length];
        const sorted = sortMovies(get().allMovies, next);
        set({ sortBy: next, allMovies: sorted });
        get()._recompute();
      },

      // ── Hidden categories ────────────────────────────────────────────────────
      toggleHiddenCategory: (id) => {
        const prev = get().hiddenCategoryIds;
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        set({ hiddenCategoryIds: next });
      },

      // ── Favorites ───────────────────────────────────────────────────────

      toggleFavorite: (id) => {
        const prev = get().favoriteIds;
        const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
        set({ favoriteIds: next });
        get()._updateSpecials();
        get()._recompute();
      },

      setWatchProgress: (id, progress) => {
        const next = { ...get().watchProgress, [id]: progress };
        set({ watchProgress: next });
        get()._updateSpecials();
      },

      // ── Playback ────────────────────────────────────────────────────────

      playMovie: (id) => {
        const movie = get().allMovies.find(m => m.id === id);
        if (!movie) return;

        const creds = getXtreamCreds();
        if (!creds) return;

        const streamId = movie.streamId ?? parseInt(id, 10);
        const ext      = movie.containerExtension ?? 'mp4';
        const url      = buildVodUrl(creds, streamId, ext);

        // Fallback candidate list:
        // 1. Native format (mp4/mkv/…) → NativeStrategy
        // 2. HLS variant (.m3u8)  → NativeStrategy (Safari/webOS) + HLSStrategy (hls.js)
        //    Many Xtream providers expose /movie/…/id.m3u8 as an HLS wrapper.
        //    This helps when the native codec (e.g. H.265 in MKV) is unsupported.
        const hlsUrl = buildVodUrl(creds, streamId, 'm3u8');
        const candidates = ext !== 'm3u8' ? [hlsUrl] : [];

        set({ lastFocusedMovieId: id });

        usePlayerStore.getState().setSource({
          id: `vod-${id}`,
          name: movie.title,
          url,
          streamUrlCandidates: candidates,
          sourceType: 'xtream',
        });
        useUIStore.getState().navigate('player');
      },

      openMovieDetails: (id) => {
        // v1: no detail overlay — play directly
        get().playMovie(id);
      },

      // ── Internal ────────────────────────────────────────────────────────

      _recompute: () => {
        const { allMovies, activeCategory, favoriteIds, watchProgress, categorySearch } = get();
        if (categorySearch.trim()) {
          // Search mode: override category filter, show all movies matching title
          const q = categorySearch.toLocaleLowerCase('tr');
          set({ visibleMovies: allMovies.filter(m => m.title.toLocaleLowerCase('tr').includes(q)) });
        } else {
          set({ visibleMovies: computeVisible(allMovies, activeCategory, favoriteIds, watchProgress) });
        }
      },

      _updateSpecials: () => {
        const { categories, favoriteIds, watchProgress } = get();
        const resumeCount = Object.values(watchProgress).filter(p => p > 0 && p < 0.99).length;
        const regulars = categories.filter(c => c.id !== '__resume__' && c.id !== '__favorites__');
        const specials: MovieCategory[] = [];
        if (resumeCount > 0) specials.push({ id: '__resume__', label: 'Devam Et', count: resumeCount });
        if (favoriteIds.length > 0) specials.push({ id: '__favorites__', label: 'Favoriler', count: favoriteIds.length });
        set({ categories: [...specials, ...regulars] });
      },
    }),

    {
      name: 'zui-movies',
      partialize: (s) => ({
        favoriteIds: s.favoriteIds,
        watchProgress: s.watchProgress,
        hiddenCategoryIds: s.hiddenCategoryIds,
        sortBy: s.sortBy,
        activeCategory: s.activeCategory,
      }),
    }
  )
);
