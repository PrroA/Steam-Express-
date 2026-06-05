import type { AiUsageEvent, AiUsageStorage } from '../backend/aiUsageLog';
import {
  configureAiUsageStorage,
  getAiUsageEvents,
  getAiUsageSummary,
  recordAiUsage,
  resetAiUsageLogForTests,
} from '../backend/aiUsageLog';

function createMemoryStorage(seed: AiUsageEvent[] = []) {
  const persisted = [...seed];
  const storage: AiUsageStorage & { persisted: AiUsageEvent[] } = {
    persisted,
    load: jest.fn(() => [...persisted]),
    save: jest.fn((events) => {
      persisted.splice(0, persisted.length, ...events);
    }),
    clear: jest.fn(() => {
      persisted.splice(0, persisted.length);
    }),
  };
  return storage;
}

describe('AI usage log persistence adapter', () => {
  afterEach(() => {
    resetAiUsageLogForTests();
    configureAiUsageStorage(null);
  });

  test('hydrates events from storage and keeps summary fields', () => {
    const storage = createMemoryStorage([
      {
        id: 'stored-1',
        createdAt: '2026-06-06T00:00:00.000Z',
        requestId: 'req-1',
        userId: 2,
        mode: 'service-rag',
        grounded: true,
        provider: 'openai',
        sourceCount: 2,
        statusCode: 200,
        durationMs: 120,
        messagePreview: '怎麼付款？',
      },
    ]);

    configureAiUsageStorage(storage);

    expect(getAiUsageEvents(5).map((event) => event.id)).toEqual(['stored-1']);
    expect(getAiUsageSummary()).toEqual(
      expect.objectContaining({
        total: 1,
        grounded: 1,
        fallback: 0,
        groundedRate: 1,
        fallbackRate: 0,
        averageDurationMs: 120,
      })
    );
  });

  test('saves new events through storage and trims old events', () => {
    const storage = createMemoryStorage();
    configureAiUsageStorage(storage);

    for (let i = 0; i < 85; i += 1) {
      recordAiUsage({
        requestId: `req-${i}`,
        mode: i % 2 === 0 ? 'service-rag' : 'service-rag-fallback',
        grounded: i % 2 === 0,
        sourceCount: i % 2 === 0 ? 1 : 0,
        statusCode: 200,
        durationMs: 10,
        message: `message ${i}`,
      });
    }

    expect(storage.save).toHaveBeenCalled();
    expect(storage.persisted).toHaveLength(80);
    expect(storage.persisted[0].messagePreview).toBe('message 84');
    expect(storage.persisted[79].messagePreview).toBe('message 5');
  });
});
