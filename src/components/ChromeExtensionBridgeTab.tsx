import React, { useState, useEffect } from 'react';
import {
  Chrome,
  Phone,
  PhoneCall,
  PhoneOff,
  Zap,
  Download,
  Copy,
  Check,
  Code2,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { Lead, DashboardMetrics, Shift } from '../types';
import { CHROME_EXTENSION_FILES } from '../chromeExtensionFiles';

interface Props {
  leads: Lead[];
  shift: Shift;
  metrics: DashboardMetrics;
  onLogChromeCall: (
    phone: string,
    leadName?: string,
    company?: string,
    eventType?: string,
    disposition?: string,
    durationSeconds?: number
  ) => void;
}

export const ChromeExtensionBridgeTab: React.FC<Props> = ({
  leads,
  shift,
  metrics,
  onLogChromeCall,
}) => {
  // Simulator State
  const [selectedLeadId, setSelectedLeadId] = useState<number>(leads[0]?.id || 1);
  const [customPhone, setCustomPhone] = useState<string>(leads[0]?.phone || '+1 (555) 234-8901');
  const [customLeadName, setCustomLeadName] = useState<string>(leads[0]?.name || 'Sarah Jenkins');
  const [customCompany, setCustomCompany] = useState<string>(leads[0]?.company || 'Apex Logistics');

  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [activeDisposition, setActiveDisposition] = useState<string>('Connected (Pitching)');
  const [simulatedHudToast, setSimulatedHudToast] = useState<{ visible: boolean; title: string; subtitle: string }>({
    visible: false,
    title: '',
    subtitle: '',
  });

  // Network logs inspector
  const [networkLogs, setNetworkLogs] = useState<
    Array<{
      id: string;
      time: string;
      endpoint: string;
      method: string;
      status: number;
      payload: any;
      response: any;
    }>
  >([]);

  // Code viewer tab
  const [activeFileIndex, setActiveFileIndex] = useState<number>(1); // content.js by default
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Sync selected lead changes to simulator inputs
  const handleLeadSelect = (id: number) => {
    setSelectedLeadId(id);
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      setCustomPhone(lead.phone);
      setCustomLeadName(lead.name);
      setCustomCompany(lead.company);
    }
  };

  // Call timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (callState === 'calling' || callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  // Format call duration MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Trigger Dial action (simulates clicking Call on web dialer)
  const handleSimulatedDial = () => {
    setCallState('connected');
    setCallDuration(0);

    const payload = {
      phone_number: customPhone,
      lead_name: customLeadName,
      company: customCompany,
      event_type: 'call_started',
      call_duration_seconds: 0,
      disposition: 'Dial Initiated (Chrome Extension Hook)',
      timestamp: new Date().toISOString(),
    };

    const response = {
      status: 'success',
      message: `Call to ${customPhone} successfully recorded into desktop SQLite database`,
      call_log: {
        id: Date.now(),
        lead_name: customLeadName,
        phone: customPhone,
        shift_offset_seconds: shift.totalSeconds,
        disposition: 'Dial Initiated (Chrome Extension Hook)',
      },
      metrics: {
        total_dials: metrics.totalDials + 1,
        live_transfers: metrics.liveTransfers,
      },
    };

    // Append to live network inspector
    setNetworkLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString(),
        endpoint: '/api/log_call',
        method: 'POST',
        status: 200,
        payload,
        response,
      },
      ...prev.slice(0, 7),
    ]);

    // Update real desktop app state
    onLogChromeCall(
      customPhone,
      customLeadName,
      customCompany,
      'call_started',
      'Dial Initiated (Chrome Extension Hook)',
      0
    );

    // Show floating HUD toast
    triggerHudToast(
      'Dial Logged to Shift Timeline',
      `${customPhone} (${customLeadName}) • Total Dials: ${metrics.totalDials + 1}`
    );
  };

  // Trigger Hang Up action (simulates clicking Hang Up on web dialer)
  const handleSimulatedHangUp = () => {
    const duration = Math.max(1, callDuration);
    const isTransfer = activeDisposition.includes('Transfer');

    if (isTransfer) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }

    const payload = {
      phone_number: customPhone,
      lead_name: customLeadName,
      company: customCompany,
      event_type: 'call_ended',
      call_duration_seconds: duration,
      disposition: activeDisposition,
      timestamp: new Date().toISOString(),
    };

    const response = {
      status: 'success',
      message: `Call ended (${duration}s). Disposition applied to SQLite.`,
      call_log: {
        id: Date.now(),
        lead_name: customLeadName,
        phone: customPhone,
        shift_offset_seconds: shift.totalSeconds,
        disposition: activeDisposition,
        duration_seconds: duration,
        is_live_transfer: isTransfer,
      },
    };

    setNetworkLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString(),
        endpoint: '/api/log_call',
        method: 'POST',
        status: 200,
        payload,
        response,
      },
      ...prev.slice(0, 7),
    ]);

    // Update real app state
    onLogChromeCall(
      customPhone,
      customLeadName,
      customCompany,
      'call_ended',
      activeDisposition,
      duration
    );

    triggerHudToast(
      'Call Finished & Dispositioned',
      `${activeDisposition} (${duration}s) • Stamped relative to shift offset`
    );

    setCallState('idle');
    setCallDuration(0);
  };

  const triggerHudToast = (title: string, subtitle: string) => {
    setSimulatedHudToast({ visible: true, title, subtitle });
    setTimeout(() => {
      setSimulatedHudToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Download Chrome Extension as ZIP
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('sdr_crm_chrome_extension');

      CHROME_EXTENSION_FILES.forEach((f) => {
        folder?.file(f.path, f.content);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sdr_crm_chrome_extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  // Copy active code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(CHROME_EXTENSION_FILES[activeFileIndex].content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Hero Banner */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Chrome className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Chrome Extension Web Dialer Bridge (FastAPI Hook)
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Injects a lightweight content script directly into your web dialer (Outreach, Salesloft, Dialpad, PhoneBurner, RingCentral, HubSpot). Listens for <span className="text-emerald-400 font-semibold">"Call"</span> and <span className="text-rose-400 font-semibold">"Hang Up"</span> button clicks and immediately streams the phone number, duration, and timestamp via JSON POST to <span className="font-mono text-sky-300 bg-[#181825] px-1.5 py-0.5 rounded">http://127.0.0.1:8000/api/log_call</span>.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? 'Packaging ZIP...' : 'Download Extension (.ZIP)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Simulator & Network Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 6 Cols: Interactive Web Dialer Simulator */}
        <div className="lg:col-span-6 bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Simulated Web Dialer (Browser Page Hook)
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-[#181825] border border-[#313244] text-slate-400">
              Hook: content.js active
            </span>
          </div>

          {/* Quick Lead Preset Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Select Contact from Pipeline
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {leads.slice(0, 6).map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => handleLeadSelect(lead.id)}
                  className={`p-2 rounded-lg text-left border text-xs transition-all cursor-pointer ${
                    selectedLeadId === lead.id
                      ? 'bg-indigo-950/80 border-indigo-500/50 text-white shadow-xs'
                      : 'bg-[#181825] border-[#313244] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold truncate">{lead.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{lead.company}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Simulated Web Phone Pad Container */}
          <div className="bg-[#181825] border border-[#313244] rounded-xl p-4 space-y-4">
            {/* Phone Display Screen */}
            <div className="bg-[#11111b] border border-[#313244] rounded-lg p-3.5 text-center relative overflow-hidden">
              <div className="text-[11px] text-slate-400 font-medium">
                {customLeadName} • {customCompany}
              </div>
              <div className="text-xl font-mono font-black text-white tracking-wider mt-1">
                {customPhone}
              </div>

              {callState === 'connected' ? (
                <div className="mt-2 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>CALL ACTIVE: {formatDuration(callDuration)}</span>
                </div>
              ) : (
                <div className="mt-2 text-[10px] text-slate-500">
                  Ready to dial. Extension intercepts the click below.
                </div>
              )}
            </div>

            {/* In-Call Disposition Options (when connected) */}
            {callState === 'connected' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Call Disposition for Hang Up:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: '🔥 Live Transfer Completed', val: 'Live Transfer Completed' },
                    { label: '📅 Scheduled Demo', val: 'Scheduled Demo' },
                    { label: '🗣️ Connected (Pitching)', val: 'Connected (Pitching)' },
                    { label: '📬 Left Voicemail', val: 'Left Voicemail' },
                  ].map((disp) => (
                    <button
                      key={disp.val}
                      type="button"
                      onClick={() => setActiveDisposition(disp.val)}
                      className={`p-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        activeDisposition === disp.val
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-[#24273a] border-[#363a4f] text-slate-300 hover:text-white'
                      }`}
                    >
                      {disp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons (Call / Hang Up) */}
            <div className="flex items-center space-x-3 pt-1">
              {callState === 'idle' ? (
                <button
                  onClick={handleSimulatedDial}
                  className="flex-1 flex items-center justify-center space-x-2.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer group"
                >
                  <PhoneCall className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Click "Call" on Web Dialer</span>
                </button>
              ) : (
                <button
                  onClick={handleSimulatedHangUp}
                  className="flex-1 flex items-center justify-center space-x-2.5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer group"
                >
                  <PhoneOff className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Click "Hang Up" (Submit Call)</span>
                </button>
              )}
            </div>
          </div>

          {/* Floating HUD Toast Preview */}
          {simulatedHudToast.visible && (
            <div className="p-3 bg-[#11111b] border border-sky-500/50 rounded-xl shadow-2xl flex items-center space-x-3 animate-slideUp">
              <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  {simulatedHudToast.title}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5 font-mono">
                  {simulatedHudToast.subtitle}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 6 Cols: Live Network & Desktop Bridge Monitor */}
        <div className="lg:col-span-6 space-y-4">
          {/* Bridge Protocol Inspector Card */}
          <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                  FastAPI Desktop Bridge Telemetry (Port 8000)
                </span>
              </div>
              <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>127.0.0.1:8000 ONLINE</span>
              </span>
            </div>

            {/* Quick KPI Stats from Desktop */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#181825] border border-[#313244] p-2.5 rounded-lg text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Dials</div>
                <div className="text-lg font-mono font-black text-sky-400 mt-0.5">
                  {metrics.totalDials}
                </div>
              </div>
              <div className="bg-[#181825] border border-[#313244] p-2.5 rounded-lg text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Connects</div>
                <div className="text-lg font-mono font-black text-teal-400 mt-0.5">
                  {metrics.connects}
                </div>
              </div>
              <div className="bg-[#181825] border border-[#313244] p-2.5 rounded-lg text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Transfers</div>
                <div className="text-lg font-mono font-black text-emerald-400 mt-0.5">
                  {metrics.liveTransfers}
                </div>
              </div>
            </div>

            {/* Live Packet Log Feed */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Recent Inbound Chrome Hook Packets</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {networkLogs.length} intercepted calls
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {networkLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs bg-[#181825] rounded-lg border border-[#313244]">
                    No dial events intercepted yet. Click "Call" in the simulator to send the first POST packet!
                  </div>
                ) : (
                  networkLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#181825] border border-[#313244] rounded-lg p-2.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-sky-950 text-sky-400 border border-sky-500/40">
                            {log.method} {log.endpoint}
                          </span>
                          <span className="text-slate-300 font-semibold font-mono">
                            {log.payload.phone_number}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-400 font-mono font-bold text-[11px]">
                            HTTP {log.status}
                          </span>
                          <span className="text-slate-500 text-[10px]">{log.time}</span>
                        </div>
                      </div>

                      <div className="bg-[#11111b] p-2 rounded text-[11px] font-mono text-slate-400 overflow-x-auto">
                        <span className="text-amber-400">{log.payload.event_type}</span> •{' '}
                        <span className="text-slate-300">{log.payload.disposition}</span>
                        {log.payload.call_duration_seconds > 0 && (
                          <span className="text-teal-400">
                            {' '}
                            ({log.payload.call_duration_seconds}s duration)
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 3-Step Setup Instructions */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
            30-Second Chrome Extension Installation
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#181825] border border-[#313244] p-3.5 rounded-lg space-y-1">
            <div className="font-bold text-sky-400 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-500/40 flex items-center justify-center text-xs font-mono">
                1
              </span>
              <span>Open Extension Manager</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              In Google Chrome, Brave, or Edge, type <code className="text-sky-300 font-mono">chrome://extensions</code> in the URL bar and press Enter.
            </p>
          </div>

          <div className="bg-[#181825] border border-[#313244] p-3.5 rounded-lg space-y-1">
            <div className="font-bold text-indigo-400 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-xs font-mono">
                2
              </span>
              <span>Enable Developer Mode</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Toggle the <strong>Developer mode</strong> switch in the top-right corner of the extensions page.
            </p>
          </div>

          <div className="bg-[#181825] border border-[#313244] p-3.5 rounded-lg space-y-1">
            <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-xs font-mono">
                3
              </span>
              <span>Click "Load Unpacked"</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Click <strong>Load unpacked</strong> in the top-left toolbar and select the extracted extension folder. You're done!
            </p>
          </div>
        </div>
      </div>

      {/* 4. Extension Code Explorer */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              Extension Source Files ({CHROME_EXTENSION_FILES.length} Files)
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#181825] hover:bg-[#313244] border border-[#313244] text-xs font-bold text-slate-300 transition-colors cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* File Tabs */}
        <div className="flex items-center space-x-1 border-b border-[#363a4f] overflow-x-auto pb-1">
          {CHROME_EXTENSION_FILES.map((file, idx) => (
            <button
              key={file.name}
              onClick={() => setActiveFileIndex(idx)}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-mono transition-colors cursor-pointer ${
                activeFileIndex === idx
                  ? 'bg-[#181825] text-sky-400 border-t-2 border-sky-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {file.name}
            </button>
          ))}
        </div>

        {/* Code Box */}
        <div className="bg-[#11111b] border border-[#313244] rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
          <pre>{CHROME_EXTENSION_FILES[activeFileIndex].content}</pre>
        </div>
      </div>
    </div>
  );
};
