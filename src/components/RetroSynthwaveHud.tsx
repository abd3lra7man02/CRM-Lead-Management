import React, { useState } from 'react';
import {
  Phone,
  PhoneCall,
  Zap,
  Play,
  Pause,
  Square,
  Flame,
  Terminal,
  Activity,
  Check,
  Send,
  Sparkles,
  Radio,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Shift, DashboardMetrics, CallLog, DailyTargets } from '../types';

interface Props {
  shift: Shift;
  metrics: DashboardMetrics;
  recentCalls: CallLog[];
  elapsedFormatted: string;
  targets: DailyTargets;
  onStartShift: () => void;
  onPauseShift: () => void;
  onResumeShift: () => void;
  onEndShift: () => void;
  onQuickDial: (phone?: string, disposition?: string, isTransfer?: boolean, notes?: string) => void;
}

export const RetroSynthwaveHud: React.FC<Props> = ({
  shift,
  metrics,
  recentCalls,
  elapsedFormatted,
  targets,
  onStartShift,
  onPauseShift,
  onResumeShift,
  onEndShift,
  onQuickDial,
}) => {
  // Input fields for Minimal Lead Log row
  const [inputPhone, setInputPhone] = useState<string>('');
  const [inputDisp, setInputDisp] = useState<string>('Connected - Pitching');
  const [inputNotes, setInputNotes] = useState<string>('');

  // Handle manual "+1 Dial"
  const handleDialClick = () => {
    onQuickDial(
      inputPhone || '+1 (555) 000-0000',
      inputDisp || 'Dial Initiated',
      false,
      inputNotes || 'Manual Quick Tally'
    );
  };

  // Handle manual "+1 Live Transfer"
  const handleTransferClick = () => {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF007F', '#00F0FF', '#00FF41', '#FFE600'],
    });

    onQuickDial(
      inputPhone || '+1 (555) 000-0000',
      'Live Transfer Completed',
      true,
      inputNotes || 'Hot Hand-off to Account Executive'
    );
  };

  // Handle Form Submission of Minimal Lead Log
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isTrans = inputDisp.includes('Transfer');

    if (isTrans) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FF007F', '#00F0FF', '#00FF41'],
      });
    }

    onQuickDial(
      inputPhone || '+1 (555) 000-0000',
      inputDisp,
      isTrans,
      inputNotes
    );

    // Reset input row
    setInputPhone('');
    setInputNotes('');
  };

  const dialProgressPct = Math.min(100, Math.round((metrics.totalDials / targets.dialTarget) * 100));
  const transferProgressPct = Math.min(100, Math.round((metrics.liveTransfers / targets.transferTarget) * 100));

  return (
    <div className="space-y-4 font-mono text-slate-200 select-none">
      {/* ================================================================== */}
      {/* 1. THE HUD (CHRONO DIGITAL TIMER & SHIFT ENGINE CONTROLS) */}
      {/* ================================================================== */}
      <div className="bg-[#12111a] border border-[#2d2a45] rounded-xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        {/* Retro scanline overlay accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none opacity-40" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          {/* Left: Huge Digital Shift Chrono */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[11px] font-bold text-[#7d789e] uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>SHIFT CHRONO // ELAPSED TIMER</span>
              <span className="text-[#00FF41]">•</span>
              <span className="text-slate-400">OFFSET LOGGING READY</span>
            </div>

            <div className="text-4xl sm:text-5xl font-black tracking-widest text-[#00F0FF] drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              {elapsedFormatted}
            </div>

            <div className="flex items-center space-x-3 text-xs pt-1">
              <span className="text-[11px] font-bold text-slate-400">STATUS:</span>
              {shift.status === 'active' ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#00FF41]/10 border border-[#00FF41]/40 text-[#00FF41] text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-ping" />
                  <span>[ACTIVE] RECORDING RELATIVE OFFSETS</span>
                </span>
              ) : shift.status === 'paused' ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#FFE600]/10 border border-[#FFE600]/40 text-[#FFE600] text-[11px] font-bold">
                  <span>[PAUSED] CHRONO HALTED</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#FF007F]/10 border border-[#FF007F]/40 text-[#FF007F] text-[11px] font-bold">
                  <span>[STANDBY] CLICK START TO BEGIN SHIFT</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Retro Cyber Shift Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {shift.status !== 'active' ? (
              <button
                onClick={shift.status === 'paused' ? onResumeShift : onStartShift}
                className="flex items-center space-x-2 px-5 py-3 rounded-lg bg-[#003816] hover:bg-[#005522] border border-[#00FF41] text-[#00FF41] font-bold text-xs tracking-wider shadow-[0_0_12px_rgba(0,255,65,0.25)] transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{shift.status === 'paused' ? '[ RESUME SHIFT ]' : '[ START SHIFT ]'}</span>
              </button>
            ) : (
              <button
                onClick={onPauseShift}
                className="flex items-center space-x-2 px-4 py-3 rounded-lg bg-[#332800] hover:bg-[#4d3c00] border border-[#FFE600] text-[#FFE600] font-bold text-xs tracking-wider shadow-[0_0_12px_rgba(255,230,0,0.25)] transition-all active:scale-95 cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>[ PAUSE ]</span>
              </button>
            )}

            <button
              onClick={onEndShift}
              disabled={shift.status === 'inactive' || shift.status === 'completed'}
              className="flex items-center space-x-2 px-4 py-3 rounded-lg bg-[#330018] hover:bg-[#4d0024] border border-[#FF007F] text-[#FF007F] font-bold text-xs tracking-wider shadow-[0_0_12px_rgba(255,0,127,0.25)] transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <Square className="w-4 h-4" />
              <span>[ END SHIFT ]</span>
            </button>
          </div>
        </div>

        {/* Mini Target Progress Bar */}
        <div className="mt-4 pt-3 border-t border-[#2d2a45]/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-[#7d789e] uppercase">Dials Goal</div>
            <div className="text-sm font-bold text-[#00F0FF] mt-0.5">
              {metrics.totalDials} / {targets.dialTarget}{' '}
              <span className="text-[10px] text-slate-400">({dialProgressPct}%)</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#7d789e] uppercase">Transfers Goal</div>
            <div className="text-sm font-bold text-[#FF007F] mt-0.5">
              {metrics.liveTransfers} / {targets.transferTarget}{' '}
              <span className="text-[10px] text-slate-400">({transferProgressPct}%)</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#7d789e] uppercase">Connect Rate</div>
            <div className="text-sm font-bold text-[#00FF41] mt-0.5">
              {metrics.connectRatePct.toFixed(1)}%
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#7d789e] uppercase">FastAPI Hook</div>
            <div className="text-sm font-bold text-teal-400 mt-0.5 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
              <span>:8000 ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. MASSIVE QUICK TALLY BUTTONS (+1 DIAL & +1 LIVE TRANSFER) */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Massive Button 1: +1 DIAL (Cyberpunk Neon Cyan) */}
        <button
          onClick={handleDialClick}
          className="relative group p-6 rounded-xl bg-gradient-to-br from-[#002b36] to-[#00171f] border-2 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all duration-200 active:scale-[0.98] cursor-pointer text-left overflow-hidden"
        >
          <div className="absolute top-2 right-3 text-[10px] font-bold text-[#00F0FF]/60 uppercase tracking-widest">
            HOTKEY: [D] / CLICK
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#00F0FF] tracking-wider uppercase">
                <PhoneCall className="w-4 h-4" />
                <span>INCREMENT COUNTER</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-wider group-hover:text-[#00F0FF] transition-colors">
                +1 DIAL
              </div>
              <div className="text-[11px] text-slate-300">
                Stamps dial into SQLite & updates shift quota
              </div>
            </div>

            <div className="text-right">
              <div className="text-4xl sm:text-5xl font-black font-mono text-[#00F0FF] drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
                {metrics.totalDials}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                TODAY'S DIALS
              </div>
            </div>
          </div>
        </button>

        {/* Massive Button 2: +1 LIVE TRANSFER 🔥 (Hot Synthwave Pink) */}
        <button
          onClick={handleTransferClick}
          className="relative group p-6 rounded-xl bg-gradient-to-br from-[#38001d] to-[#1f0010] border-2 border-[#FF007F] shadow-[0_0_20px_rgba(255,0,127,0.25)] hover:shadow-[0_0_35px_rgba(255,0,127,0.45)] transition-all duration-200 active:scale-[0.98] cursor-pointer text-left overflow-hidden"
        >
          <div className="absolute top-2 right-3 text-[10px] font-bold text-[#FF007F]/60 uppercase tracking-widest">
            HOTKEY: [T] / CLICK
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#FF007F] tracking-wider uppercase">
                <Flame className="w-4 h-4 animate-bounce text-[#FF007F]" />
                <span>HOT AE HAND-OFF</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-wider group-hover:text-[#FF007F] transition-colors">
                +1 TRANSFER 🔥
              </div>
              <div className="text-[11px] text-slate-300">
                Logs conversion & triggers celebration
              </div>
            </div>

            <div className="text-right">
              <div className="text-4xl sm:text-5xl font-black font-mono text-[#FF007F] drop-shadow-[0_0_12px_rgba(255,0,127,0.5)]">
                {metrics.liveTransfers}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                CONVERSIONS
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* ================================================================== */}
      {/* 3. MINIMAL LEAD LOG ENTRY ROW (PHONE + DISPOSITION + QUICK LOG) */}
      {/* ================================================================== */}
      <form
        onSubmit={handleFormSubmit}
        className="bg-[#12111a] border border-[#2d2a45] rounded-xl p-4 shadow-xl"
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2d2a45]/60 text-xs">
          <div className="flex items-center space-x-2 text-[#00F0FF] font-bold text-xs uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            <span>MINIMAL LEAD LOG (DIRECT TO SQLITE)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Table: <code className="text-[#00FF41]">sdr_activity</code>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Phone Input */}
          <div className="sm:col-span-4">
            <label className="block text-[10px] text-[#7d789e] uppercase mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={inputPhone}
              onChange={(e) => setInputPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-[#181726] border border-[#2d2a45] focus:border-[#00F0FF] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none transition-colors"
            />
          </div>

          {/* Disposition Dropdown */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] text-[#7d789e] uppercase mb-1">
              Disposition
            </label>
            <select
              value={inputDisp}
              onChange={(e) => setInputDisp(e.target.value)}
              className="w-full bg-[#181726] border border-[#2d2a45] focus:border-[#00F0FF] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none cursor-pointer transition-colors"
            >
              <option value="Connected - Pitching">Connected - Pitching</option>
              <option value="Live Transfer Completed">Live Transfer Completed 🔥</option>
              <option value="Meeting / Demo Booked">Meeting / Demo Booked 📅</option>
              <option value="Left Voicemail">Left Voicemail</option>
              <option value="Gatekeeper Screen">Gatekeeper Screen</option>
              <option value="Follow-Up Required">Follow-Up Required</option>
              <option value="Not Interested / Disqualified">Not Interested</option>
            </select>
          </div>

          {/* Notes Input */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] text-[#7d789e] uppercase mb-1">
              Notes / Prospect
            </label>
            <input
              type="text"
              value={inputNotes}
              onChange={(e) => setInputNotes(e.target.value)}
              placeholder="e.g., Sarah (Apex Logistics)"
              className="w-full bg-[#181726] border border-[#2d2a45] focus:border-[#00F0FF] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none transition-colors"
            />
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2 pt-4 sm:pt-0">
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-[#003816] hover:bg-[#005522] border border-[#00FF41] text-[#00FF41] font-bold text-xs shadow-[0_0_10px_rgba(0,255,65,0.2)] transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>[ SAVE DB ]</span>
            </button>
          </div>
        </div>
      </form>

      {/* ================================================================== */}
      {/* 4. RETRO CRT TERMINAL ACTIVITY FEED (SQLITE LIVE LOG STREAM) */}
      {/* ================================================================== */}
      <div className="bg-[#12111a] border border-[#2d2a45] rounded-xl p-4 shadow-2xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2d2a45]/60 pb-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#7d789e]">
            <Radio className="w-3.5 h-3.5 text-[#00FF41] animate-pulse" />
            <span>ACTIVITY TERMINAL // SQLITE LOG FEED</span>
            <span className="text-[#2d2a45]">|</span>
            <span className="text-slate-400 font-normal">
              Showing last {recentCalls.length} calls
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-bold">
            <span className="text-[#00F0FF]">
              CONNECT RATE: {metrics.connectRatePct.toFixed(1)}%
            </span>
            <span className="text-[#7d789e]">|</span>
            <span className="text-[#FF007F]">
              CONVERSIONS: {metrics.liveTransfers + metrics.scheduledDemos}
            </span>
          </div>
        </div>

        {/* CRT Monospace Feed Container */}
        <div className="bg-[#0a0a0e] border border-[#1f1e30] rounded-lg p-3 max-h-64 overflow-y-auto space-y-1.5 text-xs font-mono">
          {recentCalls.length === 0 ? (
            <div className="text-slate-500 py-6 text-center text-xs">
              No activity recorded yet. Click [+1 DIAL] or [+1 TRANSFER] to begin logging.
            </div>
          ) : (
            recentCalls.map((call) => {
              const isTransfer =
                call.isLiveTransfer || call.disposition.toLowerCase().includes('transfer');
              const isDemo =
                call.disposition.toLowerCase().includes('demo') ||
                call.disposition.toLowerCase().includes('meeting');

              const offsetHours = Math.floor(call.shiftOffsetSeconds / 3600);
              const offsetMins = Math.floor((call.shiftOffsetSeconds % 3600) / 60);
              const offsetSecs = call.shiftOffsetSeconds % 60;
              const offsetStr = `+${offsetHours.toString().padStart(2, '0')}:${offsetMins
                .toString()
                .padStart(2, '0')}:${offsetSecs.toString().padStart(2, '0')}`;

              return (
                <div
                  key={call.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-[#181726] hover:bg-[#181726]/40 px-1 rounded transition-colors"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="text-[#7d789e] text-[10px] shrink-0">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </span>

                    <span className="text-[#00F0FF] text-[10px] shrink-0 font-bold">
                      ({offsetStr})
                    </span>

                    {isTransfer ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FF007F]/20 text-[#FF007F] border border-[#FF007F]/40 shrink-0">
                        [TRANSFER 🔥]
                      </span>
                    ) : isDemo ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/40 shrink-0">
                        [DEMO 📅]
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 shrink-0">
                        [DIAL]
                      </span>
                    )}

                    <span className="text-white font-bold truncate">
                      {call.leadName || 'Contact'}
                    </span>

                    <span className="text-slate-400 text-[11px] truncate">
                      // {call.disposition}
                    </span>
                  </div>

                  {call.notes && (
                    <div className="text-[11px] text-slate-400 truncate sm:max-w-xs pl-4 sm:pl-0">
                      Note: <span className="text-slate-300">{call.notes}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
