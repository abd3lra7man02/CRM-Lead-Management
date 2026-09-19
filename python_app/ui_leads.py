"""
Lead Management (CRM) View for CustomTkinter.
Features:
- Search and status filtering
- Data table showing lead details, timezone, status, and shift-relative timestamp
- Quick-add lead modal dialog with auto-timestamping relative to active shift
- Disposition logging per lead
"""
import customtkinter as ctk
from datetime import datetime
from typing import Optional, Callable

try:
    from config import THEME, US_TIMEZONES, LEAD_STATUSES
    import database as db
except ImportError:
    from .config import THEME, US_TIMEZONES, LEAD_STATUSES
    from . import database as db

class LeadsView(ctk.CTkFrame):
    def __init__(self, master, on_lead_updated: Optional[Callable] = None):
        super().__init__(master, fg_color="transparent")
        self.on_lead_updated = on_lead_updated
        self.search_query = ""
        self.status_filter = "All"

        self._build_ui()
        self.refresh_leads()

    def _build_ui(self):
        # 1. Top Controls Bar: Search, Status Filter, "+ New Lead" Button
        controls_card = ctk.CTkFrame(self, fg_color=THEME["card_bg"], corner_radius=10, border_width=1, border_color=THEME["border"])
        controls_card.pack(fill="x", padx=20, pady=(15, 10))

        inner = ctk.CTkFrame(controls_card, fg_color="transparent")
        inner.pack(fill="x", padx=16, pady=12)

        # Search Input
        self.search_entry = ctk.CTkEntry(
            inner,
            placeholder_text="🔍 Search lead name, company, phone or email...",
            font=ctk.CTkFont(size=13),
            width=320,
            height=36,
            fg_color="#181825",
            border_color=THEME["border"],
            corner_radius=8
        )
        self.search_entry.pack(side="left", padx=(0, 10))
        self.search_entry.bind("<KeyRelease>", self._on_search)

        # Status Filter Dropdown
        filter_options = ["All"] + LEAD_STATUSES
        self.status_dropdown = ctk.CTkOptionMenu(
            inner,
            values=filter_options,
            command=self._on_filter_changed,
            fg_color="#181825",
            button_color="#363a4f",
            button_hover_color="#4f46e5",
            dropdown_fg_color="#1e1e2e",
            font=ctk.CTkFont(size=12),
            height=36,
            corner_radius=8,
            width=170
        )
        self.status_dropdown.set("All")
        self.status_dropdown.pack(side="left", padx=5)

        # Right: "+ Add New Lead" Button
        self.btn_add_lead = ctk.CTkButton(
            inner,
            text="+ Add Lead",
            command=self.open_add_lead_modal,
            fg_color=THEME["accent_primary"],
            hover_color="#4f46e5",
            font=ctk.CTkFont(size=13, weight="bold"),
            height=36,
            corner_radius=8
        )
        self.btn_add_lead.pack(side="right")

        # 2. Table Column Headers
        headers_frame = ctk.CTkFrame(self, fg_color="#1e1e2e", corner_radius=8, height=36)
        headers_frame.pack(fill="x", padx=20, pady=(4, 6))

        cols = [
            ("LEAD & COMPANY", 0.26),
            ("CONTACT INFO", 0.22),
            ("TIMEZONE", 0.16),
            ("STATUS", 0.14),
            ("SHIFT TIMELINE", 0.12),
            ("ACTIONS", 0.10)
        ]
        for name, weight in cols:
            col_lbl = ctk.CTkLabel(
                headers_frame,
                text=name,
                font=ctk.CTkFont(size=11, weight="bold"),
                text_color=THEME["text_muted"]
            )
            col_lbl.pack(side="left", expand=True, fill="x", padx=8)

        # 3. Scrollable Table Container
        self.leads_scroll = ctk.CTkScrollableFrame(
            self,
            fg_color="transparent",
            corner_radius=0
        )
        self.leads_scroll.pack(fill="both", expand=True, padx=20, pady=(0, 15))

    def _on_search(self, event=None):
        self.search_query = self.search_entry.get().strip()
        self.refresh_leads()

    def _on_filter_changed(self, value):
        self.status_filter = value
        self.refresh_leads()

    def refresh_leads(self):
        """Fetches and populates leads matching filters."""
        for child in self.leads_scroll.winfo_children():
            child.destroy()

        leads = db.get_leads(search_query=self.search_query, status_filter=self.status_filter)

        if not leads:
            ctk.CTkLabel(
                self.leads_scroll,
                text="No matching leads found. Click '+ Add Lead' to create one.",
                font=ctk.CTkFont(size=13),
                text_color=THEME["text_muted"]
            ).pack(pady=40)
            return

        for lead in leads:
            row = ctk.CTkFrame(self.leads_scroll, fg_color=THEME["card_bg"], corner_radius=8, border_width=1, border_color=THEME["border"])
            row.pack(fill="x", pady=4)

            # Col 1: Name & Company
            c1 = ctk.CTkFrame(row, fg_color="transparent")
            c1.pack(side="left", expand=True, fill="x", padx=10, pady=8)
            ctk.CTkLabel(c1, text=lead["name"], font=ctk.CTkFont(size=13, weight="bold"), text_color=THEME["text_white"]).pack(anchor="w")
            ctk.CTkLabel(c1, text=lead["company"] or "Individual", font=ctk.CTkFont(size=11), text_color="#94a3b8").pack(anchor="w")

            # Col 2: Phone & Email
            c2 = ctk.CTkFrame(row, fg_color="transparent")
            c2.pack(side="left", expand=True, fill="x", padx=10, pady=8)
            ctk.CTkLabel(c2, text=lead["phone"] or "No phone", font=ctk.CTkFont(size=12), text_color=THEME["text_primary"]).pack(anchor="w")
            ctk.CTkLabel(c2, text=lead["email"] or "No email", font=ctk.CTkFont(size=11), text_color=THEME["text_muted"]).pack(anchor="w")

            # Col 3: Timezone
            c3 = ctk.CTkFrame(row, fg_color="transparent")
            c3.pack(side="left", expand=True, fill="x", padx=10, pady=8)
            tz_short = lead["timezone"].split(" ")[0] if lead["timezone"] else "US/Eastern"
            ctk.CTkLabel(c3, text=tz_short, font=ctk.CTkFont(size=12), text_color="#38bdf8").pack(anchor="w")
            follow = lead["next_followup"] or "No follow-up set"
            ctk.CTkLabel(c3, text=f"Follow: {follow}", font=ctk.CTkFont(size=10), text_color="#64748b").pack(anchor="w")

            # Col 4: Status Badge
            c4 = ctk.CTkFrame(row, fg_color="transparent")
            c4.pack(side="left", expand=True, fill="x", padx=10, pady=8)
            st = lead["status"]
            badge_bg = "#064e3b" if "Transfer" in st else ("#581c87" if "Meeting" in st else ("#1e293b" if "New" in st else "#78350f"))
            badge_txt = "#34d399" if "Transfer" in st else ("#c084fc" if "Meeting" in st else ("#94a3b8" if "New" in st else "#fbbf24"))

            lbl_st = ctk.CTkLabel(c4, text=st, font=ctk.CTkFont(size=11, weight="bold"), text_color=badge_txt, fg_color=badge_bg, corner_radius=6, padx=8, pady=3)
            lbl_st.pack(anchor="w")

            # Col 5: Shift Contact Offset
            c5 = ctk.CTkFrame(row, fg_color="transparent")
            c5.pack(side="left", expand=True, fill="x", padx=10, pady=8)
            offset = lead["shift_contact_offset_seconds"]
            if offset is not None and offset >= 0:
                off_str = f"+{offset // 3600:02}h {(offset % 3600) // 60:02}m"
                ctk.CTkLabel(c5, text=off_str, font=ctk.CTkFont(family="Consolas", size=12, weight="bold"), text_color="#10b981").pack(anchor="w")
                ctk.CTkLabel(c5, text="into shift block", font=ctk.CTkFont(size=10), text_color="#64748b").pack(anchor="w")
            else:
                ctk.CTkLabel(c5, text="Pre-Shift", font=ctk.CTkFont(size=12), text_color=THEME["text_muted"]).pack(anchor="w")

            # Col 6: Actions (Quick Call / Disposition)
            c6 = ctk.CTkFrame(row, fg_color="transparent")
            c6.pack(side="left", expand=True, fill="x", padx=10, pady=8)
            
            btn_call = ctk.CTkButton(
                c6,
                text="⚡ Log Call",
                command=lambda l=lead: self.open_disposition_modal(l),
                fg_color="#312e81",
                hover_color="#3730a3",
                font=ctk.CTkFont(size=11, weight="bold"),
                height=28,
                width=80,
                corner_radius=6
            )
            btn_call.pack(anchor="center")

    # --- Add Lead Modal Dialog ---

    def open_add_lead_modal(self):
        modal = ctk.CTkToplevel(self)
        modal.title("Add New SDR Lead")
        modal.geometry("460x520")
        modal.configure(fg_color=THEME["bg_dark"])
        modal.transient(self)
        modal.grab_set()

        ctk.CTkLabel(modal, text="New Lead Information", font=ctk.CTkFont(size=16, weight="bold"), text_color=THEME["text_white"]).pack(anchor="w", padx=20, pady=(20, 10))

        # Fields
        name_entry = self._create_modal_field(modal, "Full Contact Name *", "e.g. Alex Morgan")
        comp_entry = self._create_modal_field(modal, "Company Name", "e.g. Acme Corp")
        phone_entry = self._create_modal_field(modal, "Direct Phone", "e.g. +1 (555) 000-0000")
        email_entry = self._create_modal_field(modal, "Work Email", "e.g. alex@acme.com")
        
        # Timezone dropdown
        ctk.CTkLabel(modal, text="Target Timezone", font=ctk.CTkFont(size=11, weight="bold"), text_color=THEME["text_muted"]).pack(anchor="w", padx=20, pady=(4, 2))
        tz_dropdown = ctk.CTkOptionMenu(modal, values=US_TIMEZONES, fg_color="#24273a", button_color="#363a4f")
        tz_dropdown.set(US_TIMEZONES[0])
        tz_dropdown.pack(fill="x", padx=20, pady=(0, 8))

        follow_entry = self._create_modal_field(modal, "Next Scheduled Follow-up", "e.g. Tomorrow 2:00 PM")

        # Save Button
        def save():
            name = name_entry.get().strip()
            if not name:
                return
            db.create_lead({
                "name": name,
                "company": comp_entry.get().strip(),
                "phone": phone_entry.get().strip(),
                "email": email_entry.get().strip(),
                "timezone": tz_dropdown.get(),
                "next_followup": follow_entry.get().strip(),
                "status": "New Lead"
            })
            modal.destroy()
            self.refresh_leads()
            if self.on_lead_updated:
                self.on_lead_updated()

        ctk.CTkButton(
            modal,
            text="Save Lead & Stamp Timeline",
            command=save,
            fg_color=THEME["accent_primary"],
            hover_color="#4f46e5",
            font=ctk.CTkFont(size=13, weight="bold"),
            height=38,
            corner_radius=8
        ).pack(fill="x", padx=20, pady=16)

    def _create_modal_field(self, parent, label: str, placeholder: str):
        ctk.CTkLabel(parent, text=label, font=ctk.CTkFont(size=11, weight="bold"), text_color=THEME["text_muted"]).pack(anchor="w", padx=20, pady=(4, 2))
        entry = ctk.CTkEntry(parent, placeholder_text=placeholder, fg_color="#24273a", border_color=THEME["border"], height=32, corner_radius=6)
        entry.pack(fill="x", padx=20, pady=(0, 6))
        return entry

    # --- Call Disposition Modal for Single Lead ---

    def open_disposition_modal(self, lead: dict):
        modal = ctk.CTkToplevel(self)
        modal.title(f"Call Disposition - {lead['name']}")
        modal.geometry("420x420")
        modal.configure(fg_color=THEME["bg_dark"])
        modal.transient(self)
        modal.grab_set()

        ctk.CTkLabel(modal, text=f"Logging Call with {lead['name']}", font=ctk.CTkFont(size=15, weight="bold"), text_color=THEME["text_white"]).pack(anchor="w", padx=20, pady=(20, 5))
        ctk.CTkLabel(modal, text=f"{lead['company']} • {lead['phone']}", font=ctk.CTkFont(size=12), text_color="#94a3b8").pack(anchor="w", padx=20, pady=(0, 15))

        ctk.CTkLabel(modal, text="Select Disposition:", font=ctk.CTkFont(size=11, weight="bold"), text_color=THEME["text_muted"]).pack(anchor="w", padx=20)

        dispositions = [
            ("🔥 Live Transfer to AE", True, "#059669"),
            ("📅 Scheduled Demo / Meeting", False, "#9333ea"),
            ("🗣️ Connected / Pitched", False, "#0284c7"),
            ("📬 Left Voicemail", False, "#475569"),
            ("🛡️ Gatekeeper Block", False, "#475569"),
            ("❌ Not Interested", False, "#dc2626")
        ]

        for label, is_transfer, col in dispositions:
            def log_act(disp=label.split(" ", 1)[1], tr=is_transfer):
                db.log_call(lead_id=lead["id"], disposition=disp, is_live_transfer=tr)
                modal.destroy()
                self.refresh_leads()
                if self.on_lead_updated:
                    self.on_lead_updated()

            ctk.CTkButton(
                modal,
                text=label,
                command=log_act,
                fg_color=col,
                font=ctk.CTkFont(size=12, weight="bold"),
                height=34,
                corner_radius=6
            ).pack(fill="x", padx=20, pady=4)
