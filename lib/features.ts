export type PulseMood = 'love' | 'good' | 'meh';

export const PULSE_EMOJI: Record<PulseMood, string> = {
  love: '😍',
  good: '🙂',
  meh: '😐',
};

export interface HappyHourConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  days: number[];
  multiplier: number;
  label?: string;
}

export const DEFAULT_HAPPY_HOUR: HappyHourConfig = {
  enabled: false,
  startHour: 17,
  endHour: 19,
  days: [1, 2, 3, 4, 5],
  multiplier: 2,
  label: 'Happy Hour',
};

const PASSPORT_CATEGORIES = ['Cafe', 'Restaurant', 'Bar', 'Pizzeria', 'Other'] as const;

export function isHappyHourActive(config: HappyHourConfig, now = new Date()): boolean {
  if (!config.enabled) return false;
  const day = now.getDay();
  const hour = now.getHours();
  if (!config.days.includes(day)) return false;
  if (config.startHour <= config.endHour) {
    return hour >= config.startHour && hour < config.endHour;
  }
  return hour >= config.startHour || hour < config.endHour;
}

export function estimateRewardEtaDays(
  totalScans: number,
  scansRequired: number,
  lastScanDates: Date[]
): number | null {
  const remaining = scansRequired - (totalScans % scansRequired || 0);
  if (remaining <= 0) return 0;
  if (lastScanDates.length < 2) return remaining * 4;

  const sorted = [...lastScanDates].sort((a, b) => b.getTime() - a.getTime());
  let totalGap = 0;
  for (let i = 0; i < Math.min(sorted.length - 1, 5); i++) {
    totalGap += sorted[i].getTime() - sorted[i + 1].getTime();
  }
  const avgDays = totalGap / Math.min(sorted.length - 1, 5) / (1000 * 60 * 60 * 24);
  const pace = Math.max(avgDays, 1);
  return Math.ceil(remaining * pace);
}

export function getPassportProgress(categoriesVisited: string[]) {
  return PASSPORT_CATEGORIES.map((cat) => ({
    category: cat,
    visited: categoriesVisited.includes(cat),
    icon: cat === 'Cafe' ? '☕' : cat === 'Restaurant' ? '🍽️' : cat === 'Bar' ? '🍸' : cat === 'Pizzeria' ? '🍕' : '🏪',
  }));
}

export function checkPassportUnlock(categoriesVisited: string[]): string | null {
  const unique = new Set(categoriesVisited);
  if (unique.size >= PASSPORT_CATEGORIES.length) return 'City Explorer';
  if (unique.size >= 3) return 'Local Regular';
  if (unique.has('Cafe') && unique.has('Restaurant')) return 'Foodie';
  return null;
}

export function getSurpriseBonus(): { label: string; bonusScans: number } | null {
  const roll = Math.random();
  if (roll < 0.08) return { label: 'Jackpot! +2 bonus scans', bonusScans: 2 };
  if (roll < 0.2) return { label: 'Lucky find! +1 bonus scan', bonusScans: 1 };
  return null;
}
