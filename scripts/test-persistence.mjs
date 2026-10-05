import test from 'node:test';
import assert from 'node:assert/strict';
import { readState, writeState, recordOrder, saveCatalogSnapshotToDatabase } from '../lib/postgres.mjs';
import { createPayPalOrder, createStripeCheckoutSession } from '../lib/payment-api.mjs';

test('missing database fails closed instead of claiming a successful save', async () => {
  const old = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    await assert.rejects(readState('cart', 'test'), /PostgreSQL/);
    await assert.rejects(writeState('cart', 'test', {}), /PostgreSQL/);
    await assert.rejects(recordOrder({}), /PostgreSQL/);
    await assert.rejects(saveCatalogSnapshotToDatabase([]), /PostgreSQL/);
    await assert.rejects(createPayPalOrder([]), /PostgreSQL/);
    await assert.rejects(createStripeCheckoutSession([]), /PostgreSQL/);
  } finally {
    if (old !== undefined) process.env.DATABASE_URL = old;
  }
});
