import { Subject } from "@/domain/models";

export interface ChalkpadBridgePayload {
  subjectName: string;
  subjectCode?: string;
  delivered: number;
  attended: number;
  dl: number;
  ml: number;
  percentage: number;
  dataAsOf: string;
  source: "Chalkpad";
}

export interface SyncResultItem {
  status: "STALE" | "UNCHANGED" | "UPDATED" | "CONFLICT" | "UNMATCHED";
  payload: ChalkpadBridgePayload;
  matchedSubjectId?: string;
  reason?: string;
}

export interface SyncResult {
  items: SyncResultItem[];
  updatedCount: number;
  success: boolean;
  error?: string;
}

export interface SyncMeta {
  lastSyncedAt: string | null;
  source: "Chalkpad" | "OCR" | "Manual" | null;
  dataAsOf: string | null;
  status: "idle" | "syncing" | "synced" | "error" | "stale" | "needs-reconnect";
  error: string | null;
  updatedSubjectIds: string[];
}

