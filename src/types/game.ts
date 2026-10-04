export type ThemeMode = 'midnight' | 'cyber' | 'twilight';

export type Lane = -1 | 0 | 1; // -1: Left, 0: Middle, 1: Right

export interface CharacterItem {
  id: string;
  name: string;
  tagline: string;
  price: number;
  unlocked: boolean;
  color: string;
  accentColor: string;
  hairColor: string;
  jacketStyle: 'hoodie' | 'leather' | 'techwear' | 'ninja' | 'bomber';
  accessory: 'headphones' | 'goggles' | 'mask' | 'visor' | 'none';
  speedBonus: number; // e.g. 1.05x multiplier
}

export interface HoverboardItem {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  trailType: 'plasma' | 'fire' | 'cyber' | 'gold' | 'matrix';
  description: string;
}

export type PowerUpType = 'hoverboard' | 'magnet' | 'sneakers' | 'jetpack' | 'multiplier';

export interface ActivePowerUp {
  type: PowerUpType;
  duration: number; // remaining seconds
  maxDuration: number;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  targetType: 'score' | 'distance' | 'coins' | 'train_dodge' | 'hoverboard_time' | 'roof_runs';
  targetValue: number;
  currentValue: number;
  rewardCoins: number;
  claimed: boolean;
  expiresInDays: number;
  iconName: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  country: string;
  score: number;
  distance: number;
  characterId: string;
  tier: 'Master' | 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  isUser?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  coins: number;
  highScore: number;
  totalDistance: number;
  totalRuns: number;
  selectedCharacterId: string;
  selectedHoverboardId: string;
  selectedTrail: string;
  unlockedCharacters: string[];
  unlockedHoverboards: string[];
  hoverboardInventory: number;
  lastSyncTime: string;
  syncCloudId: string;
}

export interface GameSettings {
  theme: ThemeMode;
  sfxVolume: number;
  musicVolume: number;
  touchControls: boolean;
  showOnScreenButtons: boolean;
  graphicsQuality: 'high' | 'medium' | 'low';
}

export interface GameRunStats {
  score: number;
  coinsCollected: number;
  distanceMeters: number;
  multiplier: number;
  trainsDodged: number;
  roofRuns: number;
  timeSurvivedSeconds: number;
  powerUpsUsed: number;
}
