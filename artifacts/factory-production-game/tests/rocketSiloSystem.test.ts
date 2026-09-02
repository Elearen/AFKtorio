import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipeCatalog } from '../src/recipeCatalog.js';
import {
  canBuildRocketSilo,
  recipeBuildCostsForRocket,
  rocketPartBatchTimeFor,
  rocketPartCountAfterConstruction,
  ROCKET_PART_TARGET,
  scaleRocketCosts,
  unlockSpaceScienceAfterLaunch,
} from '../src/rocketSiloSystem.js';

const recipe = (name: string) => {
  const entry = recipeCatalog.find((candidate) => candidate.name === name);
  assert.ok(entry, `expected ${name} recipe`);
  return entry;
};

test('Rocket Silo construction uses the catalog cost and timing, and only one can be queued', () => {
  const silo = recipe('rocket-silo');
  assert.equal(silo.energyRequired, 30);
  assert.deepEqual(recipeBuildCostsForRocket(silo), [
    { key: 'steel', amount: 1000, source: 'products' },
    { key: 'concrete', amount: 1000, source: 'products' },
    { key: 'pipe', amount: 100, source: 'products' },
    { key: 'processing-unit', amount: 200, source: 'products' },
    { key: 'electric-engine-unit', amount: 200, source: 'products' },
  ]);
  assert.equal(canBuildRocketSilo(false, false), true);
  assert.equal(canBuildRocketSilo(false, true), false);
  assert.equal(canBuildRocketSilo(true, false), false);
});

test('rocket part batch uses the recipe cost and time for exactly 100 parts', () => {
  const rocketPart = recipe('rocket-part');
  const perPart = recipeBuildCostsForRocket(rocketPart);
  assert.equal(ROCKET_PART_TARGET, 100);
  assert.equal(rocketPartBatchTimeFor(rocketPart), 300);
  assert.deepEqual(scaleRocketCosts(perPart, ROCKET_PART_TARGET), [
    { key: 'processing-unit', amount: 1000, source: 'products' },
    { key: 'low-density-structure', amount: 1000, source: 'products' },
    { key: 'rocket-fuel', amount: 1000, source: 'products' },
  ]);
  assert.equal(rocketPartCountAfterConstruction(0, 100), 100);
  assert.equal(rocketPartCountAfterConstruction(70, 100), 100);
});

test('launch completion unlocks Space Science exactly once', () => {
  assert.deepEqual(unlockSpaceScienceAfterLaunch(['rocket-silo']), ['rocket-silo', 'space-science-pack']);
  assert.deepEqual(unlockSpaceScienceAfterLaunch(['rocket-silo', 'space-science-pack']), ['rocket-silo', 'space-science-pack']);
});