export type AiUsageEvent = {
  id: string;
  createdAt: string;
  requestId: string;
  userId: number | null;
  mode: string;
  grounded: boolean;
  provider: string | null;
  sourceCount: number;
  statusCode: number;
  durationMs: number;
  messagePreview: string;
};

export type AiUsageSummary = {
  total: number;
  grounded: number;
  fallback: number;
  groundedRate: number;
  fallbackRate: number;
  averageDurationMs: number;
  byMode: Record<string, number>;
  byProvider: Record<string, number>;
};

const MAX_EVENTS = 80;
const events: AiUsageEvent[] = [];

export interface AiUsageStorage {
  load(limit: number): AiUsageEvent[];
  save(events: AiUsageEvent[]): void;
  clear?(): void;
}

let storage: AiUsageStorage | null = null;
let storageHydrated = false;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeMessagePreview(message: string) {
  return message.replace(/\s+/g, ' ').trim().slice(0, 80);
}

function normalizeEvent(value: unknown): AiUsageEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<AiUsageEvent>;
  if (!event.id || !event.createdAt) return null;

  return {
    id: String(event.id),
    createdAt: String(event.createdAt),
    requestId: String(event.requestId || 'unknown'),
    userId: typeof event.userId === 'number' ? event.userId : null,
    mode: String(event.mode || 'unknown'),
    grounded: Boolean(event.grounded),
    provider: event.provider ? String(event.provider) : null,
    sourceCount: Math.max(0, Number(event.sourceCount || 0)),
    statusCode: Number(event.statusCode || 200),
    durationMs: Math.max(0, Number(event.durationMs || 0)),
    messagePreview: sanitizeMessagePreview(String(event.messagePreview || '')),
  };
}

function trimEvents() {
  if (events.length > MAX_EVENTS) {
    events.splice(MAX_EVENTS);
  }
}

function persistEvents() {
  if (!storage || !storageHydrated) return;
  storage.save(events);
}

export function configureAiUsageStorage(nextStorage: AiUsageStorage | null) {
  storage = nextStorage;
  storageHydrated = false;
  events.splice(0, events.length);

  if (!storage) return;

  const loaded = storage.load(MAX_EVENTS).map(normalizeEvent).filter(Boolean) as AiUsageEvent[];
  events.splice(0, events.length, ...loaded);
  trimEvents();
  storageHydrated = true;
}

export function recordAiUsage(input: {
  requestId?: string;
  userId?: number | null;
  mode?: string;
  grounded?: boolean;
  provider?: string | null;
  sourceCount?: number;
  statusCode: number;
  durationMs: number;
  message: string;
}) {
  const event: AiUsageEvent = {
    id: createId(),
    createdAt: new Date().toISOString(),
    requestId: input.requestId || 'unknown',
    userId: input.userId ?? null,
    mode: input.mode || 'unknown',
    grounded: Boolean(input.grounded),
    provider: input.provider || null,
    sourceCount: Math.max(0, Number(input.sourceCount || 0)),
    statusCode: input.statusCode,
    durationMs: Math.max(0, Number(input.durationMs || 0)),
    messagePreview: sanitizeMessagePreview(input.message),
  };

  events.unshift(event);
  trimEvents();
  persistEvents();

  return event;
}

export function getAiUsageEvents(limit = 30) {
  return events.slice(0, Math.max(1, Math.min(limit, MAX_EVENTS)));
}

export function getAiUsageSummary(): AiUsageSummary {
  const summary = events.reduce<AiUsageSummary & { totalDurationMs: number }>(
    (summary, event) => {
      summary.total += 1;
      if (event.grounded) summary.grounded += 1;
      if (/fallback|unavailable|auth-required|out-of-scope/i.test(event.mode)) summary.fallback += 1;
      summary.totalDurationMs += event.durationMs;
      summary.byMode[event.mode] = (summary.byMode[event.mode] || 0) + 1;
      const provider = event.provider || 'fallback';
      summary.byProvider[provider] = (summary.byProvider[provider] || 0) + 1;
      return summary;
    },
    {
      total: 0,
      grounded: 0,
      fallback: 0,
      groundedRate: 0,
      fallbackRate: 0,
      averageDurationMs: 0,
      totalDurationMs: 0,
      byMode: {},
      byProvider: {},
    }
  );

  const total = Math.max(0, summary.total);
  const totalDurationMs = summary.totalDurationMs;
  return {
    total,
    grounded: summary.grounded,
    fallback: summary.fallback,
    groundedRate: total > 0 ? summary.grounded / total : 0,
    fallbackRate: total > 0 ? summary.fallback / total : 0,
    averageDurationMs: total > 0 ? Math.round(totalDurationMs / total) : 0,
    byMode: summary.byMode,
    byProvider: summary.byProvider,
  };
}

export function resetAiUsageLogForTests() {
  if (process.env.NODE_ENV === 'test') {
    events.splice(0, events.length);
    storage?.clear?.();
  }
}
