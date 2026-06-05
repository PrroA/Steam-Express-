/** @jest-environment node */

import fs from 'fs';
import os from 'os';
import path from 'path';

function clearBackendModules() {
  Object.keys(require.cache).forEach((key) => {
    if (
      key.includes(`${path.sep}backend${path.sep}paymentAudit`) ||
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

describe('payment audit SQLite persistence', () => {
  const originalSqlitePath = process.env.SQLITE_DB_PATH;
  let tempDir = '';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gogo-payment-audit-'));
    process.env.SQLITE_DB_PATH = path.join(tempDir, 'payment-audit.sqlite');
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

  test('stores payment audit events in SQLite', () => {
    const paymentAudit = require('../backend/paymentAudit') as typeof import('../backend/paymentAudit');
    require('../backend/persistence');

    paymentAudit.recordPaymentAuditEvent(
      paymentAudit.createPaymentAuditEvent({
        source: 'demo-quick-pay',
        providerPaymentId: 'TXN-test',
        orderId: 'order-1',
        userId: 7,
        status: 'succeeded',
        reason: 'demo-paid',
        createdAt: '2026-06-06T00:00:00.000Z',
      })
    );

    expect(paymentAudit.getPaymentAuditEventsForTests(5)).toEqual([
      expect.objectContaining({
        provider: 'demo',
        source: 'demo-quick-pay',
        providerPaymentId: 'TXN-test',
        orderId: 'order-1',
        userId: 7,
        status: 'succeeded',
      }),
    ]);
  });
});
