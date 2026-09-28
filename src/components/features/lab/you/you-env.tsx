"use client";

import { useState } from "react";
import { motion, LayoutGroup } from "motion/react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import { useChalkpadMobileSync } from "@/hooks/useChalkpadMobileSync";
import { saveChalkpadCreds, getChalkpadCreds, clearChalkpadCreds } from "@/hooks/useStartupSync";

const EASE = [0.22, 1, 0.36, 1] as const;

function formatSyncTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Unknown";
  }
}

export function YouEnv() {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const { student, updateGlobalTarget, syncMeta } = useStore();
  const globalThreshold = student?.globalTarget ?? 75;

  const savedCreds = typeof window !== "undefined" ? getChalkpadCreds() : null;
  const isConnected = !!savedCreds;

  const [username, setUsername] = useState(savedCreds?.username ?? "");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(!isConnected);
  const { sync, isSyncing, error } = useChalkpadMobileSync();

  const sectionVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 10 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: shouldReduce ? { duration: 0.01 } : { delay: i * 0.055, duration: 0.32, ease: EASE },
    }),
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    const result = await sync(username, password);
    if ((result as { success?: boolean })?.success !== false) {
      // Always save credentials so auto-sync works on next launch
      saveChalkpadCreds({ username, password });
      setPassword("");
      setShowForm(false);
    }
  };

  const handleDisconnect = () => {
    clearChalkpadCreds();
    setUsername("");
    setPassword("");
    setShowForm(true);
  };

  const syncStatus = syncMeta.status;
  const lastSynced = syncMeta.lastSyncedAt;

  return (
    <PageShell>
      <LayoutGroup>
        
        {/* ══════════════════════════════════════════════════════════════════
            §1  HERO — You (Profile)
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="px-8 lg:px-12 pt-10 pb-8 border-b border-line flex flex-col md:flex-row justify-between gap-8"
        >
          <div className="flex-1 max-w-2xl">
            <h1
              className="font-bold tracking-tighter text-ink-v2 leading-[0.85] mb-4"
              style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)", fontFamily: "var(--font-display)" }}
            >
              STUDENT PROFILE
            </h1>
            <div className="flex gap-6 text-meta font-bold tracking-[0.1em] uppercase text-ink-secondary" style={{ fontFamily: "var(--font-data)" }}>
              <span>SPRING 2026</span>
              <span aria-hidden>-</span>
              <span>COMPUTER SCIENCE</span>
            </div>
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §2  GLOBAL CONFIGURATION
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          className="px-8 lg:px-12 py-10 border-b border-line"
        >
           <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-6 block">SYSTEM CONFIGURATION</span>
           
           <div className="flex flex-col gap-8 max-w-xl">
             <div className="flex flex-col gap-4">
               <label htmlFor="threshold" className="text-body-strong font-bold text-ink-v2">
                 Global Target Threshold
               </label>
               <p className="text-body-v2 text-ink-secondary leading-relaxed">
                 Presynce uses this value to determine the safety margins across your entire schedule. Modifying this will recalculate all consequence logic.
               </p>
               
               <div className="flex items-center gap-4 mt-2">
                 <input 
                   type="range" 
                   id="threshold"
                   min="0" max="100" 
                   value={globalThreshold} 
                   onChange={(e) => updateGlobalTarget(Number(e.target.value))}
                   className="flex-1 accent-ink-v2 h-1 bg-line rounded-none appearance-none"
                 />
                 <span className="text-[2rem] font-bold tabular-nums text-ink-v2 min-w-[4rem] text-right" style={{ fontFamily: "var(--font-data)" }}>
                   {globalThreshold}%
                 </span>
               </div>
             </div>
           </div>
         </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §3  CHALKPAD SYNC
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={2}
          className="px-8 lg:px-12 py-10 border-b border-line"
        >
          <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-6 block">CHALKPAD SYNC</span>

          <div className="flex flex-col gap-8 max-w-xl">
            <p className="text-body-v2 text-ink-secondary leading-relaxed">
              Presynce automatically checks Chalkpad when you open the app and
              updates your attendance if anything changed. No manual action required.
            </p>

            {/* ── Status panel (shown when connected) ── */}
            {isConnected && !showForm && (
              <div className="flex flex-col gap-5">
                {/* Last synced */}
                <div className="flex flex-col gap-1">
                  <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary">
                    LAST SYNCED
                  </span>
                  <span className="text-body-strong font-bold text-ink-v2" style={{ fontFamily: "var(--font-data)" }}>
                    {formatSyncTime(lastSynced)}
                  </span>
                </div>

                {/* Status indicator */}
                <div className="flex flex-col gap-1">
                  <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary">
                    STATUS
                  </span>
                  {syncStatus === "needs-reconnect" ? (
                    <span className="text-body-strong font-bold text-danger flex items-center gap-2">
                      Session expired — reconnect required
                    </span>
                  ) : syncStatus === "error" ? (
                    <span className="text-body-strong font-bold text-danger flex items-center gap-2">
                      {syncMeta.error ?? "Sync error"}
                    </span>
                  ) : syncStatus === "syncing" || isSyncing ? (
                    <span className="text-body-strong font-bold text-ink-secondary flex items-center gap-2">
                      Syncing…
                    </span>
                  ) : syncStatus === "synced" ? (
                    <span className="text-body-strong font-bold text-safe flex items-center gap-2">
                      Up to date
                    </span>
                  ) : (
                    <span className="text-body-strong font-bold text-ink-secondary flex items-center gap-2">
                      {lastSynced ? "Up to date" : "Not yet synced this session"}
                    </span>
                  )}
                </div>

                {/* Account */}
                <div className="flex flex-col gap-1">
                  <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary">
                    ACCOUNT
                  </span>
                  <span className="text-body-strong font-bold text-ink-v2" style={{ fontFamily: "var(--font-data)" }}>
                    {savedCreds?.username}
                  </span>
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    onClick={async () => {
                      const creds = getChalkpadCreds();
                      if (!creds) { setShowForm(true); return; }
                      await sync(creds.username, creds.password);
                    }}
                    disabled={isSyncing}
                    className="px-6 py-3 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:bg-ink-secondary transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? "SYNCING…" : "SYNC NOW"}
                  </button>

                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-3 text-micro font-bold tracking-[0.14em] uppercase text-ink-secondary hover:text-ink-v2 transition-colors"
                  >
                    CHANGE ACCOUNT
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-3 text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary hover:text-danger transition-colors"
                  >
                    DISCONNECT
                  </button>
                </div>

                {error && (
                  <div className="text-meta text-danger">{error}</div>
                )}
              </div>
            )}

            {/* ── Login form (shown when not connected or changing account) ── */}
            {(!isConnected || showForm) && (
              <form onSubmit={handleSync} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Chalkpad Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary"
                  disabled={isSyncing}
                  autoComplete="username"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary"
                  disabled={isSyncing}
                  autoComplete="current-password"
                  required
                />

                <p className="text-meta text-ink-tertiary leading-relaxed">
                  Presynce securely stores your credentials so it can auto-sync
                  attendance when you open the app. Your credentials are never sent
                  anywhere except the official Chalkpad mobile API.
                </p>

                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    type="submit"
                    disabled={isSyncing || !username || !password}
                    className="px-6 py-3 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:bg-ink-secondary transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? "CONNECTING…" : "CONNECT & SYNC"}
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-3 text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary hover:text-ink-secondary transition-colors"
                    >
                      CANCEL
                    </button>
                  )}
                </div>

                {error && (
                  <div className="text-meta text-danger">{error}</div>
                )}
              </form>
            )}
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §4  DANGER ZONE
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={3}
          className="px-8 lg:px-12 py-10"
        >
           <div className="flex flex-col gap-4 max-w-xl">
               <span className="text-body-strong font-bold text-danger">
                 Danger Zone
               </span>
               <button 
                 onClick={() => {
                   if (window.confirm("Are you sure you want to completely erase your data and restart setup?")) {
                     useStore.getState().clearAll();
                     localStorage.removeItem("presynce-storage");
                     clearChalkpadCreds();
                     router.replace("/onboarding");
                   }
                 }}
                 className="self-start px-8 py-3 border border-danger text-danger text-micro font-bold tracking-[0.14em] uppercase hover:bg-danger hover:text-paper transition-colors"
               >
                 START SETUP AGAIN
               </button>
           </div>
        </motion.section>

      </LayoutGroup>
    </PageShell>
  );
}
