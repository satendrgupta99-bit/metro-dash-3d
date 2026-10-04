import React from 'react';
import { Trophy, CheckCircle, Clock, Coins, X, Award } from 'lucide-react';
import { WeeklyChallenge } from '../types/game';
import { sound } from '../services/sound';

interface WeeklyChallengesModalProps {
  challenges: WeeklyChallenge[];
  onClaim: (challengeId: string) => void;
  onClose: () => void;
}

export const WeeklyChallengesModal: React.FC<WeeklyChallengesModalProps> = ({
  challenges,
  onClaim,
  onClose,
}) => {
  const completedCount = challenges.filter((c) => c.currentValue >= c.targetValue).length;

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-white my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest font-display">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Season Active · 4 Days Left</span>
            </div>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
              Weekly Track Operations
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

        {/* Overview banner */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold font-display uppercase text-white">
                Missions Accomplished: {completedCount} / {challenges.length}
              </span>
              <span className="text-xs text-slate-400">
                Complete weekly rail assignments to claim high coin rewards!
              </span>
            </div>
          </div>
        </div>

        {/* Mission List */}
        <div className="flex flex-col gap-3">
          {challenges.map((ch) => {
            const isFinished = ch.currentValue >= ch.targetValue;
            const progressPercent = Math.min(100, Math.floor((ch.currentValue / ch.targetValue) * 100));

            return (
              <div
                key={ch.id}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white font-display">{ch.title}</span>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{ch.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold font-mono-numbers shrink-0">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>+{ch.rewardCoins.toLocaleString()}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono-numbers text-slate-400">
                    <span>Progress: {ch.currentValue.toLocaleString()} / {ch.targetValue.toLocaleString()}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isFinished ? 'bg-emerald-400' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Claim action */}
                <div className="flex justify-end pt-1">
                  {ch.claimed ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      <span>Reward Claimed</span>
                    </div>
                  ) : isFinished ? (
                    <button
                      onClick={() => {
                        onClaim(ch.id);
                        sound.playCoin();
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black uppercase font-display hover:bg-amber-300 active:scale-95 transition-all shadow-md flex items-center gap-1.5 animate-pulse"
                    >
                      <Award className="w-4 h-4" />
                      <span>Claim {ch.rewardCoins} Coins</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 italic">In Progress</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
