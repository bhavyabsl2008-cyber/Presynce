document.getElementById("syncBtn").addEventListener("click", () => {
  chrome.storage.local.get("presynceData", (result) => {
    if (result.presynceData && result.presynceData.length > 0) {
      // Base64 encode the payload
      const payloadString = JSON.stringify(result.presynceData);
      const encodedPayload = btoa(payloadString);
      
      // Navigate to Presynce app with the bridge payload in URL
      const targetUrl = `http://localhost:3000/lab?bridge=${encodeURIComponent(encodedPayload)}`;
      
      chrome.tabs.create({ url: targetUrl });
    } else {
      document.getElementById("status").textContent = "No attendance data found. Make sure you are on the Chalkpad attendance page and it has fully loaded.";
    }
  });
});

// Initial check to see if we have data
chrome.storage.local.get("presynceData", (result) => {
  const btn = document.getElementById("syncBtn");
  const status = document.getElementById("status");
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    if (activeTab.url && !activeTab.url.includes("chalkpad.chitkara.edu.in/attendance")) {
       status.textContent = "Please navigate to the Chalkpad attendance page.";
       btn.disabled = true;
    } else if (!result.presynceData || result.presynceData.length === 0) {
       status.textContent = "Please reload the page to detect attendance data.";
    }
  });
});
