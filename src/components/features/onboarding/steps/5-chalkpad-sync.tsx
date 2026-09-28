"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Subject } from "@/domain/models";
import { ChalkpadBridgePayload } from "@/services/sync/types";
import { matchSubject } from "@/services/sync/chalkpad-adapter";

export interface ChalkpadSyncRecord {
  payload: ChalkpadBridgePayload;
  matchedSubject: Subject;
  delivered: number;
  attended: number;
  dl: number;
  ml: number;
  isStandalone?: boolean;
}

type Phase = "credentials" | "syncing" | "otp" | "verifying" | "review";

interface Props {
  subjects: Subject[];
  onComplete: (records: ChalkpadSyncRecord[]) => void;
}

export function StepChalkpadSync({ subjects, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ChalkpadSyncRecord[]>([]);
  const [standaloneCount, setStandaloneCount] = useState<number>(0);

  const processPayloads = useCallback((data: any) => {
    if (!data || !Array.isArray(data.payloads)) throw new Error("Invalid response from sync API.");
    if (typeof data.dataAsOf !== "string" || data.dataAsOf.trim() === "") throw new Error("Sync API did not return a valid dataAsOf date.");
    
    const payloads: ChalkpadBridgePayload[] = data.payloads;
    const matched: ChalkpadSyncRecord[] = [];
    let standalone = 0;
    
    for (const payload of payloads) {
      const subject = matchSubject(payload, subjects);
      if (subject) {
        matched.push({ payload, matchedSubject: subject, delivered: payload.delivered, attended: payload.attended, dl: payload.dl, ml: payload.ml });
      } else {
        standalone++;
        const standaloneSubject: Subject = {
          id: crypto.randomUUID(),
          code: payload.subjectCode || payload.subjectName,
          name: payload.subjectName,
          shortLabel: payload.subjectCode || payload.subjectName,
          instructor: '',
          credits: 0,
        };
        matched.push({ 
          payload, 
          matchedSubject: standaloneSubject, 
          delivered: payload.delivered, 
          attended: payload.attended, 
          dl: payload.dl, ml: payload.ml, 
          isStandalone: true 
        });
      }
    }
    
    setRecords(matched);
    setStandaloneCount(standalone);
    setPhase("review");
  }, [subjects]);

  const handleSync = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setPhase("syncing");
    setError(null);
    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sync failed.");
      
      if (data.requiresOtp && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setPassword("");
        setPhase("otp");
        return;
      }
      
      // Fallback for legacy flow
      processPayloads(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setPassword("");
      setPhase("credentials");
    }
  }, [username, password, processPayloads]);

  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4 || !pendingToken) return;
    setPhase("verifying");
    setError(null);
    try {
      const res = await fetch("/api/chalkpad/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, pendingToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "OTP verification failed.");
      
      processPayloads(data);
      setPendingToken(null);
      setOtp("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid request payload")) {
        setPhase("credentials");
        setPendingToken(null);
        setOtp("");
      } else {
        setPhase("otp");
      }
    }
  }, [otp, pendingToken, processPayloads]);

  const updateRecord = (subjectId: string, field: "delivered" | "attended" | "dl" | "ml", delta: number) => {
    setRecords((prev) => prev.map((r) => r.matchedSubject.id !== subjectId ? r : { ...r, [field]: Math.max(0, r[field] + delta) }));
  };

  const handleFinish = () => {
    onComplete(records);
  };

  if (phase === "credentials") {
    return (
      <div className="flex flex-col w-full max-w-xl mx-auto mt-12 min-h-[60vh]">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-12">
          STEP 3: CHALKPAD SYNC
        </motion.span>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-ink-v2 text-body-strong">Connect Chalkpad</h2>
            <p className="text-body-v2 text-ink-secondary leading-relaxed">
              Presynce will fetch your current attendance directly from the Chalkpad mobile API. Credentials are used only for this request and are never stored.
            </p>
          </div>
          <form onSubmit={handleSync} className="flex flex-col gap-4 mt-4">
            <input type="text" placeholder="Chalkpad username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary" autoComplete="username" required />
            <input type="password" placeholder="Chalkpad password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary" autoComplete="current-password" required />
            {error && <div className="text-meta text-danger mt-1">{error}</div>}
            <div className="flex items-center justify-between mt-4">
              <button type="submit" disabled={!username || !password} className="px-8 py-4 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:opacity-90 transition-opacity disabled:opacity-40">
                SYNC ATTENDANCE
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  if (phase === "syncing") {
    return (
      <div className="flex flex-col w-full max-w-xl mx-auto mt-12 min-h-[60vh] justify-center items-center gap-6">
        <div className="w-6 h-6 rounded-full border-2 border-ink-v2 border-t-transparent animate-spin" />
        <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">FETCHING FROM CHALKPAD...</span>
      </div>
    );
  }

  if (phase === "otp") {
    return (
      <div className="flex flex-col w-full max-w-xl mx-auto mt-12 min-h-[60vh]">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-12">
          STEP 3: VERIFY CHALKPAD
        </motion.span>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-ink-v2 text-body-strong">Verify Chalkpad</h2>
            <p className="text-body-v2 text-ink-secondary leading-relaxed">
              We&apos;ve sent a verification code to your registered contact.
            </p>
          </div>
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 mt-4">
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="4-digit OTP" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
              className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary tracking-widest text-center text-xl" 
              autoComplete="one-time-code" 
              required 
            />
            {error && <div className="text-meta text-danger mt-1">{error}</div>}
            <div className="flex items-center justify-between mt-4">
               <button 
                  type="button" 
                  onClick={() => {
                    setPhase("credentials");
                    setPendingToken(null);
                    setOtp("");
                    setError(null);
                  }} 
                  className="px-4 py-4 text-ink-secondary text-meta font-bold uppercase hover:text-ink-v2 transition-colors"
                >
                  Back to login
                </button>
              <button type="submit" disabled={otp.length < 4} className="px-8 py-4 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:opacity-90 transition-opacity disabled:opacity-40">
                VERIFY
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  if (phase === "verifying") {
    return (
      <div className="flex flex-col w-full max-w-xl mx-auto mt-12 min-h-[60vh] justify-center items-center gap-6">
        <div className="w-6 h-6 rounded-full border-2 border-ink-v2 border-t-transparent animate-spin" />
        <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">VERIFYING AND SYNCING ATTENDANCE...</span>
      </div>
    );
  }

  const totalDelivered = records.reduce((s, r) => s + r.delivered, 0);
  const totalAttended = records.reduce((s, r) => s + r.attended, 0);
  const totalDl = records.reduce((s, r) => s + r.dl, 0);
  const totalMl = records.reduce((s, r) => s + r.ml, 0);
  const overallPct = totalDelivered > 0 ? ((totalAttended + totalDl + totalMl) / totalDelivered * 100).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto mt-12 pb-20">
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-6">
        STEP 3: REVIEW ATTENDANCE
      </motion.span>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4 }} className="border border-line p-6 mb-8 flex flex-wrap gap-8">
        {[["SUBJECTS", records.length], ["DELIVERED", totalDelivered], ["ATTENDED", totalAttended], ["OVERALL", overallPct + "%"]].map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-1">{label}</span>
            <span className="text-[2rem] font-bold tabular-nums text-ink-v2" style={{ fontFamily: "var(--font-data)" }}>{value}</span>
          </div>
        ))}
      </motion.div>
      <AnimatePresence>
        {standaloneCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="border border-line px-5 py-4 mb-6 bg-surface-v2">
            <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-secondary block mb-2">
              {standaloneCount} subject{standaloneCount > 1 ? "s are" : " is"} not in your current timetable.
            </span>
            <p className="text-meta text-ink-tertiary mt-2">Its Chalkpad attendance will still be imported.</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-4">
        {records.map((record, idx) => {
          const effectiveAttended = record.attended + record.dl + (record.ml || 0);
                    const pct = record.delivered > 0 ? ((effectiveAttended / record.delivered) * 100).toFixed(1) : "0.0"
          return (
            <motion.div key={record.matchedSubject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, ease: [0.22, 1, 0.36, 1], duration: 0.35 }} className="border border-line p-5 flex flex-wrap gap-6 items-start">
              <div className="flex flex-col flex-1 min-w-[160px]">
                <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary mb-1">{record.matchedSubject.code}</span>
                <span className="text-body-strong font-bold text-ink-v2 leading-tight">{record.matchedSubject.name}</span>
                {record.payload.subjectName !== record.matchedSubject.name && (
                  <span className="text-meta text-ink-tertiary mt-1 italic">Chalkpad: &quot;{record.payload.subjectName}&quot;</span>
                )}
              </div>
              {(["delivered", "attended", "dl", "ml"] as const).map((field) => (
                <div key={field} className="flex flex-col items-center gap-2">
                  <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary">{field.toUpperCase()}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateRecord(record.matchedSubject.id, field, -1)} className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold">−</button>
                    <span className="font-bold tabular-nums w-8 text-center text-body-strong">{record[field]}</span>
                    <button onClick={() => updateRecord(record.matchedSubject.id, field, 1)} className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold">+</button>
                  </div>
                </div>
              ))}
              <div className="flex flex-col items-start ml-auto">
                <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-2">EFFECTIVE</span>
                <span className="font-bold tabular-nums text-body-strong">{effectiveAttended} / {record.delivered}</span>
                <span className="text-meta font-bold tabular-nums text-ink-secondary">{pct}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-end mt-12">
        <button onClick={handleFinish} className="px-8 py-4 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase transition-opacity hover:opacity-90">
          CONFIRM &amp; FINISH
        </button>
      </div>
    </div>
  );
}







