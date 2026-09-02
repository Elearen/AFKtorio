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

test('Advanced Oil Processing unlocks only the two cracking recipes', () => {
  const advancedOilProcessing = technologyCatalog.find((technology) => technology.name === 'advanced-oil-processing');

  assert.ok(advancedOilProcessing);
  assert.deepEqual(advancedOilProcessing.effects, [
    { type: 'unlock-recipe', recipe: 'heavy-oil-cracking' },
    { type: 'unlock-recipe', recipe: 'light-oil-cracking' },
  ]);
});

test('Uranium Processing unlocks after constructing the first uranium miner', () => {
  const uraniumProcessing = technologyCatalog.find((technology) => technology.name === 'uranium-processing');

  assert.ok(uraniumProcessing);
  assert.deepEqual(uraniumProcessing.researchTrigger, {
    type: 'construct-item',
    item: 'uranium-miner',
    count: 1,
  });
});