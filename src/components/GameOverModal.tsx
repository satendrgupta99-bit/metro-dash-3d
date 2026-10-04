import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, User, Trophy, Coins, Zap, MapPin, Award } from 'lucide-react';
import { GameRunStats, WeeklyChallenge } from '../types/game';

interface GameOverModalProps {
  stats: GameRunStats;
  highScore: number;
  isNewRecord: boolean;
  userRank: number;
  completedChallenges: WeeklyChallenge[];
  onPlayAgain: () => void;
  onOpenCharacters: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  highScore,
  isNewRecord,
  userRank,
  completedChallenges,
  onPlayAgain,
  onOpenCharacters,
  onOpenLeaderboard,
}) => {
  useEffect(() => {
    if (isNewRecord) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#facc15', '#ec4899', '#3b82f6'],
      });
    }
  }, [isNewRecord]);

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-white my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold font-display">
            Run Terminated
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white uppercase">
            Game Over
          </h2>

          {isNewRecord && (
            <div className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-pulse">
              <Award className="w-3.5 h-3.5" />
              <span>NEW PERSONAL BEST!</span>
            </div>
          )}
        </div>

        {/* Big Score Card */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Final Score</span>
          <span className="text-4xl sm:text-5xl font-display font-black tracking-tight text-cyan-400 font-mono-numbers my-1">
            {stats.score.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 font-mono-numbers">
            All-Time High: {highScore.toLocaleString()} · Global Rank #{userRank}
          </span>
        </div>

        {/* Run Breakdown Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
            <Coins className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-base font-bold font-mono-numbers text-amber-300">
              +{stats.coinsCollected}
            </span>
            <span className="text-[11px] text-slate-400">Coins</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
            <MapPin className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-base font-bold font-mono-numbers text-cyan-300">
              {stats.distanceMeters}m
            </span>
            <span className="text-[11px] text-slate-400">Distance</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
            <Zap className="w-4 h-4 text-rose-400 mb-1" />
            <span className="text-base font-bold font-mono-numbers text-rose-300">
              {stats.trainsDodged}
            </span>
            <span className="text-[11px] text-slate-400">Trains Dodged</span>
          </div>
        </div>

        {/* Completed Challenges Notification */}
        {completedChallenges.length > 0 && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Weekly Mission Completed!
            </span>
            {completedChallenges.map((c) => (
              <p key={c.id} className="text-xs text-slate-300">
                {c.title} — <span className="text-amber-300 font-semibold font-mono-numbers">+{c.rewardCoins} coins ready</span>
              </p>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 px-4 rounded-xl bg-cyan-400 text-slate-950 font-bold font-display uppercase tracking-wider hover:bg-cyan-300 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Again</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onOpenCharacters}
              className="py-2.5 px-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>Runners</span>
            </button>
            <button
              onClick={onOpenLeaderboard}
              className="py-2.5 px-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
