import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preferredRecipeOrder, prioritizeDisplayOrder } from '../src/displayOrder.js';

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
  ]);
  assert.deepEqual(recipes.slice(preferredRecipeOrder.length), [
    'iron-plate',
    'coal-liquefaction',
    'military-science-pack',
    'logistic-science-pack',
  ]);
});
