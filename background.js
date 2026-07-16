// DevLens Background Service Worker

// Enable Chrome's Side Panel to open when the user clicks the extension action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting panel behavior:", error));

// Optional: Log when background service worker is successfully activated
chrome.runtime.onInstalled.addListener(() => {
  console.log("DevLens Background Worker activated successfully.");
});
