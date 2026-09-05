import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prioritizeDisplayOrder } from '../src/displayOrder.js';

test('production recipes follow the storage product order', () => {
  const recipes = prioritizeDisplayOrder([
    { name: 'petroleum', products: ['petroleum-gas'] },
    { name: 'mixed-oils', products: ['petroleum-gas', 'heavy-oil'] },
    { name: 'heavy', products: ['heavy-oil'] },
    { name: 'light', products: ['light-oil'] },
  ], (recipe) => recipe.products, ['heavy-oil', 'light-oil', 'petroleum-gas']);

  assert.deepEqual(recipes.map((recipe) => recipe.name), ['heavy', 'light', 'mixed-oils', 'petroleum']);
});
