import React, { useState } from 'react';
import { Cloud, RefreshCw, Copy, Check, Download, Upload, ShieldCheck, Wifi, WifiOff, X } from 'lucide-react';
import { UserProfile } from '../types/game';
import { StorageService } from '../services/storage';
import { sound } from '../services/sound';

interface CloudSyncModalProps {
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  profile,
  onProfileUpdated,
  onClose,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const isOnline = navigator.onLine;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    sound.playClick();

    const res = await StorageService.simulateCloudSync(profile.syncCloudId);
    setIsSyncing(false);
    if (res.success) {
      setSyncStatusMsg('Cloud profile successfully synchronized across devices.');
      onProfileUpdated(StorageService.getProfile());
    }
  };

  const handleExportCode = () => {
    const code = StorageService.exportSaveCode();
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      sound.playClick();
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  const handleImportCode = () => {
    if (!importInput.trim()) return;
    setImportError(null);
    setImportSuccess(null);

    const res = StorageService.importSaveCode(importInput);
    if (res.success) {
      setImportSuccess(res.message);
      sound.playPowerUp();
      onProfileUpdated(StorageService.getProfile());
      setImportInput('');
    } else {
      setImportError(res.message);
      sound.playCrash();
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-white my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-display">
              Multi-Device Continuity
            </span>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white flex items-center gap-2">
              <Cloud className="w-6 h-6 text-cyan-400" />
              <span>Cloud Save Synchronization</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network State Strip */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-400" />
            )}
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-white font-display">
                {isOnline ? 'Network Connected' : 'Offline Mode Active'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isOnline
                  ? 'Real-time cloud backup enabled for cross-device play.'
                  : 'Playing 100% offline. Progress is safely queued on device.'}
              </span>
            </div>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded font-semibold ${
              isOnline ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
            }`}
          >
            {isOnline ? 'Cloud Ready' : 'Local Cache'}
          </span>
        </div>

        {/* Cloud ID & Direct Sync */}
        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Cloud Runner ID
              </span>
              <span className="text-lg font-mono-numbers font-bold text-cyan-300">
                {profile.syncCloudId}
              </span>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold font-display uppercase hover:bg-cyan-400 active:scale-95 transition-all text-xs flex items-center gap-2 shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono-numbers">
            Last Cloud Timestamp: {new Date(profile.lastSyncTime).toLocaleString()}
          </div>

          {syncStatusMsg && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>{syncStatusMsg}</span>
            </div>
          )}
        </div>

        {/* Cross-Device Transfer (Export / Import) */}
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Cross-Device Transfer Token
            </h3>
            <p className="text-xs text-slate-400">
              Transfer all high scores, unlocked characters, coins, and hoverboards to another browser or mobile device instantly.
            </p>
          </div>

          {/* Export button */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Generate Cloud Export Token</span>
                <span className="text-[11px] text-slate-400">Copies snapshot to clipboard</span>
              </div>
            </div>

            <button
              onClick={handleExportCode}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Token'}</span>
            </button>
          </div>

          {/* Import token */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">Restore From Another Device</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Paste transfer token here..."
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono-numbers"
              />
              <button
                onClick={handleImportCode}
                className="px-3.5 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 text-xs uppercase font-display active:scale-95 transition-all"
              >
                Restore
              </button>
            </div>

            {importSuccess && (
              <span className="text-xs text-emerald-400 font-medium">{importSuccess}</span>
            )}
            {importError && (
              <span className="text-xs text-rose-400 font-medium">{importError}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
