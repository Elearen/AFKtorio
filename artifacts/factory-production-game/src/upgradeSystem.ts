import { recipeCatalog } from './recipeCatalog.js';
import { chemicalPlantCraftingSpeed, chemicalPlantPowerKw, chemicalPlantRecipeNames, electricFurnaceCraftingSpeed, electricFurnacePowerKw, oilRefineryCraftingSpeed, oilRefineryPowerKw, oilRefineryRecipeNames } from './productionSystem.js';

export type MachineGroup = 'assembly' | 'mining' | 'pumpjack' | 'chemical' | 'oilRefinery' | 'furnace';
export const MINING_MODULES_UPGRADE_ID = 'mining-modules-1';
export const MINING_MODULES_2_UPGRADE_ID = 'mining-modules-2';
export const MINING_MODULES_3_UPGRADE_ID = 'mining-modules-3';
export const PUMPJACK_MODULES_UPGRADE_ID = 'pumpjack-modules-1';
export const PUMPJACK_MODULES_2_UPGRADE_ID = 'pumpjack-modules-2';
export const PUMPJACK_MODULES_3_UPGRADE_ID = 'pumpjack-modules-3';
export const ASSEMBLY_MODULES_UPGRADE_ID = 'assembly-modules-1';
export const ASSEMBLY_MODULES_2_UPGRADE_ID = 'assembly-modules-2';
export const ASSEMBLY_MODULES_3_UPGRADE_ID = 'assembly-modules-3';
export const CHEMICAL_PLANT_MODULES_UPGRADE_ID = 'chemical-plant-modules-1';
export const CHEMICAL_PLANT_MODULES_2_UPGRADE_ID = 'chemical-plant-modules-2';
export const CHEMICAL_PLANT_MODULES_3_UPGRADE_ID = 'chemical-plant-modules-3';
export const OIL_REFINERY_MODULES_UPGRADE_ID = 'oil-refinery-modules-1';
export const OIL_REFINERY_MODULES_2_UPGRADE_ID = 'oil-refinery-modules-2';
export const OIL_REFINERY_MODULES_3_UPGRADE_ID = 'oil-refinery-modules-3';
export const ELECTRIC_FURNACE_MODULES_UPGRADE_ID = 'electric-furnace-modules-1';
export const ELECTRIC_FURNACE_MODULES_2_UPGRADE_ID = 'electric-furnace-modules-2';
export const ELECTRIC_FURNACE_MODULES_3_UPGRADE_ID = 'electric-furnace-modules-3';
export type UpgradeKey =
  | 'assembly-machine-2'
  | 'assembly-machine-3'
  | 'electric-mining-drill'
  | typeof MINING_MODULES_UPGRADE_ID
  | typeof MINING_MODULES_2_UPGRADE_ID
  | typeof MINING_MODULES_3_UPGRADE_ID
  | typeof PUMPJACK_MODULES_UPGRADE_ID
  | typeof PUMPJACK_MODULES_2_UPGRADE_ID
  | typeof PUMPJACK_MODULES_3_UPGRADE_ID
  | typeof ASSEMBLY_MODULES_UPGRADE_ID
  | typeof ASSEMBLY_MODULES_2_UPGRADE_ID
  | typeof ASSEMBLY_MODULES_3_UPGRADE_ID
  | typeof CHEMICAL_PLANT_MODULES_UPGRADE_ID
  | typeof CHEMICAL_PLANT_MODULES_2_UPGRADE_ID
  | typeof CHEMICAL_PLANT_MODULES_3_UPGRADE_ID
  | typeof OIL_REFINERY_MODULES_UPGRADE_ID
  | typeof OIL_REFINERY_MODULES_2_UPGRADE_ID
  | typeof OIL_REFINERY_MODULES_3_UPGRADE_ID
  | typeof ELECTRIC_FURNACE_MODULES_UPGRADE_ID
  | typeof ELECTRIC_FURNACE_MODULES_2_UPGRADE_ID
  | typeof ELECTRIC_FURNACE_MODULES_3_UPGRADE_ID
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
export const kovarexConditionMet = (inventory: Record<string, number>) =>
  (inventory['uranium-238'] ?? 0) > (inventory['uranium-235'] ?? 0);
export type BuildMaterialCost = { key: string; amount: number; source: 'raw' | 'products' };
export type MachineVariants = {
  assembly: string;
  mining: string;
  pumpjack?: string;
  chemical?: string;
  oilRefinery?: string;
  furnace?: string;
};
export type MachineCounts = {
  assembly: number;
  mining: number;
  pumpjack?: number;
  chemical?: number;
  oilRefinery?: number;
  furnace?: number;
};
const assemblyMachineExcludedRecipeNames = new Set([
  'basic-oil-processing',
  'advanced-oil-processing',
  'rocket-part',
  'space-science-pack',
  ...chemicalPlantRecipeNames,
]);
const smeltingRecipeNames = new Set(['iron-plate', 'copper-plate', 'steel-plate', 'stone-brick']);
export const electricFurnaceRecipeNames = [...smeltingRecipeNames];
export const assemblyMachineRecipeKeys = recipeCatalog
  .filter((recipe) => !smeltingRecipeNames.has(recipe.name)
    && recipe.category !== 'centrifuging'
    && recipe.category !== 'rocket-building'
    && !assemblyMachineExcludedRecipeNames.has(recipe.name))
  .map((recipe) => recipe.name);
export type UpgradeDefinition = {
  id: UpgradeKey;
  name: string;
  copy: string;
  prerequisiteTechnology: string;
  prerequisiteTechnologies?: string[];
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
  powerDrawIncrease?: number;
  powerDrawChange?: number;
  previousMachinePowerDraw?: number;
  prerequisiteMachineVariant?: string;
  newMachineProductionSpeed: number;
  affectedRecipes?: string[];
  recipeProductivityBonus?: number;
  recipeSpeedBonus?: number;
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
  machineCounts: MachineCounts;
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
    id: ASSEMBLY_MODULES_UPGRADE_ID,
    name: 'Upgrade Assembly Machines to Modules 1',
    copy: 'Install productivity, speed, and efficiency modules in every Assembly Machine 3.',
    prerequisiteTechnology: 'productivity-module',
    prerequisiteTechnologies: ['productivity-module', 'speed-module', 'efficiency-module'],
    prerequisiteUpgrade: 'assembly-machine-3',
    relevantMachine: 'Assembly Machine 3',
    machineGroup: 'assembly',
    upgradeCostPerMachine: products([
      ['productivity-module', 1],
      ['speed-module', 1],
      ['efficiency-module', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'assembling-machine-3-modules-1',
    newMachineLabel: 'Assembly Machine 3 + L1 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 534,
    powerDrawIncrease: 159,
    previousMachinePowerDraw: 375,
    newMachineProductionSpeed: 1.25,
    affectedRecipes: assemblyMachineRecipeKeys,
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: ASSEMBLY_MODULES_2_UPGRADE_ID,
    name: 'Upgrade Assembly Machines to Modules 2',
    copy: 'Install level 2 productivity, speed, and efficiency modules in every Assembly Machine 3.',
    prerequisiteTechnology: 'productivity-module-2',
    prerequisiteTechnologies: ['productivity-module-2', 'speed-module-2', 'efficiency-module-2'],
    prerequisiteUpgrade: ASSEMBLY_MODULES_UPGRADE_ID,
    relevantMachine: 'Assembly Machine 3 + L1 Modules',
    machineGroup: 'assembly',
    upgradeCostPerMachine: products([
      ['productivity-module-2', 1],
      ['speed-module-2', 1],
      ['efficiency-module-2', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'assembling-machine-3-modules-2',
    newMachineLabel: 'Assembly Machine 3 + L2 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 575,
    powerDrawIncrease: 41,
    previousMachinePowerDraw: 534,
    newMachineProductionSpeed: 1.25,
    affectedRecipes: assemblyMachineRecipeKeys,
    recipeProductivityBonus: 0.02,
    recipeSpeedBonus: 0.05,
  },
  {
    id: ASSEMBLY_MODULES_3_UPGRADE_ID,
    name: 'Upgrade Assembly Machines to Modules 3',
    copy: 'Install level 3 productivity, speed, and efficiency modules in every Assembly Machine 3.',
    prerequisiteTechnology: 'productivity-module-3',
    prerequisiteTechnologies: ['productivity-module-3', 'speed-module-3', 'efficiency-module-3'],
    prerequisiteUpgrade: ASSEMBLY_MODULES_2_UPGRADE_ID,
    relevantMachine: 'Assembly Machine 3 + L2 Modules',
    machineGroup: 'assembly',
    upgradeCostPerMachine: products([
      ['productivity-module-3', 1],
      ['speed-module-3', 1],
      ['efficiency-module-3', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'assembling-machine-3-modules-3',
    newMachineLabel: 'Assembly Machine 3 + L3 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 568,
    powerDrawChange: -7,
    previousMachinePowerDraw: 575,
    newMachineProductionSpeed: 1.25,
    affectedRecipes: assemblyMachineRecipeKeys,
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
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
    newMachineProductionSpeed: 0.7,
  },
  {
    id: MINING_MODULES_UPGRADE_ID,
    name: 'Upgrade Mining to Modules 1',
    copy: 'Install productivity, speed, and efficiency modules in every Electric Miner.',
    prerequisiteTechnology: 'productivity-module',
    prerequisiteTechnologies: ['productivity-module', 'speed-module', 'efficiency-module'],
    prerequisiteUpgrade: 'electric-mining-drill',
    relevantMachine: 'Electric Miner',
    machineGroup: 'mining',
    upgradeCostPerMachine: products([
      ['productivity-module', 1],
      ['speed-module', 1],
      ['efficiency-module', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'electric-mining-drill-modules-1',
    newMachineLabel: 'Electric Miner + L1 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 128,
    powerDrawIncrease: 38,
    previousMachinePowerDraw: 90,
    newMachineProductionSpeed: 0.7,
    affectedRecipes: ['stone', 'coal', 'copper', 'iron', 'uranium'],
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: MINING_MODULES_2_UPGRADE_ID,
    name: 'Upgrade Mining to Modules 2',
    copy: 'Install level 2 productivity, speed, and efficiency modules in every Electric Miner.',
    prerequisiteTechnology: 'productivity-module-2',
    prerequisiteTechnologies: ['productivity-module-2', 'speed-module-2', 'efficiency-module-2'],
    prerequisiteUpgrade: MINING_MODULES_UPGRADE_ID,
    relevantMachine: 'Electric Miner + L1 Modules',
    machineGroup: 'mining',
    upgradeCostPerMachine: products([
      ['productivity-module-2', 1],
      ['speed-module-2', 1],
      ['efficiency-module-2', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'electric-mining-drill-modules-2',
    newMachineLabel: 'Electric Miner + L2 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 138,
    powerDrawIncrease: 10,
    previousMachinePowerDraw: 128,
    newMachineProductionSpeed: 0.7,
    affectedRecipes: ['stone', 'coal', 'copper', 'iron', 'uranium'],
    recipeProductivityBonus: 0.02,
    recipeSpeedBonus: 0.05,
  },
  {
    id: MINING_MODULES_3_UPGRADE_ID,
    name: 'Upgrade Mining to Modules 3',
    copy: 'Install level 3 productivity, speed, and efficiency modules in every Electric Miner.',
    prerequisiteTechnology: 'productivity-module-3',
    prerequisiteTechnologies: ['productivity-module-3', 'speed-module-3', 'efficiency-module-3'],
    prerequisiteUpgrade: MINING_MODULES_2_UPGRADE_ID,
    relevantMachine: 'Electric Miner + L2 Modules',
    machineGroup: 'mining',
    upgradeCostPerMachine: products([
      ['productivity-module-3', 1],
      ['speed-module-3', 1],
      ['efficiency-module-3', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'electric-mining-drill-modules-3',
    newMachineLabel: 'Electric Miner + L3 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 136,
    powerDrawChange: -2,
    previousMachinePowerDraw: 138,
    newMachineProductionSpeed: 0.7,
    affectedRecipes: ['stone', 'coal', 'copper', 'iron', 'uranium'],
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: PUMPJACK_MODULES_UPGRADE_ID,
    name: 'Upgrade Pumpjacks to Modules 1',
    copy: 'Install productivity, speed, and efficiency modules in every Pumpjack.',
    prerequisiteTechnology: 'oil-gathering',
    prerequisiteTechnologies: ['oil-gathering', 'productivity-module', 'speed-module', 'efficiency-module'],
    relevantMachine: 'Pumpjack',
    machineGroup: 'pumpjack',
    upgradeCostPerMachine: products([
      ['productivity-module', 1],
      ['speed-module', 1],
      ['efficiency-module', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'pumpjack-modules-1',
    newMachineLabel: 'Pumpjack + L1 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 128,
    powerDrawIncrease: 38,
    previousMachinePowerDraw: 90,
    newMachineProductionSpeed: 1,
    affectedRecipes: ['crudeOil'],
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: PUMPJACK_MODULES_2_UPGRADE_ID,
    name: 'Upgrade Pumpjacks to Modules 2',
    copy: 'Install level 2 productivity, speed, and efficiency modules in every Pumpjack.',
    prerequisiteTechnology: 'oil-gathering',
    prerequisiteTechnologies: ['productivity-module-2', 'speed-module-2', 'efficiency-module-2'],
    prerequisiteUpgrade: PUMPJACK_MODULES_UPGRADE_ID,
    relevantMachine: 'Pumpjack + L1 Modules',
    machineGroup: 'pumpjack',
    upgradeCostPerMachine: products([
      ['productivity-module-2', 1],
      ['speed-module-2', 1],
      ['efficiency-module-2', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'pumpjack-modules-2',
    newMachineLabel: 'Pumpjack + L2 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 138,
    powerDrawIncrease: 10,
    previousMachinePowerDraw: 128,
    newMachineProductionSpeed: 1,
    affectedRecipes: ['crudeOil'],
    recipeProductivityBonus: 0.02,
    recipeSpeedBonus: 0.05,
  },
  {
    id: PUMPJACK_MODULES_3_UPGRADE_ID,
    name: 'Upgrade Pumpjacks to Modules 3',
    copy: 'Install level 3 productivity, speed, and efficiency modules in every Pumpjack.',
    prerequisiteTechnology: 'oil-gathering',
    prerequisiteTechnologies: ['productivity-module-3', 'speed-module-3', 'efficiency-module-3'],
    prerequisiteUpgrade: PUMPJACK_MODULES_2_UPGRADE_ID,
    relevantMachine: 'Pumpjack + L2 Modules',
    machineGroup: 'pumpjack',
    upgradeCostPerMachine: products([
      ['productivity-module-3', 1],
      ['speed-module-3', 1],
      ['efficiency-module-3', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'pumpjack-modules-3',
    newMachineLabel: 'Pumpjack + L3 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 136,
    powerDrawChange: -2,
    previousMachinePowerDraw: 138,
    newMachineProductionSpeed: 1,
    affectedRecipes: ['crudeOil'],
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: CHEMICAL_PLANT_MODULES_UPGRADE_ID,
    name: 'Upgrade Chemical Plants to Modules 1',
    copy: 'Install productivity, speed, and efficiency modules in every Chemical Plant.',
    prerequisiteTechnology: 'oil-processing',
    prerequisiteTechnologies: ['oil-processing', 'productivity-module', 'speed-module', 'efficiency-module'],
    prerequisiteMachineVariant: 'chemical-plant',
    relevantMachine: 'Chemical Plant',
    machineGroup: 'chemical',
    upgradeCostPerMachine: products([
      ['productivity-module', 1],
      ['speed-module', 1],
      ['efficiency-module', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'chemical-plant-modules-1',
    newMachineLabel: 'Chemical Plant + L1 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 300,
    powerDrawIncrease: 90,
    previousMachinePowerDraw: chemicalPlantPowerKw,
    newMachineProductionSpeed: chemicalPlantCraftingSpeed,
    affectedRecipes: [...chemicalPlantRecipeNames],
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: CHEMICAL_PLANT_MODULES_2_UPGRADE_ID,
    name: 'Upgrade Chemical Plants to Modules 2',
    copy: 'Install level 2 productivity, speed, and efficiency modules in every Chemical Plant.',
    prerequisiteTechnology: 'productivity-module-2',
    prerequisiteTechnologies: ['productivity-module-2', 'speed-module-2', 'efficiency-module-2'],
    prerequisiteUpgrade: CHEMICAL_PLANT_MODULES_UPGRADE_ID,
    relevantMachine: 'Chemical Plant + L1 Modules',
    machineGroup: 'chemical',
    upgradeCostPerMachine: products([
      ['productivity-module-2', 1],
      ['speed-module-2', 1],
      ['efficiency-module-2', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'chemical-plant-modules-2',
    newMachineLabel: 'Chemical Plant + L2 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 325,
    powerDrawIncrease: 25,
    previousMachinePowerDraw: 300,
    newMachineProductionSpeed: chemicalPlantCraftingSpeed,
    affectedRecipes: [...chemicalPlantRecipeNames],
    recipeProductivityBonus: 0.02,
    recipeSpeedBonus: 0.05,
  },
  {
    id: CHEMICAL_PLANT_MODULES_3_UPGRADE_ID,
    name: 'Upgrade Chemical Plants to Modules 3',
    copy: 'Install level 3 productivity, speed, and efficiency modules in every Chemical Plant.',
    prerequisiteTechnology: 'productivity-module-3',
    prerequisiteTechnologies: ['productivity-module-3', 'speed-module-3', 'efficiency-module-3'],
    prerequisiteUpgrade: CHEMICAL_PLANT_MODULES_2_UPGRADE_ID,
    relevantMachine: 'Chemical Plant + L2 Modules',
    machineGroup: 'chemical',
    upgradeCostPerMachine: products([
      ['productivity-module-3', 1],
      ['speed-module-3', 1],
      ['efficiency-module-3', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'chemical-plant-modules-3',
    newMachineLabel: 'Chemical Plant + L3 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 318,
    powerDrawChange: -7,
    previousMachinePowerDraw: 325,
    newMachineProductionSpeed: chemicalPlantCraftingSpeed,
    affectedRecipes: [...chemicalPlantRecipeNames],
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: OIL_REFINERY_MODULES_UPGRADE_ID,
    name: 'Upgrade Oil Refineries to Modules 1',
    copy: 'Install productivity, speed, and efficiency modules in every Oil Refinery.',
    prerequisiteTechnology: 'oil-processing',
    prerequisiteTechnologies: ['oil-processing', 'productivity-module', 'speed-module', 'efficiency-module'],
    prerequisiteMachineVariant: 'oil-refinery',
    relevantMachine: 'Oil Refinery',
    machineGroup: 'oilRefinery',
    upgradeCostPerMachine: products([
      ['productivity-module', 1],
      ['speed-module', 1],
      ['efficiency-module', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'oil-refinery-modules-1',
    newMachineLabel: 'Oil Refinery + L1 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 600,
    powerDrawIncrease: 180,
    previousMachinePowerDraw: oilRefineryPowerKw,
    newMachineProductionSpeed: oilRefineryCraftingSpeed,
    affectedRecipes: [...oilRefineryRecipeNames],
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: OIL_REFINERY_MODULES_2_UPGRADE_ID,
    name: 'Upgrade Oil Refineries to Modules 2',
    copy: 'Install level 2 productivity, speed, and efficiency modules in every Oil Refinery.',
    prerequisiteTechnology: 'productivity-module-2',
    prerequisiteTechnologies: ['productivity-module-2', 'speed-module-2', 'efficiency-module-2'],
    prerequisiteUpgrade: OIL_REFINERY_MODULES_UPGRADE_ID,
    relevantMachine: 'Oil Refinery + L1 Modules',
    machineGroup: 'oilRefinery',
    upgradeCostPerMachine: products([
      ['productivity-module-2', 1],
      ['speed-module-2', 1],
      ['efficiency-module-2', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'oil-refinery-modules-2',
    newMachineLabel: 'Oil Refinery + L2 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 650,
    powerDrawIncrease: 50,
    previousMachinePowerDraw: 600,
    newMachineProductionSpeed: oilRefineryCraftingSpeed,
    affectedRecipes: [...oilRefineryRecipeNames],
    recipeProductivityBonus: 0.02,
    recipeSpeedBonus: 0.05,
  },
  {
    id: OIL_REFINERY_MODULES_3_UPGRADE_ID,
    name: 'Upgrade Oil Refineries to Modules 3',
    copy: 'Install level 3 productivity, speed, and efficiency modules in every Oil Refinery.',
    prerequisiteTechnology: 'productivity-module-3',
    prerequisiteTechnologies: ['productivity-module-3', 'speed-module-3', 'efficiency-module-3'],
    prerequisiteUpgrade: OIL_REFINERY_MODULES_2_UPGRADE_ID,
    relevantMachine: 'Oil Refinery + L2 Modules',
    machineGroup: 'oilRefinery',
    upgradeCostPerMachine: products([
      ['productivity-module-3', 1],
      ['speed-module-3', 1],
      ['efficiency-module-3', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'oil-refinery-modules-3',
    newMachineLabel: 'Oil Refinery + L3 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 635,
    powerDrawChange: -15,
    previousMachinePowerDraw: 650,
    newMachineProductionSpeed: oilRefineryCraftingSpeed,
    affectedRecipes: [...oilRefineryRecipeNames],
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: ELECTRIC_FURNACE_MODULES_UPGRADE_ID,
    name: 'Upgrade Electric Furnaces to Modules 1',
    copy: 'Install productivity, speed, and efficiency modules in every Electric Furnace.',
    prerequisiteTechnology: 'productivity-module',
    prerequisiteTechnologies: ['productivity-module', 'speed-module', 'efficiency-module'],
    prerequisiteMachineVariant: 'electric-furnace',
    relevantMachine: 'Electric Furnace',
    machineGroup: 'furnace',
    upgradeCostPerMachine: products([
      ['productivity-module', 1],
      ['speed-module', 1],
      ['efficiency-module', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'electric-furnace-modules-1',
    newMachineLabel: 'Electric Furnace + L1 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 256,
    powerDrawIncrease: 76,
    previousMachinePowerDraw: electricFurnacePowerKw,
    newMachineProductionSpeed: electricFurnaceCraftingSpeed,
    affectedRecipes: electricFurnaceRecipeNames,
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
  },
  {
    id: ELECTRIC_FURNACE_MODULES_2_UPGRADE_ID,
    name: 'Upgrade Electric Furnaces to Modules 2',
    copy: 'Install level 2 productivity, speed, and efficiency modules in every Electric Furnace.',
    prerequisiteTechnology: 'productivity-module-2',
    prerequisiteTechnologies: ['productivity-module-2', 'speed-module-2', 'efficiency-module-2'],
    prerequisiteUpgrade: ELECTRIC_FURNACE_MODULES_UPGRADE_ID,
    relevantMachine: 'Electric Furnace + L1 Modules',
    machineGroup: 'furnace',
    upgradeCostPerMachine: products([
      ['productivity-module-2', 1],
      ['speed-module-2', 1],
      ['efficiency-module-2', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'electric-furnace-modules-2',
    newMachineLabel: 'Electric Furnace + L2 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 276,
    powerDrawIncrease: 20,
    previousMachinePowerDraw: 256,
    newMachineProductionSpeed: electricFurnaceCraftingSpeed,
    affectedRecipes: electricFurnaceRecipeNames,
    recipeProductivityBonus: 0.02,
    recipeSpeedBonus: 0.05,
  },
  {
    id: ELECTRIC_FURNACE_MODULES_3_UPGRADE_ID,
    name: 'Upgrade Electric Furnaces to Modules 3',
    copy: 'Install level 3 productivity, speed, and efficiency modules in every Electric Furnace.',
    prerequisiteTechnology: 'productivity-module-3',
    prerequisiteTechnologies: ['productivity-module-3', 'speed-module-3', 'efficiency-module-3'],
    prerequisiteUpgrade: ELECTRIC_FURNACE_MODULES_2_UPGRADE_ID,
    relevantMachine: 'Electric Furnace + L2 Modules',
    machineGroup: 'furnace',
    upgradeCostPerMachine: products([
      ['productivity-module-3', 1],
      ['speed-module-3', 1],
      ['efficiency-module-3', 1],
    ]),
    upgradeTimePerMachine: 1,
    newMachine: 'electric-furnace-modules-3',
    newMachineLabel: 'Electric Furnace + L3 Modules',
    newMachineMaterialCost: [],
    newMachinePowerDraw: 272,
    powerDrawChange: -4,
    previousMachinePowerDraw: 276,
    newMachineProductionSpeed: electricFurnaceCraftingSpeed,
    affectedRecipes: electricFurnaceRecipeNames,
    recipeProductivityBonus: 0.04,
    recipeSpeedBonus: 0.15,
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
  machineCounts: MachineCounts,
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
  const prerequisiteTechnologies = upgrade.prerequisiteTechnologies ?? [upgrade.prerequisiteTechnology];
  if (!prerequisiteTechnologies.every((technology) => state.research.includes(technology))) {
    return { ok: false, reason: 'prerequisite', message: `${prerequisiteTechnologies.filter((technology) => !state.research.includes(technology)).join(' + ')} required` };
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
  if (upgrade.prerequisiteMachineVariant && state.machineVariants[upgrade.machineGroup] !== upgrade.prerequisiteMachineVariant) {
    return { ok: false, reason: 'prerequisite-upgrade', message: `${upgrade.relevantMachine} required` };
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
    'assembling-machine-3-modules-1': 4,
    'assembling-machine-3-modules-2': 5,
    'assembling-machine-3-modules-3': 6,
  },
  mining: {
    'burner-mining-drill': 1,
    'electric-mining-drill': 2,
    'electric-mining-drill-modules-1': 3,
    'electric-mining-drill-modules-2': 4,
    'electric-mining-drill-modules-3': 5,
  },
  pumpjack: {
    pumpjack: 1,
    'pumpjack-modules-1': 2,
    'pumpjack-modules-2': 3,
    'pumpjack-modules-3': 4,
  },
  chemical: {
    'chemical-plant': 1,
    'chemical-plant-modules-1': 2,
    'chemical-plant-modules-2': 3,
    'chemical-plant-modules-3': 4,
  },
  oilRefinery: {
    'oil-refinery': 1,
    'oil-refinery-modules-1': 2,
    'oil-refinery-modules-2': 3,
    'oil-refinery-modules-3': 4,
  },
  furnace: {
    'stone-furnace': 1,
    'steel-furnace': 2,
    'electric-furnace': 3,
    'electric-furnace-modules-1': 4,
    'electric-furnace-modules-2': 5,
    'electric-furnace-modules-3': 6,
  },
};

export const upgradeInstalledFor = (machineVariants: MachineVariants, upgradeId: string) => {
  const upgrade = upgradeMap[upgradeId as UpgradeKey];
  if (!upgrade || upgrade.labSpeedLevel !== undefined) return false;
  const currentVariant = machineVariants[upgrade.machineGroup];
  const currentRank = currentVariant ? machineVariantRank[upgrade.machineGroup][currentVariant] ?? 0 : 0;
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
    assembly: savedVariants.assembly === 'assembling-machine-3-modules-3'
      ? 'assembling-machine-3-modules-3'
      : savedVariants.assembly === 'assembling-machine-3-modules-2'
        ? 'assembling-machine-3-modules-2'
        : savedVariants.assembly === 'assembling-machine-3-modules-1'
          ? 'assembling-machine-3-modules-1'
          : savedVariants.assembly === 'assembling-machine-3'
            ? 'assembling-machine-3'
            : savedVariants.assembly === 'assembling-machine-2'
              ? 'assembling-machine-2'
              : 'assembling-machine-1',
    mining: savedVariants.mining === 'electric-mining-drill-modules-3'
      ? 'electric-mining-drill-modules-3'
      : savedVariants.mining === 'electric-mining-drill-modules-2'
        ? 'electric-mining-drill-modules-2'
        : savedVariants.mining === 'electric-mining-drill-modules-1'
          ? 'electric-mining-drill-modules-1'
          : savedVariants.mining === 'electric-mining-drill' ? 'electric-mining-drill' : 'burner-mining-drill',
  };
  const savedFurnace = savedVariants.furnace;
  if (savedFurnace === 'stone-furnace' || savedFurnace === 'steel-furnace' || savedFurnace === 'electric-furnace' || savedFurnace === 'electric-furnace-modules-1' || savedFurnace === 'electric-furnace-modules-2' || savedFurnace === 'electric-furnace-modules-3') {
    machineVariants.furnace = savedFurnace;
  } else {
    machineVariants.furnace = 'stone-furnace';
  }
  const savedChemical = savedVariants.chemical;
  if (savedChemical === 'chemical-plant' || savedChemical === 'chemical-plant-modules-1' || savedChemical === 'chemical-plant-modules-2' || savedChemical === 'chemical-plant-modules-3') {
    machineVariants.chemical = savedChemical;
  } else {
    machineVariants.chemical = 'chemical-plant';
  }
  const savedOilRefinery = savedVariants.oilRefinery;
  if (savedOilRefinery === 'oil-refinery' || savedOilRefinery === 'oil-refinery-modules-1' || savedOilRefinery === 'oil-refinery-modules-2' || savedOilRefinery === 'oil-refinery-modules-3') {
    machineVariants.oilRefinery = savedOilRefinery;
  } else {
    machineVariants.oilRefinery = 'oil-refinery';
  }
  const savedPumpjack = savedVariants.pumpjack;
  if (savedPumpjack === 'pumpjack' || savedPumpjack === 'pumpjack-modules-1' || savedPumpjack === 'pumpjack-modules-2' || savedPumpjack === 'pumpjack-modules-3') {
    machineVariants.pumpjack = savedPumpjack;
  }
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