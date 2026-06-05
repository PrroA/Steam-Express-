/** @jest-environment node */

import fs from 'fs';
import os from 'os';
import path from 'path';

function clearBackendModules() {
  Object.keys(require.cache).forEach((key) => {
    if (
      key.includes(`${path.sep}backend${path.sep}aiUsageLog`) ||
      key.includes(`${path.sep}backend${path.sep}persistence`)
    ) {
      delete require.cache[key];
    }
  });
}

function closePersistenceModule() {
  const persistenceModuleId = require.resolve('../backend/persistence');
  const persistenceModule = require.cache[persistenceModuleId]?.exports as
    | { closePersistenceForTests?: () => void }
    | undefined;
  persistenceModule?.closePersistenceForTests?.();
}

describe('AI usage SQLite persistence', () => {
  const originalSqlitePath = process.env.SQLITE_DB_PATH;
  let tempDir = '';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gogo-ai-usage-'));
    process.env.SQLITE_DB_PATH = path.join(tempDir, 'usage.sqlite');
    clearBackendModules();
  });

  afterEach(() => {
    closePersistenceModule();
    clearBackendModules();
    if (originalSqlitePath === undefined) {
      delete process.env.SQLITE_DB_PATH;
    } else {
      process.env.SQLITE_DB_PATH = originalSqlitePath;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('hydrates AI usage events after persistence module is reloaded', () => {
    const firstLoad = require('../backend/aiUsageLog') as typeof import('../backend/aiUsageLog');
    require('../backend/persistence');

    firstLoad.recordAiUsage({
      requestId: 'persisted-request',
      userId: 7,
      mode: 'service-rag',
      grounded: true,
      provider: 'openai',
      sourceCount: 2,
      statusCode: 200,
      durationMs: 42,
      message: '怎麼付款？',
    });

    expect(firstLoad.getAiUsageSummary().total).toBe(1);

    clearBackendModules();

    const secondLoad = require('../backend/aiUsageLog') as typeof import('../backend/aiUsageLog');
    require('../backend/persistence');

    expect(secondLoad.getAiUsageEvents(5)).toEqual([
      expect.objectContaining({
        requestId: 'persisted-request',
        userId: 7,
        mode: 'service-rag',
        grounded: true,
        sourceCount: 2,
        messagePreview: '怎麼付款？',
      }),
    ]);
    expect(secondLoad.getAiUsageSummary()).toEqual(
      expect.objectContaining({
        total: 1,
        grounded: 1,
        fallback: 0,
        averageDurationMs: 42,
      })
    );
  });
});
