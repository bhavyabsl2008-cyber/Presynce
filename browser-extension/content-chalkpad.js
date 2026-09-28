// content-chalkpad.js
// Runs on: https://quiet.codebrigade.in/chalkpadpro/studentDetails/display
//
// Responsibilities:
//   1. Detect and wait for the rendered attendance table.
//   2. Extract data via header-driven column mapping.
//   3. Normalize the payload (subjectCode, subjectName, delivered, attended, dl, ml, dataAsOf).
//   4. Write to chrome.storage.local under "presynce_pending_sync".
//   5. Does NOT capture passwords, cookies, tokens, or session credentials.
//   6. Does NOT perform Presynce business logic — that is SyncEngine's job.

(function extractChalkpadAttendance() {
  "use strict";

  const STORAGE_KEY = "presynce_pending_sync";
  const MAX_WAIT_MS = 10000;   // wait up to 10 s for dynamic table render
  const POLL_INTERVAL_MS = 500;

  // ── Column header synonyms ──────────────────────────────────────────────────
  const COL = {
    code:      ["subject code", "code", "course code"],
    name:      ["subject name", "subject", "course name", "course"],
    delivered: ["delivered", "held", "total lectures", "total classes"],
    attended:  ["attended", "present"],
    dl:        ["dl", "duty leave", "duty"],
    ml:        ["ml", "medical leave", "medical"],
    percentage:["%age", "percentage", "attendance %", "%"],
  };

  function normalise(str) {
    return str.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function matchHeader(header, synonyms) {
    const n = normalise(header);
    return synonyms.some(s => n === s || n.includes(s));
  }

  /** Build a column-index map from the table's <th> row. */
  function buildHeaderMap(table) {
    const headerRow = table.querySelector("tr");
    if (!headerRow) return null;

    const cells = Array.from(headerRow.querySelectorAll("th, td"));
    if (cells.length === 0) return null;

    const map = {};
    cells.forEach((cell, idx) => {
      const text = cell.textContent || "";
      for (const [key, synonyms] of Object.entries(COL)) {
        if (matchHeader(text, synonyms)) {
          map[key] = idx;
        }
      }
    });

    // Must have at least subject name + delivered + attended
    if (map.name === undefined || map.delivered === undefined || map.attended === undefined) {
      return null;
    }
    return map;
  }

  /** Extract a non-negative integer from a cell, or null on failure. */
  function extractInt(text) {
    const t = (text || "").trim();
    if (!/^\d+$/.test(t)) return null;
    const n = parseInt(t, 10);
    return n >= 0 ? n : null;
  }

  /** Find the attendance table and extract rows.
   *  Returns an array of normalised payload objects, or null if table not ready. */
  function tryExtract() {
    const tables = Array.from(document.querySelectorAll("table"));

    for (const table of tables) {
      const map = buildHeaderMap(table);
      if (!map) continue;

      const rows = Array.from(table.querySelectorAll("tr")).slice(1); // skip header row
      if (rows.length === 0) continue;

      const results = [];
      const today = new Date().toISOString().split("T")[0];

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td, th")).map(c => (c.textContent || "").trim());
        if (cells.length === 0) continue;

        const subjectName = map.name !== undefined ? (cells[map.name] || "").trim() : "";
        if (!subjectName) continue;  // skip blank rows

        const delivered = map.delivered !== undefined ? extractInt(cells[map.delivered]) : null;
        const attended  = map.attended  !== undefined ? extractInt(cells[map.attended])  : null;
        const dl        = map.dl        !== undefined ? (extractInt(cells[map.dl]) ?? 0) : 0;
        const ml        = map.ml        !== undefined ? (extractInt(cells[map.ml]) ?? 0) : 0;
        const subjectCode = map.code    !== undefined ? (cells[map.code] || "").trim()   : undefined;

        if (delivered === null || attended === null) continue;  // can't validate without these
        if (attended + dl > delivered) continue;               // sanity: can't attend more than delivered

        // Calculate percentage from raw values (do not trust scraped %)
        const percentage = delivered > 0
          ? parseFloat(((attended + dl) / delivered * 100).toFixed(2))
          : 0;

        results.push({
          subjectName,
          subjectCode: subjectCode || undefined,
          delivered,
          attended,
          dl,
          ml,
          percentage,
          dataAsOf: today,
          source: "Chalkpad",
        });
      }

      if (results.length > 0) {
        return results;
      }
    }

    return null;  // table not ready yet
  }

  /** Deduplicate: if same dataAsOf + same values exist in storage, skip write. */
  function shouldWrite(incoming, existing) {
    if (!existing || !Array.isArray(existing.payloads)) return true;
    if (incoming.dataAsOf > existing.dataAsOf) return true;  // newer snapshot
    if (incoming.dataAsOf < existing.dataAsOf) return false; // stale; existing is fresher

    // Same dataAsOf: compare payload arrays by value
    const inKeys = JSON.stringify(incoming.payloads.map(p => [p.subjectName, p.attended, p.dl, p.delivered]));
    const exKeys = JSON.stringify(existing.payloads.map(p => [p.subjectName, p.attended, p.dl, p.delivered]));
    return inKeys !== exKeys;
  }

  /** Main extraction loop — polls until table appears or timeout. */
  function run() {
    let elapsed = 0;

    const poll = setInterval(() => {
      const payloads = tryExtract();

      if (payloads) {
        clearInterval(poll);

        const today = new Date().toISOString().split("T")[0];
        const incoming = { payloads, dataAsOf: today, extractedAt: new Date().toISOString(), consumed: false };

        chrome.storage.local.get(STORAGE_KEY, (result) => {
          const existing = result[STORAGE_KEY] || null;

          if (!shouldWrite(incoming, existing)) {
            console.log("[Presynce Bridge] Attendance unchanged — skipping storage write.");
            return;
          }

          chrome.storage.local.set({ [STORAGE_KEY]: incoming }, () => {
            console.log(`[Presynce Bridge] Stored ${payloads.length} subject(s) for Presynce.`);
          });
        });
      } else {
        elapsed += POLL_INTERVAL_MS;
        if (elapsed >= MAX_WAIT_MS) {
          clearInterval(poll);
          console.warn("[Presynce Bridge] Attendance table not found within timeout.");
        }
      }
    }, POLL_INTERVAL_MS);
  }

  run();
})();
