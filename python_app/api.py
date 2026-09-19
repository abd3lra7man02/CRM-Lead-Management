"""
FastAPI Mobile Bridge Module for SDR Shift CRM.
Runs asynchronously in a background daemon thread alongside CustomTkinter.
Provides local REST API endpoints allowing a future Android (Kotlin/Jetpack Compose)
app to sync leads, control shifts, and record dispositions over the local WiFi network.
"""
import socket
import threading
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

try:
    from config import API_HOST, API_PORT
    import database as db
except ImportError:
    from .config import API_HOST, API_PORT
    from . import database as db

# Initialize FastAPI instance
api_app = FastAPI(
    title="SDR Desktop Mobile Bridge API",
    description="Local REST API bridge connecting Windows SDR Desktop CRM with Android Jetpack Compose mobile app.",
    version="1.0.0"
)

# Enable CORS for local Android development and web testing
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---

class ShiftActionRequest(BaseModel):
    action: str = Field(..., description="Action to perform: 'start', 'pause', 'resume', or 'end'")

class LeadCreateRequest(BaseModel):
    name: str
    company: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    timezone: Optional[str] = "US/Eastern (EST/EDT)"
    status: Optional[str] = "New Lead"
    next_followup: Optional[str] = ""
    notes: Optional[str] = ""

class CallDispositionRequest(BaseModel):
    lead_id: Optional[int] = None
    disposition: str
    is_live_transfer: bool = False
    duration_seconds: int = 0
    notes: Optional[str] = ""

class StatusUpdateItem(BaseModel):
    lead_id: int
    status: str

class SyncPushRequest(BaseModel):
    new_leads: List[LeadCreateRequest] = []
    status_updates: List[StatusUpdateItem] = []

class ChromeDialerCallPayload(BaseModel):
    phone_number: str = Field(..., description="Phone number dialed from web browser/CRM")
    lead_name: Optional[str] = None
    company: Optional[str] = None
    event_type: str = Field(default="call_started", description="'call_started', 'call_ended', or 'disposition'")
    call_duration_seconds: int = 0
    disposition: Optional[str] = "Dial Initiated (Chrome Extension)"
    timestamp: Optional[str] = None
    notes: Optional[str] = ""

# --- API Endpoints ---

@api_app.get("/")
def root():
    return {
        "status": "online",
        "service": "SDR Shift CRM, Mobile Bridge & Chrome Extension Web Dialer Hook",
        "endpoints": [
            "/api/status",
            "/api/log_call",
            "/api/sync",
            "/api/leads",
            "/api/shift/action",
            "/api/network-info"
        ]
    }

@api_app.get("/api/network-info")
def get_network_info():
    """Returns local LAN IP of the Windows machine to help configure the Android client."""
    local_ips = []
    hostname = socket.gethostname()
    try:
        # Probe outgoing socket to discover primary LAN IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        local_ips.append(primary_ip)
    except Exception:
        primary_ip = "127.0.0.1"

    return {
        "hostname": hostname,
        "recommended_api_url": f"http://{primary_ip}:{API_PORT}",
        "port": API_PORT,
        "note": "Ensure your Android phone is connected to the same WiFi network."
    }

@api_app.get("/api/status")
def get_shift_status():
    """Returns today's active shift status, duration, and core dialing stats."""
    metrics = db.get_dashboard_metrics()
    return {
        "status": "success",
        "data": metrics
    }

@api_app.post("/api/shift/action")
def perform_shift_action(req: ShiftActionRequest):
    """Controls shift state (start, pause, resume, end) from mobile device."""
    action = req.action.lower()
    current_shift = db.get_active_or_latest_shift()

    if action == "start":
        res = db.start_shift()
        return {"status": "started", "shift": res}
    
    if not current_shift:
        raise HTTPException(status_code=400, detail="No active shift found to modify.")

    shift_id = current_shift["id"]

    if action == "pause":
        res = db.pause_shift(shift_id)
        return {"status": "paused", "shift": res}
    elif action == "resume":
        res = db.resume_shift(shift_id)
        return {"status": "resumed", "shift": res}
    elif action == "end":
        res = db.end_shift(shift_id)
        return {"status": "completed", "shift": res}
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported shift action '{action}'. Use start/pause/resume/end.")

@api_app.get("/api/leads")
def list_leads(search: str = "", status: str = "All"):
    """Fetches list of leads with optional search and status filter."""
    leads = db.get_leads(search_query=search, status_filter=status)
    return {
        "status": "success",
        "count": len(leads),
        "leads": leads
    }

@api_app.post("/api/leads")
def add_lead(lead: LeadCreateRequest):
    """Adds a new lead from mobile."""
    created = db.create_lead(lead.dict())
    return {
        "status": "created",
        "lead": created
    }

@api_app.post("/api/leads/{lead_id}/disposition")
def log_lead_disposition(lead_id: int, req: CallDispositionRequest):
    """Instantly logs a call disposition against a specific lead."""
    call_record = db.log_call(
        lead_id=lead_id,
        disposition=req.disposition,
        is_live_transfer=req.is_live_transfer,
        notes=req.notes or "",
        duration_seconds=req.duration_seconds
    )
    return {
        "status": "logged",
        "call_log": call_record
    }

# ==========================================
# Chrome Extension Web Dialer Hook (/api/log_call)
# ==========================================

@api_app.post("/api/log_call")
def log_chrome_extension_call(payload: ChromeDialerCallPayload):
    """
    Chrome Extension Web Dialer Bridge:
    Receives JSON POST from the Chrome Extension content script injected into web dialers.
    Logs the dialed number, stamps shift-relative offset, and updates desktop stats in real time.
    """
    call_record = db.log_chrome_call(
        phone_number=payload.phone_number,
        lead_name=payload.lead_name,
        company=payload.company,
        event_type=payload.event_type,
        duration_seconds=payload.call_duration_seconds,
        disposition=payload.disposition,
        notes=payload.notes or ""
    )
    metrics = db.get_dashboard_metrics()
    return {
        "status": "success",
        "message": f"Dial to {payload.phone_number} successfully recorded into desktop SQLite database",
        "call_log": call_record,
        "metrics": metrics
    }

# ==========================================
# The Strict Required Mobile API Hook (/api/sync)
# ==========================================

@api_app.get("/api/sync")
def sync_pull():
    """
    Mobile Bridge Sync PULL:
    Allows an external Android client to fetch today's leads, shift status, and metrics via JSON.
    """
    payload = db.get_sync_payload()
    return {
        "sync_version": "1.0",
        "sync_type": "pull_full",
        "payload": payload
    }

@api_app.post("/api/sync")
def sync_push(sync_data: SyncPushRequest):
    """
    Mobile Bridge Sync PUSH:
    Receives new leads created on the Android device and batch status updates,
    persisting them directly into the Windows SQLite database.
    """
    new_leads_dicts = [item.dict() for item in sync_data.new_leads]
    status_updates_dicts = [item.dict() for item in sync_data.status_updates]

    result = db.apply_sync_push(new_leads_dicts, status_updates_dicts)
    return {
        "sync_version": "1.0",
        "sync_type": "push_ack",
        "result": result
    }

# --- Background Server Runner ---

class BackgroundApiServer:
    """Manages the lifecycle of Uvicorn running in a background daemon thread."""
    def __init__(self, host: str = API_HOST, port: int = API_PORT):
        self.host = host
        self.port = port
        self.server = None
        self.thread = None

    def start(self):
        """Starts uvicorn in a daemon thread so it terminates when the CustomTkinter GUI exits."""
        config = uvicorn.Config(
            app=api_app,
            host=self.host,
            port=self.port,
            log_level="warning",
            access_log=False
        )
        self.server = uvicorn.Server(config)
        self.thread = threading.Thread(target=self.server.run, daemon=True)
        self.thread.start()
        print(f"[Mobile Bridge API] Server started on http://{self.host}:{self.port}")

    def stop(self):
        """Signals uvicorn server to shut down cleanly."""
        if self.server:
            self.server.should_exit = True

# Global server manager singleton
api_bridge_server = BackgroundApiServer()

def start_mobile_bridge():
    """Entry point called by main.py on application startup."""
    api_bridge_server.start()

def stop_mobile_bridge():
    """Entry point called by main.py when closing window."""
    api_bridge_server.stop()
