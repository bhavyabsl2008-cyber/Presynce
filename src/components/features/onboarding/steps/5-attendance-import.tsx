import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { scanChalkpad, OCRResult } from "@/lib/chalkpad-import/ocr";
import { Subject } from "@/domain/models";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Merge multiple OCR candidates for the same subject.
 *
 * Rules:
 * - If all candidates agree on delivered/attended/dl, pick the highest confidence.
 * - If candidates conflict, prefer the one whose (attended+dl)/delivered most closely
 *   matches the extracted percentage. If still tied, flag needsReview=true.
 * - Never silently pick max(delivered) — that can elevate garbage values.
 */
function mergeSubjectCandidates(candidates: OCRResult[]): OCRResult {
  if (candidates.length === 1) return candidates[0];

  const allAgree =
    candidates.every((c) => c.delivered === candidates[0].delivered) &&
    candidates.every((c) => c.attended  === candidates[0].attended)  &&
    candidates.every((c) => c.dl        === candidates[0].dl);

  if (allAgree) {
    // All agree — pick highest confidence
    return candidates.reduce((best, c) =>
      c.confidence > best.confidence ? c : best
    );
  }

  // Conflict: score each candidate by how well (attended+dl)/delivered matches its pct
  // We don't store pct in OCRResult, so use internal consistency as proxy:
  // prefer candidates where needsReview is false (passed all checks)
  const clean = candidates.filter((c) => !c.needsReview && c.delivered > 0);
  if (clean.length === 1) return { ...clean[0], needsReview: false };
  if (clean.length > 1) {
    // Multiple clean candidates with different values — flag for review, pick highest conf
    const best = clean.reduce((b, c) => c.confidence > b.confidence ? c : b);
    return { ...best, needsReview: true };
  }

  // All candidates have issues — flag for review, pick highest confidence
  const best = candidates.reduce((b, c) => c.confidence > b.confidence ? c : b);
  return { ...best, needsReview: true };
}

export function StepAttendanceImport({
  subjects,
  onComplete,
  onSkip,
}: {
  subjects: Subject[];
  onComplete: (results: OCRResult[]) => void;
  onSkip: () => void;
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning]     = useState(false);
  const [scanStage, setScanStage]       = useState<"idle" | "align" | "scan" | "resolve" | "review">("idle");
  const [progress, setProgress]         = useState(0);
  const [detectedRecords, setDetectedRecords] = useState<OCRResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    setImagePreview(URL.createObjectURL(validFiles[0]));
    setIsScanning(true);

    try {
      setScanStage("align");
      await new Promise((r) => setTimeout(r, 800));
      setScanStage("scan");

      // Collect all raw OCR results across all images
      const allRaw: OCRResult[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        if (i > 0) setImagePreview(URL.createObjectURL(file));

        const results = await scanChalkpad(
          file,
          (m) => {
            if (m.status === "recognizing text") {
              setProgress(Math.round(((i * 100) + m.progress * 100) / validFiles.length));
            }
          },
          subjects.map((s) => ({ code: s.code, name: s.name })),
        );

        allRaw.push(...results);
      }

      setScanStage("resolve");

      // Group raw results by canonical subject code, then merge
      const mergedRecords: OCRResult[] = subjects.map((sub) => {
        const normSubName = norm(sub.name);

        const candidates = allRaw.filter(
          (r) =>
            r.code === sub.code ||
            norm(r.name).includes(normSubName) ||
            normSubName.includes(norm(r.name)),
        );

        if (candidates.length > 0) {
          const merged = mergeSubjectCandidates(candidates);
          return {
            ...merged,
            code: sub.code, // always use canonical code
            name: sub.name,
          };
        }

        // No OCR result for this subject
        return {
          code: sub.code,
          name: sub.name,
          delivered: 0,
          attended: 0,
          dl: 0,
          dataAsOf: null,
          confidence: 0,
          needsReview: true,
        };
      });

      setTimeout(() => {
        setDetectedRecords(mergedRecords);
        setScanStage("review");
      }, 1200);
    } catch (e) {
      console.error(e);
      setScanStage("idle");
      setTimeout(() => {
        setIsScanning(false);
        setImagePreview(null);
      }, 3000);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files?.length > 0) processFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (e.clipboardData?.files?.length) processFiles(e.clipboardData.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up global paste handler for this step
  useState(() => {
    const fn = (e: globalThis.ClipboardEvent) => handlePaste(e as unknown as ClipboardEvent);
    window.addEventListener("paste", fn);
    return () => window.removeEventListener("paste", fn);
  });

  const updateRecord = (code: string, field: "attended" | "delivered" | "dl", val: number) => {
    setDetectedRecords((prev) =>
      prev.map((r) => (r.code === code ? { ...r, [field]: Math.max(0, val), needsReview: false } : r)),
    );
  };

  // ── REVIEW SCREEN ─────────────────────────────────────────────────────────
  if (scanStage === "review") {
    const detectedCount = detectedRecords.filter((r) => r.delivered > 0).length;

    return (
      <div className="flex flex-col w-full max-w-4xl mx-auto mt-12 min-h-[60vh]">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-6"
        >
          STEP 4: WORKSPACE REVIEW
        </motion.span>

        <div className="mb-8">
          <h2 className="text-section-title font-bold uppercase tracking-widest text-ink-v2 mb-2">
            Verify Imported Data
          </h2>
          <p className="text-meta font-bold tracking-[0.1em] uppercase text-ink-secondary">
            {detectedCount} SUBJECTS DETECTED
          </p>
        </div>

        <div className="grid gap-4">
          {detectedCount === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-line bg-paper text-center">
              <div className="w-12 h-12 mb-4 text-ink-tertiary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c?.77-1.333-2.694-1.333-3.464 0L3.34 16c?.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-body-strong font-bold text-ink-v2 mb-2">NO SUBJECTS DETECTED</span>
              <span className="text-body-v2 text-ink-tertiary max-w-sm">
                OCR could not read attendance values from the image. Check the browser console for debug output, or enter values manually.
              </span>
            </div>
          ) : (
            detectedRecords.map((record) => {
              const sub = subjects.find((s) => s.code === record.code);
              // Portal attended EXCLUDES DL — show both, compute effective
              const effectiveAttended = record.attended + record.dl;
              const pct =
                record.delivered > 0
                  ? ((effectiveAttended / record.delivered) * 100).toFixed(2)
                  : "0.00";

              const hasIssue = record.needsReview || record.delivered === 0;

              return (
                <div
                  key={record.code}
                  className={`flex flex-col gap-6 p-6 border bg-paper ${hasIssue ? "border-caution/60" : "border-line"
                  }`}
                >
                  {/* Header */}
                  <div className="flex flex-col">
                    <span className="text-body-strong font-bold text-ink-v2">
                      {sub?.name || record.name}
                    </span>
                    <span className="text-meta font-bold tracking-[0.1em] uppercase text-ink-secondary">
                      {record.code}
                    </span>
                    {hasIssue && (
                      <span className="text-micro font-bold tracking-[0.18em] uppercase text-caution mt-2">
                        {record.delivered === 0 ? "NOT DETECTED — ENTER MANUALLY"
                          : `NEEDS REVIEW (${Math.round(record.confidence)}% CONFIDENCE)`}
                      </span>
                    )}
                    {record._debug && record._debug.validationErrors.length > 0 && (
                      <span className="text-micro font-mono text-caution/70 mt-1">
                        {record._debug.validationErrors.join(" A ")}
                      </span>
                    )}
                  </div>

                  {/* Editable fields */}
                  <div className="flex flex-wrap items-end gap-8">
                    {/* Delivered */}
                    <div className="flex flex-col items-center">
                      <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-2">
                        DELIVERED
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateRecord(record.code, "delivered", record.delivered - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold tabular-nums w-8 text-center text-body-strong">
                          {record.delivered}
                        </span>
                        <button
                          onClick={() => updateRecord(record.code, "delivered", record.delivered + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Portal Attended (excludes DL) */}
                    <div className="flex flex-col items-center">
                      <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-2">
                        ATTENDED
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateRecord(record.code, "attended", record.attended - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold tabular-nums w-8 text-center text-body-strong">
                          {record.attended}
                        </span>
                        <button
                          onClick={() => updateRecord(record.code, "attended", record.attended + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* DL */}
                    <div className="flex flex-col items-center">
                      <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-2">
                        DL
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateRecord(record.code, "dl", record.dl - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold tabular-nums w-8 text-center text-body-strong">
                          {record.dl}
                        </span>
                        <button
                          onClick={() => updateRecord(record.code, "dl", record.dl + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-line hover:border-ink-secondary font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Derived effective summary */}
                    <div className="flex flex-col items-start ml-auto">
                      <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-2">
                        EFFECTIVE
                      </span>
                      <span className="font-bold tabular-nums text-body-strong">
                        {effectiveAttended} / {record.delivered}
                      </span>
                      <span className="text-meta font-bold tabular-nums text-ink-secondary">
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end mt-12">
          <button
            onClick={() => onComplete(detectedRecords)}
            className="px-8 py-4 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase transition-opacity hover:opacity-90"
          >
            CONFIRM &amp; FINISH
          </button>
        </div>
      </div>
    );
  }

  // ── UPLOAD / SCAN SCREEN ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto mt-12 min-h-[60vh]">
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-12"
      >
        STEP 3: ATTENDANCE IMPORT
      </motion.span>

      <AnimatePresence mode="wait">
        {!isScanning ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center border border-dashed border-ink-tertiary hover:border-ink-v2 transition-colors bg-surface-v2 p-16 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.length) processFiles(e.target.files);
              }}
            />
            <div className="w-12 h-12 mb-6 text-ink-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <span className="font-bold text-ink-v2 text-body-strong mb-2">
              Upload University Portal Screenshots
            </span>
            <span className="text-body-v2 text-ink-tertiary">
              Drag &amp; drop multiple images, browse, or paste
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center relative w-full h-[400px] bg-ink-v2 overflow-hidden"
          >
            {imagePreview && (
              <motion.img
                src={imagePreview}
                alt="Screenshot"
                className="absolute inset-0 w-full h-full object-contain opacity-40 mix-blend-screen"
                initial={{ scale: 1.05, opacity: 0 }}
                animate={
                  scanStage === "align"
                    ? { scale: 1, opacity: 0.4 }
                    : { scale: 1, opacity: 0.8 }
                }
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            )}

            <AnimatePresence>
              {scanStage === "scan" && (
                <motion.div
                  initial={{ top: "-10%" }}
                  animate={{ top: "110%" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                  className="absolute w-full h-1/2 bg-gradient-to-b from-transparent to-threshold/20 border-b border-threshold/50 z-10"
                />
              )}
            </AnimatePresence>

            <div className="z-20 flex flex-col items-center bg-ink-v2/90 px-8 py-6 backdrop-blur-md border border-line/20 text-paper min-w-[240px]">
              <div className="flex flex-col items-center w-full">
                <span className="text-micro font-bold tracking-[0.18em] uppercase mb-4 text-ink-tertiary">
                  {scanStage === "align"   && "Aligning Frame"}
                  {scanStage === "scan"    && "Scanning"}
                  {scanStage === "resolve" && "Resolving Subjects"}
                </span>

                <div className="w-full h-1 bg-ink-tertiary/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-threshold"
                    initial={{ width: "0%" }}
                    animate={{
                      width:
                        scanStage === "align"
                          ? "10%"
                          : scanStage === "resolve"
                          ? "100%"
                          : `${10 + progress * 0.8}%`,
                    }}
                    transition={{ ease: "easeOut", duration: 0.2 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isScanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-between items-center mt-12 w-full"
        >
          <button
            onClick={onSkip}
            className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary hover:text-ink-v2 transition-colors"
          >
            SKIP (FRESH START)
          </button>
          <button
            onClick={() => {
              setDetectedRecords(
                subjects.map((sub) => ({
                  code: sub.code,
                  name: sub.name,
                  delivered: 0,
                  attended: 0,
                  dl: 0,
                  confidence: 100,
                  needsReview: false,
                  dataAsOf: new Date().toISOString().split("T")[0],
                })),
              );
              setScanStage("review");
            }}
            className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary hover:text-ink-v2 transition-colors"
          >
            SKIP &amp; ENTER MANUALLY
          </button>
        </motion.div>
      )}
    </div>
  );
}
