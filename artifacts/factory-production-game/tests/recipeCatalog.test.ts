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
    { type: 'item', name: 'processing-unit', amount: 1000 },
    { type: 'item', name: 'low-density-structure', amount: 1000 },
    { type: 'item', name: 'rocket-fuel', amount: 1000 },
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

test('Concrete is classified as a Core recipe', () => {
  const concrete = recipeCatalog.find((recipe) => recipe.name === 'concrete');

  assert.ok(concrete);
  assert.equal(concrete.scienceChain, 'Core');
  assert.equal(recipeScienceChainFor(concrete, false), 'Core');
  assert.equal(recipeScienceChainFor(concrete, true), 'Core');
});

test('Speed Module 1 is classified as a Core recipe', () => {
  const speedModule = recipeCatalog.find((recipe) => recipe.name === 'speed-module');

  assert.ok(speedModule);
  assert.equal(speedModule.scienceChain, 'Core');
  assert.equal(recipeScienceChainFor(speedModule, false), 'Core');
  assert.equal(recipeScienceChainFor(speedModule, true), 'Core');
});

test('uranium processing and Kovarex use the centrifuge recipe chain', () => {
  const centrifuge = recipeCatalog.find((recipe) => recipe.name === 'centrifuge');
  const uraniumProcessing = recipeCatalog.find((recipe) => recipe.name === 'uranium-processing');
  const kovarex = recipeCatalog.find((recipe) => recipe.name === 'kovarex-enrichment-process');

  assert.ok(centrifuge);
  assert.ok(uraniumProcessing);
  assert.ok(kovarex);
  assert.equal(centrifuge.energyRequired, 4);
  assert.deepEqual(centrifuge.ingredients, [
    { type: 'item', name: 'concrete', amount: 100 },
    { type: 'item', name: 'steel-plate', amount: 50 },
    { type: 'item', name: 'advanced-circuit', amount: 100 },
    { type: 'item', name: 'iron-gear-wheel', amount: 100 },
  ]);
  assert.equal(uraniumProcessing.category, 'centrifuging');
  assert.deepEqual(kovarex.ingredients, [
    { type: 'item', name: 'uranium-235', amount: 1 },
    { type: 'item', name: 'uranium-238', amount: 3 },
  ]);
  assert.deepEqual(kovarex.results, [{ type: 'item', name: 'uranium-235', amount: 2 }]);
});