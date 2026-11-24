import test from 'node:test';
import assert from 'node:assert/strict';
import { getPayverseConfig, createPayverseRequest } from '../lib/payverse.mjs';

test('missing merchant credentials keep checkout disabled and reject order creation', async () => {
  const names = ['PAYVERSE_ENV', 'PAYVERSE_MID', 'PAYVERSE_CLIENT_KEY', 'PAYVERSE_SECRET_KEY'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    process.env.PAYVERSE_ENV = 'sandbox';
    for (const name of names.slice(1)) delete process.env[name];
    const config = getPayverseConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.environment, 'sandbox');
    assert.equal(config.sdk, 'https://ui-snd.payverseglobal.com/js/payments.js');
    assert.equal(config.currency, 'USD');
    assert.equal('secretKey' in config, false);
    await assert.rejects(createPayverseRequest([]), /Payverse is not configured/);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
