import React, { useState } from 'react';
import { Smartphone, RefreshCw, Send, CheckCircle, Copy, Check, Terminal, Wifi, ShieldCheck, ArrowDownUp } from 'lucide-react';
import { Shift, Lead, DashboardMetrics } from '../types';

interface Props {
  shift: Shift;
  metrics: DashboardMetrics;
  leads: Lead[];
  onSyncPushLead: (newLead: Lead) => void;
}

export const MobileBridgeTab: React.FC<Props> = ({ shift, metrics, leads, onSyncPushLead }) => {
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'android-code' | 'schema'>('console');
  const [jsonResponse, setJsonResponse] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. Simulate GET /api/sync
  const handleTestPull = () => {
    const payload = {
      sync_version: '1.0',
      sync_type: 'pull_full',
      payload: {
        server_time: new Date().toISOString(),
        shift: {
          id: shift.id,
          date: shift.date,
          start_time: shift.startTime,
          status: shift.status,
          total_seconds: shift.totalSeconds,
          paused_seconds: shift.pausedSeconds
        },
        metrics: {
          total_dials: metrics.totalDials,
          live_transfers: metrics.liveTransfers,
          scheduled_demos: metrics.scheduledDemos,
          connect_rate_pct: metrics.connectRatePct,
          conversion_rate_pct: metrics.conversionRatePct
        },
        leads_count: leads.length,
        leads: leads.slice(0, 4).map((l) => ({
          id: l.id,
          name: l.name,
          company: l.company,
          phone: l.phone,
          timezone: l.timezone,
          status: l.status,
          shift_contact_offset_seconds: l.shiftContactOffsetSeconds
        }))
      }
    };

    setLastAction('GET /api/sync (HTTP 200 OK)');
    setJsonResponse(JSON.stringify(payload, null, 2));
  };

  // 2. Simulate Android POST /api/sync
  const handleTestPush = () => {
    const mobileLeadName = `Mobile Lead ${Math.floor(100 + Math.random() * 900)}`;
    const newLead: Lead = {
      id: Date.now(),
      name: mobileLeadName,
      company: 'Horizon Enterprises',
      phone: '+1 (555) 832-1920',
      email: 'contact@horizon-ent.com',
      timezone: 'US/Central (CST)',
      status: 'New Lead',
      nextFollowup: 'Tomorrow at 11:00 AM',
      notes: 'Captured via Android Mobile App while off-desk.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shiftContactOffsetSeconds: shift.status === 'active' ? 1800 : null
    };

    onSyncPushLead(newLead);

    const ackResponse = {
      sync_version: '1.0',
      sync_type: 'push_ack',
      result: {
        status: 'success',
        inserted_lead_ids: [newLead.id],
        inserted_lead_name: newLead.name,
        updated_leads_count: 0,
        sync_timestamp: new Date().toISOString()
      }
    };

    setLastAction(`POST /api/sync (Pushed "${newLead.name}" into Windows SQLite)`);
    setJsonResponse(JSON.stringify(ackResponse, null, 2));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleKotlinCode = `// SDR Mobile Bridge Retrofit Client (Kotlin + Jetpack Compose)
package com.sdr.mobilecrm.network

import com.google.gson.annotations.SerializedName
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Body

// 1. Data Models
data class SyncResponse(
    @SerializedName("sync_version") val version: String,
    @SerializedName("payload") val payload: SyncPayload
)

data class SyncPayload(
    @SerializedName("server_time") val serverTime: String,
    @SerializedName("shift") val shift: MobileShift?,
    @SerializedName("metrics") val metrics: MobileMetrics,
    @SerializedName("leads") val leads: List<MobileLead>
)

data class MobileMetrics(
    @SerializedName("total_dials") val totalDials: Int,
    @SerializedName("live_transfers") val liveTransfers: Int,
    @SerializedName("conversion_rate_pct") val conversionRate: Double
)

data class SyncPushRequest(
    @SerializedName("new_leads") val newLeads: List<MobileLeadCreate>,
    @SerializedName("status_updates") val statusUpdates: List<StatusUpdateItem> = emptyList()
)

// 2. Retrofit API Hook
interface SdrDesktopBridgeService {
    @GET("/api/sync")
    suspend fun fetchShiftAndLeads(): SyncResponse

    @POST("/api/sync")
    suspend fun pushCapturedLeads(@Body request: SyncPushRequest): SyncAckResponse
}

// 3. Android Client Factory (Points to Windows Desktop IP on local Wi-Fi)
object SdrBridgeClient {
    // Replace with the IP shown on your Windows SDR App titlebar:
    private const val DESKTOP_IP = "192.168.1.142"
    private const val BASE_URL = "http://$DESKTOP_IP:8000"

    val api: SdrDesktopBridgeService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SdrDesktopBridgeService::class.java)
    }
}`;

  return (
    <div className="space-y-4">
      {/* 1. Header & Server Connection Overview */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                FastAPI Mobile Bridge Daemon • Local REST API
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Background Python server running on a daemon thread. Binds to <code className="bg-[#181825] px-1.5 py-0.5 rounded text-teal-300 font-mono">0.0.0.0:8000</code> so your future Android Jetpack Compose app can sync over local Wi-Fi without cloud dependencies.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-[#181825] border border-[#313244] p-3 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Wifi className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Desktop LAN Endpoint</div>
              <div className="font-mono text-xs font-bold text-slate-100">http://192.168.1.142:8000</div>
              <div className="text-[10px] text-emerald-400 font-medium">● Daemon Thread Online (WAL Mode)</div>
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-[#363a4f]">
          <button
            onClick={() => setActiveSubTab('console')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === 'console'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#181825]'
            }`}
          >
            ⚡ Live REST API Tester
          </button>
          <button
            onClick={() => setActiveSubTab('android-code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === 'android-code'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#181825]'
            }`}
          >
            📱 Kotlin / Jetpack Compose Client Code
          </button>
          <button
            onClick={() => setActiveSubTab('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === 'schema'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#181825]'
            }`}
          >
            📋 /api/sync JSON Contract
          </button>
        </div>
      </div>

      {/* 2. SubTab Content */}
      {activeSubTab === 'console' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Controls Column */}
          <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Simulate Mobile Android Requests
            </div>

            {/* Test GET */}
            <div className="p-3 bg-[#181825] border border-[#313244] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400">GET /api/sync</span>
                <span className="text-[10px] text-slate-400">Pull Action</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Simulates phone fetching today's shift status, dials counter, and lead table.
              </p>
              <button
                onClick={handleTestPull}
                className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Fetch Desktop Sync Payload</span>
              </button>
            </div>

            {/* Test POST */}
            <div className="p-3 bg-[#181825] border border-[#313244] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-sky-400">POST /api/sync</span>
                <span className="text-[10px] text-slate-400">Push Action</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Simulates SDR capturing a new lead on mobile and saving directly into the Windows SQLite database.
              </p>
              <button
                onClick={handleTestPush}
                className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Push Mobile Lead to SQLite</span>
              </button>
            </div>

            {/* Security & LAN Advice */}
            <div className="p-3 bg-[#181825] border border-[#313244] rounded-lg space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Windows Firewall Note</span>
              </div>
              <p className="text-[11px]">
                Ensure Windows Defender Firewall allows Python through private networks when running for the first time.
              </p>
            </div>
          </div>

          {/* Response Inspector Column */}
          <div className="lg:col-span-2 bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm flex flex-col h-full min-h-[380px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Live JSON Payload Response Inspector
                </span>
              </div>

              {lastAction && (
                <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  {lastAction}
                </span>
              )}
            </div>

            <div className="flex-1 bg-[#181825] border border-[#313244] rounded-lg p-3 overflow-auto font-mono text-xs text-slate-200">
              {jsonResponse ? (
                <pre>{jsonResponse}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 space-y-2">
                  <ArrowDownUp className="w-8 h-8 text-slate-600" />
                  <p className="text-xs">Click either "Fetch Desktop Sync Payload" or "Push Mobile Lead" above to inspect live JSON.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'android-code' && (
        <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Kotlin & Retrofit Integration for Jetpack Compose</h3>
              <p className="text-xs text-slate-400">
                Copy and drop this network service into your Android project to hook into this Windows desktop app.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(sampleKotlinCode)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Kotlin Code'}</span>
            </button>
          </div>

          <div className="bg-[#181825] border border-[#313244] rounded-lg p-4 font-mono text-xs text-sky-300 overflow-x-auto max-h-[460px]">
            <pre>{sampleKotlinCode}</pre>
          </div>
        </div>
      )}

      {activeSubTab === 'schema' && (
        <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white">Endpoint Route Specifications</h3>

          <div className="space-y-3">
            <div className="p-3 bg-[#181825] border border-[#313244] rounded-lg">
              <div className="font-mono text-xs font-bold text-emerald-400 mb-1">GET /api/sync</div>
              <p className="text-xs text-slate-300">
                Returns the full JSON synchronisation document: active shift object, daily dial stats, conversion rates, and current lead list.
              </p>
            </div>

            <div className="p-3 bg-[#181825] border border-[#313244] rounded-lg">
              <div className="font-mono text-xs font-bold text-sky-400 mb-1">POST /api/sync</div>
              <p className="text-xs text-slate-300">
                Accepts a batch object containing <code className="text-sky-300">new_leads</code> captured while away from desk and <code className="text-sky-300">status_updates</code> for existing leads.
              </p>
            </div>

            <div className="p-3 bg-[#181825] border border-[#313244] rounded-lg">
              <div className="font-mono text-xs font-bold text-purple-400 mb-1">POST /api/shift/action</div>
              <p className="text-xs text-slate-300">
                Remote trigger to control shift status: <code className="text-purple-300">{"{\"action\": \"start\" | \"pause\" | \"resume\" | \"end\"}"}</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
