import React from 'react';
import { Minus, Square, X, Radio, Database } from 'lucide-react';

interface Props {
  apiPort: number;
  apiOnline: boolean;
}

export const WindowsTitleBar: React.FC<Props> = ({ apiPort, apiOnline }) => {
  return (
    <div className="h-9 bg-[#0a0a0c] border-b border-[#2d2a45] flex items-center justify-between px-3 select-none text-xs text-[#7d789e] font-mono">
      {/* Left: Window Title & App Icon */}
      <div className="flex items-center space-x-2.5">
        <div className="w-5 h-5 rounded bg-[#002b36] border border-[#00F0FF]/50 flex items-center justify-center text-[#00F0FF] font-bold text-xs shadow-sm">
          ⚡
        </div>
        <span className="font-bold text-[#00F0FF] tracking-wider text-xs">
          RETRO-SDR // SHIFT HUD <span className="text-[#7d789e] font-normal">v1.0 [CUSTOMTKINTER WINDOWS EDITION]</span>
        </span>
      </div>

      {/* Center: Real-time Daemon Status */}
      <div className="hidden md:flex items-center space-x-3 text-[11px]">
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#12111a] border border-[#2d2a45]">
          <Database className="w-3 h-3 text-[#00F0FF]" />
          <span className="text-slate-300 font-mono">sdr_retro.db</span>
          <span className="text-[#00FF41] text-[10px] font-bold px-1 bg-[#003816] rounded border border-[#00FF41]/30">SQLITE</span>
        </div>
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#12111a] border border-[#2d2a45]">
          <Radio className={`w-3 h-3 ${apiOnline ? 'text-[#00FF41] animate-pulse' : 'text-[#FF007F]'}`} />
          <span className="text-slate-300 font-mono">FASTAPI :8000</span>
          <span className="text-[#FF007F] text-[10px] font-bold px-1 bg-[#38001d] rounded border border-[#FF007F]/30">SYNC BRIDGE</span>
        </div>
      </div>

      {/* Right: Windows Controls */}
      <div className="flex items-center space-x-1">
        <button 
          title="Minimize to System Tray"
          className="w-8 h-6 flex items-center justify-center hover:bg-[#2d2a45] rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button 
          title="Maximize Window"
          className="w-8 h-6 flex items-center justify-center hover:bg-[#2d2a45] rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Square className="w-3 h-3" />
        </button>
        <button 
          title="Close Application"
          className="w-8 h-6 flex items-center justify-center hover:bg-[#FF007F] hover:text-white rounded text-slate-400 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
