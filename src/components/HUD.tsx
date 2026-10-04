import React from 'react';
import {
  Coins,
  Pause,
  Play,
  RotateCcw,
  Zap,
  Shield,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ActivePowerUp, PowerUpType } from '../types/game';

interface HUDProps {
  score: number;
  highScore: number;
  distance: number;
  runCoins: number;
  hoverboardInventory: number;
  activePowerUps: ActivePowerUp[];
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onActivateHoverboard: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  showOnScreenControls: boolean;
  rivalNotification: string | null;
}

const POWERUP_ICONS: Record<PowerUpType, { label: string; color: string }> = {
  hoverboard: { label: 'Hoverboard', color: 'from-sky-500 to-blue-600' },
  magnet: { label: 'Coin Magnet', color: 'from-rose-500 to-red-600' },
  sneakers: { label: 'Super Jump', color: 'from-emerald-500 to-green-600' },
  jetpack: { label: 'Sky Jetpack', color: 'from-amber-500 to-orange-600' },
  multiplier: { label: '2X Score', color: 'from-purple-500 to-indigo-600' },
};

export const HUD: React.FC<HUDProps> = ({
  score,
  highScore,
  distance,
  runCoins,
  hoverboardInventory,
  activePowerUps,
  isPaused,
  onPause,
  onResume,
  onRestart,
  onActivateHoverboard,
  onMoveLeft,
  onMoveRight,
  onJump,
  onSlide,
  showOnScreenControls,
  rivalNotification,
}) => {
  const isHoverboardActive = activePowerUps.some((p) => p.type === 'hoverboard');

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Top HUD Row */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Score & Distance */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] font-mono-numbers">
              {score.toLocaleString()}
            </span>
            {score > highScore && highScore > 0 && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                NEW RECORD!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300 font-mono-numbers">
            <span>{distance.toLocaleString()} m</span>
            <span>·</span>
            <span>Best: {Math.max(highScore, score).toLocaleString()}</span>
          </div>
        </div>

        {/* Right: Coins & Pause */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-amber-300 font-mono-numbers text-sm font-bold shadow-lg">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>+{runCoins.toLocaleString()}</span>
          </div>

          <button
            onClick={isPaused ? onResume : onPause}
            className="p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-black/70 transition-colors shadow-lg"
            aria-label={isPaused ? 'Resume Run' : 'Pause Run'}
          >
            {isPaused ? <Play className="w-5 h-5 fill-white" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Center: Live Rival Passed Banner */}
      {rivalNotification && (
        <div className="self-center transform -translate-y-4 transition-all duration-300 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-950/80 backdrop-blur-md border border-cyan-400/40 text-cyan-200 text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-bounce">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>{rivalNotification}</span>
          </div>
        </div>
      )}

      {/* Active Power-Ups Stack */}
      <div className="flex flex-col gap-2 max-w-xs self-start pointer-events-none">
        {activePowerUps.map((p) => {
          const cfg = POWERUP_ICONS[p.type] || { label: p.type, color: 'from-slate-600 to-slate-700' };
          const progressPercent = Math.max(0, Math.min(100, (p.duration / p.maxDuration) * 100));

          return (
            <div
              key={p.type}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-md text-xs min-w-[170px]"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span>{cfg.label}</span>
                  <span className="font-mono-numbers text-slate-400">{Math.ceil(p.duration)}s</span>
                </div>
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${cfg.color} transition-all duration-100 rounded-full`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Area: Hoverboard Trigger & Touch On-screen Controls */}
      <div className="flex flex-col gap-3 w-full">
        {/* Quick Hoverboard Deployment Button */}
        <div className="self-end pointer-events-auto">
          <button
            onClick={onActivateHoverboard}
            disabled={isHoverboardActive || hoverboardInventory <= 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg transition-all font-semibold text-xs sm:text-sm ${
              isHoverboardActive
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 animate-pulse'
                : hoverboardInventory > 0
                ? 'bg-slate-900/80 border-slate-700 text-white hover:border-cyan-400 hover:bg-slate-800 active:scale-95'
                : 'bg-slate-950/60 border-slate-800 text-slate-500 opacity-60'
            }`}
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>{isHoverboardActive ? 'Shield Active' : `Hoverboard (${hoverboardInventory})`}</span>
          </button>
        </div>

        {/* Optional Responsive On-Screen D-Pad / Controls */}
        {showOnScreenControls && (
          <div className="flex justify-between items-end w-full pt-2 pointer-events-auto">
            {/* Left & Right lane buttons */}
            <div className="flex items-center gap-3">
              <button
                onTouchStart={(e) => { e.preventDefault(); onMoveLeft(); }}
                onClick={onMoveLeft}
                className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 active:bg-cyan-500/40 transition-transform shadow-xl"
                aria-label="Move Left"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); onMoveRight(); }}
                onClick={onMoveRight}
                className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 active:bg-cyan-500/40 transition-transform shadow-xl"
                aria-label="Move Right"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            {/* Jump & Slide buttons */}
            <div className="flex items-center gap-3">
              <button
                onTouchStart={(e) => { e.preventDefault(); onSlide(); }}
                onClick={onSlide}
                className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 active:bg-amber-500/40 transition-transform shadow-xl"
                aria-label="Slide Roll"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); onJump(); }}
                onClick={onJump}
                className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 active:bg-emerald-500/40 transition-transform shadow-xl"
                aria-label="Jump Leap"
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pause Menu Modal Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center pointer-events-auto z-40">
          <div className="flex flex-col items-center gap-5 p-8 max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center">
            <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">
              Game Paused
            </h2>
            <div className="flex flex-col gap-1 text-sm text-slate-400 font-mono-numbers">
              <p>Current Score: <span className="text-white font-bold">{score.toLocaleString()}</span></p>
              <p>Distance: <span className="text-white font-bold">{distance.toLocaleString()} m</span></p>
              <p>Coins Picked: <span className="text-amber-300 font-bold">{runCoins.toLocaleString()}</span></p>
            </div>
            <div className="flex flex-col gap-3 w-full pt-2">
              <button
                onClick={onResume}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 text-slate-950 font-bold font-display uppercase tracking-wider hover:bg-cyan-400 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Run</span>
              </button>
              <button
                onClick={onRestart}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Run</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
