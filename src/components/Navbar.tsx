import React, { useEffect, useState } from 'react';
import { Settings, Coins, Cloud, Wifi, WifiOff } from 'lucide-react';
import { UserProfile } from '../types/game';

interface NavbarProps {
  profile: UserProfile;
  activeTab: 'play' | 'characters' | 'challenges' | 'leaderboard' | 'cloud' | 'settings';
  setActiveTab: (tab: 'play' | 'characters' | 'challenges' | 'leaderboard' | 'cloud' | 'settings') => void;
  isGameRunning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeTab,
  setActiveTab,
  isGameRunning,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950/90 backdrop-blur-md border-b border-white/10 select-none">
      {/* Zone 1: Single text element brand wordmark */}
      <button
        onClick={() => setActiveTab('play')}
        className="text-left font-display font-bold text-lg sm:text-xl tracking-wider text-white hover:text-cyan-400 transition-colors uppercase"
      >
        Metro Dash
      </button>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className={`items-center gap-5 sm:gap-7 text-xs sm:text-sm font-medium ${isGameRunning ? 'hidden' : 'flex'}`}>
        <button
          onClick={() => setActiveTab('play')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'play'
              ? 'text-cyan-400 font-semibold underline underline-offset-4 decoration-2 decoration-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Track
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'characters'
              ? 'text-cyan-400 font-semibold underline underline-offset-4 decoration-2 decoration-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Runners
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'challenges'
              ? 'text-cyan-400 font-semibold underline underline-offset-4 decoration-2 decoration-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Missions
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'text-cyan-400 font-semibold underline underline-offset-4 decoration-2 decoration-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Global Ranks
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`transition-colors whitespace-nowrap hidden md:inline-block ${
            activeTab === 'cloud'
              ? 'text-cyan-400 font-semibold underline underline-offset-4 decoration-2 decoration-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Cloud Sync
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        {/* Offline / Online Network Indicator */}
        <div
          title={isOnline ? 'Online - Cloud Sync active' : 'Offline Mode - Saving locally'}
          className="flex items-center gap-1.5 text-xs text-slate-400 font-mono-numbers px-2 py-1 rounded bg-slate-900 border border-slate-800"
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline text-slate-300">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-amber-300">Offline</span>
            </>
          )}
        </div>

        {/* User Coin Balance */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold font-mono-numbers">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>{profile.coins.toLocaleString()}</span>
        </div>

        {/* Settings button */}
        <button
          onClick={() => setActiveTab('settings')}
          className="p-1.5 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-800"
          aria-label="Game Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
