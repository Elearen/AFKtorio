import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipeCatalog } from '../src/recipeCatalog.js';
import { centrifugeCraftingSpeed, centrifugePowerKw, isAutomatedOnlyRecipe } from '../src/productionSystem.js';

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

test('every crafting-with-fluid recipe is automated only', () => {
  const fluidRecipes = recipeCatalog.filter((entry) => entry.category === 'crafting-with-fluid');

  assert.ok(fluidRecipes.length > 0);
  fluidRecipes.forEach((entry) => {
    assert.equal(isAutomatedOnlyRecipe(entry), true, `${entry.name} should be automated only`);
  });
});

test('centrifuging recipes use automated centrifuges with the expected machine profile', () => {
  const centrifugingRecipes = recipeCatalog.filter((entry) => entry.category === 'centrifuging');

  assert.ok(centrifugingRecipes.length > 0);
  centrifugingRecipes.forEach((entry) => {
    assert.equal(isAutomatedOnlyRecipe(entry), true, `${entry.name} should be automated only`);
  });
  assert.equal(centrifugeCraftingSpeed, 1);
  assert.equal(centrifugePowerKw, 350);
});

test('assembler recipes remain handcraftable', () => {
  ['iron-gear-wheel', 'electronic-circuit', 'satellite'].forEach((name) => {
    assert.equal(isAutomatedOnlyRecipe(recipe(name)), false, `${name} should remain handcraftable`);
  });
});