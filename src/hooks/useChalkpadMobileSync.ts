import { useState, useCallback } from "react";
import { useStore } from "@/store";
import { SyncEngine } from "@/services/sync/engine";
import { ChalkpadBridgePayload } from "@/services/sync/types";

export function useChalkpadMobileSync() {
  const { subjects, mergeSubjectAttendance, setSyncMeta, addSubject } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async (username: string, password: string) => {
    setIsSyncing(true);
    setError(null);
    setSyncMeta({ status: "syncing" });

    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Sync request failed.");
      }

      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format from sync API.");
      }

      if (!Array.isArray(data.payloads)) {
        throw new Error("Sync API did not return an array of payloads.");
      }

      if (typeof data.dataAsOf !== "string" || data.dataAsOf.trim() === "") {
        throw new Error("Sync API did not return a valid dataAsOf freshness date.");
      }

      const payloads: ChalkpadBridgePayload[] = data.payloads;
      const dataAsOf: string = data.dataAsOf;

      const result = SyncEngine.ingest(payloads, subjects, mergeSubjectAttendance, addSubject);

      setSyncMeta({
        lastSyncedAt: new Date().toISOString(),
        source: "Chalkpad",
        status: "synced",
        dataAsOf: dataAsOf,
        updatedSubjectIds: result.items
          .filter((i) => i.status === "UPDATED")
          .map((i) => i.matchedSubjectId!),
        error: null,
      });

      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      console.error("[Chalkpad Mobile Sync] Error:", errorMessage);
      setError(errorMessage);
      setSyncMeta({
        status: "error",
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsSyncing(false);
    }
  }, [subjects, mergeSubjectAttendance, setSyncMeta]);

  return { sync, isSyncing, error };
}
