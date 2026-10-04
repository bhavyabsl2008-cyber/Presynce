"use client";

import { useState } from "react";
import { motion, LayoutGroup } from "motion/react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import { useChalkpadSyncStateMachine } from "@/hooks/useChalkpadSyncStateMachine";

export function YouEnv() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { student, syncMeta, sessionToken } = useStore();
  const [showForm, setShowForm] = useState(false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpVal, setOtpVal] = useState("");

  const {
    phase,
    error,
    requiresReauth,
    submitCredentials,
    submitOtp,
    submitSessionToken,
    reset,
    setPhase
  } = useChalkpadSyncStateMachine();

  // "needs-reconnect" is historically set by useStartupSync
  const isSessionDead = syncMeta.status === "needs-reconnect" || requiresReauth;
  const isConnected = !!sessionToken && !isSessionDead;
  const syncStatus = syncMeta.status;
  const lastSynced = syncMeta.lastSyncedAt;

  const handleDisconnect = () => {
    if (window.confirm("Are you sure you want to disconnect? This will require you to log in again.")) {
      useStore.getState().setSessionToken(null);
      reset();
    }
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    await submitCredentials(username, password);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVal || otpVal.length < 4) return;
    await submitOtp(otpVal);
    // Upon success, the phase will go to "success". We can just rely on isConnected rendering.
    if (phase === "success" || !error) {
      setShowForm(false);
      setOtpVal("");
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : custom * 0.05,
        ease: [0.22, 1, 0.36, 1] as const,
        duration: 0.4,
      },
    }),
  };

  return (
    <PageShell>
      <LayoutGroup>
        {/* --- STUDENT IDENTITY --- */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="px-5 md:px-8 lg:px-12 py-10 pb-6 border-b border-line"
        >
          <div className="flex flex-col gap-2">
            <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary">
              IDENTITY
            </span>
            <h1 className="text-display-strong font-bold text-ink-v2 tracking-tight leading-none mb-1">
              {student?.name || "Student"}
            </h1>
            <p className="text-body-strong font-bold text-ink-secondary" style={{ fontFamily: "var(--font-data)" }}>
              {student?.branch || "N/A"} • {student?.semester}
            </p>
          </div>
        </motion.section>

        {/* --- CHALKPAD SYNC --- */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          className="px-5 md:px-8 lg:px-12 py-10 pb-10 border-b border-line"
        >
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="flex flex-col gap-2">
              <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary">
                INTEGRATION
              </span>
              <h2 className="text-title-strong font-bold text-ink-v2">
                Chalkpad Sync
              </h2>
            </div>

            {/* Connected view (only shown if we aren't displaying the reconnect/change form) */}
            {isConnected && !showForm && phase === "idle" && (
              <div className="flex flex-col gap-6 border border-line p-6 bg-surface-v2">
                <div className="flex flex-col gap-1">
                  <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary">
                    LAST SYNC
                  </span>
                  <span className="text-body-strong font-bold text-ink-v2" style={{ fontFamily: "var(--font-data)" }}>
                    {lastSynced ? new Date(lastSynced).toLocaleString() : "Never"}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary">
                    STATUS
                  </span>
                  {syncStatus === "error" ? (
                    <span className="text-body-strong font-bold text-danger flex items-center gap-2">
                      {syncMeta.error ?? "Sync error"}
                    </span>
                  ) : syncStatus === "synced" ? (
                    <span className="text-body-strong font-bold text-safe flex items-center gap-2">
                      Up to date
                    </span>
                  ) : (
                    <span className="text-body-strong font-bold text-ink-secondary flex items-center gap-2">
                      Ready to sync
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    onClick={() => submitSessionToken()}
                    className="px-6 py-3 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:bg-ink-secondary transition-colors"
                  >
                    SYNC NOW
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
              </div>
            )}

            {/* Syncing or OTP active view */}
            {phase === "syncing" && (
              <div className="flex flex-col gap-6 border border-line p-6 bg-surface-v2 justify-center items-center">
                <div className="w-6 h-6 rounded-full border-2 border-ink-v2 border-t-transparent animate-spin" />
                <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">SYNCING...</span>
              </div>
            )}

            {phase === "authenticating" && (
              <div className="flex flex-col gap-6 border border-line p-6 bg-surface-v2 justify-center items-center">
                <div className="w-6 h-6 rounded-full border-2 border-ink-v2 border-t-transparent animate-spin" />
                <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">CONNECTING...</span>
              </div>
            )}

            {phase === "verifying" && (
              <div className="flex flex-col gap-6 border border-line p-6 bg-surface-v2 justify-center items-center">
                <div className="w-6 h-6 rounded-full border-2 border-ink-v2 border-t-transparent animate-spin" />
                <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">VERIFYING OTP...</span>
              </div>
            )}

            {phase === "success" && (
              <div className="flex flex-col gap-6 border border-line p-6 bg-surface-v2 justify-center items-center">
                <span className="text-micro font-bold tracking-[0.18em] uppercase text-safe">SYNC COMPLETED</span>
                <button
                    onClick={() => { reset(); setShowForm(false); }}
                    className="px-6 py-3 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:bg-ink-secondary transition-colors"
                  >
                    DONE
                </button>
              </div>
            )}

            {phase === "otp" && (
              <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4 border border-line p-6 bg-surface-v2">
                <p className="text-body-v2 font-bold">Verification Required</p>
                <p className="text-meta text-ink-tertiary">We&apos;ve sent a verification code to your registered contact.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="4-digit OTP"
                  value={otpVal}
                  onChange={(e) => setOtpVal(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary tracking-widest text-center text-xl"
                  autoComplete="one-time-code"
                  required
                />
                {error && <div className="text-meta text-danger">{error}</div>}
                <div className="flex items-center gap-4 mt-2">
                  <button
                    type="submit"
                    disabled={otpVal.length < 4}
                    className="px-6 py-3 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:bg-ink-secondary transition-colors disabled:opacity-50"
                  >
                    VERIFY
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase("idle")}
                    className="px-4 py-3 text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary hover:text-ink-secondary transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}

            {/* Login form (shown when not connected, session expired, or changing account) */}
            {(phase === "idle" || phase === "error") && (!isConnected || showForm) && (
              <form onSubmit={handleSyncSubmit} className="flex flex-col gap-4">
                {isSessionDead && !showForm && (
                  <div className="px-4 py-3 border border-danger bg-danger/10 text-danger font-bold text-meta">
                    Your session has expired. Please connect again.
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Chalkpad Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary"
                  autoComplete="username"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border border-line px-4 py-3 text-body-strong focus:outline-none focus:border-ink-secondary"
                  autoComplete="current-password"
                  required
                />

                <p className="text-meta text-ink-tertiary leading-relaxed">
                  Presynce authenticates with Chalkpad to auto-sync your attendance.
                  Your password is never stored on disk.
                </p>

                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    type="submit"
                    disabled={!username || !password}
                    className="px-6 py-3 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase hover:bg-ink-secondary transition-colors disabled:opacity-50"
                  >
                    CONNECT & SYNC
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); reset(); }}
                      className="px-4 py-3 text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary hover:text-ink-secondary transition-colors"
                    >
                      CANCEL
                    </button>
                  )}
                </div>

                {error && <div className="text-meta text-danger">{error}</div>}
              </form>
            )}
          </div>
        </motion.section>

{/* --- CREDITS --- */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={3}
          className="px-5 md:px-8 lg:px-12 py-10 border-b border-line"
        >
          <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-6 block">
            CREDITS
          </span>

          <div className="max-w-xl flex flex-col gap-3">
            <h2 className="text-[1.5rem] md:text-[1.75rem] font-bold tracking-tight text-ink-v2">
              Special thanks to Pranavi Salwan
            </h2>
            <p className="text-body-v2 text-ink-secondary leading-relaxed">
              Presynce&apos;s design and visual identity were shaped significantly
              by her ideas, feedback, and contribution to its UI direction.
              A large part of what Presynce looks and feels like today would not
              have been possible without her.
            </p>
          </div>
        </motion.section>

        {/* --- DANGER ZONE --- */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={3}
          className="px-5 md:px-8 lg:px-12 py-10"
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
