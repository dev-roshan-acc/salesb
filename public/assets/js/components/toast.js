let toastTimer = null;

/**
 * Non-blocking feedback message.
 */
export function showToast(message, kind = "") {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.className = "toast is-visible";

  if (kind === "success") toast.classList.add("toast--success");
  if (kind === "error") toast.classList.add("toast--error");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 2800);
}
