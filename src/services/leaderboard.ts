import { LeaderboardEntry, UserProfile } from '../types/game';

const LEADERBOARD_KEY = 'metro_dash_leaderboard_v2';

const BASE_LEADERBOARD: Omit<LeaderboardEntry, 'rank'>[] = [
  { userId: 'usr_jp_01', username: 'TokyoGhost', country: '🇯🇵 JP', score: 84290, distance: 14200, characterId: 'kage', tier: 'Master' },
  { userId: 'usr_us_02', username: 'NeonRider_NY', country: '🇺🇸 US', score: 76540, distance: 12890, characterId: 'axel', tier: 'Master' },
  { userId: 'usr_kr_03', username: 'SeoulDrift_KR', country: '🇰🇷 KR', score: 69120, distance: 11450, characterId: 'maya', tier: 'Diamond' },
  { userId: 'usr_gb_04', username: 'LondonUnderground', country: '🇬🇧 GB', score: 62400, distance: 10320, characterId: 'roxy', tier: 'Diamond' },
  { userId: 'usr_br_05', username: 'RioSpeedster', country: '🇧🇷 BR', score: 55800, distance: 9150, characterId: 'nova', tier: 'Diamond' },
  { userId: 'usr_de_06', username: 'BerlinBahn_99', country: '🇩🇪 DE', score: 48900, distance: 8200, characterId: 'axel', tier: 'Platinum' },
  { userId: 'usr_fr_07', username: 'ParisMetroAce', country: '🇫🇷 FR', score: 42150, distance: 7100, characterId: 'maya', tier: 'Platinum' },
  { userId: 'usr_ca_08', username: 'MapleRunner', country: '🇨🇦 CA', score: 36780, distance: 6240, characterId: 'kage', tier: 'Platinum' },
  { userId: 'usr_au_09', username: 'SydneySurfer', country: '🇦🇺 AU', score: 31200, distance: 5400, characterId: 'roxy', tier: 'Gold' },
  { userId: 'usr_in_10', username: 'MumbaiExpress', country: '🇮🇳 IN', score: 26500, distance: 4620, characterId: 'nova', tier: 'Gold' },
  { userId: 'usr_sg_11', username: 'MarinaSprint', country: '🇸🇬 SG', score: 21800, distance: 3800, characterId: 'axel', tier: 'Gold' },
  { userId: 'usr_mx_12', username: 'AztecaSpeed', country: '🇲🇽 MX', score: 17400, distance: 3100, characterId: 'maya', tier: 'Silver' },
  { userId: 'usr_es_13', username: 'MadridMetro', country: '🇪🇸 ES', score: 13900, distance: 2500, characterId: 'kage', tier: 'Silver' },
  { userId: 'usr_it_14', username: 'MilanoSwift', country: '🇮🇹 IT', score: 10500, distance: 1950, characterId: 'roxy', tier: 'Silver' },
  { userId: 'usr_nl_15', username: 'AmsterdamTrack', country: '🇳🇱 NL', score: 7800, distance: 1400, characterId: 'axel', tier: 'Bronze' },
];

export class LeaderboardService {
  public static getLeaderboard(profile?: UserProfile): LeaderboardEntry[] {
    let entries: Omit<LeaderboardEntry, 'rank'>[] = [...BASE_LEADERBOARD];

    try {
      const stored = localStorage.getItem(LEADERBOARD_KEY);
      if (stored) {
        entries = JSON.parse(stored);
      }
    } catch {
      // fallback
    }

    if (profile && profile.highScore > 0) {
      // Remove any existing user entry
      entries = entries.filter((e) => e.userId !== profile.id);

      let tier: LeaderboardEntry['tier'] = 'Bronze';
      if (profile.highScore >= 70000) tier = 'Master';
      else if (profile.highScore >= 50000) tier = 'Diamond';
      else if (profile.highScore >= 35000) tier = 'Platinum';
      else if (profile.highScore >= 20000) tier = 'Gold';
      else if (profile.highScore >= 10000) tier = 'Silver';

      entries.push({
        userId: profile.id,
        username: profile.username || 'You',
        country: '🌐 Global',
        score: profile.highScore,
        distance: profile.totalDistance,
        characterId: profile.selectedCharacterId,
        tier,
        isUser: true,
      });
    }

    // Sort descending by score
    entries.sort((a, b) => b.score - a.score);

    // Assign 1-indexed ranks
    const ranked: LeaderboardEntry[] = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return ranked;
  }

  public static updateScore(profile: UserProfile, newScore: number, distance: number): { rank: number; newRecord: boolean } {
    let newRecord = false;
    if (newScore > profile.highScore) {
      profile.highScore = newScore;
      newRecord = true;
    }
    profile.totalDistance += distance;
    profile.totalRuns += 1;

    const board = LeaderboardService.getLeaderboard(profile);
    const userEntry = board.find((e) => e.isUser);

    // Persist leaderboard
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.map(({ rank: _, ...rest }) => rest)));
    } catch {
      // ignore
    }

    return {
      rank: userEntry ? userEntry.rank : board.length,
      newRecord,
    };
  }

  /**
   * Find rivals within reach of current score during running (for live HUD alerts)
   */
  public static getNextRival(currentScore: number, board: LeaderboardEntry[]): LeaderboardEntry | null {
    // Find the closest player whose score is strictly higher than current score
    const higherPlayers = board
      .filter((e) => !e.isUser && e.score > currentScore)
      .sort((a, b) => a.score - b.score);

    return higherPlayers.length > 0 ? higherPlayers[0] : null;
  }
}
