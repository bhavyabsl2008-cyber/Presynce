/**
 * useAutoSync.ts
 *
 * Replaces the old useChalkpadBridge (Base64 URL-parameter bridge).
 *
 * Listens for PRESYNCE_CHALKPAD_ATTENDANCE messages posted by the
 * browser extension's content-presynce.js content script.
 *
 * Security:
 *   - event.origin is validated against ALLOWED_ORIGINS before processing.
 *   - event.data.type must equal MESSAGE_TYPE ("PRESYNCE_CHALKPAD_ATTENDANCE").
 *   - The payload is validated before being passed to SyncEngine.ingest().
 *   - No wildcard origins are accepted.
 *
 * Lifecycle notes:
 *   - The content script handles both initial storage read and live
 *     storage.onChanged events, so this hook only needs a single
 *     window.addEventListener("message", ...) — no polling needed here.
 */

import { useEffect } from "react";
import { useStore } from "@/store";
import { SyncEngine } from "@/services/sync/engine";
import { ChalkpadBridgePayload } from "@/services/sync/types";

const MESSAGE_TYPE = "PRESYNCE_CHALKPAD_ATTENDANCE";

/**
 * Origins from which Presynce will accept attendance messages.
 * The content script posts to window with the page's own origin, so this
 * should match the Presynce deployment origin exactly.
 * Development: http://localhost:3000
 * Production:  Add your production URL here when deploying.
 */
const ALLOWED_ORIGINS: string[] = [
  "http://localhost:3000",
  // "https://your-production-domain.com",  // add production origin here
];

function isValidPayload(data: unknown): data is { payload: ChalkpadBridgePayload[] } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.type !== MESSAGE_TYPE) return false;
  if (!Array.isArray(d.payload)) return false;
  // Basic shape check on each payload item
  return d.payload.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as ChalkpadBridgePayload).subjectName === "string" &&
      typeof (item as ChalkpadBridgePayload).delivered   === "number" &&
      typeof (item as ChalkpadBridgePayload).attended    === "number" &&
      typeof (item as ChalkpadBridgePayload).dl          === "number"
  );
}

export function useAutoSync() {
  const { subjects, mergeSubjectAttendance, setSyncMeta, addSubject } = useStore();

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // ── Origin validation ───────────────────────────────────────────────────
      if (!ALLOWED_ORIGINS.includes(event.origin)) {
        // Silently ignore — could be unrelated postMessages from other scripts.
        return;
      }

      // ── Type + payload validation ───────────────────────────────────────────
      if (!isValidPayload(event.data)) return;

      const payloads = event.data.payload;

      setSyncMeta({ status: "syncing" });

      try {
        const result = SyncEngine.ingest(payloads, subjects, mergeSubjectAttendance, addSubject);

        setSyncMeta({
          lastSyncedAt: new Date().toISOString(),
          source: "Chalkpad",
          status: "synced",
          dataAsOf: (event.data as Record<string, unknown>).dataAsOf as string?? null,
          updatedSubjectIds: result.items
            .filter((i) => i.status === "UPDATED")
            .map((i) => i.matchedSubjectId!),
          error: null,
        });
      } catch (err) {
        console.error("[Presynce AutoSync] SyncEngine error:", err);
        setSyncMeta({
          status: "error",
          error: "SyncEngine failed to process attendance data",
        });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // subjects intentionally included: SyncEngine needs the current list of subjects
    // for matching. Re-subscribing on subject changes is correct.
  }, [subjects, mergeSubjectAttendance, setSyncMeta]);
}
