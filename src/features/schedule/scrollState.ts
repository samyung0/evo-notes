let didAutoScroll = false;
let scrollTop: number | null = null;

/**
 * Persists across search-only Schedule route remounts, but is reset by
 * AppShell after navigating away from /schedule.
 */
export const scheduleAutoScroll = {
  hasRun: () => didAutoScroll,
  markRun: (currentScrollTop: number) => {
    didAutoScroll = true;
    scrollTop = currentScrollTop;
  },
  rememberPosition: (currentScrollTop: number | undefined) => {
    if (currentScrollTop != null) scrollTop = currentScrollTop;
  },
  getPosition: () => scrollTop,
  reset: () => {
    didAutoScroll = false;
    scrollTop = null;
  },
};
