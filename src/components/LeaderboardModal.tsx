import React, { useState } from 'react';
import { Trophy, Globe, Edit3, Check, X, Shield, Medal } from 'lucide-react';
import { LeaderboardEntry, UserProfile } from '../types/game';
import { sound } from '../services/sound';

interface LeaderboardModalProps {
  leaderboard: LeaderboardEntry[];
  profile: UserProfile;
  onUpdateUsername: (newUsername: string) => void;
  onClose: () => void;
}

const TIER_COLORS: Record<LeaderboardEntry['tier'], { text: string; bg: string; border: string }> = {
  Master: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  Diamond: { text: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  Platinum: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  Gold: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  Silver: { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  Bronze: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  leaderboard,
  profile,
  onUpdateUsername,
  onClose,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [filter, setFilter] = useState<'all' | 'weekly' | 'daily'>('all');

  const handleSaveUsername = () => {
    if (usernameInput.trim().length > 0) {
      onUpdateUsername(usernameInput.trim());
      setIsEditingName(false);
      sound.playClick();
    }
  };

  const userEntry = leaderboard.find((e) => e.isUser);

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-white my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-display">
              Subway Global Network
            </span>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-cyan-400" />
              <span>World Leaderboards</span>
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

        {/* User Card & Alias Edit */}
        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black font-display text-lg">
              #{userEntry ? userEntry.rank : '-'}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={18}
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-cyan-400 text-sm text-white font-semibold focus:outline-none"
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="p-1 bg-cyan-500 text-slate-950 rounded hover:bg-cyan-400"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white font-display">
                      {profile.username}
                    </span>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-slate-400 hover:text-cyan-400 transition-colors"
                      title="Edit Runner Tag"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <span className="text-xs text-slate-400">· Global Division</span>
              </div>
              <span className="text-xs text-slate-400 font-mono-numbers">
                Your Record: {profile.highScore.toLocaleString()} pts · Total Distance: {profile.totalDistance.toLocaleString()}m
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">
              {userEntry ? userEntry.tier : 'Bronze'} Division
            </span>
          </div>
        </div>

        {/* Filter Tab bar */}
        <div className="flex items-center p-1 bg-slate-950/70 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All-Time Highs
          </button>
          <button
            onClick={() => setFilter('weekly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'weekly'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Weekly Season
          </button>
          <button
            onClick={() => setFilter('daily')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'daily'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Sprint
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
          {leaderboard.map((entry) => {
            const tierStyle = TIER_COLORS[entry.tier] || TIER_COLORS.Bronze;

            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  entry.isUser
                    ? 'bg-cyan-950/30 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Rank badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-display font-black text-xs ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-slate-950'
                        : entry.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : entry.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {entry.rank}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-display">
                        {entry.username} {entry.isUser && '(You)'}
                      </span>
                      <span className="text-xs text-slate-400">{entry.country}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono-numbers">
                      {entry.distance.toLocaleString()} meters traversed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded border hidden sm:inline-block ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                  >
                    {entry.tier}
                  </span>

                  <span className="text-base sm:text-lg font-black font-display text-cyan-400 font-mono-numbers">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
