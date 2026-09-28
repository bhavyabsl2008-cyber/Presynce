"use client";

/**
 * useStartupSync
 *
 * Fires once per browser session on app launch, and again whenever
 * the app regains focus after 30+ minutes in the background.
 *
 * This is always-on — auto-sync is not a user preference.
 * Credentials stored in localStorage under "presynce:chalkpad_creds"
 * are written there by the You page after every successful manual sync.
 *
 * Flow:
 *   1. Read credentials from localStorage.
 *   2. POST /api/chalkpad/sync (legacy flow — username+password).
 *   3. On success &rarr; SyncEngine.ingest() &rarr; update store.
 *   4. On 401/403 &rarr; set status "needs-reconnect" (reconnect banner on You page).
 *   5. No credentials &rarr; do nothing silently (user hasn't connected yet).
 */

import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import { SyncEngine } from "@/services/sync/engine";
import { ChalkpadBridgePayload } from "@/services/sync/types";

const CREDS_KEY = "presynce:chalkpad_creds";
const SESSION_FLAG = "presynce:startup_sync_done";
const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export interface ChalkpadCreds { username: string; password: string; }

export function saveChalkpadCreds(c: ChalkpadCreds) {
  try { localStorage.setItem(CREDS_KEY, JSON.stringify(c)); } catch { /* noop */ }
}
export function clearChalkpadCreds() {
  try { localStorage.removeItem(CREDS_KEY); } catch { /* noop */ }
}
export function getChalkpadCreds(): ChalkpadCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? (JSON.parse(raw) as ChalkpadCreds) : null;
  } catch { return null; }
}

export function useStartupSync() {
  const { subjects, mergeSubjectAttendance, setSyncMeta, addSubject } = useStore();
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;

  const doSync = async () => {
    // Re-read credentials at sync time (not captured at mount)
    const creds = getChalkpadCreds();
    if (!creds) return; // Not yet connected — silent

    setSyncMeta({ status: "syncing" });

    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: creds.username,
          password: creds.password,
          useLegacyFlow: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSyncMeta({
          status: (res.status === 401 || res.status === 403) ? "needs-reconnect" : "error",
          error: data?.error ?? "Sync failed",
        });
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
