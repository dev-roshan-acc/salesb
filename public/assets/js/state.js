/**
 * Small shared application state.
 * This keeps modules independent without introducing a framework.
 */
export const state = {
  data: null,
  trendMode: "day",
  pollStartedAt: Date.now(),
};
