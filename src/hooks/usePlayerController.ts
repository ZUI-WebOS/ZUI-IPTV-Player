import { useCallback, useEffect, useState } from 'react';

export interface PlayerSnapshot {
  currentTime: number;
  duration: number;
  paused: boolean;
  seeking: boolean;
  isLive: boolean;
  canSeek: boolean;
}

export interface PlayerController extends PlayerSnapshot {
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seekBy: (seconds: number) => boolean;
  seekToRatio: (ratio: number) => boolean;
}

const INITIAL_SNAPSHOT: PlayerSnapshot = {
  currentTime: 0,
  duration: 0,
  paused: true,
  seeking: false,
  isLive: true,
  canSeek: false,
};

function getSeekRanges(video: HTMLVideoElement): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (let index = 0; index < video.seekable.length; index += 1) {
    const start = video.seekable.start(index);
    const end = video.seekable.end(index);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      ranges.push([start, end]);
    }
  }
  return ranges;
}

function closestSeekableTime(ranges: Array<[number, number]>, requested: number): number | null {
  if (!Number.isFinite(requested) || ranges.length === 0) return null;

  let closest: number | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const [start, end] of ranges) {
    const candidate = Math.max(start, Math.min(end, requested));
    const distance = Math.abs(candidate - requested);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest;
}

function readSnapshot(video: HTMLVideoElement): PlayerSnapshot {
  const finiteDuration = Number.isFinite(video.duration) && video.duration > 0;
  const ranges = getSeekRanges(video);
  return {
    currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    duration: finiteDuration ? video.duration : 0,
    paused: video.paused,
    seeking: video.seeking,
    isLive: !finiteDuration,
    canSeek: finiteDuration && ranges.length > 0,
  };
}

/**
 * Owns all HTMLMediaElement control commands and state observation.
 * Playback strategies still attach the source; this hook only controls the
 * already-attached media element.
 */
export function usePlayerController(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  sourceId?: string,
): PlayerController {
  const [snapshot, setSnapshot] = useState<PlayerSnapshot>(INITIAL_SNAPSHOT);

  const sync = useCallback(() => {
    const video = videoRef.current;
    setSnapshot(video ? readSnapshot(video) : INITIAL_SNAPSHOT);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const events: Array<keyof HTMLMediaElementEventMap> = [
      'loadedmetadata',
      'durationchange',
      'canplay',
      'progress',
      'timeupdate',
      'play',
      'pause',
      'seeking',
      'seeked',
      'ended',
      'emptied',
    ];
    events.forEach(event => video.addEventListener(event, sync));
    sync();
    return () => events.forEach(event => video.removeEventListener(event, sync));
  }, [sourceId, sync, videoRef]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (video) void video.play();
  }, [videoRef]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, [videoRef]);

  const seekTo = useCallback((requestedTime: number): boolean => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return false;

    const target = closestSeekableTime(getSeekRanges(video), requestedTime);
    if (target === null) return false;

    try {
      video.currentTime = target;
      sync();
      return true;
    } catch (error) {
      console.warn('[player-controls] seek rejected', { requestedTime, target, error });
      sync();
      return false;
    }
  }, [sync, videoRef]);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return false;
    return seekTo(video.currentTime + seconds);
  }, [seekTo, videoRef]);

  const seekToRatio = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video) return false;
    const ranges = getSeekRanges(video);
    if (!Number.isFinite(video.duration) || video.duration <= 0 || ranges.length === 0) return false;

    const boundedRatio = Math.max(0, Math.min(1, ratio));
    const start = ranges[0][0];
    const end = ranges[ranges.length - 1][1];
    return seekTo(start + (end - start) * boundedRatio);
  }, [seekTo, videoRef]);

  return {
    ...snapshot,
    togglePlay,
    play,
    pause,
    seekBy,
    seekToRatio,
  };
}
