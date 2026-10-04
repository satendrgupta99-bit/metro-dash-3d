import React from 'react';
import { Play, Shield, Zap, Sparkles, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { CharacterItem, HoverboardItem, UserProfile } from '../types/game';

interface StartScreenOverlayProps {
  profile: UserProfile;
  character: CharacterItem;
  hoverboard: HoverboardItem;
  onStartRun: () => void;
  onOpenCharacters: () => void;
  onOpenChallenges: () => void;
}

export const StartScreenOverlay: React.FC<StartScreenOverlayProps> = ({
  profile,
  character,
  hoverboard,
  onStartRun,
  onOpenCharacters,
  onOpenChallenges,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-8 select-none pointer-events-none">
      {/* Top Banner: High Score & Weekly Op */}
      <div className="flex items-start justify-between w-full pointer-events-auto">
        <div className="flex flex-col gap-0.5 p-3 rounded-2xl bg-slate-950/70 backdrop-blur-md border border-white/10 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest font-display">
            Personal Best Record
          </span>
          <span className="text-2xl sm:text-3xl font-display font-black text-cyan-400 font-mono-numbers">
            {profile.highScore.toLocaleString()}
          </span>
        </div>

        <button
          onClick={onOpenChallenges}
          className="flex items-center gap-2 p-3 rounded-2xl bg-slate-950/70 backdrop-blur-md border border-white/10 shadow-xl text-amber-300 hover:border-amber-400/50 hover:bg-slate-900 transition-all text-xs font-bold"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Weekly Missions Active</span>
        </button>
      </div>

      {/* Center Action: Big Dash Button */}
      <div className="flex flex-col items-center gap-5 self-center pointer-events-auto">
        <button
          onClick={onStartRun}
          className="group relative flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl bg-cyan-400 text-slate-950 hover:bg-cyan-300 active:scale-95 transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] cursor-pointer"
        >
          <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current transition-transform group-hover:scale-110" />
          <span className="text-xl sm:text-2xl font-display font-black uppercase tracking-wider">
            Start Run
          </span>
        </button>
        <span className="text-xs text-slate-300 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          Tap screen or press Space / Up to launch
        </span>
      </div>

      {/* Bottom Area: Equipped Runner / Board & Touch / Key Control Guide */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full pointer-events-auto">
        {/* Runner & Board Quick Selector */}
        <button
          onClick={onOpenCharacters}
          className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 hover:border-cyan-400/50 transition-all text-left shadow-xl"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner"
            style={{ backgroundColor: character.color, borderColor: hoverboard.glowColor }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-display">{character.name}</span>
              <span className="text-[10px] text-cyan-300 font-mono-numbers">
                +{Math.round((character.speedBonus - 1) * 100)}% Speed
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Deck: {hoverboard.name} ({profile.hoverboardInventory} in stock)
            </span>
          </div>
        </button>

        {/* Clean Responsive Control Hints */}
        <div className="flex items-center gap-4 text-xs text-slate-300 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-mono">↑ / Swipe Up</span>
            <span>Jump</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-mono">↓ / Swipe Down</span>
            <span>Slide</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-mono">← →</span>
            <span>Lane Shift</span>
          </div>
          <span>·</span>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-mono">Double Tap / Space</span>
            <span>Hoverboard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
