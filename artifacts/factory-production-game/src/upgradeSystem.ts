export type MachineGroup = 'assembly' | 'mining';
export type UpgradeKey =
  | 'assembly-machine-2'
  | 'assembly-machine-3'
  | 'electric-mining-drill'
  | 'research-speed-1'
  | 'research-speed-2'
  | 'research-speed-3'
  | 'research-speed-4'
  | 'research-speed-5'
  | 'research-speed-6';
export const OIL_PROCESSING_UPGRADE_ID = 'advanced-oil-processing';
export const STEEL_FURNACE_PREREQUISITE_TECHNOLOGY = 'advanced-material-processing';
export const ELECTRIC_FURNACE_UPGRADE_ID = 'electric-furnaces';
export const ELECTRIC_FURNACE_PREREQUISITE_TECHNOLOGY = 'advanced-material-processing-2';
export const electricFurnaceUpgradeCostPerFurnace: BuildMaterialCost[] = [
  { key: 'advanced-circuit', amount: 5, source: 'products' },
  { key: 'steel', amount: 4, source: 'products' },
];
export const electricFurnaceUpgradeTimePerFurnace = 5;
export const steelFurnacePrerequisiteMet = (research: string[]) => research.includes(STEEL_FURNACE_PREREQUISITE_TECHNOLOGY);
export const electricFurnacePrerequisiteMet = (research: string[], furnaceVariant: string) =>
  research.includes(ELECTRIC_FURNACE_PREREQUISITE_TECHNOLOGY) && furnaceVariant === 'steel-furnace';
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
  prerequisiteUpgrade?: UpgradeKey;
  labSpeedLevel?: number;
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
  costs?: BuildMaterialCost[];
  reserved?: number[];
};

export type UpgradeStartState = {
  raw: Record<string, number>;
  products: Record<string, number>;
  research: string[];
  machineVariants: MachineVariants;
  machineCounts: Record<MachineGroup, number>;
  labCount?: number;
  labSpeedLevel?: number;
  queue: UpgradeQueueRecord[];
};

export type UpgradeStartResult =
  | { ok: false; reason: 'already-installed' | 'upgrade-busy' | 'prerequisite' | 'prerequisite-upgrade' | 'no-machines' | 'missing-materials'; message: string }
  | { ok: true; state: UpgradeStartState; upgrade: UpgradeDefinition; totalCosts: BuildMaterialCost[]; job: UpgradeQueueRecord };

const products = (costs: Array<[string, number]>): BuildMaterialCost[] => costs.map(([key, amount]) => ({ key, amount, source: 'products' }));
export const labSpeeds = [1, 1.2, 1.5, 1.9, 2.4, 2.9, 3.5] as const;
export const labSpeedForLevel = (level: number) => labSpeeds[Math.min(labSpeeds.length - 1, Math.max(0, Math.floor(level)))] ?? labSpeeds[0];

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
    id: 'assembly-machine-3',
    name: 'Upgrade production to Assembly Machine 3',
    copy: 'Replace every Assembly Machine 2 with a faster Assembly Machine 3. The conversion uses Speed Modules and increases production speed to 1.25.',
    prerequisiteTechnology: 'automation-3',
    prerequisiteUpgrade: 'assembly-machine-2',
    relevantMachine: 'Assembly Machine 2',
    machineGroup: 'assembly',
    upgradeCostPerMachine: products([['speed-module', 4]]),
    upgradeTimePerMachine: 0.5,
    newMachine: 'assembling-machine-3',
    newMachineLabel: 'Assembly Machine 3',
    newMachineMaterialCost: products([['circuit', 3], ['gear', 5], ['steel', 2], ['speed-module', 4]]),
    newMachinePowerDraw: 375,
    newMachineProductionSpeed: 1.25,
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
  ...([
    { level: 1, speed: 1.2, technology: 'research-speed-1', previous: undefined },
    { level: 2, speed: 1.5, technology: 'research-speed-2', previous: 'research-speed-1' },
    { level: 3, speed: 1.9, technology: 'research-speed-3', previous: 'research-speed-2' },
    { level: 4, speed: 2.4, technology: 'research-speed-4', previous: 'research-speed-3' },
    { level: 5, speed: 2.9, technology: 'research-speed-5', previous: 'research-speed-4' },
    { level: 6, speed: 3.5, technology: 'research-speed-6', previous: 'research-speed-5' },
  ] as const).map(({ level, speed, technology, previous }) => ({
    id: `research-speed-${level}` as UpgradeKey,
    name: `Research Speed Upgrade ${level}`,
    copy: `Increase every constructed science lab to research at ${speed}× speed. This upgrade is free and takes one second per lab.`,
    prerequisiteTechnology: technology,
    ...(previous ? { prerequisiteUpgrade: previous as UpgradeKey } : {}),
    relevantMachine: 'Science Lab',
    machineGroup: 'assembly' as const,
    upgradeCostPerMachine: [],
    upgradeTimePerMachine: 1,
    newMachine: 'lab',
    newMachineLabel: `Research Speed ${level}`,
    newMachineMaterialCost: [],
    newMachinePowerDraw: 0,
    newMachineProductionSpeed: speed,
    labSpeedLevel: level,
  })),
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
  labCount = 0,
) => upgrade.labSpeedLevel !== undefined ? labCount : machineCounts[upgrade.machineGroup] ?? 0;

const missingMaterials = (state: UpgradeStartState, costs: BuildMaterialCost[]) => costs
  .map(({ key, amount, source }) => ({ key, amount, available: state[source][key] ?? 0 }))
  .filter(({ amount, available }) => available < amount);

export const beginUpgrade = (state: UpgradeStartState, upgradeId: UpgradeKey, jobId: string): UpgradeStartResult => {
  const upgrade = upgradeMap[upgradeId];
  const labUpgrade = upgrade.labSpeedLevel !== undefined;
  const currentLabSpeedLevel = state.labSpeedLevel ?? 0;
  if (labUpgrade ? currentLabSpeedLevel >= (upgrade.labSpeedLevel ?? 0) : upgradeInstalledFor(state.machineVariants, upgradeId)) {
    return { ok: false, reason: 'already-installed', message: `${upgrade.newMachineLabel} is already installed` };
  }
  if (state.queue.some((item) => item.action === 'upgrade')) {
    return { ok: false, reason: 'upgrade-busy', message: 'finish the active upgrade before starting another' };
  }
  if (!state.research.includes(upgrade.prerequisiteTechnology)) {
    return { ok: false, reason: 'prerequisite', message: `${upgrade.prerequisiteTechnology} required` };
  }
  if (upgrade.prerequisiteUpgrade) {
    const prerequisite = upgradeMap[upgrade.prerequisiteUpgrade];
    const prerequisiteMet = labUpgrade
      ? currentLabSpeedLevel >= (prerequisite.labSpeedLevel ?? 0)
      : state.machineVariants[upgrade.machineGroup] === prerequisite.newMachine;
    if (!prerequisiteMet) {
      return { ok: false, reason: 'prerequisite-upgrade', message: `${prerequisite.name} required` };
    }
  }
  const machineCount = machineCountForUpgrade(state.machineCounts, upgrade, state.labCount);
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
    costs: totalCosts.map((cost) => ({ ...cost })),
    reserved: totalCosts.map((cost) => cost.amount),
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
  if (!upgrade || upgrade.labSpeedLevel !== undefined) return { ...machineVariants };
  if (upgradeInstalledFor(machineVariants, upgradeId)) return { ...machineVariants };
  return { ...machineVariants, [upgrade.machineGroup]: upgrade.newMachine };
};

const machineVariantRank: Record<MachineGroup, Record<string, number>> = {
  assembly: {
    'assembling-machine-1': 1,
    'assembling-machine-2': 2,
    'assembling-machine-3': 3,
  },
  mining: {
    'burner-mining-drill': 1,
    'electric-mining-drill': 2,
  },
};

export const upgradeInstalledFor = (machineVariants: MachineVariants, upgradeId: string) => {
  const upgrade = upgradeMap[upgradeId as UpgradeKey];
  if (!upgrade || upgrade.labSpeedLevel !== undefined) return false;
  const currentRank = machineVariantRank[upgrade.machineGroup][machineVariants[upgrade.machineGroup]] ?? 0;
  const targetRank = machineVariantRank[upgrade.machineGroup][upgrade.newMachine] ?? 0;
  return targetRank > 0 && currentRank >= targetRank;
};

export const applyLabSpeedUpgradeCompletion = (labSpeedLevel: number, upgradeId: string) => {
  const upgrade = upgradeMap[upgradeId as UpgradeKey];
  return upgrade?.labSpeedLevel === undefined ? labSpeedLevel : Math.max(labSpeedLevel, upgrade.labSpeedLevel);
};

export const applyOilProcessingUpgradeCompletion = (assemblers: Record<string, number>, machineCount: number) => ({
  ...assemblers,
  'advanced-oil-processing': Math.max(0, machineCount),
  'basic-oil-processing': 0,
});

export const migrateMachineUpgradeState = (saved: unknown): { machineVariants: MachineVariants; labSpeedLevel: number; queue: UpgradeQueueRecord[] } => {
  const record = saved && typeof saved === 'object' ? saved as { machineVariants?: unknown; labSpeedLevel?: unknown; queue?: unknown } : {};
  const savedVariants = record.machineVariants && typeof record.machineVariants === 'object'
    ? record.machineVariants as Partial<MachineVariants>
    : {};
  const machineVariants: MachineVariants = {
    assembly: savedVariants.assembly === 'assembling-machine-3'
      ? 'assembling-machine-3'
      : savedVariants.assembly === 'assembling-machine-2'
        ? 'assembling-machine-2'
        : 'assembling-machine-1',
    mining: savedVariants.mining === 'electric-mining-drill' ? 'electric-mining-drill' : 'burner-mining-drill',
  };
  const savedLabSpeedLevel = typeof record.labSpeedLevel === 'number' && Number.isFinite(record.labSpeedLevel)
    ? record.labSpeedLevel
    : 0;
  const labSpeedLevel = Math.min(labSpeeds.length - 1, Math.max(0, Math.floor(savedLabSpeedLevel)));
  const persistedQueue = Array.isArray(record.queue) ? record.queue : [];
  let upgradeSeen = false;
  const validUpgradeIds = new Set<string>([...Object.keys(upgradeMap), 'iron-chests', 'steel-chests', 'steel-furnaces', ELECTRIC_FURNACE_UPGRADE_ID, OIL_PROCESSING_UPGRADE_ID]);
  const queue = persistedQueue.filter((item): item is UpgradeQueueRecord => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as UpgradeQueueRecord;
    if (candidate.action !== 'upgrade') return true;
    if (upgradeSeen || !candidate.targetId || !validUpgradeIds.has(candidate.targetId)) return false;
    upgradeSeen = true;
    return true;
  });
  return { machineVariants, labSpeedLevel, queue };
};