import { test } from 'node:test';
import assert from 'node:assert/strict';
import { technologyCatalog } from '../src/technologyCatalog.js';

test('Oil Processing unlocks after constructing one pumpjack', () => {
  const oilProcessing = technologyCatalog.find((technology) => technology.name === 'oil-processing');

  assert.ok(oilProcessing);
  assert.deepEqual(oilProcessing.researchTrigger, {
    type: 'construct-item',
    item: 'pumpjack',
    count: 1,
  });
});