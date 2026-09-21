import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/state/playerStore';
import type { PlayerController } from './usePlayerController';

const OSD_HIDE_DELAY_MS = 10000;
export function useRemote(controller: PlayerController) {
  const { play, pause, seekBy } = controller;
  const showOSD = usePlayerStore((s) => s.showOSD);
  const hideOSD = usePlayerStore((s) => s.hideOSD);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetOSDTimer = useCallback(() => {
    showOSD();
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(hideOSD, OSD_HIDE_DELAY_MS);
  }, [showOSD, hideOSD]);

  useEffect(() => {
    resetOSDTimer();

    const handler = (e: KeyboardEvent) => {
      resetOSDTimer();

      switch (e.keyCode) {
        // ── Media keys ─────────────────────────────────────────────
        case 415: // Play
          play();
          e.preventDefault();
          break;

        case 19: // Pause
          pause();
          e.preventDefault();
          break;

        // ── Fast-forward / rewind media keys ───────────────────────
        case 417: // FastForward
          if (seekBy(30)) {
            e.preventDefault();
          }
          break;

        case 412: // Rewind
          if (seekBy(-30)) {
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('mousemove', resetOSDTimer);
    window.addEventListener('mousedown', resetOSDTimer);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousemove', resetOSDTimer);
      window.removeEventListener('mousedown', resetOSDTimer);
      if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    };
  }, [play, pause, seekBy, resetOSDTimer]);
}
