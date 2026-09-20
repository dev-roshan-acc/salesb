import { CONFIG } from "./config.js";
import { fetchSnapshot } from "./api.js";
import { renderDashboard, clearDashboard } from "./components/dashboard.js";
import { setStatus } from "./components/status.js";
import { showToast } from "./components/toast.js";
import {
  bindTrendControls,
  renderCurrentTrend,
} from "./components/trend-chart.js";
import { bindDeleteModal } from "./components/delete-modal.js";
import {
  resetPollingClock,
  updatePollingUI,
} from "./components/polling.js";

/**
 * Pull one snapshot from Cloudflare and render it.
 */
async function poll() {
  resetPollingClock();

  try {
    const result = await fetchSnapshot();

    if (!result.exists) {
      clearDashboard();
      setStatus(
        "stale",
        "Waiting for the first snapshot from Santosh AI",
      );
      return;
    }

    renderDashboard(result.data);
  } catch (error) {
    setStatus(
      "down",
      `Cannot reach snapshot · ${error.message}`,
    );
  }
}

/**
 * Manual refresh button.
 */
async function refreshPage() {
  const button = document.getElementById("refresh-btn");
  const original = button.innerHTML;

  button.disabled = true;
  button.textContent = "Refreshing…";

  try {
    await poll();
    showToast("Dashboard refreshed", "success");
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

/**
 * Application bootstrap.
 */
function start() {
  document
    .getElementById("refresh-btn")
    .addEventListener("click", refreshPage);

  bindTrendControls();
  bindDeleteModal();

  window.addEventListener("resize", renderCurrentTrend);

  poll();
  updatePollingUI();

  window.setInterval(poll, CONFIG.pollMs);
  window.setInterval(updatePollingUI, 250);
}

start();
