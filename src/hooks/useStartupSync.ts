"use client";

/**
 * useStartupSync
 *
 * Fires once per browser session on app launch, and again whenever
 * the app regains focus after 30+ minutes in the background.
 *
 * Uses the persisted sessionToken to sync attendance seamlessly.
 */

import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import { SyncEngine } from "@/services/sync/engine";
import { ChalkpadBridgePayload } from "@/services/sync/types";

const SESSION_FLAG = "presynce:startup_sync_done";
const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export function useStartupSync() {
  const { subjects, mergeSubjectAttendance, setSyncMeta, addSubject } = useStore();
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;

  const doSync = async () => {
    // Re-read sessionToken directly from store
    const { sessionToken } = useStore.getState();
    if (!sessionToken) return; // Not yet connected or missing token

    setSyncMeta({ status: "syncing" });

    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If it returns 401/403 or explicit requiresReauth
        if (res.status === 401 || res.status === 403 || data.requiresReauth) {
          useStore.getState().setSessionToken(null);
          setSyncMeta({ status: "needs-reconnect", error: "Session expired." });
        } else {
          setSyncMeta({ status: "error", error: data?.error ?? "Sync failed" });
        }
        return;
      }

      if (!Array.isArray(data.payloads)) {
        setSyncMeta({ status: "error", error: "Invalid response from Chalkpad" });
        return;
      }

      const payloads: ChalkpadBridgePayload[] = data.payloads;
      const dataAsOf: string = data.dataAsOf || new Date().toISOString();

      const result = SyncEngine.ingest(
        payloads,
        subjectsRef.current,
        mergeSubjectAttendance,
        addSubject,
      );

      setSyncMeta({
        lastSyncedAt: new Date().toISOString(),
        source: "Chalkpad",
        status: "synced",
        dataAsOf,
        updatedSubjectIds: result.items
          .filter((i) => i.status === "UPDATED")
          .map((i) => i.matchedSubjectId!),
        error: null,
      });
    } catch (err) {
      setSyncMeta({
        status: "error",
        error: err instanceof Error ? err.message : "Auto-sync failed",
      });
    }
  };

  useEffect(() => {
    // Once per browser session (clears on tab close)
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, "1");
      doSync();
    }

    // Re-sync if app was backgrounded for 30+ minutes
    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (document.visibilityState === "visible" && hiddenAt !== null) {
        if (Date.now() - hiddenAt >= IDLE_THRESHOLD_MS) doSync();
        hiddenAt = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
