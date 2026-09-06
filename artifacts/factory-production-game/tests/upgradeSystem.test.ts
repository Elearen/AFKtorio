import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyUpgradeCompletion,
  applyLabSpeedUpgradeCompletion,
  applyOilProcessingUpgradeCompletion,
  bufferedActualRateFor,
  beginUpgrade,
  migrateMachineUpgradeState,
  oilCrackingConditionMet,
  oilProcessingUpgradeTimeFor,
  labSpeedForLevel,
  upgradeMap,
  type UpgradeStartState,
} from '../src/upgradeSystem.js';
import {
  assemblyMachineOneCraftingSpeed,
  chemicalPlantCraftingSpeed,
  chemicalPlantPowerKw,
  chemicalPlantRecipeNames,
  craftingSpeedFor,
  cycleBudgetFor,
  cyclesPerMinuteFor,
  oilRefineryCraftingSpeed,
  oilRefineryPowerKw,
  stoneFurnaceCraftingSpeed,
  steelFurnaceCraftingSpeed,
} from '../src/productionSystem.js';
import { recipeCatalog } from '../src/recipeCatalog.js';

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

  const productionThree = upgradeMap['assembly-machine-3'];
  assert.deepEqual(productionThree.upgradeCostPerMachine, [
    { key: 'speed-module', amount: 4, source: 'products' },
  ]);
  assert.equal(productionThree.upgradeTimePerMachine, 0.5);
  assert.deepEqual(productionThree.newMachineMaterialCost, [
    { key: 'circuit', amount: 3, source: 'products' },
    { key: 'gear', amount: 5, source: 'products' },
    { key: 'steel', amount: 2, source: 'products' },
    { key: 'speed-module', amount: 4, source: 'products' },
  ]);
  assert.equal(productionThree.newMachinePowerDraw, 375);
  assert.equal(productionThree.newMachineProductionSpeed, 1.25);
  assert.equal(productionThree.prerequisiteTechnology, 'automation-3');
  assert.equal(productionThree.prerequisiteUpgrade, 'assembly-machine-2');

  const expectedLabSpeeds = [1.2, 1.5, 1.9, 2.4, 2.9, 3.5];
  expectedLabSpeeds.forEach((speed, index) => {
    const level = index + 1;
    const upgrade = upgradeMap[`research-speed-${level}` as keyof typeof upgradeMap];
    assert.equal(upgrade.name, `Research Speed Upgrade ${level}`);
    assert.equal(upgrade.prerequisiteTechnology, `research-speed-${level}`);
    assert.equal(upgrade.prerequisiteUpgrade, level === 1 ? undefined : `research-speed-${level - 1}`);
    assert.deepEqual(upgrade.upgradeCostPerMachine, []);
    assert.equal(upgrade.upgradeTimePerMachine, 1);
    assert.equal(upgrade.labSpeedLevel, level);
    assert.equal(upgrade.newMachineProductionSpeed, speed);
  });
  assert.equal(labSpeedForLevel(0), 1);
  assert.equal(labSpeedForLevel(6), 3.5);

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
  assert.deepEqual(result.job.costs, [
    { key: 'circuit', amount: 6, source: 'products' },
    { key: 'gear', amount: 10, source: 'products' },
    { key: 'steel', amount: 4, source: 'products' },
  ]);
  assert.deepEqual(result.job.reserved, [6, 10, 4]);
  assert.equal(result.state.queue.length, 1);
  assert.equal(result.state.queue[0].targetId, 'assembly-machine-2');
  assert.equal(result.state.machineVariants.assembly, 'assembling-machine-1');
});

test('Assembly Machine 3 upgrade reserves four speed modules per Assembly Machine 2', () => {
  const result = beginUpgrade(baseState({
    research: ['automation-3'],
    machineVariants: { assembly: 'assembling-machine-2', mining: 'burner-mining-drill' },
    machineCounts: { assembly: 3, mining: 0 },
    products: { circuit: 20, gear: 20, steel: 10, ironPlate: 30, 'speed-module': 20 },
  }), 'assembly-machine-3', 'upgrade-production-3');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.state.products, { circuit: 20, gear: 20, steel: 10, ironPlate: 30, 'speed-module': 8 });
  assert.equal(result.job.machineCount, 3);
  assert.equal(result.job.total, 1.5);
  assert.deepEqual(result.job.costs, [
    { key: 'speed-module', amount: 12, source: 'products' },
  ]);
  assert.deepEqual(result.job.reserved, [12]);
  assert.equal(result.state.machineVariants.assembly, 'assembling-machine-2');
});

test('Research Speed upgrades are free and take one second per constructed lab', () => {
  const result = beginUpgrade(baseState({
    research: ['research-speed-1'],
    labCount: 4,
  }), 'research-speed-1', 'upgrade-research-speed-1');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.job.machineCount, 4);
  assert.equal(result.job.total, 4);
  assert.deepEqual(result.job.costs, []);
  assert.deepEqual(result.job.reserved, []);
  assert.equal(result.state.labSpeedLevel, undefined);
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
  assert.equal(failureReason(beginUpgrade(baseState({
    research: ['automation-3'],
    machineCounts: { assembly: 1, mining: 0 },
    products: { circuit: 20, gear: 20, steel: 10, ironPlate: 30, 'speed-module': 4 },
  }), 'assembly-machine-3', 'e')), 'prerequisite-upgrade');
  assert.equal(failureReason(beginUpgrade(baseState({
    research: ['research-speed-2'],
    labCount: 1,
  }), 'research-speed-2', 'f')), 'prerequisite-upgrade');
});

test('completion switches all machines in the upgraded group and leaves other groups intact', () => {
  const initial = { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' };
  const afterProduction = applyUpgradeCompletion(initial, 'assembly-machine-2');
  assert.deepEqual(afterProduction, { assembly: 'assembling-machine-2', mining: 'burner-mining-drill' });
  assert.deepEqual(initial, { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' });

  const afterAssemblyThree = applyUpgradeCompletion(afterProduction, 'assembly-machine-3');
  assert.deepEqual(afterAssemblyThree, { assembly: 'assembling-machine-3', mining: 'burner-mining-drill' });

  const afterMining = applyUpgradeCompletion(afterAssemblyThree, 'electric-mining-drill');
  assert.deepEqual(afterMining, { assembly: 'assembling-machine-3', mining: 'electric-mining-drill' });

  assert.equal(applyLabSpeedUpgradeCompletion(0, 'research-speed-1'), 1);
  assert.equal(applyLabSpeedUpgradeCompletion(1, 'research-speed-2'), 2);
  assert.equal(applyLabSpeedUpgradeCompletion(6, 'research-speed-1'), 6);
});

test('oil processing conversion is free-time and moves basic machines to advanced', () => {
  assert.equal(oilProcessingUpgradeTimeFor(4), 4);
  assert.equal(oilProcessingUpgradeTimeFor(0), 0);
  assert.deepEqual(applyOilProcessingUpgradeCompletion({
    'basic-oil-processing': 4,
    'advanced-oil-processing': 0,
    'sulfuric-acid': 2,
  }, 4), {
    'basic-oil-processing': 0,
    'advanced-oil-processing': 4,
    'sulfuric-acid': 2,
  });
});

test('oil cracking auto-start conditions require a strict storage lead', () => {
  assert.equal(oilCrackingConditionMet('heavy-oil-cracking', { 'heavy-oil': 41, 'light-oil': 40 }), true);
  assert.equal(oilCrackingConditionMet('heavy-oil-cracking', { 'heavy-oil': 40, 'light-oil': 40 }), false);
  assert.equal(oilCrackingConditionMet('light-oil-cracking', { 'light-oil': 21, 'petroleum-gas': 20 }), true);
  assert.equal(oilCrackingConditionMet('light-oil-cracking', { 'light-oil': 20, 'petroleum-gas': 21 }), false);
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

test('save migration preserves an in-progress Steel Furnaces job', () => {
  const migrated = migrateMachineUpgradeState({
    machineVariants: { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' },
    queue: [{ id: 'steel', action: 'upgrade', target: 'Upgrade all furnaces to Steel Furnaces', targetId: 'steel-furnaces', machineCount: 4, seconds: 6, total: 12 }],
  });

  assert.equal(migrated.queue[0].targetId, 'steel-furnaces');
});

test('save migration preserves Assembly Machine 3 state and jobs', () => {
  const migrated = migrateMachineUpgradeState({
    machineVariants: { assembly: 'assembling-machine-3', mining: 'burner-mining-drill' },
    queue: [{ id: 'assembly-3', action: 'upgrade', target: 'Upgrade production to Assembly Machine 3', targetId: 'assembly-machine-3', machineCount: 5, seconds: 1, total: 2.5 }],
  });

  assert.deepEqual(migrated.machineVariants, { assembly: 'assembling-machine-3', mining: 'burner-mining-drill' });
  assert.equal(migrated.queue[0].targetId, 'assembly-machine-3');
});

test('save migration preserves completed Research Speed level and queued lab upgrade', () => {
  const migrated = migrateMachineUpgradeState({
    labSpeedLevel: 3,
    machineVariants: { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' },
    queue: [{ id: 'research-speed-4', action: 'upgrade', target: 'Research Speed Upgrade 4', targetId: 'research-speed-4', machineCount: 5, seconds: 2, total: 5 }],
  });

  assert.equal(migrated.labSpeedLevel, 3);
  assert.equal(migrated.queue[0].targetId, 'research-speed-4');
});

test('full storage reports zero mining output when there is no downstream demand', () => {
  assert.equal(bufferedActualRateFor(60, 180, 180, 0), 0);
  assert.equal(bufferedActualRateFor(60, 170, 180, 0), 60);
  assert.equal(bufferedActualRateFor(60, 180, 180, 12), 12);
  assert.equal(bufferedActualRateFor(60, 150, 180, 0), 60);
});

test('storage throttling resets after the output buffer is drained', () => {
  assert.equal(bufferedActualRateFor(15000, 0, 180, 4800), 15000);
});

test('building crafting speeds use absolute machine speeds', () => {
  assert.equal(assemblyMachineOneCraftingSpeed, 0.5);
  assert.equal(oilRefineryCraftingSpeed, 1);
  assert.equal(oilRefineryPowerKw, 420);
  assert.equal(chemicalPlantCraftingSpeed, 1);
  assert.equal(chemicalPlantPowerKw, 210);
  assert.equal(stoneFurnaceCraftingSpeed, 1);
  assert.equal(steelFurnaceCraftingSpeed, 2);
  assert.equal(craftingSpeedFor(false, assemblyMachineOneCraftingSpeed), 0.5);
  assert.equal(craftingSpeedFor(true, assemblyMachineOneCraftingSpeed), 1);
  assert.equal(craftingSpeedFor(true, assemblyMachineOneCraftingSpeed, steelFurnaceCraftingSpeed), 2);
  assert.equal(cyclesPerMinuteFor(1, 1, 10, 0.5), 3);
  assert.equal(cyclesPerMinuteFor(1, 1, 10, 1), 6);
  assert.equal(cyclesPerMinuteFor(800, 1, 3.2, 1), 15000);
  assert.equal(cycleBudgetFor(15000, 1), 251);
});

test('oil production uses the recipe database construction definition', () => {
  const oilRefinery = recipeCatalog.find((recipe) => recipe.name === 'oil-refinery');

  assert.ok(oilRefinery);
  assert.equal(oilRefinery.energyRequired, 8);
  assert.deepEqual(oilRefinery.ingredients, [
    { type: 'item', name: 'steel-plate', amount: 15 },
    { type: 'item', name: 'iron-gear-wheel', amount: 10 },
    { type: 'item', name: 'stone-brick', amount: 10 },
    { type: 'item', name: 'electronic-circuit', amount: 10 },
    { type: 'item', name: 'pipe', amount: 10 },
  ]);
});

test('requested chemical recipes use Chemical Plants', () => {
  assert.deepEqual([...chemicalPlantRecipeNames], [
    'light-oil-cracking',
    'plastic-bar',
    'heavy-oil-cracking',
    'sulfur',
    'sulfuric-acid',
    'lubricant',
    'solid-fuel',
    'rocket-fuel',
    'battery',
    'explosives',
  ]);

  const chemicalPlant = recipeCatalog.find((recipe) => recipe.name === 'chemical-plant');
  assert.ok(chemicalPlant);
  assert.equal(chemicalPlant.energyRequired, 5);
  assert.deepEqual(chemicalPlant.ingredients, [
    { type: 'item', name: 'steel-plate', amount: 5 },
    { type: 'item', name: 'iron-gear-wheel', amount: 5 },
    { type: 'item', name: 'electronic-circuit', amount: 5 },
    { type: 'item', name: 'pipe', amount: 5 },
  ]);
});