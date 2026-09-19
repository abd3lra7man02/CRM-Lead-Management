"""
Main SDR Dashboard View for CustomTkinter.
Features:
- Shift Timer (Start, Pause, Resume, End Shift)
- Real-time Dial Metrics & Live Transfers
- Rapid Call Disposition Bar for instant 1-click call logging while on the phone
- Recent Call Activity Log
"""
import customtkinter as ctk
from datetime import datetime, timedelta
import threading
import time
from typing import Callable, Optional

try:
    from config import THEME, DISPOSITIONS
    import database as db
except ImportError:
    from .config import THEME, DISPOSITIONS
    from . import database as db

class DashboardView(ctk.CTkFrame):
    def __init__(self, master, on_shift_updated: Optional[Callable] = None):
        super().__init__(master, fg_color="transparent")
        self.on_shift_updated = on_shift_updated
        
        # State
        self.active_shift = None
        self.timer_running = False
        self.elapsed_seconds = 0
        self.timer_thread = None

        self._build_ui()
        self.refresh_metrics()
        self._check_active_shift()

    def _build_ui(self):
        # 1. Header & Shift Timer Section
        self.shift_card = ctk.CTkFrame(self, fg_color=THEME["card_bg"], corner_radius=12, border_width=1, border_color=THEME["border"])
        self.shift_card.pack(fill="x", padx=20, pady=(15, 10))

        shift_inner = ctk.CTkFrame(self.shift_card, fg_color="transparent")
        shift_inner.pack(fill="x", padx=20, pady=16)

        # Left: Title and Status Badge
        left_box = ctk.CTkFrame(shift_inner, fg_color="transparent")
        left_box.pack(side="left")

        ctk.CTkLabel(
            left_box, 
            text="SDR DIALING SHIFT", 
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=THEME["text_muted"]
        ).pack(anchor="w")

        self.status_badge = ctk.CTkLabel(
            left_box,
            text="SHIFT INACTIVE",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="#94a3b8",
            fg_color="#1e293b",
            corner_radius=6,
            padx=10,
            pady=3
        )
        self.status_badge.pack(anchor="w", pady=(4, 0))

        # Center: Digital Timer Display
        center_box = ctk.CTkFrame(shift_inner, fg_color="transparent")
        center_box.pack(side="left", expand=True)

        self.timer_label = ctk.CTkLabel(
            center_box,
            text="00:00:00",
            font=ctk.CTkFont(family="Consolas", size=36, weight="bold"),
            text_color=THEME["text_white"]
        )
        self.timer_label.pack()

        self.timer_subtitle = ctk.CTkLabel(
            center_box,
            text="Active Dialing Time",
            font=ctk.CTkFont(size=11),
            text_color=THEME["text_muted"]
        )
        self.timer_subtitle.pack()

        # Right: Shift Controls (Start / Pause / Resume / End)
        self.btn_box = ctk.CTkFrame(shift_inner, fg_color="transparent")
        self.btn_box.pack(side="right")

        self.btn_start = ctk.CTkButton(
            self.btn_box,
            text="▶ Start Shift",
            command=self.start_shift,
            fg_color=THEME["accent_teal"],
            hover_color="#059669",
            font=ctk.CTkFont(size=13, weight="bold"),
            height=38,
            corner_radius=8
        )
        self.btn_start.pack(side="left", padx=5)

        self.btn_pause = ctk.CTkButton(
            self.btn_box,
            text="⏸ Pause",
            command=self.pause_shift,
            fg_color=THEME["accent_amber"],
            hover_color="#d97706",
            font=ctk.CTkFont(size=13, weight="bold"),
            height=38,
            corner_radius=8
        )

        self.btn_resume = ctk.CTkButton(
            self.btn_box,
            text="▶ Resume",
            command=self.resume_shift,
            fg_color=THEME["accent_primary"],
            hover_color="#4f46e5",
            font=ctk.CTkFont(size=13, weight="bold"),
            height=38,
            corner_radius=8
        )

        self.btn_end = ctk.CTkButton(
            self.btn_box,
            text="⏹ End Shift",
            command=self.end_shift,
            fg_color="#334155",
            hover_color=THEME["accent_red"],
            font=ctk.CTkFont(size=13, weight="bold"),
            height=38,
            corner_radius=8
        )

        # 2. Key Metrics Row (4 Cards)
        metrics_container = ctk.CTkFrame(self, fg_color="transparent")
        metrics_container.pack(fill="x", padx=20, pady=10)
        metrics_container.grid_columnconfigure((0, 1, 2, 3), weight=1, uniform="stat_cards")

        self.card_dials = self._create_stat_card(metrics_container, 0, "TOTAL DIALS", "0", THEME["accent_blue"], "Target: 80 / day")
        self.card_transfers = self._create_stat_card(metrics_container, 1, "LIVE TRANSFERS", "0", THEME["accent_teal"], "Target: 4 / day")
        self.card_demos = self._create_stat_card(metrics_container, 2, "SCHEDULED DEMOS", "0", THEME["accent_purple"], "Direct AE calendar books")
        self.card_conversion = self._create_stat_card(metrics_container, 3, "CONVERSION RATE", "0.0%", "#f43f5e", "Transfers + Demos / Dials")

        # 3. Rapid Call Disposition Section (For live calls)
        dispo_card = ctk.CTkFrame(self, fg_color=THEME["card_bg"], corner_radius=12, border_width=1, border_color=THEME["border"])
        dispo_card.pack(fill="x", padx=20, pady=10)

        dispo_header = ctk.CTkFrame(dispo_card, fg_color="transparent")
        dispo_header.pack(fill="x", padx=16, pady=(14, 8))

        ctk.CTkLabel(
            dispo_header,
            text="⚡ RAPID CALL DISPOSITION (1-CLICK LOGGING)",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=THEME["text_muted"]
        ).pack(side="left")

        ctk.CTkLabel(
            dispo_header,
            text="Instant recording relative to active shift timeline",
            font=ctk.CTkFont(size=11),
            text_color="#64748b"
        ).pack(side="right")

        # Disposition Buttons Grid
        btn_grid = ctk.CTkFrame(dispo_card, fg_color="transparent")
        btn_grid.pack(fill="x", padx=16, pady=(0, 14))

        dispositions_config = [
            ("🔥 Live Transfer", THEME["accent_teal"], "#059669", True, "Live Transfer Completed"),
            ("📅 Booked Demo", THEME["accent_purple"], "#9333ea", False, "Scheduled Demo"),
            ("🗣️ Connected / Pitching", THEME["accent_blue"], "#0284c7", False, "Connected (Pitching)"),
            ("📬 Left Voicemail", "#475569", "#334155", False, "Left Voicemail"),
            ("🛡️ Gatekeeper Block", "#475569", "#334155", False, "Gatekeeper Rejection"),
            ("❌ Not Interested", "#475569", "#334155", False, "Not Interested"),
            ("⚠️ Bad / Disconnected", "#dc2626", "#b91c1c", False, "Bad Number / Disconnected"),
        ]

        for idx, (label, bg_col, hover_col, is_transfer, dispo_name) in enumerate(dispositions_config):
            btn = ctk.CTkButton(
                btn_grid,
                text=label,
                fg_color=bg_col,
                hover_color=hover_col,
                font=ctk.CTkFont(size=12, weight="bold"),
                height=34,
                corner_radius=6,
                command=lambda d=dispo_name, t=is_transfer: self.log_rapid_disposition(d, t)
            )
            btn.pack(side="left", fill="x", expand=True, padx=4)

        # 4. Recent Call Activity Feed
        activity_card = ctk.CTkFrame(self, fg_color=THEME["card_bg"], corner_radius=12, border_width=1, border_color=THEME["border"])
        activity_card.pack(fill="both", expand=True, padx=20, pady=(10, 15))

        act_head = ctk.CTkFrame(activity_card, fg_color="transparent")
        act_head.pack(fill="x", padx=16, pady=(12, 6))

        ctk.CTkLabel(
            act_head,
            text="TODAY'S CALL ACTIVITY & SHIFT TIMESTAMPING",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=THEME["text_muted"]
        ).pack(side="left")

        self.activity_scroll = ctk.CTkScrollableFrame(activity_card, fg_color="transparent")
        self.activity_scroll.pack(fill="both", expand=True, padx=12, pady=(0, 12))

    def _create_stat_card(self, parent, col: int, title: str, init_val: str, accent_col: str, subtext: str):
        card = ctk.CTkFrame(parent, fg_color=THEME["card_bg"], corner_radius=10, border_width=1, border_color=THEME["border"])
        card.grid(row=0, column=col, padx=6, sticky="nsew")

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=14, pady=12)

        ctk.CTkLabel(inner, text=title, font=ctk.CTkFont(size=11, weight="bold"), text_color=THEME["text_muted"]).pack(anchor="w")
        
        val_label = ctk.CTkLabel(inner, text=init_val, font=ctk.CTkFont(size=26, weight="bold"), text_color=accent_col)
        val_label.pack(anchor="w", pady=(4, 2))

        ctk.CTkLabel(inner, text=subtext, font=ctk.CTkFont(size=10), text_color="#64748b").pack(anchor="w")
        
        return val_label

    # --- Shift Operations ---

    def _check_active_shift(self):
        shift = db.get_active_or_latest_shift()
        if shift:
            self.active_shift = shift
            status = shift["status"]
            if status == "active":
                self._set_ui_active_state()
                self._start_timer_thread()
            elif status == "paused":
                self._set_ui_paused_state()
            else:
                self._set_ui_inactive_state()

    def start_shift(self):
        self.active_shift = db.start_shift()
        self._set_ui_active_state()
        self._start_timer_thread()
        self.refresh_metrics()
        if self.on_shift_updated:
            self.on_shift_updated()

    def pause_shift(self):
        if not self.active_shift:
            return
        self.active_shift = db.pause_shift(self.active_shift["id"])
        self.timer_running = False
        self._set_ui_paused_state()
        self.refresh_metrics()
        if self.on_shift_updated:
            self.on_shift_updated()

    def resume_shift(self):
        if not self.active_shift:
            return
        self.active_shift = db.resume_shift(self.active_shift["id"])
        self._set_ui_active_state()
        self._start_timer_thread()
        self.refresh_metrics()
        if self.on_shift_updated:
            self.on_shift_updated()

    def end_shift(self):
        if not self.active_shift:
            return
        self.timer_running = False
        self.active_shift = db.end_shift(self.active_shift["id"])
        self._set_ui_inactive_state()
        self.refresh_metrics()
        if self.on_shift_updated:
            self.on_shift_updated()

    def _set_ui_active_state(self):
        self.status_badge.configure(text="● ACTIVE DIALING SHIFT", text_color="#10b981", fg_color="#064e3b")
        self.btn_start.pack_forget()
        self.btn_resume.pack_forget()
        self.btn_pause.pack(side="left", padx=5)
        self.btn_end.pack(side="left", padx=5)

    def _set_ui_paused_state(self):
        self.status_badge.configure(text="⏸ SHIFT PAUSED", text_color="#f59e0b", fg_color="#451a03")
        self.btn_start.pack_forget()
        self.btn_pause.pack_forget()
        self.btn_resume.pack(side="left", padx=5)
        self.btn_end.pack(side="left", padx=5)

    def _set_ui_inactive_state(self):
        self.status_badge.configure(text="SHIFT INACTIVE", text_color="#94a3b8", fg_color="#1e293b")
        self.btn_pause.pack_forget()
        self.btn_resume.pack_forget()
        self.btn_end.pack_forget()
        self.btn_start.pack(side="left", padx=5)
        self.timer_label.configure(text="00:00:00")

    def _start_timer_thread(self):
        self.timer_running = True
        if self.timer_thread is None or not self.timer_thread.is_alive():
            self.timer_thread = threading.Thread(target=self._run_timer, daemon=True)
            self.timer_thread.start()

    def _run_timer(self):
        while self.timer_running:
            if self.active_shift and self.active_shift.get("start_time"):
                start_dt = datetime.fromisoformat(self.active_shift["start_time"])
                paused_sec = self.active_shift.get("paused_seconds", 0)
                gross = (datetime.now() - start_dt).total_seconds()
                net_seconds = max(0, int(gross - paused_sec))
                
                hours = net_seconds // 3600
                minutes = (net_seconds % 3600) // 60
                seconds = net_seconds % 60
                time_str = f"{hours:02}:{minutes:02}:{seconds:02}"
                
                try:
                    self.timer_label.configure(text=time_str)
                except Exception:
                    break
            time.sleep(1)

    # --- Call Logging ---

    def log_rapid_disposition(self, disposition: str, is_transfer: bool):
        """Records instant call disposition and re-renders metrics."""
        db.log_call(
            lead_id=None,
            disposition=disposition,
            is_live_transfer=is_transfer,
            notes=f"Logged via Rapid Disposition Bar"
        )
        self.refresh_metrics()
        if self.on_shift_updated:
            self.on_shift_updated()

    def refresh_metrics(self):
        """Refreshes stat cards and activity feed."""
        data = db.get_dashboard_metrics()
        self.card_dials.configure(text=str(data["total_dials"]))
        self.card_transfers.configure(text=str(data["live_transfers"]))
        self.card_demos.configure(text=str(data["scheduled_demos"]))
        self.card_conversion.configure(text=f"{data['conversion_rate_pct']}%")

        # Re-populate recent activity feed
        for child in self.activity_scroll.winfo_children():
            child.destroy()

        conn = db.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM call_logs ORDER BY id DESC LIMIT 15")
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            ctk.CTkLabel(
                self.activity_scroll,
                text="No calls recorded yet today. Click any rapid disposition button above to log your first call.",
                font=ctk.CTkFont(size=12),
                text_color=THEME["text_muted"]
            ).pack(pady=20)
            return

        for r in rows:
            item = ctk.CTkFrame(self.activity_scroll, fg_color="#1e1e2e", corner_radius=6)
            item.pack(fill="x", pady=2, padx=4)

            # Left: Disposition badge
            disp = r["disposition"]
            is_tr = r["is_live_transfer"] == 1
            badge_col = THEME["accent_teal"] if is_tr else ("#a855f7" if "Demo" in disp else "#475569")

            ctk.CTkLabel(
                item,
                text=disp,
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=badge_col,
                padx=10,
                pady=6
            ).pack(side="left")

            # Center: Shift Timeline Offset (e.g., +00h 42m into Shift)
            offset = r["shift_offset_seconds"]
            offset_text = f"+{offset // 3600:02}h {(offset % 3600) // 60:02}m into Shift" if offset > 0 else "Pre-Shift / Dial Block"
            ctk.CTkLabel(
                item,
                text=offset_text,
                font=ctk.CTkFont(size=11),
                text_color="#94a3b8"
            ).pack(side="left", padx=15)

            # Right: Real Time Stamp
            try:
                dt = datetime.fromisoformat(r["timestamp"])
                time_disp = dt.strftime("%I:%M:%S %p")
            except Exception:
                time_disp = r["timestamp"]

            ctk.CTkLabel(
                item,
                text=time_disp,
                font=ctk.CTkFont(size=11),
                text_color=THEME["text_muted"],
                padx=10
            ).pack(side="right")
