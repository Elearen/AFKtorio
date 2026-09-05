import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipeCatalog } from '../src/recipeCatalog.js';
import { isAutomatedOnlyRecipe } from '../src/productionSystem.js';

const recipe = (name: string) => {
  const entry = recipeCatalog.find((candidate) => candidate.name === name);
  assert.ok(entry, `expected ${name} recipe`);
  return entry;
};

test('furnace recipes are automated only', () => {
  assert.equal(isAutomatedOnlyRecipe(recipe('iron-plate')), true);
  assert.equal(isAutomatedOnlyRecipe(recipe('copper-plate')), true);
  assert.equal(isAutomatedOnlyRecipe(recipe('steel-plate')), true);
  assert.equal(isAutomatedOnlyRecipe(recipe('stone-brick')), true);
});

test('refinery, chemical plant, and rocket silo recipes are automated only', () => {
  ['basic-oil-processing', 'advanced-oil-processing', 'plastic-bar', 'sulfuric-acid', 'space-science-pack']
    .forEach((name) => assert.equal(isAutomatedOnlyRecipe(recipe(name)), true, `${name} should be automated only`));
});

test('assembler recipes remain handcraftable', () => {
  ['iron-gear-wheel', 'electronic-circuit', 'satellite'].forEach((name) => {
    assert.equal(isAutomatedOnlyRecipe(recipe(name)), false, `${name} should remain handcraftable`);
  });
});