import { WeeklyChallenge, GameRunStats } from '../types/game';

const CHALLENGES_STORAGE_KEY = 'metro_dash_weekly_challenges_v2';
const CHALLENGES_WEEK_KEY = 'metro_dash_challenge_week_v2';

// Get ISO week number
function getWeekIdentifier(): string {
  const d = new Date();
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
  return `${year}-W${weekNumber}`;
}

export class ChallengesService {
  public static getChallenges(): WeeklyChallenge[] {
    const currentWeek = getWeekIdentifier();
    const storedWeek = localStorage.getItem(CHALLENGES_WEEK_KEY);

    if (storedWeek === currentWeek) {
      try {
        const stored = localStorage.getItem(CHALLENGES_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // regenerate
      }
    }

    // Generate fresh weekly challenges
    const initialChallenges: WeeklyChallenge[] = [
      {
        id: 'challenge_score_rush',
        title: 'Metropolis High Flyer',
        description: 'Accumulate a single run score of at least 15,000 points in one session.',
        targetType: 'score',
        targetValue: 15000,
        currentValue: 0,
        rewardCoins: 2500,
        claimed: false,
        expiresInDays: 4,
        iconName: 'trophy',
      },
      {
        id: 'challenge_distance_marathon',
        title: 'Infinite Rail Marathon',
        description: 'Run an aggregate distance of 6,000 meters across all your runs this week.',
        targetType: 'distance',
        targetValue: 6000,
        currentValue: 0,
        rewardCoins: 3500,
        claimed: false,
        expiresInDays: 4,
        iconName: 'map-pin',
      },
      {
        id: 'challenge_train_dodge',
        title: 'Ghost On The Tracks',
        description: 'Dodge 20 high-speed subway trains by jumping or switching lanes at the last moment.',
        targetType: 'train_dodge',
        targetValue: 20,
        currentValue: 0,
        rewardCoins: 3000,
        claimed: false,
        expiresInDays: 4,
        iconName: 'zap',
      },
      {
        id: 'challenge_roof_runner',
        title: 'Skyline Roof Surfer',
        description: 'Leap and sprint across 15 train roofs without touching the lower tracks.',
        targetType: 'roof_runs',
        targetValue: 15,
        currentValue: 0,
        rewardCoins: 4000,
        claimed: false,
        expiresInDays: 4,
        iconName: 'wind',
      },
      {
        id: 'challenge_coin_vacuum',
        title: 'Golden Vault Rush',
        description: 'Collect 800 gold coins across your runs during the challenge period.',
        targetType: 'coins',
        targetValue: 800,
        currentValue: 0,
        rewardCoins: 2000,
        claimed: false,
        expiresInDays: 4,
        iconName: 'coins',
      },
    ];

    ChallengesService.saveChallenges(initialChallenges);
    localStorage.setItem(CHALLENGES_WEEK_KEY, currentWeek);
    return initialChallenges;
  }

  public static saveChallenges(challenges: WeeklyChallenge[]): void {
    try {
      localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(challenges));
    } catch (e) {
      console.error('Failed to save challenges', e);
    }
  }

  public static recordRunProgress(stats: GameRunStats): { updated: WeeklyChallenge[]; completedNow: WeeklyChallenge[] } {
    const challenges = ChallengesService.getChallenges();
    const completedNow: WeeklyChallenge[] = [];

    const updated = challenges.map((ch) => {
      if (ch.claimed) return ch;

      let newValue = ch.currentValue;
      if (ch.targetType === 'score') {
        newValue = Math.max(newValue, stats.score);
      } else if (ch.targetType === 'distance') {
        newValue = newValue + stats.distanceMeters;
      } else if (ch.targetType === 'coins') {
        newValue = newValue + stats.coinsCollected;
      } else if (ch.targetType === 'train_dodge') {
        newValue = newValue + stats.trainsDodged;
      } else if (ch.targetType === 'roof_runs') {
        newValue = newValue + stats.roofRuns;
      }

      const justFinished = ch.currentValue < ch.targetValue && newValue >= ch.targetValue;
      if (justFinished) {
        completedNow.push({ ...ch, currentValue: newValue });
      }

      return {
        ...ch,
        currentValue: Math.min(ch.targetValue, newValue),
      };
    });

    ChallengesService.saveChallenges(updated);
    return { updated, completedNow };
  }

  public static claimReward(challengeId: string): number {
    const challenges = ChallengesService.getChallenges();
    let reward = 0;

    const updated = challenges.map((ch) => {
      if (ch.id === challengeId && !ch.claimed && ch.currentValue >= ch.targetValue) {
        reward = ch.rewardCoins;
        return { ...ch, claimed: true };
      }
      return ch;
    });

    ChallengesService.saveChallenges(updated);
    return reward;
  }
}
