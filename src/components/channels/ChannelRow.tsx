import { useRef } from 'react';
import { useFocusableScroll } from '@/hooks/useFocusableScroll';
import { useLongPress } from '@/hooks/useLongPress';
import { usePlaylistStore } from '@/state/playlistStore';
import { useNowNext } from '@/state/epgStore';
import { useChannelLogo } from '@/hooks/useChannelLogo';
import type { Channel } from '@/types/channel';

interface Props {
  channel: Channel;
  isFirst: boolean;
  sidebarFocusKey: string;
  onSelect: () => void;
  onFocus: () => void;
  onToggleFavorite: () => void;
}

export function ChannelRow({
  channel,
  isFirst,
  sidebarFocusKey,
  onSelect,
  onFocus,
  onToggleFavorite,
}: Props) {
  const isFavorite = usePlaylistStore(s => s.favoriteIds.includes(channel.id));
  const nowNext = useNowNext(channel.id);
  const { showImg, onError, onLoad } = useChannelLogo(channel.logoUrl);

  const wasLongPressedRef = useRef(false);
  const setFocusRef = useRef<((key: string) => void) | null>(null);

  const { ref, focused, setFocus } = useFocusableScroll({
    focusKey: `channel-${channel.id}`,
    onFocus,
    onArrowPress: (direction) => {
      if (direction === 'left') {
        setFocusRef.current?.(sidebarFocusKey);
        return false;
      }
      if (direction === 'up' && isFirst) {
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
      className={[
        'group relative flex items-center gap-4 py-3.5 pl-4 pr-3',
        'rounded-xl cursor-pointer transition-all duration-150',
        focused
          ? 'bg-[#E8B567]/[0.08] border border-[#E8B567]/55 text-white scale-[1.015] shadow-[0_0_28px_-8px_#E8B567]'
          : 'border border-transparent border-b-white/[0.05] text-white/85 hover:text-white',
      ].join(' ')}
    >

      {/* Round logo avatar */}
      <div className="w-9 h-9 rounded-full flex-shrink-0 bg-bg-elevated flex items-center justify-center overflow-hidden">
        {showImg && channel.logoUrl ? (
          <img
            src={channel.logoUrl}
            alt=""
            className="w-full h-full object-contain"
            onError={onError}
            onLoad={onLoad}
          />
        ) : (
          <span className={`text-[13px] font-medium ${focused ? 'text-accent' : 'text-white/60'}`}>
            {channel.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Channel info */}
      <div className="flex-1 min-w-0">
        <div className="text-[17px] font-medium tracking-tight truncate">
          {channel.name}
        </div>
        {nowNext?.current && (
          // Serif italic "now playing" — Aurora signature
          <div className="font-serif italic text-[13px] text-white/50 truncate mt-0.5">
            {nowNext.current.title}
          </div>
        )}
      </div>

      {/* Favorite star — amber when active */}
      <div className="shrink-0">
        {isFavorite ? (
          <svg className="w-3.5 h-3.5 text-accent fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ) : (
          <svg
            className={`w-3.5 h-3.5 fill-none stroke-current stroke-2 transition-opacity ${focused ? 'opacity-100 text-white/30' : 'opacity-0'}`}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
      </div>
    </div>
  );
}
