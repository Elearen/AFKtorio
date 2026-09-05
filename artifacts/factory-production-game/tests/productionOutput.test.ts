import { test } from 'node:test';
import assert from 'node:assert/strict';
import { primaryOutputFor } from '../src/productionOutput.js';

test('Advanced Oil Processing production stats use Heavy Oil as the primary output', () => {
  const primaryOutput = primaryOutputFor('advanced-oil-processing', [
    { key: 'petroleum-gas', amount: 55 },
    { key: 'light-oil', amount: 45 },
    { key: 'heavy-oil', amount: 25 },
  ]);

  assert.deepEqual(primaryOutput, { key: 'heavy-oil', amount: 25 });
});

test('other production cards keep their first recipe output', () => {
  assert.deepEqual(primaryOutputFor('basic-oil-processing', [
    { key: 'petroleum-gas', amount: 45 },
    { key: 'heavy-oil', amount: 25 },
  ]), { key: 'petroleum-gas', amount: 45 });
});