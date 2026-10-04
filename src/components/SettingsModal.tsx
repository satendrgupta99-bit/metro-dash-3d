import React from 'react';
import { Moon, Sun, Volume2, Music, Smartphone, Sparkles, X, RotateCcw } from 'lucide-react';
import { GameSettings, ThemeMode } from '../types/game';
import { sound } from '../services/sound';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  const handleThemeChange = (newTheme: ThemeMode) => {
    const updated = { ...settings, theme: newTheme };
    onUpdateSettings(updated);
    sound.playClick();
  };

  const handleSfxChange = (val: number) => {
    const updated = { ...settings, sfxVolume: val };
    sound.setVolumes(val, settings.musicVolume);
    onUpdateSettings(updated);
  };

  const handleMusicChange = (val: number) => {
    const updated = { ...settings, musicVolume: val };
    sound.setVolumes(settings.sfxVolume, val);
    onUpdateSettings(updated);
  };

  const handleToggleOnScreen = () => {
    const updated = { ...settings, showOnScreenButtons: !settings.showOnScreenButtons };
    onUpdateSettings(updated);
    sound.playClick();
  };

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-white my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-display">
              System Configuration
            </span>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
              Game Preferences
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

        {/* Dark Mode & City Themes */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Night Visual Themes (Late-Night Comfort)</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleThemeChange('midnight')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                settings.theme === 'midnight'
                  ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-slate-900 border border-cyan-400" />
              <span>Midnight City</span>
            </button>

            <button
              onClick={() => handleThemeChange('cyber')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                settings.theme === 'cyber'
                  ? 'bg-purple-950/40 border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-purple-900 border border-fuchsia-400" />
              <span>Cyber Neon</span>
            </button>

            <button
              onClick={() => handleThemeChange('twilight')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                settings.theme === 'twilight'
                  ? 'bg-amber-950/40 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-amber-900 border border-amber-400" />
              <span>Twilight Glow</span>
            </button>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Sound Effects
              </span>
              <span className="font-mono-numbers">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-purple-400" />
                Synthwave Groove Music
              </span>
              <span className="font-mono-numbers">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              onChange={(e) => handleMusicChange(parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Touch & Control Mode */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase font-display">
                On-Screen Touch D-Pad
              </span>
              <span className="text-[11px] text-slate-400">
                Display directional buttons in addition to swipe gestures
              </span>
            </div>
          </div>

          <button
            onClick={handleToggleOnScreen}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.showOnScreenButtons ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.showOnScreenButtons ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Reset Progress */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-500">Need a fresh start?</span>
          <button
            onClick={() => {
              if (window.confirm('Reset local progress and restore starter coins?')) {
                onResetProgress();
              }
            }}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Game Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
