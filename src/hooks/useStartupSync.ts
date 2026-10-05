"use client";

/**
 * useStartupSync
 *
 * Fires unconditionally on component mount (app launch/reload), and again
 * whenever the app regains focus after a brief background idle.
 *
 * Uses the persisted sessionToken to sync attendance seamlessly.
 */

import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import { SyncEngine } from "@/services/sync/engine";
import { ChalkpadBridgePayload } from "@/services/sync/types";

// Brief throttle (10 seconds) to prevent rapid visibility toggle spam
const IDLE_THRESHOLD_MS = 10 * 1000;

export function useStartupSync() {
  const { subjects, mergeSubjectAttendance, setSyncMeta, addSubject } = useStore();
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;

  const doSync = async () => {
    const state = useStore.getState();
    if (!state.sessionToken) return; // Not yet connected or missing token
    if (state.syncMeta.status === "syncing") return; // Prevent concurrent overlaps

    setSyncMeta({ status: "syncing" });

    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: state.sessionToken }),
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
    // Unconditionally sync on mount (app load / hard reload)
    doSync();

    // Re-sync if app was backgrounded for longer than the idle threshold
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
