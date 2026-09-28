import { Subject } from "@/domain/models";
import { ChalkpadBridgePayload, SyncResult, SyncResultItem } from "./types";
import { matchSubject, validateRecord } from "./chalkpad-adapter";

export class SyncEngine {
  static ingest(
    payloads: ChalkpadBridgePayload[],
    subjects: Subject[],
    mergeSubjectAttendance: (
      id: string,
      attended: number,
      dl: number,
      ml: number,
      delivered: number,
      lastUpdated: string,
      source: "OCR" | "Manual" | "System" | "Chalkpad",
      dataAsOf?: string
    ) => void,
    addSubject?: (subject: Subject) => void
  ): SyncResult {
    const items: SyncResultItem[] = [];
    let updatedCount = 0;

    // Pre-aggregate payloads that map to the same subject (e.g. Theory + Practical splits)
    const aggregatedPayloads = new Map<string, { payload: ChalkpadBridgePayload, subject: Subject }>();
    const unmatchedPayloads: ChalkpadBridgePayload[] = [];

    for (const payload of payloads) {
      if (!validateRecord(payload)) {
        items.push({
          status: "CONFLICT",
          payload,
          reason: "Validation failed (attendance > delivered or bad percentage)",
        });
        continue;
      }

      const matchedSubject = matchSubject(payload, subjects);
      if (matchedSubject) {
        const existing = aggregatedPayloads.get(matchedSubject.id);
        if (existing) {
          existing.payload.delivered += payload.delivered;
          existing.payload.attended += payload.attended;
          existing.payload.dl += payload.dl;
          existing.payload.ml += payload.ml;
          // Recompute percentage
          if (existing.payload.delivered > 0) {
            existing.payload.percentage = Number((((existing.payload.attended + existing.payload.dl + existing.payload.ml) / existing.payload.delivered) * 100).toFixed(2));
          }
        } else {
          aggregatedPayloads.set(matchedSubject.id, { payload: { ...payload }, subject: matchedSubject });
        }
      } else {
        unmatchedPayloads.push(payload);
      }
    }

    const processPayload = (payload: ChalkpadBridgePayload, matchedSubject?: Subject) => {
      if (!matchedSubject) {
        if (addSubject) {
          const newId = crypto.randomUUID();
          const newSubject: Subject = {
            id: newId,
            code: payload.subjectCode || payload.subjectName,
            name: payload.subjectName,
            shortLabel: payload.subjectCode || payload.subjectName,
            instructor: '',
            credits: 0,
          };
          addSubject(newSubject);
          
          mergeSubjectAttendance(
            newId,
            payload.attended,
            payload.dl,
            payload.ml,
            payload.delivered,
            new Date().toISOString(),
            "Chalkpad",
            payload.dataAsOf
          );
          
          updatedCount++;
          items.push({
            status: "UPDATED",
            payload,
            matchedSubjectId: newId,
          });
        } else {
          items.push({
            status: "UNMATCHED",
            payload,
            reason: "Could not match to existing subject",
          });
        }
        return;
      }

      const existing = matchedSubject.baseAttendance;
      const now = new Date().toISOString();

      if (!existing) {
        mergeSubjectAttendance(
          matchedSubject.id,
          payload.attended,
          payload.dl,
          payload.ml,
          payload.delivered,
          now,               // lastUpdated = local write time
          "Chalkpad",
          payload.dataAsOf   // dataAsOf = source freshness
        );
        updatedCount++;
        items.push({
          status: "UPDATED",
          payload,
          matchedSubjectId: matchedSubject.id,
        });
        return;
      }

      if (
        existing.source === "Chalkpad" &&
        existing.dataAsOf &&
        payload.dataAsOf
      ) {
        if (payload.dataAsOf < existing.dataAsOf) {
          items.push({
            status: "STALE",
            payload,
            matchedSubjectId: matchedSubject.id,
            reason: `Incoming dataAsOf (${payload.dataAsOf}) is older than existing (${existing.dataAsOf})`,
          });
          return;
        }
      }

      if (
        existing.attended  === payload.attended &&
        existing.dl        === payload.dl       &&
        existing.delivered === payload.delivered
      ) {
        items.push({
          status: "UNCHANGED",
          payload,
          matchedSubjectId: matchedSubject.id,
        });
        return;
      }

      mergeSubjectAttendance(
        matchedSubject.id,
        payload.attended,
        payload.dl,
        payload.ml,
        payload.delivered,
        now,               // lastUpdated = local write time
        "Chalkpad",
        payload.dataAsOf   // dataAsOf = source freshness
      );
      updatedCount++;
      items.push({
        status: "UPDATED",
        payload,
        matchedSubjectId: matchedSubject.id,
      });
    };

    // Process unmatched payloads
    for (const payload of unmatchedPayloads) {
      processPayload(payload);
    }
    
    // Process aggregated matched payloads
    for (const { payload, subject } of aggregatedPayloads.values()) {
      processPayload(payload, subject);
    }

    return {
      items,
      updatedCount,
      success: true,
    };
  }
}
