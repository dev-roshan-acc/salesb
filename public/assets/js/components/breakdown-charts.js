import { formatMoney } from "../formatters.js";

/**
 * Visual analytics derived entirely from data that already exists in the
 * sales snapshot. No additional API endpoints are required.
 */

const MATERIAL_COLORS = [
  "#ef4444",
  "#fb7185",
  "#f59e0b",
  "#60a5fa",
  "#a78bfa",
];

function safeAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

/**
 * Horizontal ranking chart used for customers and plants.
 */
function renderHorizontalBars({
  elementId,
  countId,
  rows,
  countLabel,
  limit = 7,
}) {
  const holder = document.getElementById(elementId);
  const count = document.getElementById(countId);

  holder.innerHTML = "";

  const cleanRows = (rows || [])
    .map((row) => ({
      name: row.name || "Unknown",
      amount: safeAmount(row.amount),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);

  count.textContent =
    `${cleanRows.length} ${cleanRows.length === 1 ? countLabel : `${countLabel}s`}`;

  if (!cleanRows.length) {
    holder.innerHTML = '<div class="hbar-empty">No data available</div>';
    return;
  }

  const peak = Math.max(...cleanRows.map((row) => row.amount), 1);

  cleanRows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "hbar-row";

    const head = document.createElement("div");
    head.className = "hbar-head";

    const label = document.createElement("span");
    label.className = "hbar-label";
    label.title = row.name;
    label.textContent = `${index + 1}. ${row.name}`;

    const value = document.createElement("span");
    value.className = "hbar-value";
    value.textContent = formatMoney(row.amount);

    const track = document.createElement("div");
    track.className = "hbar-track";

    const fill = document.createElement("div");
    fill.className = "hbar-fill";
    fill.style.width = `${Math.max(2, (row.amount / peak) * 100)}%`;
    fill.style.animationDelay = `${index * 45}ms`;

    track.appendChild(fill);
    head.append(label, value);
    item.append(head, track);
    holder.appendChild(item);
  });
}

/**
 * Donut chart for the top material contribution mix.
 * It uses a CSS conic-gradient, keeping the project dependency-free.
 */
function renderMaterialDonut(materials = []) {
  const donut = document.getElementById("material-donut");
  const legend = document.getElementById("material-donut-legend");
  const totalLabel = document.getElementById("material-donut-total");

  legend.innerHTML = "";

  const topRows = materials
    .map((row) => ({
      name: row.name || "Unknown",
      amount: safeAmount(row.amount),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const total = topRows.reduce((sum, row) => sum + row.amount, 0);
  totalLabel.textContent = total > 0 ? formatMoney(total) : "—";

  if (!topRows.length || total <= 0) {
    donut.style.setProperty(
      "--donut-background",
      "conic-gradient(#1f2937 0deg 360deg)",
    );
    legend.innerHTML = '<div class="hbar-empty">No material data</div>';
    return;
  }

  let cursor = 0;
  const segments = [];

  topRows.forEach((row, index) => {
    const percent = (row.amount / total) * 100;
    const start = cursor;
    const end = cursor + percent;

    segments.push(
      `${MATERIAL_COLORS[index]} ${start.toFixed(3)}% ${end.toFixed(3)}%`,
    );

    cursor = end;

    const legendRow = document.createElement("div");
    legendRow.className = "donut-legend-row";

    const swatch = document.createElement("span");
    swatch.className = "donut-swatch";
    swatch.style.background = MATERIAL_COLORS[index];
    swatch.style.color = MATERIAL_COLORS[index];

    const name = document.createElement("span");
    name.className = "donut-name";
    name.title = row.name;
    name.textContent = row.name;

    const share = document.createElement("span");
    share.className = "donut-percent";
    share.textContent = `${percent.toFixed(1)}%`;

    legendRow.append(swatch, name, share);
    legend.appendChild(legendRow);
  });

  donut.style.setProperty(
    "--donut-background",
    `conic-gradient(${segments.join(", ")})`,
  );
}

/**
 * Render every supplemental visualization.
 */
export function renderBreakdownCharts(data) {
  const top = data?.top || {};

  renderHorizontalBars({
    elementId: "customer-chart",
    countId: "customer-chart-count",
    rows: top.customers || [],
    countLabel: "customer",
    limit: 7,
  });

  renderMaterialDonut(top.materials || []);

  renderHorizontalBars({
    elementId: "plant-chart",
    countId: "plant-chart-count",
    rows: top.plants || [],
    countLabel: "plant",
    limit: 7,
  });
}

/**
 * Empty state used after deletion / before the first snapshot.
 */
export function clearBreakdownCharts() {
  renderBreakdownCharts({
    top: {
      customers: [],
      materials: [],
      plants: [],
    },
  });
}
