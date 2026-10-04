import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { GameOverModal } from './components/GameOverModal';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { WeeklyChallengesModal } from './components/WeeklyChallengesModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { SettingsModal } from './components/SettingsModal';
import { StartScreenOverlay } from './components/StartScreenOverlay';
import { SubwaySurfersEngine } from './game/threeScene';
import {
  UserProfile,
  CharacterItem,
  HoverboardItem,
  GameSettings,
  WeeklyChallenge,
  LeaderboardEntry,
  ActivePowerUp,
  PowerUpType,
  GameRunStats,
} from './types/game';
import { StorageService } from './services/storage';
import { ChallengesService } from './services/challenges';
import { LeaderboardService } from './services/leaderboard';
import { sound } from './services/sound';

export default function App() {
  // Persistent data state
  const [profile, setProfile] = useState<UserProfile>(() => StorageService.getProfile());
  const [characters, setCharacters] = useState<CharacterItem[]>(() => StorageService.getCharacters());
  const [hoverboards, setHoverboards] = useState<HoverboardItem[]>(() => StorageService.getHoverboards());
  const [settings, setSettings] = useState<GameSettings>(() => StorageService.getSettings());
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>(() => ChallengesService.getChallenges());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => LeaderboardService.getLeaderboard(profile));

  // Navigation / Modal active tab
  const [activeTab, setActiveTab] = useState<'play' | 'characters' | 'challenges' | 'leaderboard' | 'cloud' | 'settings'>('play');

  // In-Game Live State
  const [gameKey, setGameKey] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [runCoins, setRunCoins] = useState<number>(0);
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [rivalNotification, setRivalNotification] = useState<string | null>(null);

  // Game Over State
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [lastRunStats, setLastRunStats] = useState<GameRunStats | null>(null);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [userRank, setUserRank] = useState<number>(1);
  const [completedChallengesThisRun, setCompletedChallengesThisRun] = useState<WeeklyChallenge[]>([]);

  const engineRef = useRef<SubwaySurfersEngine | null>(null);
  const rivalCheckedRef = useRef<Set<string>>(new Set());

  // Initialize sound settings
  useEffect(() => {
    sound.setVolumes(settings.sfxVolume, settings.musicVolume);
  }, [settings.sfxVolume, settings.musicVolume]);

  const selectedChar = characters.find((c) => c.id === profile.selectedCharacterId) || characters[0];
  const selectedBoard = hoverboards.find((b) => b.id === profile.selectedHoverboardId) || hoverboards[0];

  // START RUN
  const handleStartRun = useCallback(() => {
    setIsGameOver(false);
    setIsPaused(false);
    setIsRunning(true);
    setScore(0);
    setDistance(0);
    setRunCoins(0);
    setActivePowerUps([]);
    rivalCheckedRef.current.clear();
    setRivalNotification(null);

    if (engineRef.current) {
      engineRef.current.startRun();
    }
  }, []);

  // PAUSE / RESUME
  const handlePause = () => {
    setIsPaused(true);
    if (engineRef.current) engineRef.current.pauseRun();
  };

  const handleResume = () => {
    setIsPaused(false);
    if (engineRef.current) engineRef.current.resumeRun();
  };

  // RESTART
  const handleRestart = () => {
    setIsGameOver(false);
    setGameKey((prev) => prev + 1);
    setTimeout(() => {
      handleStartRun();
    }, 50);
  };

  // POWER-UPS
  const handlePowerUpStart = (type: PowerUpType, duration: number) => {
    setActivePowerUps((prev) => {
      const filtered = prev.filter((p) => p.type !== type);
      return [...filtered, { type, duration, maxDuration: duration }];
    });
  };

  const handlePowerUpEnd = (type: PowerUpType) => {
    setActivePowerUps((prev) => prev.filter((p) => p.type !== type));
  };

  const handleHoverboardDestroyed = () => {
    setActivePowerUps((prev) => prev.filter((p) => p.type !== 'hoverboard'));
    setRivalNotification('Hoverboard Shield Absorbed Crash!');
    setTimeout(() => setRivalNotification(null), 2500);
  };

  const handleActivateHoverboard = () => {
    if (profile.hoverboardInventory > 0 && engineRef.current) {
      const deployed = engineRef.current.activateHoverboard();
      if (deployed) {
        const updatedProfile = {
          ...profile,
          hoverboardInventory: profile.hoverboardInventory - 1,
        };
        setProfile(updatedProfile);
        StorageService.saveProfile(updatedProfile);
      }
    }
  };

  // SCORE UPDATE & RIVAL NOTIFICATION
  const handleScoreUpdate = (newScore: number, newDistance: number, newCoins: number) => {
    setScore(newScore);
    setDistance(newDistance);
    setRunCoins(newCoins);

    // Check if player passed a rival score on the leaderboard
    const nextRival = LeaderboardService.getNextRival(newScore, leaderboard);
    if (nextRival && !rivalCheckedRef.current.has(nextRival.userId) && newScore >= nextRival.score) {
      rivalCheckedRef.current.add(nextRival.userId);
      setRivalNotification(`Overtook ${nextRival.username} (${nextRival.score.toLocaleString()} pts)!`);
      setTimeout(() => setRivalNotification(null), 3000);
    }
  };

  // GAME OVER
  const handleGameOver = (
    finalScore: number,
    distanceMeters: number,
    coinsEarned: number,
    trainsDodged: number,
    roofRuns: number
  ) => {
    setIsRunning(false);
    setIsGameOver(true);

    const stats: GameRunStats = {
      score: finalScore,
      distanceMeters,
      coinsCollected: coinsEarned,
      trainsDodged,
      roofRuns,
      multiplier: 1,
      timeSurvivedSeconds: Math.floor(distanceMeters / 15),
      powerUpsUsed: 0,
    };
    setLastRunStats(stats);

    // Update user profile with earned coins and stats
    const updatedProfile = {
      ...profile,
      coins: profile.coins + coinsEarned,
    };

    // Update leaderboard & high score
    const { rank, newRecord } = LeaderboardService.updateScore(updatedProfile, finalScore, distanceMeters);
    setUserRank(rank);
    setIsNewRecord(newRecord);
    setProfile(updatedProfile);
    StorageService.saveProfile(updatedProfile);
    setLeaderboard(LeaderboardService.getLeaderboard(updatedProfile));

    // Update weekly challenges
    const { updated, completedNow } = ChallengesService.recordRunProgress(stats);
    setChallenges(updated);
    setCompletedChallengesThisRun(completedNow);
  };

  // UNLOCK / SELECT RUNNERS
  const handleSelectCharacter = (charId: string) => {
    const updated = { ...profile, selectedCharacterId: charId };
    setProfile(updated);
    StorageService.saveProfile(updated);
  };

  const handleUnlockCharacter = (charId: string) => {
    const char = characters.find((c) => c.id === charId);
    if (char && profile.coins >= char.price) {
      const updatedProfile = {
        ...profile,
        coins: profile.coins - char.price,
        unlockedCharacters: [...profile.unlockedCharacters, charId],
        selectedCharacterId: charId,
      };
      setProfile(updatedProfile);
      StorageService.saveProfile(updatedProfile);

      const updatedChars = characters.map((c) => (c.id === charId ? { ...c, unlocked: true } : c));
      setCharacters(updatedChars);
      StorageService.saveCharacters(updatedChars);
    }
  };

  // UNLOCK / SELECT HOVERBOARDS
  const handleSelectHoverboard = (boardId: string) => {
    const updated = { ...profile, selectedHoverboardId: boardId };
    setProfile(updated);
    StorageService.saveProfile(updated);
  };

  const handleUnlockHoverboard = (boardId: string) => {
    const board = hoverboards.find((b) => b.id === boardId);
    if (board && profile.coins >= board.price) {
      const updatedProfile = {
        ...profile,
        coins: profile.coins - board.price,
        unlockedHoverboards: [...profile.unlockedHoverboards, boardId],
        selectedHoverboardId: boardId,
      };
      setProfile(updatedProfile);
      StorageService.saveProfile(updatedProfile);

      const updatedBoards = hoverboards.map((b) => (b.id === boardId ? { ...b, unlocked: true } : b));
      setHoverboards(updatedBoards);
      StorageService.saveHoverboards(updatedBoards);
    }
  };

  const handleBuyHoverboardStock = () => {
    if (profile.coins >= 500) {
      const updatedProfile = {
        ...profile,
        coins: profile.coins - 500,
        hoverboardInventory: profile.hoverboardInventory + 3,
      };
      setProfile(updatedProfile);
      StorageService.saveProfile(updatedProfile);
    }
  };

  // CLAIM CHALLENGE REWARD
  const handleClaimReward = (challengeId: string) => {
    const reward = ChallengesService.claimReward(challengeId);
    if (reward > 0) {
      const updatedProfile = {
        ...profile,
        coins: profile.coins + reward,
      };
      setProfile(updatedProfile);
      StorageService.saveProfile(updatedProfile);
      setChallenges(ChallengesService.getChallenges());
    }
  };

  // UPDATE RUNNER USERNAME
  const handleUpdateUsername = (newUsername: string) => {
    const updated = { ...profile, username: newUsername };
    setProfile(updated);
    StorageService.saveProfile(updated);
    setLeaderboard(LeaderboardService.getLeaderboard(updated));
  };

  // UPDATE SETTINGS
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  // RESET PROGRESS
  const handleResetProgress = () => {
    localStorage.clear();
    const p = StorageService.getProfile();
    const c = StorageService.getCharacters();
    const b = StorageService.getHoverboards();
    const s = StorageService.getSettings();
    const ch = ChallengesService.getChallenges();
    const lb = LeaderboardService.getLeaderboard(p);

    setProfile(p);
    setCharacters(c);
    setHoverboards(b);
    setSettings(s);
    setChallenges(ch);
    setLeaderboard(lb);
    setActiveTab('play');
    setGameKey((prev) => prev + 1);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Bar Navigation */}
      <Navbar
        profile={profile}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (isRunning) {
            handlePause();
          }
          setActiveTab(tab);
          sound.playClick();
        }}
        isGameRunning={isRunning && !isPaused}
      />

      {/* Main 3D Game Viewport */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <GameCanvas
          key={gameKey}
          character={selectedChar}
          hoverboard={selectedBoard}
          theme={settings.theme}
          isRunning={isRunning}
          isPaused={isPaused}
          onScoreUpdate={handleScoreUpdate}
          onPowerUpStart={handlePowerUpStart}
          onPowerUpEnd={handlePowerUpEnd}
          onHoverboardDestroyed={handleHoverboardDestroyed}
          onTrainDodged={() => {}}
          onRoofRun={() => {}}
          onRivalPassed={() => {}}
          onGameOver={handleGameOver}
          engineRef={engineRef}
          onStartRun={handleStartRun}
        />

        {/* Start Screen Overlay when not running */}
        {!isRunning && !isGameOver && (
          <StartScreenOverlay
            profile={profile}
            character={selectedChar}
            hoverboard={selectedBoard}
            onStartRun={handleStartRun}
            onOpenCharacters={() => setActiveTab('characters')}
            onOpenChallenges={() => setActiveTab('challenges')}
          />
        )}

        {/* In-Game Heads-Up Display */}
        {isRunning && (
          <HUD
            score={score}
            highScore={profile.highScore}
            distance={distance}
            runCoins={runCoins}
            hoverboardInventory={profile.hoverboardInventory}
            activePowerUps={activePowerUps}
            isPaused={isPaused}
            onPause={handlePause}
            onResume={handleResume}
            onRestart={handleRestart}
            onActivateHoverboard={handleActivateHoverboard}
            onMoveLeft={() => engineRef.current?.moveLeft()}
            onMoveRight={() => engineRef.current?.moveRight()}
            onJump={() => engineRef.current?.jump()}
            onSlide={() => engineRef.current?.slide()}
            showOnScreenControls={settings.showOnScreenButtons}
            rivalNotification={rivalNotification}
          />
        )}

        {/* Game Over Modal */}
        {isGameOver && lastRunStats && (
          <GameOverModal
            stats={lastRunStats}
            highScore={profile.highScore}
            isNewRecord={isNewRecord}
            userRank={userRank}
            completedChallenges={completedChallengesThisRun}
            onPlayAgain={handleRestart}
            onOpenCharacters={() => {
              setIsGameOver(false);
              setActiveTab('characters');
            }}
            onOpenLeaderboard={() => {
              setIsGameOver(false);
              setActiveTab('leaderboard');
            }}
          />
        )}

        {/* Modal Panels */}
        {activeTab === 'characters' && (
          <CharacterSelectModal
            characters={characters}
            hoverboards={hoverboards}
            profile={profile}
            onSelectCharacter={handleSelectCharacter}
            onUnlockCharacter={handleUnlockCharacter}
            onSelectHoverboard={handleSelectHoverboard}
            onUnlockHoverboard={handleUnlockHoverboard}
            onBuyHoverboardStock={handleBuyHoverboardStock}
            onClose={() => setActiveTab('play')}
          />
        )}

        {activeTab === 'challenges' && (
          <WeeklyChallengesModal
            challenges={challenges}
            onClaim={handleClaimReward}
            onClose={() => setActiveTab('play')}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardModal
            leaderboard={leaderboard}
            profile={profile}
            onUpdateUsername={handleUpdateUsername}
            onClose={() => setActiveTab('play')}
          />
        )}

        {activeTab === 'cloud' && (
          <CloudSyncModal
            profile={profile}
            onProfileUpdated={(updated) => {
              setProfile(updated);
              setCharacters(StorageService.getCharacters());
              setHoverboards(StorageService.getHoverboards());
              setLeaderboard(LeaderboardService.getLeaderboard(updated));
            }}
            onClose={() => setActiveTab('play')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetProgress={handleResetProgress}
            onClose={() => setActiveTab('play')}
          />
        )}
      </main>
    </div>
  );
}
