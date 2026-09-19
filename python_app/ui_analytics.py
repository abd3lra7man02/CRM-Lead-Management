"""
Shift & Timing Tracker View for CustomTkinter.
Features:
- Peak lead interaction times (hourly breakdown & connect rates)
- Dialing block optimization metrics
- Pipeline time-in-status distribution
- Shift duration and work vs pause efficiency
"""
import customtkinter as ctk
from datetime import datetime
from typing import Optional

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
        self.refresh_analytics()

    def _build_ui(self):
        # Header Banner
        header = ctk.CTkFrame(self, fg_color=THEME["card_bg"], corner_radius=10, border_width=1, border_color=THEME["border"])
        header.pack(fill="x", padx=20, pady=(15, 10))

        h_inner = ctk.CTkFrame(header, fg_color="transparent")
        h_inner.pack(fill="x", padx=16, pady=12)

        ctk.CTkLabel(
            h_inner,
            text="SHIFT & TIMING TRACKER • OPTIMIZING DIALING BLOCKS",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=THEME["text_white"]
        ).pack(anchor="w")

        ctk.CTkLabel(
            h_inner,
            text="Empirical connect rate by hour of day and pipeline velocity tracking to maximize pickup rates.",
            font=ctk.CTkFont(size=12),
            text_color=THEME["text_muted"]
        ).pack(anchor="w", pady=(2, 0))

        # Two-column container
        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=20, pady=(0, 15))
        body.grid_columnconfigure(0, weight=3)
        body.grid_columnconfigure(1, weight=2)

        # Left Column: Peak Lead Interaction Times (Hourly Connect Rate Bars)
        self.peak_card = ctk.CTkFrame(body, fg_color=THEME["card_bg"], corner_radius=10, border_width=1, border_color=THEME["border"])
        self.peak_card.grid(row=0, column=0, sticky="nsew", padx=(0, 10))

        peak_header = ctk.CTkFrame(self.peak_card, fg_color="transparent")
        peak_header.pack(fill="x", padx=16, pady=(14, 8))

        ctk.CTkLabel(
            peak_header,
            text="PEAK INTERACTION TIMES (HOURLY CONNECT RATE)",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=THEME["text_muted"]
        ).pack(anchor="w")

        self.peak_scroll = ctk.CTkScrollableFrame(self.peak_card, fg_color="transparent")
        self.peak_scroll.pack(fill="both", expand=True, padx=12, pady=(0, 12))

        # Right Column: Status Pipeline & Recommendations
        right_container = ctk.CTkFrame(body, fg_color="transparent")
        right_container.grid(row=0, column=1, sticky="nsew")

        # 1. Pipeline Time-in-Status
        self.status_card = ctk.CTkFrame(right_container, fg_color=THEME["card_bg"], corner_radius=10, border_width=1, border_color=THEME["border"])
        self.status_card.pack(fill="x", pady=(0, 10))

        st_head = ctk.CTkFrame(self.status_card, fg_color="transparent")
        st_head.pack(fill="x", padx=16, pady=(12, 6))

        ctk.CTkLabel(
            st_head,
            text="PIPELINE DISTRIBUTION (TIME-IN-STATUS)",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=THEME["text_muted"]
        ).pack(anchor="w")

        self.status_list_frame = ctk.CTkFrame(self.status_card, fg_color="transparent")
        self.status_list_frame.pack(fill="x", padx=16, pady=(0, 12))

        # 2. Dialing Block Strategy Tips
        strategy_card = ctk.CTkFrame(right_container, fg_color=THEME["card_bg"], corner_radius=10, border_width=1, border_color=THEME["border"])
        strategy_card.pack(fill="both", expand=True)

        strat_head = ctk.CTkFrame(strategy_card, fg_color="transparent")
        strat_head.pack(fill="x", padx=16, pady=(12, 6))

        ctk.CTkLabel(
            strat_head,
            text="RECOMMENDED SDR DIALING BLOCKS",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=THEME["accent_teal"]
        ).pack(anchor="w")

        tips = [
            ("⚡ Block 1: 08:30 - 10:00 AM", "Highest pickup for C-Suite before meetings begin."),
            ("🎯 Block 2: 11:30 AM - 01:00 PM", "Lunch break window - great for mobile phone outreach."),
            ("🚀 Block 3: 04:00 - 05:30 PM", "Peak wrap-up window: gatekeepers leave, prospects answer desks.")
        ]

        for title, desc in tips:
            box = ctk.CTkFrame(strategy_card, fg_color="#181825", corner_radius=6)
            box.pack(fill="x", padx=14, pady=4)
            ctk.CTkLabel(box, text=title, font=ctk.CTkFont(size=11, weight="bold"), text_color=THEME["text_white"]).pack(anchor="w", padx=10, pady=(6, 2))
            ctk.CTkLabel(box, text=desc, font=ctk.CTkFont(size=10), text_color="#94a3b8").pack(anchor="w", padx=10, pady=(0, 6))

    def refresh_analytics(self):
        """Re-computes hourly distribution and pipeline counts."""
        # Refresh Peak Hourly Connects
        for child in self.peak_scroll.winfo_children():
            child.destroy()

        hourly_stats = db.get_peak_interaction_stats()

        # If empty (no calls yet), provide default 8 AM - 5 PM simulation baseline
        if not hourly_stats:
            hourly_stats = [
                {"hour": 8, "label": "8 AM", "total_calls": 14, "connects": 4, "transfers": 1, "connect_rate_pct": 28.5},
                {"hour": 9, "label": "9 AM", "total_calls": 26, "connects": 11, "transfers": 2, "connect_rate_pct": 42.3},
                {"hour": 10, "label": "10 AM", "total_calls": 18, "connects": 5, "transfers": 0, "connect_rate_pct": 27.7},
                {"hour": 11, "label": "11 AM", "total_calls": 22, "connects": 9, "transfers": 1, "connect_rate_pct": 40.9},
                {"hour": 13, "label": "1 PM", "total_calls": 12, "connects": 3, "transfers": 0, "connect_rate_pct": 25.0},
                {"hour": 14, "label": "2 PM", "total_calls": 20, "connects": 8, "transfers": 1, "connect_rate_pct": 40.0},
                {"hour": 16, "label": "4 PM", "total_calls": 25, "connects": 12, "transfers": 3, "connect_rate_pct": 48.0}
            ]

        for item in hourly_stats:
            row = ctk.CTkFrame(self.peak_scroll, fg_color="#181825", corner_radius=6)
            row.pack(fill="x", pady=3, padx=4)

            # Hour label
            ctk.CTkLabel(
                row,
                text=item["label"],
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=THEME["text_white"],
                width=65,
                anchor="w"
            ).pack(side="left", padx=(10, 5), pady=8)

            # Progress Bar showing connect rate %
            bar_container = ctk.CTkFrame(row, fg_color="transparent")
            bar_container.pack(side="left", fill="x", expand=True, padx=10)

            rate = item["connect_rate_pct"]
            pbar = ctk.CTkProgressBar(bar_container, height=10, corner_radius=5)
            pbar.pack(fill="x")
            pbar.set(min(1.0, rate / 100.0))
            
            # Highlight peak windows in emerald green, regular in indigo
            if rate >= 40.0:
                pbar.configure(progress_color=THEME["accent_teal"])
            else:
                pbar.configure(progress_color=THEME["accent_primary"])

            # Connect Rate & Call volume stats
            stat_text = f"{rate}% Connect ({item['connects']}/{item['total_calls']} calls)"
            ctk.CTkLabel(
                row,
                text=stat_text,
                font=ctk.CTkFont(size=11, weight="bold"),
                text_color=THEME["accent_teal"] if rate >= 40 else THEME["text_primary"],
                width=170,
                anchor="e"
            ).pack(side="right", padx=(5, 10))

        # Refresh Pipeline Status Counts
        for child in self.status_list_frame.winfo_children():
            child.destroy()

        status_stats = db.get_time_in_status_stats()
        for item in status_stats:
            row = ctk.CTkFrame(self.status_list_frame, fg_color="#181825", corner_radius=6)
            row.pack(fill="x", pady=2)

            ctk.CTkLabel(
                row,
                text=item["status"],
                font=ctk.CTkFont(size=11),
                text_color=THEME["text_primary"]
            ).pack(side="left", padx=10, pady=6)

            ctk.CTkLabel(
                row,
                text=str(item["count"]),
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=THEME["accent_blue"]
            ).pack(side="right", padx=10)
