import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Terminal,
  Cpu,
  PackageCheck,
  FileText,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface Props {
  pythonCode: string;
  specCode: string;
  batCode: string;
}

export const RetroPythonCodeTab: React.FC<Props> = ({
  pythonCode,
  specCode,
  batCode
}) => {
  const [activeFile, setActiveFile] = useState<'python' | 'spec' | 'bat'>('python');
  const [copied, setCopied] = useState<boolean>(false);

  const getActiveContent = () => {
    if (activeFile === 'python') return pythonCode;
    if (activeFile === 'spec') return specCode;
    return batCode;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-slate-200 select-none">
      {/* 1. Header Banner */}
      <div className="bg-[#12111a] border border-[#2d2a45] rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 rounded-lg bg-[#002b36] border border-[#00F0FF]/50 flex items-center justify-center text-[#00F0FF]">
                <Cpu className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-wide">
                RETRO-SDR // PYTHON SOURCE & PYINSTALLER PACKAGING
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Complete, self-contained Python script merging <span className="text-[#00F0FF]">CustomTkinter</span> (cyberpunk dark mode), <span className="text-[#00FF41]">SQLite</span> (single flat table), and <span className="text-[#FF007F]">FastAPI</span> (background daemon on port 8000) into a single modular block.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => handleDownloadFile('retro_sdr_crm.py', pythonCode)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#002b36] hover:bg-[#004d61] border border-[#00F0FF] text-[#00F0FF] font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download retro_sdr_crm.py</span>
            </button>

            <button
              onClick={() => handleDownloadFile('build_windows_exe.bat', batCode)}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-lg bg-[#330018] hover:bg-[#550028] border border-[#FF007F] text-[#FF007F] font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download build.bat</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PyInstaller Packaging Instructions Card */}
      <div className="bg-[#12111a] border border-[#2d2a45] rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#00FF41] uppercase tracking-wider">
          <PackageCheck className="w-4 h-4" />
          <span>PyInstaller Deployment: Package into Standalone Windows .EXE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#181726] border border-[#2d2a45] p-3.5 rounded-lg space-y-1.5">
            <div className="font-bold text-[#00F0FF] flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-[#002b36] border border-[#00F0FF]/50 flex items-center justify-center text-xs">
                1
              </span>
              <span>Install Python Packages</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Run in Windows Command Prompt (CMD) or PowerShell:
            </p>
            <div className="bg-[#0a0a0c] p-2 rounded text-[11px] text-[#00FF41] font-mono select-all overflow-x-auto">
              pip install customtkinter fastapi uvicorn pydantic pyinstaller
            </div>
          </div>

          <div className="bg-[#181726] border border-[#2d2a45] p-3.5 rounded-lg space-y-1.5">
            <div className="font-bold text-[#FFE600] flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-[#332800] border border-[#FFE600]/50 flex items-center justify-center text-xs">
                2
              </span>
              <span>Compile with PyInstaller</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Run either the .bat script or direct command:
            </p>
            <div className="bg-[#0a0a0c] p-2 rounded text-[11px] text-[#FFE600] font-mono select-all overflow-x-auto">
              pyinstaller --clean retro_sdr_crm.spec
            </div>
          </div>

          <div className="bg-[#181726] border border-[#2d2a45] p-3.5 rounded-lg space-y-1.5">
            <div className="font-bold text-[#FF007F] flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-[#38001d] border border-[#FF007F]/50 flex items-center justify-center text-xs">
                3
              </span>
              <span>Run Standalone .EXE</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Navigate to the output directory and launch:
            </p>
            <div className="bg-[#0a0a0c] p-2 rounded text-[11px] text-[#FF007F] font-mono select-all overflow-x-auto">
              dist\RetroSdrShiftHud.exe
            </div>
          </div>
        </div>

        {/* Retro Font Swapping Tip */}
        <div className="p-3.5 bg-[#0a0a0c] border border-[#FF007F]/30 rounded-lg flex items-start space-x-3 text-xs">
          <Sparkles className="w-4 h-4 text-[#FF007F] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-[#FF007F] uppercase tracking-wider text-[11px]">
              Retro Vibe Pro-Tip: Custom Google Fonts (VT323 / Press Start 2P)
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed">
              To level up the CRT arcade look: download <strong className="text-white">VT323</strong> or <strong className="text-white">Press Start 2P</strong> from Google Fonts, extract the <code className="text-sky-300">.ttf</code> file, right-click and click <strong className="text-white">"Install for all users"</strong> in Windows. Then in <code className="text-[#00F0FF]">retro_sdr_crm.py</code>, change <code className="text-[#FFE600]">FONT_MONO = "Consolas"</code> to <code className="text-[#FFE600]">FONT_MONO = "VT323"</code>!
            </div>
          </div>
        </div>
      </div>

      {/* 3. Code Viewer Container */}
      <div className="bg-[#12111a] border border-[#2d2a45] rounded-xl p-5 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* File Selection Tabs */}
          <div className="flex items-center space-x-1 border-b border-[#2d2a45] overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFile('python')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-mono transition-colors cursor-pointer ${
                activeFile === 'python'
                  ? 'bg-[#181726] text-[#00F0FF] border-t-2 border-[#00F0FF] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              retro_sdr_crm.py (Single-File App)
            </button>

            <button
              onClick={() => setActiveFile('spec')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-mono transition-colors cursor-pointer ${
                activeFile === 'spec'
                  ? 'bg-[#181726] text-[#FF007F] border-t-2 border-[#FF007F] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              retro_sdr_crm.spec (PyInstaller)
            </button>

            <button
              onClick={() => setActiveFile('bat')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-mono transition-colors cursor-pointer ${
                activeFile === 'bat'
                  ? 'bg-[#181726] text-[#00FF41] border-t-2 border-[#00FF41] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              build_windows_exe.bat
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#181726] hover:bg-[#2d2a45] border border-[#2d2a45] text-xs font-bold text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#00FF41]" />
                <span className="text-[#00FF41]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Monospace Code Display */}
        <div className="bg-[#0a0a0e] border border-[#1f1e30] rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px]">
          <pre>{getActiveContent()}</pre>
        </div>
      </div>
    </div>
  );
};
