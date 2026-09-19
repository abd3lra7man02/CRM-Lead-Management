import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  PhoneCall,
  Zap,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
  Sliders,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Shift, CallLog, DashboardMetrics, DailyTargets } from '../types';

interface Props {
  shift: Shift;
  metrics: DashboardMetrics;
  recentCalls: CallLog[];
  elapsedFormatted: string;
  targets: DailyTargets;
  onUpdateTargets: (targets: DailyTargets) => void;
  onStartShift: () => void;
  onPauseShift: () => void;
  onResumeShift: () => void;
  onEndShift: () => void;
  onLogRapidCall: (disposition: string, isTransfer: boolean) => void;
}

export const SdrDashboardTab: React.FC<Props> = ({
  shift,
  metrics,
  recentCalls,
  elapsedFormatted,
  targets,
  onUpdateTargets,
  onStartShift,
  onPauseShift,
  onResumeShift,
  onEndShift,
  onLogRapidCall
}) => {
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState<DailyTargets>(targets);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleRapidClick = (disp: string, isTransfer: boolean) => {
    if (isTransfer) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
    onLogRapidCall(disp, isTransfer);
  };

  const handleSaveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTargets({
      dialTarget: Math.max(1, Number(tempTargets.dialTarget) || 80),
      connectTarget: Math.max(1, Number(tempTargets.connectTarget) || 20),
      transferTarget: Math.max(1, Number(tempTargets.transferTarget) || 4)
    });
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      setIsEditingTargets(false);
    }, 900);
  };

  const handlePresetSelect = (field: keyof DailyTargets, val: number) => {
    const updated = { ...tempTargets, [field]: val };
    setTempTargets(updated);
    onUpdateTargets(updated);
  };

  // Calculations for progress against user-defined goals
  const dialPct = Math.round((metrics.totalDials / targets.dialTarget) * 100);
  const connectPct = Math.round((metrics.connects / targets.connectTarget) * 100);
  const transferPct = Math.round((metrics.liveTransfers / targets.transferTarget) * 100);

  const dialsRemaining = Math.max(0, targets.dialTarget - metrics.totalDials);
  const connectsRemaining = Math.max(0, targets.connectTarget - metrics.connects);
  const transfersRemaining = Math.max(0, targets.transferTarget - metrics.liveTransfers);

  return (
    <div className="space-y-4">
      {/* 1. Main Shift Timer Banner */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Shift Status & Info */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              SDR Dialing Shift Engine
            </div>
            <div className="flex items-center space-x-3">
              {shift.status === 'active' && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>ACTIVE DIALING SHIFT</span>
                </div>
              )}
              {shift.status === 'paused' && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>SHIFT PAUSED (BREAK / LUNCH)</span>
                </div>
              )}
              {shift.status === 'completed' && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-950/80 border border-blue-500/40 text-blue-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>TODAY'S SHIFT COMPLETED</span>
                </div>
              )}
              {shift.status === 'inactive' && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800/80 border border-slate-700 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>READY TO START SHIFT</span>
                </div>
              )}
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Digital Timer Display */}
          <div className="flex flex-col items-center justify-center px-6 py-2 bg-[#181825] border border-[#313244] rounded-xl">
            <div className="font-mono text-4xl font-extrabold text-white tracking-wider drop-shadow-sm">
              {elapsedFormatted}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Net Active Dialing Time
            </div>
          </div>

          {/* Shift Action Buttons */}
          <div className="flex items-center space-x-2.5">
            {shift.status === 'inactive' && (
              <button
                onClick={onStartShift}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Shift</span>
              </button>
            )}

            {shift.status === 'active' && (
              <>
                <button
                  onClick={onPauseShift}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Break</span>
                </button>
                <button
                  onClick={onEndShift}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-rose-600 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End Shift</span>
                </button>
              </>
            )}

            {shift.status === 'paused' && (
              <>
                <button
                  onClick={onResumeShift}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Dialing</span>
                </button>
                <button
                  onClick={onEndShift}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-rose-600 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End Shift</span>
                </button>
              </>
            )}

            {shift.status === 'completed' && (
              <button
                onClick={onStartShift}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start New Shift</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Target Quota Configuration Interface */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>Daily SDR Quota & Target Goals</span>
                <span className="text-[10px] font-normal text-emerald-400 font-mono">
                  (Dials: {targets.dialTarget} • Connects: {targets.connectTarget} • Transfers: {targets.transferTarget})
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Adjust your personal targets to recalibrate real-time progress percentages across all cards.
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setTempTargets(targets);
              setIsEditingTargets(!isEditingTargets);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isEditingTargets
                ? 'bg-slate-700 text-white'
                : 'bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-xs'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isEditingTargets ? 'Close Goal Settings' : 'Adjust Targets'}</span>
          </button>
        </div>

        {/* Expandable Targets Input Interface */}
        {isEditingTargets && (
          <form
            onSubmit={handleSaveTargets}
            className="mt-4 pt-3.5 border-t border-[#363a4f] grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Dial Target Input */}
            <div className="bg-[#181825] border border-[#313244] p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  Daily Dial Target
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Calls</span>
              </div>
              <input
                type="number"
                min={1}
                max={500}
                value={tempTargets.dialTarget}
                onChange={(e) => setTempTargets({ ...tempTargets, dialTarget: Number(e.target.value) })}
                className="w-full bg-[#24273a] border border-[#363a4f] rounded-md px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-500"
              />
              <div className="flex items-center space-x-1 pt-1">
                <span className="text-[10px] text-slate-500 mr-1">Presets:</span>
                {[50, 75, 80, 100, 120].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetSelect('dialTarget', preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      tempTargets.dialTarget === preset
                        ? 'bg-sky-600 text-white font-bold'
                        : 'bg-[#24273a] text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Target Input */}
            <div className="bg-[#181825] border border-[#313244] p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                  Daily Connection Target
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Pickups</span>
              </div>
              <input
                type="number"
                min={1}
                max={200}
                value={tempTargets.connectTarget}
                onChange={(e) => setTempTargets({ ...tempTargets, connectTarget: Number(e.target.value) })}
                className="w-full bg-[#24273a] border border-[#363a4f] rounded-md px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-teal-500"
              />
              <div className="flex items-center space-x-1 pt-1">
                <span className="text-[10px] text-slate-500 mr-1">Presets:</span>
                {[15, 20, 25, 30, 35].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetSelect('connectTarget', preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      tempTargets.connectTarget === preset
                        ? 'bg-teal-600 text-white font-bold'
                        : 'bg-[#24273a] text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Transfer Target Input */}
            <div className="bg-[#181825] border border-[#313244] p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Daily Live Transfer Target
                </label>
                <span className="text-[10px] text-slate-400 font-mono">AE Handoffs</span>
              </div>
              <input
                type="number"
                min={1}
                max={50}
                value={tempTargets.transferTarget}
                onChange={(e) => setTempTargets({ ...tempTargets, transferTarget: Number(e.target.value) })}
                className="w-full bg-[#24273a] border border-[#363a4f] rounded-md px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center space-x-1 pt-1">
                <span className="text-[10px] text-slate-500 mr-1">Presets:</span>
                {[2, 3, 4, 5, 6].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetSelect('transferTarget', preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      tempTargets.transferTarget === preset
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-[#24273a] text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button Row */}
            <div className="md:col-span-3 flex justify-end items-center space-x-2 pt-1">
              {savedFeedback && (
                <span className="text-emerald-400 text-xs font-bold flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Targets Saved & Applied!</span>
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply & Recalibrate Metrics</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. Key SDR Metrics Cards with Real-time Progress against Goals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Dials Card */}
        <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Total Dials
              </span>
              <PhoneCall className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-3xl font-black text-sky-400 font-mono">
                {metrics.totalDials}
              </div>
              <div className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                dialPct >= 100 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-sky-950 text-sky-300 border border-sky-500/30'
              }`}>
                {dialPct}% of Goal
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Goal: {targets.dialTarget} dials</span>
              <span className="font-mono text-slate-300">
                {dialsRemaining === 0 ? 'Goal Hit! 🎯' : `${dialsRemaining} remaining`}
              </span>
            </div>
            <div className="w-full bg-[#181825] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dialPct >= 100 ? 'bg-emerald-400' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, dialPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Connections Card */}
        <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Live Connections
              </span>
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-3xl font-black text-teal-400 font-mono">
                {metrics.connects}
              </div>
              <div className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                connectPct >= 100 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-teal-950 text-teal-300 border border-teal-500/30'
              }`}>
                {connectPct}% of Goal
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Goal: {targets.connectTarget} connects</span>
              <span className="font-mono text-teal-300">
                {connectsRemaining === 0 ? 'Goal Hit! 🚀' : `${connectsRemaining} to target`}
              </span>
            </div>
            <div className="w-full bg-[#181825] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  connectPct >= 100 ? 'bg-emerald-400' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(100, connectPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Transfers Card */}
        <div className="bg-[#24273a] border border-emerald-500/30 rounded-xl p-4 shadow-sm relative overflow-hidden bg-gradient-to-b from-[#24273a] to-emerald-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
                Live Transfers 🔥
              </span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {metrics.liveTransfers}
              </div>
              <div className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                {transferPct}% of Goal
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Target: {targets.transferTarget} AE handoffs</span>
              <span className="text-emerald-400 font-bold font-mono">
                {transfersRemaining === 0 ? 'Goal Smashed! 🎉' : `${transfersRemaining} left`}
              </span>
            </div>
            <div className="w-full bg-[#181825] h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, transferPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Conversion & Demos Card */}
        <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Conversion & Demos
              </span>
              <TrendingUp className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-3xl font-black text-rose-400 font-mono">
                {metrics.conversionRatePct.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-300 font-mono font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">
                {metrics.scheduledDemos} Demos
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Connect Rate:</span>
              <span className="font-mono text-slate-200 font-bold">{metrics.connectRatePct.toFixed(1)}%</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              (Transfers + Demos) ÷ Total Dials
            </div>
          </div>
        </div>
      </div>

      {/* 4. Rapid Call Disposition Bar (1-Click Logging) */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              Rapid Call Disposition Bar (1-Click Live Logging)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Stamps call relative to current active shift timeline
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <button
            onClick={() => handleRapidClick('Live Transfer Completed', true)}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">🔥</span>
            <span className="mt-1 font-semibold text-center">Live Transfer</span>
          </button>

          <button
            onClick={() => handleRapidClick('Scheduled Demo', false)}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">📅</span>
            <span className="mt-1 font-semibold text-center">Booked Demo</span>
          </button>

          <button
            onClick={() => handleRapidClick('Connected (Pitching)', false)}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-300 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">🗣️</span>
            <span className="mt-1 font-semibold text-center">Connected</span>
          </button>

          <button
            onClick={() => handleRapidClick('Left Voicemail', false)}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#181825] hover:bg-[#2f334d] border border-[#363a4f] text-slate-300 font-medium text-xs transition-all active:scale-95 cursor-pointer group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">📬</span>
            <span className="mt-1 text-center">Left Voicemail</span>
          </button>

          <button
            onClick={() => handleRapidClick('Gatekeeper Rejection', false)}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#181825] hover:bg-[#2f334d] border border-[#363a4f] text-slate-300 font-medium text-xs transition-all active:scale-95 cursor-pointer group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">🛡️</span>
            <span className="mt-1 text-center">Gatekeeper</span>
          </button>

          <button
            onClick={() => handleRapidClick('Not Interested', false)}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#181825] hover:bg-[#2f334d] border border-[#363a4f] text-slate-300 font-medium text-xs transition-all active:scale-95 cursor-pointer group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">❌</span>
            <span className="mt-1 text-center">Not Interested</span>
          </button>

          <button
            onClick={() => handleRapidClick('Bad Number / Disconnected', false)}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/30 text-rose-300 font-medium text-xs transition-all active:scale-95 cursor-pointer group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">⚠️</span>
            <span className="mt-1 text-center">Bad Number</span>
          </button>
        </div>
      </div>

      {/* 5. Recent Call Activity & Shift Timeline */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              Call Activity Feed (Relative Shift Timestamping)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Showing latest {recentCalls.length} logs
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {recentCalls.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No calls logged yet. Click any rapid disposition button above to start logging.
            </div>
          ) : (
            recentCalls.map((call) => {
              const hours = Math.floor(call.shiftOffsetSeconds / 3600);
              const mins = Math.floor((call.shiftOffsetSeconds % 3600) / 60);
              const offsetStr = `+${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m into Shift`;

              return (
                <div
                  key={call.id}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-[#181825] border border-[#313244] rounded-lg text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        call.isLiveTransfer
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : call.disposition.includes('Demo')
                          ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                          : call.disposition.includes('Connected')
                          ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {call.disposition}
                    </span>

                    {call.leadName ? (
                      <span className="text-slate-200 font-semibold">{call.leadName}</span>
                    ) : (
                      <span className="text-slate-400 italic">Direct Outreach</span>
                    )}

                    {call.notes && (
                      <span className="text-slate-400 text-[11px] hidden md:inline">
                        — {call.notes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="font-mono text-emerald-400 font-medium text-[11px]">
                      {offsetStr}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
