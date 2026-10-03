import { useState, useCallback } from "react";
import { useStore } from "@/store";
import { SyncEngine } from "@/services/sync/engine";
import { ChalkpadBridgePayload } from "@/services/sync/types";

export type SyncPhase = "idle" | "authenticating" | "otp" | "verifying" | "syncing" | "success" | "error";

export function useChalkpadSyncStateMachine(onSuccess?: (data: { payloads: ChalkpadBridgePayload[], dataAsOf: string }) => void) {
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  const { subjects, mergeSubjectAttendance, setSyncMeta, addSubject, sessionToken, setSessionToken } = useStore();

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setPendingToken(null);
    setRequiresReauth(false);
  }, []);

  const ingestData = (data: { payloads: ChalkpadBridgePayload[], dataAsOf: string }) => {
    const result = SyncEngine.ingest(data.payloads, subjects, mergeSubjectAttendance, addSubject);
    setSyncMeta({
      lastSyncedAt: new Date().toISOString(),
      source: "Chalkpad",
      status: "synced",
      dataAsOf: data.dataAsOf || new Date().toISOString(),
      updatedSubjectIds: result.items.filter((i) => i.status === "UPDATED").map((i) => i.matchedSubjectId!),
      error: null,
    });
    setPhase("success");
  };

  const submitCredentials = async (username: string, password: string) => {
    setPhase("authenticating");
    setError(null);
    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      if (data.requiresOtp && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setPhase("otp");
      } else {
        throw new Error("Invalid response: expected OTP requirement.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setPhase("error");
    }
  };

  const submitOtp = async (otp: string) => {
    if (!pendingToken) return;
    setPhase("verifying");
    setError(null);
    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, pendingToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
      }
      if (data.payloads) {
        if (onSuccess) onSuccess(data); else ingestData(data);
      } else {
        throw new Error("No attendance payloads returned.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setError(msg);
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid request payload") || msg.toLowerCase().includes("invalid or expired otp")) {
        setPendingToken(null);
        setPhase("error");
        setRequiresReauth(true);
      } else {
        setPhase("otp");
      }
    }
  };

  const submitSessionToken = async () => {
    if (!sessionToken) {
      setRequiresReauth(true);
      setPhase("error");
      return;
    }
    setPhase("syncing");
    setError(null);
    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken })
      });
      const data = await res.json();
      if (res.ok && data.payloads) {
        if (onSuccess) onSuccess(data); else ingestData(data);
      } else if (data.requiresReauth || res.status === 401 || res.status === 403) {
        setSessionToken(null);
        setRequiresReauth(true);
        setPhase("error");
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setPhase("error");
    }
  };

  return {
    phase,
    error,
    requiresReauth,
    submitCredentials,
    submitOtp,
    submitSessionToken,
    reset,
    setPhase
  };
}

