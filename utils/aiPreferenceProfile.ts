import type { Game } from '../types/domain';
import { getJourneyEvents } from './journeyTracker';

export type ClientPreferenceProfile = {
  recentlyViewedIds: number[];
  recentlyViewedNames: string[];
  topKeywords: string[];
  averagePrice: number;
};

type RecentlyViewedEntry = {
  id?: number;
  viewedAt?: string;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function parsePrice(priceText?: string) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !['game', 'games', 'standard', 'edition'].includes(word));
}

function readRecentlyViewedIds() {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem('recentlyViewedGames');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: RecentlyViewedEntry) => Number(item?.id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function buildClientPreferenceProfile(currentGame?: Game | null): ClientPreferenceProfile {
  const recentlyViewedIds = readRecentlyViewedIds();
  const journeyEvents = getJourneyEvents(20);
  const recentlyViewedNames = journeyEvents
    .map((event) => event.subtitle || event.title)
    .filter(Boolean)
    .slice(0, 8);

  const keywordCounts = new Map<string, number>();
  for (const text of recentlyViewedNames) {
    for (const token of tokenize(text)) {
      keywordCounts.set(token, (keywordCounts.get(token) || 0) + 1);
    }
  }
  if (currentGame) {
    for (const token of tokenize(`${currentGame.name} ${currentGame.description || ''}`)) {
      keywordCounts.set(token, (keywordCounts.get(token) || 0) + 1);
    }
  }

  const prices = currentGame ? [parsePrice(currentGame.price)].filter((price) => price > 0) : [];

  return {
    recentlyViewedIds,
    recentlyViewedNames,
    topKeywords: Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([keyword]) => keyword)
      .slice(0, 8),
    averagePrice: prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0,
  };
}
