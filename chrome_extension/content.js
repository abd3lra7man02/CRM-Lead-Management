/**
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
  const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("[SDR Bridge] Successfully synced call to desktop CRM:", result);
      showDesktopBridgeToast(
        data.event_type === "call_ended" ? "Call Finished & Logged" : "Dial Logged to Shift",
        `${data.phone_number} • Total Dials: ${result.metrics?.total_dials || "+1"}`
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
    container.innerHTML = `
      <div style="font-size: 16px;">${icon}</div>
      <div>
        <div style="font-weight: 700; color: ${isError ? '#f87171' : '#38bdf8'}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${title}
        </div>
        <div style="color: #cbd5e1; font-size: 11px; margin-top: 2px;">
          ${subtitle}
        </div>
      </div>
    `;

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

    // Check tel: href
    if (el.tagName === "A" && el.href && el.href.startsWith("tel:")) {
      return el.href.replace("tel:", "").trim();
    }

    // Check data attributes
    const dataPhone = el.getAttribute("data-phone") || el.getAttribute("data-phone-number") || el.getAttribute("data-tel");
    if (dataPhone) return dataPhone.trim();

    // Check inner text
    const text = el.innerText || el.textContent || "";
    const match = text.match(PHONE_REGEX);
    if (match) return match[0].trim();

    // Check parent or nearby inputs
    if (el.parentElement) {
      const parentText = el.parentElement.innerText || "";
      const pMatch = parentText.match(PHONE_REGEX);
      if (pMatch) return pMatch[0].trim();

      const input = el.parentElement.querySelector("input[type='tel'], input[name*='phone'], input[placeholder*='phone']");
      if (input && input.value) return input.value.trim();
    }

    // Check document for focused dialer input
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

    // Find nearest clickable element (button, a, or div with role button)
    const button = target.closest("button, a, [role='button'], .btn, [data-action]");
    if (!button) return;

    const btnText = (button.innerText || button.textContent || "").toLowerCase();
    const btnTitle = (button.getAttribute("title") || "").toLowerCase();
    const ariaLabel = (button.getAttribute("aria-label") || "").toLowerCase();
    const classNames = (button.className || "").toString().toLowerCase();
    const allText = `${btnText} ${btnTitle} ${ariaLabel} ${classNames}`;

    // 1. Detect "Call" / "Dial" Button Click
    const isCallTrigger =
      allText.includes("call") ||
      allText.includes("dial") ||
      allText.includes("start call") ||
      button.getAttribute("data-action") === "call" ||
      button.getAttribute("data-action") === "dial" ||
      button.querySelector("[data-icon='phone'], .fa-phone, .lucide-phone");

    // 2. Detect "Hang Up" / "End Call" Button Click
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

  // Expose global hook for programmatic or script-based dialers
  window.__sdrBridgeLogCall = function (phone, disposition = "Web Dialer Call", isTransfer = false) {
    sendCallToDesktopBridge({
      phone_number: phone,
      event_type: "call_started",
      disposition: disposition,
      is_live_transfer: isTransfer,
    });
  };
})();
