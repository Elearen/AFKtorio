export type MachineGroup = 'assembly' | 'mining';
export type UpgradeKey = 'assembly-machine-2' | 'electric-mining-drill';
export const OIL_PROCESSING_UPGRADE_ID = 'advanced-oil-processing';
export const oilProcessingUpgradeTimeFor = (machineCount: number) => Math.max(0, machineCount);
export const oilCrackingConditionMet = (recipeId: string, inventory: Record<string, number>) => recipeId === 'heavy-oil-cracking'
  ? (inventory['heavy-oil'] ?? 0) > (inventory['light-oil'] ?? 0)
  : recipeId === 'light-oil-cracking'
    ? (inventory['light-oil'] ?? 0) > (inventory['petroleum-gas'] ?? 0)
    : true;
export type BuildMaterialCost = { key: string; amount: number; source: 'raw' | 'products' };
export type MachineVariants = Record<MachineGroup, string>;
export type UpgradeDefinition = {
  id: UpgradeKey;
  name: string;
  copy: string;
  prerequisiteTechnology: string;
  relevantMachine: string;
  machineGroup: MachineGroup;
  upgradeCostPerMachine: BuildMaterialCost[];
  upgradeTimePerMachine: number;
  newMachine: string;
  newMachineLabel: string;
  newMachineMaterialCost: BuildMaterialCost[];
  newMachinePowerDraw: number;
  newMachineProductionSpeed: number;
};

export type UpgradeQueueRecord = {
  id: string;
  action: string;
  target: string;
  targetId?: string;
  seconds: number;
  total: number;
  machineCount?: number;
};

export type UpgradeStartState = {
  raw: Record<string, number>;
  products: Record<string, number>;
  research: string[];
  machineVariants: MachineVariants;
  machineCounts: Record<MachineGroup, number>;
  queue: UpgradeQueueRecord[];
};

export type UpgradeStartResult =
  | { ok: false; reason: 'already-installed' | 'upgrade-busy' | 'prerequisite' | 'no-machines' | 'missing-materials'; message: string }
  | { ok: true; state: UpgradeStartState; upgrade: UpgradeDefinition; totalCosts: BuildMaterialCost[]; job: UpgradeQueueRecord };

const products = (costs: Array<[string, number]>): BuildMaterialCost[] => costs.map(([key, amount]) => ({ key, amount, source: 'products' }));

export const upgradeData: UpgradeDefinition[] = [
  {
    id: 'assembly-machine-2',
    name: 'Upgrade Production to Assembly Machine 2',
    copy: 'Replace every Assembly Machine 1 with a faster, higher-power Assembly Machine 2.',
    prerequisiteTechnology: 'automation-2',
    relevantMachine: 'Assembly Machine',
    machineGroup: 'assembly',
    upgradeCostPerMachine: products([['circuit', 3], ['gear', 5], ['steel', 2]]),
    upgradeTimePerMachine: 0.5,
    newMachine: 'assembling-machine-2',
    newMachineLabel: 'Assembly Machine 2',
    newMachineMaterialCost: products([['circuit', 6], ['gear', 10], ['ironPlate', 9], ['steel', 2]]),
    newMachinePowerDraw: 150,
    newMachineProductionSpeed: 0.75,
  },
  {
    id: 'electric-mining-drill',
    name: 'Upgrade Mining to Electric Mining',
    copy: 'Replace every burner mining drill with an Electric Miner and remove the coal requirement.',
    prerequisiteTechnology: 'electric-mining-drill',
    relevantMachine: 'Burner Mining Drill',
    machineGroup: 'mining',
    upgradeCostPerMachine: products([['circuit', 3], ['gear', 2], ['ironPlate', 7]]),
    upgradeTimePerMachine: 2,
    newMachine: 'electric-mining-drill',
    newMachineLabel: 'Electric Miner',
    newMachineMaterialCost: products([['circuit', 3], ['gear', 5], ['ironPlate', 10]]),
    newMachinePowerDraw: 90,
    newMachineProductionSpeed: 0.5,
  },
];

export const upgradeMap: Record<UpgradeKey, UpgradeDefinition> = Object.fromEntries(
  upgradeData.map((upgrade) => [upgrade.id, upgrade]),
) as Record<UpgradeKey, UpgradeDefinition>;

export const scaledBuildCosts = (costs: BuildMaterialCost[], multiplier: number) =>
  costs.map((cost) => ({ ...cost, amount: cost.amount * multiplier }));

export const bufferedActualRateFor = (peakRate: number, stored: number, capacity: number, demandRate: number) => {
  if (peakRate <= 0) return 0;
  const constrained = capacity > 0 && stored >= capacity * 0.95;
  if (!constrained) return peakRate;
  if (demandRate > 0) return Math.min(peakRate, demandRate);
  return stored >= capacity ? 0 : peakRate;
};

export const machineCountForUpgrade = (
  machineCounts: Record<MachineGroup, number>,
  upgrade: UpgradeDefinition,
) => machineCounts[upgrade.machineGroup] ?? 0;

const missingMaterials = (state: UpgradeStartState, costs: BuildMaterialCost[]) => costs
  .map(({ key, amount, source }) => ({ key, amount, available: state[source][key] ?? 0 }))
  .filter(({ amount, available }) => available < amount);

export const beginUpgrade = (state: UpgradeStartState, upgradeId: UpgradeKey, jobId: string): UpgradeStartResult => {
  const upgrade = upgradeMap[upgradeId];
  if (state.machineVariants[upgrade.machineGroup] === upgrade.newMachine) {
    return { ok: false, reason: 'already-installed', message: `${upgrade.newMachineLabel} is already installed` };
  }
  if (state.queue.some((item) => item.action === 'upgrade')) {
    return { ok: false, reason: 'upgrade-busy', message: 'finish the active upgrade before starting another' };
  }
  if (!state.research.includes(upgrade.prerequisiteTechnology)) {
    return { ok: false, reason: 'prerequisite', message: `${upgrade.prerequisiteTechnology} required` };
  }
  const machineCount = machineCountForUpgrade(state.machineCounts, upgrade);
  if (!machineCount) {
    return { ok: false, reason: 'no-machines', message: `construct at least one ${upgrade.relevantMachine.toLowerCase()} first` };
  }
  const totalCosts = scaledBuildCosts(upgrade.upgradeCostPerMachine, machineCount);
  const missing = missingMaterials(state, totalCosts);
  if (missing.length) {
    return {
      ok: false,
      reason: 'missing-materials',
      message: `missing ${missing.map(({ key, amount, available }) => `${amount - available} ${key}`).join(' + ')}`,
    };
  }
  const nextRaw = { ...state.raw };
  const nextProducts = { ...state.products };
  totalCosts.forEach(({ key, amount, source }) => {
    if (source === 'raw') nextRaw[key] = (nextRaw[key] ?? 0) - amount;
    else nextProducts[key] = (nextProducts[key] ?? 0) - amount;
  });
  const totalSeconds = upgrade.upgradeTimePerMachine * machineCount;
  const job: UpgradeQueueRecord = {
    id: jobId,
    action: 'upgrade',
    target: upgrade.name,
    targetId: upgrade.id,
    machineCount,
    seconds: totalSeconds,
    total: totalSeconds,
  };
  return {
    ok: true,
    upgrade,
    totalCosts,
    job,
    state: { ...state, raw: nextRaw, products: nextProducts, queue: [...state.queue, job] },
  };
};

export const applyUpgradeCompletion = (machineVariants: MachineVariants, upgradeId: string): MachineVariants => {
  const upgrade = upgradeMap[upgradeId as UpgradeKey];
  if (!upgrade) return { ...machineVariants };
  return { ...machineVariants, [upgrade.machineGroup]: upgrade.newMachine };
};

export const applyOilProcessingUpgradeCompletion = (assemblers: Record<string, number>, machineCount: number) => ({
  ...assemblers,
  'advanced-oil-processing': Math.max(0, machineCount),
  'basic-oil-processing': 0,
});

export const migrateMachineUpgradeState = (saved: unknown): { machineVariants: MachineVariants; queue: UpgradeQueueRecord[] } => {
  const record = saved && typeof saved === 'object' ? saved as { machineVariants?: unknown; queue?: unknown } : {};
  const savedVariants = record.machineVariants && typeof record.machineVariants === 'object'
    ? record.machineVariants as Partial<MachineVariants>
    : {};
  const machineVariants: MachineVariants = {
    assembly: savedVariants.assembly === 'assembling-machine-2' ? 'assembling-machine-2' : 'assembling-machine-1',
    mining: savedVariants.mining === 'electric-mining-drill' ? 'electric-mining-drill' : 'burner-mining-drill',
  };
  const persistedQueue = Array.isArray(record.queue) ? record.queue : [];
  let upgradeSeen = false;
  const validUpgradeIds = new Set<string>([...Object.keys(upgradeMap), 'iron-chests', 'steel-furnaces', OIL_PROCESSING_UPGRADE_ID]);
  const queue = persistedQueue.filter((item): item is UpgradeQueueRecord => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as UpgradeQueueRecord;
    if (candidate.action !== 'upgrade') return true;
    if (upgradeSeen || !candidate.targetId || !validUpgradeIds.has(candidate.targetId)) return false;
    upgradeSeen = true;
    return true;
  });
  return { machineVariants, queue };
};