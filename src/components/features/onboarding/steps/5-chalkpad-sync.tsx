import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Subject } from "@/domain/models";
import { ChalkpadBridgePayload } from "@/services/sync/types";
import { matchSubject } from "@/services/sync/chalkpad-adapter";
import { useChalkpadSyncStateMachine } from "@/hooks/useChalkpadSyncStateMachine";

interface Props {
  subjects: Subject[];
  onComplete: (records: ChalkpadSyncRecord[]) => void;
}

export interface ChalkpadSyncRecord {
  matchedSubject: Subject;
  payload: ChalkpadBridgePayload;
  delivered: number;
  attended: number;
  dl: number;
  ml: number;
  isStandalone?: boolean;
}

export function StepChalkpadSync({ subjects, onComplete }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpVal, setOtpVal] = useState("");
  const [records, setRecords] = useState<ChalkpadSyncRecord[]>([]);
  const [standaloneCount, setStandaloneCount] = useState(0);
  const [dataAsOf, setDataAsOf] = useState<string>("");
  const [showReview, setShowReview] = useState(false);

  const processPayloads = useCallback((data: { payloads: ChalkpadBridgePayload[], dataAsOf?: string }) => {
    setDataAsOf(data.dataAsOf || new Date().toISOString());
    const mapped: ChalkpadSyncRecord[] = [];
    let standalone = 0;
    for (const p of data.payloads) {
      const match = matchSubject(p, subjects);
      if (match) {
        mapped.push({
          matchedSubject: match,
          payload: p,
          delivered: p.delivered,
          attended: p.attended,
          dl: p.dl,
          ml: p.ml || 0
        });
      } else {
        standalone++;
        const standaloneSubject: Subject = {
          id: crypto.randomUUID(),
          code: p.subjectCode || p.subjectName,
          name: p.subjectName,
          shortLabel: p.subjectCode || p.subjectName,
          instructor: "",
          credits: 0,
          
        };
        mapped.push({
          matchedSubject: standaloneSubject,
          payload: p,
          delivered: p.delivered,
          attended: p.attended,
          dl: p.dl,
          ml: p.ml || 0,
          isStandalone: true
        });
      }
    }
    setStandaloneCount(standalone);
    setRecords(mapped);
    setShowReview(true);
  }, [subjects]);

  const {
    phase,
    error,
    submitCredentials,
    submitOtp,
    reset,
    setPhase
  } = useChalkpadSyncStateMachine(processPayloads);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    await submitCredentials(username, password);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVal || otpVal.length < 4) return;
    await submitOtp(otpVal);
  };

  const updateRecord = (id: string, field: "delivered" | "attended" | "dl" | "ml", delta: number) => {
    setRecords(prev => prev.map(r => {
      if (r.matchedSubject.id !== id) return r;
      const val = Math.max(0, r[field] + delta);
      return { ...r, [field]: val };
    }));
  };

  const handleFinish = () => {
    const matchedRecords = records.map(r => ({
      subjectId: r.matchedSubject.id,
      payload: r.payload,
      delivered: r.delivered,
      attended: r.attended,
      dl: r.dl,
      ml: r.ml
    }));
    onComplete(records);
  };

  if (showReview || phase === "success") {
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1] as const, duration: 0.4 }} className="border border-line p-6 mb-8 flex flex-wrap gap-8">
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
            const pct = record.delivered > 0 ? ((effectiveAttended / record.delivered) * 100).toFixed(1) : "0.0";
            return (
              <motion.div key={record.matchedSubject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] as const, duration: 0.35 }} className="border border-line p-5 flex flex-wrap gap-6 items-start">
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
                      <button type="button" onClick={() => updateRecord(record.matchedSubject.id, field, -1)} className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold">-</button>
                      <span className="font-bold tabular-nums w-8 text-center text-body-strong">{record[field]}</span>
                      <button type="button" onClick={() => updateRecord(record.matchedSubject.id, field, 1)} className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold">+</button>
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

  if (phase === "idle" || phase === "error") {
    return (
      <div className="flex flex-col w-full max-w-xl mx-auto mt-12 min-h-[60vh]">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-12">
          STEP 3: CONNECT CHALKPAD
        </motion.span>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1] as const, duration: 0.5 }} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-ink-v2 text-body-strong">Import your attendance</h2>
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

  if (phase === "authenticating" || phase === "syncing") {
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1] as const, duration: 0.5 }} className="flex flex-col gap-6">
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
              value={otpVal} 
              onChange={(e) => setOtpVal(e.target.value.replace(/\D/g, ''))} 
              className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary tracking-widest text-center text-xl" 
              autoComplete="one-time-code" 
              required 
            />
            {error && <div className="text-meta text-danger mt-1">{error}</div>}
            <div className="flex items-center justify-between mt-4">
               <button 
                  type="button" 
                  onClick={() => {
                    reset();
                    setOtpVal("");
                  }} 
                  className="px-4 py-4 text-ink-secondary text-meta font-bold uppercase hover:text-ink-v2 transition-colors"
                >
                  Back to login
                </button>
              <button type="submit" disabled={otpVal.length < 4} className="px-8 py-4 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:opacity-90 transition-opacity disabled:opacity-40">
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

  return null;
}







