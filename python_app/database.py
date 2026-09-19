"""
SQLite Database Layer for SDR Shift CRM & Mobile Bridge.
Provides robust local storage with thread-safe access for both CustomTkinter GUI
and FastAPI background threads.
"""
import sqlite3
import threading
from datetime import datetime, date
from typing import List, Dict, Any, Optional
import os
try:
    from config import DATABASE_PATH
except ImportError:
    from .config import DATABASE_PATH

# Thread lock to serialize writes between GUI thread and FastAPI background server
db_lock = threading.Lock()

def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with Row factory and WAL mode enabled for high concurrency."""
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Initializes the SQLite schema if tables do not exist."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Shifts Table
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

        # 2. Shift Pause Intervals
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shift_pauses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shift_id INTEGER NOT NULL,
                pause_time TEXT NOT NULL,
                resume_time TEXT,
                FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
            );
        """)

        # 3. Leads (CRM) Table
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
                shift_contact_offset_seconds INTEGER,
                FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
            );
        """)

        # 4. Call & Disposition Logs Table
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
                notes TEXT,
                FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
                FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
            );
        """)

        conn.commit()

        # Seed sample SDR leads if empty
        cursor.execute("SELECT COUNT(*) FROM leads")
        if cursor.fetchone()[0] == 0:
            seed_initial_data(conn)

        conn.close()

def seed_initial_data(conn: sqlite3.Connection):
    """Populates realistic initial data for immediate SDR workflow demonstration."""
    sample_leads = [
        ("Sarah Jenkins", "Apex Logistics", "+1 (555) 234-8901", "sjenkins@apexlogistics.io", "US/Eastern (EST/EDT)", "New Lead", "Today at 2:00 PM", "Interested in automated dispatch tracking."),
        ("Marcus Vance", "CloudScale Networks", "+1 (555) 981-4432", "mvance@cloudscale.net", "US/Central (CST/CDT)", "Contacted", "Tomorrow at 10:30 AM", "Reached IT Director directly. Requested feature one-pager."),
        ("Elena Rostova", "FinPulse Analytics", "+1 (555) 672-1190", "elena@finpulse.com", "US/Pacific (PST/PDT)", "Transferred to AE", "Completed Transfer", "Hot lead: 150-seat team looking to migrate by next month."),
        ("David Miller", "Nexus Manufacturing", "+1 (555) 433-8765", "dmiller@nexus-mfg.com", "US/Mountain (MST/MDT)", "Meeting Booked", "Friday at 1:00 PM", "Demo booked with Senior AE Taylor. Focus on compliance."),
        ("Rachel Green", "Beacon Health Systems", "+1 (555) 321-7654", "rgreen@beaconhealth.org", "US/Eastern (EST/EDT)", "Follow-Up Required", "Tomorrow at 3:15 PM", "Gatekeeper requested call back when CEO returns from lunch.")
    ]
    
    now = datetime.now().isoformat()
    cursor = conn.cursor()
    for name, comp, phone, email, tz, status, follow, notes in sample_leads:
        cursor.execute("""
            INSERT INTO leads (name, company, phone, email, timezone, status, next_followup, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, comp, phone, email, tz, status, follow, notes, now, now))
    conn.commit()

# --- Shift Lifecycle Methods ---

def get_active_or_latest_shift() -> Optional[Dict[str, Any]]:
    """Retrieves the active, paused, or most recent shift for today."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        today = date.today().isoformat()
        cursor.execute("""
            SELECT * FROM shifts 
            WHERE date = ? AND status IN ('active', 'paused')
            ORDER BY id DESC LIMIT 1
        """, (today,))
        row = cursor.fetchone()
        if not row:
            cursor.execute("""
                SELECT * FROM shifts 
                WHERE date = ? 
                ORDER BY id DESC LIMIT 1
            """, (today,))
            row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def start_shift() -> Dict[str, Any]:
    """Starts a new SDR dialing shift."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        today = now.date().isoformat()
        now_str = now.isoformat()

        # End any dangling active shift
        cursor.execute("UPDATE shifts SET status = 'completed', end_time = ? WHERE status IN ('active', 'paused')", (now_str,))

        cursor.execute("""
            INSERT INTO shifts (date, start_time, total_seconds, paused_seconds, status, created_at)
            VALUES (?, ?, 0, 0, 'active', ?)
        """, (today, now_str, now_str))
        shift_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

def pause_shift(shift_id: int) -> Optional[Dict[str, Any]]:
    """Pauses an active shift and logs the pause interval."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.now().isoformat()

        cursor.execute("UPDATE shifts SET status = 'paused' WHERE id = ? AND status = 'active'", (shift_id,))
        if cursor.rowcount > 0:
            cursor.execute("INSERT INTO shift_pauses (shift_id, pause_time) VALUES (?, ?)", (shift_id, now_str))
            conn.commit()

        cursor.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def resume_shift(shift_id: int) -> Optional[Dict[str, Any]]:
    """Resumes a paused shift and calculates paused duration."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        now_str = now.isoformat()

        # Update last open pause record
        cursor.execute("""
            SELECT id, pause_time FROM shift_pauses 
            WHERE shift_id = ? AND resume_time IS NULL 
            ORDER BY id DESC LIMIT 1
        """, (shift_id,))
        pause_record = cursor.fetchone()

        paused_delta = 0
        if pause_record:
            pause_time = datetime.fromisoformat(pause_record["pause_time"])
            paused_delta = int((now - pause_time).total_seconds())
            cursor.execute("UPDATE shift_pauses SET resume_time = ? WHERE id = ?", (now_str, pause_record["id"]))

        cursor.execute("""
            UPDATE shifts 
            SET status = 'active', paused_seconds = paused_seconds + ? 
            WHERE id = ? AND status = 'paused'
        """, (paused_delta, shift_id))

        conn.commit()
        cursor.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def end_shift(shift_id: int) -> Optional[Dict[str, Any]]:
    """Ends a shift and finalizes total work duration in seconds."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        now_str = now.isoformat()

        cursor.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,))
        shift = cursor.fetchone()
        if not shift:
            conn.close()
            return None

        # Close any pending pause record
        cursor.execute("""
            UPDATE shift_pauses SET resume_time = ? 
            WHERE shift_id = ? AND resume_time IS NULL
        """, (now_str, shift_id))

        start_time = datetime.fromisoformat(shift["start_time"])
        total_gross = int((now - start_time).total_seconds())
        net_seconds = max(0, total_gross - shift["paused_seconds"])

        cursor.execute("""
            UPDATE shifts 
            SET status = 'completed', end_time = ?, total_seconds = ? 
            WHERE id = ?
        """, (now_str, net_seconds, shift_id))

        conn.commit()
        cursor.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

# --- Lead Management (CRM) Methods ---

def get_leads(search_query: str = "", status_filter: str = "All") -> List[Dict[str, Any]]:
    """Fetches leads with optional search and status filtering."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "SELECT * FROM leads WHERE 1=1"
        params = []

        if status_filter and status_filter != "All":
            query += " AND status = ?"
            params.append(status_filter)

        if search_query:
            query += " AND (name LIKE ? OR company LIKE ? OR phone LIKE ? OR email LIKE ?)"
            term = f"%{search_query}%"
            params.extend([term, term, term, term])

        query += " ORDER BY id DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

def create_lead(data: Dict[str, Any]) -> Dict[str, Any]:
    """Logs a new lead with shift timestamping."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        now_str = now.isoformat()
        
        # Calculate offset relative to active shift if currently in progress
        cursor.execute("SELECT * FROM shifts WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        active_shift = cursor.fetchone()
        shift_id = active_shift["id"] if active_shift else None
        offset_seconds = None

        if active_shift:
            start_dt = datetime.fromisoformat(active_shift["start_time"])
            offset_seconds = int((now - start_dt).total_seconds()) - active_shift["paused_seconds"]

        cursor.execute("""
            INSERT INTO leads (name, company, phone, email, timezone, status, next_followup, notes, created_at, updated_at, shift_id, shift_contact_offset_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("name", "Unnamed Contact"),
            data.get("company", ""),
            data.get("phone", ""),
            data.get("email", ""),
            data.get("timezone", "US/Eastern (EST/EDT)"),
            data.get("status", "New Lead"),
            data.get("next_followup", ""),
            data.get("notes", ""),
            now_str,
            now_str,
            shift_id,
            offset_seconds
        ))
        new_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM leads WHERE id = ?", (new_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

def update_lead_status(lead_id: int, new_status: str, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Updates lead disposition status and refreshes updated_at timestamp."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.now().isoformat()

        if notes:
            cursor.execute("""
                UPDATE leads 
                SET status = ?, notes = notes || '\n' || ?, updated_at = ? 
                WHERE id = ?
            """, (new_status, notes, now_str, lead_id))
        else:
            cursor.execute("""
                UPDATE leads 
                SET status = ?, updated_at = ? 
                WHERE id = ?
            """, (new_status, now_str, lead_id))

        conn.commit()
        cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

# --- Call Logging & Shift Metrics ---

def log_call(lead_id: Optional[int], disposition: str, is_live_transfer: bool = False, notes: str = "", duration_seconds: int = 0) -> Dict[str, Any]:
    """Records a call disposition event stamped relative to current shift."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        now_str = now.isoformat()

        # Find active shift
        cursor.execute("SELECT * FROM shifts WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        active_shift = cursor.fetchone()
        shift_id = active_shift["id"] if active_shift else None
        offset_seconds = 0

        if active_shift:
            start_dt = datetime.fromisoformat(active_shift["start_time"])
            offset_seconds = max(0, int((now - start_dt).total_seconds()) - active_shift["paused_seconds"])

        cursor.execute("""
            INSERT INTO call_logs (lead_id, shift_id, timestamp, shift_offset_seconds, disposition, is_live_transfer, duration_seconds, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (lead_id, shift_id, now_str, offset_seconds, disposition, 1 if is_live_transfer else 0, duration_seconds, notes))
        log_id = cursor.lastrowid

        # If linked to lead, update lead status accordingly
        if lead_id:
            cursor.execute("UPDATE leads SET updated_at = ?, shift_contact_offset_seconds = ? WHERE id = ?", (now_str, offset_seconds, lead_id))
            if is_live_transfer:
                cursor.execute("UPDATE leads SET status = 'Transferred to AE' WHERE id = ?", (lead_id,))
            elif "Demo" in disposition or "Meeting" in disposition:
                cursor.execute("UPDATE leads SET status = 'Meeting Booked' WHERE id = ?", (lead_id,))

        conn.commit()
        cursor.execute("SELECT * FROM call_logs WHERE id = ?", (log_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

def log_chrome_call(phone_number: str, lead_name: Optional[str] = None, company: Optional[str] = None, event_type: str = "call_started", duration_seconds: int = 0, disposition: Optional[str] = None, notes: str = "") -> Dict[str, Any]:
    """Logs a call event originating from the Chrome Extension web dialer bridge."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        now_str = now.isoformat()

        # Check if lead exists with this phone number or match by last 10 digits
        cleaned_phone = phone_number.strip()
        lead_id = None
        if cleaned_phone:
            digits_only = "".join(ch for ch in cleaned_phone if ch.isdigit())
            match_suffix = digits_only[-10:] if len(digits_only) >= 10 else digits_only
            cursor.execute("SELECT * FROM leads WHERE phone LIKE ? LIMIT 1", (f"%{match_suffix}%",))
            lead_row = cursor.fetchone()
            if lead_row:
                lead_id = lead_row["id"]

        if not lead_id and (lead_name or company):
            # Auto-create lead
            cursor.execute("""
                INSERT INTO leads (name, company, phone, email, timezone, status, next_followup, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (lead_name or f"Web Dial ({cleaned_phone})", company or "Inbound/Web", cleaned_phone, "", "US/Eastern (EST/EDT)", "Contacted", "", notes or "Captured via Chrome Extension dialer hook", now_str, now_str))
            lead_id = cursor.lastrowid

        # Calculate shift offset
        cursor.execute("SELECT * FROM shifts WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        active_shift = cursor.fetchone()
        shift_id = active_shift["id"] if active_shift else None
        offset_seconds = 0

        if active_shift:
            start_dt = datetime.fromisoformat(active_shift["start_time"])
            offset_seconds = max(0, int((now - start_dt).total_seconds()) - active_shift["paused_seconds"])

        disp = disposition or ("Dial Initiated (Chrome Extension)" if event_type == "call_started" else "Completed Call (Web Dialer)")
        is_transfer = "transfer" in disp.lower()

        cursor.execute("""
            INSERT INTO call_logs (lead_id, shift_id, timestamp, shift_offset_seconds, disposition, is_live_transfer, duration_seconds, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (lead_id, shift_id, now_str, offset_seconds, disp, 1 if is_transfer else 0, duration_seconds, f"Chrome Extension Hook: {event_type} | {notes}".strip()))
        log_id = cursor.lastrowid

        if lead_id:
            cursor.execute("UPDATE leads SET updated_at = ?, shift_contact_offset_seconds = ? WHERE id = ?", (now_str, offset_seconds, lead_id))
            if is_transfer:
                cursor.execute("UPDATE leads SET status = 'Transferred to AE' WHERE id = ?", (lead_id,))

        conn.commit()
        cursor.execute("SELECT * FROM call_logs WHERE id = ?", (log_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

def get_dashboard_metrics() -> Dict[str, Any]:
    """Computes daily totals for Dials, Live Transfers, Scheduled Demos, and Conversion Rates."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        today = date.today().isoformat()

        # Get calls logged today
        cursor.execute("""
            SELECT 
                COUNT(*) as total_dials,
                SUM(CASE WHEN is_live_transfer = 1 THEN 1 ELSE 0 END) as live_transfers,
                SUM(CASE WHEN disposition LIKE '%Demo%' OR disposition LIKE '%Meeting%' THEN 1 ELSE 0 END) as scheduled_demos,
                SUM(CASE WHEN disposition LIKE '%Connected%' OR is_live_transfer = 1 OR disposition LIKE '%Demo%' THEN 1 ELSE 0 END) as connects
            FROM call_logs 
            WHERE timestamp LIKE ?
        """, (f"{today}%",))
        stats = cursor.fetchone()

        total_dials = stats["total_dials"] or 0
        live_transfers = stats["live_transfers"] or 0
        scheduled_demos = stats["scheduled_demos"] or 0
        connects = stats["connects"] or 0

        # Calculations
        connect_rate = round((connects / total_dials * 100), 1) if total_dials > 0 else 0.0
        conversion_rate = round(((live_transfers + scheduled_demos) / total_dials * 100), 1) if total_dials > 0 else 0.0

        # Active Shift
        cursor.execute("SELECT * FROM shifts WHERE date = ? ORDER BY id DESC LIMIT 1", (today,))
        shift_row = cursor.fetchone()

        conn.close()

        return {
            "total_dials": total_dials,
            "live_transfers": live_transfers,
            "scheduled_demos": scheduled_demos,
            "connects": connects,
            "connect_rate_pct": connect_rate,
            "conversion_rate_pct": conversion_rate,
            "shift": dict(shift_row) if shift_row else None
        }

def get_peak_interaction_stats() -> List[Dict[str, Any]]:
    """Analyzes call activity by hour of the day to identify peak pickup and connect windows."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Hourly breakdown
        cursor.execute("""
            SELECT 
                strftime('%H', timestamp) as hour_str,
                COUNT(*) as total_calls,
                SUM(CASE WHEN disposition LIKE '%Connected%' OR is_live_transfer = 1 OR disposition LIKE '%Demo%' THEN 1 ELSE 0 END) as connects,
                SUM(CASE WHEN is_live_transfer = 1 THEN 1 ELSE 0 END) as transfers
            FROM call_logs
            GROUP BY hour_str
            ORDER BY hour_str ASC
        """)
        rows = cursor.fetchall()
        conn.close()

        results = []
        for r in rows:
            hour = int(r["hour_str"])
            am_pm = f"{hour if hour <= 12 else hour - 12} {'AM' if hour < 12 else 'PM'}"
            total = r["total_calls"]
            conn_cnt = r["connects"]
            rate = round((conn_cnt / total * 100), 1) if total > 0 else 0.0
            results.append({
                "hour": hour,
                "label": am_pm,
                "total_calls": total,
                "connects": conn_cnt,
                "transfers": r["transfers"],
                "connect_rate_pct": rate
            })
        return results

def get_time_in_status_stats() -> List[Dict[str, Any]]:
    """Computes distribution of leads across pipeline statuses."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM leads 
            GROUP BY status
            ORDER BY count DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

# --- Mobile Bridge API Sync Methods ---

def get_sync_payload() -> Dict[str, Any]:
    """Generates the full JSON payload for Android mobile client synchronization."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        today = date.today().isoformat()

        cursor.execute("SELECT * FROM shifts WHERE date = ? ORDER BY id DESC LIMIT 1", (today,))
        shift_row = cursor.fetchone()

        cursor.execute("SELECT * FROM leads ORDER BY id DESC")
        leads_rows = cursor.fetchall()

        cursor.execute("SELECT * FROM call_logs WHERE timestamp LIKE ? ORDER BY id DESC LIMIT 50", (f"{today}%",))
        logs_rows = cursor.fetchall()

        conn.close()

    metrics = get_dashboard_metrics()

    return {
        "server_time": datetime.now().isoformat(),
        "shift": dict(shift_row) if shift_row else None,
        "metrics": metrics,
        "leads": [dict(r) for r in leads_rows],
        "recent_calls": [dict(r) for r in logs_rows]
    }

def apply_sync_push(new_leads: List[Dict[str, Any]], status_updates: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Applies incoming leads and status updates sent from the Android mobile device."""
    inserted_ids = []
    updated_count = 0

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.now().isoformat()

        # Insert new leads from mobile
        for item in new_leads:
            cursor.execute("""
                INSERT INTO leads (name, company, phone, email, timezone, status, next_followup, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item.get("name", "Mobile Contact"),
                item.get("company", ""),
                item.get("phone", ""),
                item.get("email", ""),
                item.get("timezone", "US/Eastern (EST/EDT)"),
                item.get("status", "New Lead"),
                item.get("next_followup", ""),
                item.get("notes", "Created via Android Client"),
                now_str,
                now_str
            ))
            inserted_ids.append(cursor.lastrowid)

        # Update statuses from mobile
        for update in status_updates:
            lead_id = update.get("lead_id")
            new_status = update.get("status")
            if lead_id and new_status:
                cursor.execute("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?", (new_status, now_str, lead_id))
                updated_count += 1

        conn.commit()
        conn.close()

    return {
        "status": "success",
        "inserted_lead_ids": inserted_ids,
        "updated_leads_count": updated_count,
        "sync_timestamp": datetime.now().isoformat()
    }
