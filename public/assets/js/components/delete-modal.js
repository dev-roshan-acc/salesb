import { deleteSnapshot } from "../api.js";
import { clearDashboard } from "./dashboard.js";
import { setStatus } from "./status.js";
import { showToast } from "./toast.js";

/**
 * Accessible custom modal used instead of window.prompt().
 */
export function bindDeleteModal() {
  const modal = document.getElementById("delete-modal");
  const tokenInput = document.getElementById("delete-token");
  const openButton = document.getElementById("delete-btn");
  const cancelButton = document.getElementById("delete-cancel-btn");
  const confirmButton = document.getElementById("delete-confirm-btn");

  function openModal() {
    tokenInput.value = "";
    modal.hidden = false;

    requestAnimationFrame(() => {
      tokenInput.focus();
    });
  }

  function closeModal() {
    modal.hidden = true;
    tokenInput.value = "";
    openButton.focus();
  }

  async function confirmDelete() {
    const token = tokenInput.value.trim();

    if (!token) {
      showToast("Token is required", "error");
      tokenInput.focus();
      return;
    }

    confirmButton.disabled = true;
    confirmButton.textContent = "Deleting…";

    try {
      const result = await deleteSnapshot(token);

      clearDashboard();

      const message = result.deleted
        ? "Snapshot deleted"
        : "No snapshot existed";

      setStatus("stale", message);
      showToast(message, "success");

      closeModal();
    } catch (error) {
      showToast(`Delete failed: ${error.message}`, "error");
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = "Delete snapshot";
    }
  }

  openButton.addEventListener("click", openModal);
  cancelButton.addEventListener("click", closeModal);
  confirmButton.addEventListener("click", confirmDelete);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  tokenInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") confirmDelete();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
}
