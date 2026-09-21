import { useEffect, useState, useCallback, useRef } from 'react';
import { List } from 'react-window';
import type { ListImperativeAPI } from 'react-window';
import type { CSSProperties, ReactElement } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { usePlaylistStore } from '@/state/playlistStore';
import { useNowNext } from '@/state/epgStore';
import { useChannelLogo } from '@/hooks/useChannelLogo';
import { ChannelRow } from './ChannelRow';
import type { Channel } from '@/types/channel';

const VIRTUALIZATION_THRESHOLD = 100;
const ROW_HEIGHT = 52;
const OVERSCAN_COUNT = 15;

interface Props {
  onSelectChannel: (channelId: string) => void;
  onFocusChannel: (channelId: string) => void;
  onToggleFavorite: (channelId: string) => void;
  focusedChannelId: string | null;
}

// ─── Virtual Channel Row ────────────────────────────────────────────────────
// Presentational component for virtualized mode. No norigin hooks —
// focus state is managed by the parent list via `isFocused` prop.
function VirtualChannelRowInner({
  channel,
  isFocused,
  onSelect,
}: {
  channel: Channel;
  isFocused: boolean;
  onSelect: () => void;
}) {
  const isFavorite = usePlaylistStore(s => s.favoriteIds.includes(channel.id));
  const nowNext = useNowNext(channel.id);
  const { showImg, onError, onLoad } = useChannelLogo(channel.logoUrl);

  return (
    <div
      onClick={onSelect}
      className={[
        'group relative flex items-center gap-4 py-3.5 pl-4 pr-3',
        'rounded-xl cursor-pointer transition-all duration-150',
        isFocused
          ? 'bg-[#E8B567]/[0.08] border border-[#E8B567]/55 text-white scale-[1.015] shadow-[0_0_28px_-8px_#E8B567]'
          : 'border border-transparent border-b-white/[0.05] text-white/85 hover:text-white',
      ].join(' ')}
    >
      <div className="w-9 h-9 rounded-full flex-shrink-0 bg-bg-elevated flex items-center justify-center overflow-hidden">
        {showImg && channel.logoUrl ? (
          <img src={channel.logoUrl} alt="" className="w-full h-full object-contain" onError={onError} onLoad={onLoad} />
        ) : (
          <span className={`text-[13px] font-medium ${isFocused ? 'text-accent' : 'text-white/60'}`}>
            {channel.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[17px] font-medium tracking-tight truncate">{channel.name}</div>
        {nowNext?.current && (
          <div className="font-serif italic text-[13px] text-white/50 truncate mt-0.5">
            {nowNext.current.title}
          </div>
        )}
      </div>
      <div className="shrink-0">
        {isFavorite ? (
          <svg className="w-3.5 h-3.5 text-accent fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ) : (
          <svg
            className={`w-3.5 h-3.5 fill-none stroke-current stroke-2 transition-opacity ${isFocused ? 'opacity-100 text-white/30' : 'opacity-0'}`}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── react-window v2 row component ──────────────────────────────────────────
interface VirtualRowProps {
  channels: Channel[];
  focusedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

function VirtualRow({
  index,
  style,
  channels,
  focusedChannelId,
  onSelectChannel,
}: {
  ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
  index: number;
  style: CSSProperties;
} & VirtualRowProps): ReactElement | null {
  const channel = channels[index];
  if (!channel) return null;
  return (
    <div style={style}>
      <VirtualChannelRowInner
        channel={channel}
        isFocused={channel.id === focusedChannelId}
        onSelect={() => onSelectChannel(channel.id)}
      />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function ChannelListPro({
  onSelectChannel,
  onFocusChannel,
  onToggleFavorite,
  focusedChannelId,
}: Props) {
  const { t } = useTranslation();
  const channels = usePlaylistStore(s => s.visibleChannels);
  const activeCategory = usePlaylistStore(s => s.activeCategory);
  const activeSourceFilter = usePlaylistStore(s => s.activeSourceFilter);
  const allCategories = usePlaylistStore(s => s.categories);
  const hiddenCategories = usePlaylistStore(s => s.hiddenCategories);
  const listRef = useRef<ListImperativeAPI>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Track focused index for imperative D-pad navigation in virtualized mode
  const focusedIndexRef = useRef(0);

  // Human-readable category label for header
  const categoryLabel = activeCategory === '__favorites__'
    ? t('channel_list.favorites')
    : activeCategory === '__recent__'
      ? t('channel_list.recent')
      : activeCategory ?? t('channel_list.all');

  const isVirtualized = channels.length >= VIRTUALIZATION_THRESHOLD;
  const visibleCategories = allCategories.filter((c) => !hiddenCategories.has(c.name));
  const activeCategoryIndex = activeCategory
    ? visibleCategories.findIndex((c) => c.name === activeCategory)
    : -1;
  const sidebarFocusKey = activeCategory === '__favorites__'
    ? 'sidebar-favorites'
    : activeCategory === '__recent__'
      ? 'sidebar-recent'
      : activeCategoryIndex >= 0
        ? `sidebar-cat-${activeCategoryIndex + 1}`
        : activeSourceFilter !== 'all'
          ? `sidebar-source-${activeSourceFilter}`
          : 'sidebar-all';

  const setFocusRef = useRef<((key: string) => void) | null>(null);

  // ─── Virtualized list: single focusable container ─────────────────────────
  // onArrowPress returns false for up/down to prevent norigin default nav;
  // returns true for left/right so norigin handles sidebar ↔ list transition.
  const handleArrowPress = useCallback((direction: string) => {
    if (!isVirtualized) return true; // non-virtualized → let norigin handle

    if (direction === 'down') {
      const nextIdx = Math.min(focusedIndexRef.current + 1, channels.length - 1);
      if (nextIdx !== focusedIndexRef.current) {
        focusedIndexRef.current = nextIdx;
        const ch = channels[nextIdx];
        if (ch) {
          onFocusChannel(ch.id);
          listRef.current?.scrollToRow({ index: nextIdx, align: 'smart' });
        }
      }
      return false; // prevent norigin default
    }

    if (direction === 'up') {
      const nextIdx = Math.max(focusedIndexRef.current - 1, 0);
      if (nextIdx !== focusedIndexRef.current) {
        focusedIndexRef.current = nextIdx;
        const ch = channels[nextIdx];
        if (ch) {
          onFocusChannel(ch.id);
          listRef.current?.scrollToRow({ index: nextIdx, align: 'smart' });
        }
      }
      return false;
    }

    if (direction === 'left') {
      setFocusRef.current?.(sidebarFocusKey);
      return false;
    }

    // right → let norigin handle preview pane navigation
    return true;
  }, [isVirtualized, channels, onFocusChannel, sidebarFocusKey]);

  // Enter press → select channel; long-press Enter → toggle favorite
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);

  const handleEnterPress = useCallback(() => {
    if (!isVirtualized) return;
    wasLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      const ch = channels[focusedIndexRef.current];
      if (ch) onToggleFavorite(ch.id);
    }, 600);
  }, [isVirtualized, channels, onToggleFavorite]);

  const handleEnterRelease = useCallback(() => {
    if (!isVirtualized) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!wasLongPressRef.current) {
      const ch = channels[focusedIndexRef.current];
      if (ch) onSelectChannel(ch.id);
    }
  }, [isVirtualized, channels, onSelectChannel]);

  const { ref: focusRef, focusKey, focused, setFocus } = useFocusable({
    focusKey: 'CHANNEL_LIST_VIRTUAL',
    onArrowPress: handleArrowPress,
    onEnterPress: handleEnterPress,
    onEnterRelease: handleEnterRelease,
    // Up/down are consumed by the virtual list; LEFT is routed explicitly.
    // RIGHT remains available for normal spatial navigation.
    isFocusBoundary: false,
  });
  setFocusRef.current = setFocus;

  // Sync focusedIndex when focusedChannelId changes externally (e.g., initial focus restore)
  useEffect(() => {
    if (!focusedChannelId || !isVirtualized) return;
    const idx = channels.findIndex(c => c.id === focusedChannelId);
    if (idx >= 0) {
      focusedIndexRef.current = idx;
      listRef.current?.scrollToRow({ index: idx, align: 'smart' });
    }
  }, [focusedChannelId, channels, isVirtualized]);

  // When this container gains focus and no channel was explicitly focused yet,
  // focus the first channel or the last-focused one.
  useEffect(() => {
    if (focused && isVirtualized && channels.length > 0) {
      const ch = channels[focusedIndexRef.current];
      if (ch) onFocusChannel(ch.id);
    }
  }, [focused, isVirtualized, channels, onFocusChannel]);

  // Measure container via ResizeObserver
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setContainerHeight(node.getBoundingClientRect().height);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerHeight(entry.contentRect.height);
    });
    observer.observe(node);
  }, []);

  // Combine refs (measuredRef for height + focusRef for norigin)
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    measuredRef(node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (focusRef as any).current = node;
  }, [measuredRef, focusRef]);

  const header = (
    <div className="flex items-baseline justify-between py-3 mb-2 border-b border-border-subtle">
      <span className="font-serif italic text-[22px] font-light text-white">
        {categoryLabel}
      </span>
      <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
        {t('channel_list.channel_count', { count: channels.length })}
      </span>
    </div>
  );

  if (channels.length === 0) {
    return (
      <div className="w-full h-full relative overflow-y-auto pr-1">
        {header}
        <div className="flex items-center justify-center text-white/40 py-12">
          {t('channel_list.empty')}
        </div>
      </div>
    );
  }

  // ─── Non-virtualized path (< 100 channels) ───────────────────────────────
  if (!isVirtualized) {
    return (
      <FocusContext.Provider value={focusKey}>
        <div ref={focusRef as React.RefObject<HTMLDivElement>} className="w-full h-full relative overflow-y-auto pr-1">
          {header}
          {channels.map((channel, index) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              isFirst={index === 0}
              sidebarFocusKey={sidebarFocusKey}
              onSelect={() => onSelectChannel(channel.id)}
              onFocus={() => onFocusChannel(channel.id)}
              onToggleFavorite={() => onToggleFavorite(channel.id)}
            />
          ))}
        </div>
      </FocusContext.Provider>
    );
  }

  // ─── Virtualized path (100+ channels) ─────────────────────────────────────
  const headerHeight = 52;
  const listHeight = Math.max(containerHeight - headerHeight, 200);

  return (
    <div ref={combinedRef} className="w-full h-full relative overflow-hidden pr-1">
      {header}
      <List
        listRef={listRef}
        rowCount={channels.length}
        rowHeight={ROW_HEIGHT}
        overscanCount={OVERSCAN_COUNT}
        rowComponent={VirtualRow}
        rowProps={{
          channels,
          focusedChannelId,
          onSelectChannel,
        }}
        style={{ height: listHeight, width: '100%' }}
      />
    </div>
  );
}
