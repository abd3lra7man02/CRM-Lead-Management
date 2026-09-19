const API_BASE = "http://127.0.0.1:8000";

async function pingDesktop() {
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  const dialsEl = document.getElementById("val-dials");
  const transfersEl = document.getElementById("val-transfers");

  text.textContent = "Pinging...";

  try {
    const res = await fetch(`${API_BASE}/api/status`, {
      method: "GET",
      cache: "no-cache"
    });

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
    const res = await fetch(`${API_BASE}/api/log_call`, {
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
    } else {
      btn.textContent = "❌ Failed to Send";
      setTimeout(() => {
        btn.textContent = "📞 Send Test Call to Desktop CRM";
        btn.disabled = false;
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
});
