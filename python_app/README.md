# SDR Shift CRM & Mobile Bridge (Windows 11 + Android Hook)

A production-grade, offline-first Windows Desktop application tailored for **Sales Development Representatives (SDRs)**. Features an ultra-clean **CustomTkinter** dark-toned GUI, thread-safe **SQLite** local storage, and an embedded background **FastAPI** daemon server designed as a local REST API bridge for syncing with a native Android (Kotlin + Jetpack Compose) mobile app.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                   Windows Desktop Machine                   │
│                                                             │
│   ┌───────────────────────────┐    ┌────────────────────┐   │
│   │   CustomTkinter UI        │    │  FastAPI Daemon    │   │
│   │   - Shift Timer & Metrics │    │  (Port 8000)       │   │
│   │   - Rapid 1-Click Dispo   │    │  - /api/sync (GET) │   │
│   │   - Lead CRM Table        │    │  - /api/sync (POST)│   │
│   │   - Timing & Peak Blocks  │    │  - /api/status     │   │
│   └─────────────┬─────────────┘    └─────────┬──────────┘   │
│                 │                            │              │
│                 └───────────┬────────────────┘              │
│                             │ (Thread-Safe WAL Mode)        │
│                             ▼                               │
│                   ┌──────────────────┐                      │
│                   │ SQLite Database  │                      │
│                   │   sdr_crm.db     │                      │
│                   └──────────────────┘                      │
└─────────────────────────────▲───────────────────────────────┘
                              │ Local WiFi LAN (HTTP / JSON)
┌─────────────────────────────┴───────────────────────────────┐
│     Future Android Mobile App (Kotlin + Jetpack Compose)    │
│     - Sync today's active shift & dialing metrics           │
│     - Push newly captured leads from mobile into desktop    │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

- `main.py` - Application launcher, CustomTkinter window configuration, background thread lifecycle manager.
- `database.py` - SQLite database engine with thread locks and WAL mode for high concurrency.
- `api.py` - FastAPI server instance exposing `/api/sync`, `/api/status`, `/api/leads`, and network discovery.
- `config.py` - Strict dark-toned color theme palette (`#1e1e2e`, `#24273a`), ports, timezones, and dispositions.
- `ui_dashboard.py` - Main SDR Dashboard: Shift timer (Start/Pause/Resume/End), real-time dial stats, rapid 1-click call disposition bar.
- `ui_leads.py` - Lead Management CRM: Search, filter, timezone auto-formatting, shift-relative timestamping (`+01h 14m into Shift`).
- `ui_analytics.py` - Shift & Timing Tracker: Hourly connect rate histogram and dialing block recommendations.
- `requirements.txt` - Required Python libraries.
- `sdr_crm.spec` - Production PyInstaller specification with CustomTkinter asset bundling.
- `build_exe.bat` - 1-Click batch script to compile the standalone Windows executable.

---

## Running in Development

### 1. Requirements
- Windows 10 or 11
- Python 3.10, 3.11, or 3.12 (ensure "Add Python to PATH" was checked during install)

### 2. Setup Virtual Environment
Open PowerShell or Command Prompt in this folder:
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Launch App
```powershell
python main.py
```
The CustomTkinter dark-mode window will open, and the background FastAPI server will instantly begin listening on `http://0.0.0.0:8000`.

---

## Compiling to Standalone Windows Executable (.exe)

### Option A: One-Click Script
Double-click `build_exe.bat` or run:
```cmd
build_exe.bat
```

### Option B: Manual PyInstaller Command
```powershell
.\venv\Scripts\activate
pyinstaller --clean sdr_crm.spec
```

The resulting standalone executable will be output to:
`dist\SDR_Shift_CRM.exe`

### Why `sdr_crm.spec` is required:
1. **CustomTkinter Assets**: Collects required `.json` theme files, font definitions, and visual widgets via `collect_data_files('customtkinter')`.
2. **Uvicorn / FastAPI Hidden Imports**: Uvicorn dynamically loads protocol handlers (like `h11` and `websockets`) which PyInstaller's static parser can miss without explicit hidden import hooks.
3. **Windowed Mode (`console=False`)**: Ensures no unsightly black command prompt window appears when launching the SDR CRM.

---

## The Mobile API Hook (`/api/sync`)

The desktop app runs a background daemon thread that acts as a local REST API bridge. When connected to the same Wi-Fi network, your future Android app can query the desktop directly.

### 1. Pull Shift & Leads from Windows to Android
**Endpoint:** `GET /api/sync`  
**Example Request:**
```bash
curl http://192.168.1.X:8000/api/sync
```

**Response Format:**
```json
{
  "sync_version": "1.0",
  "sync_type": "pull_full",
  "payload": {
    "server_time": "2026-09-19T12:00:00.000",
    "shift": {
      "id": 1,
      "date": "2026-09-19",
      "start_time": "2026-09-19T09:00:00.000",
      "status": "active",
      "total_seconds": 3600,
      "paused_seconds": 0
    },
    "metrics": {
      "total_dials": 42,
      "live_transfers": 3,
      "scheduled_demos": 2,
      "connect_rate_pct": 38.1,
      "conversion_rate_pct": 11.9
    },
    "leads": [
      {
        "id": 1,
        "name": "Sarah Jenkins",
        "company": "Apex Logistics",
        "phone": "+1 (555) 234-8901",
        "timezone": "US/Eastern (EST/EDT)",
        "status": "New Lead",
        "shift_contact_offset_seconds": 2520
      }
    ]
  }
}
```

### 2. Push Mobile Leads & Status Updates into Windows SQLite
**Endpoint:** `POST /api/sync`  
**Payload Format:**
```json
{
  "new_leads": [
    {
      "name": "Jonathan Reed",
      "company": "Summit Digital",
      "phone": "+1 (555) 777-3321",
      "timezone": "US/Central (CST/CDT)",
      "status": "Contacted"
    }
  ],
  "status_updates": [
    {
      "lead_id": 1,
      "status": "Transferred to AE"
    }
  ]
}
```

---

## Future Android (Kotlin + Jetpack Compose) Snippet

Use this Kotlin snippet in your Android project:

```kotlin
// In your Android app's ApiService.kt
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Body

interface SdrBridgeApi {
    @GET("/api/sync")
    suspend fun getSyncData(): SyncResponse

    @POST("/api/sync")
    suspend fun pushSyncData(@Body request: SyncPushRequest): SyncAckResponse
}
```
