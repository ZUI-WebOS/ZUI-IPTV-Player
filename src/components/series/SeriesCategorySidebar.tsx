// SeriesCategorySidebar — left column (22% width).
// Structurally identical to MovieCategorySidebar — only the store + special
// labels differ ('İzleme Listesi' instead of 'Favoriler').

import { useRef } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useSeriesStore } from '@/state/seriesStore';
import { useUIStore } from '@/state/uiStore';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import type { SeriesCategory } from '@/types/series';

// ─── Back-to-home pill ──────────────────────────────────────────────────

function BackHomeButton() {
  const { t }    = useTranslation();
  const navigate = useUIStore(s => s.navigate);
  const setFocusRef = useRef<((key: string) => void) | null>(null);

  const { ref, focused, setFocus } = useFocusable({
    focusKey: 'SERIES_BACK_HOME',
    onEnterPress: () => navigate('home'),
    onArrowPress: (direction) => {
      if (direction === 'up') {
        setFocusRef.current?.('topbar-nav-series');
        return false;
      }
      return true;
    },
  });
  setFocusRef.current = setFocus;

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={() => navigate('home')}
      aria-label={t('sidebar.home')}
      className={[
        'group flex items-center gap-3 w-full px-3 h-12 rounded-full transition-all shrink-0',
        focused
          ? 'border border-[#E8B567]/55 bg-[#E8B567]/[0.08] text-[#E8B567] shadow-[0_0_24px_-8px_#E8B567] scale-[1.02]'
          : 'border border-white/[0.08] bg-white/[0.02] text-white/65 hover:text-white hover:border-white/20',
      ].join(' ')}
    >
      <span
        className={[
          'grid place-items-center w-7 h-7 rounded-full border',
          focused ? 'border-[#E8B567]/55' : 'border-white/15',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="w-3.5 h-3.5"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      <span className="font-serif italic text-[15px] font-light tracking-wide flex-1 text-left">
        {t('sidebar.home')}
      </span>
      <span
        className={[
          'text-[10px] uppercase tracking-[0.3em] font-semibold',
          focused ? 'text-[#E8B567]/70' : 'text-white/35',
        ].join(' ')}
      >
        OK
      </span>
    </button>
  );
}

// ─── Category search ────────────────────────────────────────────────────

function CategorySearch() {
  const { t }    = useTranslation();
  const value    = useSeriesStore(s => s.categorySearch);
  const setSearch = useSeriesStore(s => s.setCategorySearch);
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, focused } = useFocusable({
    focusKey: 'SERIES_CATEGORY_SEARCH',
    onEnterPress: () => inputRef.current?.focus(),
  });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={[
        'group flex items-center gap-3 w-full h-11 px-4 rounded-full transition-all shrink-0',
        focused
          ? 'border border-[#E8B567]/55 bg-[#E8B567]/[0.05] shadow-[0_0_20px_-8px_#E8B567]'
          : 'border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        className="w-4 h-4 text-white/45 shrink-0"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('sidebar.search_series')}
        className="flex-1 bg-transparent outline-none border-0 text-[14px] text-white placeholder:font-serif placeholder:italic placeholder:font-light placeholder:text-white/40 placeholder:tracking-wide"
      />
      {value && (
        <button
          onClick={() => { setSearch(''); inputRef.current?.focus(); }}
          className="shrink-0 w-5 h-5 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center transition-colors"
          aria-label="Aramayı temizle"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3 text-white/70">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Single category row ────────────────────────────────────────────────

function CategoryRow({
  category,
  isActive,
  previousFocusKey,
  nextFocusKey,
}: {
  category: SeriesCategory;
  isActive: boolean;
  previousFocusKey: string | null;
  nextFocusKey: string | null;
}) {
  const setActiveCategory = useSeriesStore(s => s.setActiveCategory);
  const setFocusRef = useRef<((key: string) => void) | null>(null);
  const showLabelUpper = category.id !== '__resume__' && category.id !== '__watchlist__';
  const showPulse = category.id === '__resume__' && (category.hasNewEpisodes ?? false);

  const { ref, focused, setFocus } = useFocusableScroll({
    focusKey: `series-cat-${category.id}`,
    onEnterPress: () => setActiveCategory(category.id),
    onArrowPress: (direction) => {
      if (direction === 'up') {
        if (previousFocusKey) setFocusRef.current?.(previousFocusKey);
        return false;
      }
      if (direction === 'down') {
        if (nextFocusKey) setFocusRef.current?.(nextFocusKey);
        return false;
      }
      return true;
    },
    block: 'nearest',
    inline: 'nearest',
  });
  setFocusRef.current = setFocus;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={() => setActiveCategory(category.id)}
      className={[
        'group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-[14px] tracking-wide transition-all',
        // Active (non-focused): white border/bg/text — amber is EXCLUSIVE to focused
        isActive && !focused
          ? 'relative border border-white/[0.20] bg-white/[0.05] text-white font-semibold'
          : focused
            ? 'relative border border-[#E8B567]/55 bg-[#E8B567]/[0.08] text-[#E8B567] shadow-[0_0_20px_-6px_#E8B567] scale-[1.02]'
            : 'border border-transparent text-white/55 hover:text-white/85',
      ].join(' ')}
    >
      {/* Left accent bar */}
      {(isActive || focused) && (
        <span className={[
          'absolute left-0 top-2 bottom-2 w-[2px] rounded-r',
          focused ? 'bg-[#E8B567] shadow-[0_0_12px_#E8B567]' : 'bg-white/40',
        ].join(' ')} />
      )}
      <span
        className={[
          'w-1.5 h-1.5 rounded-full shrink-0',
          showPulse
            ? 'bg-[#E8B567] shadow-[0_0_8px_#E8B567] animate-pulse'
            : isActive ? 'bg-[#E8B567]/70' : 'bg-white/15',
        ].join(' ')}
      />
      <span className={`flex-1 truncate ${showLabelUpper ? 'uppercase tracking-wider text-[12px]' : ''}`}>
        {category.label}
      </span>
      <span
        className={[
          'font-serif text-[13px] font-light tabular-nums shrink-0',
          isActive ? 'text-white/70' : 'text-white/35 group-hover:text-white/55',
        ].join(' ')}
      >
        {category.count}
      </span>
    </div>
  );
}

// ─── Sidebar root ───────────────────────────────────────────────────────

export function SeriesCategorySidebar() {
  const { t }          = useTranslation();
  const categories     = useSeriesStore(s => s.categories);
  const activeCategory = useSeriesStore(s => s.activeCategory);
  const search         = useSeriesStore(s => s.categorySearch);
  const hiddenCategoryIds = useSeriesStore(s => s.hiddenCategoryIds);

  const visible = search
    ? categories.filter(c =>
        c.label.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))
      )
    : categories;

  const specials = visible.filter(c => c.id === '__resume__' || c.id === '__watchlist__');
  // Regular categories minus hidden ones
  const regulars = visible.filter(c =>
    c.id !== '__resume__' && c.id !== '__watchlist__' && !hiddenCategoryIds.includes(c.id)
  );
  const orderedCategories = [...specials, ...regulars];
  const categoryFocusKeys = orderedCategories.map(c => `series-cat-${c.id}`);

  const focusKeysFor = (categoryId: string) => {
    const index = orderedCategories.findIndex(c => c.id === categoryId);
    return {
      previousFocusKey: index > 0
        ? categoryFocusKeys[index - 1]
        : 'SERIES_CATEGORY_SEARCH',
      nextFocusKey: index >= 0 && index < categoryFocusKeys.length - 1
        ? categoryFocusKeys[index + 1]
        : null,
    };
  };

  const { ref, focusKey } = useFocusable({
    focusKey: 'SERIES_SIDEBAR',
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <aside
        ref={ref as React.RefObject<HTMLElement>}
        className="relative flex flex-col gap-3 overflow-hidden"
      >
        <BackHomeButton />
        <CategorySearch />

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {specials.length > 0 && (
            <>
              <div className="px-2 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35">
                {t('sidebar.library')}
              </div>
              {specials.map(c => {
                const focusKeys = focusKeysFor(c.id);
                return (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    isActive={c.id === activeCategory}
                    previousFocusKey={focusKeys.previousFocusKey}
                    nextFocusKey={focusKeys.nextFocusKey}
                  />
                );
              })}
              <hr className="my-3 mx-2 border-white/[0.06]" />
            </>
          )}

          <div className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35">
            {t('sidebar.categories')} · {regulars.length}
          </div>
          {regulars.map(c => {
            const focusKeys = focusKeysFor(c.id);
            return (
              <CategoryRow
                key={c.id}
                category={c}
                isActive={c.id === activeCategory}
                previousFocusKey={focusKeys.previousFocusKey}
                nextFocusKey={focusKeys.nextFocusKey}
              />
            );
          })}

          {visible.length === 0 && (
            <div className="px-3 py-6 text-center text-white/40 font-serif italic text-[14px]">
              {t('sidebar.no_results')}
            </div>
          )}
        </div>
      </aside>
    </FocusContext.Provider>
  );
}
