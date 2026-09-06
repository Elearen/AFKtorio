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
  SPACE_SCIENCE_STORAGE_CAPACITY,
  STORAGE_IRON_BOX_CAPACITY,
  STORAGE_IRON_BOX_COST,
  STORAGE_IRON_BOX_UPGRADE_TIME,
  STORAGE_STEEL_BOX_COST,
  STORAGE_STEEL_BOX_UPGRADE_TIME,
  STORAGE_TANK_CAPACITY,
  storageCapacityFor,
  ironChestUpgradeCostFor,
  ironChestUpgradeTimeFor,
  steelChestUpgradeCostFor,
  steelChestUpgradeTimeFor,
  itemStorageBoxCountFor,
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

test('Space Science starts with 1000 units of special item storage', () => {
  const initial = createInitialStorageState(['spacePack'], new Set());

  assert.equal(initial.storage.spacePack, SPACE_SCIENCE_STORAGE_CAPACITY);
  assert.equal(initial.storageBoxes.spacePack, 1);
  assert.equal(storageCapacityFor('spacePack', new Set(), initial.storageBoxes, initial.storageTanks), SPACE_SCIENCE_STORAGE_CAPACITY);
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

test('Iron Chests upgrade scales cost and time by item boxes only', () => {
  const boxes = { iron: 3, copper: 2, water: 9 };
  const tanks = { water: 4 };
  const woodenChestCount = 5;

  assert.equal(ironChestUpgradeCostFor(woodenChestCount), woodenChestCount * STORAGE_IRON_BOX_COST);
  assert.equal(ironChestUpgradeTimeFor(woodenChestCount), woodenChestCount * STORAGE_IRON_BOX_UPGRADE_TIME);
  assert.equal(storageCapacityFor('iron', fluidKeys, boxes, tanks, STORAGE_IRON_BOX_CAPACITY), 3 * STORAGE_IRON_BOX_CAPACITY);
  assert.equal(storageCapacityFor('water', fluidKeys, boxes, tanks, STORAGE_IRON_BOX_CAPACITY), FLUID_STORAGE_BASE_CAPACITY + 4 * STORAGE_TANK_CAPACITY);
});

test('Iron Chests count can be limited to unlocked item-storage keys', () => {
  const boxes = { iron: 3, copper: 2, steel: 7, water: 5 };

  assert.equal(itemStorageBoxCountFor(['iron', 'copper'], fluidKeys, boxes), 5);
  assert.equal(itemStorageBoxCountFor(['iron', 'copper', 'steel'], fluidKeys, boxes), 12);
});

test('Steel Chests upgrade scales steel cost and time by existing item chests', () => {
  const ironChestCount = 5;

  assert.equal(STORAGE_STEEL_BOX_COST, 8);
  assert.equal(STORAGE_STEEL_BOX_UPGRADE_TIME, 0.5);
  assert.equal(steelChestUpgradeCostFor(ironChestCount), 40);
  assert.equal(steelChestUpgradeTimeFor(ironChestCount), 2.5);
});