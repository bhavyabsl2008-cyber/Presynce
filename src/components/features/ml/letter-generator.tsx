import { useState } from "react";

export function MlLetterGenerator() {
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [sem, setSem] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [disease, setDisease] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentMobile, setParentMobile] = useState("");

  const handleGenerate = () => {
    const formatDate = (val: string) => {
      if (!val) return "________________";
      const d = new Date(val + "T00:00:00");
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    };

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const win = window.open("", "_blank");
    if (!win) return;

    const htmlContent = '<!DOCTYPE html><html><head><title>Medical Leave Application - ' + (name || "Student") + '</title>' +
    '<style>' +
    'body { font-family: "Times New Roman", serif; max-width: 700px; margin: 40px auto; line-height: 1.8; font-size: 14px; color: #000; }' +
    '.bold { font-weight: bold; }' +
    '.section { margin-bottom: 24px; }' +
    '.signature-block { margin-top: 60px; }' +
    '.office-use { margin-top: 60px; border-top: 2px solid #000; padding-top: 16px; }' +
    '.blank-line { border-bottom: 1px solid #000; display: inline-block; min-width: 220px; }' +
    '@media print { body { margin: 20px; } }' +
    '</style>' +
    '</head><body>' +
    '<p class="bold">To,</p>' +
    '<p class="bold">Dean<br>Department of Computer Science &amp; Engineering<br>Chitkara University Institute of Engineering &amp; Technology,<br>Punjab</p>' +
    '<p>Through,<br>Dr./Ms./Mr. <span class="blank-line">&nbsp;</span> (Mentor)<br>Department of Computer Science &amp; Engineering<br>Chitkara University Institute of Engineering &amp; Technology,<br>Punjab</p>' +
    '<p>Date: ' + today + '</p>' +
    '<p class="bold">Subject: Request for Medical Leave</p>' +
    '<p>Dear Sir/Madam,</p>' +
    '<p>This is to request you to kindly grant my ward <span class="bold">' + (name || "________________") + '</span>,' +
    'University Roll No. <span class="bold">' + (roll || "________________") + '</span>, Sem <span class="bold">' + (sem || "________________") + '</span>,' +
    'Medical Leave from <span class="bold">' + formatDate(fromDate) + '</span> to <span class="bold">' + formatDate(toDate) + '</span>.' +
    'He/She is suffering from <span class="bold">' + (disease || "________________") + '</span>.</p>' +
    '<p>I hope you will consider my request. The medical certificate is attached herewith.</p>' +
    '<div class="signature-block">' +
    '<p class="bold">Yours truly,</p>' +
    '<p class="bold">(Signature of Parent/Guardian)</p>' +
    '<p class="bold">' + (parentName || "________________") + '</p>' +
    '<p class="bold">Mobile No.: ' + (parentMobile || "________________") + '</p>' +
    '</div>' +
    '<div class="office-use">' +
    '<p class="bold" style="text-decoration: underline;">For Office Use</p>' +
    "<p class='bold'>Mentor's Remarks: ______________________________________________</p>" +
    '<br><br>' +
    '<p class="bold">Signature of Mentor &nbsp;&nbsp;&nbsp;&nbsp; Dated: ____________</p>' +
    '<p class="bold">(Full Name)</p>' +
    '</div>' +
    '</body></html>';

    win.document.write(htmlContent);
    win.document.close();
  };

  return (
    <section className="bg-paper border border-line p-6 md:p-8 mt-12">
      <h2 className="text-micro font-bold tracking-[0.18em] uppercase text-ink-v2 mb-2">
        Letter Generator
      </h2>
      <p className="text-body-v2 text-ink-secondary mb-6">
        Generate a printable letter for your mentor/Dean. This is purely a convenience tool and does not guarantee university approval. 
        Always confirm policies with your mentor.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <input type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
        <input type="text" placeholder="University Roll No." value={roll} onChange={(e) => setRoll(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
        <input type="text" placeholder="Semester (e.g. 3rd)" value={sem} onChange={(e) => setSem(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
        <input type="text" placeholder="Illness / reason" value={disease} onChange={(e) => setDisease(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
        
        <div className="flex flex-col">
          <label className="text-micro font-bold text-ink-tertiary uppercase mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
        </div>
        <div className="flex flex-col">
          <label className="text-micro font-bold text-ink-tertiary uppercase mb-1">To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
        </div>

        <input type="text" placeholder="Parent/Guardian Name" value={parentName} onChange={(e) => setParentName(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
        <input type="tel" placeholder="Parent/Guardian Mobile" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} className="border border-line bg-surface-v2 p-3 text-body-strong outline-none focus:border-presynce" />
      </div>

      <button
        onClick={handleGenerate}
        className="px-6 py-3 bg-surface-v2 border border-line text-ink-v2 font-bold tracking-[0.14em] uppercase text-micro hover:bg-paper transition-colors"
      >
        Generate Printable Letter
      </button>
    </section>
  );
}



