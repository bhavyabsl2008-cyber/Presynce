// content.js
// Runs on https://quiet.codebrigade.in/chalkpadpro/studentDetails/display*
console.log("[Presynce Bridge] Content script initialized.");

function extractAttendance() {
  const data = [];
  const today = new Date().toISOString().split("T")[0];

  // Logic to parse the DOM.
  // The actual DOM of Chalkpad is a table. Since I don't have the exact DOM structure, I will use a robust header-driven approach.
  const tables = Array.from(document.querySelectorAll("table"));
  let targetTable = null;
  let headerMap = {};

  for (const table of tables) {
    const headers = Array.from(table.querySelectorAll("th")).map(th => th.textContent.trim().toLowerCase());
    
    // Check if this table has the attendance columns we care about
    const hasSubject = headers.some(h => h.includes("subject") || h.includes("course"));
    const hasDelivered = headers.some(h => h.includes("delivered") || h.includes("held"));
    const hasAttended = headers.some(h => h.includes("attended") || h.includes("present"));
    const hasDl = headers.some(h => h === "dl" || h.includes("duty"));
    
    if (hasSubject && (hasDelivered || hasAttended)) {
      targetTable = table;
      // build header map
      headers.forEach((h, i) => {
        if (h.includes("subject") || h.includes("course")) headerMap["subject"] = i;
        if (h.includes("delivered") || h.includes("held")) headerMap["delivered"] = i;
        if (h.includes("attended") || h.includes("present")) headerMap["attended"] = i;
        if (h === "dl" || h.includes("duty")) headerMap["dl"] = i;
      });
      break;
    }
  }

  if (targetTable) {
    const rows = Array.from(targetTable.querySelectorAll("tr"));
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll("td")).map(td => td.textContent.trim());
      
      const subject = cells[headerMap["subject"]];
      const deliveredStr = cells[headerMap["delivered"]];
      const attendedStr = cells[headerMap["attended"]];
      const dlStr = cells[headerMap["dl"]];
      
      if (subject && deliveredStr) {
        const delivered = parseInt(deliveredStr, 10) || 0;
        const attended = parseInt(attendedStr, 10) || 0;
        const dl = parseInt(dlStr, 10) || 0;
        
        data.push({
          subjectName: subject,
          delivered,
          attended,
          dl,
          dataAsOf: today
        });
      }
    }
  }

  return data;
}

// Store extracted data in local storage
const data = extractAttendance();
if (data.length > 0) {
  chrome.storage.local.set({ presynceData: data }, () => {
    console.log("[Presynce Bridge] Extracted data saved to storage:", data);
  });
}

