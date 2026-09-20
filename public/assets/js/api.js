import { CONFIG } from "./config.js";

/**
 * Fetch the current sales snapshot.
 * Cache busting is included because the page polls frequently.
 */
export async function fetchSnapshot() {
  const url = `${CONFIG.snapshotUrl}&t=${Date.now()}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 404) {
    return { exists: false, data: null };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return {
    exists: true,
    data: await response.json(),
  };
}

/**
 * Delete the current sales snapshot using the configured auth header.
 */
export async function deleteSnapshot(token) {
  const response = await fetch(`${CONFIG.snapshotUrl}&t=${Date.now()}`, {
    method: "DELETE",
    cache: "no-store",
    headers: {
      [CONFIG.deleteHeader]: token,
    },
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // The caller still receives the HTTP error below if the response is not JSON.
  }

  if (response.status === 401) {
    throw new Error("Wrong SAI_DASHBOARD_TOKEN");
  }

  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }

  return payload;
}
