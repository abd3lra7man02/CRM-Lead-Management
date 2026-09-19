"""
Configuration settings and theme palette for SDR CRM & Shift Dashboard.
Strictly dark-toned palette designed for CustomTkinter on Windows.
"""
import os
import sys

# Application Metadata
APP_NAME = "SDR Shift CRM & Mobile Bridge"
APP_VERSION = "1.0.0"

# Local Storage (Persist database next to the .exe file when packaged with PyInstaller)
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "sdr_crm.db")

# Local Mobile Bridge REST API Configuration
API_HOST = "0.0.0.0"  # Binds to all interfaces so Android phone on same LAN/WiFi can connect
API_PORT = 8000

# Strict Dark-Toned UI Theme Palette (Hex Colors for CustomTkinter)
THEME = {
    "bg_dark": "#181825",        # Deep slate/charcoal background
    "bg_sidebar": "#1e1e2e",     # Sidebar navigation background
    "card_bg": "#24273a",        # Container & card background
    "card_hover": "#2f334d",     # Interactive card hover
    "border": "#363a4f",         # Subtle border dividers
    
    # Accent & Metric Colors
    "accent_primary": "#6366f1", # Indigo primary accent
    "accent_teal": "#10b981",    # Emerald / connected / live transfer
    "accent_blue": "#38bdf8",    # Sky blue / dials metric
    "accent_amber": "#f59e0b",   # Amber / follow up / paused
    "accent_red": "#ef4444",     # Red / end shift / bad number
    "accent_purple": "#a855f7",  # Purple / scheduled demo
    
    # Text Typography
    "text_primary": "#cad3f5",   # High-contrast readable body
    "text_muted": "#8087a2",     # Secondary subtle metadata
    "text_white": "#ffffff"      # Pure white emphasis
}

# Supported Timezones for SDR Outreach
US_TIMEZONES = [
    "US/Eastern (EST/EDT)",
    "US/Central (CST/CDT)",
    "US/Mountain (MST/MDT)",
    "US/Pacific (PST/PDT)",
    "Europe/London (GMT/BST)",
    "Europe/Berlin (CET/CEST)"
]

# Standard Call Dispositions
DISPOSITIONS = [
    "Connected (Pitching)",
    "Gatekeeper Rejection",
    "Left Voicemail",
    "Scheduled Demo",
    "Live Transfer Completed",
    "Not Interested",
    "Bad Number / Disconnected"
]

LEAD_STATUSES = [
    "New Lead",
    "Contacted",
    "Follow-Up Required",
    "Meeting Booked",
    "Transferred to AE",
    "Unqualified"
]
