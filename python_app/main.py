"""
Main Application Entry Point for SDR Shift CRM & Mobile Bridge.
Packages CustomTkinter Windows GUI with a background FastAPI daemon thread.
"""
import sys
import os
import customtkinter as ctk

# Ensure package modules can be imported if executed directly or via PyInstaller
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    if sys._MEIPASS not in sys.path:
        sys.path.insert(0, sys._MEIPASS)
else:
    app_dir = os.path.dirname(os.path.abspath(__file__))
    if app_dir not in sys.path:
        sys.path.insert(0, app_dir)

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

        # 1. Initialize Database Schema
        db.init_db()

        # 2. Start Background FastAPI Mobile Bridge Server
        api.start_mobile_bridge()

        # 3. Build UI Layout
        self._build_layout()

        # 4. Handle Clean Shutdown on Window Close
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def _build_layout(self):
        # Master grid layout: Col 0 = Sidebar, Col 1 = Main View
        self.grid_columnconfigure(0, weight=0)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # --- Sidebar Navigation ---
        self.sidebar = ctk.CTkFrame(self, fg_color=THEME["bg_sidebar"], width=230, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_rowconfigure(6, weight=1)

        # Brand / Logo Header
        brand_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        brand_frame.grid(row=0, column=0, padx=20, pady=(24, 20), sticky="w")

        ctk.CTkLabel(
            brand_frame,
            text="⚡ SDR SHIFT CRM",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=THEME["text_white"]
        ).pack(anchor="w")

        ctk.CTkLabel(
            brand_frame,
            text="Windows + Mobile Bridge",
            font=ctk.CTkFont(size=11),
            text_color=THEME["accent_primary"]
        ).pack(anchor="w")

        # Nav Buttons
        self.btn_nav_dashboard = self._create_nav_btn("📊  Shift Dashboard", 1, self.show_dashboard)
        self.btn_nav_leads = self._create_nav_btn("👥  Lead CRM", 2, self.show_leads)
        self.btn_nav_analytics = self._create_nav_btn("⏱️  Timing & Blocks", 3, self.show_analytics)
        self.btn_nav_mobile = self._create_nav_btn("📱  Mobile Bridge API", 4, self.show_mobile_bridge)

        # Bottom System Info (FastAPI Server Status Indicator)
        bottom_box = ctk.CTkFrame(self.sidebar, fg_color="#11111b", corner_radius=8)
        bottom_box.grid(row=7, column=0, padx=14, pady=16, sticky="sew")

        status_row = ctk.CTkFrame(bottom_box, fg_color="transparent")
        status_row.pack(fill="x", padx=10, pady=(8, 4))

        ctk.CTkLabel(
            status_row,
            text="●",
            font=ctk.CTkFont(size=12),
            text_color="#10b981"
        ).pack(side="left")

        ctk.CTkLabel(
            status_row,
            text="FastAPI Server Online",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color="#10b981"
        ).pack(side="left", padx=5)

        ctk.CTkLabel(
            bottom_box,
            text=f"Port: {API_PORT} (0.0.0.0)\nReady for Android Sync",
            font=ctk.CTkFont(size=10),
            text_color="#64748b",
            justify="left"
        ).pack(anchor="w", padx=10, pady=(0, 8))

        # --- Content Area Container ---
        self.content_area = ctk.CTkFrame(self, fg_color="transparent")
        self.content_area.grid(row=0, column=1, sticky="nsew")

        # Initialize View Instances
        self.view_dashboard = DashboardView(self.content_area, on_shift_updated=self._on_data_updated)
        self.view_leads = LeadsView(self.content_area, on_lead_updated=self._on_data_updated)
        self.view_analytics = AnalyticsView(self.content_area)
        self.view_mobile = self._create_mobile_bridge_view(self.content_area)

        # Default Active View
        self.current_nav_btn = None
        self.show_dashboard()

    def _create_nav_btn(self, text: str, row: int, command):
        btn = ctk.CTkButton(
            self.sidebar,
            text=text,
            command=command,
            fg_color="transparent",
            hover_color="#24273a",
            text_color=THEME["text_primary"],
            font=ctk.CTkFont(size=13, weight="bold"),
            anchor="w",
            height=40,
            corner_radius=8
        )
        btn.grid(row=row, column=0, padx=12, pady=4, sticky="ew")
        return btn

    def _highlight_nav_btn(self, active_btn):
        for btn in [self.btn_nav_dashboard, self.btn_nav_leads, self.btn_nav_analytics, self.btn_nav_mobile]:
            if btn == active_btn:
                btn.configure(fg_color="#24273a", text_color=THEME["text_white"])
            else:
                btn.configure(fg_color="transparent", text_color=THEME["text_primary"])

    def _hide_all_views(self):
        self.view_dashboard.pack_forget()
        self.view_leads.pack_forget()
        self.view_analytics.pack_forget()
        self.view_mobile.pack_forget()

    def show_dashboard(self):
        self._hide_all_views()
        self._highlight_nav_btn(self.btn_nav_dashboard)
        self.view_dashboard.pack(fill="both", expand=True)
        self.view_dashboard.refresh_metrics()

    def show_leads(self):
        self._hide_all_views()
        self._highlight_nav_btn(self.btn_nav_leads)
        self.view_leads.pack(fill="both", expand=True)
        self.view_leads.refresh_leads()

    def show_analytics(self):
        self._hide_all_views()
        self._highlight_nav_btn(self.btn_nav_analytics)
        self.view_analytics.pack(fill="both", expand=True)
        self.view_analytics.refresh_analytics()

    def show_mobile_bridge(self):
        self._hide_all_views()
        self._highlight_nav_btn(self.btn_nav_mobile)
        self.view_mobile.pack(fill="both", expand=True)

    def _create_mobile_bridge_view(self, parent):
        frame = ctk.CTkFrame(parent, fg_color="transparent")
        
        card = ctk.CTkFrame(frame, fg_color=THEME["card_bg"], corner_radius=10, border_width=1, border_color=THEME["border"])
        card.pack(fill="x", padx=20, pady=20)

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.pack(fill="x", padx=20, pady=18)

        ctk.CTkLabel(inner, text="📱 NATIVE ANDROID MOBILE BRIDGE (FASTAPI THREAD)", font=ctk.CTkFont(size=14, weight="bold"), text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(inner, text="This daemon REST server enables your Kotlin/Jetpack Compose Android app to sync leads and shift timings over your local network.", font=ctk.CTkFont(size=12), text_color=THEME["text_muted"]).pack(anchor="w", pady=(4, 14))

        # Endpoint list
        endpoints = [
            ("GET /api/sync", "Fetches today's active shift status, dial metrics, and lead lists in JSON format."),
            ("POST /api/sync", "Pushes new leads and disposition status updates from Android into SQLite."),
            ("POST /api/shift/action", "Remotely starts, pauses, or ends shift from mobile notification action."),
            ("GET /api/network-info", "Discovers desktop LAN IP address for Android configuration.")
        ]

        for ep, desc in endpoints:
            box = ctk.CTkFrame(inner, fg_color="#181825", corner_radius=6)
            box.pack(fill="x", pady=4)
            ctk.CTkLabel(box, text=ep, font=ctk.CTkFont(family="Consolas", size=12, weight="bold"), text_color=THEME["accent_teal"]).pack(side="left", padx=12, pady=8)
            ctk.CTkLabel(box, text=desc, font=ctk.CTkFont(size=11), text_color="#94a3b8").pack(side="left", padx=10)

        # Direct Android Jetpack Compose Code Sample info
        info_card = ctk.CTkFrame(frame, fg_color=THEME["card_bg"], corner_radius=10, border_width=1, border_color=THEME["border"])
        info_card.pack(fill="both", expand=True, padx=20, pady=(0, 20))

        info_inner = ctk.CTkFrame(info_card, fg_color="transparent")
        info_inner.pack(fill="both", expand=True, padx=20, pady=16)

        ctk.CTkLabel(info_inner, text="CONNECTING FROM KOTLIN / JETPACK COMPOSE", font=ctk.CTkFont(size=13, weight="bold"), text_color=THEME["text_white"]).pack(anchor="w")
        
        sample_code = (
            "// Retrofit / Ktor Sync Hook in Android:\n"
            "val client = HttpClient(CIO) {\n"
            "    install(ContentNegotiation) { json() }\n"
            "}\n"
            "// Pull Shift & Leads from Windows Desktop:\n"
            "val response = client.get(\"http://192.168.1.X:8000/api/sync\").body<SyncPayload>()\n"
            "Log.d(\"SDR_SYNC\", \"Active Shift: ${response.shift?.status}, Dials: ${response.metrics.total_dials}\")"
        )
        
        code_box = ctk.CTkTextbox(info_inner, font=ctk.CTkFont(family="Consolas", size=11), fg_color="#181825", text_color="#38bdf8")
        code_box.pack(fill="both", expand=True, pady=10)
        code_box.insert("1.0", sample_code)
        code_box.configure(state="disabled")

        return frame

    def _on_data_updated(self):
        """Callback when shift or leads are modified."""
        try:
            self.view_dashboard.refresh_metrics()
            self.view_analytics.refresh_analytics()
        except Exception:
            pass

    def on_closing(self):
        """Terminates background API server and closes GUI cleanly."""
        print("[SDR App] Shutting down application and background threads...")
        api.stop_mobile_bridge()
        self.destroy()
        sys.exit(0)

if __name__ == "__main__":
    app = SdrApp()
    app.mainloop()
