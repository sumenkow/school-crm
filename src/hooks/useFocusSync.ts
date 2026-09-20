'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook to trigger a sync callback when the tab becomes active or focused,
 * with strict throttling (cooldown) and debouncing to prevent browser thread freeze.
 *
 * @param onSync Callback function to execute when tab is refocused
 * @param cooldownMs Minimum time in ms between automatic focus syncs (default: 10000ms)
 */
export function useFocusSync(onSync: () => void, cooldownMs = 10000) {
  const onSyncRef = useRef(onSync);
  const lastSyncRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const triggerSync = () => {
      const now = Date.now();
      if (now - lastSyncRef.current < cooldownMs) return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Debounce slightly to allow the browser event loop to settle after tab wake-up
      timerRef.current = setTimeout(() => {
        lastSyncRef.current = Date.now();
        onSyncRef.current();
      }, 150);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    };

    const handleFocus = () => {
      triggerSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [cooldownMs]);
}
