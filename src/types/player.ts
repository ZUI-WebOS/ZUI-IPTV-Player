export type StreamSource = {
  id: string;
  name: string;
  url: string;                       // Aktif olarak denenen URL
  streamUrlCandidates?: string[];    // Fallback için kalan adaylar (current url hariç)
  sourceType?: 'm3u' | 'xtream';
  userAgent?: string;
  headers?: Record<string, string>;
  resumeAtSeconds?: number;
  playbackContext?:
    | { kind: 'movie'; contentId: string }
    | {
        kind: 'series';
        seriesId: string;
        seriesTitle: string;
        seasonKey: string;
        episodeId: string;
        episodeNum: number;
      };
};

export type PlayerErrorCode =
  | 'network'
  | 'decode'
  | 'unsupported_codec'
  | 'unsupported_format'
  | 'fatal';

export type PlayerError = {
  code: PlayerErrorCode;
  message: string;
  track?: 'video' | 'audio';
  recoverable: boolean;
};

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/** Tek bir (url × strateji) deneme kaydı — ErrorOverlay'de gösterilir. */
export type PlaybackAttempt = {
  url: string;
  strategy: string;   // 'native' | 'hls' | 'mpegts' | 'none'
  error: string;
};

export type AttachOpts = {
  userAgent?: string;
  headers?: HeadersInit;
};
