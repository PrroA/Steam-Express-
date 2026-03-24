export type JourneyEventType =
  | 'view_game'
  | 'add_wishlist'
  | 'add_cart'
  | 'checkout_created'
  | 'payment_success';

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  title: string;
  subtitle?: string;
  createdAt: string;
}

const STORAGE_KEY = 'journeyTimelineEvents';
const MAX_EVENTS = 30;

function isBrowser() {
  return typeof window !== 'undefined';
}

function readEvents(): JourneyEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeEvents(events: JourneyEvent[]) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent('journey-events-updated', { detail: { events } }));
}

export function getJourneyEvents(limit = 12): JourneyEvent[] {
  return readEvents().slice(0, limit);
}

export function clearJourneyEvents() {
  writeEvents([]);
}

export function trackJourneyEvent(event: Omit<JourneyEvent, 'id' | 'createdAt'>) {
  const next: JourneyEvent = {
    ...event,
    id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const merged = [next, ...readEvents()].slice(0, MAX_EVENTS);
  writeEvents(merged);
}
