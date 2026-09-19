export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

export const CHROME_EXTENSION_FILES: ExtensionFile[] = [
  {
    name: 'manifest.json',
    path: 'manifest.json',
    language: 'json',
    content: `{
  "manifest_version": 3,
  "name": "SDR Shift CRM - Web Dialer Bridge",
  "version": "1.0.0",
  "description": "Automatically hooks into web dialer Call and Hang Up events to log dials and shift timestamps to your local FastAPI SDR CRM at http://127.0.0.1:8000/api/log_call.",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "http://127.0.0.1:8000/*",
    "http://localhost:8000/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "SDR Desktop CRM Bridge"
  }
}`
  },
  {
    name: 'content.js',
    path: 'content.js',
    language: 'javascript',
    content: `/**
 * SDR Shift CRM - Chrome Extension Content Script
 * 
 * Injected into web dialers (Outreach, Salesloft, Dialpad, PhoneBurner, RingCentral, HubSpot, etc.).
 * Listens for "Call" and "Hang Up" events, extracts phone numbers, and sends an immediate
 * JSON POST request to the local FastAPI desktop server at http://127.0.0.1:8000/api/log_call.
 */

(function () {
  const LOCAL_API_URL = "http://127.0.0.1:8000/api/log_call";
  let activeCallStartTime = null;
  let activeCallPhone = null;

  console.log("[SDR Bridge] Content script initialized. Monitoring dialer click events...");

  // Regular expression to match standard US/International phone formats
  const PHONE_REGEX = /(?:\\+?1[-.\\s]?)?\\(?[2-9]\\d{2}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}/;

  /**
   * Dispatches a call event to the local FastAPI bridge
   */
  async function sendCallToDesktopBridge(data) {
    try {
      const response = await fetch(LOCAL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: data.phone_number || "Unknown Number",
          lead_name: data.lead_name || document.title.split("-")[0].trim() || "Web Contact",
          company: data.company || "",
          event_type: data.event_type || "call_started",
          call_duration_seconds: data.duration_seconds || 0,
          disposition: data.disposition || "Dial Initiated (Chrome Extension)",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      const result = await response.json();
      console.log("[SDR Bridge] Successfully synced call to desktop CRM:", result);
      showDesktopBridgeToast(
        data.event_type === "call_ended" ? "Call Finished & Logged" : "Dial Logged to Shift",
        \`\${data.phone_number} • Total Dials: \${result.metrics?.total_dials || "+1"}\`
      );
    } catch (err) {
      console.warn("[SDR Bridge] Could not reach desktop FastAPI server at http://127.0.0.1:8000. Is the SDR Windows app running?", err);
      showDesktopBridgeToast(
        "Desktop Bridge Offline",
        "Make sure your SDR Windows desktop app is running on port 8000.",
        true
      );
    }
  }

  /**
   * Displays an unobtrusive, stylish floating Toast HUD on the active webpage
   */
  function showDesktopBridgeToast(title, subtitle, isError = false) {
    let container = document.getElementById("sdr-desktop-bridge-toast");
    if (!container) {
      container = document.createElement("div");
      container.id = "sdr-desktop-bridge-toast";
      Object.assign(container.style, {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: "999999",
        backgroundColor: "#181825",
        color: "#ffffff",
        border: isError ? "1px solid #ef4444" : "1px solid #38bdf8",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
        borderRadius: "10px",
        padding: "12px 16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        transform: "translateY(20px)",
        opacity: "0",
        pointerEvents: "none",
      });
      document.body.appendChild(container);
    }

    const icon = isError ? "⚠️" : "⚡";
    container.innerHTML = \`
      <div style="font-size: 16px;">\${icon}</div>
      <div>
        <div style="font-weight: 700; color: \${isError ? '#f87171' : '#38bdf8'}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          \${title}
        </div>
        <div style="color: #cbd5e1; font-size: 11px; margin-top: 2px;">
          \${subtitle}
        </div>
      </div>
    \`;

    container.style.transform = "translateY(0)";
    container.style.opacity = "1";

    setTimeout(() => {
      if (container) {
        container.style.opacity = "0";
        container.style.transform = "translateY(20px)";
      }
    }, 3500);
  }

  /**
   * Attempts to extract a phone number from an element or its ancestors/siblings
   */
  function extractPhoneNumberFromElement(el) {
    if (!el) return null;

    if (el.tagName === "A" && el.href && el.href.startsWith("tel:")) {
      return el.href.replace("tel:", "").trim();
    }

    const dataPhone = el.getAttribute("data-phone") || el.getAttribute("data-phone-number") || el.getAttribute("data-tel");
    if (dataPhone) return dataPhone.trim();

    const text = el.innerText || el.textContent || "";
    const match = text.match(PHONE_REGEX);
    if (match) return match[0].trim();

    if (el.parentElement) {
      const parentText = el.parentElement.innerText || "";
      const pMatch = parentText.match(PHONE_REGEX);
      if (pMatch) return pMatch[0].trim();

      const input = el.parentElement.querySelector("input[type='tel'], input[name*='phone'], input[placeholder*='phone']");
      if (input && input.value) return input.value.trim();
    }

    const activeInput = document.querySelector("input[type='tel'], input[name*='phone'], .dialer-input, #phone-number");
    if (activeInput && activeInput.value) {
      const matchInput = activeInput.value.match(PHONE_REGEX);
      if (matchInput) return matchInput[0].trim();
      return activeInput.value.trim();
    }

    return null;
  }

  /**
   * Main Click Interceptor
   */
  document.addEventListener("click", function (event) {
    const target = event.target;
    if (!target) return;

    const button = target.closest("button, a, [role='button'], .btn, [data-action]");
    if (!button) return;

    const btnText = (button.innerText || button.textContent || "").toLowerCase();
    const btnTitle = (button.getAttribute("title") || "").toLowerCase();
    const ariaLabel = (button.getAttribute("aria-label") || "").toLowerCase();
    const classNames = (button.className || "").toString().toLowerCase();
    const allText = \`\${btnText} \${btnTitle} \${ariaLabel} \${classNames}\`;

    const isCallTrigger =
      allText.includes("call") ||
      allText.includes("dial") ||
      allText.includes("start call") ||
      button.getAttribute("data-action") === "call" ||
      button.getAttribute("data-action") === "dial" ||
      button.querySelector("[data-icon='phone'], .fa-phone, .lucide-phone");

    const isHangupTrigger =
      allText.includes("hang up") ||
      allText.includes("end call") ||
      allText.includes("hangup") ||
      allText.includes("disconnect") ||
      button.getAttribute("data-action") === "hangup" ||
      button.getAttribute("data-action") === "end";

    if (isHangupTrigger) {
      const phone = activeCallPhone || extractPhoneNumberFromElement(button) || "Active Prospect";
      const duration = activeCallStartTime ? Math.max(1, Math.round((Date.now() - activeCallStartTime) / 1000)) : 15;

      sendCallToDesktopBridge({
        phone_number: phone,
        event_type: "call_ended",
        duration_seconds: duration,
        disposition: "Call Ended (Web Dialer)",
      });

      activeCallStartTime = null;
      activeCallPhone = null;
      return;
    }

    if (isCallTrigger) {
      const phone = extractPhoneNumberFromElement(button) || extractPhoneNumberFromElement(document.body) || "+1 (555) 000-0000";
      activeCallStartTime = Date.now();
      activeCallPhone = phone;

      sendCallToDesktopBridge({
        phone_number: phone,
        event_type: "call_started",
        duration_seconds: 0,
        disposition: "Dial Initiated (Chrome Extension)",
      });
    }
  }, true);

  window.__sdrBridgeLogCall = function (phone, disposition = "Web Dialer Call", isTransfer = false) {
    sendCallToDesktopBridge({
      phone_number: phone,
      event_type: "call_started",
      disposition: disposition,
      is_live_transfer: isTransfer,
    });
  };
})();`
  },
  {
    name: 'background.js',
    path: 'background.js',
    language: 'javascript',
    content: `/**
 * SDR Shift CRM - Chrome Extension Background Service Worker
 * 
 * Periodically polls http://127.0.0.1:8000/api/status to verify connectivity
 * and updates the extension toolbar badge with live total dials or connection state.
 */

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
      chrome.action.setBadgeBackgroundColor({ color: "#22c55e" }); // Emerald
      chrome.action.setTitle({ title: \`SDR Desktop Bridge: Online (\${dials} dials today)\` });
    } else {
      chrome.action.setBadgeText({ text: "ERR" });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" }); // Amber
    }
  } catch (error) {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" }); // Red
    chrome.action.setTitle({ title: "SDR Desktop Bridge: Offline (Open desktop app)" });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  checkDesktopBridgeStatus();
});

chrome.alarms?.create("sdr_ping_check", { periodInMinutes: 0.5 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === "sdr_ping_check") {
    checkDesktopBridgeStatus();
  }
});

chrome.tabs.onActivated.addListener(() => {
  checkDesktopBridgeStatus();
});`
  },
  {
    name: 'popup.html',
    path: 'popup.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SDR CRM Bridge</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 320px; font-family: -apple-system, sans-serif; background-color: #181825; color: #cdd6f4; padding: 16px; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid #313244; }
    .title { font-size: 13px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
    .status-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 9999px; background-color: #11111b; border: 1px solid #313244; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background-color: #ef4444; }
    .dot.online { background-color: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .stats-card { margin-top: 12px; background-color: #24273a; border: 1px solid #363a4f; border-radius: 8px; padding: 12px; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .stat-box { background-color: #181825; border: 1px solid #313244; border-radius: 6px; padding: 8px; text-align: center; }
    .stat-val { font-size: 18px; font-weight: 800; color: #38bdf8; font-family: monospace; }
    .stat-lbl { font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-top: 2px; }
    .api-url { margin-top: 12px; background-color: #11111b; border: 1px solid #313244; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 11px; color: #a6adc8; display: flex; justify-content: space-between; align-items: center; }
    .btn { width: 100%; margin-top: 10px; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; border: none; }
    .btn-test { background-color: #4f46e5; color: #ffffff; }
    .btn-refresh { background-color: #313244; color: #cdd6f4; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title"><span>⚡</span><span>SDR CRM Bridge</span></div>
    <div class="status-badge"><span class="dot" id="status-dot"></span><span id="status-text">Checking...</span></div>
  </div>
  <div class="stats-card">
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-val" id="val-dials">--</div><div class="stat-lbl">Today's Dials</div></div>
      <div class="stat-box"><div class="stat-val" id="val-transfers" style="color: #4ade80;">--</div><div class="stat-lbl">Live Transfers</div></div>
    </div>
  </div>
  <div class="api-url"><span>Endpoint:</span><span style="color: #38bdf8;">POST /api/log_call</span></div>
  <button class="btn btn-test" id="btn-test-call">📞 Send Test Call to Desktop CRM</button>
  <button class="btn btn-refresh" id="btn-refresh">🔄 Ping Desktop Server (8000)</button>
  <script src="popup.js"></script>
</body>
</html>`
  },
  {
    name: 'popup.js',
    path: 'popup.js',
    language: 'javascript',
    content: `const API_BASE = "http://127.0.0.1:8000";

async function pingDesktop() {
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  const dialsEl = document.getElementById("val-dials");
  const transfersEl = document.getElementById("val-transfers");

  text.textContent = "Pinging...";

  try {
    const res = await fetch(\`\${API_BASE}/api/status\`, { method: "GET", cache: "no-cache" });
    if (res.ok) {
      const json = await res.json();
      dot.className = "dot online";
      text.textContent = "Online";
      dialsEl.textContent = json.data?.total_dials ?? "0";
      transfersEl.textContent = json.data?.live_transfers ?? "0";
    } else {
      dot.className = "dot";
      text.textContent = "Error";
    }
  } catch (err) {
    dot.className = "dot";
    text.textContent = "Offline";
    dialsEl.textContent = "0";
    transfersEl.textContent = "0";
  }
}

async function sendTestCall() {
  const btn = document.getElementById("btn-test-call");
  btn.textContent = "⏳ Sending call...";
  btn.disabled = true;

  try {
    const res = await fetch(\`\${API_BASE}/api/log_call\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: "+1 (555) 789-0123",
        lead_name: "Chrome Extension Test Lead",
        company: "Acme Web Corp",
        event_type: "call_started",
        disposition: "Dial Initiated (Chrome Extension Test)",
        call_duration_seconds: 0
      })
    });

    if (res.ok) {
      btn.textContent = "✅ Test Call Sent!";
      setTimeout(() => {
        btn.textContent = "📞 Send Test Call to Desktop CRM";
        btn.disabled = false;
        pingDesktop();
      }, 1500);
    }
  } catch (err) {
    btn.textContent = "❌ Desktop Offline";
    setTimeout(() => {
      btn.textContent = "📞 Send Test Call to Desktop CRM";
      btn.disabled = false;
    }, 2000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  pingDesktop();
  document.getElementById("btn-refresh").addEventListener("click", pingDesktop);
  document.getElementById("btn-test-call").addEventListener("click", sendTestCall);
});`
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    content: `# SDR Shift CRM - Chrome Extension Web Dialer Bridge

A lightweight Manifest V3 Chrome extension that injects into web dialers (such as Outreach, Salesloft, Dialpad, PhoneBurner, RingCentral, HubSpot, Kixie, etc.) and auto-reports dials and shift activity to your local desktop SDR CRM.

## Installation in Chrome / Brave / Edge (30 Seconds)

1. Open your browser and navigate to \`chrome://extensions\`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left toolbar.
4. Select the \`chrome_extension\` directory.
5. The extension is now active! Its badge will show your live daily dial count directly in your browser bar.

## API Payload Specification

\`\`\`http
POST http://127.0.0.1:8000/api/log_call
Content-Type: application/json

{
  "phone_number": "+1 (555) 234-8901",
  "lead_name": "Sarah Jenkins",
  "company": "Apex Logistics",
  "event_type": "call_started",
  "call_duration_seconds": 0,
  "disposition": "Dial Initiated (Chrome Extension)",
  "timestamp": "2026-09-19T19:40:00Z"
}
\`\`\`
`
  }
];
