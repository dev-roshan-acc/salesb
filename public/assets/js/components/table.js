import { CONFIG } from "../config.js";
import { formatMoney } from "../formatters.js";

/**
 * Render a ranked table used by customers, materials and plants.
 */
export function renderRankingTable(tableId, rows = []) {
  const table = document.getElementById(tableId);
  table.innerHTML = "";

  rows.slice(0, CONFIG.maxRankingRows).forEach((row, index) => {
    const tr = table.insertRow();

    const labelCell = tr.insertCell();
    const rank = document.createElement("span");

    rank.className = "rank-badge";
    rank.textContent = String(index + 1);

    labelCell.append(rank, document.createTextNode(row.name || "—"));

    const valueCell = tr.insertCell();
    valueCell.className = "value-cell";
    valueCell.textContent = formatMoney(row.amount);
  });

  if (!table.rows.length) {
    const cell = table.insertRow().insertCell();
    cell.colSpan = 2;
    cell.textContent = "No data";
    cell.style.color = "#5f7188";
    cell.style.padding = "14px 0";
  }
}
