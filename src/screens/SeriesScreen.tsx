// SeriesScreen — root layout for the Series screen.
// Mirrors MoviesScreen: always renders FocusContext, lazy-loads data on mount.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useSeriesStore } from '@/state/seriesStore';
import { SeriesCategorySidebar } from '@/components/series/SeriesCategorySidebar';
import { SeriesHero } from '@/components/series/SeriesHero';
import { SeriesGrid } from '@/components/series/SeriesGrid';
import { EpisodeBrowserModal } from '@/components/series/EpisodeBrowserModal';

export function SeriesScreen() {
  const visibleSeries = useSeriesStore(s => s.visibleSeries);
  const activeCategory = useSeriesStore(s => s.activeCategory);
  const status = useSeriesStore(s => s.status);
  const error = useSeriesStore(s => s.error);
  const loadSeriesData = useSeriesStore(s => s.loadSeriesData);
  const detailsSeriesId = useSeriesStore(s => s.detailsSeriesId);
  const closeSeriesDetails = useSeriesStore(s => s.closeSeriesDetails);
  const lastFocusedSeriesId = useSeriesStore(s => s.lastFocusedSeriesId);
  const setLastFocusedSeries = useSeriesStore(s => s.setLastFocusedSeries);

  const { t } = useTranslation();
  const [focusedSeriesId, setFocusedSeriesId] = useState<string | null>(lastFocusedSeriesId);
  const initialFocusDone = useRef(false);

  const handleFocusSeries = useCallback((id: string | null) => {
    setFocusedSeriesId(id);
    setLastFocusedSeries(id);
  }, [setLastFocusedSeries]);

  // Page-level focus context — declared BEFORE any conditional returns
  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'SERIES_PAGE',
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  const handleCloseSeriesDetails = useCallback(() => {
    closeSeriesDetails();
    // The focused modal node unmounts here. Restore focus explicitly to the
    // button that opened it so the TV remote remains inside the Series page.
    setTimeout(() => setFocus('SERIES_HERO_INFO'), 0);
  }, [closeSeriesDetails, setFocus]);

  // Load series data on mount if not already loaded.
  // Also retry if status is 'error' — covers the case where an Xtream source
  // was passive on last visit and the user has since enabled it.
  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      void loadSeriesData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear search when leaving the screen so it doesn't persist stale
  useEffect(() => {
    return () => {
      useSeriesStore.getState().setCategorySearch('');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore the previously focused card after returning from the player.
  useEffect(() => {
    if (status === 'ready' && !initialFocusDone.current) {
      const restoreSeriesId = lastFocusedSeriesId && visibleSeries.some(s => s.id === lastFocusedSeriesId)
        ? lastFocusedSeriesId
        : null;
      const t = setTimeout(() => {
        if (initialFocusDone.current) return;
        initialFocusDone.current = true;
        if (restoreSeriesId) {
          setFocusedSeriesId(restoreSeriesId);
          setFocus(
            visibleSeries.length >= 50
              ? 'SERIES_GRID_VIRTUAL'
              : `series-${restoreSeriesId}`
          );
        } else {
          setFocus('SERIES_BACK_HOME');
        }
      }, 60);
      return () => clearTimeout(t);
    }
  }, [status, setFocus, lastFocusedSeriesId, visibleSeries]);

  // Category change → reset focused series to first visible
  useEffect(() => {
    const savedId = useSeriesStore.getState().lastFocusedSeriesId;
    setFocusedSeriesId(
      savedId && visibleSeries.some(s => s.id === savedId)
        ? savedId
        : (visibleSeries[0]?.id ?? null)
    );
  }, [activeCategory, visibleSeries]);

  const focusedSeries =
    visibleSeries.find(s => s.id === focusedSeriesId) ?? visibleSeries[0] ?? null;

  return (
    <>
    {detailsSeriesId && <EpisodeBrowserModal onClose={handleCloseSeriesDetails} />}
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative flex-1 overflow-hidden h-full"
      >

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {status === 'loading' && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-white/50">
              <svg className="w-8 h-8 animate-spin text-[#E8B567]" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
              </svg>
              <span className="font-serif italic text-[16px]">{t('series.loading')}</span>
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {status === 'error' && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-center max-w-[400px]">
              <svg className="w-12 h-12 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
              <p className="font-serif italic text-[16px] text-white/60">{error ?? t('series.error')}</p>
              <button
                onClick={() => void loadSeriesData()}
                className="mt-2 px-4 h-9 rounded-full border border-[#E8B567]/55 text-[#E8B567] text-[12px] uppercase tracking-[0.25em] font-semibold"
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        )}

        {/* ── Main layout ─────────────────────────────────────────────── */}
        {status === 'ready' && (
          <div className="grid grid-cols-[22%_1fr] gap-6 px-12 py-6 h-full overflow-hidden">
            <SeriesCategorySidebar />

            <main className="flex flex-col gap-5 overflow-hidden min-h-0">
              <SeriesHero series={focusedSeries} />
              <SeriesGrid
                focusedSeriesId={focusedSeriesId}
                onFocusSeries={handleFocusSeries}
              />
            </main>
          </div>
        )}
      </div>
    </FocusContext.Provider>
    </>
  );
}
