import { useRef } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { usePlaylistStore } from '@/state/playlistStore';
import { useSourceStore } from '@/state/sourceStore';
import { useParentalStore } from '@/state/parentalStore';
import { useUIStore } from '@/state/uiStore';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

type ItemProps = {
  focusKey: string;
  label: string;
  count: number;
  isActive: boolean;
  /** Focus key of the item immediately above this one; null → TopBar */
  prevKey: string | null;
  /** Focus key of the item immediately below this one; null → block (last item) */
  nextKey: string | null;
  onFocusFilter: () => void;
  onSelect: () => void;
  onFocusRight: () => void;
  icon?: React.ReactNode;
};

function SidebarItem({
  focusKey: itemFocusKey,
  label,
  count,
  isActive,
  prevKey,
  nextKey,
  onFocusFilter,
  onSelect,
  onFocusRight,
  icon,
}: ItemProps) {
  // Ref-based stale-closure guard for setFocus — same pattern as ChannelCard.
  const setFocusRef = useRef<((key: string) => void) | null>(null);
  // Refs for prevKey / nextKey so the onArrowPress closure always reads current values.
  const prevKeyRef = useRef(prevKey);
  prevKeyRef.current = prevKey;
  const nextKeyRef = useRef(nextKey);
  nextKeyRef.current = nextKey;

  const isProtected = useParentalStore((s) => s.isProtected(label));
  const unlockedThisSession = useParentalStore((s) => s.unlockedThisSession);
  const showLock = isProtected && !unlockedThisSession;

  const { ref, focused, setFocus } = useFocusableScroll({
    focusKey: itemFocusKey,
    onFocus: () => {
      // Safety net: skip filter while channels are not yet loaded from DB.
      // During startup, DB hydration can take >150ms — any sidebar focus before
      // that completes would fire debouncedFilter and overwrite the saved category.
      if (usePlaylistStore.getState().visibleChannels.length === 0) return;
      // D-026: focus = instant filter (debounced to absorb fast D-pad scroll)
      if (!showLock) {
        onFocusFilter();
      }
    },
    onEnterPress: () => {
      if (showLock) {
        usePlaylistStore.getState().setPendingProtectedCategory(label);
        return;
      }
      // Enter: filter already applied — move focus to grid content
      onSelect();
    },
    onArrowPress: (direction) => {
      if (direction === 'up') {
        const prev = prevKeyRef.current;
        if (prev) {
          setFocusRef.current?.(prev);
        } else {
          // İlk item (sidebar-all'un üstü artık sidebar-home-btn, o da kendi UP'ını blokluyor)
          setFocusRef.current?.('topbar-channelList');
        }
        return false;
      }

      if (direction === 'down') {
        const next = nextKeyRef.current;
        if (next) {
          setFocusRef.current?.(next);
        }
        // Son item'da bile false döndür — isFocusBoundary ile birlikte çift güvence
        return false;
      }

      if (direction === 'right') {
        // isFocusBoundary spatial nav'ın grid'e geçmesini engeller;
        // bu explicit route ise Enter-benzeri "RIGHT = liste" UX sağlar.
        onFocusRight();
        return false;
      }

      // left: sol kenar → hareket yok
      return false;
    },
    block: 'nearest',
    inline: 'nearest',
  });

  setFocusRef.current = setFocus;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={() => {
        if (showLock) {
          usePlaylistStore.getState().setPendingProtectedCategory(label);
        } else {
          onSelect();
        }
      }}
      className={[
        'group flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-[15px] tracking-wide',
        isActive
          ? 'border-transparent text-white relative'
          : showLock
            ? [
                'text-[#C9A063]/75 italic',
                focused
                  ? 'text-[#E8B567] bg-[#E8B567]/[0.08] border-[#E8B567]/55 shadow-[0_0_20px_-6px_#E8B567] scale-[1.02]'
                  : 'border-transparent',
              ].join(' ')
            : [
                focused
                  ? 'text-white bg-[#E8B567]/[0.08] border-[#E8B567]/55 shadow-[0_0_20px_-6px_#E8B567] scale-[1.02]'
                  : 'text-white/55 hover:text-white/85 border-transparent',
              ].join(' '),
      ].join(' ')}
    >
      {/* Aurora bullet — amber if active, ghost if not */}
      <span
        className={[
          'w-1.5 h-1.5 rounded-full shrink-0 transition-all',
          isActive ? 'bg-accent shadow-amber-glow' : 'bg-white/15',
        ].join(' ')}
      />

      <span className="flex-1 text-[15px] tracking-wide truncate flex items-center gap-2">
        {showLock && <span className="not-italic">🔒</span>}
        {icon}
        {label}
      </span>

      {/* Serif count — Aurora signature */}
      <span
        className={[
          'font-serif text-[15px] font-light tabular-nums shrink-0',
          isActive ? 'text-accent' : 'text-white/35 group-hover:text-white/55',
        ].join(' ')}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Home Back Button ─────────────────────────────────────────────────────────

function HomeBackButton() {
  const { t } = useTranslation();
  const navigate = useUIStore((s) => s.navigate);
  const setFocusRef = useRef<((key: string) => void) | null>(null);
  const { ref, focused, setFocus } = useFocusable({
    focusKey: 'sidebar-home-btn',
    onEnterPress: () => navigate('home'),
    onArrowPress: (dir) => {
      if (dir === 'up') {
        setFocusRef.current?.('topbar-nav-live');
        return false;
      }
      return true; // diğer yönler spatial nav'a bırak
    },
  });
  setFocusRef.current = setFocus;

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      aria-label={t('channel_list.home')}
      onClick={() => navigate('home')}
      className={[
        'group flex items-center gap-3 w-full px-3 h-12 mb-3 rounded-full border transition-all',
        focused
          ? 'text-[#E8B567] border-[#E8B567]/55 bg-[#E8B567]/[0.08] shadow-[0_0_24px_-8px_#E8B567] scale-[1.02]'
          : 'border-white/[0.08] bg-white/[0.02] text-white/65 hover:text-white hover:border-white/20 hover:bg-white/[0.04]',
      ].join(' ')}
    >
      <span className={[
        'grid place-items-center w-7 h-7 rounded-full border',
        focused ? 'border-[#E8B567]/55' : 'border-white/15 group-hover:border-white/35',
      ].join(' ')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      <span className="font-serif italic text-[15px] font-light tracking-wide flex-1 text-left">
        {t('channel_list.home')}
      </span>
      <span className={[
        'text-[10px] uppercase tracking-[0.3em] font-semibold',
        focused ? 'text-[#E8B567]/70' : 'text-white/35',
      ].join(' ')}>
        OK
      </span>
    </button>
  );
}

export function CategorySidebar() {
  const { t } = useTranslation();
  const allCategories = usePlaylistStore((s) => s.categories);
  const hiddenCategories = usePlaylistStore((s) => s.hiddenCategories);
  const categories = allCategories.filter((c) => !hiddenCategories.has(c.name));
  const activeCategory = usePlaylistStore((s) => s.activeCategory);
  const activeSourceFilter = usePlaylistStore((s) => s.activeSourceFilter);
  const favoriteIds = usePlaylistStore((s) => s.favoriteIds);
  const recentIds = usePlaylistStore((s) => s.recentIds);
  const totalInCategory = usePlaylistStore((s) => s.totalInCategory);
  const setActiveCategory = usePlaylistStore((s) => s.setActiveCategory);
  const setActiveSourceFilter = usePlaylistStore((s) => s.setActiveSourceFilter);

  const sources = useSourceStore((s) => s.sources).filter((s) => s.enabled);
  const hasMultipleSources = sources.length > 1;

  // isFocusBoundary: true — norigin spatial nav'ın sidebar'dan dışarı kaçmasını engeller.
  // Explicit onArrowPress yine de RIGHT/UP-to-TopBar için gerekli,
  // DOWN/UP within sidebar için de ekstra güvence sağlar.
  const { ref: containerRef, focusKey, setFocus } = useFocusable({
    focusKey: 'SIDEBAR',
    isFocusBoundary: true,
  });

  // Single debounce timer shared across all items — 200ms absorbs fast D-pad scroll (D-026)
  const debouncedFilter = useDebouncedCallback((category: string | null) => {
    setActiveCategory(category);
  }, 200);

  const debouncedSourceFilter = useDebouncedCallback((sourceId: string | 'all') => {
    setActiveSourceFilter(sourceId);
  }, 200);

  const focusChannelList = () => {
    const s = usePlaylistStore.getState();
    if (s.visibleChannels.length >= 100) {
      setFocus('CHANNEL_LIST_VIRTUAL');
      return;
    }
    const lastFocused = s.lastFocusedChannelId;
    if (lastFocused && s.visibleChannels.some(c => c.id === lastFocused)) {
      setFocus(`channel-${lastFocused}`);
    } else if (s.visibleChannels.length > 0) {
      setFocus(`channel-${s.visibleChannels[0].id}`);
    }
  };

  // Enter-press: immediate filter + move focus to grid
  const handleCategorySelect = (category: string | null) => {
    setActiveCategory(category);
    setTimeout(focusChannelList, 50); // wait for state/render
  };

  const handleSourceSelect = (sourceId: string | 'all') => {
    setActiveSourceFilter(sourceId);
    setTimeout(focusChannelList, 50);
  };

  // ─── Build ordered focus-key list ─────────────────────────────────────────
  // This mirrors the exact render order below so prevKey/nextKey routing is
  // always correct, even when conditional items (favorites, recent) appear/disappear.
  // Index-tabanlı focusKey'ler: kategori adı boşluk/özel karakter içerebilir,
  // norigin'de key olarak kullanıldığında setFocus sessizce fail eder.
  // sidebar-cat-0, sidebar-cat-1, … formatı güvenli ve tutarlı.
  // sidebar-home-btn listenin tepesinde — özel buton, SidebarItem değil,
  // ama focus navigasyon zincirinde ilk sıra
  const allFocusKeys: string[] = ['sidebar-home-btn', 'sidebar-all'];
  if (favoriteIds.length > 0) allFocusKeys.push('sidebar-favorites');
  if (recentIds.length > 0) allFocusKeys.push('sidebar-recent');
  for (let i = 0; i < categories.length; i++) allFocusKeys.push(`sidebar-cat-${i + 1}`);
  if (hasMultipleSources) {
    allFocusKeys.push('sidebar-source-all');
    for (const src of sources) allFocusKeys.push(`sidebar-source-${src.id}`);
  }

  const prev = (key: string): string | null => {
    const i = allFocusKeys.indexOf(key);
    return i > 0 ? allFocusKeys[i - 1] : null;
  };
  const next = (key: string): string | null => {
    const i = allFocusKeys.indexOf(key);
    return i >= 0 && i < allFocusKeys.length - 1 ? allFocusKeys[i + 1] : null;
  };

  const allCount = totalInCategory;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="w-full h-full flex flex-col gap-0.5 py-2 pr-2 overflow-y-auto"
      >
        {/* Anasayfa geri butonu — listenin tepesinde */}
        <HomeBackButton />

        <SidebarItem
          focusKey="sidebar-all"
          label={t('channel_list.all')}
          count={allCount}
          isActive={activeCategory === null && activeSourceFilter === 'all'}
          prevKey={prev('sidebar-all')}
          nextKey={next('sidebar-all')}
          onFocusFilter={() => {
            debouncedFilter(null);
            debouncedSourceFilter('all');
          }}
          onSelect={() => {
            setActiveSourceFilter('all');
            handleCategorySelect(null);
          }}
          onFocusRight={focusChannelList}
        />

        {favoriteIds.length > 0 && (
          <SidebarItem
            focusKey="sidebar-favorites"
            label={t('channel_list.favorites')}
            count={favoriteIds.length}
            icon={
              <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            }
            isActive={activeCategory === '__favorites__'}
            prevKey={prev('sidebar-favorites')}
            nextKey={next('sidebar-favorites')}
            onFocusFilter={() => debouncedFilter('__favorites__')}
            onSelect={() => handleCategorySelect('__favorites__')}
            onFocusRight={focusChannelList}
          />
        )}

        {recentIds.length > 0 && (
          <SidebarItem
            focusKey="sidebar-recent"
            label={t('channel_list.recent')}
            count={recentIds.length}
            isActive={activeCategory === '__recent__'}
            prevKey={prev('sidebar-recent')}
            nextKey={next('sidebar-recent')}
            onFocusFilter={() => debouncedFilter('__recent__')}
            onSelect={() => handleCategorySelect('__recent__')}
            onFocusRight={focusChannelList}
          />
        )}

        {categories.length > 0 && (
          <div className="my-4 mx-2 border-t border-border-subtle" />
        )}

        {categories.map((cat, i) => (
          <SidebarItem
            key={cat.name}
            focusKey={`sidebar-cat-${i + 1}`}
            label={cat.name}
            count={cat.count}
            isActive={activeCategory === cat.name}
            prevKey={prev(`sidebar-cat-${i + 1}`)}
            nextKey={next(`sidebar-cat-${i + 1}`)}
            onFocusFilter={() => debouncedFilter(cat.name)}
            onSelect={() => handleCategorySelect(cat.name)}
            onFocusRight={focusChannelList}
          />
        ))}

        {/* Source filter section — only show when multiple enabled sources */}
        {hasMultipleSources && (
          <>
            <div className="my-4 mx-2 border-t border-border-subtle" />
            <div className="px-2 pt-4 pb-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35">
              {t('channel_list.source')}
            </div>
            <SidebarItem
              focusKey="sidebar-source-all"
              label={t('channel_list.all')}
              count={0}
              isActive={activeSourceFilter === 'all'}
              prevKey={prev('sidebar-source-all')}
              nextKey={next('sidebar-source-all')}
              onFocusFilter={() => debouncedSourceFilter('all')}
              onSelect={() => handleSourceSelect('all')}
              onFocusRight={focusChannelList}
            />
            {sources.map((src) => (
              <SidebarItem
                key={src.id}
                focusKey={`sidebar-source-${src.id}`}
                label={src.name}
                count={src.channelCount}
                isActive={activeSourceFilter === src.id}
                prevKey={prev(`sidebar-source-${src.id}`)}
                nextKey={next(`sidebar-source-${src.id}`)}
                onFocusFilter={() => debouncedSourceFilter(src.id)}
                onSelect={() => handleSourceSelect(src.id)}
                onFocusRight={focusChannelList}
              />
            ))}
          </>
        )}
      </div>
    </FocusContext.Provider>
  );
}
