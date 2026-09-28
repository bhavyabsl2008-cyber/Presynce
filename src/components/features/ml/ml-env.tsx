"use client";

import { useState, useMemo } from "react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useStore } from "@/store";
import { getScheduledSlotsForDate } from "@/lib/timetable/calendar";
import { format, parseISO, addDays, isAfter, isBefore, isEqual, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TimetableSlot, AttendanceEvent } from "@/domain/models";


interface PreviewDay {
  dateStr: string;
  displayDate: string;
  slots: TimetableSlot[];
}

export function MlEnv() {
  const router = useRouter();
  const { slots, subjects, logAttendance, records, addEvent, events, removeEventAndRecords, updateEvent } = useStore();
  
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const student = useStore((state) => state.student);
  const [name, setName] = useState(student?.name || "");
  const [roll, setRoll] = useState("");
  const [sem, setSem] = useState(student?.semester || "");
  const [disease, setDisease] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [previewData, setPreviewData] = useState<PreviewDay[] | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const workingDays = useMemo(() => {
    try {
      let start = parseISO(startDate);
      let end = parseISO(endDate);
      if (isAfter(start, end)) {
        const temp = start; start = end; end = temp;
      }
      let count = 0;
      let current = start;
      while (isBefore(current, end) || isEqual(current, end)) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current = addDays(current, 1);
      }
      return count;
    } catch {
      return 0;
    }
  }, [startDate, endDate]);

  const daysWarning = workingDays < 5;

  const medicalLeaveEvents = events.filter(e => e.type === "medical_leave");

  const handleApproveEvent = (ev: AttendanceEvent) => {
    let current = parseISO(ev.startDate);
    const end = parseISO(ev.endDate);
    
    while (isBefore(current, end) || isEqual(current, end)) {
      const dateStr = format(current, "yyyy-MM-dd");
      const daySlots = getScheduledSlotsForDate(dateStr, slots, subjects);
      
      daySlots.forEach(slot => {
        logAttendance({
          id: crypto.randomUUID(),
          slotId: slot.id,
          subjectId: slot.subjectId,
          date: dateStr,
          status: "dl",
          timestamp: Date.now(),
          sourceEventId: ev.id
        });
      });
      
      current = addDays(current, 1);
    }
    
    updateEvent({ ...ev, status: "approved" });
  };

  const handleRemoveEvent = (eventId: string) => {
    if (confirm("Are you sure you want to remove this Medical Leave- The associated Duty Leave records will be deleted and your attendance will revert.")) {
      removeEventAndRecords(eventId);
    }
  };

  const handlePreview = () => {
    let start = parseISO(startDate);
    let end = parseISO(endDate);
    
    if (isAfter(start, end)) {
      const temp = start;
      start = end;
      end = temp;
      setStartDate(format(start, "yyyy-MM-dd"));
      setEndDate(format(end, "yyyy-MM-dd"));
    }

    
    

  
    const newPreview: PreviewDay[] = [];
    let current = start;

    while (isBefore(current, end) || isEqual(current, end)) {
      const dateStr = format(current, "yyyy-MM-dd");
      const daySlots = getScheduledSlotsForDate(dateStr, slots, subjects);
      
      if (daySlots.length > 0) {
        newPreview.push({
          dateStr,
          displayDate: format(current, "EEE, dd MMM yyyy"),
          slots: daySlots
        });
      }
      
      current = addDays(current, 1);
    }

    setPreviewData(newPreview);
    setConfirmReplace(false);
  };

  const handleApply = () => {
    if (!previewData) return;
    setIsApplying(true);
    
    setTimeout(() => {
      const eventId = crypto.randomUUID();
      const event: AttendanceEvent = {
        id: eventId,
        type: "medical_leave",
        startDate,
        endDate,
        createdAt: Date.now(),
        status: "pending"
      };
      
      addEvent(event);
      setIsApplying(false);
      setShowDocument(true);
    }, 400);
  };

  let totalClasses = 0;
  let replaceCount = 0;
  let dlCount = 0;

  if (previewData) {
    previewData.forEach(day => {
      day.slots.forEach(slot => {
        totalClasses++;
        const existing = records.find(r => r.slotId === slot.id && r.date === day.dateStr);
        if (existing) {
          if (existing.status === "dl") {
            dlCount++;
          } else if (existing.status === "present" || existing.status === "absent") {
            replaceCount++;
          }
        }
      });
    });
  }

  if (showDocument) {
    const formatDate = (val: string) => {
      if (!val) return "________________";
      const d = new Date(val + "T00:00:00");
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    };
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    return (
      <div className="bg-white min-h-screen text-black print:bg-white print:m-0 print:p-0" style={{ fontFamily: '"Times New Roman", serif' }}>
        <div className="print:hidden fixed top-0 left-0 right-0 bg-ink-v2 text-white p-4 flex justify-between items-center z-50">
          <span className="text-body-strong font-bold">Medical Leave Form Generated</span>
          <div className="flex gap-4">
            <button onClick={() => window.print()} className="px-4 py-2 bg-presynce text-white font-bold rounded">Print / Save PDF</button>
            <button onClick={() => { setShowDocument(false); setPreviewData(null); }} className="px-4 py-2 bg-surface-v2 text-ink-v2 font-bold rounded hover:bg-white">Done</button>
          </div>
        </div>
        <div className="max-w-[700px] mx-auto pt-24 pb-20 print:pt-8 print:pb-8 text-[14px] leading-[1.8] px-8">
          <p className="font-bold">To,</p>
          <p className="font-bold">Dean<br/>Department of Computer Science &amp; Engineering<br/>Chitkara University Institute of Engineering &amp; Technology,<br/>Punjab</p>
          <br/>
          <p>Through,<br/>Dr./Ms./Mr. <span className="inline-block border-b border-black min-w-[220px]">&nbsp;</span> (Mentor)<br/>Department of Computer Science &amp; Engineering<br/>Chitkara University Institute of Engineering &amp; Technology,<br/>Punjab</p>
          <br/>
          <p>Date: {today}</p>
          <br/>
          <p className="font-bold">Subject: Request for Medical Leave</p>
          <br/>
          <p>Dear Sir/Madam,</p>
          <p>
            This is to request you to kindly grant my ward <span className="font-bold">{name || "________________"}</span>, 
            University Roll No. <span className="font-bold">{roll || "________________"}</span>, Sem <span className="font-bold">{sem || "________________"}</span>, 
            Medical Leave from <span className="font-bold">{formatDate(startDate)}</span> to <span className="font-bold">{formatDate(endDate)}</span>. 
            He/She is suffering from <span className="font-bold">{disease || "________________"}</span>.
          </p>
          <p className="mt-4">I hope you will consider my request. The medical certificate is attached herewith.</p>
          
          <div className="mt-[60px]">
            <p className="font-bold">Yours truly,</p>
            <p className="font-bold mt-12">(Signature of Parent/Guardian)</p>
            <p className="font-bold mt-2">{parentName || "________________"}</p>
            <p className="font-bold">Mobile No.: {parentMobile || "________________"}</p>
          </div>
          
          <div className="mt-[60px] border-t-2 border-black pt-4">
            <p className="font-bold underline mb-4">For Office Use</p>
            <p className="font-bold">Mentor's Remarks: ______________________________________________</p>
            <br/><br/>
            <div className="flex justify-between font-bold">
              <p>Signature of Mentor</p>
              <p>Dated: ____________</p>
            </div>
            <p className="font-bold mt-4">(Full Name)</p>
          </div>
        </div>
      </div>
    );
  }

  const needsConfirmation = replaceCount > 0;
  const canApply = !needsConfirmation || confirmReplace;

  return (
    <PageShell>
      <div className="flex-1 flex flex-col p-6 md:p-8 bg-bg max-w-4xl mx-auto w-full">
        <header className="mb-10">
          <Link href="/semester" className="inline-flex items-center gap-2 text-micro font-bold tracking-[0.14em] uppercase text-ink-secondary hover:text-ink-v2 transition-colors mb-6">
            <span aria-hidden>&larr;</span>
            <span>Back to Semester</span>
          </Link>
          <h1 className="text-section-title font-bold uppercase tracking-widest text-ink-v2">
            MEDICAL LEAVE
          </h1>
          <p className="text-body-v2 text-ink-secondary mt-2">
            Apply the existing Presynce DL/attendance-adjustment mechanism to a selected date range. Only scheduled classes will be affected. Note: This tool calculates the attendance impact but does not represent official university approval.
          </p>
        </header>

        <section className="mb-10 p-6 md:p-8 bg-surface-v2/50 border border-line">
          <h2 className="text-micro font-bold tracking-[0.18em] uppercase text-ink-v2 mb-6">MEDICAL LEAVE RULES</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary mb-2">1. ELIGIBILITY</h3>
              <ul className="list-disc pl-5 space-y-1 text-body-v2 text-ink-tertiary">
                <li>Minimum 5 working days of medical leave are required for a valid Medical Leave application.</li>
                <li>If the requested period is shorter than 5 working days, clearly warn the user that it does not satisfy the documented ML requirement.</li>
                <li>The 5-working-day requirement is based on the mentor guidance currently documented in Presynce. Do not falsely present it as text printed on the official application form.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary mb-2">2. REQUIRED DOCUMENTS</h3>
              <ul className="list-disc pl-5 space-y-1 text-body-v2 text-ink-tertiary">
                <li>Medical certificate from the doctor consulted.</li>
                <li>Signed Medical Leave application.</li>
                <li>Any other supporting documentation required by the department/mentor should be confirmed with the mentor rather than invented by Presynce.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary mb-2">3. WHO SIGNS</h3>
              <ul className="list-disc pl-5 space-y-1 text-body-v2 text-ink-tertiary">
                <li>The application is signed by the student&apos;s parent/guardian.</li>
                <li>The student fills the student/application details.</li>
                <li>The Mentor handles the mentor remarks/signature portion.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary mb-2">4. WHERE IT GOES</h3>
              <ul className="list-disc pl-5 space-y-1 text-body-v2 text-ink-tertiary">
                <li>The application is addressed to the Dean, Department of CSE.</li>
                <li>It is submitted THROUGH the student&apos;s Mentor.</li>
                <li>The Mentor&apos;s remarks/signature are part of the processing flow.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary mb-2">5. WHAT PRESYNCE DOES</h3>
              <ul className="list-disc pl-5 space-y-1 text-body-v2 text-ink-tertiary">
                <li>Calculates which scheduled classes fall inside the selected ML period.</li>
                <li>Shows the affected classes before applying the attendance effect.</li>
                <li>Calculates/projects the resulting attendance impact.</li>
                <li>Keeps the leave information distinguishable from ordinary attendance and Duty Leave.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary mb-2">6. WHAT PRESYNCE DOES NOT DO</h3>
              <ul className="list-disc pl-5 space-y-1 text-body-v2 text-ink-tertiary">
                <li>Presynce does NOT approve Medical Leave.</li>
                <li>Generating the application does NOT mean the university has approved it.</li>
                <li>The actual approval/processing remains with the university/department/mentor.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary mb-2">7. ATTENDANCE EFFECT</h3>
              <ul className="list-disc pl-5 space-y-1 text-body-v2 text-ink-tertiary">
                <li>Once Medical Leave is actually approved, the affected scheduled classes should receive the appropriate excused-attendance effect.</li>
                <li>ML must remain distinguishable from DL in the underlying data and UI even if both contribute to effective attendance.</li>
                <li>Do not double-count ML.</li>
              </ul>
            </div>
          </div>
        </section>


        {medicalLeaveEvents.length > 0 && (
          <section className="mb-8 border border-line bg-surface-v2 p-6">
            <h2 className="text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary mb-4">Active Medical Leaves</h2>
            <div className="flex flex-col gap-3">
              {medicalLeaveEvents.map(ev => (
                <div key={ev.id} className="flex items-center justify-between bg-paper border border-line p-4">
                  <div>
                    <div className="text-body-strong font-bold text-ink-v2">
                      {format(parseISO(ev.startDate), "MMM d, yyyy")} - {format(parseISO(ev.endDate), "MMM d, yyyy")}
                    </div>
                    <div className="text-meta text-ink-secondary mt-1">
                      Applied {format(ev.createdAt, "MMM d, h:mm a")}
                    </div>
                    <span className={`inline-block mt-2 text-micro font-bold uppercase tracking-widest ${ev.status === 'pending' ? 'text-caution' : 'text-safe'}`}>
                      {ev.status === 'pending' ? 'PENDING APPROVAL' : 'APPROVED'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {(!ev.status || ev.status === 'pending') && (
                      <button 
                        onClick={() => handleApproveEvent(ev)}
                        className="text-micro font-bold tracking-[0.1em] uppercase text-presynce hover:underline"
                      >
                        Approve & Record
                      </button>
                    )}
                    <button 
                      onClick={() => handleRemoveEvent(ev.id)}
                      className="text-micro font-bold tracking-[0.1em] uppercase text-danger hover:underline"
                    >
                      {ev.status === 'pending' ? 'Delete' : 'Delete & Revert'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

                <section className="bg-paper border border-line p-6 md:p-8 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <label className="flex-1 flex flex-col gap-2">
              <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">Start Date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-line bg-surface-v2 p-4 font-bold tabular-nums text-ink-v2 outline-none focus:border-presynce" />
            </label>
            <label className="flex-1 flex flex-col gap-2">
              <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">End Date</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-line bg-surface-v2 p-4 font-bold tabular-nums text-ink-v2 outline-none focus:border-presynce" />
            </label>
          </div>

          <div className="border-t border-line pt-8 mb-8">
            <h3 className="text-meta font-bold text-ink-secondary uppercase tracking-widest mb-4">Application Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" placeholder="Illness / reason" value={disease} onChange={(e) => setDisease(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce sm:col-span-2" />
              <input type="text" placeholder="Student name" value={name} onChange={(e) => setName(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
              <input type="text" placeholder="Roll number" value={roll} onChange={(e) => setRoll(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
              <input type="text" placeholder="Semester (e.g. 3rd)" value={sem} onChange={(e) => setSem(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
              <div className="hidden sm:block"></div>
              <input type="text" placeholder="Parent/Guardian Name" value={parentName} onChange={(e) => setParentName(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
              <input type="tel" placeholder="Parent/Guardian Mobile" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
            </div>
          </div>
          
          {daysWarning && (
            <div className="mb-6 p-4 border border-caution-border bg-caution-soft/30 text-caution font-medium text-meta uppercase tracking-wider leading-relaxed">
              WARNING: YOUR SELECTION IS {workingDays} WORKING DAY{workingDays === 1 ? "" : "S"}.<br/>
              A VALID MEDICAL LEAVE APPLICATION REQUIRES A MINIMUM OF 5 WORKING DAYS.
            </div>
          )}
          <button onClick={handlePreview} className="w-full py-4 bg-ink-v2 text-paper font-bold tracking-[0.14em] uppercase text-micro hover:opacity-90 transition-opacity">
            Preview Affected Classes
          </button>
        </section>

        <AnimatePresence>
          {previewData && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-section-title font-bold uppercase tracking-widest text-ink-v2">
                  Preview & Confirm
                </h2>
                <div className="flex items-center gap-3">
                  {replaceCount > 0 && (
                    <span className="text-meta font-bold tracking-[0.1em] uppercase text-danger bg-danger-soft px-3 py-1 rounded-full">
                      {replaceCount} to replace
                    </span>
                  )}
                  <span className="text-meta font-bold tracking-[0.1em] uppercase text-presynce bg-presynce-soft px-3 py-1 rounded-full">
                    {totalClasses} Affected
                  </span>
                </div>
              </div>

              {previewData.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-line bg-surface-v2">
                  <p className="text-body-strong font-bold text-ink-tertiary">No classes scheduled in this range.</p>
                  <p className="text-meta text-ink-tertiary mt-2">Holidays and weekends without timetabled classes are safely skipped.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {previewData.map(day => (
                    <div key={day.dateStr} className="border border-line bg-paper">
                      <div className="bg-surface-v2 px-5 py-3 border-b border-line">
                        <span className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary">
                          {day.displayDate}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        {day.slots.map((slot, i) => {
                          const sub = subjects.find(s => s.id === slot.subjectId);
                          const existing = records.find(r => r.slotId === slot.id && r.date === day.dateStr);
                          
                          let statusNode = null;
                          if (!existing || existing.status === "cancelled") {
                            statusNode = <span className="text-micro font-bold tracking-[0.1em] uppercase text-safe">+ ML / DL</span>;
                          } else if (existing.status === "dl") {
                            statusNode = <span className="text-micro font-bold tracking-[0.1em] uppercase text-ink-tertiary">Already DL</span>;
                          } else {
                            statusNode = <span className="text-micro font-bold tracking-[0.1em] uppercase text-danger">Will replace {existing.status}</span>;
                          }
                          
                          return (
                            <div key={slot.id} className={`flex items-center justify-between px-5 py-4 ${i !== day.slots.length - 1 ? 'border-b border-line' : ''}`}>
                              <div className="flex items-center gap-4">
                                <span className="text-meta font-bold tabular-nums text-ink-secondary w-28">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                <span className="text-body-strong font-bold text-ink-v2">
                                  {sub?.name || "Unknown"}
                                </span>
                              </div>
                              {statusNode}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {previewData.length > 0 && (
                <div className="mt-4 flex flex-col items-end gap-4 border-t border-line pt-6">
                  {needsConfirmation && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={confirmReplace} 
                        onChange={(e) => setConfirmReplace(e.target.checked)}
                        className="w-5 h-5 accent-danger border-line-strong cursor-pointer"
                      />
                      <span className="text-meta font-bold uppercase tracking-widest text-ink-secondary group-hover:text-danger transition-colors">
                        I acknowledge this will overwrite {replaceCount} existing {replaceCount === 1 ? 'record' : 'records'}
                      </span>
                    </label>
                  )}
                  <button
                    onClick={handleApply}
                    disabled={isApplying || !canApply}
                    className="px-8 py-4 bg-presynce text-paper font-bold tracking-[0.14em] uppercase text-micro hover:opacity-90 transition-opacity disabled:opacity-50 disabled:grayscale"
                  >
                    {isGenerating ? "GENERATING..." : "GENERATE MEDICAL LEAVE FORM"}
                  </button>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}



