import { useEffect } from "react";
import { useStore } from "@/store";
import { SyncEngine } from "@/services/sync/engine";
import { ChalkpadBridgePayload } from "@/services/sync/types";

export function useChalkpadBridge() {
  const { subjects, mergeSubjectAttendance, setSyncMeta, addSubject } = useStore();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const bridgeData = urlParams.get("bridge");

    if (bridgeData) {
      try {
        setSyncMeta({ status: "syncing" });

        const decoded = atob(bridgeData);
        const payloads = JSON.parse(decoded) as ChalkpadBridgePayload[];

        const result = SyncEngine.ingest(
          payloads,
          subjects,
          mergeSubjectAttendance,
          addSubject
        );

        setSyncMeta({
          lastSyncedAt: new Date().toISOString(),
          source: "Chalkpad",
          status: "synced",
          updatedSubjectIds: result.items
            .filter((i) => i.status === "UPDATED")
            .map((i) => i.matchedSubjectId!),
          dataAsOf: payloads[0]?.dataAsOf || null,
        });

        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } catch (error) {
        console.error("Failed to parse bridge data", error);
        setSyncMeta({
          status: "error",
          error: "Failed to parse sync data from extension",
        });
      }
    }
  }, [subjects, mergeSubjectAttendance, setSyncMeta]);
}
