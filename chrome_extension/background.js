/**
 * SDR Shift CRM - Chrome Extension Background Service Worker
 * 
 * Periodically polls http://127.0.0.1:8000/api/status to verify connectivity
 * and updates the extension toolbar badge with live total dials or connection state.
 */

const PING_INTERVAL_MS = 15000;

async function checkDesktopBridgeStatus() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/status", {
      method: "GET",
      cache: "no-cache",
    });

    if (response.ok) {
      const data = await response.json();
      const dials = data.data?.total_dials ?? "";
      chrome.action.setBadgeText({ text: dials.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#22c55e" }); // Emerald Green
      chrome.action.setTitle({ title: `SDR Desktop Bridge: Online (${dials} dials today)` });
    } else {
      chrome.action.setBadgeText({ text: "ERR" });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" }); // Amber
    }
  } catch (error) {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" }); // Red
    chrome.action.setTitle({ title: "SDR Desktop Bridge: Offline (Make sure desktop app is open)" });
  }
}

// Initial check & interval
chrome.runtime.onInstalled.addListener(() => {
  checkDesktopBridgeStatus();
});

chrome.alarms?.create("sdr_ping_check", { periodInMinutes: 0.5 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === "sdr_ping_check") {
    checkDesktopBridgeStatus();
  }
});

// Check status on tab activation
chrome.tabs.onActivated.addListener(() => {
  checkDesktopBridgeStatus();
});
