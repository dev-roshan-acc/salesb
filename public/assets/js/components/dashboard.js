import { CONFIG } from "../config.js";
import { state } from "../state.js";
import {
  formatDateTime,
  formatMoney,
  numberFormatter,
} from "../formatters.js";
import { renderRankingTable } from "./table.js";
import { renderCurrentTrend } from "./trend-chart.js";
import { setStatus } from "./status.js";
import { renderBreakdownCharts, clearBreakdownCharts } from "./breakdown-charts.js";

/**
 * Render the complete dashboard from one snapshot payload.
 */
export function renderDashboard(data) {
  state.data = data;

  const kpis = data.kpis || {};

  document.getElementById("amount").textContent =
    formatMoney(kpis.sales_amount);

  document.getElementById("qty").textContent =
    numberFormatter.format(Math.round(kpis.sales_quantity || 0));

  document.getElementById("lines").textContent =
    numberFormatter.format(kpis.line_items || 0);

  document.getElementById("customers").textContent =
    numberFormatter.format(kpis.customers || 0);

  document.getElementById("period").textContent =
    (data.period || "Current period") +
    (data.latest_date ? ` · to ${data.latest_date}` : "");

  renderCurrentTrend();

  const top = data.top || {};

  renderRankingTable("top-customers", top.customers || []);
  renderRankingTable("top-materials", top.materials || []);
  renderRankingTable("top-plants", top.plants || []);

  renderBreakdownCharts(data);

  document.getElementById("note").textContent =
    data.note || "Snapshot received successfully.";

  document.getElementById("generated-at").textContent =
    formatDateTime(data.generated_at);

  document.getElementById("received-at").textContent =
    formatDateTime(data.received_at);

  document.getElementById("source-name").textContent =
    data.source || "Santosh AI";

  document.getElementById("latest-date").textContent =
    data.latest_date || "—";

  updateFreshnessStatus(data);
}

/**
 * Clear the UI after a snapshot is deleted or no snapshot exists.
 */
export function clearDashboard() {
  state.data = null;

  for (const id of ["amount", "qty", "lines", "customers"]) {
    document.getElementById(id).textContent = "—";
  }

  document.getElementById("period").textContent = "—";
  document.getElementById("note").textContent =
    "Waiting for a new snapshot…";

  document.getElementById("generated-at").textContent = "—";
  document.getElementById("received-at").textContent = "—";
  document.getElementById("source-name").textContent = "Santosh AI";
  document.getElementById("latest-date").textContent = "—";

  renderRankingTable("top-customers", []);
  renderRankingTable("top-materials", []);
  renderRankingTable("top-plants", []);

  clearBreakdownCharts();
  renderCurrentTrend();
}

function updateFreshnessStatus(data) {
  const stamp = new Date(
    data.generated_at ||
    data.received_at ||
    Date.now(),
  );

  const ageMinutes =
    (Date.now() - stamp.getTime()) / 60000;

  const shown = stamp.toLocaleString();

  if (ageMinutes > CONFIG.staleMinutes) {
    setStatus(
      "stale",
      `Stale · ${shown} · ${Math.round(ageMinutes)} min ago`,
    );
    return;
  }

  setStatus("", `Live · updated ${shown}`);
}
