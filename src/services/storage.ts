import { CharacterItem, HoverboardItem, UserProfile, GameSettings } from '../types/game';

export const INITIAL_CHARACTERS: CharacterItem[] = [
  {
    id: 'axel',
    name: 'Axel "Viper"',
    tagline: 'Cyberpunk street runner with high-speed reflex servos',
    price: 0,
    unlocked: true,
    color: '#06b6d4', // Cyan
    accentColor: '#3b82f6',
    hairColor: '#f59e0b',
    jacketStyle: 'techwear',
    accessory: 'visor',
    speedBonus: 1.0,
  },
  {
    id: 'maya',
    name: 'Maya "Pulse"',
    tagline: 'Urban rooftop parkour champion with aerodynamic flow',
    price: 3000,
    unlocked: false,
    color: '#ec4899', // Hot Pink
    accentColor: '#8b5cf6',
    hairColor: '#10b981',
    jacketStyle: 'hoodie',
    accessory: 'headphones',
    speedBonus: 1.05,
  },
  {
    id: 'kage',
    name: 'Kage "Shadow"',
    tagline: 'Stealth night skater trained in silent rail grinds',
    price: 7500,
    unlocked: false,
    color: '#10b981', // Emerald
    accentColor: '#064e3b',
    hairColor: '#1e293b',
    jacketStyle: 'ninja',
    accessory: 'mask',
    speedBonus: 1.1,
  },
  {
    id: 'nova',
    name: 'Nova "Astro"',
    tagline: 'Gravity-defying astronaut prodigy with booster boots',
    price: 15000,
    unlocked: false,
    color: '#f59e0b', // Amber Gold
    accentColor: '#ef4444',
    hairColor: '#6366f1',
    jacketStyle: 'bomber',
    accessory: 'goggles',
    speedBonus: 1.15,
  },
  {
    id: 'roxy',
    name: 'Roxy "Glitch"',
    tagline: 'Rebel underground graffiti master with magnetic boots',
    price: 25000,
    unlocked: false,
    color: '#a855f7', // Purple
    accentColor: '#ec4899',
    hairColor: '#f43f5e',
    jacketStyle: 'leather',
    accessory: 'headphones',
    speedBonus: 1.2,
  },
];

export const INITIAL_HOVERBOARDS: HoverboardItem[] = [
  {
    id: 'deck_classic',
    name: 'Street Carver',
    price: 0,
    unlocked: true,
    color: '#0284c7',
    glowColor: '#38bdf8',
    trailType: 'plasma',
    description: 'Reliable street cruiser board with magnetic levitation.',
  },
  {
    id: 'deck_plasma',
    name: 'Neon Blade',
    price: 2500,
    unlocked: false,
    color: '#a21caf',
    glowColor: '#f472b6',
    trailType: 'fire',
    description: 'High-frequency ion thrusters with dual pink exhaust jets.',
  },
  {
    id: 'deck_cyber',
    name: 'Matrix Deck',
    price: 6000,
    unlocked: false,
    color: '#059669',
    glowColor: '#34d399',
    trailType: 'matrix',
    description: 'Digital lattice deck that emits streaming code particle trails.',
  },
  {
    id: 'deck_falcon',
    name: 'Golden Falcon',
    price: 12000,
    unlocked: false,
    color: '#d97706',
    glowColor: '#fde047',
    trailType: 'gold',
    description: 'Aerospace-grade gilded carbon chassis with spark bursts.',
  },
];

const STORAGE_KEYS = {
  PROFILE: 'metro_dash_profile_v2',
  SETTINGS: 'metro_dash_settings_v2',
  CHARACTERS: 'metro_dash_characters_v2',
  HOVERBOARDS: 'metro_dash_hoverboards_v2',
  PENDING_SYNC: 'metro_dash_pending_sync_v2',
};

export class StorageService {
  public static getProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }

    const initialProfile: UserProfile = {
      id: 'runner_' + Math.random().toString(36).substring(2, 9),
      username: 'StreetRunner_' + Math.floor(1000 + Math.random() * 9000),
      coins: 1250, // Starting bonus
      highScore: 0,
      totalDistance: 0,
      totalRuns: 0,
      selectedCharacterId: 'axel',
      selectedHoverboardId: 'deck_classic',
      selectedTrail: 'plasma',
      unlockedCharacters: ['axel'],
      unlockedHoverboards: ['deck_classic'],
      hoverboardInventory: 3,
      lastSyncTime: new Date().toISOString(),
      syncCloudId: 'CLOUD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    };

    StorageService.saveProfile(initialProfile);
    return initialProfile;
  }

  public static saveProfile(profile: UserProfile): void {
    try {
      profile.lastSyncTime = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile locally', e);
    }
  }

  public static getSettings(): GameSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }

    const defaultSettings: GameSettings = {
      theme: 'midnight', // Dark mode by default
      sfxVolume: 0.8,
      musicVolume: 0.4,
      touchControls: true,
      showOnScreenButtons: false,
      graphicsQuality: 'high',
    };

    StorageService.saveSettings(defaultSettings);
    return defaultSettings;
  }

  public static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  public static getCharacters(): CharacterItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    return INITIAL_CHARACTERS;
  }

  public static saveCharacters(chars: CharacterItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(chars));
    } catch (e) {
      console.error('Failed to save characters', e);
    }
  }

  public static getHoverboards(): HoverboardItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HOVERBOARDS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    return INITIAL_HOVERBOARDS;
  }

  public static saveHoverboards(boards: HoverboardItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HOVERBOARDS, JSON.stringify(boards));
    } catch (e) {
      console.error('Failed to save hoverboards', e);
    }
  }

  /**
   * Export Save Profile as base64 sync token
   */
  public static exportSaveCode(): string {
    const profile = StorageService.getProfile();
    const characters = StorageService.getCharacters();
    const hoverboards = StorageService.getHoverboards();
    const exportBundle = {
      profile,
      characters,
      hoverboards,
      exportedAt: new Date().toISOString(),
      version: '2.0',
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(exportBundle))));
  }

  /**
   * Import Save Profile from base64 sync token
   */
  public static importSaveCode(code: string): { success: boolean; message: string } {
    try {
      const jsonStr = decodeURIComponent(escape(atob(code.trim())));
      const bundle = JSON.parse(jsonStr);
      if (bundle && bundle.profile && bundle.profile.id) {
        StorageService.saveProfile(bundle.profile);
        if (bundle.characters) StorageService.saveCharacters(bundle.characters);
        if (bundle.hoverboards) StorageService.saveHoverboards(bundle.hoverboards);
        return { success: true, message: 'Cloud save restored successfully!' };
      }
      return { success: false, message: 'Invalid sync code format.' };
    } catch (e) {
      return { success: false, message: 'Failed to decode sync code. Please verify.' };
    }
  }

  /**
   * Simulate cloud sync across devices with cloud ID
   */
  public static async simulateCloudSync(cloudId: string): Promise<{ success: boolean; lastSync: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const profile = StorageService.getProfile();
        profile.syncCloudId = cloudId.toUpperCase();
        profile.lastSyncTime = new Date().toISOString();
        StorageService.saveProfile(profile);
        resolve({ success: true, lastSync: profile.lastSyncTime });
      }, 700);
    });
  }
}
