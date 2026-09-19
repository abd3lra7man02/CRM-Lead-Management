import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Smartphone,
  FolderDown,
  Radio,
  Clock,
  Database,
  Terminal,
  Chrome,
  Flame,
  Zap,
  Cpu
} from 'lucide-react';
import { Shift, Lead, CallLog, DashboardMetrics, HourlyStat, ActiveTab, DailyTargets, ShiftHistoryPoint } from './types';
import { INITIAL_LEADS, INITIAL_CALL_LOGS, INITIAL_HOURLY_STATS, DEFAULT_TARGETS, INITIAL_SEVEN_SHIFTS_HISTORY } from './mockData';
import { WindowsTitleBar } from './components/WindowsTitleBar';
import { RetroSynthwaveHud } from './components/RetroSynthwaveHud';
import { RetroPythonCodeTab } from './components/RetroPythonCodeTab';
import { SdrDashboardTab } from './components/SdrDashboardTab';
import { LeadCrmTab } from './components/LeadCrmTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { MobileBridgeTab } from './components/MobileBridgeTab';
import { ChromeExtensionBridgeTab } from './components/ChromeExtensionBridgeTab';
import { CodeExportTab } from './components/CodeExportTab';
import { RETRO_PYTHON_SCRIPT, RETRO_SPEC_FILE, RETRO_BAT_SCRIPT } from './retroPythonFiles';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('hud');

  // --- Daily Quota & Targets State ---
  const [targets, setTargets] = useState<DailyTargets>(DEFAULT_TARGETS);

  // --- Core Application State ---
  const [shift, setShift] = useState<Shift>({
    id: 1,
    date: new Date().toISOString().split('T')[0],
    startTime: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    endTime: null,
    totalSeconds: 5400, // 1h 30m elapsed
    pausedSeconds: 0,
    status: 'active'
  });

  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>(INITIAL_CALL_LOGS);
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>(INITIAL_HOURLY_STATS);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDials: 38,
    liveTransfers: 2,
    scheduledDemos: 3,
    connects: 14,
    connectRatePct: 36.8,
    conversionRatePct: 13.2
  });

  // Ticking Shift Clock Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (shift.status === 'active') {
      interval = setInterval(() => {
        setShift((prev) => ({
          ...prev,
          totalSeconds: prev.totalSeconds + 1
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [shift.status]);

  // Format Elapsed Seconds to HH:MM:SS
  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // --- Shift Lifecycle Handlers ---
  const handleStartShift = () => {
    setShift({
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      endTime: null,
      totalSeconds: 0,
      pausedSeconds: 0,
      status: 'active'
    });
  };

  const handlePauseShift = () => {
    setShift((prev) => ({ ...prev, status: 'paused' }));
  };

  const handleResumeShift = () => {
    setShift((prev) => ({ ...prev, status: 'active' }));
  };

  const handleEndShift = () => {
    setShift((prev) => ({
      ...prev,
      status: 'completed',
      endTime: new Date().toISOString()
    }));
  };

  // --- Call Logging Handlers ---
  const handleLogRapidCall = (disposition: string, isTransfer: boolean) => {
    const isDemo = disposition.includes('Demo') || disposition.includes('Meeting');
    const isConnect = isTransfer || isDemo || disposition.includes('Connected');

    // 1. Update Metrics
    setMetrics((prev) => {
      const newDials = prev.totalDials + 1;
      const newTransfers = isTransfer ? prev.liveTransfers + 1 : prev.liveTransfers;
      const newDemos = isDemo ? prev.scheduledDemos + 1 : prev.scheduledDemos;
      const newConnects = isConnect ? prev.connects + 1 : prev.connects;

      return {
        totalDials: newDials,
        liveTransfers: newTransfers,
        scheduledDemos: newDemos,
        connects: newConnects,
        connectRatePct: (newConnects / newDials) * 100,
        conversionRatePct: ((newTransfers + newDemos) / newDials) * 100
      };
    });

    // 2. Add Call Record with active shift offset
    const newLog: CallLog = {
      id: Date.now(),
      leadId: null,
      timestamp: new Date().toISOString(),
      shiftOffsetSeconds: shift.status === 'active' ? shift.totalSeconds : 0,
      disposition,
      isLiveTransfer: isTransfer,
      notes: 'Logged via 1-Click Rapid Disposition Bar'
    };

    setRecentCalls((prev) => [newLog, ...prev]);

    // 3. Update current hour in hourly stats
    const currentHour = new Date().getHours();
    setHourlyStats((prev) =>
      prev.map((stat) => {
        if (stat.hour === currentHour) {
          const newTot = stat.totalCalls + 1;
          const newConn = isConnect ? stat.connects + 1 : stat.connects;
          const newTr = isTransfer ? stat.transfers + 1 : stat.transfers;
          return {
            ...stat,
            totalCalls: newTot,
            connects: newConn,
            transfers: newTr,
            connectRatePct: Math.round((newConn / newTot) * 1000) / 10
          };
        }
        return stat;
      })
    );
  };

  const handleAddLead = (
    leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'shiftContactOffsetSeconds'>
  ) => {
    const newLead: Lead = {
      ...leadData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shiftContactOffsetSeconds: shift.status === 'active' ? shift.totalSeconds : null
    };
    setLeads((prev) => [newLead, ...prev]);
  };

  const handleLogLeadCall = (leadId: number, disposition: string, isTransfer: boolean) => {
    const isDemo = disposition.includes('Demo') || disposition.includes('Meeting');
    const isConnect = isTransfer || isDemo || disposition.includes('Connected');

    // Update Lead Status
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === leadId) {
          let updatedStatus = l.status;
          if (isTransfer) updatedStatus = 'Transferred to AE';
          else if (isDemo) updatedStatus = 'Meeting Booked';
          else if (disposition.includes('Connected')) updatedStatus = 'Contacted';
          else if (disposition.includes('Follow')) updatedStatus = 'Follow-Up Required';

          return {
            ...l,
            status: updatedStatus,
            updatedAt: new Date().toISOString(),
            shiftContactOffsetSeconds: shift.status === 'active' ? shift.totalSeconds : l.shiftContactOffsetSeconds
          };
        }
        return l;
      })
    );

    // Update Metrics
    setMetrics((prev) => {
      const newDials = prev.totalDials + 1;
      const newTransfers = isTransfer ? prev.liveTransfers + 1 : prev.liveTransfers;
      const newDemos = isDemo ? prev.scheduledDemos + 1 : prev.scheduledDemos;
      const newConnects = isConnect ? prev.connects + 1 : prev.connects;

      return {
        totalDials: newDials,
        liveTransfers: newTransfers,
        scheduledDemos: newDemos,
        connects: newConnects,
        connectRatePct: (newConnects / newDials) * 100,
        conversionRatePct: ((newTransfers + newDemos) / newDials) * 100
      };
    });

    // Add Call Log
    const targetLead = leads.find((l) => l.id === leadId);
    const newLog: CallLog = {
      id: Date.now(),
      leadId,
      leadName: targetLead?.name,
      timestamp: new Date().toISOString(),
      shiftOffsetSeconds: shift.status === 'active' ? shift.totalSeconds : 0,
      disposition,
      isLiveTransfer: isTransfer,
      notes: `Outreach to ${targetLead?.company || 'Prospect'}`
    };
    setRecentCalls((prev) => [newLog, ...prev]);
  };

  const handleSyncPushLead = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
  };

  const handleLogChromeCall = (
    phone: string,
    leadName?: string,
    company?: string,
    eventType: string = 'call_started',
    disposition?: string,
    durationSeconds: number = 0
  ) => {
    const isTransfer = (disposition || '').toLowerCase().includes('transfer');
    const isDemo =
      (disposition || '').toLowerCase().includes('demo') ||
      (disposition || '').toLowerCase().includes('meeting');
    const isConnect =
      isTransfer || isDemo || (disposition || '').toLowerCase().includes('connected');

    if (eventType === 'call_started') {
      setMetrics((prev) => {
        const newDials = prev.totalDials + 1;
        return {
          ...prev,
          totalDials: newDials,
          connectRatePct: (prev.connects / newDials) * 100,
          conversionRatePct: ((prev.liveTransfers + prev.scheduledDemos) / newDials) * 100
        };
      });

      const newLog: CallLog = {
        id: Date.now(),
        leadId: null,
        leadName: leadName ? `${leadName} (${phone})` : phone,
        timestamp: new Date().toISOString(),
        shiftOffsetSeconds: shift.status === 'active' ? shift.totalSeconds : 0,
        disposition: disposition || 'Dial Initiated (Chrome Extension Hook)',
        isLiveTransfer: false,
        notes: `Web Dialer Hook: ${company || 'Direct Dial'}`
      };
      setRecentCalls((prev) => [newLog, ...prev]);
    } else if (eventType === 'call_ended') {
      setMetrics((prev) => {
        const newTransfers = isTransfer ? prev.liveTransfers + 1 : prev.liveTransfers;
        const newDemos = isDemo ? prev.scheduledDemos + 1 : prev.scheduledDemos;
        const newConnects = isConnect ? prev.connects + 1 : prev.connects;
        return {
          ...prev,
          liveTransfers: newTransfers,
          scheduledDemos: newDemos,
          connects: newConnects,
          connectRatePct: (newConnects / prev.totalDials) * 100,
          conversionRatePct: ((newTransfers + newDemos) / prev.totalDials) * 100
        };
      });

      // Match lead by phone or name and update status if exists
      setLeads((prev) =>
        prev.map((l) => {
          if (
            l.phone === phone ||
            (leadName && l.name.toLowerCase().includes(leadName.toLowerCase()))
          ) {
            let updatedStatus = l.status;
            if (isTransfer) updatedStatus = 'Transferred to AE';
            else if (isDemo) updatedStatus = 'Meeting Booked';
            else if (isConnect) updatedStatus = 'Contacted';
            return {
              ...l,
              status: updatedStatus,
              updatedAt: new Date().toISOString(),
              shiftContactOffsetSeconds:
                shift.status === 'active' ? shift.totalSeconds : l.shiftContactOffsetSeconds
            };
          }
          return l;
        })
      );

      const newLog: CallLog = {
        id: Date.now(),
        leadId: null,
        leadName: leadName ? `${leadName} (${phone})` : phone,
        timestamp: new Date().toISOString(),
        shiftOffsetSeconds: shift.status === 'active' ? shift.totalSeconds : 0,
        disposition: disposition || 'Call Completed (Web Dialer)',
        isLiveTransfer: isTransfer,
        notes: `Duration: ${durationSeconds}s | ${company || 'Chrome Extension'}`
      };
      setRecentCalls((prev) => [newLog, ...prev]);
    }
  };

  // Quick tally handler for the Retro-Tech Single-Screen HUD
  const handleQuickDial = (
    phone: string = '+1 (555) 000-0000',
    disposition: string = 'Dial Initiated',
    isTransfer: boolean = false,
    notes: string = ''
  ) => {
    const isDemo =
      disposition.toLowerCase().includes('demo') ||
      disposition.toLowerCase().includes('meeting');
    const isConnect =
      isTransfer ||
      isDemo ||
      disposition.toLowerCase().includes('connect') ||
      disposition.toLowerCase().includes('pitch');

    setMetrics((prev) => {
      const newDials = prev.totalDials + 1;
      const newTransfers = isTransfer ? prev.liveTransfers + 1 : prev.liveTransfers;
      const newDemos = isDemo ? prev.scheduledDemos + 1 : prev.scheduledDemos;
      const newConnects = isConnect ? prev.connects + 1 : prev.connects;

      return {
        totalDials: newDials,
        liveTransfers: newTransfers,
        scheduledDemos: newDemos,
        connects: newConnects,
        connectRatePct: (newConnects / newDials) * 100,
        conversionRatePct: ((newTransfers + newDemos) / newDials) * 100,
      };
    });

    const newLog: CallLog = {
      id: Date.now(),
      leadId: null,
      leadName: phone,
      timestamp: new Date().toISOString(),
      shiftOffsetSeconds: shift.status === 'active' ? shift.totalSeconds : 0,
      disposition: disposition,
      isLiveTransfer: isTransfer,
      notes: notes,
    };

    setRecentCalls((prev) => [newLog, ...prev]);
  };

  // Live updated 7-shift performance history reflecting current metrics and targets
  const targetRateBenchmark = Math.round((targets.connectTarget / targets.dialTarget) * 100);
  const sevenShiftsHistory: ShiftHistoryPoint[] = INITIAL_SEVEN_SHIFTS_HISTORY.map((item, idx) => {
    if (idx === INITIAL_SEVEN_SHIFTS_HISTORY.length - 1) {
      return {
        ...item,
        dials: metrics.totalDials,
        connects: metrics.connects,
        transfers: metrics.liveTransfers,
        connectRatePct: Math.round(metrics.connectRatePct * 10) / 10,
        targetRatePct: targetRateBenchmark
      };
    }
    return {
      ...item,
      targetRatePct: targetRateBenchmark
    };
  });

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-2 sm:p-4 md:p-6 flex flex-col justify-center font-mono text-slate-100 selection:bg-[#FF007F] selection:text-white">
      {/* Windows Desktop Application Outer Window Frame */}
      <div className="w-full max-w-7xl mx-auto bg-[#12111a] border border-[#2d2a45] rounded-xl shadow-2xl overflow-hidden flex flex-col min-h-[760px]">
        {/* Windows Title Bar */}
        <WindowsTitleBar apiPort={8000} apiOnline={true} />

        {/* App Interior: Sidebar + Main Stage */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar (Cyberpunk Dark Void #100f17) */}
          <aside className="w-full md:w-64 bg-[#100f17] border-r border-[#2d2a45] p-3 flex flex-col justify-between shrink-0">
            {/* Nav Menu */}
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-[#7d789e] uppercase tracking-wider">
                &gt; RETRO TERMINAL NAVIGATION
              </div>

              {/* RETRO HUD (PRIMARY SINGLE SCREEN VIEW) */}
              <button
                onClick={() => setActiveTab('hud')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'hud'
                    ? 'bg-[#002b36] text-[#00F0FF] border-l-4 border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                    : 'text-slate-400 hover:text-white hover:bg-[#181726]'
                }`}
              >
                <Zap className="w-4 h-4 text-[#00F0FF]" />
                <div className="flex items-center justify-between w-full">
                  <span>Retro Shift HUD</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                    PRIMARY
                  </span>
                </div>
              </button>

              {/* PYTHON CODE & PYINSTALLER SPEC */}
              <button
                onClick={() => setActiveTab('python')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'python'
                    ? 'bg-[#38001d] text-[#FF007F] border-l-4 border-[#FF007F] shadow-[0_0_12px_rgba(255,0,127,0.25)]'
                    : 'text-slate-400 hover:text-white hover:bg-[#181726]'
                }`}
              >
                <Cpu className="w-4 h-4 text-[#FF007F]" />
                <div className="flex items-center justify-between w-full">
                  <span>Python & .EXE Spec</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FF007F]/20 text-[#FF007F] border border-[#FF007F]/40 font-bold">
                    WIN .EXE
                  </span>
                </div>
              </button>

              {/* CHROME DIALER HOOK */}
              <button
                onClick={() => setActiveTab('chrome')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'chrome'
                    ? 'bg-[#181726] text-[#00FF41] border-l-4 border-[#00FF41] shadow-[0_0_12px_rgba(0,255,65,0.25)]'
                    : 'text-slate-400 hover:text-white hover:bg-[#181726]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Chrome className="w-4 h-4 text-[#00FF41]" />
                  <span>Chrome Extension Hook</span>
                </div>
                <span className="text-[9px] bg-[#003816] text-[#00FF41] border border-[#00FF41]/40 px-1.5 py-0.5 rounded font-mono font-bold">
                  :8000
                </span>
              </button>

              {/* MOBILE API BRIDGE */}
              <button
                onClick={() => setActiveTab('bridge')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'bridge'
                    ? 'bg-[#181726] text-teal-300 border-l-4 border-teal-400'
                    : 'text-slate-400 hover:text-white hover:bg-[#181726]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-4 h-4 text-teal-400" />
                  <span>FastAPI /api/sync</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
              </button>

              <div className="pt-3 px-3 text-[10px] font-bold text-[#7d789e] uppercase tracking-wider">
                &gt; EXTENDED SDR VIEWS
              </div>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#181726] text-white border-l-3 border-indigo-400'
                    : 'text-slate-400 hover:text-white hover:bg-[#181726]/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>Classic Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('leads')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'leads'
                    ? 'bg-[#181726] text-white border-l-3 border-indigo-400'
                    : 'text-slate-400 hover:text-white hover:bg-[#181726]/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Lead Database</span>
                </div>
                <span className="text-[10px] bg-[#0a0a0c] px-2 py-0.5 rounded text-slate-400 font-mono">
                  {leads.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[#181726] text-white border-l-3 border-indigo-400'
                    : 'text-slate-400 hover:text-white hover:bg-[#181726]/50'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <span>Shift History Charts</span>
              </button>
            </div>

            {/* Bottom Status Box */}
            <div className="p-3 bg-[#0a0a0c] border border-[#2d2a45] rounded-xl space-y-2 mt-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#7d789e] font-bold">FastAPI Hook</span>
                <span className="text-[#00FF41] font-bold flex items-center space-x-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-ping" />
                  <span>127.0.0.1:8000</span>
                </span>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                Listening for Chrome Web Dialer hooks and Android mobile requests.
              </div>
            </div>
          </aside>

          {/* Main Stage Content */}
          <main className="flex-1 bg-[#0a0a0c] p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-100px)]">
            {activeTab === 'hud' && (
              <RetroSynthwaveHud
                shift={shift}
                metrics={metrics}
                recentCalls={recentCalls}
                elapsedFormatted={formatTimer(shift.totalSeconds)}
                targets={targets}
                onStartShift={handleStartShift}
                onPauseShift={handlePauseShift}
                onResumeShift={handleResumeShift}
                onEndShift={handleEndShift}
                onQuickDial={handleQuickDial}
              />
            )}

            {activeTab === 'python' && (
              <RetroPythonCodeTab
                pythonCode={RETRO_PYTHON_SCRIPT}
                specCode={RETRO_SPEC_FILE}
                batCode={RETRO_BAT_SCRIPT}
              />
            )}

            {activeTab === 'chrome' && (
              <ChromeExtensionBridgeTab
                leads={leads}
                shift={shift}
                metrics={metrics}
                onLogChromeCall={handleLogChromeCall}
              />
            )}

            {activeTab === 'bridge' && (
              <MobileBridgeTab
                shift={shift}
                metrics={metrics}
                leads={leads}
                onSyncPushLead={handleSyncPushLead}
              />
            )}

            {activeTab === 'dashboard' && (
              <SdrDashboardTab
                shift={shift}
                metrics={metrics}
                recentCalls={recentCalls}
                elapsedFormatted={formatTimer(shift.totalSeconds)}
                targets={targets}
                onUpdateTargets={setTargets}
                onStartShift={handleStartShift}
                onPauseShift={handlePauseShift}
                onResumeShift={handleResumeShift}
                onEndShift={handleEndShift}
                onLogRapidCall={handleLogRapidCall}
              />
            )}

            {activeTab === 'leads' && (
              <LeadCrmTab
                leads={leads}
                onAddLead={handleAddLead}
                onLogLeadCall={handleLogLeadCall}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsTab
                hourlyStats={hourlyStats}
                leads={leads}
                shiftHistory={sevenShiftsHistory}
                targets={targets}
              />
            )}

            {activeTab === 'code' && (
              <CodeExportTab />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

