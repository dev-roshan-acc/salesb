/**
 * Live/stale/error status pill.
 */
export function setStatus(kind, message) {
  const status = document.getElementById("status");
  const text = document.getElementById("status-text");

  status.className = "status";

  if (kind === "stale") {
    status.classList.add("status--stale");
  } else if (kind === "down") {
    status.classList.add("status--down");
  }

  text.textContent = message;
}
