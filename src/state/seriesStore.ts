// seriesStore — Zustand store for the Series (TV Show) screen.
// Mirrors moviesStore: fetches all series once, filters client-side by category.
// Persists: watchlistIds, currentEpisode, watchProgress, sortBy, activeCategory.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSourceStore } from '@/state/sourceStore';
import { usePlayerStore } from '@/state/playerStore';
import { useUIStore } from '@/state/uiStore';
import { useToast } from '@/components/ui/Toast';
import {
  getSeriesCategories,
  getSeriesStreams,
  getSeriesInfo,
  buildSeriesEpisodeUrl,
} from '@/services/series.service';
import type { Series, SeriesCategory, SeriesSort, CurrentEpisode } from '@/types/series';
import type { XtreamCredentials, XtreamSeriesEpisode, XtreamSeriesInfoResponse } from '@/types/xtream';

// ─── Sort helpers ────────────────────────────────────────────────────────────

const SORT_ORDER: SeriesSort[] = ['newEpisode', 'added', 'rating', 'year', 'title'];

function sortSeries(series: Series[], by: SeriesSort): Series[] {
  const copy = [...series];
  switch (by) {
    case 'newEpisode': return copy.sort((a, b) => (b.isNewEpisode ? 1 : 0) - (a.isNewEpisode ? 1 : 0));
    case 'rating':     return copy.sort((a, b) => b.rating - a.rating);
    case 'year':       return copy.sort((a, b) => b.year - a.year);
    case 'title':      return copy.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    case 'added':
    default:           return copy; // API order = newest first
  }
}

// ─── Client-side category filter ─────────────────────────────────────────────

function computeVisible(
  all: Series[],
  activeCategory: string,
  watchlistIds: string[],
  watchProgress: Record<string, number>
): Series[] {
  if (!activeCategory || activeCategory === '') return all;
  if (activeCategory === '__watchlist__') {
    return all.filter(s => watchlistIds.includes(s.id));
  }
  if (activeCategory === '__resume__') {
    return all.filter(s => {
      const p = watchProgress[s.id] ?? 0;
      return p > 0 && p < 0.99;
    });
  }
  return all.filter(s => s.categoryId === activeCategory);
}

// ─── Helper: get first enabled Xtream source credentials ────────────────────

function getXtreamCreds(): XtreamCredentials | null {
  const sources = useSourceStore.getState().sources;
  const src = sources.find(s => s.enabled && s.type === 'xtream');
  return src ? (src.config as XtreamCredentials) : null;
}

// ─── Build category list with real counts ────────────────────────────────────

function buildCategories(
  rawCats: SeriesCategory[],
  allSeries: Series[],
  watchlistIds: string[],
  watchProgress: Record<string, number>
): SeriesCategory[] {
  const countMap: Record<string, number> = {};
  for (const s of allSeries) {
    if (s.categoryId) countMap[s.categoryId] = (countMap[s.categoryId] ?? 0) + 1;
  }

  const regularCats = rawCats.map(c => ({
    ...c,
    count: countMap[c.id] ?? 0,
  })).filter(c => c.count > 0);

  const specials: SeriesCategory[] = [];
  const resumeCount = Object.values(watchProgress).filter(p => p > 0 && p < 0.99).length;
  if (resumeCount > 0) {
    specials.push({ id: '__resume__', label: 'Devam Et', count: resumeCount });
  }
  if (watchlistIds.length > 0) {
    specials.push({ id: '__watchlist__', label: 'İzleme Listesi', count: watchlistIds.length });
  }

  return [...specials, ...regularCats];
}

// ─── Store type ──────────────────────────────────────────────────────────────

export type SeriesStatus = 'idle' | 'loading' | 'error' | 'ready';

export type EpisodePlaybackContext = {
  seriesId: string;
  seriesTitle: string;
  seasonKey: string;
  episodeId: string;
  episodeNum: number;
};

type EpisodeDirection = 'previous' | 'next';

type SeriesStore = {
  allSeries: Series[];
  visibleSeries: Series[];
  categories: SeriesCategory[];
  activeCategory: string;
  lastFocusedSeriesId: string | null;
  watchlistIds: string[];
  currentEpisode: Record<string, CurrentEpisode>;
  watchProgress: Record<string, number>;
  sortBy: SeriesSort;
  categorySearch: string;
  newThisWeekCount: number;
  status: SeriesStatus;
  error: string | null;

  // Episode browser modal
  detailsSeriesId: string | null;
  detailsInfo: XtreamSeriesInfoResponse | null;
  detailsStatus: 'idle' | 'loading' | 'error' | 'ready';
  detailsError: string | null;
  detailsActiveSeason: number;
  playingEpisode: EpisodePlaybackContext | null;

  hiddenCategoryIds: string[];

  // Actions
  loadSeriesData: () => Promise<void>;
  setActiveCategory: (id: string) => void;
  setLastFocusedSeries: (id: string | null) => void;
  setCategorySearch: (q: string) => void;
  setActiveSeason: (seriesId: string, season: number) => void;
  cycleSort: () => void;
  toggleWatchlist: (id: string) => void;
  setWatchProgress: (id: string, progress: number) => void;
  playSeries: (id: string) => void;
  openSeriesDetails: (id: string) => Promise<void>;
  closeSeriesDetails: () => void;
  setDetailsActiveSeason: (season: number) => void;
  playEpisode: (episode: XtreamSeriesEpisode, seriesTitle: string, seasonKey: string) => void;
  canPlayAdjacentEpisode: (direction: EpisodeDirection) => boolean;
  playAdjacentEpisode: (direction: EpisodeDirection) => boolean;

  toggleHiddenCategory: (id: string) => void;

  // Internal
  _recompute: () => void;
  _updateSpecials: () => void;
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSeriesStore = create<SeriesStore>()(
  persist(
    (set, get) => ({
      allSeries: [],
      visibleSeries: [],
      categories: [],
      activeCategory: '',
      lastFocusedSeriesId: null,
      watchlistIds: [],
      currentEpisode: {},
      watchProgress: {},
      hiddenCategoryIds: [],
      sortBy: 'added',
      categorySearch: '',
      newThisWeekCount: 0,
      status: 'idle',
      error: null,
      detailsSeriesId: null,
      detailsInfo: null,
      detailsStatus: 'idle',
      detailsError: null,
      detailsActiveSeason: 1,
      playingEpisode: null,

      // ── Load series data ────────────────────────────────────────────────

      loadSeriesData: async () => {
        const creds = getXtreamCreds();
        if (!creds) {
          set({ status: 'error', error: 'Xtream kaynağı bulunamadı. Ayarlardan Xtream kaynak ekleyin.' });
          return;
        }

        set({ status: 'loading', error: null });

        try {
          const [rawCategories, allSeries] = await Promise.all([
            getSeriesCategories(creds),
            getSeriesStreams(creds),
          ]);

          const { watchlistIds, watchProgress, sortBy } = get();
          const sorted = sortSeries(allSeries, sortBy);
          const categories = buildCategories(rawCategories, sorted, watchlistIds, watchProgress);
          const newThisWeekCount = sorted.filter(s => s.isNew).length;

          const persisted = get().activeCategory;
          const validCats = categories.map(c => c.id);
          const activeCategory =
            persisted && validCats.includes(persisted)
              ? persisted
              : (categories.find(c => c.id !== '__resume__' && c.id !== '__watchlist__')?.id ?? '');

          const visibleSeries = computeVisible(sorted, activeCategory, watchlistIds, watchProgress);

          set({
            allSeries: sorted,
            visibleSeries,
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

      setLastFocusedSeries: (id) => set({ lastFocusedSeriesId: id }),

      setCategorySearch: (q) => {
        set({ categorySearch: q });
        get()._recompute();
      },

      // ── Season selection (updates activeSeason on the series object) ────

      setActiveSeason: (seriesId, season) => {
        const updated = get().allSeries.map(s =>
          s.id === seriesId ? { ...s, activeSeason: season } : s
        );
        set({ allSeries: updated });
        get()._recompute();
      },

      // ── Sort ────────────────────────────────────────────────────────────

      cycleSort: () => {
        const current = get().sortBy;
        const idx = SORT_ORDER.indexOf(current);
        const next = SORT_ORDER[(idx + 1) % SORT_ORDER.length];
        const sorted = sortSeries(get().allSeries, next);
        set({ sortBy: next, allSeries: sorted });
        get()._recompute();
      },

      // ── Hidden categories ────────────────────────────────────────────────────
      toggleHiddenCategory: (id) => {
        const prev = get().hiddenCategoryIds;
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        set({ hiddenCategoryIds: next });
      },

      // ── Watchlist ───────────────────────────────────────────────────────

      toggleWatchlist: (id) => {
        const prev = get().watchlistIds;
        const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
        set({ watchlistIds: next });
        get()._updateSpecials();
        get()._recompute();
      },

      setWatchProgress: (id, progress) => {
        const next = { ...get().watchProgress, [id]: progress };
        set({ watchProgress: next });
        get()._updateSpecials();
      },

      // ── Playback ────────────────────────────────────────────────────────

      playSeries: (id) => {
        const series = get().allSeries.find(s => s.id === id);
        if (!series) return;

        const creds = getXtreamCreds();
        if (!creds) return;

        set({ lastFocusedSeriesId: id });

        // Fire-and-forget: fetch episode list then navigate to player
        void (async () => {
          try {
            const info = await getSeriesInfo(creds, series.seriesId ?? parseInt(id, 10));
            const seasonKeys = Object.keys(info.episodes ?? {}).sort((a, b) => Number(a) - Number(b));
            const firstSeasonKey = seasonKeys[0];
            if (!firstSeasonKey) {
              useToast.getState().show('Bu dizi için bölüm bulunamadı');
              return;
            }
            const firstEp = info.episodes[firstSeasonKey]?.[0];
            if (!firstEp) {
              useToast.getState().show('Bu dizi için bölüm bulunamadı');
              return;
            }

            set({
              detailsSeriesId: id,
              detailsInfo: info,
              detailsStatus: 'ready',
              detailsError: null,
              detailsActiveSeason: Number(firstSeasonKey),
            });
            get().playEpisode(firstEp, series.title, firstSeasonKey);
          } catch {
            useToast.getState().show('Bölüm yüklenemedi');
          }
        })();
      },

      openSeriesDetails: async (id) => {
        const creds = getXtreamCreds();
        if (!creds) {
          useToast.getState().show('Xtream kaynağı bulunamadı');
          return;
        }
        const series = get().allSeries.find(s => s.id === id);
        const seriesId = series?.seriesId ?? parseInt(id, 10);

        set({ detailsSeriesId: id, detailsStatus: 'loading', detailsError: null, detailsInfo: null });

        try {
          const info = await getSeriesInfo(creds, seriesId);
          const seasonNums = Object.keys(info.episodes).map(Number).sort((a, b) => a - b);
          const firstSeason = seasonNums[0] ?? 1;
          set({ detailsInfo: info, detailsStatus: 'ready', detailsActiveSeason: firstSeason });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Bölüm listesi yüklenemedi';
          set({ detailsStatus: 'error', detailsError: msg });
        }
      },

      closeSeriesDetails: () => {
        set({
          detailsSeriesId: null,
          detailsInfo: null,
          detailsStatus: 'idle',
          detailsError: null,
          playingEpisode: null,
        });
      },

      setDetailsActiveSeason: (season) => {
        set({ detailsActiveSeason: season });
      },

      playEpisode: (episode, seriesTitle, seasonKey) => {
        const creds = getXtreamCreds();
        if (!creds) return;

        const seriesId = get().detailsSeriesId;
        if (!seriesId) return;

        const url = buildSeriesEpisodeUrl(creds, episode.id, episode.container_extension);
        const seasonNum = String(Number(seasonKey)).padStart(2, '0');
        const epNum = String(episode.episode_num).padStart(2, '0');
        const name = `${seriesTitle} · S${seasonNum}·E${epNum}`;

        usePlayerStore.getState().setSource({
          id: `series-ep-${episode.id}`,
          name,
          url,
          sourceType: 'xtream',
        });
        set({
          detailsActiveSeason: Number(seasonKey),
          playingEpisode: {
            seriesId,
            seriesTitle,
            seasonKey,
            episodeId: episode.id,
            episodeNum: episode.episode_num,
          },
        });
        useUIStore.getState().navigate('player');
      },

      canPlayAdjacentEpisode: (direction) => {
        const { detailsInfo, playingEpisode } = get();
        if (!detailsInfo || !playingEpisode) return false;

        const episodes = Object.keys(detailsInfo.episodes)
          .sort((a, b) => Number(a) - Number(b))
          .flatMap(seasonKey =>
            (detailsInfo.episodes[seasonKey] ?? []).map(episode => ({ seasonKey, episode }))
          );
        const index = episodes.findIndex(item => item.episode.id === playingEpisode.episodeId);
        if (index < 0) return false;
        const targetIndex = direction === 'next' ? index + 1 : index - 1;
        return targetIndex >= 0 && targetIndex < episodes.length;
      },

      playAdjacentEpisode: (direction) => {
        const { detailsInfo, playingEpisode } = get();
        if (!detailsInfo || !playingEpisode) return false;

        const episodes = Object.keys(detailsInfo.episodes)
          .sort((a, b) => Number(a) - Number(b))
          .flatMap(seasonKey =>
            (detailsInfo.episodes[seasonKey] ?? []).map(episode => ({ seasonKey, episode }))
          );
        const index = episodes.findIndex(item => item.episode.id === playingEpisode.episodeId);
        if (index < 0) return false;
        const targetIndex = direction === 'next' ? index + 1 : index - 1;
        const target = episodes[targetIndex];
        if (!target) return false;

        get().playEpisode(target.episode, playingEpisode.seriesTitle, target.seasonKey);
        return true;
      },

      // ── Internal ────────────────────────────────────────────────────────

      _recompute: () => {
        const { allSeries, activeCategory, watchlistIds, watchProgress, categorySearch } = get();
        if (categorySearch.trim()) {
          const q = categorySearch.toLocaleLowerCase('tr');
          set({ visibleSeries: allSeries.filter(s => s.title.toLocaleLowerCase('tr').includes(q)) });
        } else {
          set({ visibleSeries: computeVisible(allSeries, activeCategory, watchlistIds, watchProgress) });
        }
      },

      _updateSpecials: () => {
        const { categories, watchlistIds, watchProgress } = get();
        const resumeCount = Object.values(watchProgress).filter(p => p > 0 && p < 0.99).length;
        const regulars = categories.filter(c => c.id !== '__resume__' && c.id !== '__watchlist__');
        const specials: SeriesCategory[] = [];
        if (resumeCount > 0) specials.push({ id: '__resume__', label: 'Devam Et', count: resumeCount });
        if (watchlistIds.length > 0) specials.push({ id: '__watchlist__', label: 'İzleme Listesi', count: watchlistIds.length });
        set({ categories: [...specials, ...regulars] });
      },
    }),

    {
      name: 'zui-series',
      partialize: (s) => ({
        watchlistIds: s.watchlistIds,
        currentEpisode: s.currentEpisode,
        watchProgress: s.watchProgress,
        hiddenCategoryIds: s.hiddenCategoryIds,
        sortBy: s.sortBy,
        activeCategory: s.activeCategory,
      }),
    }
  )
);
