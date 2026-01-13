'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

function getIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener('change', callback);
  window.addEventListener('resize', callback);
  return () => {
    mql.removeEventListener('change', callback);
    window.removeEventListener('resize', callback);
  };
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    getIsMobile,
    () => false // Server-side fallback
  );
}

export function useMediaQuery(query: string) {
  const getMatches = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  };

  const subscribeToQuery = (callback: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
  };

  return useSyncExternalStore(subscribeToQuery, getMatches, () => false);
}

export function useWindowSize() {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
