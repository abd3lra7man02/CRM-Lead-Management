# SDR Shift CRM - Chrome Extension Web Dialer Bridge

A lightweight Manifest V3 Chrome extension that injects into web dialers (such as Outreach, Salesloft, Dialpad, PhoneBurner, RingCentral, HubSpot, Kixie, etc.) and auto-reports dials and shift activity to your local desktop SDR CRM.

## How It Works

1. Injects `content.js` into web pages and listens for clicks on "Call", "Dial", and "Hang Up" buttons or links (`tel:`).
2. Extracts prospect phone numbers, names, and call durations.
3. Dispatches a real-time JSON `POST` request to `http://127.0.0.1:8000/api/log_call`.
4. Your Windows SDR Desktop application catches the event, updates today's dials and connect stats, stamps the shift timeline, and keeps your SQLite database 100% accurate without manual logging.

## Installation in Chrome / Brave / Edge (30 Seconds)

1. Open your browser and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left toolbar.
4. Select the `chrome_extension` directory.
5. The extension is now active! Its badge will show your live daily dial count directly in your browser bar.

## API Payload Specification

```http
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
```
