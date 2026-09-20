import { state } from "../state.js";
import { formatMoney, numberFormatter } from "../formatters.js";

let hitPoints = [];

/**
 * Parse different date label formats from the SAP snapshot.
 */
function parsePointDate(rawValue, data) {
  if (!rawValue) return null;

  let date = new Date(rawValue);
  if (!Number.isNaN(date.getTime())) return date;

  const latestDate = data?.latest_date ? new Date(data.latest_date) : new Date();
  const fallbackYear = Number.isNaN(latestDate.getTime())
    ? new Date().getFullYear()
    : latestDate.getFullYear();

  date = new Date(`${rawValue} ${fallbackYear}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Build month/year data from daily data when the backend does not
 * supply series.monthly or series.yearly.
 */
function aggregateDaily(daily, mode, data) {
  const groups = new Map();

  for (const point of daily || []) {
    const date = parsePointDate(point.date, data);
    if (!date) continue;

    const amount = Number(point.amount) || 0;

    let key;
    let label;

    if (mode === "month") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      label = date.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
    } else {
      key = String(date.getFullYear());
      label = key;
    }

    const current = groups.get(key) || {
      date: label,
      amount: 0,
      sortValue: date.getTime(),
    };

    current.amount += amount;
    current.sortValue = Math.min(current.sortValue, date.getTime());

    groups.set(key, current);
  }

  return [...groups.values()]
    .sort((a, b) => a.sortValue - b.sortValue)
    .map(({ date, amount }) => ({ date, amount }));
}

/**
 * Select the correct series for the active Day/Month/Year tab.
 */
export function getTrendPoints(data, mode = state.trendMode) {
  const series = data?.series || {};

  if (mode === "day") {
    return Array.isArray(series.daily) ? series.daily : [];
  }

  if (
    mode === "month" &&
    Array.isArray(series.monthly) &&
    series.monthly.length
  ) {
    return series.monthly;
  }

  if (
    mode === "year" &&
    Array.isArray(series.yearly) &&
    series.yearly.length
  ) {
    return series.yearly;
  }

  return aggregateDaily(
    Array.isArray(series.daily) ? series.daily : [],
    mode,
    data,
  );
}

function getTrendLabels(mode) {
  if (mode === "month") {
    return {
      title: "Monthly sales trend",
      subtitle: "Sales grouped by month",
      unit: "months",
    };
  }

  if (mode === "year") {
    return {
      title: "Yearly sales trend",
      subtitle: "Sales grouped by year",
      unit: "years",
    };
  }

  return {
    title: "Daily sales trend",
    subtitle: "Sales movement by day",
    unit: "days",
  };
}

function prepareCanvas() {
  const canvas = document.getElementById("trend-chart");
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  return {
    canvas,
    context,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Render the main trend chart and its summary statistics.
 */
export function renderTrend(points = [], mode = state.trendMode) {
  const labels = getTrendLabels(mode);

  document.getElementById("trend-title").textContent = labels.title;
  document.getElementById("trend-subtitle").textContent = labels.subtitle;
  document.getElementById("trend-count").textContent =
    `${points.length} ${labels.unit}`;

  document.getElementById("axis-from").textContent =
    points.length ? points[0].date : "—";

  document.getElementById("axis-to").textContent =
    points.length ? points.at(-1).date : "—";

  const values = points.map((point) => Number(point.amount) || 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = values.length ? total / values.length : 0;
  const highest = values.length ? Math.max(...values) : 0;

  document.getElementById("trend-total").textContent =
    points.length ? formatMoney(total) : "—";

  document.getElementById("trend-average").textContent =
    points.length ? formatMoney(average) : "—";

  document.getElementById("trend-highest").textContent =
    points.length ? formatMoney(highest) : "—";

  document.getElementById("trend-periods").textContent =
    points.length ? numberFormatter.format(points.length) : "—";

  const { canvas, context, width, height } = prepareCanvas();
  hitPoints = [];

  if (!points.length || width < 10 || height < 10) return;

  const padding = { left: 20, right: 20, top: 24, bottom: 26 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  const coordinates = points.map((point, index) => ({
    x:
      padding.left +
      (points.length === 1
        ? innerWidth / 2
        : (index * innerWidth) / (points.length - 1)),
    y:
      padding.top +
      innerHeight -
      ((values[index] - min) / range) * innerHeight,
    amount: values[index],
    label: point.date,
  }));

  hitPoints = coordinates;

  // Soft area gradient under the trend line.
  const fill = context.createLinearGradient(0, padding.top, 0, height);
  fill.addColorStop(0, "rgba(239,68,68,.32)");
  fill.addColorStop(0.65, "rgba(239,68,68,.08)");
  fill.addColorStop(1, "rgba(239,68,68,0)");

  context.beginPath();
  context.moveTo(coordinates[0].x, height - padding.bottom);

  for (const point of coordinates) {
    context.lineTo(point.x, point.y);
  }

  context.lineTo(coordinates.at(-1).x, height - padding.bottom);
  context.closePath();

  context.fillStyle = fill;
  context.fill();

  // Main trend line.
  context.beginPath();

  coordinates.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });

  context.lineWidth = 2.4;
  context.strokeStyle = "#ef4444";
  context.shadowColor = "rgba(239,68,68,.38)";
  context.shadowBlur = 14;
  context.stroke();
  context.shadowBlur = 0;

  // Dots are hidden on very dense series to keep the chart clean.
  coordinates.forEach((point, index) => {
    const showDot =
      coordinates.length <= 32 ||
      index === 0 ||
      index === coordinates.length - 1;

    if (!showDot) return;

    context.beginPath();
    context.arc(point.x, point.y, 3.4, 0, Math.PI * 2);
    context.fillStyle = "#fb7185";
    context.fill();

    context.lineWidth = 1.5;
    context.strokeStyle = "#0b1120";
    context.stroke();
  });

  bindChartTooltip(canvas);
}

function bindChartTooltip(canvas) {
  const tooltip = document.getElementById("chart-tooltip");

  canvas.onmousemove = (event) => {
    if (!hitPoints.length) return;

    const rect = canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;

    let nearest = hitPoints[0];
    let distance = Math.abs(cursorX - nearest.x);

    for (const point of hitPoints) {
      const nextDistance = Math.abs(cursorX - point.x);

      if (nextDistance < distance) {
        nearest = point;
        distance = nextDistance;
      }
    }

    tooltip.querySelector("strong").textContent = nearest.label;
    tooltip.querySelector("span").textContent = formatMoney(nearest.amount);

    tooltip.style.left = `${nearest.x}px`;
    tooltip.style.top = `${nearest.y}px`;
    tooltip.classList.add("is-visible");
  };

  canvas.onmouseleave = () => {
    tooltip.classList.remove("is-visible");
  };
}

/**
 * Re-render the active trend mode from current application data.
 */
export function renderCurrentTrend() {
  if (!state.data) {
    renderTrend([], state.trendMode);
    return;
  }

  renderTrend(
    getTrendPoints(state.data, state.trendMode),
    state.trendMode,
  );
}

/**
 * Attach Day/Month/Year control events.
 */
export function bindTrendControls() {
  document.querySelectorAll("[data-trend]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trendMode = button.dataset.trend;

      document.querySelectorAll("[data-trend]").forEach((candidate) => {
        candidate.classList.toggle("is-active", candidate === button);
      });

      renderCurrentTrend();
    });
  });
}
