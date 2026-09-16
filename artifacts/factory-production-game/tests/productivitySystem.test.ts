import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  miningProductivityBonusFor,
  miningProductivityMultiplierFor,
  normalizeRecipeProductivity,
  productiveOutputAmountFor,
  recipeProductivityBonusFor,
  recipeProductivityMultiplierFor,
} from '../src/productivitySystem.js';

test('recipe productivity applies a separate bonus multiplier to outputs', () => {
  const productivity = { 'copper-plate': 0.05 };

  assert.equal(recipeProductivityBonusFor(productivity, 'copper-plate'), 0.05);
  assert.equal(recipeProductivityMultiplierFor(productivity, 'copper-plate'), 1.05);
  assert.equal(productiveOutputAmountFor(1, productivity, 'copper-plate'), 1.05);
  assert.equal(productiveOutputAmountFor(1, productivity, 'iron-plate'), 1);
});

test('recipe productivity defaults to zero and ignores invalid saved values', () => {
  const productivity = normalizeRecipeProductivity({
    'copper-plate': 0.05,
    'iron-plate': -0.1,
    unknown: 0.8,
    invalid: '5%',
  }, new Set(['copper-plate', 'iron-plate']));

  assert.deepEqual(productivity, { 'copper-plate': 0.05 });
  assert.equal(recipeProductivityBonusFor(undefined, 'copper-plate'), 0);
  assert.equal(productiveOutputAmountFor(1, productivity, 'iron-plate'), 1);
});

test('mining productivity research adds 10% per level except for water', () => {
  const research = ['mining-productivity-1', 'mining-productivity-2', 'unrelated-technology'];

  assert.equal(miningProductivityBonusFor(research), 0.2);
  assert.equal(miningProductivityMultiplierFor('copper', research), 1.2);
  assert.equal(miningProductivityMultiplierFor('water', research), 1);
});