import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipeCatalog, recipeScienceChainFor } from '../src/recipeCatalog.js';
import { technologyCatalog } from '../src/technologyCatalog.js';

test('Space Science Pack uses the requested ingredients, produces 1000 packs, and is part of the core chain', () => {
  const spaceScience = recipeCatalog.find((recipe) => recipe.name === 'space-science-pack');

  assert.ok(spaceScience);
  assert.equal(spaceScience.energyRequired, 300);
  assert.equal(spaceScience.category, 'rocket-building');
  assert.deepEqual(spaceScience.ingredients, [
    { type: 'item', name: 'processing-unit', amount: 100 },
    { type: 'item', name: 'low-density-structure', amount: 100 },
    { type: 'item', name: 'rocket-fuel', amount: 100 },
    { type: 'item', name: 'satellite', amount: 1 },
  ]);
  assert.deepEqual(spaceScience.results, [{ type: 'item', name: 'space-science-pack', amount: 1000 }]);

  const coreRecipes = new Set(recipeCatalog.filter((recipe) => recipe.scienceChain === 'Core').map((recipe) => recipe.name));
  [
    'space-science-pack',
    'satellite',
    'rocket-fuel',
    'solid-fuel-from-light-oil',
    'solid-fuel-from-petroleum-gas',
    'solid-fuel-from-heavy-oil',
  ].forEach((recipeName) => assert.equal(coreRecipes.has(recipeName), true, `${recipeName} should be Core`));

  ['solar-panel', 'accumulator', 'radar'].forEach((recipeName) => {
    const recipe = recipeCatalog.find((entry) => entry.name === recipeName);
    assert.ok(recipe);
    assert.equal(recipe.scienceChain, 'Non-Core', `${recipeName} should start Non-Core`);
    assert.equal(recipeScienceChainFor(recipe, false), 'Non-Core', `${recipeName} should stay Non-Core before Space Science`);
    assert.equal(recipeScienceChainFor(recipe, true), 'Core', `${recipeName} should become Core after Space Science`);
  });
});

test('Space Science technology lists both Space Science and Satellite recipe unlocks', () => {
  const spaceScienceTechnology = technologyCatalog.find((technology) => technology.name === 'space-science-pack');

  assert.ok(spaceScienceTechnology);
  assert.equal(spaceScienceTechnology.effects.some((effect) => effect.type === 'unlock-recipe' && effect.recipe === 'space-science-pack'), true);
  assert.equal(spaceScienceTechnology.effects.some((effect) => effect.type === 'unlock-recipe' && effect.recipe === 'satellite'), true);
});

test('Coal Liquefaction is classified as Non-Core', () => {
  const coalLiquefaction = recipeCatalog.find((recipe) => recipe.name === 'coal-liquefaction');

  assert.ok(coalLiquefaction);
  assert.equal(coalLiquefaction.scienceChain, 'Non-Core');
  assert.equal(recipeScienceChainFor(coalLiquefaction, false), 'Non-Core');
  assert.equal(recipeScienceChainFor(coalLiquefaction, true), 'Non-Core');
});