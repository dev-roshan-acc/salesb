/**
 * Application configuration.
 * Keep endpoint and timing values here so they are easy to change.
 */
export const CONFIG = Object.freeze({
  snapshotUrl: "/receive?name=sales",
  pollMs: 5000,
  staleMinutes: 45,
  deleteHeader: "X-SAI-DASHBOARD-Token",
  maxRankingRows: 8,
});
