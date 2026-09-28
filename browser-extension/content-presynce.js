// content-presynce.js
// Runs on: http://localhost:3000/*   (and any configured production origin)
//
// Responsibilities:
//   1. On page load, read any pending Chalkpad data from chrome.storage.local.
//   2. While the page is open, listen for new data via chrome.storage.onChanged.
//   3. Forward payload to the Presynce React page via a typed, origin-validated postMessage.
//
// SECURITY:
//   - Messages are sent to window (same origin as the content script injection target).
//   - The React side validates event.origin against ALLOWED_ORIGINS before processing.
//   - Message type "PRESYNCE_CHALKPAD_ATTENDANCE" is checked on both sides.
//   - No credentials, tokens, or cookies are forwarded.

(function presynceContentScript() {
  "use strict";

  const STORAGE_KEY  = "presynce_pending_sync";
  const MESSAGE_TYPE = "PRESYNCE_CHALKPAD_ATTENDANCE";

  // The content script runs in the Presynce page's context, so window.location is Presynce.
  // postMessage to window with the page's own origin is same-origin and safe.
  const PAGE_ORIGIN = window.location.origin;

  function forwardPayload(data) {
    if (!data || !Array.isArray(data.payloads) || data.payloads.length === 0) return;
    if (data.consumed) {
      // Already consumed by a previous Presynce session — skip.
      return;
    }

    window.postMessage(
      {
        type:    MESSAGE_TYPE,
        payload: data.payloads,
        dataAsOf: data.dataAsOf,
        extractedAt: data.extractedAt,
      },
      PAGE_ORIGIN   // Exact target origin — never "*"
    );
    console.log(`[Presynce Bridge] Forwarded ${data.payloads.length} subject(s) to Presynce.`);

    // Mark as consumed so re-opening the same Presynce tab doesn't re-ingest.
    chrome.storage.local.set({ [STORAGE_KEY]: { ...data, consumed: true } });
  }

  // ── A. Initial read (handles: Chalkpad opened first, Presynce opened later) ──
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const data = result[STORAGE_KEY];
    if (data) {
      forwardPayload(data);
    }
  });

  // ── B. Live listener (handles: Presynce open, Chalkpad updates later) ──────
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!changes[STORAGE_KEY]) return;
    const data = changes[STORAGE_KEY].newValue;
    if (data) {
      forwardPayload(data);
    }
  });
})();
