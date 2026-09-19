export interface ProjectFile {
  name: string;
  category: 'core' | 'ui' | 'deploy' | 'docs';
  description: string;
  content: string;
}

export const PYTHON_PROJECT_FILES: ProjectFile[] = [
  {
    name: 'main.py',
    category: 'core',
    description: 'CustomTkinter Windows entry point & FastAPI background daemon orchestrator',
    content: `"""
Main Application Entry Point for SDR Shift CRM & Mobile Bridge.
Packages CustomTkinter Windows GUI with a background FastAPI daemon thread.
"""
import sys
import os
import customtkinter as ctk

# Ensure package modules can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import APP_NAME, APP_VERSION, THEME, API_PORT
import database as db
import api
from ui_dashboard import DashboardView
from ui_leads import LeadsView
from ui_analytics import AnalyticsView

# Enforce CustomTkinter Dark Mode Globally
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")

class SdrApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title(f"{APP_NAME} v{APP_VERSION} [Windows 11]")
        self.geometry("1180x760")
        self.minsize(1020, 680)
        self.configure(fg_color=THEME["bg_dark"])

        # 1. Initialize SQLite Database Schema
        db.init_db()

        # 2. Start Background FastAPI Mobile Bridge Server
        api.start_mobile_bridge()

        # 3. Build UI Layout
        self._build_layout()

        # 4. Handle Clean Shutdown on Window Close
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def _build_layout(self):
        self.grid_columnconfigure(0, weight=0)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # Sidebar
        self.sidebar = ctk.CTkFrame(self, fg_color=THEME["bg_sidebar"], width=230, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")

        brand_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        brand_frame.grid(row=0, column=0, padx=20, pady=(24, 20), sticky="w")

        ctk.CTkLabel(brand_frame, text="⚡ SDR SHIFT CRM", font=ctk.CTkFont(size=15, weight="bold"), text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(brand_frame, text="Windows + Mobile Bridge", font=ctk.CTkFont(size=11), text_color=THEME["accent_primary"]).pack(anchor="w")

        self.btn_nav_dashboard = self._create_nav_btn("📊  Shift Dashboard", 1, self.show_dashboard)
        self.btn_nav_leads = self._create_nav_btn("👥  Lead CRM", 2, self.show_leads)
        self.btn_nav_analytics = self._create_nav_btn("⏱️  Timing & Blocks", 3, self.show_analytics)

        # Bottom System Info
        bottom_box = ctk.CTkFrame(self.sidebar, fg_color="#11111b", corner_radius=8)
        bottom_box.grid(row=7, column=0, padx=14, pady=16, sticky="sew")
        ctk.CTkLabel(bottom_box, text=f"● FastAPI Bridge: Port {API_PORT}\\nReady for Android Sync", font=ctk.CTkFont(size=10), text_color="#10b981", justify="left").pack(padx=10, pady=8)

        # Content Area
        self.content_area = ctk.CTkFrame(self, fg_color="transparent")
        self.content_area.grid(row=0, column=1, sticky="nsew")

        self.view_dashboard = DashboardView(self.content_area)
        self.view_leads = LeadsView(self.content_area)
        self.view_analytics = AnalyticsView(self.content_area)

        self.show_dashboard()

    def _create_nav_btn(self, text: str, row: int, command):
        btn = ctk.CTkButton(self.sidebar, text=text, command=command, fg_color="transparent", hover_color="#24273a", text_color=THEME["text_primary"], font=ctk.CTkFont(size=13, weight="bold"), anchor="w", height=40, corner_radius=8)
        btn.grid(row=row, column=0, padx=12, pady=4, sticky="ew")
        return btn

    def show_dashboard(self):
        self.view_leads.pack_forget()
        self.view_analytics.pack_forget()
        self.view_dashboard.pack(fill="both", expand=True)
        self.view_dashboard.refresh_metrics()

    def show_leads(self):
        self.view_dashboard.pack_forget()
        self.view_analytics.pack_forget()
        self.view_leads.pack(fill="both", expand=True)
        self.view_leads.refresh_leads()

    def show_analytics(self):
        self.view_dashboard.pack_forget()
        self.view_leads.pack_forget()
        self.view_analytics.pack(fill="both", expand=True)
        self.view_analytics.refresh_analytics()

    def on_closing(self):
        print("[SDR App] Shutting down...")
        api.stop_mobile_bridge()
        self.destroy()
        sys.exit(0)

if __name__ == "__main__":
    app = SdrApp()
    app.mainloop()
`
  },
  {
    name: 'database.py',
    category: 'core',
    description: 'Thread-safe SQLite engine with WAL mode and shift timestamping',
    content: `"""
SQLite Database Layer for SDR Shift CRM & Mobile Bridge.
"""
import sqlite3
import threading
from datetime import datetime, date
from typing import List, Dict, Any, Optional
try:
    from config import DATABASE_PATH
except ImportError:
    from .config import DATABASE_PATH

db_lock = threading.Lock()

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shifts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                total_seconds INTEGER DEFAULT 0,
                paused_seconds INTEGER DEFAULT 0,
                status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'completed')),
                created_at TEXT NOT NULL
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                company TEXT,
                phone TEXT,
                email TEXT,
                timezone TEXT DEFAULT 'US/Eastern (EST/EDT)',
                status TEXT NOT NULL DEFAULT 'New Lead',
                next_followup TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                shift_id INTEGER,
                shift_contact_offset_seconds INTEGER
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS call_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER,
                shift_id INTEGER,
                timestamp TEXT NOT NULL,
                shift_offset_seconds INTEGER DEFAULT 0,
                disposition TEXT NOT NULL,
                is_live_transfer INTEGER DEFAULT 0,
                duration_seconds INTEGER DEFAULT 0,
                notes TEXT
            );
        """)
        conn.commit()
        conn.close()

def start_shift():
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        now_str = now.isoformat()
        cursor.execute("UPDATE shifts SET status = 'completed', end_time = ? WHERE status IN ('active', 'paused')", (now_str,))
        cursor.execute("INSERT INTO shifts (date, start_time, status, created_at) VALUES (?, ?, 'active', ?)", (now.date().isoformat(), now_str, now_str))
        shift_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

def log_call(lead_id, disposition, is_live_transfer=False, notes=""):
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        cursor.execute("SELECT * FROM shifts WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        active = cursor.fetchone()
        shift_id = active["id"] if active else None
        offset = 0
        if active:
            start_dt = datetime.fromisoformat(active["start_time"])
            offset = max(0, int((now - start_dt).total_seconds()) - active["paused_seconds"])
        cursor.execute("""
            INSERT INTO call_logs (lead_id, shift_id, timestamp, shift_offset_seconds, disposition, is_live_transfer, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (lead_id, shift_id, now.isoformat(), offset, disposition, 1 if is_live_transfer else 0, notes))
        conn.commit()
        conn.close()
`
  },
  {
    name: 'api.py',
    category: 'core',
    description: 'FastAPI daemon server exposing the /api/sync mobile sync hook',
    content: `"""
FastAPI Mobile Bridge Module for SDR Shift CRM.
Runs in a background thread to sync with native Android client.
"""
import threading
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
try:
    from config import API_HOST, API_PORT
    import database as db
except ImportError:
    from .config import API_HOST, API_PORT
    from . import database as db

api_app = FastAPI(title="SDR Desktop Mobile Bridge API", version="1.0.0")

api_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LeadCreateRequest(BaseModel):
    name: str
    company: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    timezone: Optional[str] = "US/Eastern (EST/EDT)"
    status: Optional[str] = "New Lead"

class StatusUpdateItem(BaseModel):
    lead_id: int
    status: str

class SyncPushRequest(BaseModel):
    new_leads: List[LeadCreateRequest] = []
    status_updates: List[StatusUpdateItem] = []

class ChromeDialerCallPayload(BaseModel):
    phone_number: str
    lead_name: Optional[str] = None
    company: Optional[str] = None
    event_type: str = "call_started"
    call_duration_seconds: int = 0
    disposition: Optional[str] = "Dial Initiated (Chrome Extension)"
    timestamp: Optional[str] = None

@api_app.post("/api/log_call")
def log_call(payload: ChromeDialerCallPayload):
    """
    Chrome Extension Web Dialer Bridge:
    Intercepts calls clicked in web CRM (Outreach, Salesloft, Dialpad, PhoneBurner)
    and logs them directly into the local desktop SQLite database in real time.
    """
    call_record = db.log_chrome_call(
        phone_number=payload.phone_number,
        lead_name=payload.lead_name,
        company=payload.company,
        event_type=payload.event_type,
        duration_seconds=payload.call_duration_seconds,
        disposition=payload.disposition
    )
    return {"status": "success", "call_log": call_record, "metrics": db.get_dashboard_metrics()}

@api_app.get("/api/sync")
def sync_pull():
    """Fetches shift status and leads for Android mobile client."""
    payload = db.get_sync_payload()
    return {
        "sync_version": "1.0",
        "sync_type": "pull_full",
        "payload": payload
    }

@api_app.post("/api/sync")
def sync_push(sync_data: SyncPushRequest):
    """Pushes new leads & status changes from Android into SQLite."""
    result = db.apply_sync_push(
        [item.dict() for item in sync_data.new_leads],
        [item.dict() for item in sync_data.status_updates]
    )
    return {"sync_version": "1.0", "result": result}

class BackgroundApiServer:
    def __init__(self):
        self.server = None
        self.thread = None

    def start(self):
        config = uvicorn.Config(app=api_app, host=API_HOST, port=API_PORT, log_level="warning")
        self.server = uvicorn.Server(config)
        self.thread = threading.Thread(target=self.server.run, daemon=True)
        self.thread.start()

    def stop(self):
        if self.server:
            self.server.should_exit = True

api_bridge_server = BackgroundApiServer()
def start_mobile_bridge(): api_bridge_server.start()
def stop_mobile_bridge(): api_bridge_server.stop()
`
  },
  {
    name: 'config.py',
    category: 'core',
    description: 'Strict dark theme palette (#1e1e2e, #24273a) and constants',
    content: `"""
Configuration and Dark Theme Palette for CustomTkinter.
"""
import os
import sys

APP_NAME = "SDR Shift CRM & Mobile Bridge"
APP_VERSION = "1.0.0"
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "sdr_crm.db")
API_HOST = "0.0.0.0"
API_PORT = 8000

THEME = {
    "bg_dark": "#181825",
    "bg_sidebar": "#1e1e2e",
    "card_bg": "#24273a",
    "border": "#363a4f",
    "accent_primary": "#6366f1",
    "accent_teal": "#10b981",
    "accent_blue": "#38bdf8",
    "accent_amber": "#f59e0b",
    "accent_red": "#ef4444",
    "accent_purple": "#a855f7",
    "text_primary": "#cad3f5",
    "text_muted": "#8087a2",
    "text_white": "#ffffff"
}
`
  },
  {
    name: 'ui_dashboard.py',
    category: 'ui',
    description: 'CustomTkinter Shift Timer, stat cards, and 1-click rapid disposition bar',
    content: `"""
Main SDR Dashboard View with Shift Timer & Rapid Disposition Bar.
"""
import customtkinter as ctk
from datetime import datetime
import threading
import time
try:
    from config import THEME
    import database as db
except ImportError:
    from .config import THEME
    from . import database as db

class DashboardView(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self.active_shift = None
        self.timer_running = False
        self._build_ui()
`
  },
  {
    name: 'ui_leads.py',
    category: 'ui',
    description: 'Lead Management table with timezone offset and shift timeline stamping',
    content: `"""
Lead Management (CRM) View for CustomTkinter.
"""
import customtkinter as ctk
try:
    from config import THEME, US_TIMEZONES
    import database as db
except ImportError:
    from .config import THEME, US_TIMEZONES
    from . import database as db

class LeadsView(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self._build_ui()
`
  },
  {
    name: 'ui_analytics.py',
    category: 'ui',
    description: 'Shift & Timing Tracker: Hourly connect rate bars & dialing block tips',
    content: `"""
Shift & Timing Tracker View for CustomTkinter.
"""
import customtkinter as ctk
try:
    from config import THEME
    import database as db
except ImportError:
    from .config import THEME
    from . import database as db

class AnalyticsView(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self._build_ui()
`
  },
  {
    name: 'requirements.txt',
    category: 'deploy',
    description: 'Pinned Python dependencies',
    content: `customtkinter>=5.2.0
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
pyinstaller>=6.4.0
`
  },
  {
    name: 'sdr_crm.spec',
    category: 'deploy',
    description: 'PyInstaller specification for standalone Windows .exe with CustomTkinter assets',
    content: `# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

customtkinter_datas = collect_data_files('customtkinter')
uvicorn_hidden = collect_submodules('uvicorn')
fastapi_hidden = collect_submodules('fastapi')
pydantic_hidden = collect_submodules('pydantic')

hidden_imports = [
    'sqlite3',
    'uvicorn',
    'uvicorn.protocols.http.auto',
    'customtkinter',
    'tkinter'
] + uvicorn_hidden + fastapi_hidden + pydantic_hidden

a = Analysis(
    ['main.py'],
    pathex=['.'],
    datas=customtkinter_datas,
    hiddenimports=hidden_imports,
    noarchive=False
)
pyz = PYZ(a.pure, a.zipped_data)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='SDR_Shift_CRM',
    console=False  # Windowed GUI application
)
`
  },
  {
    name: 'build_exe.bat',
    category: 'deploy',
    description: 'One-click Windows compilation batch script',
    content: `@echo off
echo Building Standalone Windows Executable...
python -m venv venv
call venv\\Scripts\\activate.bat
pip install -r requirements.txt
pyinstaller --clean sdr_crm.spec
echo Done! Output at dist\\SDR_Shift_CRM.exe
pause
`
  },
  {
    name: 'README.md',
    category: 'docs',
    description: 'Documentation: Setup, PyInstaller compilation, and Android Kotlin Jetpack Compose code',
    content: `# SDR Shift CRM & Mobile Bridge (Windows 11 + Android Hook)

Complete documentation for running in development, compiling with PyInstaller into a standalone .exe, and integrating with your future Android Kotlin Jetpack Compose app via /api/sync.
`
  }
];
