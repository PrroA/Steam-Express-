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
  byMode: Record<string, number>;
  byProvider: Record<string, number>;
};

const MAX_EVENTS = 80;
const events: AiUsageEvent[] = [];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeMessagePreview(message: string) {
  return message.replace(/\s+/g, ' ').trim().slice(0, 80);
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
  if (events.length > MAX_EVENTS) {
    events.splice(MAX_EVENTS);
  }

  return event;
}

export function getAiUsageEvents(limit = 30) {
  return events.slice(0, Math.max(1, Math.min(limit, MAX_EVENTS)));
}

export function getAiUsageSummary(): AiUsageSummary {
  return events.reduce<AiUsageSummary>(
    (summary, event) => {
      summary.total += 1;
      if (event.grounded) summary.grounded += 1;
      if (/fallback|unavailable|auth-required|out-of-scope/i.test(event.mode)) summary.fallback += 1;
      summary.byMode[event.mode] = (summary.byMode[event.mode] || 0) + 1;
      const provider = event.provider || 'fallback';
      summary.byProvider[provider] = (summary.byProvider[provider] || 0) + 1;
      return summary;
    },
    { total: 0, grounded: 0, fallback: 0, byMode: {}, byProvider: {} }
  );
}

export function resetAiUsageLogForTests() {
  if (process.env.NODE_ENV === 'test') {
    events.splice(0, events.length);
  }
}
