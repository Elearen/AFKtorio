import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preferredRecipeOrder, preferredStorageOrder, prioritizeDisplayOrder } from '../src/displayOrder.js';

test('production recipes keep the requested oil and chemistry sequence together', () => {
  const recipes = prioritizeDisplayOrder([
    'iron-plate',
    'plastic-bar',
    'coal-liquefaction',
    'sulfuric-acid',
    'basic-oil-processing',
    'sulfur',
    'lubricant',
    'advanced-oil-processing',
    'light-oil-cracking',
    'heavy-oil-cracking',
    'military-science-pack',
    'logistic-science-pack',
  ], (recipe) => recipe, preferredRecipeOrder);

  assert.deepEqual(recipes.slice(0, preferredRecipeOrder.length), [
    'basic-oil-processing',
    'advanced-oil-processing',
    'heavy-oil-cracking',
    'light-oil-cracking',
    'lubricant',
    'sulfur',
    'sulfuric-acid',
    'plastic-bar',
    'logistic-science-pack',
    'military-science-pack',
  ]);
  assert.deepEqual(recipes.slice(preferredRecipeOrder.length), ['iron-plate', 'coal-liquefaction']);
});

test('storage items keep the requested fluid and chemistry sequence together', () => {
  const items = prioritizeDisplayOrder([
    'iron',
    'plastic-bar',
    'heavy-oil',
    'sulfuric-acid',
    'petroleum-gas',
    'sulfur',
    'light-oil',
    'lubricant',
    'military-science-pack',
    'logistic-science-pack',
  ], (item) => item, preferredStorageOrder);

  assert.deepEqual(items.slice(0, preferredStorageOrder.length), [
    'petroleum-gas',
    'light-oil',
    'heavy-oil',
    'lubricant',
    'sulfur',
    'sulfuric-acid',
    'plastic-bar',
    'logistic-science-pack',
    'military-science-pack',
  ]);
  assert.deepEqual(items.slice(preferredStorageOrder.length), ['iron']);
});