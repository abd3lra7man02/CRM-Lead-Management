"""
================================================================================
RETRO-SDR // SYNTHWAVE SHIFT HUD & MOBILE BRIDGE (WINDOWS EDITION)
================================================================================
Tech Stack:
  - GUI: Python CustomTkinter (Deep Black #0a0a0c, Neon Cyan #00F0FF,
                              Synthwave Pink #FF007F, Matrix Green #00FF41)
  - Fonts: Monospace (Consolas / Courier New / VT323)
  - Database: SQLite (Single flat table: sdr_activity)
  - API Bridge: Minimal FastAPI running in background daemon thread on port 8000
  - Integration: Chrome Extension Web Dialer Hook (/api/log_call) & Mobile Sync (/api/sync)
================================================================================
"""

import os
import sys
import time
import sqlite3
import threading
from datetime import datetime, date
from typing import Optional, Dict, Any, List

# CustomTkinter for GUI
import customtkinter as ctk

# FastAPI & Uvicorn for Background Sync Bridge
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ==============================================================================
# 1. COLOR THEME & RETRO SYNTHWAVE PALETTE
# ==============================================================================
COLOR_BG_VOID     = "#0a0a0c"  # Deep black terminal void
COLOR_BG_PANEL    = "#12111a"  # Dark synthwave card surface
COLOR_BG_CARD     = "#181726"  # Slightly elevated card surface
COLOR_BORDER      = "#2d2a45"  # Subtle glowing border
COLOR_NEON_CYAN   = "#00F0FF"  # High-energy Cyberpunk Cyan
COLOR_NEON_PINK   = "#FF007F"  # Hot Synthwave Laser Pink
COLOR_NEON_GREEN  = "#00FF41"  # Matrix Terminal Green
COLOR_NEON_AMBER  = "#FFE600"  # CRT Electric Warning Amber
COLOR_TEXT_DIM    = "#7d789e"  # Low-contrast muted label
COLOR_TEXT_BRIGHT = "#e2e0f8"  # High-contrast readable white

FONT_MONO = "Consolas"  # Replace with "VT323" or "Press Start 2P" if installed!

# Global Shift Timer State
shift_state = {
    "status": "inactive",  # "inactive", "active", "paused"
    "start_time": None,
    "elapsed_seconds": 0,
    "timer_thread": None,
    "running": False
}

# ==============================================================================
# 2. SQLITE DATABASE ENGINE (SINGLE FLAT TABLE)
# ==============================================================================
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sdr_retro.db")
db_lock = threading.Lock()

def init_database():
    """Initializes a lightweight, single flat table for all SDR activity logs."""
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sdr_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                shift_date TEXT NOT NULL,
                phone TEXT NOT NULL,
                disposition TEXT NOT NULL,
                is_transfer INTEGER DEFAULT 0,
                shift_offset_seconds INTEGER DEFAULT 0,
                duration_seconds INTEGER DEFAULT 0,
                notes TEXT DEFAULT ''
            );
        """)
        conn.commit()
        conn.close()

def log_activity(phone: str, disposition: str, is_transfer: bool = False,
                 duration_seconds: int = 0, notes: str = "") -> Dict[str, Any]:
    """Inserts a single SDR call or dial record directly into the SQLite database."""
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cursor = conn.cursor()
        now = datetime.now()
        iso_time = now.isoformat()
        today = date.today().isoformat()
        offset = shift_state["elapsed_seconds"] if shift_state["status"] == "active" else 0

        cursor.execute("""
            INSERT INTO sdr_activity 
            (timestamp, shift_date, phone, disposition, is_transfer, shift_offset_seconds, duration_seconds, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (iso_time, today, phone, disposition, 1 if is_transfer else 0, offset, duration_seconds, notes))
        
        record_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return {
            "id": record_id,
            "timestamp": iso_time,
            "shift_date": today,
            "phone": phone,
            "disposition": disposition,
            "is_transfer": is_transfer,
            "shift_offset_seconds": offset,
            "duration_seconds": duration_seconds,
            "notes": notes
        }

def get_today_metrics() -> Dict[str, Any]:
    """Calculates today's total dials, transfers, and connect counts from SQLite."""
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cursor = conn.cursor()
        today = date.today().isoformat()

        cursor.execute("SELECT COUNT(*) FROM sdr_activity WHERE shift_date = ?", (today,))
        total_dials = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM sdr_activity WHERE shift_date = ? AND is_transfer = 1", (today,))
        live_transfers = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) FROM sdr_activity 
            WHERE shift_date = ? AND (
                is_transfer = 1 OR 
                disposition LIKE '%Connect%' OR 
                disposition LIKE '%Pitch%' OR 
                disposition LIKE '%Demo%' OR 
                disposition LIKE '%Meeting%'
            )
        """, (today,))
        connects = cursor.fetchone()[0]

        cursor.execute("""
            SELECT id, timestamp, phone, disposition, is_transfer, shift_offset_seconds, notes
            FROM sdr_activity WHERE shift_date = ? ORDER BY id DESC LIMIT 15
        """, (today,))
        rows = cursor.fetchall()
        recent_logs = [
            {
                "id": r[0],
                "time": r[1].split("T")[1][:8] if "T" in r[1] else r[1],
                "phone": r[2],
                "disposition": r[3],
                "is_transfer": bool(r[4]),
                "offset": r[5],
                "notes": r[6]
            }
            for r in rows
        ]

        conn.close()

        connect_rate = round((connects / total_dials * 100), 1) if total_dials > 0 else 0.0

        return {
            "shift_date": today,
            "total_dials": total_dials,
            "live_transfers": live_transfers,
            "connects": connects,
            "connect_rate_pct": connect_rate,
            "recent_logs": recent_logs,
            "shift_status": shift_state["status"],
            "shift_elapsed_seconds": shift_state["elapsed_seconds"]
        }

# ==============================================================================
# 3. BACKGROUND FASTAPI MOBILE BRIDGE & CHROME EXTENSION HOOK
# ==============================================================================
api_app = FastAPI(title="Retro SDR Bridge API", version="1.0.0")

api_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChromeCallHook(BaseModel):
    phone_number: str
    lead_name: Optional[str] = "Web Lead"
    company: Optional[str] = ""
    event_type: str = "call_started"
    call_duration_seconds: int = 0
    disposition: Optional[str] = "Dial Initiated (Chrome Extension)"
    timestamp: Optional[str] = None
    notes: Optional[str] = ""

@api_app.get("/api/sync")
def sync_endpoint():
    """
    Mobile Bridge Sync PULL:
    Returns today's total dials, live transfers, connect rate, and shift status
    in minimal JSON format for the future Android app.
    """
    return get_today_metrics()

@api_app.post("/api/log_call")
def log_call_endpoint(payload: ChromeCallHook):
    """
    Chrome Extension Web Dialer Bridge:
    Receives JSON POST from the Chrome Extension content script injected into web dialers.
    Logs call to SQLite, updates total dials, and updates UI.
    """
    is_trans = "transfer" in (payload.disposition or "").lower()
    rec = log_activity(
        phone=payload.phone_number,
        disposition=payload.disposition or "Dial (Web Dialer)",
        is_transfer=is_trans,
        duration_seconds=payload.call_duration_seconds,
        notes=f"{payload.lead_name} | {payload.company}" if payload.company else (payload.lead_name or "")
    )
    # Notify GUI if running
    if app_instance:
        app_instance.after(0, app_instance.refresh_metrics_display)

    return {
        "status": "success",
        "record": rec,
        "metrics": get_today_metrics()
    }

@api_app.get("/api/status")
def status_endpoint():
    return {
        "status": "online",
        "bridge": "FastAPI Desktop Daemon",
        "port": 8000,
        "metrics": get_today_metrics()
    }

def start_api_server():
    """Runs Uvicorn in a daemon thread so it does not block the Tkinter mainloop."""
    server_config = uvicorn.Config(app=api_app, host="0.0.0.0", port=8000, log_level="warning")
    server = uvicorn.Server(server_config)
    daemon_thread = threading.Thread(target=server.run, daemon=True)
    daemon_thread.start()

# Global reference to CustomTkinter instance for thread-safe UI updates
app_instance = None

# ==============================================================================
# 4. CUSTOMTKINTER RETRO SYNTHWAVE SINGLE-SCREEN GUI
# ==============================================================================
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")

class RetroSdrApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        global app_instance
        app_instance = self

        self.title("RETRO-SDR // SHIFT HUD v1.0 [CYBERPUNK TERMINAL]")
        self.geometry("980x720")
        self.minsize(880, 640)
        self.configure(fg_color=COLOR_BG_VOID)

        # Build Single-Screen UI Layout
        self._setup_ui()

        # Initial metrics fetch
        self.refresh_metrics_display()

        # Start timer poll loop (runs every second on main thread)
        self._update_timer_loop()

    def _setup_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=0)  # Top Bar
        self.grid_rowconfigure(1, weight=0)  # Timer HUD
        self.grid_rowconfigure(2, weight=0)  # Massive Quick Tally Buttons
        self.grid_rowconfigure(3, weight=0)  # Minimal Lead Log Entry Row
        self.grid_rowconfigure(4, weight=1)  # Retro CRT Terminal Log Feed

        # ----------------------------------------------------------------------
        # ROW 0: RETRO STATUS BAR (CYBERPUNK TITLE + API BRIDGE INDICATOR)
        # ----------------------------------------------------------------------
        top_bar = ctk.CTkFrame(self, fg_color=COLOR_BG_PANEL, corner_radius=0, height=48)
        top_bar.grid(row=0, column=0, sticky="ew", padx=0, pady=0)
        top_bar.grid_columnconfigure(0, weight=1)
        top_bar.grid_columnconfigure(1, weight=0)

        title_lbl = ctk.CTkLabel(
            top_bar,
            text="> RETRO-SDR // SHIFT HUD v1.0",
            font=(FONT_MONO, 16, "bold"),
            text_color=COLOR_NEON_CYAN
        )
        title_lbl.grid(row=0, column=0, sticky="w", padx=20, pady=10)

        bridge_badge = ctk.CTkLabel(
            top_bar,
            text="[ FASTAPI BRIDGE: ONLINE :8000 ]",
            font=(FONT_MONO, 12, "bold"),
            text_color=COLOR_NEON_GREEN
        )
        bridge_badge.grid(row=0, column=1, sticky="e", padx=20, pady=10)

        # ----------------------------------------------------------------------
        # ROW 1: THE HUD (DIGITAL SHIFT TIMER + START/PAUSE/END BUTTONS)
        # ----------------------------------------------------------------------
        hud_frame = ctk.CTkFrame(self, fg_color=COLOR_BG_PANEL, corner_radius=8, border_width=1, border_color=COLOR_BORDER)
        hud_frame.grid(row=1, column=0, sticky="ew", padx=16, pady=(12, 6))
        hud_frame.grid_columnconfigure(0, weight=1)
        hud_frame.grid_columnconfigure(1, weight=0)

        # Left: Large Digital Clock
        timer_subframe = ctk.CTkFrame(hud_frame, fg_color="transparent")
        timer_subframe.grid(row=0, column=0, sticky="w", padx=20, pady=12)

        timer_tag = ctk.CTkLabel(
            timer_subframe,
            text="SHIFT CHRONO // ELAPSED",
            font=(FONT_MONO, 11, "bold"),
            text_color=COLOR_TEXT_DIM
        )
        timer_tag.pack(anchor="w")

        self.timer_lbl = ctk.CTkLabel(
            timer_subframe,
            text="00:00:00",
            font=(FONT_MONO, 42, "bold"),
            text_color=COLOR_NEON_CYAN
        )
        self.timer_lbl.pack(anchor="w")

        self.shift_status_lbl = ctk.CTkLabel(
            timer_subframe,
            text="STATUS: [STANDBY] - CLICK START SHIFT",
            font=(FONT_MONO, 11),
            text_color=COLOR_NEON_AMBER
        )
        self.shift_status_lbl.pack(anchor="w")

        # Right: Shift Controls (Start / Pause / End)
        ctrl_frame = ctk.CTkFrame(hud_frame, fg_color="transparent")
        ctrl_frame.grid(row=0, column=1, sticky="e", padx=20, pady=12)

        self.btn_start = ctk.CTkButton(
            ctrl_frame,
            text="[ START SHIFT ]",
            font=(FONT_MONO, 13, "bold"),
            fg_color="#003816",
            hover_color="#006628",
            border_color=COLOR_NEON_GREEN,
            border_width=1,
            text_color=COLOR_NEON_GREEN,
            width=140,
            height=36,
            command=self.handle_start_shift
        )
        self.btn_start.pack(side="left", padx=5)

        self.btn_pause = ctk.CTkButton(
            ctrl_frame,
            text="[ PAUSE ]",
            font=(FONT_MONO, 13, "bold"),
            fg_color="#332800",
            hover_color="#554400",
            border_color=COLOR_NEON_AMBER,
            border_width=1,
            text_color=COLOR_NEON_AMBER,
            width=110,
            height=36,
            command=self.handle_pause_shift
        )
        self.btn_pause.pack(side="left", padx=5)

        self.btn_end = ctk.CTkButton(
            ctrl_frame,
            text="[ END SHIFT ]",
            font=(FONT_MONO, 13, "bold"),
            fg_color="#330018",
            hover_color="#550028",
            border_color=COLOR_NEON_PINK,
            border_width=1,
            text_color=COLOR_NEON_PINK,
            width=120,
            height=36,
            command=self.handle_end_shift
        )
        self.btn_end.pack(side="left", padx=5)

        # ----------------------------------------------------------------------
        # ROW 2: MASSIVE QUICK TALLY BUTTONS (+1 DIAL & +1 LIVE TRANSFER)
        # ----------------------------------------------------------------------
        tally_frame = ctk.CTkFrame(self, fg_color="transparent")
        tally_frame.grid(row=2, column=0, sticky="ew", padx=16, pady=6)
        tally_frame.grid_columnconfigure(0, weight=1)
        tally_frame.grid_columnconfigure(1, weight=1)

        # Button 1: Massive +1 DIAL (Neon Cyan)
        self.btn_dial = ctk.CTkButton(
            tally_frame,
            text="+1 DIAL\n[ 0 ]",
            font=(FONT_MONO, 22, "bold"),
            fg_color="#002b36",
            hover_color="#004d61",
            border_color=COLOR_NEON_CYAN,
            border_width=2,
            text_color=COLOR_NEON_CYAN,
            height=85,
            corner_radius=10,
            command=self.quick_dial_increment
        )
        self.btn_dial.grid(row=0, column=0, sticky="ew", padx=(0, 8), pady=4)

        # Button 2: Massive +1 LIVE TRANSFER (Synthwave Pink)
        self.btn_transfer = ctk.CTkButton(
            tally_frame,
            text="+1 LIVE TRANSFER 🔥\n[ 0 ]",
            font=(FONT_MONO, 22, "bold"),
            fg_color="#38001d",
            hover_color="#5e0032",
            border_color=COLOR_NEON_PINK,
            border_width=2,
            text_color=COLOR_NEON_PINK,
            height=85,
            corner_radius=10,
            command=self.quick_transfer_increment
        )
        self.btn_transfer.grid(row=0, column=1, sticky="ew", padx=(8, 0), pady=4)

        # ----------------------------------------------------------------------
        # ROW 3: MINIMAL LEAD LOG ENTRY ROW (PHONE + DISPOSITION + QUICK LOG)
        # ----------------------------------------------------------------------
        entry_frame = ctk.CTkFrame(self, fg_color=COLOR_BG_PANEL, corner_radius=8, border_width=1, border_color=COLOR_BORDER)
        entry_frame.grid(row=3, column=0, sticky="ew", padx=16, pady=6)
        entry_frame.grid_columnconfigure(0, weight=0)  # Label
        entry_frame.grid_columnconfigure(1, weight=2)  # Phone Input
        entry_frame.grid_columnconfigure(2, weight=2)  # Disposition Dropdown
        entry_frame.grid_columnconfigure(3, weight=1)  # Notes Input
        entry_frame.grid_columnconfigure(4, weight=0)  # Submit Button

        lbl_log = ctk.CTkLabel(entry_frame, text="LOG CALL:", font=(FONT_MONO, 12, "bold"), text_color=COLOR_NEON_CYAN)
        lbl_log.grid(row=0, column=0, padx=(14, 8), pady=12)

        self.entry_phone = ctk.CTkEntry(
            entry_frame,
            placeholder_text="Phone: +1 (555) 000-0000",
            font=(FONT_MONO, 12),
            fg_color=COLOR_BG_CARD,
            border_color=COLOR_BORDER,
            text_color=COLOR_TEXT_BRIGHT,
            height=36
        )
        self.entry_phone.grid(row=0, column=1, padx=6, pady=12, sticky="ew")

        self.disp_var = ctk.StringVar(value="Connected - Pitching")
        self.combo_disp = ctk.CTkComboBox(
            entry_frame,
            variable=self.disp_var,
            values=[
                "Connected - Pitching",
                "Live Transfer Completed",
                "Meeting / Demo Booked",
                "Left Voicemail",
                "Gatekeeper Screen",
                "Follow-Up Required",
                "Not Interested / Disqualified"
            ],
            font=(FONT_MONO, 12),
            dropdown_font=(FONT_MONO, 11),
            fg_color=COLOR_BG_CARD,
            border_color=COLOR_BORDER,
            button_color="#222038",
            button_hover_color="#343156",
            text_color=COLOR_TEXT_BRIGHT,
            height=36
        )
        self.combo_disp.grid(row=0, column=2, padx=6, pady=12, sticky="ew")

        self.entry_notes = ctk.CTkEntry(
            entry_frame,
            placeholder_text="Prospect / Notes",
            font=(FONT_MONO, 12),
            fg_color=COLOR_BG_CARD,
            border_color=COLOR_BORDER,
            text_color=COLOR_TEXT_BRIGHT,
            height=36
        )
        self.entry_notes.grid(row=0, column=3, padx=6, pady=12, sticky="ew")

        self.btn_submit_log = ctk.CTkButton(
            entry_frame,
            text="[ SAVE TO DB ]",
            font=(FONT_MONO, 12, "bold"),
            fg_color="#003816",
            hover_color="#006628",
            border_color=COLOR_NEON_GREEN,
            border_width=1,
            text_color=COLOR_NEON_GREEN,
            width=130,
            height=36,
            command=self.handle_save_lead_log
        )
        self.btn_submit_log.grid(row=0, column=4, padx=(6, 14), pady=12)

        # ----------------------------------------------------------------------
        # ROW 4: RETRO CRT TERMINAL ACTIVITY FEED (LIVE STREAM FROM SQLITE)
        # ----------------------------------------------------------------------
        term_frame = ctk.CTkFrame(self, fg_color=COLOR_BG_PANEL, corner_radius=8, border_width=1, border_color=COLOR_BORDER)
        term_frame.grid(row=4, column=0, sticky="nsew", padx=16, pady=(6, 16))
        term_frame.grid_rowconfigure(1, weight=1)
        term_frame.grid_columnconfigure(0, weight=1)

        term_header = ctk.CTkFrame(term_frame, fg_color="transparent")
        term_header.grid(row=0, column=0, sticky="ew", padx=14, pady=(8, 4))
        term_header.grid_columnconfigure(0, weight=1)
        term_header.grid_columnconfigure(1, weight=0)

        term_title = ctk.CTkLabel(
            term_header,
            text="> ACTIVITY TERMINAL // SQLITE RECENT ACTIVITY LOG",
            font=(FONT_MONO, 11, "bold"),
            text_color=COLOR_TEXT_DIM
        )
        term_title.grid(row=0, column=0, sticky="w")

        self.stats_summary_lbl = ctk.CTkLabel(
            term_header,
            text="CONNECT RATE: 0.0% | CONVERSIONS: 0",
            font=(FONT_MONO, 11, "bold"),
            text_color=COLOR_NEON_AMBER
        )
        self.stats_summary_lbl.grid(row=0, column=1, sticky="e")

        self.term_box = ctk.CTkTextbox(
            term_frame,
            font=(FONT_MONO, 12),
            fg_color="#0a0a0e",
            text_color=COLOR_TEXT_BRIGHT,
            border_width=1,
            border_color="#1f1e30",
            corner_radius=6
        )
        self.term_box.grid(row=1, column=0, sticky="nsew", padx=14, pady=(0, 12))
        self.term_box.configure(state="disabled")

    # --------------------------------------------------------------------------
    # TIMER ENGINE (SHIFTS)
    # --------------------------------------------------------------------------
    def handle_start_shift(self):
        shift_state["status"] = "active"
        if not shift_state["start_time"]:
            shift_state["start_time"] = datetime.now()
        shift_state["running"] = True
        self.shift_status_lbl.configure(
            text="STATUS: [ACTIVE] // LOGGING SHIFT OFFSET",
            text_color=COLOR_NEON_GREEN
        )
        self._append_terminal("[SYSTEM] Shift timer initiated. Recording timestamps relative to shift.")

    def handle_pause_shift(self):
        if shift_state["status"] == "active":
            shift_state["status"] = "paused"
            shift_state["running"] = False
            self.shift_status_lbl.configure(
                text="STATUS: [PAUSED] // SHIFT CHRONO HALTED",
                text_color=COLOR_NEON_AMBER
            )
            self._append_terminal("[SYSTEM] Shift paused.")
        elif shift_state["status"] == "paused":
            shift_state["status"] = "active"
            shift_state["running"] = True
            self.shift_status_lbl.configure(
                text="STATUS: [ACTIVE] // LOGGING SHIFT OFFSET",
                text_color=COLOR_NEON_GREEN
            )
            self._append_terminal("[SYSTEM] Shift resumed.")

    def handle_end_shift(self):
        shift_state["status"] = "inactive"
        shift_state["running"] = False
        self.shift_status_lbl.configure(
            text="STATUS: [COMPLETED] // SHIFT ARCHIVED",
            text_color=COLOR_NEON_PINK
        )
        self._append_terminal(f"[SYSTEM] Shift finished. Total duration: {self._format_hms(shift_state['elapsed_seconds'])}.")

    def _update_timer_loop(self):
        if shift_state["running"]:
            shift_state["elapsed_seconds"] += 1
            self.timer_lbl.configure(text=self._format_hms(shift_state["elapsed_seconds"]))
        self.after(1000, self._update_timer_loop)

    def _format_hms(self, total_seconds: int) -> str:
        hours = total_seconds // 3600
        mins = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        return f"{hours:02d}:{mins:02d}:{secs:02d}"

    # --------------------------------------------------------------------------
    # QUICK TALLY HANDLERS
    # --------------------------------------------------------------------------
    def quick_dial_increment(self):
        phone = self.entry_phone.get().strip() or "+1 (555) 000-0000"
        disp = self.disp_var.get()
        is_trans = "transfer" in disp.lower()

        log_activity(
            phone=phone,
            disposition=disp,
            is_transfer=is_trans,
            duration_seconds=15,
            notes=self.entry_notes.get().strip()
        )
        self.refresh_metrics_display()
        self._append_terminal(f"[+1 DIAL] Logged dial to {phone} [{disp}]")

    def quick_transfer_increment(self):
        phone = self.entry_phone.get().strip() or "+1 (555) 000-0000"
        log_activity(
            phone=phone,
            disposition="Live Transfer Completed",
            is_transfer=True,
            duration_seconds=120,
            notes=self.entry_notes.get().strip() or "Hot Live Hand-off to AE"
        )
        self.refresh_metrics_display()
        self._append_terminal(f"[TRANSFER 🔥] Live transfer logged: {phone} -> AE Queue!")

    def handle_save_lead_log(self):
        phone = self.entry_phone.get().strip()
        if not phone:
            phone = "+1 (555) 000-0000"
        disp = self.disp_var.get()
        notes = self.entry_notes.get().strip()
        is_trans = "transfer" in disp.lower()

        log_activity(
            phone=phone,
            disposition=disp,
            is_transfer=is_trans,
            duration_seconds=30,
            notes=notes
        )
        self.entry_phone.delete(0, "end")
        self.entry_notes.delete(0, "end")
        self.refresh_metrics_display()
        self._append_terminal(f"[SAVED] {phone} | {disp} {f'({notes})' if notes else ''}")

    # --------------------------------------------------------------------------
    # UI REFRESH & TERMINAL TEXT FORMATTER
    # --------------------------------------------------------------------------
    def refresh_metrics_display(self):
        metrics = get_today_metrics()
        dials = metrics["total_dials"]
        transfers = metrics["live_transfers"]
        rate = metrics["connect_rate_pct"]

        self.btn_dial.configure(text=f"+1 DIAL\n[ {dials} ]")
        self.btn_transfer.configure(text=f"+1 LIVE TRANSFER 🔥\n[ {transfers} ]")
        self.stats_summary_lbl.configure(text=f"CONNECT RATE: {rate}% | TRANSFERS: {transfers} | TOTAL DIALS: {dials}")

        # Render recent logs in CRT box
        self.term_box.configure(state="normal")
        self.term_box.delete("1.0", "end")

        for item in metrics["recent_logs"]:
            flag = "[TRANSFER 🔥]" if item["is_transfer"] else "[DIAL]"
            offset_str = self._format_hms(item["offset"])
            line = f"{item['time']} (+{offset_str}) {flag:<13} {item['phone']} // {item['disposition']}"
            if item["notes"]:
                line += f" -- Note: {item['notes']}"
            self.term_box.insert("end", line + "\n")

        self.term_box.configure(state="disabled")

    def _append_terminal(self, message: str):
        self.term_box.configure(state="normal")
        ts = datetime.now().strftime("%H:%M:%S")
        self.term_box.insert("1.0", f"{ts} {message}\n")
        self.term_box.configure(state="disabled")

# ==============================================================================
# 5. ENTRY POINT ORCHESTRATION
# ==============================================================================
if __name__ == "__main__":
    print("[INIT] Starting Retro-Tech SDR Shift CRM...")
    init_database()

    print("[INIT] Launching FastAPI Mobile Bridge daemon on http://127.0.0.1:8000 ...")
    start_api_server()

    print("[INIT] Rendering CustomTkinter Retro Synthwave UI...")
    app = RetroSdrApp()
    app.mainloop()
