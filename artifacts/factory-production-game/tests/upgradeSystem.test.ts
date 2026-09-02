import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyUpgradeCompletion,
  bufferedActualRateFor,
  beginUpgrade,
  migrateMachineUpgradeState,
  upgradeMap,
  type UpgradeStartState,
} from '../src/upgradeSystem.js';
import {
  assemblyMachineOneCraftingSpeed,
  craftingSpeedFor,
  cyclesPerMinuteFor,
  stoneFurnaceCraftingSpeed,
} from '../src/productionSystem.js';

const baseState = (overrides: Partial<UpgradeStartState> = {}): UpgradeStartState => ({
  raw: { coal: 40, stone: 20 },
  products: { circuit: 20, gear: 20, steel: 10, ironPlate: 30 },
  research: [],
  machineVariants: { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' },
  machineCounts: { assembly: 0, mining: 0 },
  queue: [],
  ...overrides,
});
const failureReason = (result: ReturnType<typeof beginUpgrade>) => {
  if (result.ok) throw new Error('expected upgrade start to fail');
  return result.reason;
};

test('upgrade catalog keeps the requested machine costs, timing, and stats', () => {
  const production = upgradeMap['assembly-machine-2'];
  assert.deepEqual(production.upgradeCostPerMachine, [
    { key: 'circuit', amount: 3, source: 'products' },
    { key: 'gear', amount: 5, source: 'products' },
    { key: 'steel', amount: 2, source: 'products' },
  ]);
  assert.equal(production.upgradeTimePerMachine, 0.5);
  assert.deepEqual(production.newMachineMaterialCost, [
    { key: 'circuit', amount: 6, source: 'products' },
    { key: 'gear', amount: 10, source: 'products' },
    { key: 'ironPlate', amount: 9, source: 'products' },
    { key: 'steel', amount: 2, source: 'products' },
  ]);
  assert.equal(production.newMachinePowerDraw, 150);
  assert.equal(production.newMachineProductionSpeed, 0.75);

  const mining = upgradeMap['electric-mining-drill'];
  assert.deepEqual(mining.upgradeCostPerMachine, [
    { key: 'circuit', amount: 3, source: 'products' },
    { key: 'gear', amount: 2, source: 'products' },
    { key: 'ironPlate', amount: 7, source: 'products' },
  ]);
  assert.equal(mining.upgradeTimePerMachine, 2);
  assert.deepEqual(mining.newMachineMaterialCost, [
    { key: 'circuit', amount: 3, source: 'products' },
    { key: 'gear', amount: 5, source: 'products' },
    { key: 'ironPlate', amount: 10, source: 'products' },
  ]);
  assert.equal(mining.newMachinePowerDraw, 90);
  assert.equal(mining.newMachineProductionSpeed, 0.5);
});

test('production upgrade reserves the full cost and total time for every existing machine', () => {
  const result = beginUpgrade(baseState({
    research: ['automation-2'],
    machineCounts: { assembly: 2, mining: 0 },
  }), 'assembly-machine-2', 'upgrade-production');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.state.products, { circuit: 14, gear: 10, steel: 6, ironPlate: 30 });
  assert.equal(result.job.machineCount, 2);
  assert.equal(result.job.total, 1);
  assert.equal(result.state.queue.length, 1);
  assert.equal(result.state.queue[0].targetId, 'assembly-machine-2');
  assert.equal(result.state.machineVariants.assembly, 'assembling-machine-1');
});

test('electric mining upgrade reserves its full cost and scales time by miner count', () => {
  const result = beginUpgrade(baseState({
    research: ['electric-mining-drill'],
    machineCounts: { assembly: 0, mining: 3 },
  }), 'electric-mining-drill', 'upgrade-mining');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.state.products, { circuit: 11, gear: 14, steel: 10, ironPlate: 9 });
  assert.equal(result.job.machineCount, 3);
  assert.equal(result.job.total, 6);
});

test('upgrade start rejects missing prerequisites, machines, materials, and competing jobs', () => {
  assert.equal(failureReason(beginUpgrade(baseState({ machineCounts: { assembly: 1, mining: 0 } }), 'assembly-machine-2', 'a')), 'prerequisite');
  assert.equal(failureReason(beginUpgrade(baseState({ research: ['automation-2'] }), 'assembly-machine-2', 'b')), 'no-machines');
  assert.equal(failureReason(beginUpgrade(baseState({
    research: ['automation-2'],
    machineCounts: { assembly: 2, mining: 0 },
    products: { circuit: 5, gear: 20, steel: 10, ironPlate: 30 },
  }), 'assembly-machine-2', 'c')), 'missing-materials');
  assert.equal(failureReason(beginUpgrade(baseState({
    research: ['automation-2'],
    machineCounts: { assembly: 1, mining: 0 },
    queue: [{ id: 'existing', action: 'upgrade', target: 'other', seconds: 1, total: 2 }],
  }), 'assembly-machine-2', 'd')), 'upgrade-busy');
});

test('completion switches all machines in the upgraded group and leaves other groups intact', () => {
  const initial = { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' };
  const afterProduction = applyUpgradeCompletion(initial, 'assembly-machine-2');
  assert.deepEqual(afterProduction, { assembly: 'assembling-machine-2', mining: 'burner-mining-drill' });
  assert.deepEqual(initial, { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' });

  const afterMining = applyUpgradeCompletion(afterProduction, 'electric-mining-drill');
  assert.deepEqual(afterMining, { assembly: 'assembling-machine-2', mining: 'electric-mining-drill' });
});

test('save migration keeps valid state, removes legacy upgrade jobs, and allows one valid job', () => {
  const migrated = migrateMachineUpgradeState({
    upgrades: { manualMining: 9, productionSpeed: 4 },
    machineVariants: { assembly: 'assembling-machine-2', mining: 'burner-mining-drill' },
    queue: [
      { id: 'build', action: 'miner', target: 'iron', seconds: 1, total: 2 },
      { id: 'legacy', action: 'upgrade', target: 'old level', targetId: 'productionSpeed', seconds: 10, total: 10 },
      { id: 'valid', action: 'upgrade', target: 'Upgrade Mining to Electric Mining', targetId: 'electric-mining-drill', seconds: 2, total: 2 },
      { id: 'duplicate', action: 'upgrade', target: 'Upgrade Production to Assembly Machine 2', targetId: 'assembly-machine-2', seconds: 1, total: 1 },
    ],
  });

  assert.deepEqual(migrated.machineVariants, { assembly: 'assembling-machine-2', mining: 'burner-mining-drill' });
  assert.deepEqual(migrated.queue.map((item) => item.id), ['build', 'valid']);
});

test('save migration preserves an in-progress Iron Chests job', () => {
  const migrated = migrateMachineUpgradeState({
    machineVariants: { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' },
    queue: [{ id: 'iron', action: 'upgrade', target: 'Upgrade storage to Iron Chests', targetId: 'iron-chests', machineCount: 5, seconds: 1, total: 2 }],
  });

  assert.equal(migrated.queue[0].targetId, 'iron-chests');
});

test('full storage reports zero mining output when there is no downstream demand', () => {
  assert.equal(bufferedActualRateFor(60, 180, 180, 0), 0);
  assert.equal(bufferedActualRateFor(60, 170, 180, 0), 60);
  assert.equal(bufferedActualRateFor(60, 180, 180, 12), 12);
  assert.equal(bufferedActualRateFor(60, 150, 180, 0), 60);
});

test('building crafting speeds use absolute machine speeds', () => {
  assert.equal(assemblyMachineOneCraftingSpeed, 0.5);
  assert.equal(stoneFurnaceCraftingSpeed, 1);
  assert.equal(craftingSpeedFor(false, assemblyMachineOneCraftingSpeed), 0.5);
  assert.equal(craftingSpeedFor(true, assemblyMachineOneCraftingSpeed), 1);
  assert.equal(cyclesPerMinuteFor(1, 1, 10, 0.5), 3);
  assert.equal(cyclesPerMinuteFor(1, 1, 10, 1), 6);
});