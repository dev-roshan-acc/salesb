import { CONFIG } from "../config.js";
import { state } from "../state.js";

/**
 * Restart the visual 5-second polling timer.
 */
export function resetPollingClock() {
  state.pollStartedAt = Date.now();
}

/**
 * Update the small auto-refresh progress indicator.
 */
export function updatePollingUI() {
  const elapsed =
    (Date.now() - state.pollStartedAt) % CONFIG.pollMs;

  const remaining = Math.max(0, CONFIG.pollMs - elapsed);
  const progress = Math.min(100, (elapsed / CONFIG.pollMs) * 100);

  document.getElementById("poll-progress").style.width =
    `${progress}%`;

  document.getElementById("poll-countdown").textContent =
    `${Math.ceil(remaining / 1000)}s`;

  document.getElementById("refresh-meta").textContent =
    `Next refresh in ${Math.ceil(remaining / 1000)}s`;
}
