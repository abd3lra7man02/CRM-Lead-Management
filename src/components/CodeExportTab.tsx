import React, { useState } from 'react';
import { Download, Copy, Check, FileCode, Terminal, Sparkles, FolderArchive, Layers } from 'lucide-react';
import JSZip from 'jszip';
import { PYTHON_PROJECT_FILES, ProjectFile } from '../pythonCodeFiles';

export const CodeExportTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(PYTHON_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folder = zip.folder('sdr_shift_crm');

      PYTHON_PROJECT_FILES.forEach((file) => {
        folder?.file(file.name, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sdr-crm-windows-source.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Instant ZIP Downloader */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Modular Python Codebase & PyInstaller Build Center
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Complete, production-ready source code cleanly separated into UI, Database, and FastAPI Bridge modules. Includes the full PyInstaller <code className="bg-[#181825] px-1.5 py-0.5 rounded text-amber-300 font-mono">sdr_crm.spec</code> to package into a standalone Windows .exe.
            </p>
          </div>

          {/* Download Full Project ZIP */}
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            {isZipping ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <FolderArchive className="w-4 h-4" />
            )}
            <span>{isZipping ? 'Bundling ZIP...' : 'Download Full Python Project (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Explorer: File List vs Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: File List Navigation */}
        <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-3 shadow-sm space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Project Modules ({PYTHON_PROJECT_FILES.length})
          </div>

          <div className="space-y-1">
            {PYTHON_PROJECT_FILES.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-[#181825] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{file.name}</span>
                  </div>

                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono ${
                      isSelected
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-[#181825] text-slate-400'
                    }`}
                  >
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 3 Cols: Code Viewer */}
        <div className="lg:col-span-3 bg-[#24273a] border border-[#363a4f] rounded-xl p-4 shadow-sm flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#363a4f] mb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-white">{selectedFile.name}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#181825] text-sky-400 border border-[#313244]">
                  {selectedFile.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#181825] hover:bg-[#2b2e46] border border-[#363a4f] text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <div className="flex-1 bg-[#181825] border border-[#313244] rounded-lg p-4 font-mono text-xs text-slate-200 overflow-auto max-h-[500px]">
            <pre>{selectedFile.content}</pre>
          </div>
        </div>
      </div>

      {/* 3. PyInstaller Windows Step-by-Step Instructions */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            PyInstaller Standalone .EXE Packaging Instructions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-[#181825] border border-[#313244] rounded-lg space-y-1.5">
            <div className="font-bold text-indigo-400 flex items-center space-x-1.5">
              <span>1. Prepare Environment</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Extract project into a folder, open PowerShell or Command Prompt, and create a clean venv:
            </p>
            <div className="bg-[#11111b] p-2 rounded text-[11px] font-mono text-emerald-300">
              python -m venv venv<br />
              .\venv\Scripts\activate<br />
              pip install -r requirements.txt
            </div>
          </div>

          <div className="p-3.5 bg-[#181825] border border-[#313244] rounded-lg space-y-1.5">
            <div className="font-bold text-sky-400 flex items-center space-x-1.5">
              <span>2. Compile with Spec</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Run PyInstaller using the provided custom specification file:
            </p>
            <div className="bg-[#11111b] p-2 rounded text-[11px] font-mono text-emerald-300">
              pyinstaller --clean sdr_crm.spec
            </div>
            <p className="text-[10px] text-slate-500">
              Or simply double-click <code className="text-amber-300">build_exe.bat</code>.
            </p>
          </div>

          <div className="p-3.5 bg-[#181825] border border-[#313244] rounded-lg space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
              <span>3. Output Executable</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              The standalone executable will be packaged directly into:
            </p>
            <div className="bg-[#11111b] p-2 rounded text-[11px] font-mono text-emerald-300 truncate">
              dist\SDR_Shift_CRM.exe
            </div>
            <p className="text-[10px] text-slate-400">
              Double-click to run! No command prompt or external python installation required for end users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
