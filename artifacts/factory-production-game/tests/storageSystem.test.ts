import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipeCatalog } from '../src/recipeCatalog.js';
import {
  canPurchaseStorageFor,
  completeStorageConstruction,
  createInitialStorageState,
  FLUID_HANDLING_TECHNOLOGY,
  FLUID_STORAGE_BASE_CAPACITY,
  migrateStorageState,
  STORAGE_BOX_CAPACITY,
  STORAGE_TANK_CAPACITY,
  storageCapacityFor,
} from '../src/storageSystem.js';

const fluidKeys = new Set(['water', 'crudeOil']);
const trackedKeys = ['water', 'crudeOil', 'iron'];

test('fluid storage starts at 100 units without a tank', () => {
  const initial = createInitialStorageState(trackedKeys, fluidKeys);

  assert.equal(initial.storage.water, FLUID_STORAGE_BASE_CAPACITY);
  assert.equal(initial.storageTanks.water, 0);
  assert.equal(initial.storageBoxes.water, 0);
  assert.equal(initial.storage.iron, STORAGE_BOX_CAPACITY);
  assert.equal(initial.storageBoxes.iron, 1);
});

test('completed storage tanks add 25,000 capacity only to their target fluid', () => {
  const initial = createInitialStorageState(trackedKeys, fluidKeys);
  const afterWaterTank = completeStorageConstruction(initial, 'water', fluidKeys);

  assert.equal(afterWaterTank.storageTanks.water, 1);
  assert.equal(afterWaterTank.storage.water, FLUID_STORAGE_BASE_CAPACITY + STORAGE_TANK_CAPACITY);
  assert.equal(afterWaterTank.storageTanks.crudeOil, 0);
  assert.equal(afterWaterTank.storage.crudeOil, FLUID_STORAGE_BASE_CAPACITY);
  assert.equal(afterWaterTank.storage.iron, STORAGE_BOX_CAPACITY);

  const afterSecondWaterTank = completeStorageConstruction(afterWaterTank, 'water', fluidKeys);
  assert.equal(afterSecondWaterTank.storage.water, FLUID_STORAGE_BASE_CAPACITY + STORAGE_TANK_CAPACITY * 2);
  assert.equal(storageCapacityFor('crudeOil', fluidKeys, afterSecondWaterTank.storageBoxes, afterSecondWaterTank.storageTanks), FLUID_STORAGE_BASE_CAPACITY);
});

test('Fluid Handling gates fluid storage purchases but not item boxes', () => {
  assert.equal(canPurchaseStorageFor('water', fluidKeys, []), false);
  assert.equal(canPurchaseStorageFor('crudeOil', fluidKeys, ['automation-2']), false);
  assert.equal(canPurchaseStorageFor('water', fluidKeys, [FLUID_HANDLING_TECHNOLOGY]), true);
  assert.equal(canPurchaseStorageFor('iron', fluidKeys, []), true);
});

test('legacy fluid box capacity is migrated to the 100-unit base and saved tanks are preserved', () => {
  const migrated = migrateStorageState({
    trackedKeys,
    fluidKeys,
    savedStorage: { water: 180, crudeOil: 50_100, iron: 540 },
    savedBoxes: { water: 4, iron: 3 },
    savedTanks: { crudeOil: 2 },
  });

  assert.deepEqual(migrated.storageTanks, { water: 0, crudeOil: 2, iron: 0 });
  assert.deepEqual(migrated.storageBoxes, { water: 0, crudeOil: 0, iron: 3 });
  assert.equal(migrated.storage.water, FLUID_STORAGE_BASE_CAPACITY);
  assert.equal(migrated.storage.crudeOil, FLUID_STORAGE_BASE_CAPACITY + STORAGE_TANK_CAPACITY * 2);
  assert.equal(migrated.storage.iron, STORAGE_BOX_CAPACITY * 3);
});

test('storage tank purchase timing and materials match the recipe catalog', () => {
  const storageTank = recipeCatalog.find((recipe) => recipe.name === 'storage-tank');
  assert.ok(storageTank);
  assert.equal(storageTank.energyRequired, 3);
  assert.deepEqual(storageTank.ingredients, [
    { type: 'item', name: 'iron-plate', amount: 20 },
    { type: 'item', name: 'steel-plate', amount: 5 },
  ]);
});