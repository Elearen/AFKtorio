import { Fragment, useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type ReactNode, type SetStateAction } from 'react';
import { Link, Router as WouterRouter, useLocation, useSearch } from 'wouter';
import { submitLaunchRanking, useSubmitLaunchRanking, type LaunchRankingSubmission } from '@workspace/api-client-react';
import { recipeCatalog, recipeScienceChainFor, type RecipeCatalogEntry, type RecipeMaterial, type RecipeScienceChain } from './recipeCatalog';
import { tierProductCatalog } from './productTierCatalog';
import { technologyCatalog, type TechnologyDefinition } from './technologyCatalog';
import { technologyOrder } from './technologyOrder';
import { canBuildRocketSilo, queueSpaceScienceNotification, recipeBuildCostsForRocket, rocketPartBatchTimeFor, rocketPartCountAfterConstruction, ROCKET_PART_TARGET, scaleRocketCosts, spaceScienceRecipeMachineCountAfterUnlock, unlockSpaceScienceAfterLaunch } from './rocketSiloSystem';
import { assemblyMachineOneCraftingSpeed, chemicalPlantCraftingSpeed, chemicalPlantPowerKw, chemicalPlantRecipeNames, centrifugeCraftingSpeed, centrifugePowerKw, craftingSpeedFor, cycleBudgetFor, cyclesPerMinuteFor, electricFurnaceCraftingSpeed, electricFurnacePowerKw, isAutomatedOnlyRecipe, oilRefineryCraftingSpeed, oilRefineryPowerKw, steelFurnaceCraftingSpeed } from './productionSystem';
import { activateReadyConstruction, constructionCanBeFullyFunded, constructionDurationFor, constructionTickCountFor, constructionVisualDurationMsFor, constructionVisualProgressFor, fulfillConstructionReservation, hasWaitingConstruction, normalizeConstructionQueue, refundConstructionMaterials, reserveConstructionMaterials } from './constructionSystem';
import { calculatePowerFlow } from './powerSystem';
import { calculateNuclearPowerFlow, type NuclearPowerFlow } from './nuclearPowerSystem';
import { burnerMinerFuelRatioFor, burnerMinerNeedsFuel, miningPowerRatioFor } from './miningSystem';
import {
  OIL_PROCESSING_UPGRADE_ID, STEEL_FURNACE_PREREQUISITE_TECHNOLOGY, applyLabSpeedUpgradeCompletion, applyOilProcessingUpgradeCompletion, applyUpgradeCompletion, beginUpgrade, bufferedActualRateFor, labSpeedForLevel, machineCountForUpgrade as upgradeMachineCountFor,
  kovarexConditionMet, migrateMachineUpgradeState, oilCrackingConditionMet, oilProcessingUpgradeTimeFor, scaledBuildCosts, upgradeData, upgradeInstalledFor, upgradeMap,
  ELECTRIC_FURNACE_PREREQUISITE_TECHNOLOGY, ELECTRIC_FURNACE_UPGRADE_ID, electricFurnacePrerequisiteMet, electricFurnaceUpgradeCostPerFurnace, electricFurnaceUpgradeTimePerFurnace, steelFurnacePrerequisiteMet, type BuildMaterialCost, type MachineVariants, type UpgradeDefinition,
} from './upgradeSystem';
import {
  canPurchaseStorageFor, completeStorageConstruction, createInitialStorageState,
  FLUID_HANDLING_TECHNOLOGY, FLUID_STORAGE_BASE_CAPACITY, migrateStorageState,
  storageCapacityFor as calculateStorageCapacityFor, storageContainerCountFor as calculateStorageContainerCountFor,
  ironChestUpgradeCostFor, ironChestUpgradeTimeFor, itemStorageBoxCountFor,
  STORAGE_BOX_CAPACITY, STORAGE_IRON_BOX_CAPACITY, STORAGE_IRON_BOX_COST, STORAGE_IRON_BOX_UPGRADE_TIME, STORAGE_STEEL_BOX_CAPACITY, STORAGE_STEEL_BOX_COST, STORAGE_STEEL_BOX_UPGRADE_TIME, STORAGE_TANK_CAPACITY,
  steelChestUpgradeCostFor, steelChestUpgradeTimeFor,
  type StorageBoxType,
} from './storageSystem';
import { milestoneOrder, milestoneTitles, migrateMilestoneState, nuclearPowerMilestoneTriggered, SCIENCE_PACKS_MILESTONE_THRESHOLD, SCIENCE_PACKS_THOUSAND_MILESTONE_THRESHOLD, SCIENCE_PACKS_TEN_THOUSAND_MILESTONE_THRESHOLD, SCIENCE_PACKS_HUNDRED_THOUSAND_MILESTONE_THRESHOLD, SCIENCE_PACKS_MILLION_MILESTONE_THRESHOLD, type MilestoneKey } from './milestoneSystem';
import { evaluateResearchCountFormula, technologyLevelFor } from './researchFormula';
import { formatWinDuration, winMetricsFor, type WinMetrics } from './endgameMetrics';
import { primaryOutputFor } from './productionOutput';
import { prioritizeDisplayOrder } from './displayOrder';
import { sessionIdForStartTimestamp } from './sessionId';
import {
  Activity, ArrowRight, BatteryCharging, Box, Check, ChevronRight, CircleHelp, Clock3,
  Cog, MoveRight, Cpu, FlaskConical, Gauge, Hammer,
  Info, Layers3, Lightbulb, LockKeyhole, Pickaxe, Plus, Power, Rocket,
  RotateCcw, Save, Settings2, ShieldAlert, Sparkles, Sun, Moon, Trash2,
  TrendingUp, TriangleAlert, Truck, Waves, X, Zap,
} from 'lucide-react';

type RawKey = 'iron' | 'copper' | 'stone' | 'coal' | 'wood' | 'water' | 'uranium' | 'crudeOil';
type ComponentKey = string;
type ScienceKey = 'automationPack' | 'logisticsPack' | 'chemicalPack' | 'militaryPack' | 'productionPack' | 'utilityPack' | 'spacePack';
type TrackedKey = string;
type ResearchKey = string;
type ResearchFilter = 'completed' | 'unlocked' | 'locked';
type UpgradeFilter = 'completed' | 'available' | 'locked';
type RecipeScienceFilter = 'all' | RecipeScienceChain;
type ConstructionBatchSize = 1 | 5 | 10 | 25 | 100;
const constructionBatchSizes = [1, 5, 10, 25, 100] as const;
const normalizeConstructionBatchSize = (value: unknown): ConstructionBatchSize =>
  value === 100 ? 100 : value === 25 ? 25 : value === 10 ? 10 : value === 5 ? 5 : 1;
type UnitStatus = 'running' | 'starved' | 'blocked';
const defaultTechnologyResearchTime = 30;
type SupplyStatusTone = 'teal' | 'amber' | 'red' | 'muted';
type SupplyStatus = { tone: SupplyStatusTone; label: string; detail: string };
type Recipe = RecipeCatalogEntry;
type QueueItem = {
  id: string;
  action: 'miner' | 'pump' | 'pumpjack' | 'uraniumMiner' | 'assembler' | 'furnace' | 'lab' | 'boiler' | 'steamEngine' | 'solarPanel' | 'accumulator' | 'nuclearReactor' | 'heatExchanger' | 'steamTurbine' | 'storage' | 'upgrade' | 'rocketSilo' | 'rocketParts';
  target: string;
  targetId?: string;
  seconds: number;
  total: number;
  quantity?: ConstructionBatchSize;
  machineCount?: number;
  costs?: BuildMaterialCost[];
  reserved?: number[];
  started?: boolean;
  progressStartedAt?: number;
  progressDurationMs?: number;
};
type TimedProgress = { progressStartedAt?: number; progressDurationMs?: number };
type HandcraftJob = { recipeKey: string; seconds: number; total: number } & TimedProgress;
type ManualMiningJob = { resourceKey: RawKey; seconds: number; total: number } & TimedProgress;
type RateSample = { seconds: number; production: Record<TrackedKey, number>; manualProduction?: Record<TrackedKey, number>; consumption: Record<TrackedKey, number> };
type GameState = {
  raw: Record<RawKey, number>;
  products: Record<string, number>;
  storage: Record<TrackedKey, number>;
  storageBoxes: Record<TrackedKey, number>;
  storageTanks: Record<TrackedKey, number>;
  storageBoxType: StorageBoxType;
  miners: Record<RawKey, number>;
  pumps: number;
  pumpjacks: number;
  uraniumMiners: number;
  assemblers: Record<string, number>;
  oilProcessingAdvanced: boolean;
  labs: number;
  labSpeedLevel: number;
  workerRobotSpeedLevel: number;
  boilers: number;
  boilersEnabled: boolean;
  steamEngines: number;
  solarPanels: number;
  accumulators: number;
  nuclearReactors: number;
  heatExchangers: number;
  steamTurbines: number;
  miningProgress: Record<RawKey, number>;
  assemblyProgress: Record<string, number>;
  labProgress: number;
  handcraft: HandcraftJob | null;
  manualMining: ManualMiningJob | null;
  queue: QueueItem[];
  research: ResearchKey[];
  currentResearch: ResearchKey | null;
  researchSelected: boolean;
  researchProgress: Record<ResearchKey, number>;
  autoResearch: ResearchKey[];
  researchNotifications: ResearchKey[];
  milestoneNotifications: MilestoneKey[];
  unlockedMilestones: MilestoneKey[];
  produced: Record<string, number>;
  manualOutputEvents: Record<TrackedKey, number>;
  pausedRecipes: Record<string, boolean>;
  pausedMining: Record<RawKey, boolean>;
  constructionBatchSize: ConstructionBatchSize;
  rateHistory: RateSample[];
  machineVariants: MachineVariants;
  furnaceVariant: 'stone-furnace' | 'steel-furnace' | 'electric-furnace';
  totalOutput: number;
  lastSeen: number;
  gameStartTimestamp: number;
  sessionId: string;
  simulationSpeed: number;
  rocketSiloBuilt: boolean;
  rocketPartsBuilt: number;
  rocketReadyAcknowledged: boolean;
  rocketLaunched: boolean;
  gameComplete: boolean;
  completionTotalOutput: number | null;
  completionStats: Record<string, number> | null;
  winMetrics: WinMetrics | null;
  tutorialVisible: boolean;
  welcomeSeen: boolean;
};

const SAVE_KEY = 'factory-production-game-save-v2';
const rawKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal', 'wood', 'water', 'crudeOil', 'uranium'];
const normalizedTechnologyCatalog = technologyCatalog.map((technology) => ({ ...technology, time: technology.time ?? defaultTechnologyResearchTime }));
const technologyMap: Record<string, TechnologyDefinition> = Object.fromEntries(normalizedTechnologyCatalog.map((technology) => [technology.name, technology]));
const legacyResearchAliases: Record<string, string> = { steamPower: 'steam-power', solarPower: 'solar-energy', nuclearPower: 'nuclear-power', steelProcessing: 'steel-processing' };
const normalizeResearchKey = (key: string) => legacyResearchAliases[key] ?? key;
const sourceKeyAliases: Record<string, TrackedKey> = {
  'iron-ore': 'iron', 'copper-ore': 'copper', 'uranium-ore': 'uranium', 'crude-oil': 'crudeOil',
  'iron-plate': 'ironPlate', 'copper-plate': 'copperPlate', 'steel-plate': 'steel',
  'iron-gear-wheel': 'gear', 'electronic-circuit': 'circuit',
  'automation-science-pack': 'automationPack', 'logistic-science-pack': 'logisticsPack',
  'chemical-science-pack': 'chemicalPack', 'military-science-pack': 'militaryPack',
  'production-science-pack': 'productionPack', 'utility-science-pack': 'utilityPack', 'space-science-pack': 'spacePack',
};
const keyForSource = (name: string) => sourceKeyAliases[name] ?? name;
const recipeMap: Record<string, Recipe> = Object.fromEntries(recipeCatalog.map((recipe) => [recipe.name, recipe]));
const componentKeys: ComponentKey[] = recipeCatalog.map((recipe) => recipe.name);
const scienceRecipeKeys: Record<ScienceKey, string> = {
  automationPack: 'automation-science-pack', logisticsPack: 'logistic-science-pack',
  chemicalPack: 'chemical-science-pack', militaryPack: 'military-science-pack',
  productionPack: 'production-science-pack', utilityPack: 'utility-science-pack', spacePack: 'space-science-pack',
};
const technologyOrderIndex = new Map<string, number>(technologyOrder.map((name, index) => [name, index]));
const catalogOrderIndex = new Map<string, number>(normalizedTechnologyCatalog.map((technology, index) => [technology.name, index]));
const orderedTechnologyCatalog = [...normalizedTechnologyCatalog].sort((a, b) => {
  const orderA = technologyOrderIndex.get(a.name) ?? technologyOrder.length + (catalogOrderIndex.get(a.name) ?? 0);
  const orderB = technologyOrderIndex.get(b.name) ?? technologyOrder.length + (catalogOrderIndex.get(b.name) ?? 0);
  return orderA - orderB;
});
const technologyPrerequisitesMet = (state: GameState, technology: TechnologyDefinition) => technology.prerequisites.every((prerequisite) => state.research.includes(prerequisite));
const autoResearchTargetFor = (state: GameState) => {
  const selected = new Set(state.autoResearch ?? []);
  return orderedTechnologyCatalog.find((technology) =>
    !technology.researchTrigger
    && selected.has(technology.name)
    && !state.research.includes(technology.name)
    && technologyPrerequisitesMet(state, technology),
  );
};
const activeResearchFor = (state: GameState) => {
  if ((state.autoResearch ?? []).length) return autoResearchTargetFor(state);
  if (!state.researchSelected || !state.currentResearch || state.research.includes(state.currentResearch)) return undefined;
  const technology = technologyMap[state.currentResearch];
  return technology && technologyPrerequisitesMet(state, technology) ? technology : undefined;
};
const scienceRequirementKeysFor = (technology?: TechnologyDefinition) => Array.from(new Set(
  technology?.scienceCosts.map((cost) => keyForSource(cost.pack)) ?? [],
));
const researchUnitsFor = (technology: TechnologyDefinition) => {
  if (technology.count !== undefined) return technology.count;
  if (technology.countFormula) {
    return evaluateResearchCountFormula(technology.countFormula, technologyLevelFor(technology.name)) ?? 1000;
  }
  return 1;
};
const researchUnitsLabelFor = (technology: TechnologyDefinition) => fmt(researchUnitsFor(technology));
const researchProgressFor = (state: GameState, technology: TechnologyDefinition) => {
  if (state.research.includes(technology.name)) return researchUnitsFor(technology);
  const trigger = researchTriggerProgress(state, technology);
  return trigger ? Math.min(trigger.produced, trigger.required) : Math.min(state.researchProgress?.[technology.name] ?? 0, researchUnitsFor(technology));
};
const researchProgressPercentFor = (state: GameState, technology: TechnologyDefinition) => {
  const trigger = researchTriggerProgress(state, technology);
  const total = trigger?.required ?? researchUnitsFor(technology);
  return Math.min(100, Math.max(0, researchProgressFor(state, technology) / Math.max(1, total) * 100));
};
const researchRequirementLabel = (technology: TechnologyDefinition, cost: TechnologyDefinition['scienceCosts'][number]) => {
  const formulaResult = technology.countFormula
    ? evaluateResearchCountFormula(technology.countFormula, technologyLevelFor(technology.name))
    : null;
  const quantity = technology.count
    ? cost.amount * technology.count
    : formulaResult !== null
      ? cost.amount * formulaResult
      : technology.countFormula
        ? `${cost.amount} × ${technology.countFormula}`
        : cost.amount;
  return `${meta[keyForSource(cost.pack)]?.label ?? prettyLabel(cost.pack)} · ${quantity}`;
};
const researchCostAmountFor = (technology: TechnologyDefinition, cost: TechnologyDefinition['scienceCosts'][number]) =>
  cost.amount * researchUnitsFor(technology);
const manualMiningKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal', 'wood'];
const burnerMinerKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal'];
const burnerMiningDrillRecipe = recipeMap['burner-mining-drill'];
const burnerMiningDrillCost = { gear: 3, ironPlate: 3, stone: 5 };
const burnerMiningDrillCoalPerSecond = 0.25;
const burnerMiningDrillProductionSpeed = 0.35;
const electricMiningDrillRecipe = recipeMap['electric-mining-drill'];
const electricMiningDrillBuildCost = upgradeMap['electric-mining-drill'].newMachineMaterialCost;
const electricMiningDrillPowerKw = upgradeMap['electric-mining-drill'].newMachinePowerDraw;
const electricMiningDrillProductionSpeed = upgradeMap['electric-mining-drill'].newMachineProductionSpeed;
const waterPumpPerSecond = 1200;
const waterPumpBuildSeconds = 3;
const waterPumpBuildCost: BuildMaterialCost[] = [
  { key: 'gear', amount: 2, source: 'products' },
  { key: 'pipe', amount: 3, source: 'products' },
];
const pumpjackRecipe = recipeMap['pumpjack'];
const fueledBurnerMinerKeys: RawKey[] = ['iron', 'copper', 'stone'];
const smeltingRecipeKeys = new Set(['iron-plate', 'copper-plate', 'steel-plate', 'stone-brick']);
const stoneFurnaceRecipe = recipeMap['stone-furnace'];
const steelFurnaceRecipe = recipeMap['steel-furnace'];
const electricFurnaceRecipe = recipeMap['electric-furnace'];
const assemblyMachineOneRecipe = recipeMap['assembling-machine-1'];
const assemblyMachineOneBuildCost = { circuit: 3, gear: 5, ironPlate: 9 };
const assemblyMachineOnePowerKw = 75;
const assemblyMachineOneProductionSpeed = assemblyMachineOneCraftingSpeed;
const oilRefineryRecipe = recipeMap['oil-refinery'];
const chemicalPlantRecipe = recipeMap['chemical-plant'];
const assemblyMachineTwoRecipe = recipeMap['assembling-machine-2'];
const assemblyMachineTwoBuildCost = upgradeMap['assembly-machine-2'].newMachineMaterialCost;
const assemblyMachineTwoPowerKw = upgradeMap['assembly-machine-2'].newMachinePowerDraw;
const assemblyMachineTwoProductionSpeed = upgradeMap['assembly-machine-2'].newMachineProductionSpeed;
const assemblyMachineThreeRecipe = recipeMap['assembling-machine-3'];
const assemblyMachineThreeBuildCost = upgradeMap['assembly-machine-3'].newMachineMaterialCost;
const assemblyMachineThreePowerKw = upgradeMap['assembly-machine-3'].newMachinePowerDraw;
const assemblyMachineThreeProductionSpeed = upgradeMap['assembly-machine-3'].newMachineProductionSpeed;
const labPowerKw = 60;
const storageBoxCapacity = STORAGE_BOX_CAPACITY;
const ironStorageBoxCapacity = STORAGE_IRON_BOX_CAPACITY;
const steelStorageBoxCapacity = STORAGE_STEEL_BOX_CAPACITY;
const fluidStorageBaseCapacity = FLUID_STORAGE_BASE_CAPACITY;
const storageTankCapacity = STORAGE_TANK_CAPACITY;
const storageBoxWoodCost = 2;
const storageBoxBuildSeconds = 1;
const manualMiningSeconds = 2.5;
const boilerRecipe = recipeMap['boiler'];
const steamEngineRecipe = recipeMap['steam-engine'];
const accumulatorRecipe = recipeMap['accumulator'];
const labRecipe = recipeMap['lab'];
const nuclearReactorRecipe = recipeMap['nuclear-reactor'];
const heatExchangerRecipe = recipeMap['heat-exchanger'];
const steamTurbineRecipe = recipeMap['steam-turbine'];
const centrifugeRecipe = recipeMap['centrifuge'];
const uraniumProcessingRecipe = recipeMap['uranium-processing'];
const kovarexRecipe = recipeMap['kovarex-enrichment-process'];
const uraniumFuelCellRecipe = recipeMap['uranium-fuel-cell'];
const nuclearRecipeNames = new Set(['uranium-processing', 'kovarex-enrichment-process', 'uranium-fuel-cell']);
const labResearchSpeedFor = (state: GameState) => labSpeedForLevel(state.labSpeedLevel);
const technologyResearchTimeFor = (technology?: TechnologyDefinition) => Math.max(1, technology?.time ?? defaultTechnologyResearchTime);
const boilerSteamPerSecond = 60;
const boilerCoalPerSecond = 0.45;
const boilerWaterPerSecond = 6;
const steamEngineSteamPerSecond = 30;
const steamEnginePowerMw = 0.9;
const nuclearFuelCellPerSecond = 1 / 200;
const nuclearHeatPerReactorPerSecond = 120_000;
const heatExchangerHeatPerSecond = 10_000;
const heatExchangerWaterPerSecond = 10.3;
const heatExchangerSteamPerSecond = 103;
const steamTurbineSteamPerSecond = 60;
const steamTurbinePowerMw = 5.82;
const solarPanelBasePowerKw = 60;
const solarPanelEfficiencyBaseline = 0.5;
const solarPanelAccumulatorRequirement = 21 / 25;
const accumulatorCountFor = (state: GameState) => Math.max(0, state.accumulators);
const requiredSolarAccumulatorsFor = (state: GameState) => Math.ceil(state.solarPanels * solarPanelAccumulatorRequirement);
const solarPanelEfficiencyFor = (state: GameState) => {
  const required = requiredSolarAccumulatorsFor(state);
  if (required <= 0) return solarPanelEfficiencyBaseline;
  return Math.min(1, solarPanelEfficiencyBaseline + accumulatorCountFor(state) / required * solarPanelEfficiencyBaseline);
};
const boilerBuildCost = [{ key: 'stone', amount: 5, source: 'raw' as const }, { key: 'pipe', amount: 4, source: 'products' as const }];
const steamEngineBuildCost = [{ key: 'gear', amount: 8, source: 'products' as const }, { key: 'pipe', amount: 5, source: 'products' as const }, { key: 'ironPlate', amount: 10, source: 'products' as const }];
const storageTankRecipe = recipeMap['storage-tank'];
const materialAmount = (material: RecipeMaterial) => {
  const base = material.amount ?? ((material.amountMin ?? 0) + (material.amountMax ?? material.amountMin ?? 0)) / 2;
  const probability = material.probability ?? (material.sharedProbability ? material.sharedProbability.max - material.sharedProbability.min : 1);
  return base * probability;
};
const recipeInputs = (recipe: Recipe) => {
  const inputs: Record<string, number> = {};
  recipe.ingredients.forEach((material) => {
    const key = keyForSource(material.name);
    inputs[key] = (inputs[key] ?? 0) + materialAmount(material);
  });
  return inputs as Partial<Record<TrackedKey, number>>;
};
const recipeFuelInputs = (recipe: Recipe) => {
  if (!recipe.fuel) return {} as Partial<Record<TrackedKey, number>>;
  return { [keyForSource(recipe.fuel.name)]: materialAmount(recipe.fuel) } as Partial<Record<TrackedKey, number>>;
};
const automatedRecipeInputs = (recipe: Recipe) => {
  const inputs = { ...recipeInputs(recipe) };
  Object.entries(recipeFuelInputs(recipe)).forEach(([key, amount]) => { inputs[key] = (inputs[key] ?? 0) + (amount ?? 0); });
  return inputs;
};
const isSmeltingRecipe = (recipe: Recipe) => smeltingRecipeKeys.has(recipe.name) && recipe.category === 'smelting';
const isOilRefineryRecipe = (recipe?: Recipe) => Boolean(recipe && (recipe.name === 'basic-oil-processing' || recipe.name === 'advanced-oil-processing'));
const chemicalPlantRecipeKeys = new Set<string>(chemicalPlantRecipeNames);
const isChemicalPlantRecipe = (recipe?: Recipe) => Boolean(recipe && chemicalPlantRecipeKeys.has(recipe.name));
const isCentrifugeRecipe = (recipe?: Recipe) => recipe?.category === 'centrifuging';
const furnaceCraftingSpeedFor = (state: GameState) => state.furnaceVariant === 'electric-furnace'
  ? electricFurnaceCraftingSpeed
  : state.furnaceVariant === 'steel-furnace' ? steelFurnaceCraftingSpeed : 1;
const furnaceFuelMultiplierFor = (state: GameState) => state.furnaceVariant === 'electric-furnace' ? 0 : state.furnaceVariant === 'steel-furnace' ? 0.5 : 1;
const automatedRecipeInputsFor = (state: GameState, recipe: Recipe) => {
  const inputs = automatedRecipeInputs(recipe);
  if (isSmeltingRecipe(recipe) && inputs.coal) inputs.coal *= furnaceFuelMultiplierFor(state);
  return inputs;
};
const furnaceLabelFor = (state: GameState) => state.furnaceVariant === 'electric-furnace' ? 'Electric Furnace' : state.furnaceVariant === 'steel-furnace' ? 'Steel Furnace' : 'Stone Furnace';
const furnaceBuildRecipeFor = (state: GameState) => state.furnaceVariant === 'electric-furnace' ? electricFurnaceRecipe : state.furnaceVariant === 'steel-furnace' ? steelFurnaceRecipe : stoneFurnaceRecipe;
const productionBuildingFor = (state: GameState, recipe: Recipe) => recipe.name === 'space-science-pack' ? 'rocket-silo' : isSmeltingRecipe(recipe) ? state.furnaceVariant : isOilRefineryRecipe(recipe) ? 'oil-refinery' : isChemicalPlantRecipe(recipe) ? 'chemical-plant' : isCentrifugeRecipe(recipe) ? 'centrifuge' : state.machineVariants.assembly;
const recipeOutputs = (recipe: Recipe) => recipe.results.map((material) => ({ key: keyForSource(material.name), amount: materialAmount(material), source: material }));
const trackedKeys: TrackedKey[] = Array.from(new Set([
  ...rawKeys,
  ...recipeCatalog.flatMap((recipe) => [...recipe.ingredients, ...recipe.results].map((material) => keyForSource(material.name))),
  ...technologyCatalog.flatMap((technology) => technology.scienceCosts.map((cost) => keyForSource(cost.pack))),
]));
const fluidKeys = new Set<TrackedKey>([
  'water',
  'crudeOil',
  ...recipeCatalog.flatMap((recipe) => [...recipe.ingredients, ...recipe.results].filter((material) => material.type === 'fluid').map((material) => keyForSource(material.name))),
]);
const sciencePackKeys = new Set<TrackedKey>(['automationPack', 'logisticsPack', 'chemicalPack', 'militaryPack', 'productionPack', 'utilityPack', 'spacePack']);
const totalSciencePacksProducedFor = (produced: Record<string, number>) => Array.from(sciencePackKeys)
  .reduce((total, key) => total + (produced[key] ?? 0), 0);
const isFluidKey = (key: TrackedKey) => fluidKeys.has(key);
const initialStorageState = createInitialStorageState(trackedKeys, fluidKeys);
const emptyRateRecord = () => Object.fromEntries(trackedKeys.map((key) => [key, 0])) as Record<TrackedKey, number>;
const tierProductOrder = new Map(tierProductCatalog.map((product, index) => [keyForSource(product.sourceName), index]));
const tierForProduct = (key: string) => tierProductOrder.get(key) ?? Number.MAX_SAFE_INTEGER;
const tierOrderedTrackedKeys = [...trackedKeys].sort((a, b) => tierForProduct(a) - tierForProduct(b) || a.localeCompare(b));
const orderedTrackedKeys = tierOrderedTrackedKeys;
const recipeProductKeysForDisplay = (recipe: Recipe) => recipeOutputs(recipe)
  .map((output) => output.key)
  .sort((a, b) => tierForProduct(a) - tierForProduct(b));
const orderedRecipeCatalog = prioritizeDisplayOrder(recipeCatalog, recipeProductKeysForDisplay, orderedTrackedKeys);
type IngredientNavigationTarget = { href: '/mining' | '/production' | '/power'; targetId: string };
const ingredientNavigationFor = (key: TrackedKey): IngredientNavigationTarget | null => {
  if (rawKeys.includes(key as RawKey)) return { href: '/mining', targetId: `mining-${key}` };
  const producer = orderedRecipeCatalog.find((recipe) => recipe.results.some((material) => keyForSource(material.name) === key));
  return producer
    ? nuclearRecipeNames.has(producer.name)
      ? { href: '/power', targetId: `power-nuclear-${producer.name}` }
      : { href: '/production', targetId: `production-${producer.name}` }
    : null;
};
const scienceKeyForRecipe = Object.fromEntries(
  Object.entries(scienceRecipeKeys).map(([key, recipeName]) => [recipeName, key]),
) as Record<string, ScienceKey>;
const scienceKeys: ScienceKey[] = orderedRecipeCatalog
  .map((recipe) => scienceKeyForRecipe[recipe.name])
  .filter((key): key is ScienceKey => Boolean(key));
const coreTrackedKeys = new Set(recipeCatalog.filter((recipe) => recipe.scienceChain === 'Core').flatMap((recipe) => [
  ...recipe.ingredients,
  ...recipe.results,
  ...(recipe.fuel ? [recipe.fuel] : []),
].map((material) => keyForSource(material.name))));
coreTrackedKeys.add('wood');
coreTrackedKeys.add('concrete');
const deferredSpaceScienceTrackedKeys = new Set<TrackedKey>(['radar', 'solar-panel', 'accumulator']);
const spaceScienceUnlockedFor = (state: GameState) => state.research.includes('space-science-pack');
const trackedScienceChainFor = (key: TrackedKey, state: GameState): RecipeScienceChain =>
  deferredSpaceScienceTrackedKeys.has(key) && !spaceScienceUnlockedFor(state)
    ? 'Non-Core'
    : coreTrackedKeys.has(key) ? 'Core' : 'Non-Core';
const recipeUnlockResearch: Record<string, string[]> = {};
technologyCatalog.forEach((technology) => technology.effects.forEach((effect) => {
  if (effect.type === 'unlock-recipe' && effect.recipe) recipeUnlockResearch[effect.recipe] = [...(recipeUnlockResearch[effect.recipe] ?? []), technology.name];
}));
const rawProductIsUnlocked = (key: string, state: GameState) => key !== 'water' && key !== 'uranium' && key !== 'crudeOil'
  || key === 'water' && state.research.includes('steam-power')
  || key === 'uranium' && state.research.includes('uranium-mining')
  || key === 'crudeOil' && state.research.includes('oil-gathering');
const recipeIsUnlocked = (recipe: Recipe, state: GameState) => recipe.name === 'advanced-oil-processing'
  ? state.oilProcessingAdvanced
  : recipe.name === 'basic-oil-processing'
    ? !state.oilProcessingAdvanced && (recipeUnlockResearch[recipe.name] ?? []).some((technology) => state.research.includes(technology))
    : recipe.name === 'space-science-pack'
      ? state.research.includes('space-science-pack')
    : recipe.enabled || (recipeUnlockResearch[recipe.name] ?? []).some((technology) => state.research.includes(technology));
const unlockedProductKeys = (state: GameState) => new Set([
  ...rawKeys.filter((key) => rawProductIsUnlocked(key, state)),
  ...recipeCatalog.filter((recipe) => recipeIsUnlocked(recipe, state)).flatMap((recipe) => recipeOutputs(recipe).map((output) => output.key)),
]);
const labelOverrides: Record<string, string> = {
  'ai-powered-infinite-research': 'AI-Powered Infinite Research',
  'solid-fuel-from-petroleum-gas': 'Solid Fuel',
};
const prettyLabel = (key: string) => labelOverrides[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const baseMeta: Record<string, { label: string; short: string; color: string; category: string }> = {
  iron: { label: 'Iron ore', short: 'iron', color: '#bd7b45', category: 'Raw' }, copper: { label: 'Copper ore', short: 'copper', color: '#dc9361', category: 'Raw' },
  stone: { label: 'Stone', short: 'stone', color: '#9ba6a4', category: 'Raw' }, coal: { label: 'Coal', short: 'coal', color: '#929aaa', category: 'Fuel' },
  wood: { label: 'Wood', short: 'wood', color: '#b9996b', category: 'Raw' }, water: { label: 'Water', short: 'water', color: '#65afba', category: 'Fluid' },
  uranium: { label: 'Uranium ore', short: 'uranium', color: '#92c86b', category: 'Raw' }, crudeOil: { label: 'Crude oil', short: 'crude oil', color: '#9b7653', category: 'Raw' }, ironPlate: { label: 'Iron plates', short: 'Fe plate', color: '#c9d3d0', category: 'Component' },
  copperPlate: { label: 'Copper plates', short: 'Cu plate', color: '#e6a067', category: 'Component' }, steel: { label: 'Steel', short: 'steel', color: '#aabac3', category: 'Component' },
  gear: { label: 'Gears', short: 'gear', color: '#dfb05c', category: 'Component' }, pipe: { label: 'Pipes', short: 'pipe', color: '#8da8a7', category: 'Component' },
  circuit: { label: 'Circuits', short: 'circuit', color: '#54b8a8', category: 'Component' }, automationPack: { label: 'Automation science', short: 'automation', color: '#df7165', category: 'Science' },
  logisticsPack: { label: 'Logistics science', short: 'logistics', color: '#d6a04f', category: 'Science' },
  chemicalPack: { label: 'Chemical science', short: 'chemical', color: '#7bc4a8', category: 'Science' },
  militaryPack: { label: 'Military science', short: 'military', color: '#d96f68', category: 'Science' },
  productionPack: { label: 'Production science', short: 'production', color: '#8ea9db', category: 'Science' },
  utilityPack: { label: 'Utility science', short: 'utility', color: '#d6c06a', category: 'Science' },
  spacePack: { label: 'Space science', short: 'space', color: '#9b8de3', category: 'Science' },
};
const meta: Record<TrackedKey, { label: string; short: string; color: string; category: string }> = Object.fromEntries(trackedKeys.map((key, index) => {
  const fallback = { label: prettyLabel(key), short: key, color: ['#c9d3d0', '#e6a067', '#8da8a7', '#dfb05c', '#54b8a8', '#8ea9db'][index % 6], category: 'Component' };
  return [key, baseMeta[key] ?? fallback];
}));
const solarPanelRecipe = recipeMap['solar-panel'];
const recipeBuildCosts = (recipe: Recipe): BuildMaterialCost[] => Object.entries(recipeInputs(recipe)).map(([key, amount]) => ({
  key,
  amount: amount ?? 0,
  source: rawKeys.includes(key as RawKey) ? 'raw' : 'products',
}));
const legacyUpgradeCostsFor = (item: QueueItem): BuildMaterialCost[] | undefined => {
  if (item.action !== 'upgrade' || item.costs?.length || !item.targetId || !item.machineCount || item.machineCount <= 0) return undefined;
  if (item.targetId === 'assembly-machine-2' || item.targetId === 'assembly-machine-3' || item.targetId === 'electric-mining-drill') {
    const upgrade = upgradeMap[item.targetId];
    return scaledBuildCosts(upgrade.upgradeCostPerMachine, item.machineCount);
  }
  if (item.targetId === 'iron-chests') {
    return [{ key: 'ironPlate', amount: ironChestUpgradeCostFor(item.machineCount), source: 'products' }];
  }
  if (item.targetId === 'steel-chests') {
    return [{ key: 'steel', amount: steelChestUpgradeCostFor(item.machineCount), source: 'products' }];
  }
  if (item.targetId === 'steel-furnaces') {
    return scaledBuildCosts(recipeBuildCosts(steelFurnaceRecipe), item.machineCount);
  }
  if (item.targetId === ELECTRIC_FURNACE_UPGRADE_ID) {
    return scaledBuildCosts(electricFurnaceUpgradeCostPerFurnace, item.machineCount);
  }
  return undefined;
};
const rocketSiloRecipe = recipeMap['rocket-silo'];
const rocketPartRecipe = recipeMap['rocket-part'];
const rocketSiloBuildCost: BuildMaterialCost[] = recipeBuildCostsForRocket(rocketSiloRecipe);
const rocketPartBuildCost: BuildMaterialCost[] = recipeBuildCostsForRocket(rocketPartRecipe);
const rocketPartBatchCost: BuildMaterialCost[] = scaleRocketCosts(rocketPartBuildCost, ROCKET_PART_TARGET);
const solarPanelBuildCost = recipeBuildCosts(solarPanelRecipe);
const accumulatorBuildCost = recipeBuildCosts(accumulatorRecipe);
const pumpjackBuildCost = recipeBuildCosts(pumpjackRecipe);
const storageTankBuildCost = recipeBuildCosts(storageTankRecipe);
const missingBuildMaterials = (state: GameState, costs: BuildMaterialCost[]) => costs
  .map(({ key, amount, source }) => ({ key, missing: Math.max(0, amount - ((state[source] as Record<string, number>)[key] ?? 0)) }))
  .filter(({ missing }) => missing > 0)
  .map(({ key, missing }) => `${Number.isInteger(missing) ? fmt(missing) : missing.toFixed(2)} ${meta[key]?.label.toLowerCase() ?? prettyLabel(key).toLowerCase()}`)
  .join(' + ');
const starterProducts: Record<string, number> = {
  ...Object.fromEntries(trackedKeys.map((key) => [key, 0])),
  ironPlate: 17, gear: 5,
};

const initialTimestamp = Date.now();
const initialState: GameState = {
  raw: { iron: 0, copper: 0, stone: 10, coal: 0, wood: 0, water: 0, uranium: 0, crudeOil: 0 },
  products: starterProducts,
  storage: initialStorageState.storage as Record<TrackedKey, number>,
  storageBoxes: initialStorageState.storageBoxes as Record<TrackedKey, number>,
  storageTanks: initialStorageState.storageTanks as Record<TrackedKey, number>,
  storageBoxType: 'wooden',
  miners: { iron: 0, copper: 0, stone: 0, coal: 0, wood: 0, water: 0, uranium: 0, crudeOil: 0 },
  pumps: 0, pumpjacks: 0, uraniumMiners: 0,
  assemblers: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  oilProcessingAdvanced: false,
  labs: 0, boilers: 0, boilersEnabled: true, steamEngines: 0, solarPanels: 0, accumulators: 0, nuclearReactors: 0, heatExchangers: 0, steamTurbines: 0, miningProgress: Object.fromEntries(rawKeys.map((key) => [key, 0])) as Record<RawKey, number>,
  assemblyProgress: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labProgress: 0, handcraft: null, manualMining: null, queue: [], research: [], currentResearch: null, researchSelected: false, researchProgress: {}, autoResearch: [], researchNotifications: [], milestoneNotifications: [], unlockedMilestones: [], produced: Object.fromEntries(trackedKeys.map((key) => [key, 0])), manualOutputEvents: Object.fromEntries(trackedKeys.map((key) => [key, 0])), pausedRecipes: {}, pausedMining: Object.fromEntries(rawKeys.map((key) => [key, false])) as Record<RawKey, boolean>, constructionBatchSize: 1, rateHistory: [], machineVariants: { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' }, furnaceVariant: 'stone-furnace', labSpeedLevel: 0, workerRobotSpeedLevel: 0,
  totalOutput: 1642, lastSeen: initialTimestamp, gameStartTimestamp: initialTimestamp, sessionId: sessionIdForStartTimestamp(initialTimestamp), simulationSpeed: 1, rocketSiloBuilt: false, rocketPartsBuilt: 0, rocketReadyAcknowledged: false, rocketLaunched: false, gameComplete: false, completionTotalOutput: null, completionStats: null, winMetrics: null, tutorialVisible: true, welcomeSeen: false,
};

const nav = [
  ['factory', '/', Gauge], ['mining', '/mining', Pickaxe], ['production', '/production', Cog], ['power', '/power', Zap],
  ['storage', '/storage', Box], ['logistics', '/logistics', MoveRight], ['upgrades', '/upgrades', TrendingUp], ['science', '/science', FlaskConical],
  ['research', '/research', Layers3], ['settings', '/settings', Settings2],
] as const;
const tabLabel = (key: string) => key === 'factory' ? 'Dashboard' : key === 'mining' ? 'Mining / Raw' : key.charAt(0).toUpperCase() + key.slice(1);
const routePathFor = (location: string) => location.split(/[?#]/, 1)[0];
const focusTargetForSearch = (search: string) => new URLSearchParams(search).get('focus');

const rawInfo: Record<RawKey, { label: string; description: string; research?: ResearchKey; needs?: string }> = {
  iron: { label: 'Iron', description: 'Reliable ferrous feedstock for the first production tier.' },
  copper: { label: 'Copper', description: 'Conductive ore for plates and circuit work.' },
  stone: { label: 'Stone', description: 'Bulk aggregate for foundations and early construction.' },
  coal: { label: 'Coal', description: 'Dense fuel for boilers and high-heat processing.' },
  wood: { label: 'Wood', description: 'Manual-start biomass for early structures.' },
  water: { label: 'Water', description: 'Pumped fluid required to turn heat into power.', research: 'steam-power', needs: 'Steam Power' },
  uranium: { label: 'Uranium', description: 'Dense fuel for the late-stage reactor chain.', research: 'uranium-mining', needs: 'Uranium Mining' },
  crudeOil: { label: 'Crude oil', description: 'Raw hydrocarbon feedstock for refining and the chemical chain.', research: 'oil-gathering', needs: 'Oil Gathering' },
};

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');
const storedQuantityFlashDurationMs = 400;
const duration = (n: number) => `${Math.floor(n / 60)}m ${String(Math.max(0, Math.floor(n % 60))).padStart(2, '0')}s`;
const containerCountFor = (state: GameState, key: TrackedKey) => calculateStorageContainerCountFor(key, fluidKeys, state.storageBoxes, state.storageTanks);
const storageBoxCapacityFor = (state: GameState) => state.storageBoxType === 'wooden'
  ? storageBoxCapacity
  : state.storageBoxType === 'steel'
    ? steelStorageBoxCapacity
    : ironStorageBoxCapacity;
const storageBoxCountFor = (state: GameState) => itemStorageBoxCountFor(
  trackedKeys.filter((key) => unlockedProductKeys(state).has(key)),
  fluidKeys,
  state.storageBoxes,
);
const storageCapacityFor = (state: GameState, key: TrackedKey) => calculateStorageCapacityFor(key, fluidKeys, state.storageBoxes, state.storageTanks, storageBoxCapacityFor(state));
const capFor = (state: GameState, key: TrackedKey) => Math.floor(state.storage[key] ?? storageCapacityFor(state, key));
const burnerMinerCount = (state: GameState) => burnerMinerKeys.reduce((total, key) => total + state.miners[key], 0);
const electricAssemblerCount = (state: GameState) => Object.entries(state.assemblers).reduce((total, [recipeKey, count]) => total + (recipeMap[recipeKey] && !isSmeltingRecipe(recipeMap[recipeKey]) && !isOilRefineryRecipe(recipeMap[recipeKey]) && !isChemicalPlantRecipe(recipeMap[recipeKey]) && !isCentrifugeRecipe(recipeMap[recipeKey]) ? count : 0), 0);
const oilRefineryCountFor = (state: GameState) => (state.assemblers['basic-oil-processing'] ?? 0) + (state.assemblers['advanced-oil-processing'] ?? 0);
const chemicalPlantCountFor = (state: GameState) => chemicalPlantRecipeNames.reduce((total, recipeKey) => total + (state.assemblers[recipeKey] ?? 0), 0);
const centrifugeCountFor = (state: GameState) => Object.entries(state.assemblers).reduce((total, [recipeKey, count]) => total + (recipeMap[recipeKey] && isCentrifugeRecipe(recipeMap[recipeKey]) ? count : 0), 0);
const smeltingFurnaceCountFor = (state: GameState) => Array.from(smeltingRecipeKeys).reduce((total, recipeKey) => total + (state.assemblers[recipeKey] ?? 0), 0);
const productionUnitCount = (state: GameState) => Object.values(state.assemblers).reduce((total, count) => total + count, 0);
const assemblyMachineProductionSpeedFor = (state: GameState, recipe?: Recipe) => isCentrifugeRecipe(recipe)
  ? centrifugeCraftingSpeed
  : isOilRefineryRecipe(recipe)
    ? oilRefineryCraftingSpeed
  : isChemicalPlantRecipe(recipe)
    ? chemicalPlantCraftingSpeed
    : state.machineVariants.assembly === 'assembling-machine-3'
      ? assemblyMachineThreeProductionSpeed
      : state.machineVariants.assembly === 'assembling-machine-2'
        ? assemblyMachineTwoProductionSpeed
        : assemblyMachineOneProductionSpeed;
const assemblyMachinePowerFor = (state: GameState, recipe?: Recipe) => isCentrifugeRecipe(recipe)
  ? centrifugePowerKw
  : isOilRefineryRecipe(recipe)
    ? oilRefineryPowerKw
  : isChemicalPlantRecipe(recipe)
    ? chemicalPlantPowerKw
    : state.machineVariants.assembly === 'assembling-machine-3'
      ? assemblyMachineThreePowerKw
      : state.machineVariants.assembly === 'assembling-machine-2'
        ? assemblyMachineTwoPowerKw
        : assemblyMachineOnePowerKw;
const miningMachineProductionSpeedFor = (state: GameState) => state.machineVariants.mining === 'electric-mining-drill' ? electricMiningDrillProductionSpeed : burnerMiningDrillProductionSpeed;
const miningMachinePowerFor = (state: GameState) => state.machineVariants.mining === 'electric-mining-drill' ? electricMiningDrillPowerKw : 0;
const miningUsesStoredCoal = (state: GameState) => state.machineVariants.mining !== 'electric-mining-drill';
const fueledBurnerMinerCount = (state: GameState) => miningUsesStoredCoal(state)
  ? fueledBurnerMinerKeys.reduce((total, key) => total + (miningPausedFor(state, key) || !burnerMinerNeedsFuel(state.raw[key], capFor(state, key), demandRateFor(state, key)) ? 0 : state.miners[key]), 0)
  : 0;
const burnerMinerCoalRate = (state: GameState) => fueledBurnerMinerCount(state) * burnerMiningDrillCoalPerSecond;
const powerFlowFor = (state: GameState, seconds = 1) => calculatePowerFlow({
  boilers: state.boilers,
  steamEngines: state.steamEngines,
  coal: state.raw.coal,
  water: state.raw.water,
  seconds,
  simulationSpeed: state.simulationSpeed,
  boilersEnabled: state.boilersEnabled,
  steamPowerUnlocked: state.research.includes('steam-power'),
  boilerSteamPerSecond,
  boilerCoalPerSecond,
  boilerWaterPerSecond,
  steamEngineSteamPerSecond,
  steamEnginePowerMw,
});
const nuclearPowerFlowFor = (state: GameState, seconds = 1): NuclearPowerFlow => calculateNuclearPowerFlow({
  nuclearReactors: state.nuclearReactors,
  heatExchangers: state.heatExchangers,
  steamTurbines: state.steamTurbines,
  uraniumFuelCells: quantityFor(state, 'uranium-fuel-cell'),
  water: state.raw.water,
  seconds,
  simulationSpeed: state.simulationSpeed,
  nuclearPowerUnlocked: state.research.includes('nuclear-power'),
  fuelCellPerSecond: nuclearFuelCellPerSecond,
  heatPerReactorPerSecond: nuclearHeatPerReactorPerSecond,
  heatPerExchangerPerSecond: heatExchangerHeatPerSecond,
  waterPerExchangerPerSecond: heatExchangerWaterPerSecond,
  nuclearSteamPerExchangerPerSecond: heatExchangerSteamPerSecond,
  steamPerTurbinePerSecond: steamTurbineSteamPerSecond,
  turbinePowerMw: steamTurbinePowerMw,
});
const boilerPeakSteamRateFor = (state: GameState) => state.research.includes('steam-power') && state.boilersEnabled ? state.boilers * boilerSteamPerSecond * 60 * state.simulationSpeed : 0;
const boilerPeakCoalUsageFor = (state: GameState) => state.research.includes('steam-power') && state.boilersEnabled ? state.boilers * boilerCoalPerSecond * 60 * state.simulationSpeed : 0;
const boilerPeakWaterUsageFor = (state: GameState) => state.research.includes('steam-power') && state.boilersEnabled ? state.boilers * boilerWaterPerSecond * 60 * state.simulationSpeed : 0;
const boilerSteamRateFor = (state: GameState) => powerFlowFor(state).steamProduced * 60;
const boilerCoalUsageFor = (state: GameState) => powerFlowFor(state).boilerCoalConsumed * 60;
const boilerWaterUsageFor = (state: GameState) => powerFlowFor(state).boilerWaterConsumed * 60;
const boilerOperatingRatioFor = (state: GameState) => powerFlowFor(state).boilerInputRatio;
const steamEnginePeakSteamUsageFor = (state: GameState) => state.research.includes('steam-power') ? state.steamEngines * steamEngineSteamPerSecond * 60 * state.simulationSpeed : 0;
const steamEngineSteamUsageFor = (state: GameState) => powerFlowFor(state).steamConsumed * 60;
const steamEnginePeakPowerFor = (state: GameState) => state.research.includes('steam-power') ? state.steamEngines * steamEnginePowerMw * state.simulationSpeed : 0;
const solarPanelPotentialPowerKwFor = (state: GameState) => state.research.includes('solar-energy') ? state.solarPanels * solarPanelBasePowerKw * state.simulationSpeed : 0;
const solarPanelNetPowerKwFor = (state: GameState) => solarPanelPotentialPowerKwFor(state) * solarPanelEfficiencyFor(state);
const solarPowerFor = (state: GameState) => solarPanelNetPowerKwFor(state) / 1000;
const nuclearPowerFor = (state: GameState, seconds = 1) => nuclearPowerFlowFor(state, seconds).powerGeneratedMw / Math.max(0.0001, seconds);
const nuclearPeakPowerFor = (state: GameState) => state.research.includes('nuclear-power') ? state.steamTurbines * steamTurbinePowerMw * state.simulationSpeed : 0;
const powerProductionFor = (state: GameState, seconds = 1) => powerFlowFor(state, seconds).powerGeneratedMw / Math.max(0.0001, seconds) + solarPowerFor(state) + nuclearPowerFor(state, seconds);
const electricPowerDraw = (state: GameState) => {
  const assemblerPower = Object.entries(state.assemblers).reduce((total, [recipeKey, count]) => {
    const recipe = recipeMap[recipeKey];
    return total + (recipe && !isSmeltingRecipe(recipe) && !recipePausedFor(state, recipeKey) ? count * assemblyMachinePowerFor(state, recipe) : 0);
  }, 0);
  const activeSmeltingFurnaceCount = Array.from(smeltingRecipeKeys).reduce((total, recipeKey) => total + (recipePausedFor(state, recipeKey) ? 0 : state.assemblers[recipeKey] ?? 0), 0);
  const furnacePower = state.furnaceVariant === 'electric-furnace' ? activeSmeltingFurnaceCount * electricFurnacePowerKw : 0;
  const activeElectricMinerCount = burnerMinerKeys.reduce((total, key) => total + (miningPausedFor(state, key) ? 0 : state.miners[key]), 0);
  const miningPower = state.machineVariants.mining === 'electric-mining-drill' ? activeElectricMinerCount * miningMachinePowerFor(state) : 0;
  return (state.labs * labPowerKw + assemblerPower + furnacePower + miningPower) / 1000;
};
const electricPowerRatioFor = (state: GameState, seconds = 1) => {
  const required = electricPowerDraw(state);
  return required > 0 ? Math.min(1, powerProductionFor(state, seconds) / required) : 1;
};
const powerLabel = (value: number) => Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
const totalUnits = (state: GameState) => burnerMinerCount(state) + state.pumps + state.pumpjacks + state.uraniumMiners + productionUnitCount(state) + state.labs + state.boilers + state.steamEngines + state.solarPanels + state.accumulators;
const machineCountForUpgrade = (state: GameState, upgrade: UpgradeDefinition) => upgradeMachineCountFor({ assembly: electricAssemblerCount(state), mining: burnerMinerCount(state) }, upgrade, state.labs);
const miningMachineLabelFor = (state: GameState) => state.machineVariants.mining === 'electric-mining-drill' ? 'Electric Miner' : 'Burner Mining Drill';
const miningMachineRecipeFor = (state: GameState) => state.machineVariants.mining === 'electric-mining-drill' ? electricMiningDrillRecipe : burnerMiningDrillRecipe;
const miningMachineCountFor = (state: GameState, key: RawKey) => key === 'wood' ? 0 : key === 'water' ? state.pumps : key === 'crudeOil' ? state.pumpjacks : key === 'uranium' ? state.uraniumMiners : state.miners[key];
const miningOutputPerSecondFor = (key: RawKey) => key === 'uranium' ? 0.32 : key === 'water' ? waterPumpPerSecond : key === 'crudeOil' ? 50 : key === 'copper' ? 0.88 : 1;
const miningMachineBuildCostFor = (state: GameState): BuildMaterialCost[] => state.machineVariants.mining === 'electric-mining-drill'
  ? electricMiningDrillBuildCost
  : [{ key: 'gear', amount: burnerMiningDrillCost.gear, source: 'products' }, { key: 'ironPlate', amount: burnerMiningDrillCost.ironPlate, source: 'products' }, { key: 'stone', amount: burnerMiningDrillCost.stone, source: 'raw' }];
const productionMachineLabelFor = (state: GameState, recipe?: Recipe) => recipe?.name === 'space-science-pack'
  ? 'Rocket Silo'
  : isOilRefineryRecipe(recipe)
    ? 'Oil Refinery'
    : isChemicalPlantRecipe(recipe)
      ? 'Chemical Plant'
      : isCentrifugeRecipe(recipe)
        ? 'Centrifuge'
      : state.machineVariants.assembly === 'assembling-machine-3'
        ? 'Assembly Machine 3'
        : state.machineVariants.assembly === 'assembling-machine-2'
          ? 'Assembly Machine 2'
          : 'Assembly Machine 1';
const productionMachineRecipeFor = (state: GameState, recipe?: Recipe) => recipe?.name === 'space-science-pack'
  ? rocketSiloRecipe
  : isOilRefineryRecipe(recipe)
    ? oilRefineryRecipe
    : isChemicalPlantRecipe(recipe)
      ? chemicalPlantRecipe
      : isCentrifugeRecipe(recipe)
        ? centrifugeRecipe
      : state.machineVariants.assembly === 'assembling-machine-3'
        ? assemblyMachineThreeRecipe
        : state.machineVariants.assembly === 'assembling-machine-2'
          ? assemblyMachineTwoRecipe
          : assemblyMachineOneRecipe;
const productionMachineBuildCostFor = (state: GameState, recipe?: Recipe): BuildMaterialCost[] => recipe?.name === 'space-science-pack'
  ? rocketSiloBuildCost
  : isOilRefineryRecipe(recipe) || isChemicalPlantRecipe(recipe)
  ? recipeBuildCosts(isOilRefineryRecipe(recipe) ? oilRefineryRecipe : chemicalPlantRecipe)
  : isCentrifugeRecipe(recipe)
    ? recipeBuildCosts(centrifugeRecipe)
  : state.machineVariants.assembly === 'assembling-machine-3'
    ? assemblyMachineThreeBuildCost
    : state.machineVariants.assembly === 'assembling-machine-2'
      ? assemblyMachineTwoBuildCost
      : [{ key: 'circuit', amount: assemblyMachineOneBuildCost.circuit, source: 'products' }, { key: 'gear', amount: assemblyMachineOneBuildCost.gear, source: 'products' }, { key: 'ironPlate', amount: assemblyMachineOneBuildCost.ironPlate, source: 'products' }];
const productionMachineLoadLabelFor = (state: GameState) => [oilRefineryCountFor(state), chemicalPlantCountFor(state), centrifugeCountFor(state), electricAssemblerCount(state)].filter((count) => count > 0).length > 1
  ? 'Mixed production'
  : chemicalPlantCountFor(state) > 0
    ? 'Chemical Plant'
    : oilRefineryCountFor(state) > 0
    ? 'Oil Refinery'
    : centrifugeCountFor(state) > 0
    ? 'Centrifuge'
    : productionMachineLabelFor(state);
const productionMachineLoadDetailFor = (state: GameState) => [
  electricAssemblerCount(state) > 0 ? `${assemblyMachinePowerFor(state)} kW assembly` : '',
  oilRefineryCountFor(state) > 0 ? `${oilRefineryPowerKw} kW per Oil Refinery` : '',
  chemicalPlantCountFor(state) > 0 ? `${chemicalPlantPowerKw} kW per Chemical Plant` : '',
  centrifugeCountFor(state) > 0 ? `${centrifugePowerKw} kW per Centrifuge` : '',
].filter(Boolean).join(' · ') || `${assemblyMachinePowerFor(state)} kW per assembly machine`;
const quantityFor = (state: GameState, key: TrackedKey) => rawKeys.includes(key as RawKey) ? state.raw[key as RawKey] : state.products[key] ?? 0;
const recipePausedFor = (state: GameState, recipeKey: string) => state.pausedRecipes?.[recipeKey] === true;
const miningPausedFor = (state: GameState, key: RawKey) => state.pausedMining?.[key] === true;
const hasInputs = (state: GameState, inputs: Partial<Record<TrackedKey, number>>) => Object.entries(inputs).every(([key, value]) => quantityFor(state, key) >= (value ?? 0));
const spendInputs = (state: GameState, inputs: Partial<Record<TrackedKey, number>>, consumption?: Record<TrackedKey, number>) => {
  Object.entries(inputs).forEach(([key, value]) => {
    if (rawKeys.includes(key as RawKey)) state.raw[key as RawKey] -= value ?? 0;
    else state.products[key] = (state.products[key] ?? 0) - (value ?? 0);
    if (consumption) consumption[key] = (consumption[key] ?? 0) + (value ?? 0);
  });
};
const addTracked = (state: GameState, key: TrackedKey, amount: number, ignoreCapacity = false) => {
  const reserved = fulfillConstructionReservation(state.queue, key, amount, rawKeys.includes(key as RawKey) ? 'raw' : 'products');
  const available = amount - reserved;
  if (available <= 0) return reserved;
  if (rawKeys.includes(key as RawKey)) {
    const current = state.raw[key as RawKey];
    state.raw[key as RawKey] = ignoreCapacity ? current + available : Math.min(capFor(state, key), current + available);
    return reserved + state.raw[key as RawKey] - current;
  }
  const current = state.products[key] ?? 0;
  state.products[key] = ignoreCapacity ? current + available : Math.min(capFor(state, key), current + available);
  return reserved + state.products[key] - current;
};
const recordProduction = (state: GameState, key: TrackedKey, amount: number, production?: Record<TrackedKey, number>, manualProduction?: Record<TrackedKey, number>) => {
  const firstSpaceSciencePack = key === 'spacePack' && (state.produced[key] ?? 0) <= 0;
  state.produced[key] = (state.produced[key] ?? 0) + amount;
  if (production) production[key] = (production[key] ?? 0) + amount;
  if (manualProduction) manualProduction[key] = (manualProduction[key] ?? 0) + amount;
  if (firstSpaceSciencePack && unlockMilestone(state, 'space-science') && !state.milestoneNotifications.includes('space-science')) {
    state.milestoneNotifications.push('space-science');
  }
  if (totalSciencePacksProducedFor(state.produced) >= SCIENCE_PACKS_MILESTONE_THRESHOLD
    && unlockMilestone(state, 'hundred-science-packs')
    && !state.milestoneNotifications.includes('hundred-science-packs')) {
    state.milestoneNotifications.push('hundred-science-packs');
  }
  if (totalSciencePacksProducedFor(state.produced) >= SCIENCE_PACKS_THOUSAND_MILESTONE_THRESHOLD
    && unlockMilestone(state, 'thousand-science-packs')
    && !state.milestoneNotifications.includes('thousand-science-packs')) {
    state.milestoneNotifications.push('thousand-science-packs');
  }
  if (totalSciencePacksProducedFor(state.produced) >= SCIENCE_PACKS_TEN_THOUSAND_MILESTONE_THRESHOLD
    && unlockMilestone(state, 'ten-thousand-science-packs')
    && !state.milestoneNotifications.includes('ten-thousand-science-packs')) {
    state.milestoneNotifications.push('ten-thousand-science-packs');
  }
  if (totalSciencePacksProducedFor(state.produced) >= SCIENCE_PACKS_HUNDRED_THOUSAND_MILESTONE_THRESHOLD
    && unlockMilestone(state, 'hundred-thousand-science-packs')
    && !state.milestoneNotifications.includes('hundred-thousand-science-packs')) {
    state.milestoneNotifications.push('hundred-thousand-science-packs');
  }
  if (totalSciencePacksProducedFor(state.produced) >= SCIENCE_PACKS_MILLION_MILESTONE_THRESHOLD
    && unlockMilestone(state, 'million-science-packs')
    && !state.milestoneNotifications.includes('million-science-packs')) {
    state.milestoneNotifications.push('million-science-packs');
  }
};
const researchTriggerProgress = (state: GameState, technology: TechnologyDefinition) => {
  const trigger = technology.researchTrigger;
  if (!trigger || !['craft-item', 'construct-item'].includes(trigger.type) || !trigger.item) return null;
  const key = keyForSource(trigger.item);
  return { key, produced: state.produced[key] ?? 0, required: trigger.count ?? 1 };
};
const researchTriggerLabel = (trigger: TechnologyDefinition['researchTrigger']) => {
  if (!trigger) return '';
  const action = trigger.type === 'construct-item'
    ? 'Construct'
    : trigger.type === 'craft-item'
      ? 'Craft'
    : trigger.type === 'send-item-to-orbit'
      ? 'Send to orbit'
      : trigger.type === 'mine-entity'
        ? 'Mine'
        : prettyLabel(trigger.type);
  const item = trigger.item ? prettyLabel(keyForSource(trigger.item)) : trigger.type === 'mine-entity' ? 'an entity' : '';
  const required = trigger.count ?? (trigger.type === 'craft-item' ? 1 : undefined);
  return `${action}${item ? ` ${item}` : ''}${required ? ` · ${fmt(required)} required` : ''}`;
};
const researchTriggerMet = (state: GameState, technology: TechnologyDefinition) => {
  const progress = researchTriggerProgress(state, technology);
  return Boolean(progress && progress.produced >= progress.required);
};
const markResearchComplete = (state: GameState, technology: TechnologyDefinition) => {
  if (state.research.includes(technology.name)) return;
  state.research.push(technology.name);
  if (technology.name.startsWith('worker-robots-speed-')) state.workerRobotSpeedLevel += 1;
  if (!state.researchNotifications.includes(technology.name)) state.researchNotifications.push(technology.name);
  const researchMilestone = technology.name === 'rocket-silo'
    ? 'rocket-silo'
    : technology.name === 'railway'
      ? 'trains'
    : technology.name === 'spidertron'
      ? 'spidertron'
      : technology.name === 'ai-powered-infinite-research'
        ? 'infinite-science-complete'
      : null;
  if (researchMilestone && unlockMilestone(state, researchMilestone) && !state.milestoneNotifications.includes(researchMilestone)) {
    state.milestoneNotifications.push(researchMilestone);
  }
};
const applyResearchTriggers = (state: GameState) => {
  let added = true;
  while (added) {
    added = false;
    orderedTechnologyCatalog.forEach((technology) => {
      if (!technology.researchTrigger || state.research.includes(technology.name) || !researchTriggerMet(state, technology)) return;
      if (!technology.prerequisites.every((prerequisite) => state.research.includes(prerequisite))) return;
      markResearchComplete(state, technology);
      added = true;
    });
  }
};
const recipeCycleRateFor = (state: GameState, recipe: Recipe) => cyclesPerMinuteFor(
  state.assemblers[recipe.name] ?? 0,
  state.simulationSpeed,
  recipe.energyRequired,
  craftingSpeedFor(isSmeltingRecipe(recipe), assemblyMachineProductionSpeedFor(state, recipe), furnaceCraftingSpeedFor(state)),
) * (recipePausedFor(state, recipe.name) || !recipeAutoStartStopConditionFor(state, recipe).met ? 0 : 1);
const miningOutputRateFor = (state: GameState, key: RawKey) => {
  const base = miningOutputPerSecondFor(key);
  const machineSpeedRatio = burnerMinerKeys.includes(key) ? miningMachineProductionSpeedFor(state) / burnerMiningDrillProductionSpeed : 1;
  return base * machineSpeedRatio;
};
const miningBaseProductionRateFor = (state: GameState, key: RawKey) =>
  miningMachineCountFor(state, key) * miningOutputRateFor(state, key) * 60 * state.simulationSpeed;
const coalAvailableForBurnerMinersFor = (state: GameState) => Math.max(0, state.raw.coal);
const miningProductionRateFor = (state: GameState, key: RawKey, burnerCoalAvailable?: number) => {
  if (miningPausedFor(state, key)) return 0;
  if (key === 'coal') return Math.max(0, miningBaseProductionRateFor(state, key) - (miningUsesStoredCoal(state) ? state.miners.coal * burnerMiningDrillCoalPerSecond * 60 * state.simulationSpeed : 0));
  const fuelRatio = burnerMinerFuelRatioFor(burnerCoalAvailable ?? coalAvailableForBurnerMinersFor(state), fueledBurnerMinerCount(state));
  return miningBaseProductionRateFor(state, key) * (fueledBurnerMinerKeys.includes(key) ? fuelRatio : 1);
};
const inputFlowPerSecondFor = (state: GameState, key: RawKey) => miningProductionRateFor(state, key) / 60;
const inputStatusFor = (state: GameState, key: RawKey, requiredPerSecond: number): SupplyStatus => {
  if (requiredPerSecond <= 0) return { tone: 'muted', label: 'not required', detail: 'no maximum-rate demand' };
  const flowPerSecond = inputFlowPerSecondFor(state, key);
  const storedSeconds = state.raw[key] / requiredPerSecond;
  if (flowPerSecond >= requiredPerSecond) {
    return { tone: 'teal', label: 'sufficient', detail: `${flowPerSecond.toFixed(1)} / ${requiredPerSecond.toFixed(1)} per sec machine flow` };
  }
  if (storedSeconds >= 60) {
    return { tone: 'amber', label: 'buffered', detail: `${Math.floor(storedSeconds)} sec stored · ${flowPerSecond.toFixed(1)} / ${requiredPerSecond.toFixed(1)} per sec flow` };
  }
  return { tone: 'red', label: 'insufficient', detail: `${fmt(state.raw[key])} stored · ${flowPerSecond.toFixed(1)} / ${requiredPerSecond.toFixed(1)} per sec flow` };
};
const boilerInputStatusFor = (state: GameState, key: 'coal' | 'water') => inputStatusFor(state, key, (key === 'coal' ? boilerPeakCoalUsageFor(state) : boilerPeakWaterUsageFor(state)) / 60);
const steamEngineInputStatusFor = (state: GameState): SupplyStatus => {
  const requiredPerSecond = steamEnginePeakSteamUsageFor(state) / 60;
  if (requiredPerSecond <= 0) return { tone: 'muted', label: 'not required', detail: 'no steam engine load' };
  const steamFlowPerSecond = boilerSteamRateFor(state) / 60;
  const coalStatus = boilerInputStatusFor(state, 'coal');
  const waterStatus = boilerInputStatusFor(state, 'water');
  if (steamFlowPerSecond >= requiredPerSecond && coalStatus.label === 'sufficient' && waterStatus.label === 'sufficient') {
    return { tone: 'teal', label: 'sufficient', detail: `${steamFlowPerSecond.toFixed(1)} / ${requiredPerSecond.toFixed(1)} steam per sec from boilers` };
  }
  if (steamFlowPerSecond >= requiredPerSecond && coalStatus.label !== 'insufficient' && waterStatus.label !== 'insufficient') {
    return { tone: 'amber', label: 'buffered', detail: `steam capacity is ready · boiler inputs rely on stored buffers` };
  }
  return { tone: 'red', label: 'limited', detail: `${steamFlowPerSecond.toFixed(1)} / ${requiredPerSecond.toFixed(1)} steam per sec available` };
};
const manualProductionRateFor = (state: GameState, key: TrackedKey) => {
  const history = state.rateHistory ?? [];
  const seconds = history.reduce((total, sample) => total + sample.seconds, 0);
  if (!seconds) return 0;
  const amount = history.reduce((total, sample) => total + (sample.manualProduction?.[key] ?? 0), 0);
  return amount / seconds * 60;
};
const handcraftPeakProductionRateFor = (state: GameState, key: TrackedKey) => {
  if (!state.handcraft) return 0;
  const recipe = recipeMap[state.handcraft.recipeKey];
  const output = recipe ? recipeOutputs(recipe).find((entry) => entry.key === key) : undefined;
  return output ? output.amount * 60 * state.simulationSpeed / recipe.energyRequired : 0;
};
const storageConstrainedFor = (state: GameState, key: TrackedKey) => {
  const capacity = capFor(state, key);
  return capacity > 0 && quantityFor(state, key) >= capacity * 0.95;
};
const miningActualProductionRateFor = (state: GameState, key: RawKey, burnerCoalAvailable?: number) => {
  const peakRate = miningProductionRateFor(state, key, burnerCoalAvailable);
  const requiredRate = demandRateFor(state, key);
  return bufferedActualRateFor(peakRate, quantityFor(state, key), capFor(state, key), requiredRate);
};
const miningStorageThrottleFor = (state: GameState, key: RawKey, burnerCoalAvailable?: number) => {
  const peakRate = miningProductionRateFor(state, key, burnerCoalAvailable);
  return peakRate > 0 ? miningActualProductionRateFor(state, key, burnerCoalAvailable) / peakRate : 0;
};
const peakProductionRateFor = (state: GameState, key: TrackedKey) => {
  let rate = rawKeys.includes(key as RawKey) ? miningProductionRateFor(state, key as RawKey) : 0;
  componentKeys.forEach((recipeKey) => {
    const recipe = recipeMap[recipeKey];
    const outputRate = recipeCycleRateFor(state, recipe);
    recipeOutputs(recipe).forEach(({ key: outputKey, amount }) => {
      if (outputKey === key) rate += outputRate * amount;
    });
  });
  return rate + Math.max(manualProductionRateFor(state, key), handcraftPeakProductionRateFor(state, key));
};
const scienceCostAmountFor = (technology: TechnologyDefinition | undefined, key: string) => {
  const cost = technology?.scienceCosts.find((entry) => keyForSource(entry.pack) === key);
  return cost?.amount ?? 0;
};
const peakDemandRateFor = (state: GameState, key: TrackedKey) => {
  let rate = key === 'coal' ? boilerPeakCoalUsageFor(state) + burnerMinerCoalRate(state) * 60 * state.simulationSpeed : key === 'water' ? boilerPeakWaterUsageFor(state) : 0;
  componentKeys.forEach((recipeKey) => {
    const recipe = recipeMap[recipeKey];
    const input = automatedRecipeInputsFor(state, recipe)[key];
    if (input) rate += recipeCycleRateFor(state, recipe) * input;
  });
  if (scienceKeys.includes(key as ScienceKey)) {
    const technology = activeResearchFor(state);
    if (technology) rate += scienceLabRateFor(state, technology, false) * scienceCostAmountFor(technology, key);
  }
  return rate;
};
const rateFromHistory = (state: GameState, key: TrackedKey, field: 'production' | 'consumption') => {
  const history = state.rateHistory ?? [];
  const seconds = history.reduce((total, sample) => total + sample.seconds, 0);
  if (!seconds) return 0;
  const amount = history.reduce((total, sample) => total + (sample[field][key] ?? 0), 0);
  return amount / seconds * 60;
};
const recentRateFromHistory = (state: GameState, key: TrackedKey, field: 'production' | 'consumption', windowSeconds: number) => {
  let remainingSeconds = Math.max(0, windowSeconds);
  let coveredSeconds = 0;
  let amount = 0;
  const history = state.rateHistory ?? [];
  for (let index = history.length - 1; index >= 0 && remainingSeconds > 0; index -= 1) {
    const sample = history[index];
    const sampleSeconds = Math.max(0, sample.seconds);
    const usedSeconds = Math.min(sampleSeconds, remainingSeconds);
    if (usedSeconds <= 0) continue;
    amount += (sample[field][key] ?? 0) * (usedSeconds / sampleSeconds);
    coveredSeconds += usedSeconds;
    remainingSeconds -= usedSeconds;
  }
  return coveredSeconds >= windowSeconds ? amount / windowSeconds * 60 : null;
};
const dashboardRateWindowSeconds = 5;
const demandRateFor = (state: GameState, key: TrackedKey) => rateFromHistory(state, key, 'consumption');
const productionRateFor = (state: GameState, key: TrackedKey) => {
  const observedRate = rateFromHistory(state, key, 'production');
  const requiredRate = demandRateFor(state, key);
  return storageConstrainedFor(state, key) && requiredRate > 0 ? Math.min(observedRate, requiredRate) : observedRate;
};
const recipeStorageThrottleFor = (state: GameState, recipe: Recipe, machinePowerRatio: number) => {
  const peakCycleRate = recipeCycleRateFor(state, recipe) * machinePowerRatio;
  if (peakCycleRate <= 0) return 0;
  return recipeOutputs(recipe).reduce((throttle, output) => {
    if (!storageConstrainedFor(state, output.key)) return throttle;
    const requiredRate = demandRateFor(state, output.key);
    if (requiredRate <= 0) return throttle;
    return Math.min(throttle, requiredRate / Math.max(0.01, peakCycleRate * output.amount));
  }, 1);
};
const recipeProductionRateFor = (state: GameState, recipe: Recipe) => {
  const output = primaryOutputFor(recipe.name, recipeOutputs(recipe));
  return output ? productionRateFor(state, output.key) : 0;
};
const recipeAutoStartStopConditionFor = (state: GameState, recipe: Recipe) => {
  if (recipe.name === 'heavy-oil-cracking') {
    return {
      met: oilCrackingConditionMet(recipe.name, { 'heavy-oil': quantityFor(state, 'heavy-oil'), 'light-oil': quantityFor(state, 'light-oil') }),
      label: 'heavy oil > light oil',
    };
  }
  if (recipe.name === 'light-oil-cracking') {
    return {
      met: oilCrackingConditionMet(recipe.name, { 'light-oil': quantityFor(state, 'light-oil'), 'petroleum-gas': quantityFor(state, 'petroleum-gas') }),
      label: 'light oil > petroleum gas',
    };
  }
  if (recipe.name === 'kovarex-enrichment-process') {
    return {
      met: kovarexConditionMet({ 'uranium-235': quantityFor(state, 'uranium-235'), 'uranium-238': quantityFor(state, 'uranium-238') }),
      label: 'U-238 > U-235',
    };
  }
  return { met: true, label: '' };
};
const furnaceCoalPerItemFor = (state: GameState, recipe: Recipe) => {
  const output = recipeOutputs(recipe)[0];
  return recipe.fuel && output ? materialAmount(recipe.fuel) * furnaceFuelMultiplierFor(state) / Math.max(0.01, output.amount) : 0;
};
const furnaceCoalUsageFor = (state: GameState, recipe: Recipe, peak = false) => {
  const output = recipeOutputs(recipe)[0];
  if (!recipe.fuel || !output) return 0;
  const outputRate = peak ? recipeCycleRateFor(state, recipe) * output.amount : recipeProductionRateFor(state, recipe);
  return outputRate * furnaceCoalPerItemFor(state, recipe);
};
const scienceLabRateFor = (state: GameState, technology?: TechnologyDefinition, applyPowerRatio = true) => state.labs * labResearchSpeedFor(state) * 60 * state.simulationSpeed / technologyResearchTimeFor(technology) * (applyPowerRatio ? electricPowerRatioFor(state) : 1);
const activeResearchTimeRemainingFor = (state: GameState, technology?: TechnologyDefinition) => {
  if (!technology || technology.researchTrigger || !technology.scienceCosts.length) return null;
  const currentScienceConsumption = technology.scienceCosts.reduce((total, cost) => total + demandRateFor(state, keyForSource(cost.pack)), 0);
  const researchRate = scienceLabRateFor(state, technology);
  if (currentScienceConsumption <= 0 || researchRate <= 0) return null;
  return Math.max(0, researchUnitsFor(technology) - researchProgressFor(state, technology)) / researchRate * 60;
};
const scienceRecipeFor = (key: string) => {
  const recipeKey = scienceRecipeKeys[key as ScienceKey];
  return recipeKey ? recipeMap[recipeKey] : undefined;
};
const sciencePackProductionRateFor = (state: GameState, key: string) => {
  const recipe = scienceRecipeFor(key);
  if (!recipe || !recipeIsUnlocked(recipe, state)) return 0;
  return peakProductionRateFor(state, key);
};
const scienceCurrentSpmFor = (state: GameState, requiredKeys: string[]) => {
  if (!requiredKeys.length) return 0;
  return Math.min(...requiredKeys.map((key) => rateFromHistory(state, key, 'consumption')));
};
const sciencePeakSpmFor = (state: GameState, requiredKeys: string[]) => {
  if (!requiredKeys.length) return 0;
  const technology = activeResearchFor(state);
  const labRate = scienceLabRateFor(state, technology, false);
  return Math.min(...requiredKeys.map((key) => Math.min(
    labRate * scienceCostAmountFor(technology, key),
    sciencePackProductionRateFor(state, key),
  )));
};
const burnerOperatingSeconds = (state: GameState, seconds: number) => {
  const fuelRate = burnerMinerCoalRate(state) * state.simulationSpeed;
  return fuelRate > 0 ? Math.min(seconds, Math.max(0, state.raw.coal) / fuelRate) : seconds;
};
const unlockMilestone = (state: GameState, milestone: MilestoneKey) => {
  if (state.unlockedMilestones.includes(milestone)) return false;
  state.unlockedMilestones.push(milestone);
  return true;
};

function simulate(previous: GameState, seconds: number, tickTimestamp = Date.now(), options: { offline?: boolean } = {}): GameState {
  const offline = options.offline === true;
  const now = tickTimestamp;
  const liveProduction = emptyRateRecord();
  const liveManualProduction = emptyRateRecord();
  const liveConsumption = emptyRateRecord();
  const activeConstructionIds = new Set(
    previous.queue.filter((item) => item.started !== false).map((item) => item.id),
  );
  const previousQueueById = new Map(previous.queue.map((item) => [item.id, item]));
  const state: GameState = {
    ...previous, raw: { ...previous.raw }, products: { ...previous.products }, miners: { ...previous.miners }, storage: { ...previous.storage }, storageBoxes: { ...previous.storageBoxes }, storageTanks: { ...previous.storageTanks },
    assemblers: { ...previous.assemblers }, oilProcessingAdvanced: previous.oilProcessingAdvanced, boilers: previous.boilers, boilersEnabled: previous.boilersEnabled, steamEngines: previous.steamEngines, solarPanels: previous.solarPanels, accumulators: previous.accumulators, nuclearReactors: previous.nuclearReactors, heatExchangers: previous.heatExchangers, steamTurbines: previous.steamTurbines, machineVariants: { ...previous.machineVariants }, miningProgress: { ...previous.miningProgress }, assemblyProgress: { ...previous.assemblyProgress }, manualOutputEvents: { ...previous.manualOutputEvents },
    researchProgress: { ...(previous.researchProgress ?? {}) }, autoResearch: [...(previous.autoResearch ?? [])], researchNotifications: [...(previous.researchNotifications ?? [])], milestoneNotifications: [...(previous.milestoneNotifications ?? [])], unlockedMilestones: [...(previous.unlockedMilestones ?? [])],
    rateHistory: previous.rateHistory ?? [],
    pausedRecipes: { ...previous.pausedRecipes }, pausedMining: { ...previous.pausedMining },
    handcraft: previous.handcraft ? { ...previous.handcraft } : null, manualMining: previous.manualMining ? { ...previous.manualMining } : null,
    queue: previous.queue.map((item) => ({ ...item, costs: item.costs?.map((cost) => ({ ...cost })), reserved: item.reserved ? [...item.reserved] : undefined })),
    research: [...previous.research], produced: { ...previous.produced }, lastSeen: now,
  };
  activateReadyConstruction(state.queue);
  const completedMiningItems = state.queue.filter((item) =>
    activeConstructionIds.has(item.id)
    && item.started !== false
    && item.seconds <= seconds
    && item.action === 'miner'
    && (item.targetId ?? item.target) !== 'wood',
  );
  completedMiningItems.forEach((item) => {
    state.miners[(item.targetId ?? item.target) as RawKey] += item.quantity ?? 1;
  });
  const speed = state.simulationSpeed;
  const burnerCoalAtTickStart = state.raw.coal;
  const operatingSeconds = burnerOperatingSeconds(state, seconds);
  if (fueledBurnerMinerCount(state)) {
    const coalConsumed = burnerMinerCoalRate(state) * operatingSeconds * speed;
    state.raw.coal = Math.max(0, state.raw.coal - coalConsumed);
    liveConsumption.coal += coalConsumed;
  }
  const powerFlow = powerFlowFor(state, seconds);
  const nuclearFlow = nuclearPowerFlowFor(state, seconds);
  const powerRatio = electricPowerRatioFor(state, seconds);
  const miningPowerRatio = miningPowerRatioFor(state.machineVariants.mining, powerRatio);
  if (powerFlow.boilerCoalConsumed > 0) {
    state.raw.coal = Math.max(0, state.raw.coal - powerFlow.boilerCoalConsumed);
    liveConsumption.coal += powerFlow.boilerCoalConsumed;
  }
  if (powerFlow.boilerWaterConsumed > 0) {
    state.raw.water = Math.max(0, state.raw.water - powerFlow.boilerWaterConsumed);
    liveConsumption.water += powerFlow.boilerWaterConsumed;
  }
  if (powerFlow.steamProduced > 0) {
    recordProduction(state, 'steam', powerFlow.steamProduced, liveProduction);
  }
  if (powerFlow.steamConsumed > 0) {
    liveConsumption.steam += powerFlow.steamConsumed;
  }
  if (nuclearFlow.fuelCellsConsumed > 0) {
    spendInputs(state, { 'uranium-fuel-cell': nuclearFlow.fuelCellsConsumed }, liveConsumption);
  }
  if (nuclearFlow.waterConsumed > 0) {
    state.raw.water = Math.max(0, state.raw.water - nuclearFlow.waterConsumed);
    liveConsumption.water += nuclearFlow.waterConsumed;
  }
  if (powerProductionFor(state) - electricPowerDraw(state) > 0
    && unlockMilestone(state, 'turn-lights-on')
    && !state.milestoneNotifications.includes('turn-lights-on')) {
    state.milestoneNotifications.push('turn-lights-on');
  }
  if (nuclearPowerMilestoneTriggered(nuclearPowerFor(state))
    && unlockMilestone(state, 'nuclear-power')
    && !state.milestoneNotifications.includes('nuclear-power')) {
    state.milestoneNotifications.push('nuclear-power');
  }
  rawKeys.forEach((key) => {
    const count = miningMachineCountFor(state, key);
    if (!count || miningPausedFor(state, key)) return;
    const minerSeconds = fueledBurnerMinerKeys.includes(key) ? operatingSeconds : seconds;
      const outputRate = key === 'coal' && miningUsesStoredCoal(state) ? miningOutputRateFor(state, key) - burnerMiningDrillCoalPerSecond : miningOutputRateFor(state, key);
    state.miningProgress[key] += count * outputRate * minerSeconds * speed * (offline ? 1 : miningStorageThrottleFor(state, key, burnerCoalAtTickStart)) * miningPowerRatio;
    while (state.miningProgress[key] >= 1) {
      const accepted = addTracked(state, key, 1);
      if (accepted < 1 - 0.000001) { state.miningProgress[key] = 0; break; }
      state.miningProgress[key] -= 1; state.totalOutput += 1; recordProduction(state, key, 1, liveProduction);
    }
  });
  componentKeys.forEach((key) => {
    const count = state.assemblers[key] ?? 0;
    if (!count || recipePausedFor(state, key)) return;
    const recipe = recipeMap[key];
    const machinePowerRatio = isSmeltingRecipe(recipe) && state.furnaceVariant !== 'electric-furnace' ? 1 : powerRatio;
    const storageThrottle = offline ? 1 : recipeStorageThrottleFor(state, recipe, machinePowerRatio);
    // Progress represents an in-flight cycle, not a queue of completed
    // cycles. Clamp legacy/starved backlog before advancing the line so a
    // machine cannot burst above its steady-state rate when inputs return.
    const cycleRate = recipeCycleRateFor(state, recipe);
    state.assemblyProgress[key] = Math.min(state.assemblyProgress[key] ?? 0, 0.999999)
      + cycleRate * seconds / 60 * machinePowerRatio * storageThrottle;
    const cycleBudget = cycleBudgetFor(cycleRate * machinePowerRatio * storageThrottle, seconds);
    let cycles = 0;
    let blocked = false;
    while (state.assemblyProgress[key] >= 1 && cycles < cycleBudget) {
      const outputs = recipeOutputs(recipe);
       if (!hasInputs(state, automatedRecipeInputsFor(state, recipe)) || outputs.some(({ key: outputKey, amount }) => quantityFor(state, outputKey) + amount > capFor(state, outputKey))) {
        blocked = true;
        break;
      }
       spendInputs(state, automatedRecipeInputsFor(state, recipe), liveConsumption);
      outputs.forEach(({ key: outputKey, amount }) => { addTracked(state, outputKey, amount); recordProduction(state, outputKey, amount, liveProduction); });
      state.assemblyProgress[key] -= 1; state.totalOutput += outputs.reduce((sum, output) => sum + output.amount, 0); cycles += 1;
    }
    if (blocked && state.assemblyProgress[key] >= 1) state.assemblyProgress[key] %= 1;
  });
  if (state.handcraft) {
    state.handcraft.seconds = Math.max(0, state.handcraft.seconds - seconds * speed);
    if (state.handcraft.seconds <= 0) {
      const recipe = recipeMap[state.handcraft.recipeKey];
      const outputs = recipeOutputs(recipe);
       outputs.forEach(({ key: outputKey, amount }) => {
         addTracked(state, outputKey, amount, true);
         recordProduction(state, outputKey, amount, liveProduction, liveManualProduction);
         state.manualOutputEvents[outputKey] = (state.manualOutputEvents[outputKey] ?? 0) + 1;
       });
      state.totalOutput += outputs.reduce((sum, output) => sum + output.amount, 0);
      state.handcraft = null;
    }
  }
  if (state.manualMining) {
    state.manualMining.seconds = Math.max(0, state.manualMining.seconds - seconds * speed);
    if (state.manualMining.seconds <= 0) {
      const resourceKey = state.manualMining.resourceKey;
      const amount = 1;
       addTracked(state, resourceKey, amount, true);
       recordProduction(state, resourceKey, amount, liveProduction, liveManualProduction);
       state.manualOutputEvents[resourceKey] = (state.manualOutputEvents[resourceKey] ?? 0) + 1;
      state.totalOutput += amount;
      state.manualMining = null;
    }
  }
  state.labProgress = 0;
  let remainingResearchSeconds = seconds;
  let researchTargetsProcessed = 0;
  while (remainingResearchSeconds > 0 && researchTargetsProcessed < 100) {
    const currentResearch = activeResearchFor(state);
    if (!currentResearch || currentResearch.researchTrigger || !currentResearch.scienceCosts.length) break;
    const researchRate = scienceLabRateFor(state, currentResearch);
    if (researchRate <= 0) break;
    const totalUnits = researchUnitsFor(currentResearch);
    const currentProgress = Math.min(totalUnits, state.researchProgress[currentResearch.name] ?? 0);
    const requestedUnits = Math.min(totalUnits - currentProgress, researchRate * remainingResearchSeconds / 60);
    const availableUnits = Math.min(...currentResearch.scienceCosts.map((cost) => {
      const key = keyForSource(cost.pack);
      return quantityFor(state, key) / Math.max(0.0001, cost.amount);
    }));
    const completedUnits = Math.max(0, Math.min(requestedUnits, availableUnits));
    if (completedUnits <= 0) break;
    const costs = Object.fromEntries(currentResearch.scienceCosts.map((cost) => [keyForSource(cost.pack), cost.amount * completedUnits]));
    spendInputs(state, costs, liveConsumption);
    const nextProgress = Math.min(totalUnits, currentProgress + completedUnits);
    state.researchProgress[currentResearch.name] = nextProgress;
    remainingResearchSeconds -= completedUnits / researchRate * 60;
    if (nextProgress < totalUnits) break;
    markResearchComplete(state, currentResearch);
    state.currentResearch = autoResearchTargetFor(state)?.name ?? currentResearch.name;
    researchTargetsProcessed += 1;
  }
  state.queue.forEach((item) => {
    if (item.started === false || item.progressStartedAt !== undefined) return;
    const wasWaiting = previousQueueById.get(item.id)?.started === false;
    const visualTotal = wasWaiting ? item.total : item.seconds;
    item.progressStartedAt = now;
    item.progressDurationMs = constructionTickCountFor(visualTotal) * 1000;
  });
  const completed = state.queue.filter((item) => activeConstructionIds.has(item.id) && item.started !== false && item.seconds <= seconds);
  state.queue = state.queue.map((item) => !activeConstructionIds.has(item.id) || item.started === false ? item : ({ ...item, seconds: Math.max(0, item.seconds - seconds) })).filter((item) => item.started === false || !activeConstructionIds.has(item.id) || item.seconds > 0);
  completed.forEach((item) => {
    const quantity = item.quantity ?? 1;
    if (item.action === 'pump') state.pumps += quantity;
    if (item.action === 'pumpjack') { state.pumpjacks += quantity; recordProduction(state, 'pumpjack', quantity); }
    if (item.action === 'uraniumMiner') { state.uraniumMiners += quantity; recordProduction(state, 'uranium-miner', quantity); }
     if (item.action === 'assembler' || item.action === 'furnace') {
      const previousFurnaceCount = smeltingFurnaceCountFor(state);
      state.assemblers[(item.targetId ?? item.target) as ComponentKey] += quantity;
      if (item.action === 'furnace' && previousFurnaceCount < 60 && smeltingFurnaceCountFor(state) >= 60) {
         if (unlockMilestone(state, 'sixty-furnaces') && !state.milestoneNotifications.includes('sixty-furnaces')) state.milestoneNotifications.push('sixty-furnaces');
       }
     }
    if (item.action === 'lab') {
      const previousLabCount = state.labs;
      const isFirstLab = previousLabCount === 0;
      state.labs += quantity;
      recordProduction(state, 'lab', quantity, liveProduction);
       if (isFirstLab) {
         if (unlockMilestone(state, 'first-lab') && !state.milestoneNotifications.includes('first-lab')) state.milestoneNotifications.push('first-lab');
       }
      if (previousLabCount < 21 && state.labs >= 21) {
         if (unlockMilestone(state, 'twenty-one-labs') && !state.milestoneNotifications.includes('twenty-one-labs')) state.milestoneNotifications.push('twenty-one-labs');
       }
    }
    if (item.action === 'boiler') state.boilers += quantity;
    if (item.action === 'steamEngine') state.steamEngines += quantity;
    if (item.action === 'solarPanel') state.solarPanels += quantity;
    if (item.action === 'accumulator') state.accumulators += quantity;
    if (item.action === 'nuclearReactor') state.nuclearReactors += quantity;
    if (item.action === 'heatExchanger') state.heatExchangers += quantity;
    if (item.action === 'steamTurbine') state.steamTurbines += quantity;
    if (item.action === 'rocketSilo') {
      state.rocketSiloBuilt = true;
      recordProduction(state, 'rocket-silo', 1, liveProduction);
      state.totalOutput += 1;
    }
    if (item.action === 'rocketParts') {
      const constructed = rocketPartCountAfterConstruction(state.rocketPartsBuilt, item.machineCount ?? ROCKET_PART_TARGET);
      const producedParts = constructed - state.rocketPartsBuilt;
      state.rocketPartsBuilt = constructed;
      if (producedParts > 0) {
        recordProduction(state, 'rocket-part', producedParts, liveProduction);
        state.totalOutput += producedParts;
        if (constructed >= ROCKET_PART_TARGET && !state.winMetrics) {
          state.winMetrics = winMetricsFor(now, state.totalOutput, state.produced);
        }
      }
    }
    if (item.action === 'storage') {
      const key = item.targetId ?? item.target;
      for (let index = 0; index < quantity; index += 1) {
        const completedStorage = completeStorageConstruction({
          storage: state.storage,
          storageBoxes: state.storageBoxes,
          storageTanks: state.storageTanks,
        }, key, fluidKeys, storageBoxCapacityFor(state));
        state.storage = completedStorage.storage;
        state.storageBoxes = completedStorage.storageBoxes;
        state.storageTanks = completedStorage.storageTanks;
      }
    }
    if (item.action === 'upgrade') {
      const upgradeId = item.targetId ?? item.target;
      if (upgradeId === 'iron-chests' && state.storageBoxType === 'wooden') {
        state.storageBoxType = 'iron';
        state.storage = Object.fromEntries(trackedKeys.map((key) => [key, storageCapacityFor(state, key)])) as Record<TrackedKey, number>;
      } else if (upgradeId === 'steel-chests' && state.storageBoxType !== 'steel') {
        state.storageBoxType = 'steel';
        state.storage = Object.fromEntries(trackedKeys.map((key) => [key, storageCapacityFor(state, key)])) as Record<TrackedKey, number>;
      } else if (upgradeId === 'steel-furnaces' && state.furnaceVariant === 'stone-furnace') {
        state.furnaceVariant = 'steel-furnace';
      } else if (upgradeId === ELECTRIC_FURNACE_UPGRADE_ID && state.furnaceVariant === 'steel-furnace') {
        state.furnaceVariant = 'electric-furnace';
      } else if (upgradeId === OIL_PROCESSING_UPGRADE_ID && !state.oilProcessingAdvanced) {
        const machineCount = item.machineCount ?? state.assemblers['basic-oil-processing'] ?? 0;
        state.assemblers = applyOilProcessingUpgradeCompletion(state.assemblers, machineCount);
        state.assemblyProgress['basic-oil-processing'] = 0;
        state.assemblyProgress['advanced-oil-processing'] = 0;
        state.oilProcessingAdvanced = true;
        if (unlockMilestone(state, 'advanced-oil-production') && !state.milestoneNotifications.includes('advanced-oil-production')) {
          state.milestoneNotifications.push('advanced-oil-production');
        }
      } else if (upgradeMap[upgradeId as keyof typeof upgradeMap]?.labSpeedLevel !== undefined) {
        state.labSpeedLevel = applyLabSpeedUpgradeCompletion(state.labSpeedLevel, upgradeId);
      } else {
        state.machineVariants = applyUpgradeCompletion(state.machineVariants, upgradeId);
      }
    }
  });
  applyResearchTriggers(state);
  state.rateHistory = seconds > 0 && seconds <= 5
    ? [...(previous.rateHistory ?? []), { seconds, production: liveProduction, manualProduction: liveManualProduction, consumption: liveConsumption }].slice(-5)
    : [];
  return state;
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as Partial<GameState> | null;
    if (!parsed) return { state: initialState, away: 0, recovered: 0 };
    const gameStartTimestamp = typeof parsed.gameStartTimestamp === 'number' && Number.isFinite(parsed.gameStartTimestamp) ? parsed.gameStartTimestamp : Date.now();
    const sessionId = typeof parsed.sessionId === 'string' && parsed.sessionId.trim().length > 0
      ? parsed.sessionId
      : sessionIdForStartTimestamp(gameStartTimestamp);
    const savedRateHistory = parsed.rateHistory ?? [];
    const hasRateSourceData = savedRateHistory.every((sample) => sample.manualProduction !== undefined);
    const migratedUpgradeState = migrateMachineUpgradeState({ machineVariants: parsed.machineVariants, labSpeedLevel: parsed.labSpeedLevel, queue: parsed.queue });
    const savedLabCount = typeof parsed.labs === 'number' && Number.isFinite(parsed.labs) ? Math.max(0, Math.floor(parsed.labs)) : initialState.labs;
    const savedAccumulatorCount = typeof parsed.accumulators === 'number' && Number.isFinite(parsed.accumulators) ? Math.max(0, Math.floor(parsed.accumulators)) : initialState.accumulators;
    const savedNuclearReactorCount = typeof parsed.nuclearReactors === 'number' && Number.isFinite(parsed.nuclearReactors) ? Math.max(0, Math.floor(parsed.nuclearReactors)) : initialState.nuclearReactors;
    const savedHeatExchangerCount = typeof parsed.heatExchangers === 'number' && Number.isFinite(parsed.heatExchangers) ? Math.max(0, Math.floor(parsed.heatExchangers)) : initialState.heatExchangers;
    const savedSteamTurbineCount = typeof parsed.steamTurbines === 'number' && Number.isFinite(parsed.steamTurbines) ? Math.max(0, Math.floor(parsed.steamTurbines)) : initialState.steamTurbines;
    const normalizedStorage = (() => {
      const storage = { ...initialState.storage, ...parsed.storage };
      if (parsed.storage?.researchPack !== undefined && parsed.storage?.productionPack === undefined) storage.productionPack = parsed.storage.researchPack;
      delete storage.researchPack;
      return storage;
    })();
    const storageBoxType = parsed.storageBoxType === 'steel' ? 'steel' : parsed.storageBoxType === 'iron' ? 'iron' : 'wooden';
    const furnaceVariant = parsed.furnaceVariant === 'electric-furnace'
      ? 'electric-furnace'
      : parsed.furnaceVariant === 'steel-furnace' ? 'steel-furnace' : 'stone-furnace';
    const migratedStorage = migrateStorageState({
      trackedKeys,
      fluidKeys,
      savedStorage: normalizedStorage,
      savedBoxes: parsed.storageBoxes,
      savedTanks: parsed.storageTanks,
      boxCapacity: storageBoxType === 'wooden'
        ? storageBoxCapacity
        : storageBoxType === 'steel'
          ? steelStorageBoxCapacity
          : ironStorageBoxCapacity,
    });
    const savedFurnaceCount = Array.from(smeltingRecipeKeys).reduce((total, recipeKey) => {
      const count = parsed.assemblers?.[recipeKey];
      return total + (typeof count === 'number' && Number.isFinite(count) ? Math.max(0, count) : 0);
    }, 0);
    const normalizedResearch = Array.from(new Set((parsed.research ?? initialState.research).map((key) => normalizeResearchKey(String(key)))));
    const researchedWorkerRobotSpeedLevels = normalizedResearch.filter((key) => key.startsWith('worker-robots-speed-')).length;
    const savedWorkerRobotSpeedLevel = typeof parsed.workerRobotSpeedLevel === 'number' && Number.isFinite(parsed.workerRobotSpeedLevel)
      ? Math.max(0, Math.floor(parsed.workerRobotSpeedLevel))
      : 0;
    const migratedMilestones = migrateMilestoneState({
      welcomeSeen: parsed.welcomeSeen,
      unlockedMilestones: parsed.unlockedMilestones,
      milestoneNotifications: parsed.milestoneNotifications,
      labCount: savedLabCount,
      furnaceCount: savedFurnaceCount,
      rocketSiloResearched: Array.isArray(parsed.research) && parsed.research.some((key: unknown) => normalizeResearchKey(String(key)) === 'rocket-silo'),
      railwayResearched: Array.isArray(parsed.research) && parsed.research.some((key: unknown) => normalizeResearchKey(String(key)) === 'railway'),
      spidertronResearched: Array.isArray(parsed.research) && parsed.research.some((key: unknown) => normalizeResearchKey(String(key)) === 'spidertron'),
      gameCompleted: parsed.gameComplete === true || parsed.rocketLaunched === true,
      spaceScienceProduced: typeof parsed.produced?.spacePack === 'number' ? parsed.produced.spacePack : 0,
      infiniteResearchCompleted: normalizedResearch.includes('ai-powered-infinite-research'),
      totalSciencePacksProduced: totalSciencePacksProducedFor(parsed.produced ?? {}),
      advancedOilProductionCompleted: parsed.oilProcessingAdvanced === true,
    });
    const state = {
      ...initialState,
      ...parsed,
      raw: { ...initialState.raw, ...parsed.raw },
      products: (() => {
        const products = { ...initialState.products, ...parsed.products };
        if (parsed.products?.researchPack !== undefined && parsed.products?.productionPack === undefined) products.productionPack = parsed.products.researchPack;
        delete products.researchPack;
        return products;
      })(),
      storage: migratedStorage.storage as Record<TrackedKey, number>,
      storageBoxes: migratedStorage.storageBoxes as Record<TrackedKey, number>,
      storageTanks: migratedStorage.storageTanks as Record<TrackedKey, number>,
      storageBoxType,
      furnaceVariant,
      oilProcessingAdvanced: parsed.oilProcessingAdvanced === true,
      miners: { ...initialState.miners, ...parsed.miners },
       assemblers: (() => {
         const assemblers = { ...initialState.assemblers, ...parsed.assemblers };
         if (normalizedResearch.includes('space-science-pack')) {
           assemblers['space-science-pack'] = spaceScienceRecipeMachineCountAfterUnlock(assemblers['space-science-pack'] ?? 0);
         }
         return assemblers;
       })(),
      labs: savedLabCount,
      accumulators: savedAccumulatorCount,
      nuclearReactors: savedNuclearReactorCount,
      heatExchangers: savedHeatExchangerCount,
      steamTurbines: savedSteamTurbineCount,
       workerRobotSpeedLevel: Math.max(researchedWorkerRobotSpeedLevels, savedWorkerRobotSpeedLevel),
      boilersEnabled: parsed.boilersEnabled !== false,
      miningProgress: { ...initialState.miningProgress, ...parsed.miningProgress },
      assemblyProgress: { ...initialState.assemblyProgress, ...parsed.assemblyProgress },
      handcraft: parsed.handcraft ? { ...parsed.handcraft } : null,
      manualMining: parsed.manualMining ? { ...parsed.manualMining } : null,
       manualOutputEvents: { ...initialState.manualOutputEvents, ...parsed.manualOutputEvents },
       pausedRecipes: { ...initialState.pausedRecipes, ...parsed.pausedRecipes },
       pausedMining: { ...initialState.pausedMining, ...parsed.pausedMining },
       constructionBatchSize: normalizedResearch.includes('construction-robotics') ? normalizeConstructionBatchSize(parsed.constructionBatchSize) : 1,
      produced: (() => {
        const produced = { ...initialState.produced, ...parsed.produced };
        if (parsed.produced?.researchPack !== undefined && parsed.produced?.productionPack === undefined) produced.productionPack = parsed.produced.researchPack;
        delete produced.researchPack;
        return produced;
      })(),
      // Rate history is transient. Discard pre-source-tracking samples so
      // old inflated production readings cannot survive a catalog correction.
      rateHistory: hasRateSourceData ? savedRateHistory.map((sample) => {
        const production = { ...sample.production };
        const consumption = { ...sample.consumption };
        if (production.researchPack !== undefined && production.productionPack === undefined) production.productionPack = production.researchPack;
        if (consumption.researchPack !== undefined && consumption.productionPack === undefined) consumption.productionPack = consumption.researchPack;
        delete production.researchPack;
        delete consumption.researchPack;
        return { ...sample, production, consumption };
      }) : [],
      machineVariants: migratedUpgradeState.machineVariants,
      labSpeedLevel: migratedUpgradeState.labSpeedLevel,
      queue: normalizeConstructionQueue(migratedUpgradeState.queue.map((item) => {
        const normalizedItem = { ...item, quantity: normalizeConstructionBatchSize((item as Partial<QueueItem>).quantity) };
        const costs = legacyUpgradeCostsFor(item as QueueItem);
        return costs ? { ...normalizedItem, costs, reserved: costs.map((cost) => cost.amount) } : normalizedItem;
      }) as QueueItem[]),
       research: normalizedResearch,
      currentResearch: parsed.currentResearch ? normalizeResearchKey(String(parsed.currentResearch)) : initialState.currentResearch,
      researchSelected: parsed.researchSelected === true,
      researchProgress: Object.fromEntries(Object.entries(parsed.researchProgress ?? {}).filter(([key, value]) => technologyMap[key] && typeof value === 'number').map(([key, value]) => [normalizeResearchKey(key), Math.max(0, value as number)])),
      autoResearch: orderedTechnologyCatalog.filter((technology) => !technology.researchTrigger && (parsed.autoResearch ?? []).map((key) => normalizeResearchKey(String(key))).includes(technology.name)).map((technology) => technology.name),
       researchNotifications: Array.from(new Set((parsed.researchNotifications ?? []).map((key) => normalizeResearchKey(String(key))).filter((key) => technologyMap[key]))),
        milestoneNotifications: migratedMilestones.milestoneNotifications,
        unlockedMilestones: migratedMilestones.unlockedMilestones,
      lastSeen: parsed.lastSeen ?? Date.now(),
       gameStartTimestamp,
       sessionId,
      rocketSiloBuilt: parsed.rocketSiloBuilt === true,
      rocketPartsBuilt: Math.min(ROCKET_PART_TARGET, Math.max(0, Number(parsed.rocketPartsBuilt) || 0)),
      rocketReadyAcknowledged: parsed.rocketReadyAcknowledged === true,
      rocketLaunched: parsed.rocketLaunched === true,
      gameComplete: parsed.gameComplete === true,
      completionTotalOutput: typeof parsed.completionTotalOutput === 'number' ? Math.max(0, parsed.completionTotalOutput) : null,
      completionStats: parsed.completionStats && typeof parsed.completionStats === 'object' ? { ...parsed.completionStats } : null,
       winMetrics: parsed.winMetrics && typeof parsed.winMetrics === 'object' ? {
         timestamp: Number((parsed.winMetrics as Partial<WinMetrics>).timestamp),
         totalItemsProduced: Number((parsed.winMetrics as Partial<WinMetrics>).totalItemsProduced),
         totalSciencePacksProduced: Number((parsed.winMetrics as Partial<WinMetrics>).totalSciencePacksProduced),
         totalIronMined: Number((parsed.winMetrics as Partial<WinMetrics>).totalIronMined),
         totalCopperMined: Number((parsed.winMetrics as Partial<WinMetrics>).totalCopperMined),
       } : null,
      tutorialVisible: parsed.tutorialVisible !== false,
       welcomeSeen: migratedMilestones.welcomeSeen,
    } as GameState;
    delete (state as GameState & { upgrades?: unknown }).upgrades;
    const away = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - state.lastSeen) / 1000));
    const before = state.totalOutput;
    const recovered = simulate(state, away, Date.now(), { offline: true });
    return { state: recovered, away, recovered: recovered.totalOutput - before };
  } catch { return { state: initialState, away: 0, recovered: 0 }; }
}

const iconFileFor: Record<string, string> = {
  crudeOil: 'crude-oil', chemicalPack: 'chemical-science-pack', militaryPack: 'military-science-pack',
  productionPack: 'researchPack', utilityPack: 'utility-science-pack', spacePack: 'space-science-pack',
};
function ResourceIcon({ item, size = 28 }: { item: TrackedKey; size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}item-icons/${iconFileFor[item] ?? item}.png`} width={size} height={size} alt="" aria-hidden="true" className="object-contain" />;
}
function MiningBuildingIcon({ resource, machineVariant, size = 17 }: { resource: RawKey; machineVariant: string; size?: number }) {
  if (resource === 'water') return <ResourceIcon item="offshore-pump" size={size} />;
  if (resource === 'uranium') {
    const pipeSize = Math.max(8, Math.round(size * 0.58));
    return <span className="relative inline-block shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <ResourceIcon item="electric-mining-drill" size={size} />
      <span className="absolute -bottom-1 -right-1 rounded-sm bg-[hsl(216_24%_10%)]"><ResourceIcon item="pipe" size={pipeSize} /></span>
    </span>;
  }
  if (resource === 'crudeOil') return <ResourceIcon item="pumpjack" size={size} />;
  if (burnerMinerKeys.includes(resource)) return <ResourceIcon item={machineVariant} size={size} />;
  return <Pickaxe size={size} />;
}
function BrandLogo({ size = 36 }: { size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}icon-192.png`} width={size} height={size} alt="Factory Planet logo" className="object-contain" />;
}
function UpgradeAssetIcon({ file, size = 28 }: { file: string; size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}upgrade-icons/${file}.png`} width={size} height={size} alt="" aria-hidden="true" className="object-contain" />;
}
function Tag({ children, tone = 'teal' }: { children: ReactNode; tone?: 'teal' | 'amber' | 'red' | 'muted' }) {
  if (children === 'construction queued') return null;
  return <span className={`status-tag ${tone === 'teal' ? 'tag-running' : tone === 'amber' ? 'tag-starved' : tone === 'red' ? 'tag-blocked' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{children}</span>;
}
function UpgradeIconPair({ from, to, fromLabel, toLabel }: { from: ReactNode; to: ReactNode; fromLabel: string; toLabel: string }) {
  return <div className="upgrade-icon-pair" role="img" aria-label={`${fromLabel} to ${toLabel}`}>
    <div className="upgrade-icon-pair-from">{from}</div>
    <div className="upgrade-icon-pair-to">{to}</div>
  </div>;
}
function UpgradeFlow({ count, from, to }: { count: number; from: string; to: string }) {
  return <div className="upgrade-flow flex min-w-0 items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(216_24%_9%/.7)] px-2.5 py-2">
    <span className="mono shrink-0 text-[12px] font-bold text-[hsl(var(--primary))]">{count}×</span>
    <span className="min-w-0 truncate text-[10px] font-semibold">{from}</span>
    <MoveRight size={14} className="shrink-0 text-[hsl(var(--muted-foreground))]" />
    <span className="mono shrink-0 text-[12px] font-bold text-[hsl(var(--secondary))]">{count}×</span>
    <span className="min-w-0 truncate text-right text-[10px] font-semibold">{to}</span>
  </div>;
}
function UpgradeCostChips({ costs }: { costs: BuildMaterialCost[] }) {
  if (!costs.length) return <span className="mono text-[12px] text-[hsl(var(--secondary))]">0</span>;
  return <div className="flex flex-wrap items-center gap-2">{costs.map((cost) => {
    const label = meta[cost.key]?.label ?? prettyLabel(cost.key);
    return <span className="inline-flex items-center gap-1.5" key={`${cost.source}-${cost.key}`} title={`${fmt(cost.amount)} ${label}`} aria-label={`${fmt(cost.amount)} ${label}`}>
      <ResourceIcon item={cost.key} size={18} />
      <span className="mono text-[11px] font-semibold">{fmt(cost.amount)}</span>
    </span>;
  })}</div>;
}
function UpgradeTime({ seconds }: { seconds: number }) {
  const label = seconds < 60 ? `${Number(seconds.toFixed(1))}s` : duration(seconds);
  return <span className="inline-flex shrink-0 items-center gap-1 mono text-[10px] text-[hsl(var(--primary))]" title={`${duration(seconds)} time`}>
    <Clock3 size={11} aria-hidden="true" />{label}
  </span>;
}
function UpgradeMetaGrid({ prerequisite, prerequisiteMet, machine, machineIcon }: { prerequisite?: string; prerequisiteMet: boolean; machine: string; machineIcon: ReactNode }) {
  return <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
    <div className="data-row rounded-md p-2">
      <div className="eyebrow">Prerequisite</div>
      {prerequisite ? <div className={`mt-1 flex min-w-0 items-center gap-1.5 font-semibold ${prerequisiteMet ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
        {prerequisiteMet ? <Check size={11} /> : <LockKeyhole size={11} />}
        <span className="truncate">{prettyLabel(prerequisite)}</span>
      </div> : <div className="mt-1 flex items-center gap-1.5 font-semibold text-[hsl(var(--secondary))]"><Check size={11} />none</div>}
    </div>
    <div className="data-row rounded-md p-2">
      <div className="eyebrow">Relevant machine</div>
      <div className="mt-1 flex min-w-0 items-center justify-between gap-1.5 font-semibold">
        <span className="truncate">{machine}</span>
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-[hsl(var(--secondary)/.35)] bg-[hsl(var(--secondary)/.1)]" title={machine} aria-label={`${machine} icon`}>{machineIcon}</span>
      </div>
    </div>
  </div>;
}
function UpgradeProgress({ count, label, seconds, total, progressStartedAt, progressDurationMs, testId, cancelUpgrade }: { count: number; label: string; seconds: number; total: number; progressStartedAt?: number; progressDurationMs?: number; testId: string; cancelUpgrade?: () => void }) {
  const progress = useConstructionVisualProgress(
    `${testId}:${progressStartedAt ?? 'legacy'}`,
    progressStartedAt,
    progressDurationMs,
    visualProgressFor(seconds, total, 1),
  );
  return <div className="construction-panel mt-3 rounded-md p-2.5" aria-live="polite" data-testid={testId}>
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 truncate text-[10px] font-bold">{count} {label} converting</div>
       <div className="flex shrink-0 items-center gap-2"><span className="mono text-[10px] text-[hsl(var(--primary))]">{duration(seconds)}</span>{cancelUpgrade && <button type="button" onClick={cancelUpgrade} className="grid h-6 w-6 place-items-center rounded-md border border-[hsl(var(--destructive)/.45)] text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive)/.12)]" aria-label="Cancel upgrade" title="Cancel upgrade and refund materials" data-testid={`${testId}-cancel`}><X size={12} /></button>}</div>
    </div>
    <div className="mt-2"><Progress value={progress} tone="amber" realtime={progressStartedAt !== undefined && progressDurationMs !== undefined} /></div>
    <div className="mt-1 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{Math.floor(progress)}% complete</span><span>{total.toFixed(1)}s total</span></div>
  </div>;
}
function UpgradePowerAdvisory({ testId, machineCount, powerDrawKw, state }: { testId: string; machineCount: number; powerDrawKw: number; state: GameState }) {
  const additionalPowerKw = machineCount * powerDrawKw;
  const sparePowerKw = (powerProductionFor(state) - electricPowerDraw(state)) * 1000;
  const enoughSparePower = sparePowerKw >= additionalPowerKw;
  const toneClass = enoughSparePower
    ? 'border-[hsl(var(--secondary)/.3)] bg-[hsl(var(--secondary)/.06)] text-[hsl(var(--secondary))]'
    : 'border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.08)] text-[hsl(var(--destructive))]';
  return <div className={`mt-3 flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-[10px] font-semibold ${toneClass}`} data-testid={testId}>
    {enoughSparePower ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
    <span>Additional {powerLabel(additionalPowerKw / 1000)} MW of power {enoughSparePower ? 'available' : 'not available'}</span>
  </div>;
}
function UpgradeCard({ testId, title, copy, iconPair, flow, progress, meta, costPerItem, totalCost, timePerMachine, totalTime, showCosts, powerAdvisory, action }: {
  testId: string;
  title: string;
  copy: string;
  iconPair: ReactNode;
  flow?: ReactNode;
  progress?: ReactNode;
  meta: ReactNode;
  costPerItem: BuildMaterialCost[];
  totalCost: BuildMaterialCost[];
  timePerMachine: number;
  totalTime: number;
  showCosts?: boolean;
  powerAdvisory?: ReactNode;
  action?: ReactNode;
}) {
  return <section className="surface rounded-xl p-3 sm:p-4" data-testid={testId}>
    <div className="flex items-start gap-3">
      {iconPair}
      <div className="min-w-0 flex-1">
        <h2 className="text-[13px] font-extrabold leading-5">{title}</h2>
        <p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{copy}</p>
      </div>
    </div>
    {flow && <div className="mt-3">{flow}</div>}
    {progress}
    {meta}
    {powerAdvisory}
    {showCosts !== false && <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
      <div className="data-row rounded-md p-2"><div className="eyebrow">Cost / machine</div><div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1"><UpgradeCostChips costs={costPerItem} /><UpgradeTime seconds={timePerMachine} /></div></div>
      <div className="data-row rounded-md p-2"><div className="eyebrow">Total cost</div><div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1"><UpgradeCostChips costs={totalCost} /><UpgradeTime seconds={totalTime} /></div></div>
    </div>}
    {action}
  </section>;
}
function SupplyStatus({ label, status, testId }: { label: string; status: SupplyStatus; testId: string }) {
  return <div className="data-row rounded-lg p-2.5" data-testid={testId}>
    <div className="flex items-center justify-between gap-2"><div className="eyebrow">{label}</div><Tag tone={status.tone}>{status.label === 'supplied' ? 'adequate' : status.label}</Tag></div>
    <div className="mt-1 text-[9px] leading-4 text-[hsl(var(--muted-foreground))]">{status.detail}</div>
  </div>;
}
const powerRateLabel = (value: number) => Number(value.toFixed(2)).toString();
const powerFlowBadgeFor = (status: SupplyStatus): SupplyStatus => ({
  ...status,
  tone: status.tone === 'red' ? 'red' : status.tone === 'muted' ? 'muted' : 'teal',
  label: status.tone === 'red' ? 'limited' : status.tone === 'muted' ? status.label : 'supplied',
});
function PowerFlowCard({ label, item, firstLabel = 'Available', firstValue, secondValue, status, testId }: { label: string; item: TrackedKey; firstLabel?: string; firstValue: number; secondValue: number; status: SupplyStatus; testId: string }) {
  return <div className="data-row rounded-lg p-2.5" data-testid={testId}>
    <div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><ResourceIcon item={item} size={17} /><div className="eyebrow truncate">{label} per second</div></div><Tag tone={status.tone}>{status.label === 'supplied' ? 'adequate' : status.label}</Tag></div>
    <div className="mt-2 flex items-center justify-between gap-2 text-[9px]">
      <div className="whitespace-nowrap text-[hsl(var(--muted-foreground))]">{firstLabel} <strong className="mono ml-1 text-[11px] text-[hsl(var(--secondary))]">{powerRateLabel(firstValue)}</strong></div>
      <div className="whitespace-nowrap text-[hsl(var(--muted-foreground))]">Consumed <strong className="mono ml-1 text-[11px] text-[hsl(var(--primary))]">{powerRateLabel(secondValue)}</strong></div>
    </div>
  </div>;
}

function Shell({ children, state }: { children: ReactNode; state: GameState }) {
  const [location] = useLocation();
  const search = useSearch();
  const active = nav.find(([key, path]) => path === routePathFor(location))?.[0] ?? 'factory';
  const lowPower = powerProductionFor(state) - electricPowerDraw(state) < 0;
  const lowFuel = peakProductionRateFor(state, 'coal') < peakDemandRateFor(state, 'coal');
  const activeResearch = activeResearchFor(state);
  const activeResearchProgress = activeResearch ? researchProgressPercentFor(state, activeResearch) : 0;
  const activeResearchTimeRemaining = activeResearchTimeRemainingFor(state, activeResearch);
  const contentRef = useRef<HTMLElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const handleNavClick = (key: string, event: MouseEvent<HTMLAnchorElement>) => {
    if (contentRef.current) scrollPositions.current[active] = contentRef.current.scrollTop;
    if (active === key) {
      event.preventDefault();
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = scrollPositions.current[active] ?? 0;
  }, [active]);
  useEffect(() => {
    const targetId = focusTargetForSearch(search);
    if (!targetId) return;
    const retryDelays = [0, 80, 180, 350, 700, 1200];
    const timers: number[] = [];
    const scrollToTarget = () => {
      const container = contentRef.current;
      const target = document.getElementById(targetId);
      if (!container || !target) return;
      const top = Math.max(0, target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 12);
      container.scrollTop = top;
      container.scrollTo(0, top);
    };
    retryDelays.forEach((delay) => {
      timers.push(window.setTimeout(scrollToTarget, delay));
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [search]);
  const navigationAlertDescription = (key: string) => key === 'power' && lowPower
    ? 'Low power alert: generation is below factory draw.'
    : key === 'mining' && lowFuel
      ? 'Low fuel alert: peak coal production is below peak coal consumption.'
      : null;
  const navigationAlert = (key: string, mobile = false) => {
    const description = navigationAlertDescription(key);
    if (!description) return null;
    const image = key === 'power' ? 'low-power-alert.png' : 'low-fuel-alert.png';
    return <img src={`${import.meta.env.BASE_URL}${image}`} width={mobile ? 15 : 18} height={mobile ? 15 : 18} alt="" aria-hidden="true" title={description} data-testid={`alert-navigation-${key}`} className={mobile ? 'pointer-events-none absolute -right-1 -top-1 h-[15px] w-[15px]' : 'ml-auto h-[18px] w-[18px] shrink-0'} />;
  };
  return <div className="app-shell flex h-[100dvh] flex-col">
    <header className="app-header z-20 shrink-0">
      <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><Link href="/" className="flex items-center gap-3 no-underline" data-testid="link-logo"><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.12)]"><BrandLogo size={36} /></div><div className="min-w-0"><div className="text-[13px] font-extrabold tracking-[.05em]">FACTORY PLANET</div><div className="mono truncate text-[9px] tracking-[.18em] text-[hsl(var(--primary))]">AFKtorio</div></div></Link></div>
        <div className="hidden items-center gap-3 lg:flex"><Tag><span className="status-dot status-running mini-pulse" /> simulation live</Tag><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">SECTOR 07 · LOCAL INSTANCE</span></div>
        <div className="flex items-center gap-2"><span className="mono hidden text-[10px] text-[hsl(var(--muted-foreground))] sm:block">T+ NETWORK</span></div>
      </div>
        {activeResearch && <div className="app-header-research" data-testid="header-research-status"><div className="mx-auto flex min-h-8 max-w-[1500px] flex-wrap items-center gap-x-1.5 gap-y-1 px-4 py-2 mono text-[9px] text-[hsl(var(--muted-foreground))] sm:px-6 lg:px-8"><span className="status-dot status-running mini-pulse" /><span>Current research: <strong className="font-semibold text-[hsl(var(--foreground))]">{prettyLabel(activeResearch.name)}</strong></span><span className="ml-auto whitespace-nowrap text-right">Progress: <strong className="font-semibold text-[hsl(var(--primary))]">{activeResearchProgress.toFixed(0)}%</strong> ({activeResearchTimeRemaining === null ? '--' : duration(activeResearchTimeRemaining)})</span></div></div>}
    </header>
    <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1">
       <aside className="hidden surface rounded-xl p-2 md:sticky md:top-0 md:block md:h-full md:w-[214px] md:shrink-0 md:rounded-none md:border-0 md:border-r md:border-[hsl(var(--sidebar-border))] md:bg-transparent md:p-5 md:shadow-none"><div className="mb-4 hidden px-3 md:block"><span className="eyebrow">Command tabs · 10</span></div><nav className="grid grid-cols-2 gap-1 md:flex md:flex-col" aria-label="Primary navigation">{nav.map(([key, path, Icon]) => <Link key={key} href={path} onClick={(event) => handleNavClick(key, event)} className={`nav-link flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[11px] font-bold no-underline transition-colors ${active === key ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`} data-testid={`link-tab-${key}`}>{navigationAlertDescription(key) ? <span className="sr-only">{navigationAlertDescription(key)} </span> : null}<Icon size={15} /><span>{tabLabel(key)}</span>{navigationAlert(key)}{active === key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />}</Link>)}</nav></aside>
       <main ref={contentRef} onScroll={() => { if (contentRef.current) scrollPositions.current[active] = contentRef.current.scrollTop; }} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">{children}</main>
    </div>
      <div className="tab-rail app-footer fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 md:hidden"><div className="grid w-full grid-cols-5 grid-rows-2 gap-1">{nav.map(([key, path, Icon]) => <Link key={key} href={path} onClick={(event) => handleNavClick(key, event)} className={`flex min-w-0 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[9px] font-bold no-underline ${active === key ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`link-mobile-tab-${key}`}>{navigationAlertDescription(key) ? <span className="sr-only">{navigationAlertDescription(key)} </span> : null}<span className="relative grid h-4 w-7 place-items-center"><Icon size={16} />{navigationAlert(key, true)}</span><span className="truncate">{tabLabel(key)}</span></Link>)}</div></div>
  </div>;
}

function ConstructionBatchToggle({ value, onChange, enabled, onLocked }: { value: ConstructionBatchSize; onChange: (value: ConstructionBatchSize) => void; enabled: boolean; onLocked?: () => void }) {
  const currentValue = enabled ? value : 1;
  const currentIndex = constructionBatchSizes.indexOf(currentValue);
  const nextValue = constructionBatchSizes[(currentIndex + 1) % constructionBatchSizes.length] ?? constructionBatchSizes[0];
  return <button type="button" onClick={() => { if (enabled) onChange(nextValue); else onLocked?.(); }} className={`button-base !px-3 !py-2 text-[10px] whitespace-nowrap ${enabled ? 'button-primary' : 'button-ghost cursor-not-allowed opacity-70'}`} aria-disabled={!enabled} aria-label={enabled ? `Build ${currentValue} at a time. Tap to switch to Build ${nextValue}` : 'Build x1. Construction Robotics Technology Required'} title={enabled ? `Tap to switch to Build ${nextValue}` : 'Construction Robotics Technology Required'} data-testid="button-construction-batch">{enabled ? <img src={`${import.meta.env.BASE_URL}item-icons/construction-robot.png`} width={16} height={16} alt="" aria-hidden="true" className="h-4 w-4 object-contain" /> : <LockKeyhole size={13} />} Build x{currentValue}</button>;
}
function Header({ eyebrow, title, copy, action, constructionBatchSize, onConstructionBatchSizeChange, constructionRoboticsUnlocked = false, notice }: { eyebrow: string; title: string; copy: string; action?: ReactNode; constructionBatchSize?: ConstructionBatchSize; onConstructionBatchSizeChange?: (value: ConstructionBatchSize) => void; constructionRoboticsUnlocked?: boolean; notice?: (message: string) => void }) {
  return <div className="mb-6 enter"><div className="eyebrow flex items-center gap-2 text-[hsl(var(--primary))]"><span className="h-px w-5 bg-[hsl(var(--primary))]" />{eyebrow}</div><div className="flex items-center justify-between gap-3"><h1 className="mt-2 min-w-0 text-[clamp(1.65rem,4vw,2.5rem)] font-extrabold tracking-[-.04em]">{title}</h1>{constructionBatchSize !== undefined && onConstructionBatchSizeChange && <ConstructionBatchToggle value={constructionBatchSize} onChange={onConstructionBatchSizeChange} enabled={constructionRoboticsUnlocked} onLocked={() => notice?.('Construction Robotics Technology Required')} />}</div><div className="mt-1 flex flex-col items-start gap-3"><p className="max-w-2xl text-[12px] text-[hsl(var(--muted-foreground))]">{copy}</p>{action && <div className="flex flex-wrap items-center justify-start gap-2">{action}</div>}</div></div>;
}
function SectionTitle({ children, detail }: { children: ReactNode; detail?: string }) { return <div className="mb-3 flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-1"><span className="eyebrow min-w-0">{children}</span>{detail && <span className="mono min-w-0 max-w-full text-right text-[10px] text-[hsl(var(--muted-foreground))]">{detail}</span>}</div>; }
function Progress({ value, tone = 'teal', realtime = false }: { value: number; tone?: 'teal' | 'amber' | 'red'; realtime?: boolean }) { return <div className="progress-track"><div className={`progress-fill ${tone === 'amber' ? 'amber' : tone === 'red' ? 'red' : ''}`} style={{ width: `${Math.max(0, Math.min(100, value))}%`, transition: realtime ? 'none' : undefined }} /></div>; }
function StoredQuantity({ value, manualEvent = 0, children, className = '', title }: { value: number; manualEvent?: number; children: ReactNode; className?: string; title?: string }) {
  const previousManualEvent = useRef(manualEvent);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    const completedManually = manualEvent !== previousManualEvent.current;
    previousManualEvent.current = manualEvent;
    if (!completedManually) return;
    setFlashing(true);
    const timeout = window.setTimeout(() => setFlashing(false), storedQuantityFlashDurationMs);
    return () => window.clearTimeout(timeout);
  }, [manualEvent]);
  return <span className={`${className} ${flashing ? 'quantity-increment-flash' : ''}`.trim()} title={title}>{children}</span>;
}
function CompactMetricsRow({ production, peakProduction, demand, peakConsumption, net, storage, capacity, manualOutputEvent = 0, peakWarning = false }: { production: number; peakProduction: number; demand: number; peakConsumption: number; net: number; storage: number; capacity: number; manualOutputEvent?: number; peakWarning?: boolean }) {
  const rate = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
  const metric = ({ label, value, tone, flashStorage }: { label: string; value: string; tone: string; flashStorage?: boolean }) => <div className="min-w-0 text-center" key={label} title={`${label}: ${value}`}><div className="truncate text-[8px] uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]">{label}</div><div className={`mono mt-1 truncate text-[10px] font-semibold ${tone}`}>{flashStorage ? <><StoredQuantity value={storage} manualEvent={manualOutputEvent}>{fmt(storage)}</StoredQuantity>/{fmt(capacity)}</> : value}</div></div>;
  return <div className="mt-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_10%/.72)] px-2 py-2" aria-label="Production metrics">
    <div className="grid grid-cols-3 gap-1">
      {[
        { label: 'production', value: `${production.toFixed(1)}/m`, tone: 'text-[hsl(var(--secondary))]' },
        { label: 'consumption', value: `${demand.toFixed(1)}/m`, tone: 'text-[hsl(var(--primary))]' },
        { label: 'net', value: `${rate(net)}/m`, tone: net < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--secondary))]' },
      ].map(metric)}
    </div>
    <div className="mt-2 grid grid-cols-3 gap-1 border-t border-[hsl(var(--border)/.7)] pt-2">
      {[
         { label: 'peak production', value: `${peakProduction.toFixed(1)}/m`, tone: peakWarning ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--secondary)/.7)]' },
         { label: 'peak consumption', value: `${peakConsumption.toFixed(1)}/m`, tone: peakWarning ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary)/.7)]' },
         { label: 'storage', value: `${fmt(storage)}/${fmt(capacity)}`, tone: 'text-[hsl(var(--foreground))]', flashStorage: true },
      ].map(metric)}
    </div>
  </div>;
}
function PowerMetrics({ production, peakProduction, productionUnit, consumption, peakConsumption, consumptionUnit }: { production: number; peakProduction: number; productionUnit: string; consumption: number; peakConsumption: number; consumptionUnit: string }) {
  const metric = ({ label, value, tone }: { label: string; value: string; tone: string }) => <div className="data-row rounded-lg p-2.5" key={label}><div className="eyebrow">{label}</div><div className={`mono mt-1 text-[13px] ${tone}`}>{value}</div></div>;
  return <div className="mt-3 grid grid-cols-2 gap-2">
    {[
      { label: 'production', value: `${production.toFixed(1)} ${productionUnit}`, tone: 'text-[hsl(var(--secondary))]' },
      { label: 'peak production', value: `${peakProduction.toFixed(1)} ${productionUnit}`, tone: 'text-[hsl(var(--secondary)/.7)]' },
      { label: 'current usage', value: `${consumption.toFixed(1)} ${consumptionUnit}`, tone: 'text-[hsl(var(--primary))]' },
      { label: 'peak usage', value: `${peakConsumption.toFixed(1)} ${consumptionUnit}`, tone: 'text-[hsl(var(--primary)/.7)]' },
    ].map(metric)}
  </div>;
}
function SteamUtilisation({ label, percent }: { label: string; percent: number }) {
  const boundedPercent = Math.max(0, Math.min(100, percent));
  return <div className="mt-3 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3">
    <div className="flex items-center justify-between gap-2">
      <div className="eyebrow">{label}</div>
      <div className="mono text-[13px] font-semibold text-[hsl(var(--secondary))]">{boundedPercent.toFixed(0)}%</div>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--border))]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={boundedPercent}>
      <div className="h-full rounded-full bg-[hsl(var(--secondary))] transition-[width]" style={{ width: `${boundedPercent}%` }} />
    </div>
  </div>;
}
const visualProgressFor = (seconds: number, total: number, leadSeconds = 0) =>
  Math.max(0, Math.min(100, (1 - Math.max(0, seconds - Math.max(0, leadSeconds)) / Math.max(0.0001, total)) * 100));
function useConstructionVisualProgress(key: string, startedAt: number | undefined, durationMs: number | undefined, fallback: number) {
  const [frame, setFrame] = useState(() => ({ key, now: Date.now() }));
  const now = frame.key === key ? frame.now : (startedAt ?? Date.now());

  useEffect(() => {
    setFrame({ key, now: startedAt ?? Date.now() });
    if (startedAt === undefined || durationMs === undefined) return;
    let animationFrame = 0;
    const update = () => {
      setFrame({ key, now: Date.now() });
      animationFrame = window.requestAnimationFrame(update);
    };
    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [key, startedAt, durationMs]);

  return startedAt !== undefined && durationMs !== undefined
    ? constructionVisualProgressFor(Math.max(now, startedAt), startedAt, durationMs)
    : fallback;
}
function BuildProgress({ items, label, cancelConstruction, notice }: { items: QueueItem[]; label: string; cancelConstruction?: (id: string) => void; notice?: (message: string) => void }) {
  const active = items[0];
  const activeQuantity = active?.quantity ?? 1;
  const waitingForMaterials = active?.started === false;
  const fallbackProgress = waitingForMaterials
    ? Math.min(...(active?.costs ?? []).map((cost, index) => (active?.reserved?.[index] ?? 0) / Math.max(0.0001, cost.amount) * 100), 0)
    : active ? visualProgressFor(active.seconds, active.total, 1) : 0;
  const complete = useConstructionVisualProgress(
    active ? `${active.id}:${active.progressStartedAt ?? 'legacy'}` : 'empty',
    waitingForMaterials ? undefined : active?.progressStartedAt,
    waitingForMaterials ? undefined : active?.progressDurationMs,
    fallbackProgress,
  );
  if (!active) return null;
  const missing = waitingForMaterials
    ? (active.costs ?? []).map((cost, index) => {
      const amount = Math.max(0, cost.amount - (active.reserved?.[index] ?? 0));
      return amount > 0 ? `${Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2)} ${meta[cost.key]?.label.toLowerCase() ?? prettyLabel(cost.key).toLowerCase()}` : '';
    }).filter(Boolean).join(' + ')
    : '';
  return <div className="construction-panel mt-3 min-w-0 overflow-hidden rounded-lg p-3" aria-live="polite" data-testid={`panel-construction-${active.id}`}>
     <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="construction-pulse mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"><Hammer size={12} /></div>
        <div className="min-w-0">
          <div className="eyebrow text-[hsl(var(--primary))]">{waitingForMaterials ? 'Materials requested' : 'Construction in progress'}</div>
           <div className="mt-1 truncate text-[10px] font-bold">{label}{activeQuantity > 1 ? ` · batch of ${activeQuantity}` : ''}{items.length > 1 ? ` · ${items.length} queued` : ''}</div>
        </div>
      </div>
        <div className="flex min-w-0 max-w-[55%] items-start justify-end gap-2">
          <span className="mono min-w-0 whitespace-normal break-words text-right text-[10px] leading-3 text-[hsl(var(--primary))]">{waitingForMaterials ? 'awaiting materials' : duration(active.seconds)}</span>
         {cancelConstruction && <button type="button" onClick={() => { cancelConstruction(active.id); notice?.(`${active.target} cancelled · materials refunded`); }} className="grid h-6 w-6 place-items-center rounded-md border border-[hsl(var(--destructive)/.45)] text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive)/.12)]" aria-label={`Cancel ${active.target}`} title="Cancel construction and refund materials" data-testid={`button-cancel-queue-${active.id}`}><X size={12} /></button>}
       </div>
    </div>
    <div className="mt-2"><Progress value={complete} tone="amber" realtime={active.progressStartedAt !== undefined && active.progressDurationMs !== undefined} /></div>
     <div className="mt-1 flex min-w-0 flex-wrap items-start justify-between gap-x-2 gap-y-1 mono text-[9px] text-[hsl(var(--muted-foreground))]"><span className="shrink-0">{waitingForMaterials ? `${Math.floor(Math.max(0, complete))}% funded` : `${Math.floor(Math.max(0, complete))}% complete`}</span><span className="min-w-0 flex-1 break-words text-right">{waitingForMaterials ? `needs ${missing}` : 'building now'}</span></div>
  </div>;
}
function HandcraftProgress({ job, recipe, simulationSpeed }: { job: HandcraftJob; recipe: Recipe; simulationSpeed: number }) {
  const output = recipeOutputs(recipe)[0];
  const finishing = job.seconds <= 0;
  const complete = useConstructionVisualProgress(
    `handcraft:${job.recipeKey}:${job.progressStartedAt ?? 'legacy'}`,
    job.progressStartedAt,
    job.progressDurationMs,
    visualProgressFor(job.seconds, job.total, simulationSpeed),
  );
  return <div className="construction-panel mt-3 rounded-lg p-3" aria-live="polite" data-testid={`panel-handcraft-${job.recipeKey}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="construction-pulse mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md">{output && <ResourceIcon item={output.key} size={15} />}</div>
        <div className="min-w-0">
          <div className="eyebrow text-[hsl(var(--primary))]">{finishing ? 'Handcraft completing' : 'Handcraft in progress'}</div>
          <div className="mt-1 truncate text-[10px] font-bold">{prettyLabel(job.recipeKey)}</div>
        </div>
      </div>
      <span className="mono shrink-0 text-[10px] text-[hsl(var(--primary))]">{finishing ? 'finishing' : `${job.seconds.toFixed(2)}s`}</span>
    </div>
    <div className="mt-2"><Progress value={complete} tone="amber" realtime={job.progressStartedAt !== undefined && job.progressDurationMs !== undefined} /></div>
    <div className="mt-1 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{finishing ? 'output will be stored above capacity if needed' : `${Math.floor(complete)}% complete`}</span><span>one item at a time</span></div>
  </div>;
}
function ManualMiningProgress({ job, simulationSpeed }: { job: ManualMiningJob; simulationSpeed: number }) {
  const progress = useConstructionVisualProgress(
    `manual-mining:${job.resourceKey}:${job.progressStartedAt ?? 'legacy'}`,
    job.progressStartedAt,
    job.progressDurationMs,
    visualProgressFor(job.seconds, job.total, simulationSpeed),
  );
  const complete = Math.floor(progress);
  return <div className="construction-panel mt-3 rounded-lg p-3" aria-live="polite" data-testid={`panel-manual-mining-${job.resourceKey}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="construction-pulse mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"><Pickaxe size={13} /></div>
        <div className="min-w-0">
          <div className="eyebrow text-[hsl(var(--primary))]">Manual mining in progress</div>
          <div className="mt-1 truncate text-[10px] font-bold">{prettyLabel(job.resourceKey)}</div>
        </div>
      </div>
      <span className="mono shrink-0 text-[10px] text-[hsl(var(--primary))]">{job.seconds.toFixed(2)}s</span>
    </div>
    <div className="mt-2"><Progress value={progress} tone="amber" realtime={job.progressStartedAt !== undefined && job.progressDurationMs !== undefined} /></div>
    <div className="mt-1 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{complete}% complete</span><span>one item at a time</span></div>
  </div>;
}

function RocketEndgameCard({ state, enqueue, notice, cancelConstruction }: Pick<PageProps, 'state' | 'enqueue' | 'notice' | 'cancelConstruction'>) {
  const siloQueued = state.queue.some((item) => item.action === 'rocketSilo');
  const partsQueued = state.queue.some((item) => item.action === 'rocketParts');
  const siloCanBuild = canBuildRocketSilo(state.rocketSiloBuilt, siloQueued);
  const partsRemaining = Math.max(0, ROCKET_PART_TARGET - state.rocketPartsBuilt);
  const partsComplete = state.rocketPartsBuilt >= ROCKET_PART_TARGET;
  const costLabel = (cost: BuildMaterialCost) => `${fmt(cost.amount)} ${meta[cost.key]?.short ?? prettyLabel(cost.key).toLowerCase()}`;
  const buildSilo = () => {
    if (!siloCanBuild) return notice(state.rocketSiloBuilt ? 'only one Rocket Silo can be built' : 'Rocket Silo construction is already queued');
    enqueue('rocketSilo', 'Rocket Silo', rocketSiloRecipe.energyRequired, 'rocket-silo', rocketSiloBuildCost);
    notice('Rocket Silo construction queued');
  };
  const buildParts = () => {
    if (!state.rocketSiloBuilt) return notice('construct the Rocket Silo first');
    if (partsComplete) return notice('all 100 rocket parts are complete');
    if (partsQueued) return notice('rocket part construction is already queued');
    enqueue('rocketParts', `Rocket Parts · ${ROCKET_PART_TARGET}`, rocketPartBatchTimeFor(rocketPartRecipe), 'rocket-part', rocketPartBatchCost);
    notice(`${ROCKET_PART_TARGET} rocket parts queued`);
  };
  return <article id="production-rocket-part" className="relative scroll-mt-24 overflow-hidden rounded-xl border-[3px] border-transparent p-4 shadow-lg sm:p-5 md:col-span-2 xl:col-span-3" style={{ background: 'linear-gradient(145deg, hsl(35 24% 16%), hsl(216 25% 12%)) padding-box, repeating-linear-gradient(135deg, #f5b52e 0 11px, #15181a 11px 22px) border-box' }} data-testid="card-win-factory-planet">
    <div className="relative z-10">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[hsl(var(--primary)/.55)] bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><Rocket size={22} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="eyebrow text-[hsl(var(--primary))]">Endgame sequence</div><h2 className="mt-1 text-[15px] font-extrabold">Win Factory Planet</h2></div><Tag tone={partsComplete ? 'teal' : 'amber'}>{partsComplete ? <><Check size={10} /> rocket ready</> : state.rocketSiloBuilt ? 'silo online' : 'silo required'}</Tag></div>
        <p className="mt-2 max-w-3xl text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">Complete the launch sequence: construct one Rocket Silo, then build 100 Rocket Parts. The construction queue will reserve available materials and fund the sequence as production arrives.</p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className={`rounded-xl border p-3.5 ${state.rocketSiloBuilt ? 'border-[hsl(var(--secondary)/.35)] bg-[hsl(var(--secondary)/.06)]' : 'border-[hsl(var(--primary)/.3)] bg-[hsl(216_24%_10%/.7)]'}`} data-testid="panel-rocket-silo-step">
        <div className="flex items-center justify-between gap-2"><div className="eyebrow">01 · Rocket Silo</div><span className="mono text-[10px] text-[hsl(var(--secondary))]">{state.rocketSiloBuilt ? 'constructed' : siloQueued ? 'queued' : '1 required'}</span></div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">{rocketSiloBuildCost.map((cost) => <span className="resource-chip !px-1.5 !py-1" key={`${cost.source}-${cost.key}`}><ResourceIcon item={cost.key} size={15} />{costLabel(cost)}</span>)}<span className="resource-chip !px-1.5 !py-1"><Clock3 size={14} />{rocketSiloRecipe.energyRequired}s</span></div>
        {siloQueued && <BuildProgress items={state.queue.filter((item) => item.action === 'rocketSilo')} label="Rocket Silo" cancelConstruction={cancelConstruction} notice={notice} />}
         <button onClick={buildSilo} disabled={!siloCanBuild} className={`button-base mt-4 w-full !py-2 ${state.rocketSiloBuilt || siloQueued ? 'button-ghost' : 'button-primary'} disabled:cursor-not-allowed disabled:opacity-45`} data-testid="button-build-rocket-silo">{state.rocketSiloBuilt ? <><Check size={13} /> Rocket Silo constructed</> : siloQueued ? <><Clock3 size={13} /> construction queued</> : <><Hammer size={13} /> construct Rocket Silo</>}</button>
      </div>
      <div className={`rounded-xl border p-3.5 ${partsComplete ? 'border-[hsl(var(--secondary)/.45)] bg-[hsl(var(--secondary)/.08)]' : 'border-[hsl(var(--border))] bg-[hsl(216_24%_10%/.7)]'}`} data-testid="panel-rocket-parts-step">
        <div className="flex items-center justify-between gap-2"><div className="eyebrow">02 · Rocket Parts</div><span className="mono text-[10px] text-[hsl(var(--secondary))]">{fmt(state.rocketPartsBuilt)} / {ROCKET_PART_TARGET}</span></div>
        <div className="mt-2"><Progress value={state.rocketPartsBuilt / ROCKET_PART_TARGET * 100} tone={partsComplete ? 'teal' : 'amber'} /></div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">{rocketPartBuildCost.map((cost) => <span className="resource-chip !px-1.5 !py-1" key={`${cost.source}-${cost.key}`}><ResourceIcon item={cost.key} size={15} />{costLabel(cost)} / part</span>)}<span className="resource-chip !px-1.5 !py-1"><Clock3 size={14} />{rocketPartRecipe.energyRequired}s / part</span></div>
        <div className="mt-2 text-[9px] text-[hsl(var(--muted-foreground))]">Batch requirement: {partsRemaining ? `${fmt(partsRemaining)} more · ${fmt(rocketPartBatchCost.reduce((total, cost) => total + cost.amount, 0))} total materials shown by line` : '100 parts complete'}</div>
        {partsQueued && <BuildProgress items={state.queue.filter((item) => item.action === 'rocketParts')} label={`Rocket Parts · ${ROCKET_PART_TARGET}`} cancelConstruction={cancelConstruction} notice={notice} />}
         <button onClick={buildParts} disabled={!state.rocketSiloBuilt || partsComplete || partsQueued} className={`button-base mt-4 w-full !py-2 ${partsComplete ? 'button-ghost' : 'button-primary'} disabled:cursor-not-allowed disabled:opacity-45`} data-testid="button-build-rocket-parts">{!state.rocketSiloBuilt ? <><LockKeyhole size={13} /> requires Rocket Silo</> : partsComplete ? <><Check size={13} /> 100 parts complete</> : partsQueued ? <><Clock3 size={13} /> construction queued</> : <><Hammer size={13} /> construct 100 rocket parts</>}</button>
      </div>
    </div>
    </div>
  </article>;
}

type TutorialGoal = { id: string; label: string; complete: boolean };

function tutorialGoalsFor(state: GameState): TutorialGoal[] {
  const furnaceBuilt = Array.from(smeltingRecipeKeys).some((recipeKey) => (state.assemblers[recipeKey] ?? 0) > 0);
  return [
    { id: 'mine-iron', label: 'Mine your first iron', complete: (state.produced.iron ?? 0) > 0 },
    { id: 'chop-tree', label: 'Chop down a tree', complete: (state.produced.wood ?? 0) > 0 },
    { id: 'build-furnace', label: 'Build your first furnace', complete: furnaceBuilt },
    { id: 'smelt-metal', label: 'Smelt your first metal (iron or copper)', complete: (state.produced.ironPlate ?? 0) > 0 || (state.produced.copperPlate ?? 0) > 0 },
    { id: 'craft-gear', label: 'Craft your first iron gear', complete: (state.produced.gear ?? 0) > 0 },
    { id: 'automate-mining', label: 'Automate mining for iron, copper, stone and coal', complete: (['iron', 'copper', 'stone', 'coal'] as RawKey[]).every((key) => state.miners[key] > 0) },
    { id: 'produce-electricity', label: 'Turn the lights on (produce electricity)', complete: powerProductionFor(state) > 0 },
    { id: 'build-lab', label: 'Build your first lab', complete: state.labs > 0 },
    { id: 'research-automation', label: 'Research automation', complete: state.research.includes('automation') },
    { id: 'automate-early-production', label: 'Automate production of gears and automation science packs', complete: (state.assemblers['iron-gear-wheel'] ?? 0) > 0 && (state.assemblers['automation-science-pack'] ?? 0) > 0 },
    { id: 'unlock-logistics-science', label: 'Unlock logistics science', complete: state.research.includes('logistic-science-pack') },
    { id: 'unlock-military-science', label: 'Unlock military science', complete: state.research.includes('military-science-pack') },
    { id: 'unlock-chemical-science', label: 'Unlock chemical science', complete: state.research.includes('chemical-science-pack') },
    { id: 'unlock-production-science', label: 'Unlock production science', complete: state.research.includes('production-science-pack') },
    { id: 'unlock-utility-science', label: 'Unlock utility science', complete: state.research.includes('utility-science-pack') },
    { id: 'unlock-rocket-silo', label: 'Unlock rocket silo to escape the planet', complete: state.research.includes('rocket-silo') },
  ];
}

function TutorialSection({ state }: { state: GameState }) {
  const [expanded, setExpanded] = useState(false);
  const goals = tutorialGoalsFor(state);
  const completedCount = goals.filter((goal) => goal.complete).length;
  const numberedGoals = goals.map((goal, index) => ({ goal, index }));
  const visibleGoals = expanded ? numberedGoals : numberedGoals.filter(({ goal }) => !goal.complete).slice(0, 4);
  return <section className="relative overflow-hidden rounded-xl border-[3px] border-transparent p-4 shadow-lg sm:p-5" style={{ background: 'linear-gradient(145deg, hsl(35 24% 16%), hsl(216 25% 12%)) padding-box, repeating-linear-gradient(135deg, #f5b52e 0 11px, #15181a 11px 22px) border-box' }} data-testid="panel-tutorial">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-.03em]">Getting Started:</h2>
        <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Goals to help you progress.</p>
      </div>
      <div className="shrink-0 rounded-lg border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.08)] px-2.5 py-2 text-right">
        <div className="mono text-[15px] font-bold text-[hsl(var(--primary))]">{completedCount}/{goals.length}</div>
        <div className="eyebrow mt-0.5">complete</div>
      </div>
    </div>
    <div className="mt-4 grid gap-1.5">
      {visibleGoals.map(({ goal, index }) => <div key={goal.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] transition-colors ${goal.complete ? 'border-[hsl(var(--secondary)/.28)] bg-[hsl(var(--secondary)/.07)] text-[hsl(var(--secondary))]' : 'border-[hsl(var(--border)/.8)] bg-[hsl(216_24%_10%/.55)] text-[hsl(var(--foreground))]'}`} data-testid={`tutorial-goal-${goal.id}`}>
        <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${goal.complete ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.16)]' : 'border-[hsl(var(--muted-foreground)/.7)]'}`}>{goal.complete && <Check size={10} />}</span>
        <span className={`leading-4 ${goal.complete ? 'font-semibold line-through' : ''}`}>{index + 1}. {goal.label}</span>
      </div>)}
    </div>
    <button onClick={() => setExpanded((value) => !value)} className="button-base button-ghost mt-4 w-full !py-2" aria-expanded={expanded} data-testid="button-toggle-tutorial">
      <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
      {expanded ? 'Show fewer' : 'Show more'}
    </button>
  </section>;
}

function FactoryPage({ state, setState, away, recovered, offlineReportVisible, dismissOfflineReport, notice, cancelConstruction }: PageProps) {
  const active = totalUnits(state);
  const powerProduction = powerProductionFor(state);
  const draw = electricPowerDraw(state);
  const powerRatio = electricPowerRatioFor(state);
  const history = state.rateHistory ?? [];
  const historySeconds = history.reduce((total, sample) => total + sample.seconds, 0);
  const aggregateRate = (field: 'production' | 'consumption') => trackedKeys.reduce((total, key) => total + rateFromHistory(state, key, field), 0);
  const dashboardAverageRate = (field: 'production' | 'consumption') => {
    const rates = trackedKeys.map((key) => recentRateFromHistory(state, key, field, dashboardRateWindowSeconds));
    return rates.every((rate): rate is number => rate !== null) ? rates.reduce((total, rate) => total + rate, 0) : null;
  };
  const observedProduction = aggregateRate('production');
  const observedConsumption = aggregateRate('consumption');
  const netFlow = observedProduction - observedConsumption;
  const dashboardObservedProduction = dashboardAverageRate('production');
  const dashboardObservedConsumption = dashboardAverageRate('consumption');
  const dashboardNetFlow = dashboardObservedProduction === null || dashboardObservedConsumption === null
    ? null
    : dashboardObservedProduction - dashboardObservedConsumption;
  const dashboardAverageReady = dashboardNetFlow !== null;
  const dashboardAverageLabel = dashboardAverageReady
    ? `${dashboardRateWindowSeconds} sec avg · items / min`
    : `warming up · ${Math.min(dashboardRateWindowSeconds, Math.floor(historySeconds))}/${dashboardRateWindowSeconds} sec`;
  const ratedCapacity = trackedKeys.reduce((total, key) => total + peakProductionRateFor(state, key), 0);
  const activeAssemblers = productionUnitCount(state);
  const starvedLines = componentKeys.filter((key) => {
    const recipe = recipeMap[key];
    return (state.assemblers[key] ?? 0) > 0 && !hasInputs(state, automatedRecipeInputsFor(state, recipe));
  }).length;
  const rawDemandLines = rawKeys.filter((key) => peakDemandRateFor(state, key) > 0);
  const rawShortages = rawDemandLines.filter((key) => miningProductionRateFor(state, key) < peakDemandRateFor(state, key)).length;
  const tightStorage = trackedKeys.filter((key) => {
    const capacity = capFor(state, key);
    return capacity > 0 && quantityFor(state, key) / capacity >= .95;
  }).length;
  const storageTracked = trackedKeys.filter((key) => capFor(state, key) > 0).length;
  const researchTarget = activeResearchFor(state);
  const researchableCount = orderedTechnologyCatalog.filter((technology) => !state.research.includes(technology.name) && technologyPrerequisitesMet(state, technology)).length;
  const constructionCount = state.queue.length;
  const waitingConstructionCount = state.queue.filter((item) => item.started === false).length;
  const healthParts = [
    powerRatio,
    activeAssemblers ? Math.max(0, 1 - starvedLines / Math.max(1, activeAssemblers)) : 1,
    rawDemandLines.length ? Math.max(0, 1 - rawShortages / rawDemandLines.length) : 1,
    storageTracked ? Math.max(0, 1 - tightStorage / storageTracked) : 1,
  ];
  const networkHealth = Math.round(healthParts.reduce((total, value) => total + value, 0) / healthParts.length * 100);
  const healthLabel = networkHealth >= 85 ? 'Stable' : networkHealth >= 60 ? 'Watch' : 'Intervention';
  const powerState = draw <= 0 ? { tone: 'muted' as const, label: 'idle', detail: 'No electrical demand is active.', href: '/power', action: 'open power' } : powerRatio >= 1 ? { tone: 'teal' as const, label: 'online', detail: `${powerLabel(powerProduction)} MW generated against ${powerLabel(draw)} MW demand.`, href: '/power', action: 'inspect power' } : { tone: 'red' as const, label: 'limited', detail: `${Math.round(powerRatio * 100)}% of live electrical demand is covered.`, href: '/power', action: 'balance power' };
  const productionState = activeAssemblers <= 0 ? { tone: 'muted' as const, label: 'idle', detail: 'No automated production units are active.', href: '/production', action: 'open production' } : starvedLines > 0 ? { tone: 'amber' as const, label: 'constrained', detail: `${starvedLines} of ${activeAssemblers} production lines need input coverage.`, href: '/production', action: 'review inputs' } : { tone: 'teal' as const, label: 'running', detail: `${activeAssemblers} production units have their recipe inputs covered.`, href: '/production', action: 'inspect lines' };
  const miningState = rawDemandLines.length === 0 ? { tone: 'muted' as const, label: 'standby', detail: 'No raw-material demand is recorded yet.', href: '/mining', action: 'open mining' } : rawShortages > 0 ? { tone: 'amber' as const, label: 'tight', detail: `${rawShortages} of ${rawDemandLines.length} demanded raw-material flows are below their rate target.`, href: '/mining', action: 'expand mining' } : { tone: 'teal' as const, label: 'supplied', detail: `${rawDemandLines.length} demanded raw-material flows are meeting their current targets.`, href: '/mining', action: 'inspect supply' };
  const storageState = storageTracked === 0 ? { tone: 'muted' as const, label: 'unbuilt', detail: 'Storage headroom is not configured yet.', href: '/storage', action: 'configure storage' } : tightStorage > 0 ? { tone: 'amber' as const, label: 'tight', detail: `${tightStorage} tracked inventories are at or near their current capacity.`, href: '/storage', action: 'free headroom' } : { tone: 'teal' as const, label: 'clear', detail: `${storageTracked - tightStorage} tracked inventories have available headroom.`, href: '/storage', action: 'inspect storage' };
  const researchState = researchTarget ? { tone: 'teal' as const, label: 'active', detail: `${researchTarget.name} · ${Math.round(researchProgressPercentFor(state, researchTarget))}% complete.`, href: '/research', action: 'open research' } : researchableCount > 0 ? { tone: 'amber' as const, label: 'ready', detail: `${researchableCount} technology path${researchableCount === 1 ? '' : 's'} can be selected.`, href: '/research', action: 'choose research' } : { tone: 'muted' as const, label: 'idle', detail: `${state.research.length} technologies completed so far.`, href: '/research', action: 'inspect research' };
  const constructionState = constructionCount > 0
    ? waitingConstructionCount > 0
      ? { tone: 'amber' as const, label: 'awaiting materials', detail: `${waitingConstructionCount} construction request${waitingConstructionCount === 1 ? '' : 's'} need more materials before timing starts.`, href: '/production', action: 'fund queue' }
      : { tone: 'amber' as const, label: 'building', detail: `${constructionCount} queued construction item${constructionCount === 1 ? '' : 's'} are progressing.`, href: '/production', action: 'view queue' }
    : { tone: 'muted' as const, label: 'clear', detail: 'No construction is in flight.', href: '/production', action: 'choose a build' };
  const groupRows = [
    { label: 'Production', icon: Cog, state: productionState },
    { label: 'Power', icon: BatteryCharging, state: powerState },
    { label: 'Mining / raw', icon: Pickaxe, state: miningState },
    { label: 'Storage', icon: Box, state: storageState },
    { label: 'Research', icon: FlaskConical, state: researchState },
    { label: 'Construction', icon: Hammer, state: constructionState },
  ];
  const primaryConstraint = constructionCount > 0
    ? waitingConstructionCount > 0
      ? { eyebrow: 'Construction is waiting', title: `${waitingConstructionCount} request${waitingConstructionCount === 1 ? '' : 's'} awaiting materials`, copy: 'Available materials are reserved first, and future production will fund the queue before it reaches storage.', href: '/production', action: 'fund construction' }
      : { eyebrow: 'Construction is moving', title: `${constructionCount} item${constructionCount === 1 ? '' : 's'} in the build queue`, copy: 'Keep the queue moving, then use the network signals to pick the next expansion.', href: '/production', action: 'view construction' }
    : powerRatio < 1 && draw > 0
      ? { eyebrow: 'Power is the pressure point', title: 'Electrical coverage is below live demand', copy: 'Balance generation before adding more powered capacity.', href: '/power', action: 'balance power' }
      : starvedLines > 0
        ? { eyebrow: 'Production needs attention', title: `${starvedLines} production line${starvedLines === 1 ? '' : 's'} lack input coverage`, copy: 'Review the production network and clear its shared input constraints.', href: '/production', action: 'review production' }
        : rawShortages > 0
          ? { eyebrow: 'Mining is the pressure point', title: 'Raw supply is below current demand', copy: 'Add extraction capacity or let the existing buffer recover before scaling the line.', href: '/mining', action: 'expand mining' }
          : tightStorage > 0
            ? { eyebrow: 'Storage is the pressure point', title: 'Inventory headroom is getting tight', copy: 'Open storage to add capacity before output starts backing up.', href: '/storage', action: 'manage storage' }
            : researchableCount > 0
              ? { eyebrow: 'Next move', title: 'A research path is ready to select', copy: 'Choose the next technology to turn idle capacity into a new production option.', href: '/research', action: 'choose research' }
              : { eyebrow: 'Network is clear', title: 'No active constraint detected', copy: 'Your current production, power, mining, and storage groups are holding steady.', href: '/production', action: 'survey production' };
  const pulseRates = history.map((sample) => {
    const seconds = Math.max(.01, sample.seconds);
    return Object.values(sample.production).reduce((total, amount) => total + amount, 0) / seconds * 60;
  });
  const pulsePeak = Math.max(...pulseRates, 0);
  const IconFor = ({ icon: Icon }: { icon: typeof Cog }) => <Icon size={15} />;
  const circuitNetworkUnlocked = state.research.includes('circuit-network');
  const dashboardMetricsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = dashboardMetricsRef.current;
    if (!element) return;
    if (circuitNetworkUnlocked) element.removeAttribute('inert');
    else element.setAttribute('inert', '');
  }, [circuitNetworkUnlocked]);
  const constructionQueue = <section className="surface mb-5 rounded-xl p-4 sm:p-5"><SectionTitle detail={`${constructionCount} queued`}>Construction queue</SectionTitle>{constructionCount ? <div className="space-y-2">{state.queue.map((item) => {
    const waitingForMaterials = item.started === false;
       const progress = waitingForMaterials
      ? Math.min(...(item.costs ?? []).map((cost, index) => (item.reserved?.[index] ?? 0) / Math.max(0.0001, cost.amount) * 100), 0)
       : visualProgressFor(item.seconds, item.total, 1);
     return <div className="data-row flex items-center gap-3 rounded-lg p-2.5" key={item.id} data-testid={`row-factory-queue-${item.id}`}><div className="grid h-7 w-7 place-items-center rounded-md bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">{item.action === 'upgrade' ? <TrendingUp size={14} /> : <Hammer size={14} />}</div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold">{item.target} <span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">· {waitingForMaterials ? 'materials requested' : item.action}</span></div><Progress value={progress} tone="amber" /></div><span className="mono shrink-0 text-[10px] text-[hsl(var(--primary))]">{waitingForMaterials ? 'awaiting materials' : duration(item.seconds)}</span><button type="button" onClick={() => { cancelConstruction(item.id); notice(`${item.target} cancelled · materials refunded`); }} className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[hsl(var(--destructive)/.45)] text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive)/.12)]" aria-label={`Cancel ${item.target}`} title="Cancel construction and refund materials" data-testid={`button-cancel-queue-${item.id}`}><X size={12} /></button></div>;
  })}</div> : <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4"><div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]"><Clock3 size={14} /><span className="text-[11px]">Queue clear</span></div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Nothing is under construction. Choose a build from a control tab when the network is ready.</p></div>}</section>;
  return <PageFrame>
    {offlineReportVisible && away >= 60 && recovered > 0 && <div className="surface mb-5 flex flex-col gap-3 rounded-xl border-[hsl(var(--secondary)/.4)] bg-[linear-gradient(100deg,hsl(174_35%_17%/.8),hsl(216_25%_14%/.96))] p-4 sm:flex-row sm:items-center sm:justify-between enter" data-testid="status-offline-production"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]"><RotateCcw size={18} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Network recovered</div><div className="mt-1 text-[13px] font-bold">{duration(away)} of offline production reconciled</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">The line added <span className="mono text-[hsl(var(--secondary))]">{fmt(recovered)} items</span> while the control room was closed.</div></div></div><button onClick={() => { dismissOfflineReport(); notice('offline report acknowledged'); }} className="button-base button-ghost shrink-0" data-testid="button-dismiss-offline">acknowledge <ArrowRight size={13} /></button></div>}
    <Header eyebrow="Control Room" title="Dashboard" copy="Live production metrics to optimise efficiency." action={<Tag><span className="status-dot status-running mini-pulse" /> line online · {state.simulationSpeed}x</Tag>} />
    {state.tutorialVisible && <div className="mb-5"><TutorialSection state={state} /></div>}
    {constructionQueue}
    {!circuitNetworkUnlocked && <div className="mb-5 flex items-start gap-3 rounded-xl border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.08)] p-4" role="status" data-testid="dashboard-metrics-lock-message"><Info size={17} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" /><p className="text-[11px] leading-5 text-[hsl(var(--foreground))]">Full metrics will be available after unlocking the Circuit Network technology.</p></div>}
    <div ref={dashboardMetricsRef} aria-disabled={!circuitNetworkUnlocked} className={!circuitNetworkUnlocked ? 'pointer-events-none select-none opacity-45 grayscale' : ''} data-testid="dashboard-full-metrics">
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 enter enter-delay-1">
      {[
        { label: 'Observed output', value: dashboardObservedProduction === null ? '--' : dashboardObservedProduction.toFixed(1), suffix: dashboardAverageLabel, icon: TrendingUp, color: 'text-[hsl(var(--secondary))]' },
        { label: 'Network flow', value: dashboardNetFlow === null ? '--' : `${dashboardNetFlow >= 0 ? '+' : ''}${dashboardNetFlow.toFixed(1)}`, suffix: dashboardAverageLabel.replace('items / min', 'items / min net'), icon: Waves, color: dashboardNetFlow !== null && dashboardNetFlow < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--secondary))]' },
        { label: 'Operating units', value: fmt(active), suffix: 'machines + labs', icon: Activity, color: 'text-[#83d993]' },
        { label: 'Lifetime output', value: fmt(state.totalOutput), suffix: 'items produced', icon: Layers3, color: 'text-[hsl(var(--primary))]' },
      ].map((metric) => <div className="surface rounded-xl p-3.5" key={metric.label}><div className={`mb-2 flex items-center gap-2 ${metric.color}`}><metric.icon size={14} /><span className="eyebrow">{metric.label}</span></div><div className="mono text-[19px]">{metric.value} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{metric.suffix}</span></div></div>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <section className="surface rounded-xl p-4 sm:p-5 enter enter-delay-2">
        <div className="flex items-start justify-between gap-3">
          <div><SectionTitle detail={`${groupRows.length} groups`}>Network command</SectionTitle><h2 className="mt-1 text-xl font-extrabold tracking-tight">{healthLabel} <span className="mono text-[11px] font-normal text-[hsl(var(--secondary))]">{networkHealth}% ready</span></h2><p className="mt-1 max-w-xl text-[11px] text-[hsl(var(--muted-foreground))]">Live readiness across production, power, raw supply, and storage headroom.</p></div>
          <Gauge size={22} className={networkHealth >= 60 ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'} />
        </div>
        <div className="mt-4"><Progress value={networkHealth} tone={networkHealth < 60 ? 'red' : networkHealth < 85 ? 'amber' : 'teal'} /><div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>network readiness</span><span>{historySeconds ? `${Math.round(historySeconds)} sec sampled` : 'sample collection starting'}</span></div></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {groupRows.map((row) => <div className="data-row rounded-lg p-3" key={row.label}><div className="flex items-center gap-2"><span className="text-[hsl(var(--secondary))]"><IconFor icon={row.icon} /></span><span className="text-[11px] font-bold">{row.label}</span><Tag tone={row.state.tone}>{row.state.label}</Tag></div><div className="mt-2 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{row.state.detail}</div><Link href={row.state.href} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--primary))] no-underline" data-testid={`link-factory-${row.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{row.state.action}<ChevronRight size={12} /></Link></div>)}
        </div>
        <div className="construction-panel mt-4 rounded-xl p-4"><div className="eyebrow text-[hsl(var(--primary))]">{primaryConstraint.eyebrow}</div><div className="mt-1 flex items-start justify-between gap-3"><div><h3 className="text-[14px] font-extrabold">{primaryConstraint.title}</h3><p className="mt-1 max-w-xl text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{primaryConstraint.copy}</p></div><TriangleAlert size={18} className={constructionCount || powerRatio < 1 || starvedLines || rawShortages || tightStorage ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--secondary))]'} /></div><Link href={primaryConstraint.href} className="button-base button-ghost mt-3 no-underline" data-testid="link-factory-next-action">{primaryConstraint.action}<ArrowRight size={13} /></Link></div>
      </section>
       <div className="space-y-5">
         <section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={researchTarget ? `${Math.round(researchProgressPercentFor(state, researchTarget))}% complete` : `${state.research.length} complete`}>Research watch</SectionTitle>{researchTarget ? <div className="surface-soft rounded-lg p-3"><div className="flex items-start justify-between gap-2"><div><div className="eyebrow text-[hsl(var(--secondary))]">Active target</div><div className="mt-1 text-[12px] font-bold">{researchTarget.name}</div></div><FlaskConical size={17} className="text-[hsl(var(--secondary))]" /></div><div className="mt-3"><Progress value={researchProgressPercentFor(state, researchTarget)} /><div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{fmt(researchProgressFor(state, researchTarget))} / {fmt(researchUnitsFor(researchTarget))} units</span><span>{activeResearchTimeRemainingFor(state, researchTarget) === null ? 'triggered path' : duration(activeResearchTimeRemainingFor(state, researchTarget) ?? 0)}</span></div></div></div> : <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-3 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{researchableCount ? `${researchableCount} technology path${researchableCount === 1 ? '' : 's'} ready when you are.` : 'No research target is active right now.'}</div>}<Link href="/research" className="button-base button-ghost mt-3 w-full no-underline" data-testid="link-factory-research">open research <ArrowRight size={13} /></Link></section>
        <section className="surface rounded-xl p-4 sm:p-5"><div className="flex items-center justify-between"><SectionTitle detail={historySeconds ? `${Math.round(historySeconds)} sec sampled` : 'no samples'}>Network pulse</SectionTitle><Activity size={15} className="text-[hsl(var(--secondary))]" /></div>{pulseRates.length ? <><div className="grid-lines flex h-20 items-end gap-1 rounded-lg border border-[hsl(var(--border))] px-2 pb-2 pt-3">{pulseRates.map((rate, index) => <div key={`${rate}-${index}`} className="min-h-[3px] flex-1 rounded-t-sm bg-[hsl(var(--secondary)/.68)]" style={{ height: `${Math.max(4, rate / Math.max(pulsePeak, .01) * 100)}%` }} title={`${rate.toFixed(1)} items / min`} />)}</div><div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>oldest sample</span><span>now · {observedProduction.toFixed(1)} / min</span></div></> : <div className="grid h-20 place-items-center rounded-lg border border-dashed border-[hsl(var(--border))] text-center"><div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">Waiting for live rate samples</div><div className="mt-1 mono text-[9px] text-[hsl(var(--muted-foreground))]">The chart fills as the simulation ticks.</div></div></div>}</section>
      </div>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-4"><div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]"><Zap size={13} className="text-[hsl(var(--primary))]" /><span>Rated capacity <strong className="mono font-normal text-[hsl(var(--foreground))]">{ratedCapacity.toFixed(1)} items / min</strong> · live units only</span></div><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">LOCAL SAVE · AUTO-COMMIT EVERY TICK</span></div>
    </div>
  </PageFrame>;
}

function MiningPage({ state, setState, enqueue, notice, cancelConstruction, constructionVisualTiming, constructionBatchSize, setConstructionBatchSize }: PageProps) {
  const toggleMiningPause = (key: RawKey) => setState((s) => ({
    ...s,
    pausedMining: { ...s.pausedMining, [key]: !miningPausedFor(s, key) },
  }));
  const tap = (key: RawKey) => {
    if (!manualMiningKeys.includes(key)) return notice(`${rawInfo[key].label} requires a machine`);
    if (state.manualMining) return notice(state.manualMining.resourceKey === key ? `already mining ${rawInfo[key].label.toLowerCase()}` : `finish mining ${rawInfo[state.manualMining.resourceKey].label.toLowerCase()} first`);
    setState((s) => ({
      ...s,
      manualMining: {
        resourceKey: key,
        seconds: manualMiningSeconds,
        total: manualMiningSeconds,
        ...constructionVisualTiming(manualMiningSeconds / Math.max(0.0001, s.simulationSpeed)),
      },
    }));
    notice(`manual ${rawInfo[key].label.toLowerCase()} mining started`);
  };
  const build = (key: RawKey) => {
    if (key === 'wood') return notice('Wood can only be collected manually');
    if (key === 'water') { if (!state.research.includes('steam-power')) return notice('Steam Power required'); enqueue('pump', 'Water pump', waterPumpBuildSeconds, undefined, waterPumpBuildCost, constructionBatchSize); return; }
    if (key === 'crudeOil') {
      if (!state.research.includes('oil-gathering')) return notice('Oil Gathering required');
      enqueue('pumpjack', 'Crude oil pumpjack', pumpjackRecipe.energyRequired, undefined, pumpjackBuildCost, constructionBatchSize);
      return;
    }
    if (key === 'uranium') { if (!state.research.includes('uranium-mining')) return notice('Uranium Mining required'); enqueue('uraniumMiner', 'Acid-powered uranium miner', 90, undefined, [{ key: 'steel', amount: 20, source: 'products' }, { key: 'circuit', amount: 8, source: 'products' }], constructionBatchSize); return; }
    const machineCosts = miningMachineBuildCostFor(state);
    const machine = miningMachineRecipeFor(state);
    enqueue('miner', `${rawInfo[key].label} ${miningMachineLabelFor(state).toLowerCase()}`, machine.energyRequired, key, machineCosts, constructionBatchSize);
  };
  return <PageFrame>
    <Header eyebrow="Raw material control" title="Mining" copy={miningUsesStoredCoal(state) ? "Tap the ground to start. Build burner mining drills to make the ore lines autonomous. Wood remains manual-only, and coal drills offset their own fuel use against the coal they produce." : "Electric mining is online. Your upgraded drills run without coal while wood remains manual-only."} constructionBatchSize={constructionBatchSize} onConstructionBatchSizeChange={setConstructionBatchSize} constructionRoboticsUnlocked={state.research.includes('construction-robotics')} notice={notice} action={<Tag><Pickaxe size={11} /> 8 resource sections</Tag>} />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rawKeys.map((key) => {
        const info = rawInfo[key];
        const locked = !!info.research && !state.research.includes(info.research);
        const count = miningMachineCountFor(state, key);
        const isBurnerOre = burnerMinerKeys.includes(key);
        const manualOnly = key === 'wood';
        const manualCollectionAvailable = manualMiningKeys.includes(key);
        const coalSelfFueled = key === 'coal' && miningUsesStoredCoal(state);
        const coalElectric = key === 'coal' && !miningUsesStoredCoal(state);
        const usesFuel = isBurnerOre && !coalSelfFueled && miningUsesStoredCoal(state);
         const paused = miningPausedFor(state, key);
        const fuelRate = usesFuel ? count * burnerMiningDrillCoalPerSecond : 0;
        const autonomous = count > 0;
        const productionRate = miningActualProductionRateFor(state, key);
        const peakProductionRate = peakProductionRateFor(state, key);
        const demandRate = demandRateFor(state, key);
        const peakDemandRate = peakDemandRateFor(state, key);
        const manualMiningJob = state.manualMining?.resourceKey === key ? state.manualMining : null;
        const manualMiningBusy = Boolean(state.manualMining && !manualMiningJob);
        const constructionAction = key === 'water' ? 'pump' : key === 'crudeOil' ? 'pumpjack' : key === 'uranium' ? 'uraniumMiner' : 'miner';
        const constructionItems = manualOnly ? [] : state.queue.filter((item) => item.action === constructionAction && (constructionAction !== 'miner' || item.targetId === key));
        const isBuilding = constructionItems.length > 0;
        const machineLabel = manualOnly ? 'Manual collection only' : key === 'water' ? 'Water Pump' : key === 'crudeOil' ? 'Pumpjack' : key === 'uranium' ? 'Acid-powered Uranium Miner' : miningMachineLabelFor(state);
        const constructionLabel = key === 'water' ? 'Water pump' : key === 'crudeOil' ? 'Crude oil pumpjack' : key === 'uranium' ? 'Acid-powered uranium miner' : `${info.label} ${miningMachineLabelFor(state).toLowerCase()}`;
        const collectionLabel = manualCollectionAvailable ? 'manual collection' : 'machine extraction';
        const manualCollectionControl = <button onClick={() => tap(key)} disabled={!manualCollectionAvailable} className={`button-base flex-1 !py-2 ${manualCollectionAvailable ? count ? 'button-ghost' : 'button-primary' : 'button-ghost opacity-60'}`} aria-label={manualCollectionAvailable ? `Collect ${info.label} manually` : `${info.label} requires a machine`} title={manualCollectionAvailable ? 'Collect manually' : 'This material requires a machine'} data-testid={`button-tap-${key}`}>
          {!manualCollectionAvailable ? <><LockKeyhole size={13} /> machine only</> : manualMiningJob ? <><Clock3 size={13} /> {manualMiningJob.seconds.toFixed(2)}s</> : manualMiningBusy ? <><Clock3 size={13} /> busy</> : <><Pickaxe size={13} /> collect manually</>}
        </button>;
        const buildControl = manualOnly ? null : <button onClick={() => build(key)} className={`button-base flex-1 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`${count ? 'Construct another' : 'Construct'} ${constructionBatchSize} ${machineLabel} for ${info.label}`} data-testid={count ? `button-build-more-${key}` : `button-build-miner-${key}`}>
           {isBuilding ? <><Check size={13} /> queued · build {constructionBatchSize}</> : <><Hammer size={13} /> {constructionBatchSize === 1 ? 'construct' : `construct ${constructionBatchSize}`} <MiningBuildingIcon resource={key} machineVariant={state.machineVariants.mining} size={13} /></>}
        </button>;
        return <section id={`mining-${key}`} className={`surface scroll-mt-24 rounded-xl p-4 ${locked ? 'locked-wash opacity-75' : ''}`} key={key} data-testid={`section-mining-${key}`}>
          <div className="flex items-start gap-3">
            <div className="resource-orb">{<ResourceIcon item={key} size={29} />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate text-[13px] font-extrabold">{info.label}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                  {locked ? <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag> : autonomous ? <button type="button" onClick={() => { toggleMiningPause(key); notice(paused ? `${info.label} mining resumed` : `${info.label} mining paused`); }} className={`status-tag status-tag-button ${paused ? 'tag-paused' : 'tag-running'}`} aria-pressed={paused} aria-label={`${paused ? 'Resume' : 'Pause'} automatic ${info.label} mining`} title={paused ? 'Resume automatic mining' : 'Pause automatic mining'} data-testid={`button-toggle-pause-mining-${key}`}>{paused ? 'PAUSED' : <><span className="status-dot status-running" /> auto</>}</button> : <Tag tone="amber">manual</Tag>}
                  {!manualOnly && <div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title={`${machineLabel} count`}>
                    <MiningBuildingIcon resource={key} machineVariant={state.machineVariants.mining} />
                    <span className="mono text-[13px]">{count}</span>
                  </div>}
                </div>
              </div>
              <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{key === 'water' || key === 'crudeOil' ? 'Fluid collection' : 'Raw material'} · {machineLabel}</div>
              <div className="mt-1 flex flex-wrap gap-1"><Tag tone={manualCollectionAvailable ? 'amber' : 'muted'}>{collectionLabel}</Tag>{usesFuel && <Tag tone="muted">coal fueled</Tag>}{coalSelfFueled && <Tag>self-fueled</Tag>}{coalElectric && <Tag>no coal input</Tag>}{locked && <Tag tone="muted">research lock</Tag>}</div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3">
            <div className="eyebrow mb-2">Collection</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="resource-chip"><ResourceIcon item={key} size={17} /><strong>{collectionLabel}</strong></span>
              <ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" />
              {!manualOnly && <span className="resource-chip"><MiningBuildingIcon resource={key} machineVariant={state.machineVariants.mining} /><strong>{machineLabel}</strong></span>}
              {manualOnly && <span className="resource-chip"><strong>{machineLabel}</strong></span>}
            </div>
          </div>
          {usesFuel && <div className="mt-2 rounded-lg border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-3" data-testid={`panel-mining-fuel-${key}`}>
            <div className="flex items-center gap-2 text-[10px]"><ResourceIcon item="burner-mining-drill" size={17} /><span className="font-semibold">Burner drill fuel</span><span className="ml-auto text-[9px] text-[hsl(var(--muted-foreground))]">coal usage</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2"><div><div className="eyebrow">Current total</div><div className="mono mt-1 text-[11px] text-[hsl(var(--primary))]">{fuelRate.toFixed(2)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">coal / sec</div></div><div><div className="eyebrow">Power draw</div><div className="mono mt-1 text-[11px] text-[hsl(var(--secondary))]">0.0</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">electricity</div></div></div>
          </div>}
           {coalSelfFueled && <div className="mt-2 rounded-lg border border-[hsl(var(--secondary)/.25)] bg-[hsl(var(--secondary)/.06)] p-3" data-testid={`panel-coal-self-fueled-${key}`}>
            <div className="flex items-center gap-2 text-[10px]"><ResourceIcon item="coal" size={17} /><span className="font-semibold">Coal mining exception</span><span className="ml-auto text-[9px] text-[hsl(var(--secondary))]">no stored fuel</span></div>
            <div className="mt-2 text-[9px] leading-4 text-[hsl(var(--muted-foreground))]">Drill usage is deducted from mined coal output. This line continues working even when stored coal reaches zero.</div>
          </div>}
           {coalElectric && <div className="mt-2 rounded-lg border border-[hsl(var(--secondary)/.25)] bg-[hsl(var(--secondary)/.06)] p-3" data-testid={`panel-coal-electric-${key}`}>
             <div className="flex items-center gap-2 text-[10px]"><Zap size={17} className="text-[hsl(var(--secondary))]" /><span className="font-semibold">Electric coal mining</span><span className="ml-auto text-[9px] text-[hsl(var(--secondary))]">zero coal input</span></div>
             <div className="mt-2 text-[9px] leading-4 text-[hsl(var(--muted-foreground))]">Electric miners draw power instead of fuel. Coal output is no longer reduced by drill consumption.</div>
           </div>}
           {key === 'water' && <div className="mt-2 rounded-lg border border-[hsl(var(--secondary)/.25)] bg-[hsl(var(--secondary)/.06)] p-3" data-testid="panel-water-pump-output">
             <div className="flex items-center gap-2 text-[10px]"><Waves size={17} className="text-[hsl(var(--secondary))]" /><span className="font-semibold">Pump output</span><span className="ml-auto text-[9px] text-[hsl(var(--secondary))]">rated flow</span></div>
             <div className="mono mt-2 text-[13px] text-[hsl(var(--secondary))]">{waterPumpPerSecond.toLocaleString('en-US')} water / sec <span className="text-[9px] text-[hsl(var(--muted-foreground))]">per pump</span></div>
           </div>}
           {key === 'crudeOil' && <div className="mt-2 rounded-lg border border-[hsl(var(--secondary)/.25)] bg-[hsl(var(--secondary)/.06)] p-3" data-testid="panel-crude-oil-pumpjack-output">
             <div className="flex items-center gap-2 text-[10px]"><ResourceIcon item="pumpjack" size={17} /><span className="font-semibold">Pumpjack output</span><span className="ml-auto text-[9px] text-[hsl(var(--secondary))]">rated flow</span></div>
             <div className="mono mt-2 text-[13px] text-[hsl(var(--secondary))]">50 crude oil / sec <span className="text-[9px] text-[hsl(var(--muted-foreground))]">per pumpjack</span></div>
           </div>}
           <CompactMetricsRow production={productionRate} peakProduction={peakProductionRate} demand={demandRate} peakConsumption={peakDemandRate} net={productionRate - demandRate} storage={state.raw[key]} capacity={capFor(state, key)} manualOutputEvent={state.manualOutputEvents[key] ?? 0} peakWarning={key === 'coal' && peakProductionRate < peakDemandRate} />
           <div className="mt-4 flex gap-2">
             {locked ? <button onClick={() => notice(`${info.needs} research required`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-locked-mining-${key}`}><LockKeyhole size={13} /> requires {info.needs}</button> : <>{manualCollectionControl}{buildControl}</>}
          </div>
           <BuildProgress items={constructionItems} label={constructionLabel} cancelConstruction={cancelConstruction} notice={notice} />
           {manualMiningJob && <ManualMiningProgress job={manualMiningJob} simulationSpeed={state.simulationSpeed} />}
        </section>;
      })}
    </div>
    <div className="mt-5 surface rounded-xl border-[hsl(var(--secondary)/.25)] p-4"><div className="flex items-start gap-3"><div className="text-[hsl(var(--secondary))]"><Lightbulb size={17} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Mining rule</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Manual collection takes 2.5 seconds and remains available while automated drills run. Wood is manual-only, and hand-collected output can exceed storage capacity. Only one resource can be collected by hand at a time. Coal drills are self-fueled: their usage is offset from mined coal instead of stored fuel.</p></div></div></div>
  </PageFrame>;
}

function ProductionPage({ state, setState, enqueue, notice, cancelConstruction, constructionVisualTiming, constructionBatchSize, setConstructionBatchSize }: PageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [scienceFilter, setScienceFilter] = useState<RecipeScienceFilter>('Core');
  const [location, navigate] = useLocation();
  const search = useSearch();
  const focusTarget = focusTargetForSearch(search);
  const automationUnlocked = state.research.includes('automation');
  const currentFurnaceLabel = furnaceLabelFor(state);
  const spaceScienceUnlocked = spaceScienceUnlockedFor(state);
  const categories = useMemo(() => Array.from(new Set(recipeCatalog.map((recipe) => recipe.category))).sort(), []);
  const visibleRecipes = useMemo(() => orderedRecipeCatalog.filter((recipe) => !['pumpjack', 'rocket-silo', 'rocket-part', ...nuclearRecipeNames].includes(recipe.name) && recipeIsUnlocked(recipe, state)).filter((recipe) => {
    const matchesQuery = !query.trim() || `${recipe.name} ${recipe.category}`.toLowerCase().includes(query.trim().toLowerCase());
     return matchesQuery && (category === 'all' || recipe.category === category) && (scienceFilter === 'all' || focusTarget === `production-${recipe.name}` || recipeScienceChainFor(recipe, spaceScienceUnlocked) === scienceFilter);
   }), [category, focusTarget, query, scienceFilter, state]);
  const amountLabel = (amount: number) => Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2);
  const handcraft = (key: ComponentKey) => {
    const recipe = recipeMap[key];
    if (isAutomatedOnlyRecipe(recipe)) return notice(`${prettyLabel(key)} is automated only — construct its ${productionBuildingFor(state, recipe)} instead`);
    if (state.handcraft) return notice(state.handcraft.recipeKey === key ? `already handcrafting ${prettyLabel(key)}` : `finish handcrafting ${prettyLabel(state.handcraft.recipeKey)} first`);
    const missing = missingBuildMaterials(state, recipeBuildCosts(recipe));
    if (missing) return notice(`need ${missing}`);
    const outputs = recipeOutputs(recipe);
    setState((s) => {
      const next = { ...s, raw: { ...s.raw }, products: { ...s.products } };
      spendInputs(next, recipeInputs(recipe));
      next.handcraft = {
        recipeKey: key,
        seconds: recipe.energyRequired,
        total: recipe.energyRequired,
        ...constructionVisualTiming(recipe.energyRequired / Math.max(0.0001, s.simulationSpeed)),
      };
      return next;
    });
    notice(`handcrafting ${prettyLabel(outputs[0]?.key ?? recipe.name)}`);
  };
  const toggleRecipePause = (key: ComponentKey) => setState((s) => ({
    ...s,
    pausedRecipes: { ...s.pausedRecipes, [key]: !recipePausedFor(s, key) },
  }));
  const openIngredient = (materialKey: TrackedKey) => {
    const target = ingredientNavigationFor(materialKey);
    if (target) navigate(`${target.href}?focus=${encodeURIComponent(target.targetId)}`);
  };
  const buildProductionUnit = (key: ComponentKey) => {
    const recipe = recipeMap[key];
    if (isSmeltingRecipe(recipe)) {
       if (state.queue.some((item) => item.action === 'upgrade' && (item.targetId === 'steel-furnaces' || item.targetId === ELECTRIC_FURNACE_UPGRADE_ID))) return notice('finish the furnace conversion before building more furnaces');
      const furnaceRecipe = furnaceBuildRecipeFor(state);
      enqueue('furnace', `${prettyLabel(key)} ${currentFurnaceLabel.toLowerCase()}`, furnaceRecipe.energyRequired, key, recipeBuildCosts(furnaceRecipe), constructionBatchSize);
      return;
    }
    if (key === 'basic-oil-processing' && state.oilProcessingAdvanced) return notice('Advanced Oil Processing is already installed');
    if (key === 'basic-oil-processing' && state.queue.some((item) => item.action === 'upgrade' && item.targetId === OIL_PROCESSING_UPGRADE_ID)) return notice('finish the oil processing conversion before building more refineries');
    if (!automationUnlocked) return notice('Automation technology required');
     const machineCosts = productionMachineBuildCostFor(state, recipe);
    const machine = productionMachineRecipeFor(state, recipe);
    enqueue('assembler', `${prettyLabel(key)} ${productionMachineLabelFor(state, recipe).toLowerCase()}`, machine.energyRequired, key, machineCosts, constructionBatchSize);
  };
  return <PageFrame>
    <Header eyebrow="Recipe catalog" title="Production" copy="The attached recipe definitions drive every card below. Search the full line, inspect item and fluid flows, then run recipes manually or with the appropriate production building." constructionBatchSize={constructionBatchSize} onConstructionBatchSizeChange={setConstructionBatchSize} constructionRoboticsUnlocked={state.research.includes('construction-robotics')} notice={notice} action={<Tag><Cog size={11} /> {recipeCatalog.length} recipes loaded</Tag>} />
    <section className="surface mb-5 rounded-xl p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recipes, items, or fluids" className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]" aria-label="Search recipes" data-testid="input-search-recipes" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none" aria-label="Filter recipe category" data-testid="select-recipe-category">
          <option value="all">All categories</option>
          {categories.map((entry) => <option key={entry} value={entry}>{prettyLabel(entry)}</option>)}
        </select>
        <select value={scienceFilter} onChange={(event) => setScienceFilter(event.target.value as RecipeScienceFilter)} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none" aria-label="Filter science chain" data-testid="select-recipe-science-filter">
          <option value="all">All recipes</option>
          <option value="Core">Core science chain</option>
          <option value="Non-Core">Non-Core recipes</option>
        </select>
      </div>
    </section>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {state.research.includes('rocket-silo') && !state.gameComplete && <RocketEndgameCard state={state} enqueue={enqueue} notice={notice} cancelConstruction={cancelConstruction} />}
      {visibleRecipes.map((recipe) => {
      const key = recipe.name;
      const outputs = recipeOutputs(recipe);
       const primaryOutput = primaryOutputFor(recipe.name, outputs);
      const count = state.assemblers[key] ?? 0;
      const productionRate = recipeProductionRateFor(state, recipe);
      const peakProductionRate = primaryOutput ? peakProductionRateFor(state, primaryOutput.key) : 0;
      const demandRate = primaryOutput ? demandRateFor(state, primaryOutput.key) : 0;
      const peakDemandRate = primaryOutput ? peakDemandRateFor(state, primaryOutput.key) : 0;
      const netRate = productionRate - demandRate;
      const smelting = isSmeltingRecipe(recipe);
       const autoCondition = recipeAutoStartStopConditionFor(state, recipe);
       const paused = recipePausedFor(state, key);
       const building = productionBuildingFor(state, recipe);
       const buildingLabel = smelting ? currentFurnaceLabel : productionMachineLabelFor(state, recipe);
      const buildingAction: QueueItem['action'] = smelting ? 'furnace' : 'assembler';
      const constructionItems = state.queue.filter((item) => item.action === buildingAction && item.targetId === key);
      const isBuilding = constructionItems.length > 0;
      const handcraftJob = state.handcraft?.recipeKey === key ? state.handcraft : null;
      const handcraftBusy = Boolean(state.handcraft && !handcraftJob);
      const automatedOnly = isAutomatedOnlyRecipe(recipe);
      const handcraftControl = automatedOnly
        ? <button disabled className="button-base flex-1 !py-2 button-ghost cursor-not-allowed opacity-70" aria-label={`${prettyLabel(key)} is automated only`} title={`Automated only — construct a ${buildingLabel} to produce ${prettyLabel(key)}`} data-testid={`button-handcraft-production-${key}`}><LockKeyhole size={13} />automated only</button>
        : <button onClick={() => handcraft(key)} className={`button-base flex-1 !py-2 ${count ? 'button-ghost' : 'button-primary'}`} aria-label={`Handcraft ${prettyLabel(key)}`} title={handcraftJob ? `Handcrafting ${prettyLabel(key)}` : handcraftBusy ? 'Another item is being handcrafted' : `Handcraft ${prettyLabel(key)}`} data-testid={`button-handcraft-production-${key}`}>{handcraftJob ? <><Clock3 size={13} /> {handcraftJob.seconds.toFixed(2)}s</> : handcraftBusy ? <Clock3 size={13} /> : <><Plus size={13} />handcraft</>}</button>;
        return <section id={`production-${key}`} className="surface scroll-mt-24 rounded-xl p-4" key={key} data-testid={`section-production-${key}`}>
        <div className="flex items-start gap-3">
          <div className="resource-orb">{primaryOutput && <ResourceIcon item={primaryOutput.key} size={29} />}</div>
          <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">{prettyLabel(key)}</h2><div className="flex items-center gap-2">{count ? <button type="button" onClick={() => { toggleRecipePause(key); notice(paused ? `${prettyLabel(key)} resumed` : `${prettyLabel(key)} paused`); }} className={`status-tag status-tag-button ${paused ? 'tag-paused' : autoCondition.met ? 'tag-running' : 'tag-starved'}`} aria-pressed={paused} aria-label={`${paused ? 'Resume' : 'Pause'} automatic ${prettyLabel(key)}`} title={paused ? 'Resume automatic production' : 'Pause automatic production'} data-testid={`button-toggle-pause-production-${key}`}>{paused ? 'PAUSED' : <>{autoCondition.met && <span className="status-dot status-running" />}{autoCondition.met ? 'auto' : 'auto stopped'}</>}</button> : automatedOnly ? <Tag tone="muted">automated only</Tag> : <Tag tone="amber">manual</Tag>}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title={`${buildingLabel} count`}><ResourceIcon item={building} size={17} /><span className="mono text-[13px]">{count}</span></div></div></div>
            <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{prettyLabel(recipe.category)} · {recipe.energyRequired}s cycle · {buildingLabel}</div>
             <div className="mt-1 flex flex-wrap gap-1"><Tag tone={recipeScienceChainFor(recipe, spaceScienceUnlocked) === 'Core' ? 'teal' : 'muted'}>{recipeScienceChainFor(recipe, spaceScienceUnlocked)}</Tag>{recipe.hidden && <Tag tone="muted">hidden</Tag>}{!recipe.enabled && <Tag tone="muted">research lock</Tag>}{recipe.results.length > 1 && <Tag tone="amber">multi-output</Tag>}</div>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3">
          <div className="eyebrow mb-2">Recipe</div>
          <div className="flex flex-wrap items-center gap-1.5">
             {recipe.ingredients.map((material, index) => {
               const materialKey = keyForSource(material.name);
               const ingredientShortfall = quantityFor(state, materialKey) < materialAmount(material);
               const ingredientTarget = ingredientNavigationFor(materialKey);
               const chipClass = `resource-chip${ingredientShortfall ? ' input-shortfall' : ''}${ingredientTarget ? ' recipe-ingredient-link' : ''}`;
               return ingredientTarget
                 ? <button type="button" className={chipClass} title={`Open ${meta[materialKey].label} source`} aria-label={`Open ${meta[materialKey].label} source`} onClick={() => openIngredient(materialKey)} data-testid={`link-ingredient-${materialKey}-${index}`} key={`${material.name}-${index}`}><ResourceIcon item={materialKey} size={17} /><strong>{amountLabel(materialAmount(material))}</strong> {meta[materialKey].short}</button>
                 : <span className={chipClass} key={`${material.name}-${index}`}><ResourceIcon item={materialKey} size={17} /><strong>{amountLabel(materialAmount(material))}</strong> {meta[materialKey].short}</span>;
             })}
            <ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" />
            {outputs.map(({ key: outputKey, amount }, index) => <span className="resource-chip" style={{ borderColor: `${meta[outputKey].color}66` }} key={`${outputKey}-${index}`}><ResourceIcon item={outputKey} size={17} /><strong>{amountLabel(amount)}</strong> {meta[outputKey].short}</span>)}
          </div>
        </div>
         {autoCondition.label && <div className="mt-2 rounded-lg border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-3" data-testid={`panel-auto-condition-${key}`}><div className="flex items-center justify-between gap-2 text-[10px]"><span className="eyebrow text-[hsl(var(--primary))]">Auto start / stop</span><Tag tone={paused ? 'amber' : autoCondition.met ? 'teal' : 'amber'}>{paused ? 'paused' : autoCondition.met ? 'running' : 'stopped'}</Tag></div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{paused ? 'Paused manually. Click PAUSED above to resume.' : <>Runs when <span className="font-semibold text-[hsl(var(--foreground))]">{autoCondition.label}</span>.</>}</div></div>}
         {smelting && recipe.fuel && state.furnaceVariant !== 'electric-furnace' && <div className="mt-2 rounded-lg border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-3" data-testid={`panel-furnace-fuel-${key}`}><div className="flex items-center gap-2 text-[10px]"><ResourceIcon item={keyForSource(recipe.fuel.name)} size={17} /><span className="font-semibold">Furnace fuel</span><span className="ml-auto text-[9px] text-[hsl(var(--muted-foreground))]">{currentFurnaceLabel}</span></div><div className="mt-3 grid grid-cols-3 gap-2"><div><div className="eyebrow">Cost / item</div><div className="mono mt-1 text-[11px] text-[hsl(var(--primary))]">{amountLabel(furnaceCoalPerItemFor(state, recipe))}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">coal</div></div><div><div className="eyebrow">Current total</div><div className="mono mt-1 text-[11px] text-[hsl(var(--primary))]">{furnaceCoalUsageFor(state, recipe).toFixed(2)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">coal / min</div></div><div><div className="eyebrow">Peak potential</div><div className="mono mt-1 text-[11px] text-[hsl(var(--secondary))]">{furnaceCoalUsageFor(state, recipe, true).toFixed(2)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">coal / min</div></div></div></div>}
         <CompactMetricsRow production={productionRate} peakProduction={peakProductionRate} demand={demandRate} peakConsumption={peakDemandRate} net={netRate} storage={primaryOutput ? quantityFor(state, primaryOutput.key) : 0} capacity={primaryOutput ? capFor(state, primaryOutput.key) : 0} manualOutputEvent={primaryOutput ? state.manualOutputEvents[primaryOutput.key] ?? 0 : 0} />
            <div className="mt-4 flex gap-2">{handcraftControl}<button onClick={() => buildProductionUnit(key)} className={`button-base flex-1 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`${count ? 'Construct another' : 'Construct'} ${constructionBatchSize} ${buildingLabel} for ${prettyLabel(key)}`} data-testid={`button-${count ? 'build-more' : 'build'}-${buildingAction}-${key}`}>{isBuilding ? <><Check size={13} /> queued · build {constructionBatchSize}</> : <><Hammer size={13} /> {constructionBatchSize === 1 ? 'construct' : `construct ${constructionBatchSize}`} <ResourceIcon item={building} size={13} /></>}</button></div>
           {isBuilding && <BuildProgress items={constructionItems} label={buildingLabel} cancelConstruction={cancelConstruction} notice={notice} />}
          {handcraftJob && <HandcraftProgress job={handcraftJob} recipe={recipe} simulationSpeed={state.simulationSpeed} />}
      </section>;
      })}
    </div>
  </PageFrame>;
}

type NuclearRecipeCardProps = {
  state: GameState;
  setState: Dispatch<SetStateAction<GameState>>;
  enqueue: PageProps['enqueue'];
  notice: (message: string) => void;
  cancelConstruction: (id: string) => void;
  constructionVisualTiming: PageProps['constructionVisualTiming'];
  constructionBatchSize: ConstructionBatchSize;
  recipe: Recipe;
  openIngredient: (key: TrackedKey) => void;
  currentFurnaceLabel: string;
  spaceScienceUnlocked: boolean;
};

function NuclearRecipeCard({ state, setState, enqueue, notice, cancelConstruction, constructionVisualTiming, constructionBatchSize, recipe, openIngredient, currentFurnaceLabel, spaceScienceUnlocked }: NuclearRecipeCardProps) {
  const key = recipe.name;
  const outputs = recipeOutputs(recipe);
  const primaryOutput = primaryOutputFor(recipe.name, outputs);
  const count = state.assemblers[key] ?? 0;
  const productionRate = recipeProductionRateFor(state, recipe);
  const peakProductionRate = primaryOutput ? peakProductionRateFor(state, primaryOutput.key) : 0;
  const demandRate = primaryOutput ? demandRateFor(state, primaryOutput.key) : 0;
  const peakDemandRate = primaryOutput ? peakDemandRateFor(state, primaryOutput.key) : 0;
  const smelting = isSmeltingRecipe(recipe);
  const autoCondition = recipeAutoStartStopConditionFor(state, recipe);
  const paused = recipePausedFor(state, key);
  const building = productionBuildingFor(state, recipe);
  const buildingLabel = smelting ? currentFurnaceLabel : productionMachineLabelFor(state, recipe);
  const constructionItems = state.queue.filter((item) => item.action === 'assembler' && item.targetId === key);
  const handcraftJob = state.handcraft?.recipeKey === key ? state.handcraft : null;
  const handcraftBusy = Boolean(state.handcraft && !handcraftJob);
  const automatedOnly = isAutomatedOnlyRecipe(recipe);
  const amountLabel = (amount: number) => Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2);
  const recipeSubtitle = key === 'uranium-processing' || key === 'kovarex-enrichment-process'
    ? `${recipe.energyRequired}s cycle · ${buildingLabel}`
    : `${prettyLabel(recipe.category)} · ${recipe.energyRequired}s cycle · ${buildingLabel}`;
  const metricFocus = key === 'uranium-processing' ? 'U-238' : key === 'kovarex-enrichment-process' ? 'U-235' : null;

  const handcraft = () => {
    if (automatedOnly) return notice(`${prettyLabel(key)} is automated only — construct its ${productionBuildingFor(state, recipe)} instead`);
    if (state.handcraft) return notice(state.handcraft.recipeKey === key ? `already handcrafting ${prettyLabel(key)}` : `finish handcrafting ${prettyLabel(state.handcraft.recipeKey)} first`);
    const missing = missingBuildMaterials(state, recipeBuildCosts(recipe));
    if (missing) return notice(`need ${missing}`);
    const outputsForRecipe = recipeOutputs(recipe);
    setState((s) => {
      const next = { ...s, raw: { ...s.raw }, products: { ...s.products } };
      spendInputs(next, recipeInputs(recipe));
      next.handcraft = { recipeKey: key, seconds: recipe.energyRequired, total: recipe.energyRequired, ...constructionVisualTiming(recipe.energyRequired / Math.max(0.0001, s.simulationSpeed)) };
      return next;
    });
    notice(`handcrafting ${prettyLabel(outputsForRecipe[0]?.key ?? recipe.name)}`);
  };
  const build = () => {
    if (!state.research.includes('automation')) return notice('Automation technology required');
    const machine = productionMachineRecipeFor(state, recipe);
    enqueue('assembler', `${prettyLabel(key)} ${productionMachineLabelFor(state, recipe).toLowerCase()}`, machine.energyRequired, key, productionMachineBuildCostFor(state, recipe), constructionBatchSize);
  };
  const togglePause = () => setState((s) => ({ ...s, pausedRecipes: { ...s.pausedRecipes, [key]: !recipePausedFor(s, key) } }));
  const nuclearCardClass = recipeIsUnlocked(recipe, state) ? 'surface' : 'locked-wash opacity-60 grayscale';

  return <section id={`power-nuclear-${key}`} className={`${nuclearCardClass} scroll-mt-24 rounded-xl p-4`} data-testid={`section-power-nuclear-${key}`}>
    <div className="flex items-start gap-3">
      <div className="resource-orb">{primaryOutput && <ResourceIcon item={primaryOutput.key} size={29} />}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">{prettyLabel(key)}</h2><div className="flex items-center gap-2">{count ? <button type="button" onClick={() => { togglePause(); notice(paused ? `${prettyLabel(key)} resumed` : `${prettyLabel(key)} paused`); }} className={`status-tag status-tag-button ${paused ? 'tag-paused' : autoCondition.met ? 'tag-running' : 'tag-starved'}`} aria-pressed={paused} aria-label={`${paused ? 'Resume' : 'Pause'} automatic ${prettyLabel(key)}`} data-testid={`button-toggle-pause-nuclear-${key}`}>{paused ? 'PAUSED' : <>{autoCondition.met && <span className="status-dot status-running" />}{autoCondition.met ? 'auto' : 'auto stopped'}</>}</button> : automatedOnly ? <Tag tone="muted">automated only</Tag> : <Tag tone="amber">manual</Tag>}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title={`${buildingLabel} count`}><ResourceIcon item={building} size={17} /><span className="mono text-[13px]">{count}</span></div></div></div>
        <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{recipeSubtitle}</div>
      </div>
    </div>
    <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Recipe</div><div className="flex flex-wrap items-center gap-1.5">
      {recipe.ingredients.map((material, index) => {
        const materialKey = keyForSource(material.name);
        const ingredientShortfall = quantityFor(state, materialKey) < materialAmount(material);
        const ingredientTarget = ingredientNavigationFor(materialKey);
        const chipClass = `resource-chip${ingredientShortfall ? ' input-shortfall' : ''}${ingredientTarget ? ' recipe-ingredient-link' : ''}`;
        return ingredientTarget
          ? <button type="button" className={chipClass} title={`Open ${meta[materialKey].label} source`} aria-label={`Open ${meta[materialKey].label} source`} onClick={() => openIngredient(materialKey)} data-testid={`link-ingredient-nuclear-${materialKey}-${index}`} key={`${material.name}-${index}`}><ResourceIcon item={materialKey} size={17} /><strong>{amountLabel(materialAmount(material))}</strong> {meta[materialKey].short}</button>
          : <span className={chipClass} key={`${material.name}-${index}`}><ResourceIcon item={materialKey} size={17} /><strong>{amountLabel(materialAmount(material))}</strong> {meta[materialKey].short}</span>;
      })}
      <ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" />
      {outputs.map(({ key: outputKey, amount }, index) => <span className="resource-chip" style={{ borderColor: `${meta[outputKey].color}66` }} key={`${outputKey}-${index}`}><ResourceIcon item={outputKey} size={17} /><strong>{amountLabel(amount)}</strong> {meta[outputKey].short}</span>)}
    </div></div>
    {metricFocus && <div className="mt-2 rounded-lg border border-[hsl(var(--secondary)/.2)] bg-[hsl(var(--secondary)/.05)] px-3 py-2 text-[9px] text-[hsl(var(--muted-foreground))]">Production, consumption, and storage metrics track <strong className="text-[hsl(var(--secondary))]">{metricFocus}</strong>.</div>}
    {autoCondition.label && <div className="mt-2 rounded-lg border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-3"><div className="flex items-center justify-between gap-2 text-[10px]"><span className="eyebrow text-[hsl(var(--primary))]">Auto start / stop</span><Tag tone={paused ? 'amber' : autoCondition.met ? 'teal' : 'amber'}>{paused ? 'paused' : autoCondition.met ? 'running' : 'stopped'}</Tag></div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{paused ? 'Paused manually. Click PAUSED above to resume.' : <>Runs when <span className="font-semibold text-[hsl(var(--foreground))]">{autoCondition.label}</span>.</>}</div></div>}
    <CompactMetricsRow production={productionRate} peakProduction={peakProductionRate} demand={demandRate} peakConsumption={peakDemandRate} net={productionRate - demandRate} storage={primaryOutput ? quantityFor(state, primaryOutput.key) : 0} capacity={primaryOutput ? capFor(state, primaryOutput.key) : 0} manualOutputEvent={primaryOutput ? state.manualOutputEvents[primaryOutput.key] ?? 0 : 0} />
    <div className="mt-4 flex gap-2">
      {automatedOnly ? <button disabled className="button-base flex-1 !py-2 button-ghost cursor-not-allowed opacity-70"><LockKeyhole size={13} />automated only</button> : <button onClick={handcraft} className={`button-base flex-1 !py-2 ${count ? 'button-ghost' : 'button-primary'}`} data-testid={`button-handcraft-nuclear-${key}`}>{handcraftJob ? <><Clock3 size={13} /> {handcraftJob.seconds.toFixed(2)}s</> : handcraftBusy ? <Clock3 size={13} /> : <><Plus size={13} />handcraft</>}</button>}
      <button onClick={build} className={`button-base flex-1 !py-2 ${constructionItems.length ? 'button-build-active' : 'button-ghost'}`} data-testid={`button-build-nuclear-${key}`}>{constructionItems.length ? <><Check size={13} /> queued · build {constructionBatchSize}</> : <><Hammer size={13} /> {constructionBatchSize === 1 ? 'construct' : `construct ${constructionBatchSize}`} <ResourceIcon item={building} size={13} /></>}</button>
    </div>
    {constructionItems.length > 0 && <BuildProgress items={constructionItems} label={buildingLabel} cancelConstruction={cancelConstruction} notice={notice} />}
    {handcraftJob && <HandcraftProgress job={handcraftJob} recipe={recipe} simulationSpeed={state.simulationSpeed} />}
  </section>;
}

function PowerPage({ state, setState, enqueue, notice, cancelConstruction, constructionVisualTiming, constructionBatchSize, setConstructionBatchSize }: PageProps) {
  const steam = state.research.includes('steam-power');
  const solar = state.research.includes('solar-energy');
  const nuclear = state.research.includes('nuclear-power');
  const accumulator = recipeIsUnlocked(accumulatorRecipe, state);
  const [, navigate] = useLocation();
  const currentFurnaceLabel = furnaceLabelFor(state);
  const spaceScienceUnlocked = spaceScienceUnlockedFor(state);
  const boilersEnabled = state.boilersEnabled;
  const draw = electricPowerDraw(state);
  const production = powerProductionFor(state);
  const accumulatorCount = accumulatorCountFor(state);
  const requiredAccumulators = requiredSolarAccumulatorsFor(state);
  const solarEfficiency = solarPanelEfficiencyFor(state);
  const accumulatorCoverage = requiredAccumulators > 0 ? Math.min(1, accumulatorCount / requiredAccumulators) : 0;
  const steamEngineSteamStatus = steamEngineInputStatusFor(state);
  const powerFlow = powerFlowFor(state);
  const nuclearFlow = nuclearPowerFlowFor(state);
  const boilerCoalRate = powerFlow.boilerCoalConsumed;
  const boilerWaterRate = powerFlow.boilerWaterConsumed;
  const boilerSteamRate = powerFlow.steamProduced;
  const steamEngineSteamRate = powerFlow.steamConsumed;
  const steamEngineUtilisation = state.steamEngines > 0 && steam ? powerFlow.steamEngineRatio * 100 : 0;
  const steamUsage = steam && boilerSteamRate > 0 ? Math.min(1, steamEngineSteamRate / boilerSteamRate) * 100 : 0;
  const boilerInputRatio = boilerOperatingRatioFor(state);
  const lockedPowerFlowStatus: SupplyStatus = { tone: 'muted', label: 'locked', detail: 'research Steam Power' };
  const boilerCoalFlowStatus = steam ? powerFlowBadgeFor(boilerInputStatusFor(state, 'coal')) : lockedPowerFlowStatus;
  const boilerWaterFlowStatus = steam ? powerFlowBadgeFor(boilerInputStatusFor(state, 'water')) : lockedPowerFlowStatus;
  const boilerSteamFlowStatus: SupplyStatus = !steam
    ? lockedPowerFlowStatus
    : boilerInputRatio >= 0.999999
      ? { tone: 'teal', label: 'supplied', detail: `${powerRateLabel(boilerSteamRate)} steam / sec available` }
      : { tone: 'red', label: 'limited', detail: `${powerRateLabel(boilerSteamRate)} steam / sec available` };
  const steamEngineSteamFlowStatus = steam ? powerFlowBadgeFor(steamEngineSteamStatus) : lockedPowerFlowStatus;
  const boilerConstructionItems = state.queue.filter((item) => item.action === 'boiler');
  const steamEngineConstructionItems = state.queue.filter((item) => item.action === 'steamEngine');
  const solarPanelConstructionItems = state.queue.filter((item) => item.action === 'solarPanel');
  const accumulatorConstructionItems = state.queue.filter((item) => item.action === 'accumulator');
  const nuclearReactorConstructionItems = state.queue.filter((item) => item.action === 'nuclearReactor');
  const heatExchangerConstructionItems = state.queue.filter((item) => item.action === 'heatExchanger');
  const steamTurbineConstructionItems = state.queue.filter((item) => item.action === 'steamTurbine');
  const toggleBoilers = () => setState((s) => ({ ...s, boilersEnabled: !s.boilersEnabled }));
  const buildPowerUnit = (unit: 'boiler' | 'steamEngine' | 'solarPanel' | 'accumulator' | 'nuclearReactor' | 'heatExchanger' | 'steamTurbine') => {
    const isSolarPanel = unit === 'solarPanel';
    const isAccumulator = unit === 'accumulator';
    const isNuclear = unit === 'nuclearReactor' || unit === 'heatExchanger' || unit === 'steamTurbine';
    const unlocked = isSolarPanel ? solar : isAccumulator ? accumulator : isNuclear ? nuclear : steam;
    if (!unlocked) return notice(isSolarPanel ? 'Solar Energy required' : isAccumulator ? 'Electric Energy Accumulators required' : isNuclear ? 'Nuclear Power required' : 'Steam Power required');
    const costs = isSolarPanel ? solarPanelBuildCost : isAccumulator ? accumulatorBuildCost : unit === 'boiler' ? boilerBuildCost : unit === 'steamEngine' ? steamEngineBuildCost : recipeBuildCosts(unit === 'nuclearReactor' ? nuclearReactorRecipe : unit === 'heatExchanger' ? heatExchangerRecipe : steamTurbineRecipe);
    const recipe = isSolarPanel ? solarPanelRecipe : isAccumulator ? accumulatorRecipe : unit === 'boiler' ? boilerRecipe : unit === 'steamEngine' ? steamEngineRecipe : unit === 'nuclearReactor' ? nuclearReactorRecipe : unit === 'heatExchanger' ? heatExchangerRecipe : steamTurbineRecipe;
    const target = unit === 'solarPanel' ? 'Solar panel' : unit === 'accumulator' ? 'Accumulator' : unit === 'boiler' ? 'Boiler' : unit === 'steamEngine' ? 'Steam engine' : unit === 'nuclearReactor' ? 'Nuclear reactor' : unit === 'heatExchanger' ? 'Heat exchanger' : 'Steam turbine';
    enqueue(unit, target, recipe.energyRequired, undefined, costs, constructionBatchSize);
  };
  const constructionChips = (costs: BuildMaterialCost[], output: string) => <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Construction</div><div className="flex flex-wrap items-center gap-1.5">{costs.map(({ key, amount }, index) => <span className="contents" key={`${key}-${index}`}><span className="resource-chip" title={`${fmt(amount)} ${meta[key]?.short ?? prettyLabel(key)}`} aria-label={`${fmt(amount)} ${meta[key]?.short ?? prettyLabel(key)}`}><ResourceIcon item={key} size={17} /><strong className="mono">{fmt(amount)}</strong></span>{index < costs.length - 1 && <span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">+</span>}</span>)}<ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" aria-hidden="true" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--primary)/.4)' }} title={`1 ${prettyLabel(output)}`} aria-label={`1 ${prettyLabel(output)}`}><ResourceIcon item={output} size={17} /><strong className="mono">1</strong></span></div></div>;
  const statusTag = (unlocked: boolean, count: number, queued: number) => unlocked ? count ? <Tag><span className="status-dot status-running" /> auto</Tag> : queued > 0 ? <Tag tone="amber"><Clock3 size={10} /> queued</Tag> : <Tag tone="amber">offline</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag>;
   const boilerStatusTag = !steam
    ? statusTag(false, state.boilers, boilerConstructionItems.length)
     : state.boilers > 0
       ? <button type="button" onClick={toggleBoilers} className={`status-tag status-tag-button ${boilersEnabled ? boilerInputRatio < 0.999999 ? 'tag-starved' : 'tag-running' : 'tag-paused'}`} aria-pressed={!boilersEnabled} aria-label={`${boilersEnabled ? 'Pause' : 'Resume'} automatic boiler production`} title={boilersEnabled ? 'Pause boiler production' : 'Resume boiler production'} data-testid="button-toggle-pause-boilers">{boilersEnabled ? <><span className="status-dot status-running" />auto</> : 'PAUSED'}</button>
       : statusTag(true, state.boilers, boilerConstructionItems.length);
  const steamEngineStatusTag = !steam
    ? statusTag(false, state.steamEngines, steamEngineConstructionItems.length)
    : steamEngineSteamStatus.label === 'limited'
      ? <Tag tone="red"><TriangleAlert size={10} /> steam-limited</Tag>
      : statusTag(true, state.steamEngines, steamEngineConstructionItems.length);
  const nuclearReactorFuelRatio = nuclearFlow.reactorFuelRatio;
  const nuclearFuelCellAvailableRate = peakProductionRateFor(state, 'uranium-fuel-cell') / 60;
  const nuclearFuelCellFlowStatus: SupplyStatus = !nuclear
    ? { tone: 'muted', label: 'locked', detail: 'research Nuclear Power' }
    : nuclearReactorFuelRatio >= 0.999999
      ? { tone: 'teal', label: 'supplied', detail: `${fmt(quantityFor(state, 'uranium-fuel-cell'))} cells stored` }
      : { tone: 'red', label: 'limited', detail: `${fmt(quantityFor(state, 'uranium-fuel-cell'))} cells stored` };
  const nuclearHeatRatio = nuclearFlow.heatDemand > 0 ? nuclearFlow.heatConsumed / nuclearFlow.heatDemand : 0;
  const nuclearHeatFlowStatus: SupplyStatus = !nuclear
    ? { tone: 'muted', label: 'locked', detail: 'research Nuclear Power' }
    : nuclearHeatRatio >= 0.999999
      ? { tone: 'teal', label: 'supplied', detail: `${fmt(nuclearFlow.heatProduced)} heat / sec available` }
      : { tone: 'red', label: 'limited', detail: `${fmt(nuclearFlow.heatProduced)} heat / sec available` };
  const nuclearWaterFlowStatus: SupplyStatus = !nuclear
    ? { tone: 'muted', label: 'locked', detail: 'research Nuclear Power' }
    : nuclearFlow.waterSupplyRatio >= 0.999999
      ? { tone: 'teal', label: 'supplied', detail: `${fmt(state.raw.water)} water stored` }
      : { tone: 'red', label: 'limited', detail: `${fmt(state.raw.water)} water stored` };
  const nuclearSteamStatus: SupplyStatus = state.steamTurbines <= 0
    ? { tone: 'muted', label: 'offline', detail: 'construct a steam turbine' }
    : nuclearFlow.nuclearSteamDemand <= 0 || nuclearFlow.turbineRatio >= 0.999999
      ? { tone: 'teal', label: 'supplied', detail: `${fmt(nuclearFlow.nuclearSteamProduced)} steam / sec available` }
      : { tone: 'red', label: 'limited', detail: `${fmt(nuclearFlow.nuclearSteamProduced)} / ${fmt(nuclearFlow.nuclearSteamDemand)} steam / sec` };
  const nuclearOpenIngredient = (key: TrackedKey) => {
    const target = ingredientNavigationFor(key);
    if (target) navigate(`${target.href}?focus=${encodeURIComponent(target.targetId)}`);
  };
  const coalPowerProduction = powerFlow.powerGeneratedMw;
  const solarPowerProduction = solarPowerFor(state);
  const nuclearPowerProduction = nuclearPowerFor(state);
  return <PageFrame>
     <Header eyebrow="Energy network" title="Power" copy="Boiler steam and nuclear steam are independent lines. Each generator scales to its own limiting fuel, fluid, heat, or steam input before contributing to the shared electrical network." constructionBatchSize={constructionBatchSize} onConstructionBatchSizeChange={setConstructionBatchSize} constructionRoboticsUnlocked={state.research.includes('construction-robotics')} notice={notice} />
     <div className="mb-5 grid grid-cols-3 gap-3" data-testid="power-overview">
       <div className="surface flex flex-col justify-center rounded-xl p-3 sm:p-4" data-testid="power-overview-draw"><div className="eyebrow">Power Demand</div><div className="mono mt-2 whitespace-nowrap text-base text-[hsl(var(--primary))] sm:text-lg">{powerLabel(draw)} MW</div></div>
       <div className="surface flex flex-col justify-center rounded-xl p-3 sm:p-4" data-testid="power-overview-supply"><div className="eyebrow">Power Supply</div><div className="mono mt-2 whitespace-nowrap text-base text-[hsl(var(--secondary))] sm:text-lg">{powerLabel(production)} MW</div></div>
       <div className="surface flex flex-col justify-center rounded-xl p-3 sm:p-4" data-testid="power-overview-net"><div className="eyebrow">Net Capacity</div><div className={`mono mt-2 whitespace-nowrap text-base sm:text-lg ${production >= draw ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{powerLabel(production - draw)} MW</div></div>
       <div className="surface-soft flex flex-col justify-center rounded-xl border border-[hsl(var(--border))] p-3 sm:p-4" data-testid="power-source-coal"><div className="eyebrow text-[hsl(var(--primary))]">Coal Power</div><div className="mt-2 flex items-center gap-1" aria-label="Boiler and steam engine"><ResourceIcon item="boiler" size={20} /><ResourceIcon item="steam-engine" size={20} /></div><div className="mono mt-3 whitespace-nowrap text-base text-[hsl(var(--secondary))] sm:text-lg">{powerLabel(coalPowerProduction)} MW</div></div>
       <div className="surface-soft flex flex-col justify-center rounded-xl border border-[hsl(var(--border))] p-3 sm:p-4" data-testid="power-source-solar"><div className="eyebrow text-[hsl(var(--secondary))]">Solar Power</div><div className="mt-2 flex items-center gap-1" aria-label="Solar panel and accumulator"><ResourceIcon item="solar-panel" size={20} /><ResourceIcon item="accumulator" size={20} /></div><div className="mono mt-3 whitespace-nowrap text-base text-[hsl(var(--secondary))] sm:text-lg">{powerLabel(solarPowerProduction)} MW</div></div>
       <div className="surface-soft flex flex-col justify-center rounded-xl border border-[hsl(var(--border))] p-3 sm:p-4" data-testid="power-source-nuclear"><div className="eyebrow text-[hsl(var(--secondary))]">Nuclear Power</div><div className="mt-2 flex items-center gap-1" aria-label="Nuclear reactor, heat exchanger, and steam turbine"><ResourceIcon item="nuclear-reactor" size={20} /><ResourceIcon item="heat-exchanger" size={20} /><ResourceIcon item="steam-turbine" size={20} /></div><div className="mono mt-3 whitespace-nowrap text-base text-[hsl(var(--secondary))] sm:text-lg">{powerLabel(nuclearPowerProduction)} MW</div></div>
     </div>
     <section className="surface rounded-xl p-4 sm:p-5">
        <SectionTitle>Coal Power</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className={`rounded-xl border p-3.5 sm:p-4 ${steam ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-boiler">
           <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="boiler" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Boiler</h2><div className="flex items-center gap-2">{boilerStatusTag}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Boiler count"><ResourceIcon item="boiler" size={17} /><span className="mono text-[13px]">{state.boilers}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Burns coal to heat water into steam</p>{boilerConstructionItems.length > 0 && <div className="mt-1 flex flex-wrap gap-1"><Tag tone="muted">construction queued</Tag></div>}</div></div>
               <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3" data-testid="recipe-power-boiler"><div className="eyebrow mb-2">Production per machine</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip"><ResourceIcon item="coal" size={17} /><strong>{powerRateLabel(boilerCoalPerSecond)}</strong> coal / s</span><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">+</span><span className="resource-chip"><ResourceIcon item="water" size={17} /><strong>{powerRateLabel(boilerWaterPerSecond)}</strong> water / s</span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--secondary)/.4)' }}><ResourceIcon item="steam" size={17} /><strong>{powerRateLabel(boilerSteamPerSecond)}</strong> steam / s</span></div></div>
             <div className="mt-3 grid gap-2 sm:grid-cols-3"><PowerFlowCard label="Coal" item="coal" firstValue={inputFlowPerSecondFor(state, 'coal')} secondValue={boilerCoalRate} status={boilerCoalFlowStatus} testId="flow-power-boiler-coal" /><PowerFlowCard label="Water" item="water" firstValue={inputFlowPerSecondFor(state, 'water')} secondValue={boilerWaterRate} status={boilerWaterFlowStatus} testId="flow-power-boiler-water" /><PowerFlowCard label="Steam output" item="steam" firstLabel="Produced" firstValue={boilerSteamRate} secondValue={steamEngineSteamRate} status={boilerSteamFlowStatus} testId="flow-power-boiler-steam" /></div>
           {constructionChips(boilerBuildCost, 'boiler')}
             <div className="mt-4 flex gap-2">{steam && state.boilers ? <><button onClick={toggleBoilers} className={`button-base flex-1 !py-2 ${boilersEnabled ? 'button-ghost' : 'button-primary'}`} aria-pressed={boilersEnabled} data-testid="button-toggle-boilers"><Power size={13} /> {boilersEnabled ? 'disable boilers' : 'enable boilers'}</button><button onClick={() => buildPowerUnit('boiler')} className={`button-base flex-1 !py-2 ${boilerConstructionItems.length ? 'button-build-active' : 'button-ghost'}`} data-testid="button-build-more-boiler">{boilerConstructionItems.length ? <><Check size={13} /> queued · build {constructionBatchSize}</> : <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="boiler" size={13} /> </>}</button></> : <button onClick={() => buildPowerUnit('boiler')} className="button-base button-primary flex-1 !py-2" data-testid="button-build-boiler">{steam ? <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="boiler" size={13} /></> : <><LockKeyhole size={13} /> requires Steam Power</>}</button>}</div>
            <BuildProgress items={boilerConstructionItems} label="Boiler" cancelConstruction={cancelConstruction} notice={notice} />
        </article>
        <article className={`rounded-xl border p-3.5 sm:p-4 ${steam ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-steam-engine">
           <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="steam-engine" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Steam engine</h2><div className="flex items-center gap-2">{steamEngineStatusTag}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Steam engine count"><ResourceIcon item="steam-engine" size={17} /><span className="mono text-[13px]">{state.steamEngines}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Consumes steam to generate electricity</p>{steamEngineConstructionItems.length > 0 && <div className="mt-1 flex flex-wrap gap-1"><Tag tone="muted">construction queued</Tag></div>}</div></div>
                <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3" data-testid="recipe-power-steam-engine"><div className="eyebrow mb-2">Production per machine</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip"><ResourceIcon item="steam" size={17} /><strong>{powerRateLabel(steamEngineSteamPerSecond)}</strong> steam / s</span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--secondary)/.4)' }}><Zap size={16} /><strong>{powerRateLabel(steamEnginePowerMw)}</strong> MW</span></div></div>
              <div className="mt-3"><PowerFlowCard label="Steam input" item="steam" firstValue={boilerSteamRate} secondValue={steamEngineSteamRate} status={steamEngineSteamFlowStatus} testId="flow-power-steam-engine-steam" /></div>
          {constructionChips(steamEngineBuildCost, 'steam-engine')}
            <SteamUtilisation label="Steam Engine Utilisation" percent={steamEngineUtilisation} />
            <SteamUtilisation label="Steam Usage" percent={steamUsage} />
             <div className="mt-4 flex gap-2">{steam && state.steamEngines ? <><button onClick={toggleBoilers} className={`button-base flex-1 !py-2 ${boilersEnabled ? 'button-ghost' : 'button-primary'}`} aria-pressed={boilersEnabled} data-testid="button-toggle-boilers-from-steam-engine"><Power size={13} /> {boilersEnabled ? 'disable boilers' : 'enable boilers'}</button><button onClick={() => buildPowerUnit('steamEngine')} className={`button-base flex-1 !py-2 ${steamEngineConstructionItems.length ? 'button-build-active' : 'button-ghost'}`} data-testid="button-build-more-steam-engine">{steamEngineConstructionItems.length ? <><Check size={13} /> queued · build {constructionBatchSize}</> : <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="steam-engine" size={13} /></>}</button></> : <button onClick={() => buildPowerUnit('steamEngine')} className="button-base button-primary flex-1 !py-2" data-testid="button-build-steam-engine">{steam ? <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="steam-engine" size={13} /></> : <><LockKeyhole size={13} /> requires Steam Power</>}</button>}</div>
           <BuildProgress items={steamEngineConstructionItems} label="Steam engine" cancelConstruction={cancelConstruction} notice={notice} />
        </article>
      </div>
     </section>
      <section className="surface mt-5 rounded-xl p-4 sm:p-5" data-testid="card-power-solar-section">
        <SectionTitle>Solar Power</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <article className={`rounded-xl border p-3.5 sm:p-4 ${solar ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-solar">
             <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="solar-panel" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Solar panels</h2><div className="flex items-center gap-2">{statusTag(solar, state.solarPanels, solarPanelConstructionItems.length)}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Solar panel count"><ResourceIcon item="solar-panel" size={17} /><span className="mono text-[13px]">{state.solarPanels}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Free energy from the sun</p><div className="mt-1 flex flex-wrap gap-1">{solarPanelConstructionItems.length > 0 && <Tag tone="muted">construction queued</Tag>}</div></div></div>
                <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Power Generation Per Panel</div><div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap"><div className="resource-chip"><Sun size={16} /><strong>Day</strong><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><strong>0.06</strong> MW</div><div className="resource-chip"><Moon size={16} /><strong>Night</strong><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><strong>0</strong> MW</div></div></div>
             {constructionChips(solarPanelBuildCost, 'solar-panel')}
               <div className="mt-3 grid grid-cols-3 gap-2"><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Potential output</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{powerLabel(solarPanelPotentialPowerKwFor(state) / 1000)} MW</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Efficiency factor</div><div className="mono mt-1 text-[12px] text-[hsl(var(--primary))]">{(solarEfficiency * 100).toFixed(0)}%</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Average output</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{powerLabel(solarPanelNetPowerKwFor(state) / 1000)} MW</div></div></div>
               <div className="mt-4 flex gap-2">{solar && state.solarPanels ? <button onClick={() => buildPowerUnit('solarPanel')} className={`button-base flex-1 !py-2 ${solarPanelConstructionItems.length ? 'button-build-active' : 'button-ghost'}`} data-testid="button-build-more-solar-panel">{solarPanelConstructionItems.length ? <><Check size={13} /> queued · build {constructionBatchSize}</> : <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="solar-panel" size={13} /></>}</button> : <button onClick={() => buildPowerUnit('solarPanel')} className="button-base button-primary flex-1 !py-2" data-testid="button-build-solar-panel">{solar ? <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="solar-panel" size={13} /></> : <><LockKeyhole size={13} /> requires Solar Energy</>}</button>}</div>
              <BuildProgress items={solarPanelConstructionItems} label="Solar panel" cancelConstruction={cancelConstruction} notice={notice} />
          </article>
          <article className={`rounded-xl border p-3.5 sm:p-4 ${accumulator ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-accumulators">
              <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="accumulator" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Accumulators</h2><div className="flex items-center gap-2">{statusTag(accumulator, state.accumulators, accumulatorConstructionItems.length)}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Constructed accumulator count"><ResourceIcon item="accumulator" size={17} /><span className="mono text-[13px]">{Number.isInteger(accumulatorCount) ? fmt(accumulatorCount) : accumulatorCount.toFixed(2)}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Store solar power for use at night</p><div className="mt-1 flex flex-wrap gap-1">{accumulatorConstructionItems.length > 0 && <Tag tone="muted">construction queued</Tag>}</div></div></div>
              <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Solar panel / accumulator ratio</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip" title="25 solar panels" aria-label="25 solar panels"><ResourceIcon item="solar-panel" size={17} /><strong>25</strong></span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" aria-hidden="true" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--secondary)/.4)' }} title="21 accumulators" aria-label="21 accumulators"><ResourceIcon item="accumulator" size={17} /><strong>21</strong></span></div></div>
             <div className="mt-3 grid grid-cols-3 gap-2"><div className="data-row rounded-lg p-2.5"><div className="eyebrow">ACCUMULATORS REQUIRED</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{requiredAccumulators}</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">ENERGY STORAGE CAPACITY</div><div className="mono mt-1 text-[12px] text-[hsl(var(--primary))]">{(accumulatorCoverage * 100).toFixed(0)}%</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Solar Power Efficiency</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{(solarEfficiency * 100).toFixed(0)}%</div></div></div>
              {constructionChips(accumulatorBuildCost, 'accumulator')}
                <div className="mt-4 flex gap-2">{accumulator && state.accumulators ? <button onClick={() => buildPowerUnit('accumulator')} className={`button-base flex-1 !py-2 ${accumulatorConstructionItems.length ? 'button-build-active' : 'button-ghost'}`} data-testid="button-build-more-accumulator">{accumulatorConstructionItems.length ? <><Check size={13} /> queued · build {constructionBatchSize}</> : <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="accumulator" size={13} /></>}</button> : <button onClick={() => buildPowerUnit('accumulator')} className="button-base button-primary flex-1 !py-2" data-testid="button-build-accumulator">{accumulator ? <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="accumulator" size={13} /></> : <><LockKeyhole size={13} /> requires Electric Energy Accumulators</>}</button>}</div>
               <BuildProgress items={accumulatorConstructionItems} label="Accumulator" cancelConstruction={cancelConstruction} notice={notice} />
          </article>
        </div>
      </section>
     <section className={`mt-5 rounded-xl border p-4 sm:p-5 ${nuclear ? 'surface' : 'locked-wash opacity-75'}`} data-testid="card-power-nuclear-section">
       <SectionTitle detail={nuclear ? undefined : 'research Nuclear Power to unlock this line'}>Nuclear power</SectionTitle>
       <div className="space-y-4">
         <div>
           <div className="eyebrow mb-2">1 · Uranium processing</div>
           <NuclearRecipeCard state={state} setState={setState} enqueue={enqueue} notice={notice} cancelConstruction={cancelConstruction} constructionVisualTiming={constructionVisualTiming} constructionBatchSize={constructionBatchSize} recipe={uraniumProcessingRecipe} openIngredient={nuclearOpenIngredient} currentFurnaceLabel={currentFurnaceLabel} spaceScienceUnlocked={spaceScienceUnlocked} />
         </div>
         <div>
           <div className="eyebrow mb-2">2 · Kovarex enrichment</div>
           <NuclearRecipeCard state={state} setState={setState} enqueue={enqueue} notice={notice} cancelConstruction={cancelConstruction} constructionVisualTiming={constructionVisualTiming} constructionBatchSize={constructionBatchSize} recipe={kovarexRecipe} openIngredient={nuclearOpenIngredient} currentFurnaceLabel={currentFurnaceLabel} spaceScienceUnlocked={spaceScienceUnlocked} />
         </div>
         <div>
           <div className="eyebrow mb-2">3 · Uranium fuel cells</div>
           <NuclearRecipeCard state={state} setState={setState} enqueue={enqueue} notice={notice} cancelConstruction={cancelConstruction} constructionVisualTiming={constructionVisualTiming} constructionBatchSize={constructionBatchSize} recipe={uraniumFuelCellRecipe} openIngredient={nuclearOpenIngredient} currentFurnaceLabel={currentFurnaceLabel} spaceScienceUnlocked={spaceScienceUnlocked} />
         </div>
         <div>
           <div className="eyebrow mb-2">4 · Nuclear reactor</div>
           <article className={`rounded-xl border p-3.5 sm:p-4 ${nuclear ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-nuclear-reactor">
             <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="nuclear-reactor" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Nuclear reactor</h2><div className="flex items-center gap-2">{statusTag(nuclear, state.nuclearReactors, nuclearReactorConstructionItems.length)}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]"><ResourceIcon item="nuclear-reactor" size={17} /><span className="mono text-[13px]">{state.nuclearReactors}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Fuel cells to heat</p></div></div>
               <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3" data-testid="recipe-power-nuclear-reactor"><div className="eyebrow mb-2">Production per machine</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip"><ResourceIcon item="uranium-fuel-cell" size={17} /><strong>0.005</strong> / s</span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--secondary)/.4)' }}><ResourceIcon item="heat-pipe" size={17} /><strong>120000</strong> / s</span></div></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2"><PowerFlowCard label="Fuel cells" item="uranium-fuel-cell" firstValue={nuclearFuelCellAvailableRate} secondValue={nuclearFlow.fuelCellsConsumed} status={nuclearFuelCellFlowStatus} testId="flow-power-nuclear-reactor-fuel" /><PowerFlowCard label="Heat" item="heat-pipe" firstLabel="Produced" firstValue={nuclearFlow.heatProduced} secondValue={nuclearFlow.heatConsumed} status={nuclearHeatFlowStatus} testId="flow-power-nuclear-reactor-heat" /></div>
             {constructionChips(recipeBuildCosts(nuclearReactorRecipe), 'nuclear-reactor')}
             <div className="mt-4 flex gap-2"><button onClick={() => buildPowerUnit('nuclearReactor')} className={`button-base flex-1 !py-2 ${nuclearReactorConstructionItems.length ? 'button-build-active' : nuclear ? 'button-ghost' : 'button-primary'}`} data-testid="button-build-nuclear-reactor">{nuclearReactorConstructionItems.length ? <><Check size={13} /> queued · build {constructionBatchSize}</> : nuclear ? <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="nuclear-reactor" size={13} /></> : <><LockKeyhole size={13} /> requires Nuclear Power</>}</button></div>
             <BuildProgress items={nuclearReactorConstructionItems} label="Nuclear reactor" cancelConstruction={cancelConstruction} notice={notice} />
           </article>
         </div>
         <div>
           <div className="eyebrow mb-2">5 · Heat exchangers</div>
           <article className={`rounded-xl border p-3.5 sm:p-4 ${nuclear ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-heat-exchanger">
              <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="heat-exchanger" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Heat exchanger</h2><div className="flex items-center gap-2">{statusTag(nuclear, state.heatExchangers, heatExchangerConstructionItems.length)}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]"><ResourceIcon item="heat-exchanger" size={17} /><span className="mono text-[13px]">{state.heatExchangers}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Heat and water to nuclear steam</p></div></div>
              <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3" data-testid="recipe-power-heat-exchanger"><div className="eyebrow mb-2">Production per machine</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip"><ResourceIcon item="heat-pipe" size={17} /><strong>10000</strong> / s</span><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">+</span><span className="resource-chip"><ResourceIcon item="water" size={17} /><strong>10.3</strong> / s</span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--secondary)/.4)' }}><ResourceIcon item="steam" size={17} /><strong>103</strong> / s</span></div></div>
             <div className="mt-3 grid gap-2 sm:grid-cols-3"><PowerFlowCard label="Heat" item="heat-pipe" firstValue={nuclearFlow.heatProduced} secondValue={nuclearFlow.heatConsumed} status={nuclearHeatFlowStatus} testId="flow-power-heat-exchanger-heat" /><PowerFlowCard label="Water" item="water" firstValue={inputFlowPerSecondFor(state, 'water')} secondValue={nuclearFlow.waterConsumed} status={nuclearWaterFlowStatus} testId="flow-power-heat-exchanger-water" /><PowerFlowCard label="Steam output" item="steam" firstLabel="Produced" firstValue={nuclearFlow.nuclearSteamProduced} secondValue={nuclearFlow.nuclearSteamConsumed} status={powerFlowBadgeFor(nuclearSteamStatus)} testId="flow-power-heat-exchanger-steam" /></div>
             {constructionChips(recipeBuildCosts(heatExchangerRecipe), 'heat-exchanger')}
             <div className="mt-4 flex gap-2"><button onClick={() => buildPowerUnit('heatExchanger')} className={`button-base flex-1 !py-2 ${heatExchangerConstructionItems.length ? 'button-build-active' : nuclear ? 'button-ghost' : 'button-primary'}`} data-testid="button-build-heat-exchanger">{heatExchangerConstructionItems.length ? <><Check size={13} /> queued · build {constructionBatchSize}</> : nuclear ? <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="heat-exchanger" size={13} /></> : <><LockKeyhole size={13} /> requires Nuclear Power</>}</button></div>
             <BuildProgress items={heatExchangerConstructionItems} label="Heat exchanger" cancelConstruction={cancelConstruction} notice={notice} />
           </article>
         </div>
         <div>
           <div className="eyebrow mb-2">6 · Steam turbines</div>
           <article className={`rounded-xl border p-3.5 sm:p-4 ${nuclear ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-steam-turbine">
              <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="steam-turbine" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Steam turbine</h2><div className="flex items-center gap-2">{statusTag(nuclear, state.steamTurbines, steamTurbineConstructionItems.length)}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]"><ResourceIcon item="steam-turbine" size={17} /><span className="mono text-[13px]">{state.steamTurbines}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Nuclear steam to electricity</p></div></div>
              <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3" data-testid="recipe-power-steam-turbine"><div className="eyebrow mb-2">Production per machine</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip"><ResourceIcon item="steam" size={17} /><strong>60</strong> / s</span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--secondary)/.4)' }}><Zap size={16} /><strong>5.82</strong> MW</span></div></div>
             <div className="mt-3"><PowerFlowCard label="Steam input" item="steam" firstValue={nuclearFlow.nuclearSteamProduced} secondValue={nuclearFlow.nuclearSteamConsumed} status={powerFlowBadgeFor(nuclearSteamStatus)} testId="flow-power-steam-turbine-steam" /></div>
             {constructionChips(recipeBuildCosts(steamTurbineRecipe), 'steam-turbine')}
             <div className="mt-4 flex gap-2"><button onClick={() => buildPowerUnit('steamTurbine')} className={`button-base flex-1 !py-2 ${steamTurbineConstructionItems.length ? 'button-build-active' : nuclear ? 'button-ghost' : 'button-primary'}`} data-testid="button-build-steam-turbine">{steamTurbineConstructionItems.length ? <><Check size={13} /> queued · build {constructionBatchSize}</> : nuclear ? <><Hammer size={13} /> construct {constructionBatchSize} <ResourceIcon item="steam-turbine" size={13} /></> : <><LockKeyhole size={13} /> requires Nuclear Power</>}</button></div>
             <BuildProgress items={steamTurbineConstructionItems} label="Steam turbine" cancelConstruction={cancelConstruction} notice={notice} />
           </article>
         </div>
       </div>
     </section>
       <p className="mt-5 text-[10px] text-[hsl(var(--muted-foreground))]"><Info size={13} className="mr-1 inline text-[hsl(var(--secondary))]" /> Boiler steam and nuclear steam are separate networks. Nuclear reactors consume uranium fuel cells, heat exchangers consume heat and water, and turbines generate power only from nuclear steam.</p>
  </PageFrame>;
}

function PowerDependencyTreePage({ state, notice }: PageProps) {
  const steam = state.research.includes('steam-power'); const solar = state.research.includes('solar-energy'); const nuclear = state.research.includes('nuclear-power'); const draw = electricPowerDraw(state); const production = powerProductionFor(state);
  const Node = ({ title, sub, icon, active, locked }: { title: string; sub: string; icon: ReactNode; active?: boolean; locked?: boolean }) => <div className={`tree-line flex items-center gap-3 rounded-xl border p-3 ${active ? 'border-[hsl(var(--secondary)/.5)] bg-[hsl(174_30%_15%/.7)]' : locked ? 'locked-wash border-[hsl(var(--border))] opacity-65' : 'border-[hsl(var(--border))] bg-[hsl(216_24%_11%/.7)]'}`}><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{locked ? <LockKeyhole size={15} /> : icon}</div><div className="min-w-0"><div className="text-[11px] font-bold">{title}</div><div className="mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">{sub}</div></div><div className="ml-auto">{active ? <Tag>online</Tag> : locked ? <Tag tone="muted">research</Tag> : <Tag tone="amber">standby</Tag>}</div></div>;
   return <PageFrame><Header eyebrow="Energy network" title="Power" copy="Power is a dependency tree, not a single number. Research a generation family, then watch its conversion chain come online." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><BatteryCharging size={17} className="text-[hsl(var(--secondary))]" /><span className="mono text-[15px]">{production} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">MW produced</span></span></div>} /><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="surface rounded-xl p-4"><div className="eyebrow">Production</div><div className="mono mt-2 text-xl text-[hsl(var(--secondary))]">{production} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Factory draw</div><div className="mono mt-2 text-xl">{draw} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Net balance</div><div className={`mono mt-2 text-xl ${production >= draw ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{production - draw} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Machine load</div><div className="mono mt-2 text-xl">{productionMachineLoadLabelFor(state)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{productionMachineLoadDetailFor(state)} · {state.machineVariants.mining === 'electric-mining-drill' ? `${miningMachinePowerFor(state)} kW per miner` : 'burner drills use coal'}</div></div></div><div className="grid gap-5 lg:grid-cols-3"><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={steam ? 'online' : 'locked'}>Steam generation</SectionTitle><div className="space-y-4"><Node title="Boiler" sub="coal + water → heat" icon={<FlameIcon />} active={steam} locked={!steam} /><Node title="Steam" sub="pressurized thermal fluid" icon={<Waves size={16} />} active={steam} locked={!steam} /><Node title="Steam engine" sub="80 MW potential" icon={<Gauge size={16} />} active={steam} locked={!steam} /></div><button onClick={() => notice(steam ? 'steam chain is online' : 'unlock Steam Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-steam">{steam ? 'inspect steam chain' : 'view steam dependency'}</button></section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={solar ? 'online' : 'locked'}>Solar generation</SectionTitle><div className="space-y-4"><Node title="Solar array" sub="sunlight → current" icon={<Sun size={16} />} active={solar} locked={!solar} /><Node title="Inverter bank" sub="stable daytime output" icon={<Zap size={16} />} active={solar} locked={!solar} /><Node title="Power bus" sub="0.03 MW per panel at baseline; accumulators raise output to 100%" icon={<Power size={16} />} active={solar} locked={!solar} /></div><button onClick={() => notice(solar ? 'solar array is online' : 'unlock Solar Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-solar">{solar ? 'inspect solar chain' : 'view solar dependency'}</button></section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={nuclear ? 'online' : 'locked'}>Nuclear generation</SectionTitle><div className="space-y-4"><Node title="Nuclear reactor" sub="uranium fuel cells → heat" icon={<Sparkles size={16} />} active={nuclear} locked={!nuclear} /><Node title="Heat exchanger" sub="heat + water → nuclear steam" icon={<Waves size={16} />} active={nuclear} locked={!nuclear} /><Node title="Steam turbine" sub={`${steamTurbinePowerMw.toFixed(2)} MW per turbine`} icon={<Gauge size={16} />} active={nuclear} locked={!nuclear} /></div><button onClick={() => notice(nuclear ? 'nuclear chain is online' : 'unlock Nuclear Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-nuclear">{nuclear ? 'inspect nuclear chain' : 'view nuclear dependency'}</button></section></div><p className="mt-5 text-[10px] text-[hsl(var(--muted-foreground))]"><Info size={13} className="mr-1 inline text-[hsl(var(--secondary))]" /> Power families are gated by research and represented as a clear production tree before you build them.</p></PageFrame>;
}
function FlameIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 2.8c.4 3-1.3 4.2-2.4 5.4-1 1-1.2 2.3-.6 3.3.4-1.3 1.5-2.3 2.8-2.7 2.6 2 3.8 4.3 3.2 7.1-.4 1.8-1.7 3.2-3.3 4.1 4.7-.8 7-4 6.2-8.4-.5-2.8-2.5-5.8-5.9-8.8ZM10 12c-3.7 1.4-5.4 4-4.6 6.6.6 2 2.3 3.4 4.5 4-1.2-1.2-1.5-2.6-.6-4.1.7-1.2 1.6-2.1 2.6-2.6-1.1-1-1.8-2.3-1.9-3.9Z"/></svg>; }

function StoragePage({ state, setState, enqueue, notice, cancelConstruction }: PageProps) {
  const storageUpgradeInProgress = state.queue.some((item) => item.action === 'upgrade' && (item.targetId === 'iron-chests' || item.targetId === 'steel-chests'));
  const storageUpgradeInProgressLabel = state.queue.some((item) => item.targetId === 'steel-chests') ? 'Steel Chests' : 'Iron Chests';
  const buildStorage = (key: TrackedKey) => {
    const fluid = isFluidKey(key);
    if (fluid && !canPurchaseStorageFor(key, fluidKeys, state.research)) return notice('Fluid Handling required');
    if (!fluid && storageUpgradeInProgress) return notice(`finish the ${storageUpgradeInProgressLabel} upgrade before constructing another box`);
    const steel = !fluid && state.storageBoxType === 'steel';
    const iron = !fluid && state.storageBoxType === 'iron';
    const constructionItems = state.queue.filter((item) => item.action === 'storage' && item.targetId === key);
    const costs = fluid ? storageTankBuildCost : steel ? [{ key: 'steel', amount: STORAGE_STEEL_BOX_COST, source: 'products' as const }] : iron ? [{ key: 'ironPlate', amount: STORAGE_IRON_BOX_COST, source: 'products' as const }] : [{ key: 'wood', amount: storageBoxWoodCost, source: 'raw' as const }];
    const buildSeconds = fluid ? storageTankRecipe.energyRequired : storageBoxBuildSeconds;
    const containerLabel = fluid ? 'storage tank' : steel ? 'steel chest' : iron ? 'iron chest' : 'wooden box';
    enqueue('storage', `${containerLabel[0].toUpperCase()}${containerLabel.slice(1)} · ${meta[key].label}`, buildSeconds, key, costs);
    notice(`${containerLabel} for ${meta[key].label} queued`);
  };
  const unlockedKeys = orderedTrackedKeys.filter((key) => unlockedProductKeys(state).has(key));
  const [query, setQuery] = useState('');
  const [scienceFilter, setScienceFilter] = useState<RecipeScienceFilter>('Core');
  const visibleKeys = unlockedKeys.filter((key) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery
      || `${meta[key].label} ${meta[key].category} ${key}`.toLowerCase().includes(normalizedQuery);
    return matchesQuery && (scienceFilter === 'all' || trackedScienceChainFor(key, state) === scienceFilter);
  });
  const visibleMaterialKeys = visibleKeys.filter((key) => !isFluidKey(key));
  const visibleFluidKeys = visibleKeys.filter((key) => isFluidKey(key));
  const lowestMaterialCapacity = visibleMaterialKeys.length
    ? Math.min(...visibleMaterialKeys.map((key) => storageCapacityFor(state, key)))
    : 0;
  const lowestFluidCapacity = visibleFluidKeys.length
    ? Math.min(...visibleFluidKeys.map((key) => storageCapacityFor(state, key)))
    : 0;
  const lowestMaterialKeys = visibleMaterialKeys.filter((key) => storageCapacityFor(state, key) === lowestMaterialCapacity);
  const lowestFluidKeys = visibleFluidKeys.filter((key) => storageCapacityFor(state, key) === lowestFluidCapacity);
   const materialChestCost = state.storageBoxType === 'steel'
     ? [{ key: 'steel', amount: STORAGE_STEEL_BOX_COST, source: 'products' as const }]
     : state.storageBoxType === 'iron'
       ? [{ key: 'ironPlate', amount: STORAGE_IRON_BOX_COST, source: 'products' as const }]
       : [{ key: 'wood', amount: storageBoxWoodCost, source: 'raw' as const }];
  const bulkStorageCostLabel = (costs: BuildMaterialCost[], count: number) => costs
    .map((cost) => `${fmt(cost.amount * count)} ${meta[cost.key]?.short ?? prettyLabel(cost.key).toLowerCase()}`)
    .join(' + ');
  return <PageFrame>
     <Header eyebrow="Buffer control" title="Storage" copy={`${state.storageBoxType === 'steel' ? 'Item buffers use steel chests.' : state.storageBoxType === 'iron' ? 'Item buffers use iron chests.' : 'Item buffers use wooden boxes.'} Fluids start with 100 units of base capacity, then expand with storage tanks after Fluid Handling research.`} action={<Tag><Box size={11} /> {visibleKeys.length} visible items</Tag>} />
    <section className="surface mb-5 rounded-xl p-3 sm:p-4" data-testid="panel-bulk-storage-upgrades">
      <div className="mb-3 eyebrow">Bulk storage expansion</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => lowestMaterialKeys.forEach((key) => buildStorage(key))}
          disabled={!lowestMaterialKeys.length || storageUpgradeInProgress}
          className="button-base button-ghost flex min-h-[44px] items-center !px-3 !py-2 text-left disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Upgrade materials to ${fmt(lowestMaterialCapacity + storageBoxCapacityFor(state))}`}
           title={storageUpgradeInProgress ? `${storageUpgradeInProgressLabel} upgrade in progress` : `Upgrade ${lowestMaterialKeys.length} material storages · cost ${bulkStorageCostLabel(materialChestCost, lowestMaterialKeys.length)}`}
          data-testid="button-upgrade-lowest-material-storage"
        >
          <span className="flex w-full min-w-0 items-center justify-between gap-2 text-[11px] font-bold">
            <span className="flex min-w-0 items-center gap-2"><TrendingUp size={13} className="shrink-0" /><span className="truncate">Upgrade materials to {fmt(lowestMaterialCapacity + storageBoxCapacityFor(state))}</span></span>
            <span className="flex shrink-0 items-center gap-3">
               <span className="flex items-center gap-1" title={`${lowestMaterialKeys.length} ${state.storageBoxType} chest${lowestMaterialKeys.length === 1 ? '' : 's'}`}>
                <span className="mono text-[10px]">{lowestMaterialKeys.length}</span>
                 <ResourceIcon item={state.storageBoxType === 'steel' ? 'steel-chest' : state.storageBoxType === 'iron' ? 'iron-chest' : 'wooden-chest'} size={17} />
              </span>
              <ArrowRight size={14} className="shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
              <span className="flex items-center gap-2" title={`Total cost: ${bulkStorageCostLabel(materialChestCost, lowestMaterialKeys.length)}`}>
                {materialChestCost.map((cost) => <span className="flex items-center gap-1" key={cost.key}><span className="mono text-[10px]">{fmt(cost.amount * lowestMaterialKeys.length)}</span><ResourceIcon item={cost.key} size={17} /></span>)}
              </span>
            </span>
          </span>
        </button>
        {state.research.includes(FLUID_HANDLING_TECHNOLOGY) && <button
          onClick={() => lowestFluidKeys.forEach((key) => buildStorage(key))}
          disabled={!lowestFluidKeys.length}
          className="button-base button-ghost flex min-h-[44px] items-center !px-3 !py-2 text-left disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Upgrade fluids to ${fmt(lowestFluidCapacity + storageTankCapacity)}`}
          title={`Upgrade ${lowestFluidKeys.length} fluid storages · cost ${bulkStorageCostLabel(storageTankBuildCost, lowestFluidKeys.length)}`}
          data-testid="button-upgrade-lowest-fluid-storage"
        >
          <span className="flex w-full min-w-0 items-center justify-between gap-2 text-[11px] font-bold">
            <span className="flex min-w-0 items-center gap-2"><TrendingUp size={13} className="shrink-0" /><span className="truncate">Upgrade fluids to {fmt(lowestFluidCapacity + storageTankCapacity)}</span></span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="flex items-center gap-1" title={`${lowestFluidKeys.length} storage tank${lowestFluidKeys.length === 1 ? '' : 's'}`}>
                <span className="mono text-[10px]">{lowestFluidKeys.length}</span>
                <ResourceIcon item="storage-tank" size={17} />
              </span>
              <ArrowRight size={14} className="shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
              <span className="flex items-center gap-2" title={`Total cost: ${bulkStorageCostLabel(storageTankBuildCost, lowestFluidKeys.length)}`}>
                {storageTankBuildCost.map((cost) => <span className="flex items-center gap-1" key={cost.key}><span className="mono text-[10px]">{fmt(cost.amount * lowestFluidKeys.length)}</span><ResourceIcon item={cost.key} size={17} /></span>)}
              </span>
            </span>
          </span>
        </button>}
      </div>
    </section>
    <section className="surface mb-5 rounded-xl p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items or categories" className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]" aria-label="Search stored items" data-testid="input-search-storage" />
        <select value={scienceFilter} onChange={(event) => setScienceFilter(event.target.value as RecipeScienceFilter)} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none" aria-label="Filter storage science chain" data-testid="select-storage-science-filter">
          <option value="all">All items</option>
          <option value="Core">Core items</option>
          <option value="Non-Core">Non-Core items</option>
        </select>
      </div>
    </section>
    <section className="surface rounded-xl p-2.5 sm:p-3">
      <div className="space-y-2">
        {visibleKeys.map((key) => {
          const amount = quantityFor(state, key);
          const capacity = capFor(state, key);
          const fluid = isFluidKey(key);
          const canPurchase = canPurchaseStorageFor(key, fluidKeys, state.research);
          const containerCount = containerCountFor(state, key);
           const steel = !fluid && state.storageBoxType === 'steel';
           const iron = !fluid && state.storageBoxType === 'iron';
           const containerLabel = fluid ? 'storage tank' : steel ? 'steel chest' : iron ? 'iron chest' : 'wooden box';
           const containerIcon = fluid ? 'storage-tank' : steel ? 'steel-chest' : iron ? 'iron-chest' : 'wooden-chest';
           const costs = fluid ? storageTankBuildCost : steel ? [{ key: 'steel', amount: STORAGE_STEEL_BOX_COST, source: 'products' as const }] : iron ? [{ key: 'ironPlate', amount: STORAGE_IRON_BOX_COST, source: 'products' as const }] : [{ key: 'wood', amount: storageBoxWoodCost, source: 'raw' as const }];
          const buildSeconds = fluid ? storageTankRecipe.energyRequired : storageBoxBuildSeconds;
          const constructionItems = state.queue.filter((item) => item.action === 'storage' && item.targetId === key);
          const isBuilding = constructionItems.length > 0;
          return <section className="data-row rounded-lg p-2.5" key={key} data-testid={`row-storage-${key}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="resource-orb !h-8 !w-8 shrink-0"><ResourceIcon item={key} size={22} /></div>
               <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold">{meta[key].label}</div><div className="text-[9px] text-[hsl(var(--muted-foreground))]">{meta[key].category} · {trackedScienceChainFor(key, state)}</div></div>
               <div className="flex shrink-0 items-center gap-1.5 text-[hsl(var(--secondary))]" title={`${containerCount} ${containerLabel}${containerCount === 1 ? '' : 's'}`}>
                 <ResourceIcon item={containerIcon} size={17} /><span className="mono text-[11px]">{containerCount}</span>
              </div>
               <button onClick={() => buildStorage(key)} disabled={(fluid && !canPurchase) || (!fluid && storageUpgradeInProgress)} className={`button-base button-ghost !gap-1 !px-2 !py-1.5 ${isBuilding ? 'button-build-active' : ''}`} aria-label={fluid && !canPurchase ? `Fluid Handling required to construct a storage tank for ${meta[key].label}` : !fluid && storageUpgradeInProgress ? `${storageUpgradeInProgressLabel} upgrade in progress` : `Construct another ${containerLabel} for ${meta[key].label}`} title={fluid && !canPurchase ? 'Fluid Handling required' : !fluid && storageUpgradeInProgress ? `${storageUpgradeInProgressLabel} upgrade in progress` : `Construct another ${containerLabel} · ${costs.map((cost) => `${cost.amount} ${meta[cost.key]?.short ?? prettyLabel(cost.key).toLowerCase()}`).join(' + ')} · ${buildSeconds} sec`} data-testid={`button-build-storage-${key}`}>
                   {fluid && !canPurchase ? <><LockKeyhole size={12} /><span className="hidden sm:inline">Fluid Handling</span></> : !fluid && storageUpgradeInProgress ? <><Clock3 size={12} /><span className="hidden sm:inline">upgrading</span></> : <>{isBuilding ? <Check size={12} /> : <Plus size={12} />}<ResourceIcon item={containerIcon} size={13} /><span className="hidden sm:inline">{fluid ? 'tank' : 'chest'}</span><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]" aria-hidden="true">|</span>{costs.map((cost) => <span className="contents" key={`${cost.source}-${cost.key}`}><ResourceIcon item={cost.key} size={13} /><span className="mono text-[9px] text-[hsl(var(--primary))]">{fmt(cost.amount)}</span></span>)}</>}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2" aria-label={`${meta[key].label}: ${fmt(amount)} in stock, capacity ${fmt(capacity)}`}>
              <StoredQuantity value={amount} manualEvent={state.manualOutputEvents[key] ?? 0} className="mono w-12 shrink-0 text-[11px]" title="Current stock">{fmt(amount)}</StoredQuantity>
              <div className="min-w-0 flex-1"><Progress value={amount / capacity * 100} /></div>
              <span className="mono w-14 shrink-0 text-right text-[11px]" title="Total capacity">{fmt(capacity)}</span>
            </div>
               {isBuilding && <BuildProgress items={constructionItems} label={`${fluid ? 'Storage tank' : steel ? 'Steel chest' : iron ? 'Iron chest' : 'Wooden box'} · ${meta[key].label}`} cancelConstruction={cancelConstruction} notice={notice} />}
          </section>;
        })}
      </div>
    </section>
  </PageFrame>;
}

function LogisticsPage({ state, notice, constructionBatchSize, setConstructionBatchSize }: PageProps) {
  const entries = [{ title: 'Inserters', copy: 'Short-range item handoff between machines.', icon: ArrowRight }, { title: 'Conveyor belts', copy: 'Continuous item movement across production blocks.', icon: MoveRight }, { title: 'Power lines', copy: 'Extend a power bus beyond the starter block.', icon: Zap }, { title: 'Transport robots', copy: 'On-demand routing for a distributed factory.', icon: Truck }, { title: 'Trains', copy: 'Long-haul bulk transport between distant sectors.', icon: Truck }];
  return <PageFrame><Header eyebrow="Later-stage systems" title="Logistics" copy="The line is not ready for a freight network yet. These systems are mapped here so future expansion has a clear shape." constructionBatchSize={constructionBatchSize} onConstructionBatchSizeChange={setConstructionBatchSize} constructionRoboticsUnlocked={state.research.includes('construction-robotics')} notice={notice} action={<Tag tone="amber"><Clock3 size={11} /> coming later</Tag>} /><section className="surface rounded-xl p-4 sm:p-5"><div className="mb-5 flex items-start gap-3 rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-4"><div className="text-[hsl(var(--primary))]"><Info size={17} /></div><div><div className="eyebrow text-[hsl(var(--primary))]">Later-stage tab</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">These are intentionally visible but non-functional. No fake throughput, no pretend routing — just the systems waiting beyond the first efficient loop.</p></div></div><div className="grid gap-3 sm:grid-cols-2">{entries.map(({ title, copy, icon: Icon }) => <button onClick={() => notice(`${title} is planned for a later stage`)} className="locked-wash flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-4 text-left transition-colors hover:border-[hsl(var(--secondary)/.4)]" key={title} data-testid={`button-logistics-${title.toLowerCase().replace(' ', '-')}`}><div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><Icon size={17} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[12px] font-bold">{title}<Tag tone="muted"><LockKeyhole size={9} /> later</Tag></div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{copy}</p></div><ChevronRight size={15} className="text-[hsl(var(--muted-foreground))]" /></button>)}</div></section></PageFrame>;
}

function UpgradesPage({ state, setState, notice, cancelConstruction, constructionVisualTiming }: PageProps) {
  const [upgradeFilter, setUpgradeFilter] = useState<UpgradeFilter>('available');
  const activeUpgrade = state.queue.find((item) => item.action === 'upgrade');
  const storageBoxCount = storageBoxCountFor(state);
  const storageUpgradeComplete = state.storageBoxType !== 'wooden';
  const storageUpgradeQueued = activeUpgrade?.targetId === 'iron-chests';
  const storageUpgradeCosts = [{ key: 'ironPlate', amount: ironChestUpgradeCostFor(storageBoxCount), source: 'products' as const }];
  const storageUpgradeTotalSeconds = ironChestUpgradeTimeFor(storageBoxCount);
  const storageUpgradeMissing = storageUpgradeComplete || !storageBoxCount ? '' : missingBuildMaterials(state, storageUpgradeCosts);
  const steelStorageUpgradeComplete = state.storageBoxType === 'steel';
  const steelStorageUpgradeQueued = activeUpgrade?.targetId === 'steel-chests';
  const steelStorageUpgradeCosts = [{ key: 'steel', amount: steelChestUpgradeCostFor(storageBoxCount), source: 'products' as const }];
  const steelStorageUpgradeTotalSeconds = steelChestUpgradeTimeFor(storageBoxCount);
  const steelStorageUpgradeMissing = !storageUpgradeComplete || steelStorageUpgradeComplete || !storageBoxCount ? '' : missingBuildMaterials(state, steelStorageUpgradeCosts);
  const furnaceCount = smeltingFurnaceCountFor(state);
  const furnaceUpgradeComplete = state.furnaceVariant !== 'stone-furnace';
  const furnaceUpgradeQueued = activeUpgrade?.targetId === 'steel-furnaces';
  const furnaceUpgradeCostPerFurnace = recipeBuildCosts(steelFurnaceRecipe);
  const furnaceUpgradeCosts = scaledBuildCosts(furnaceUpgradeCostPerFurnace, furnaceCount);
  const furnaceUpgradeTotalSeconds = steelFurnaceRecipe.energyRequired * furnaceCount;
  const furnaceUpgradeMissing = furnaceUpgradeComplete || !furnaceCount ? '' : missingBuildMaterials(state, furnaceUpgradeCosts);
  const furnaceUpgradePrerequisiteMet = steelFurnacePrerequisiteMet(state.research);
  const electricFurnaceUpgradeComplete = state.furnaceVariant === 'electric-furnace';
  const electricFurnaceUpgradeQueued = activeUpgrade?.targetId === ELECTRIC_FURNACE_UPGRADE_ID;
  const electricFurnaceUpgradeCosts = scaledBuildCosts(electricFurnaceUpgradeCostPerFurnace, furnaceCount);
  const electricFurnaceUpgradeTotalSeconds = electricFurnaceUpgradeTimePerFurnace * furnaceCount;
  const electricFurnaceUpgradeMissing = electricFurnaceUpgradeComplete || !furnaceCount ? '' : missingBuildMaterials(state, electricFurnaceUpgradeCosts);
  const electricFurnaceUpgradePrerequisiteMet = electricFurnacePrerequisiteMet(state.research, state.furnaceVariant);
  const oilProcessingUpgradeComplete = state.oilProcessingAdvanced;
  const oilProcessingUpgradeQueued = activeUpgrade?.targetId === OIL_PROCESSING_UPGRADE_ID;
  const basicOilMachineCount = state.assemblers['basic-oil-processing'] ?? 0;
  const oilProcessingMachineCount = oilRefineryCountFor(state);
  const oilProcessingConversionCount = activeUpgrade?.machineCount ?? oilProcessingMachineCount;
  const oilProcessingUpgradeTotalSeconds = activeUpgrade?.targetId === OIL_PROCESSING_UPGRADE_ID ? activeUpgrade.total : oilProcessingUpgradeTimeFor(basicOilMachineCount);
  const oilProcessingPrerequisiteMet = state.research.includes('advanced-oil-processing');
  const cancelActiveUpgrade = () => {
    if (!activeUpgrade) return;
    cancelConstruction(activeUpgrade.id);
    notice(`${activeUpgrade.target} cancelled · materials refunded`);
  };
  const startUpgrade = (upgrade: UpgradeDefinition) => {
    const jobId = `upgrade-${Date.now()}`;
    const result = beginUpgrade({
      raw: state.raw,
      products: state.products,
      research: state.research,
      machineVariants: state.machineVariants,
      machineCounts: { assembly: electricAssemblerCount(state), mining: burnerMinerCount(state) },
      labCount: state.labs,
      labSpeedLevel: state.labSpeedLevel,
      queue: state.queue,
    }, upgrade.id, jobId);
    if (!result.ok) return notice(result.message);
    const visualTiming = constructionVisualTiming(result.job.total);
    setState((s) => ({ ...s, raw: result.state.raw, products: result.state.products, queue: (result.state.queue as QueueItem[]).map((item) => item.id === result.job.id ? { ...item, ...visualTiming } : item) }));
    const unitLabel = upgrade.labSpeedLevel !== undefined
      ? `lab${result.job.machineCount === 1 ? '' : 's'}`
      : `machine${result.job.machineCount === 1 ? '' : 's'}`;
    notice(`${upgrade.name} started for ${result.job.machineCount} ${unitLabel}`);
  };
  const startStorageUpgrade = () => {
    if (storageUpgradeComplete) return notice('Iron Chests is already installed');
    if (activeUpgrade) return notice('finish the active upgrade before starting another');
    if (!storageBoxCount) return notice('construct at least one wooden chest first');
    if (storageUpgradeMissing) return notice(`missing ${storageUpgradeMissing}`);
    const costs = [{ key: 'ironPlate', amount: ironChestUpgradeCostFor(storageBoxCount), source: 'products' as const }];
    const job: QueueItem = {
      id: `upgrade-${Date.now()}`,
      action: 'upgrade',
      target: 'Upgrade storage to Iron Chests',
      targetId: 'iron-chests',
      seconds: storageUpgradeTotalSeconds,
      total: storageUpgradeTotalSeconds,
      machineCount: storageBoxCount,
      costs,
      reserved: costs.map((cost) => cost.amount),
      ...constructionVisualTiming(storageUpgradeTotalSeconds),
    };
    setState((s) => ({
      ...s,
      products: { ...s.products, ironPlate: (s.products.ironPlate ?? 0) - ironChestUpgradeCostFor(storageBoxCount) },
      queue: [...s.queue, job],
    }));
    notice(`Upgrade storage to Iron Chests started for ${storageBoxCount} chest${storageBoxCount === 1 ? '' : 's'}`);
  };
  const startSteelStorageUpgrade = () => {
    if (steelStorageUpgradeComplete) return notice('Steel Chests are already installed');
    if (activeUpgrade) return notice('finish the active upgrade before starting another');
    if (!storageUpgradeComplete) return notice('complete the Iron Chests upgrade first');
    if (!storageBoxCount) return notice('construct at least one iron chest first');
    if (steelStorageUpgradeMissing) return notice(`missing ${steelStorageUpgradeMissing}`);
    const job: QueueItem = {
      id: `upgrade-${Date.now()}`,
      action: 'upgrade',
      target: 'Upgrade all storage to Steel Chests',
      targetId: 'steel-chests',
      seconds: steelStorageUpgradeTotalSeconds,
      total: steelStorageUpgradeTotalSeconds,
      machineCount: storageBoxCount,
      costs: steelStorageUpgradeCosts.map((cost) => ({ ...cost })),
      reserved: steelStorageUpgradeCosts.map((cost) => cost.amount),
      ...constructionVisualTiming(steelStorageUpgradeTotalSeconds),
    };
    setState((s) => ({
      ...s,
      products: { ...s.products, steel: (s.products.steel ?? 0) - steelChestUpgradeCostFor(storageBoxCount) },
      queue: [...s.queue, job],
    }));
    notice(`Upgrade all storage to Steel Chests started for ${storageBoxCount} chest${storageBoxCount === 1 ? '' : 's'}`);
  };
  const startFurnaceUpgrade = () => {
    if (furnaceUpgradeComplete) return notice('Steel Furnaces are already installed');
    if (activeUpgrade) return notice('finish the active upgrade before starting another');
    if (!furnaceUpgradePrerequisiteMet) return notice(`${prettyLabel(STEEL_FURNACE_PREREQUISITE_TECHNOLOGY)} research required`);
    if (!furnaceCount) return notice('construct at least one stone furnace first');
    if (furnaceUpgradeMissing) return notice(`missing ${furnaceUpgradeMissing}`);
    const job: QueueItem = {
      id: `upgrade-${Date.now()}`,
      action: 'upgrade',
      target: 'Upgrade all furnaces to Steel Furnaces',
      targetId: 'steel-furnaces',
      seconds: furnaceUpgradeTotalSeconds,
      total: furnaceUpgradeTotalSeconds,
      machineCount: furnaceCount,
      costs: furnaceUpgradeCosts.map((cost) => ({ ...cost })),
      reserved: furnaceUpgradeCosts.map((cost) => cost.amount),
      ...constructionVisualTiming(furnaceUpgradeTotalSeconds),
    };
    setState((s) => {
      const raw = { ...s.raw };
      const products = { ...s.products };
      reserveConstructionMaterials({ raw, products }, furnaceUpgradeCosts);
      return { ...s, raw, products, queue: [...s.queue, job] };
    });
    notice(`Upgrade all furnaces to Steel Furnaces started for ${furnaceCount} furnace${furnaceCount === 1 ? '' : 's'}`);
  };
  const startElectricFurnaceUpgrade = () => {
    if (electricFurnaceUpgradeComplete) return notice('Electric Furnaces are already installed');
    if (activeUpgrade) return notice('finish the active upgrade before starting another');
    if (!electricFurnaceUpgradePrerequisiteMet) return notice(`${prettyLabel(ELECTRIC_FURNACE_PREREQUISITE_TECHNOLOGY)} research and Steel Furnaces are required`);
    if (!furnaceCount) return notice('construct at least one steel furnace first');
    if (electricFurnaceUpgradeMissing) return notice(`missing ${electricFurnaceUpgradeMissing}`);
    const job: QueueItem = {
      id: `upgrade-${Date.now()}`,
      action: 'upgrade',
      target: 'Upgrade all furnaces to Electric Furnaces',
      targetId: ELECTRIC_FURNACE_UPGRADE_ID,
      seconds: electricFurnaceUpgradeTotalSeconds,
      total: electricFurnaceUpgradeTotalSeconds,
      machineCount: furnaceCount,
      costs: electricFurnaceUpgradeCosts.map((cost) => ({ ...cost })),
      reserved: electricFurnaceUpgradeCosts.map((cost) => cost.amount),
      ...constructionVisualTiming(electricFurnaceUpgradeTotalSeconds),
    };
    setState((s) => {
      const raw = { ...s.raw };
      const products = { ...s.products };
      reserveConstructionMaterials({ raw, products }, electricFurnaceUpgradeCosts);
      return { ...s, raw, products, queue: [...s.queue, job] };
    });
    notice(`Upgrade all furnaces to Electric Furnaces started for ${furnaceCount} furnace${furnaceCount === 1 ? '' : 's'}`);
  };
  const startOilProcessingUpgrade = () => {
    if (oilProcessingUpgradeComplete) return notice('Advanced Oil Processing is already installed');
    if (activeUpgrade) return notice('finish the active upgrade before starting another');
    if (!oilProcessingPrerequisiteMet) return notice('Advanced Oil Processing research required');
    if (!basicOilMachineCount) return notice('construct at least one basic oil processing refinery first');
    const job: QueueItem = {
      id: `upgrade-${Date.now()}`,
      action: 'upgrade',
      target: 'Upgrade Basic Oil Processing to Advanced Oil Processing',
      targetId: OIL_PROCESSING_UPGRADE_ID,
      seconds: oilProcessingUpgradeTimeFor(basicOilMachineCount),
      total: oilProcessingUpgradeTimeFor(basicOilMachineCount),
      machineCount: basicOilMachineCount,
      ...constructionVisualTiming(oilProcessingUpgradeTimeFor(basicOilMachineCount)),
    };
    setState((s) => ({ ...s, queue: [...s.queue, job] }));
    notice(`Advanced Oil Processing conversion started for ${basicOilMachineCount} refinery${basicOilMachineCount === 1 ? '' : 'ies'}`);
  };
  const upgradeCategoryPriority: Record<string, number> = {
    'iron-chests': 0,
    'steel-chests': 1,
    'electric-mining-drill': 2,
    'steel-furnaces': 3,
    [ELECTRIC_FURNACE_UPGRADE_ID]: 4,
    'assembly-machine-2': 5,
    'assembly-machine-3': 6,
    'research-speed-1': 7,
    'research-speed-2': 8,
    'research-speed-3': 9,
    'research-speed-4': 10,
    'research-speed-5': 11,
    'research-speed-6': 12,
    [OIL_PROCESSING_UPGRADE_ID]: 13,
  };
  const upgradeAvailabilityRank = (complete: boolean, prerequisiteMet: boolean) => complete ? 2 : prerequisiteMet ? 0 : 1;
  const sortedUpgradeCards = [
    ...upgradeData.map((item) => {
      const machineCount = machineCountForUpgrade(state, item);
      const isLabSpeedUpgrade = item.labSpeedLevel !== undefined;
      const complete = isLabSpeedUpgrade
        ? state.labSpeedLevel >= (item.labSpeedLevel ?? 0)
        : upgradeInstalledFor(state.machineVariants, item.id);
      const prerequisiteUpgradeMet = !item.prerequisiteUpgrade
        || (isLabSpeedUpgrade
          ? state.labSpeedLevel >= (upgradeMap[item.prerequisiteUpgrade].labSpeedLevel ?? 0)
          : state.machineVariants[item.machineGroup] === upgradeMap[item.prerequisiteUpgrade].newMachine);
      const prerequisiteMet = state.research.includes(item.prerequisiteTechnology) && prerequisiteUpgradeMet;
      const queued = activeUpgrade?.targetId === item.id;
      const totalCosts = scaledBuildCosts(item.upgradeCostPerMachine, machineCount);
      const missing = complete || !machineCount ? '' : missingBuildMaterials(state, totalCosts);
      const conversionCount = activeUpgrade?.machineCount ?? machineCount;
      const canStart = !complete && !activeUpgrade && prerequisiteMet && machineCount > 0 && !missing;
      const fromMachine = isLabSpeedUpgrade
        ? 'lab'
        : item.id === 'assembly-machine-2'
        ? 'assembling-machine-1'
        : item.id === 'assembly-machine-3'
          ? 'assembling-machine-2'
          : 'burner-mining-drill';
      const fromLabel = isLabSpeedUpgrade
        ? 'Science Lab'
        : item.id === 'assembly-machine-2'
        ? 'Assembly Machine 1'
        : item.id === 'assembly-machine-3'
          ? 'Assembly Machine 2'
          : 'Burner Mining Drill';
      const toMachine = isLabSpeedUpgrade ? 'lab' : item.newMachine;
      return {
        id: item.id,
        availability: upgradeAvailabilityRank(complete, prerequisiteMet),
        category: upgradeCategoryPriority[item.id] ?? 99,
        card: <UpgradeCard
          key={item.id}
          testId={`card-upgrade-${item.id}`}
          title={item.name}
          copy={item.copy}
          iconPair={<UpgradeIconPair from={<ResourceIcon item={fromMachine} size={26} />} to={<ResourceIcon item={toMachine} size={26} />} fromLabel={fromLabel} toLabel={item.newMachineLabel} />}
          flow={!complete ? <UpgradeFlow count={conversionCount} from={fromLabel} to={item.newMachineLabel} /> : undefined}
          progress={queued && activeUpgrade ? <UpgradeProgress count={conversionCount} label={`${item.relevantMachine.toLowerCase()}${conversionCount === 1 ? '' : 's'}`} seconds={activeUpgrade.seconds} total={activeUpgrade.total} progressStartedAt={activeUpgrade.progressStartedAt} progressDurationMs={activeUpgrade.progressDurationMs} testId={`panel-upgrade-progress-${item.id}`} cancelUpgrade={cancelActiveUpgrade} /> : undefined}
           meta={<UpgradeMetaGrid prerequisite={item.prerequisiteUpgrade ? `${item.prerequisiteTechnology} + ${upgradeMap[item.prerequisiteUpgrade].name}` : item.prerequisiteTechnology} prerequisiteMet={prerequisiteMet} machine={complete ? item.newMachineLabel : item.relevantMachine} machineIcon={<ResourceIcon item={complete ? toMachine : fromMachine} size={17} />} />}
          powerAdvisory={!complete && machineCount > 0 && (item.id === 'electric-mining-drill' || item.id === 'assembly-machine-2' || item.id === 'assembly-machine-3')
            ? <UpgradePowerAdvisory
              testId={`panel-upgrade-power-${item.id}`}
              machineCount={machineCount}
              powerDrawKw={item.newMachinePowerDraw}
              state={state}
            />
            : undefined}
          costPerItem={item.upgradeCostPerMachine}
          totalCost={totalCosts}
          timePerMachine={item.upgradeTimePerMachine}
          totalTime={queued && activeUpgrade ? activeUpgrade.total : item.upgradeTimePerMachine * machineCount}
          showCosts={!complete}
          action={<div className="mt-3"><button onClick={() => startUpgrade(item)} disabled={complete || !canStart} className={`button-base w-full !py-2 ${complete ? 'button-build-active cursor-default' : 'button-primary disabled:cursor-not-allowed disabled:opacity-45'}`} data-testid={`button-start-upgrade-${item.id}`}>{complete ? <><Check size={13} aria-hidden="true" />installed</> : <><TrendingUp size={13} /> {activeUpgrade ? 'upgrade busy' : missing ? `need ${missing}` : !prerequisiteMet ? 'locked' : !machineCount ? 'build machines first' : 'start upgrade'}</>}</button></div>}
        />,
      };
    }),
    {
      id: OIL_PROCESSING_UPGRADE_ID,
      availability: upgradeAvailabilityRank(oilProcessingUpgradeComplete, oilProcessingPrerequisiteMet),
      category: upgradeCategoryPriority[OIL_PROCESSING_UPGRADE_ID],
      card: <UpgradeCard
        key={OIL_PROCESSING_UPGRADE_ID}
        testId="card-upgrade-advanced-oil-processing"
        title="Upgrade Basic Oil Processing to Advanced Oil Processing"
        copy="Replace every constructed Basic Oil Processing refinery with Advanced Oil Processing. The conversion is free and takes one second per refinery."
        iconPair={<UpgradeIconPair from={<UpgradeAssetIcon file="basic-oil-processing" size={28} />} to={<UpgradeAssetIcon file="advanced-oil-processing" size={28} />} fromLabel="Basic Oil Processing" toLabel="Advanced Oil Processing" />}
        flow={!oilProcessingUpgradeComplete ? <UpgradeFlow count={oilProcessingConversionCount} from="Basic Oil Processing" to="Advanced Oil Processing" /> : undefined}
        progress={oilProcessingUpgradeQueued && activeUpgrade ? <UpgradeProgress count={oilProcessingConversionCount} label={oilProcessingConversionCount === 1 ? 'refinery' : 'refineries'} seconds={activeUpgrade.seconds} total={activeUpgrade.total} progressStartedAt={activeUpgrade.progressStartedAt} progressDurationMs={activeUpgrade.progressDurationMs} testId="panel-upgrade-progress-advanced-oil-processing" cancelUpgrade={cancelActiveUpgrade} /> : undefined}
        meta={<UpgradeMetaGrid prerequisite="advanced-oil-processing" prerequisiteMet={oilProcessingPrerequisiteMet} machine="Oil Refinery" machineIcon={<UpgradeAssetIcon file={oilProcessingUpgradeComplete ? 'advanced-oil-processing' : 'basic-oil-processing'} size={17} />} />}
        costPerItem={[]}
        totalCost={[]}
        timePerMachine={oilProcessingUpgradeTimeFor(1)}
        totalTime={oilProcessingUpgradeQueued && activeUpgrade ? activeUpgrade.total : oilProcessingUpgradeTotalSeconds}
        showCosts={!oilProcessingUpgradeComplete}
        action={<div className="mt-3"><button onClick={startOilProcessingUpgrade} disabled={oilProcessingUpgradeComplete || !!activeUpgrade || !oilProcessingPrerequisiteMet || !basicOilMachineCount} className={`button-base w-full !py-2 ${oilProcessingUpgradeComplete ? 'button-build-active cursor-default' : 'button-primary disabled:cursor-not-allowed disabled:opacity-45'}`} data-testid="button-start-upgrade-advanced-oil-processing">{oilProcessingUpgradeComplete ? <><Check size={13} aria-hidden="true" />installed</> : <><TrendingUp size={13} /> {activeUpgrade ? 'upgrade busy' : !oilProcessingPrerequisiteMet ? 'locked' : !basicOilMachineCount ? 'build refineries first' : 'start upgrade'}</>}</button></div>}
      />,
    },
    {
      id: 'steel-furnaces',
      availability: upgradeAvailabilityRank(furnaceUpgradeComplete, furnaceUpgradePrerequisiteMet),
      category: upgradeCategoryPriority['steel-furnaces'],
      card: <UpgradeCard
        key="steel-furnaces"
        testId="card-upgrade-steel-furnaces"
        title="Upgrade all furnaces to Steel Furnaces"
        copy="Convert every constructed stone furnace together. Steel Furnaces run at twice the speed and use half the coal per item."
        iconPair={<UpgradeIconPair from={<ResourceIcon item="stone-furnace" size={26} />} to={<ResourceIcon item="steel-furnace" size={26} />} fromLabel="Stone Furnace" toLabel="Steel Furnace" />}
        flow={!furnaceUpgradeComplete ? <UpgradeFlow count={furnaceUpgradeQueued ? activeUpgrade?.machineCount ?? furnaceCount : furnaceCount} from="Stone Furnace" to="Steel Furnace" /> : undefined}
         progress={furnaceUpgradeQueued && activeUpgrade ? <UpgradeProgress count={activeUpgrade.machineCount ?? furnaceCount} label={activeUpgrade.machineCount === 1 ? 'stone furnace' : 'stone furnaces'} seconds={activeUpgrade.seconds} total={activeUpgrade.total} progressStartedAt={activeUpgrade.progressStartedAt} progressDurationMs={activeUpgrade.progressDurationMs} testId="panel-upgrade-progress-steel-furnaces" cancelUpgrade={cancelActiveUpgrade} /> : undefined}
        meta={<UpgradeMetaGrid prerequisite={STEEL_FURNACE_PREREQUISITE_TECHNOLOGY} prerequisiteMet={furnaceUpgradePrerequisiteMet} machine={furnaceUpgradeComplete ? 'Steel Furnace' : 'Stone Furnace'} machineIcon={<ResourceIcon item={furnaceUpgradeComplete ? 'steel-furnace' : 'stone-furnace'} size={17} />} />}
        costPerItem={furnaceUpgradeCostPerFurnace}
        totalCost={furnaceUpgradeCosts}
        timePerMachine={steelFurnaceRecipe.energyRequired}
        totalTime={furnaceUpgradeQueued && activeUpgrade ? activeUpgrade.total : furnaceUpgradeTotalSeconds}
        showCosts={!furnaceUpgradeComplete}
        action={<div className="mt-3"><button onClick={startFurnaceUpgrade} disabled={furnaceUpgradeComplete || !!activeUpgrade || !furnaceUpgradePrerequisiteMet || !furnaceCount || !!furnaceUpgradeMissing} className={`button-base w-full !py-2 ${furnaceUpgradeComplete ? 'button-build-active cursor-default' : 'button-primary disabled:cursor-not-allowed disabled:opacity-45'}`} data-testid="button-start-upgrade-steel-furnaces">{furnaceUpgradeComplete ? <><Check size={13} aria-hidden="true" />installed</> : <><TrendingUp size={13} /> {activeUpgrade ? 'upgrade busy' : !furnaceUpgradePrerequisiteMet ? 'locked' : furnaceUpgradeMissing ? `need ${furnaceUpgradeMissing}` : !furnaceCount ? 'build furnaces first' : 'start upgrade'}</>}</button></div>}
      />,
    },
     {
       id: ELECTRIC_FURNACE_UPGRADE_ID,
       availability: upgradeAvailabilityRank(electricFurnaceUpgradeComplete, electricFurnaceUpgradePrerequisiteMet),
       category: upgradeCategoryPriority[ELECTRIC_FURNACE_UPGRADE_ID],
       card: <UpgradeCard
         key={ELECTRIC_FURNACE_UPGRADE_ID}
         testId="card-upgrade-electric-furnaces"
         title="Upgrade all furnaces to Electric Furnaces"
         copy="Convert every constructed Steel Furnace together. Electric Furnaces keep the same speed, remove coal consumption, and draw 180 kW each."
         iconPair={<UpgradeIconPair from={<ResourceIcon item="steel-furnace" size={26} />} to={<ResourceIcon item="electric-furnace" size={26} />} fromLabel="Steel Furnace" toLabel="Electric Furnace" />}
         flow={!electricFurnaceUpgradeComplete ? <UpgradeFlow count={electricFurnaceUpgradeQueued ? activeUpgrade?.machineCount ?? furnaceCount : furnaceCount} from="Steel Furnace" to="Electric Furnace" /> : undefined}
          progress={electricFurnaceUpgradeQueued && activeUpgrade ? <UpgradeProgress count={activeUpgrade.machineCount ?? furnaceCount} label={activeUpgrade.machineCount === 1 ? 'steel furnace' : 'steel furnaces'} seconds={activeUpgrade.seconds} total={activeUpgrade.total} progressStartedAt={activeUpgrade.progressStartedAt} progressDurationMs={activeUpgrade.progressDurationMs} testId="panel-upgrade-progress-electric-furnaces" cancelUpgrade={cancelActiveUpgrade} /> : undefined}
         meta={<UpgradeMetaGrid prerequisite={`${ELECTRIC_FURNACE_PREREQUISITE_TECHNOLOGY} + Steel Furnaces`} prerequisiteMet={electricFurnaceUpgradePrerequisiteMet} machine={electricFurnaceUpgradeComplete ? 'Electric Furnace' : 'Steel Furnace'} machineIcon={<ResourceIcon item={electricFurnaceUpgradeComplete ? 'electric-furnace' : 'steel-furnace'} size={17} />} />}
         powerAdvisory={!electricFurnaceUpgradeComplete && furnaceCount > 0 ? <UpgradePowerAdvisory testId="panel-upgrade-power-electric-furnaces" machineCount={electricFurnaceUpgradeQueued ? activeUpgrade?.machineCount ?? furnaceCount : furnaceCount} powerDrawKw={electricFurnacePowerKw} state={state} /> : undefined}
         costPerItem={electricFurnaceUpgradeCostPerFurnace}
         totalCost={electricFurnaceUpgradeCosts}
         timePerMachine={electricFurnaceUpgradeTimePerFurnace}
         totalTime={electricFurnaceUpgradeQueued && activeUpgrade ? activeUpgrade.total : electricFurnaceUpgradeTotalSeconds}
         showCosts={!electricFurnaceUpgradeComplete}
         action={<div className="mt-3"><button onClick={startElectricFurnaceUpgrade} disabled={electricFurnaceUpgradeComplete || !!activeUpgrade || !electricFurnaceUpgradePrerequisiteMet || !furnaceCount || !!electricFurnaceUpgradeMissing} className={`button-base w-full !py-2 ${electricFurnaceUpgradeComplete ? 'button-build-active cursor-default' : 'button-primary disabled:cursor-not-allowed disabled:opacity-45'}`} data-testid="button-start-upgrade-electric-furnaces">{electricFurnaceUpgradeComplete ? <><Check size={13} aria-hidden="true" />installed</> : <><TrendingUp size={13} /> {activeUpgrade ? 'upgrade busy' : electricFurnaceUpgradeMissing ? `need ${electricFurnaceUpgradeMissing}` : !electricFurnaceUpgradePrerequisiteMet ? 'locked' : !furnaceCount ? 'build furnaces first' : 'start upgrade'}</>}</button></div>}
       />,
     },
    {
      id: 'iron-chests',
      availability: upgradeAvailabilityRank(storageUpgradeComplete, true),
      category: upgradeCategoryPriority['iron-chests'],
      card: <UpgradeCard
        key="iron-chests"
        testId="card-upgrade-iron-chests"
        title="Upgrade storage to Iron Chests"
        copy="Replace every constructed wooden chest with an Iron Chest. Fluid storage tanks are not affected."
        iconPair={<UpgradeIconPair from={<ResourceIcon item="wooden-chest" size={26} />} to={<ResourceIcon item="iron-chest" size={26} />} fromLabel="Wooden Chest" toLabel="Iron Chest" />}
        flow={!storageUpgradeComplete ? <UpgradeFlow count={storageUpgradeQueued ? activeUpgrade?.machineCount ?? storageBoxCount : storageBoxCount} from="Wooden Chest" to="Iron Chest" /> : undefined}
          progress={storageUpgradeQueued && activeUpgrade ? <UpgradeProgress count={activeUpgrade.machineCount ?? storageBoxCount} label={activeUpgrade.machineCount === 1 ? 'wooden chest' : 'wooden chests'} seconds={activeUpgrade.seconds} total={activeUpgrade.total} progressStartedAt={activeUpgrade.progressStartedAt} progressDurationMs={activeUpgrade.progressDurationMs} testId="panel-upgrade-progress-iron-chests" cancelUpgrade={cancelActiveUpgrade} /> : undefined}
        meta={<UpgradeMetaGrid prerequisiteMet={true} machine={storageUpgradeComplete ? 'Iron Chest' : 'Wooden Chest'} machineIcon={<ResourceIcon item={storageUpgradeComplete ? 'iron-chest' : 'wooden-chest'} size={17} />} />}
        costPerItem={[{ key: 'ironPlate', amount: ironChestUpgradeCostFor(1), source: 'products' }]}
        totalCost={storageUpgradeCosts}
        timePerMachine={ironChestUpgradeTimeFor(1)}
        totalTime={storageUpgradeQueued && activeUpgrade ? activeUpgrade.total : storageUpgradeTotalSeconds}
        showCosts={!storageUpgradeComplete}
        action={<div className="mt-3"><button onClick={startStorageUpgrade} disabled={storageUpgradeComplete || !!activeUpgrade || !storageBoxCount || !!storageUpgradeMissing} className={`button-base w-full !py-2 ${storageUpgradeComplete ? 'button-build-active cursor-default' : 'button-primary disabled:cursor-not-allowed disabled:opacity-45'}`} data-testid="button-start-upgrade-iron-chests">{storageUpgradeComplete ? <><Check size={13} aria-hidden="true" />installed</> : <><TrendingUp size={13} /> {activeUpgrade ? 'upgrade busy' : storageUpgradeMissing ? `need ${storageUpgradeMissing}` : !storageBoxCount ? 'build chests first' : 'start upgrade'}</>}</button></div>}
      />,
    },
     {
       id: 'steel-chests',
       availability: upgradeAvailabilityRank(steelStorageUpgradeComplete, storageUpgradeComplete),
       category: upgradeCategoryPriority['steel-chests'],
       card: <UpgradeCard
         key="steel-chests"
         testId="card-upgrade-steel-chests"
         title="Upgrade all storage to Steel Chests"
         copy="Replace every constructed Iron Chest with a Steel Chest. Fluid storage tanks are not affected."
         iconPair={<UpgradeIconPair from={<ResourceIcon item="iron-chest" size={26} />} to={<ResourceIcon item="steel-chest" size={26} />} fromLabel="Iron Chest" toLabel="Steel Chest" />}
         flow={!steelStorageUpgradeComplete ? <UpgradeFlow count={steelStorageUpgradeQueued ? activeUpgrade?.machineCount ?? storageBoxCount : storageBoxCount} from="Iron Chest" to="Steel Chest" /> : undefined}
          progress={steelStorageUpgradeQueued && activeUpgrade ? <UpgradeProgress count={activeUpgrade.machineCount ?? storageBoxCount} label={activeUpgrade.machineCount === 1 ? 'iron chest' : 'iron chests'} seconds={activeUpgrade.seconds} total={activeUpgrade.total} progressStartedAt={activeUpgrade.progressStartedAt} progressDurationMs={activeUpgrade.progressDurationMs} testId="panel-upgrade-progress-steel-chests" cancelUpgrade={cancelActiveUpgrade} /> : undefined}
         meta={<UpgradeMetaGrid prerequisite="Iron Chests upgrade" prerequisiteMet={storageUpgradeComplete} machine={steelStorageUpgradeComplete ? 'Steel Chest' : 'Iron Chest'} machineIcon={<ResourceIcon item={steelStorageUpgradeComplete ? 'steel-chest' : 'iron-chest'} size={17} />} />}
         costPerItem={[{ key: 'steel', amount: STORAGE_STEEL_BOX_COST, source: 'products' }]}
         totalCost={steelStorageUpgradeCosts}
         timePerMachine={STORAGE_STEEL_BOX_UPGRADE_TIME}
         totalTime={steelStorageUpgradeQueued && activeUpgrade ? activeUpgrade.total : steelStorageUpgradeTotalSeconds}
         showCosts={!steelStorageUpgradeComplete}
         action={<div className="mt-3"><button onClick={startSteelStorageUpgrade} disabled={steelStorageUpgradeComplete || !!activeUpgrade || !storageUpgradeComplete || !storageBoxCount || !!steelStorageUpgradeMissing} className={`button-base w-full !py-2 ${steelStorageUpgradeComplete ? 'button-build-active cursor-default' : 'button-primary disabled:cursor-not-allowed disabled:opacity-45'}`} data-testid="button-start-upgrade-steel-chests">{steelStorageUpgradeComplete ? <><Check size={13} aria-hidden="true" />installed</> : <><TrendingUp size={13} /> {activeUpgrade ? 'upgrade busy' : !storageUpgradeComplete ? 'locked' : steelStorageUpgradeMissing ? `need ${steelStorageUpgradeMissing}` : !storageBoxCount ? 'build chests first' : 'start upgrade'}</>}</button></div>}
       />,
     },
  ].sort((a, b) => a.availability - b.availability || a.category - b.category);
  const upgradeCounts = sortedUpgradeCards.reduce<Record<UpgradeFilter, number>>((counts, upgrade) => {
    const filter = upgrade.availability === 2 ? 'completed' : upgrade.availability === 0 ? 'available' : 'locked';
    counts[filter] += 1;
    return counts;
  }, { completed: 0, available: 0, locked: 0 });
  const visibleUpgradeCards = sortedUpgradeCards.filter((upgrade) => {
    const status = upgrade.availability === 2 ? 'completed' : upgrade.availability === 0 ? 'available' : 'locked';
    return status === upgradeFilter;
  });
  return <PageFrame>
     <Header eyebrow="Machine + lab upgrades" title="Upgrades" copy="Convert machines, improve lab speed, or upgrade storage and oil processing in one timed job. Material costs are reserved when an upgrade starts, and only one conversion can run at a time." action={<Tag><TrendingUp size={11} /> 13 upgrades</Tag>} />
    <section className="surface mb-5 rounded-xl border-[hsl(var(--primary)/.25)] bg-[linear-gradient(100deg,hsl(34_28%_16%/.82),hsl(216_25%_14%/.96))] p-4 sm:p-5">
      <div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><Info size={17} /></div><div><div className="eyebrow text-[hsl(var(--primary))]">How conversion works</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Costs are calculated from the current number of relevant machines, deducted immediately, and all matching machines change variant together when the timer completes. Construction elsewhere in the factory can continue.</p></div></div>
    </section>
       <div className="mb-4 flex justify-center">
         <div className="flex flex-wrap gap-1.5" role="group" aria-label="Upgrade filters">
          {(['completed', 'available', 'locked'] as UpgradeFilter[]).map((option) => (
            <button
              key={option}
              onClick={() => setUpgradeFilter(option)}
              className={`button-base !px-2.5 !py-1.5 text-[9px] uppercase tracking-[.08em] ${upgradeFilter === option ? 'button-primary' : 'button-ghost'}`}
              aria-pressed={upgradeFilter === option}
              data-testid={`button-upgrade-filter-${option}`}
            >
              {option[0].toUpperCase() + option.slice(1)} <span className="mono opacity-75">{upgradeCounts[option]}</span>
            </button>
          ))}
        </div>
      </div>
     <div className="grid gap-3 md:grid-cols-2">
         {visibleUpgradeCards.map(({ card }) => card)}
     </div>
  </PageFrame>;
}

function SciencePage({ state, setState, enqueue, notice, cancelConstruction, constructionBatchSize, setConstructionBatchSize }: PageProps) {
  const activeResearch = activeResearchFor(state);
  const requiredScienceKeys = scienceRequirementKeysFor(activeResearch);
  const currentSpm = scienceCurrentSpmFor(state, requiredScienceKeys);
  const peakSpm = sciencePeakSpmFor(state, requiredScienceKeys);
  const labRate = scienceLabRateFor(state, activeResearch);
  const buildLab = () => { enqueue('lab', 'Science lab', labRecipe.energyRequired, undefined, [{ key: 'ironPlate', amount: 12, source: 'products' }, { key: 'circuit', amount: 4, source: 'products' }], constructionBatchSize); };
  const labConstructionItems = state.queue.filter((item) => item.action === 'lab');
  const labIsBuilding = labConstructionItems.length > 0;
  const currentLabUsage = requiredScienceKeys.reduce((total, key) => total + demandRateFor(state, key), 0);
  const peakLabUsage = activeResearch ? activeResearch.scienceCosts.reduce((total, cost) => total + scienceLabRateFor(state, activeResearch, false) * cost.amount, 0) : 0;
  const amountLabel = (amount: number) => Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2);
  return <PageFrame>
    <Header eyebrow="Research fuel" title="Science" copy="Labs consume every science pack required by the active research. SPM is limited by lab capacity and the tightest available pack line." constructionBatchSize={constructionBatchSize} onConstructionBatchSizeChange={setConstructionBatchSize} constructionRoboticsUnlocked={state.research.includes('construction-robotics')} notice={notice} action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><FlaskConical size={17} className="text-[hsl(var(--primary))]" /><span className="mono text-[15px]">{currentSpm.toFixed(1)} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">SPM</span></span></div>} />
    <section className="surface mb-5 rounded-xl p-4 sm:p-5">
       <div className="mb-5 flex items-center justify-between gap-3"><SectionTitle detail={activeResearch ? `${requiredScienceKeys.length} pack types required` : 'select research to run labs'}>Science throughput</SectionTitle></div>
       <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
         <div className="surface-soft min-w-0 rounded-lg p-3"><div className="eyebrow">Current SPM</div><div className="mono mt-2 text-xl text-[hsl(var(--primary))]">{currentSpm.toFixed(1)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">actual recent consumption</div></div>
         <div className="surface-soft min-w-0 rounded-lg p-3"><div className="eyebrow">Peak SPM</div><div className="mono mt-2 text-xl text-[hsl(var(--secondary))]">{peakSpm.toFixed(1)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">pack supply bottleneck</div></div>
         <div className="surface-soft min-w-0 rounded-lg p-3"><div className="eyebrow">Labs online</div><div className="mono mt-2 text-xl">{state.labs}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{labRate.toFixed(1)} cycles / min capacity</div></div>
         <div className="surface-soft min-w-0 rounded-lg p-3"><div className="eyebrow">Active research</div><div className="mt-2 truncate text-[13px] font-extrabold">{activeResearch ? prettyLabel(activeResearch.name) : 'None selected'}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{activeResearch ? 'packs consumed per lab cycle' : 'choose a technology in Research'}</div></div>
      </div>
       <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]"><span className="eyebrow">Required line</span>{requiredScienceKeys.length ? requiredScienceKeys.map((key) => <span className="resource-chip" key={key}><span className="status-dot status-running" />{meta[key]?.label ?? prettyLabel(key)}</span>) : <span>No science packs required.</span>}</div>
    </section>
    <section className="surface rounded-xl p-4 sm:p-5">
      <SectionTitle detail={`${scienceKeys.filter((key) => recipeIsUnlocked(recipeMap[scienceRecipeKeys[key]], state)).length}/${scienceKeys.length} recipes unlocked`}>Production cards</SectionTitle>
       <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
         <article className="surface-soft min-w-0 rounded-xl p-3.5 sm:p-4" data-testid="card-science-labs">
            <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="lab" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Science labs</h2><div className="flex items-center gap-2">{state.labs ? <Tag><span className="status-dot status-running" /> auto</Tag> : labIsBuilding ? <Tag tone="amber"><Clock3 size={10} /> queued</Tag> : <Tag tone="amber">offline</Tag>}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Science lab count"><ResourceIcon item="lab" size={17} /><span className="mono text-[13px]">{state.labs}</span></div></div></div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Research facility · {activeResearch ? `${activeResearch.time ?? 5}s cycle` : 'standby'} · Science lab</p><div className="mt-1 flex flex-wrap gap-1"><Tag tone={activeResearch ? 'teal' : 'amber'}>{activeResearch ? 'active research' : 'select research'}</Tag>{labIsBuilding && <Tag tone="muted">construction queued</Tag>}</div></div></div>
           <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Construction</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip"><ResourceIcon item="ironPlate" size={17} /><strong>12</strong> iron plates</span><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">+</span><span className="resource-chip"><ResourceIcon item="circuit" size={17} /><strong>4</strong> circuits</span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--primary)/.4)' }}><ResourceIcon item="lab" size={17} /><strong>1</strong> lab</span></div></div>
            <div className="mt-3 grid grid-cols-3 gap-2"><div className="data-row rounded-lg p-2.5"><div className="eyebrow">current usage</div><div className="mono mt-1 text-[13px] text-[hsl(var(--primary))]">{currentLabUsage.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">packs / min</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">peak usage</div><div className="mono mt-1 text-[13px] text-[hsl(var(--secondary))]">{peakLabUsage.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">packs / min</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">capacity</div><div className="mono mt-1 text-[13px]">{labRate.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">cycles / min</div></div></div>
              <div className="mt-4"><button onClick={buildLab} className={`button-base w-full !py-2 ${labIsBuilding ? 'button-build-active' : 'button-primary'}`} aria-label={`${state.labs ? 'Construct another' : 'Construct'} ${constructionBatchSize} science labs`} data-testid={state.labs ? 'button-build-more-lab' : 'button-build-lab'}>{labIsBuilding ? <><Check size={13} /> queued · build {constructionBatchSize}</> : <><Hammer size={13} /> {constructionBatchSize === 1 ? 'construct lab' : `construct ${constructionBatchSize}`} <ResourceIcon item="lab" size={13} /></>}</button></div>
             <BuildProgress items={labConstructionItems} label="Science lab" cancelConstruction={cancelConstruction} notice={notice} />
        </article>
        {scienceKeys.map((key) => {
          const recipe = scienceRecipeFor(key);
          if (!recipe) return null;
          const unlocked = recipeIsUnlocked(recipe, state);
          const required = requiredScienceKeys.includes(key);
          const productionCapacity = unlocked ? sciencePackProductionRateFor(state, key) : 0;
          const currentProduction = unlocked ? productionRateFor(state, key) : 0;
          const currentConsumption = required ? demandRateFor(state, key) : 0;
          const peakConsumption = required ? scienceLabRateFor(state, activeResearch, false) * scienceCostAmountFor(activeResearch, key) : 0;
           const ingredients = recipe.ingredients.map((ingredient) => `${amountLabel(materialAmount(ingredient))} ${prettyLabel(keyForSource(ingredient.name))}`).join(' + ');
           const outputs = recipeOutputs(recipe).map(({ key: outputKey, amount }) => `${amountLabel(amount)} ${prettyLabel(outputKey)}`).join(' + ');
           const recipeAriaLabel = `${ingredients} -> ${outputs} (${recipe.energyRequired}s)`;
           return <article className={`min-w-0 rounded-xl border p-3.5 sm:p-4 ${unlocked ? 'surface-soft' : 'locked-wash opacity-55 grayscale'}`} key={key} data-testid={`card-science-${key}`}>
             <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item={key} size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">{meta[key].label}</h2>{unlocked ? <Tag><span className="status-dot status-running" /> unlocked</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag>}</div><div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-[9px] text-[hsl(var(--muted-foreground))]" aria-label={recipeAriaLabel}>{recipe.ingredients.map((ingredient, index) => { const ingredientKey = keyForSource(ingredient.name); return <span className="inline-flex items-center gap-1" key={`${ingredient.name}-${index}`}><span className="mono">{amountLabel(materialAmount(ingredient))}</span><ResourceIcon item={ingredientKey} size={14} />{index < recipe.ingredients.length - 1 && <span aria-hidden="true">+</span>}</span>; })}<ArrowRight size={12} className="mx-1 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />{recipeOutputs(recipe).map(({ key: outputKey, amount }, index) => <span className="inline-flex items-center gap-1" key={`${outputKey}-${index}`}><span className="mono">{amountLabel(amount)}</span><ResourceIcon item={outputKey} size={14} />{index < recipeOutputs(recipe).length - 1 && <span aria-hidden="true">+</span>}</span>)}<span className="mono ml-1 shrink-0">({recipe.energyRequired}s)</span></div></div></div>
            <CompactMetricsRow production={currentProduction} peakProduction={productionCapacity} demand={currentConsumption} peakConsumption={peakConsumption} net={currentProduction - currentConsumption} storage={state.products[key] ?? 0} capacity={capFor(state, key)} manualOutputEvent={state.manualOutputEvents[key] ?? 0} />
             <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-[9px] text-[hsl(var(--muted-foreground))]"><span className="min-w-0 break-words">{required ? 'required by active research' : 'not required by active research'}</span><span className="min-w-0 break-words text-right"><span className="mono">{recipe.energyRequired}s</span> / cycle · <span className="mono">{amountLabel(recipeOutputs(recipe).reduce((total, output) => total + output.amount, 0))}</span> output</span></div>
          </article>;
        })}
      </div>
    </section>
  </PageFrame>;
}

const generatedResearchIconFiles: Record<string, string> = {
  'physical-projectile-damage': 'physical-projectile-damage',
  'weapon-shooting-speed': 'weapon-shooting-speed',
  'stronger-explosives': 'stronger-explosives',
  'refined-flammables': 'refined-flammables',
  'laser-weapons-damage': 'laser-weapons-damage',
  'laser-shooting-speed': 'laser-shooting-speed',
};
function researchIconFileFor(technology: TechnologyDefinition) {
  const explicitIcon = technology.iconPath?.split('/').pop()?.replace(/\.png$/, '');
  if (explicitIcon) return explicitIcon;
  const generatedIcon = Object.entries(generatedResearchIconFiles)
    .find(([prefix]) => technology.name.startsWith(`${prefix}-`))?.[1];
  return generatedIcon ?? technology.name;
}
function ResearchArt({ technology, accent }: { technology: TechnologyDefinition; accent: string }) {
  const iconFile = researchIconFileFor(technology);
  return <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_25%_10%)]" style={{ color: accent }}><img src={`${import.meta.env.BASE_URL}research-icons/${iconFile}.png`} width={64} height={64} alt="" aria-hidden="true" className="h-full w-full object-contain p-1" /></div>;
}
function ResearchPage({ state, setState, notice }: PageProps) {
  const [selected, setSelected] = useState<ResearchKey>(state.currentResearch ?? orderedTechnologyCatalog[0]?.name ?? '');
  const [detailsTechnology, setDetailsTechnology] = useState<ResearchKey | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ResearchFilter>('unlocked');
  const accentFor = (name: string) => ['#65afba', '#df7165', '#dfb05c', '#8ea9db', '#92c86b', '#c9d3d0'][name.length % 6];
  const selectResearch = (name: ResearchKey) => {
    setSelected(name);
    setState((s) => s.currentResearch === name && s.researchSelected ? s : { ...s, currentResearch: name, researchSelected: true });
  };
  const toggleAutoResearch = (name: ResearchKey) => {
    if (technologyMap[name]?.researchTrigger) return;
    setState((s) => {
      const selectedAuto = new Set(s.autoResearch ?? []);
      if (selectedAuto.has(name)) selectedAuto.delete(name);
      else selectedAuto.add(name);
      const autoResearch = orderedTechnologyCatalog.filter((technology) => selectedAuto.has(technology.name)).map((technology) => technology.name);
      return { ...s, autoResearch, currentResearch: s.currentResearch ?? name, researchSelected: true };
    });
  };
  const technologyCounts = useMemo(() => orderedTechnologyCatalog.reduce<Record<ResearchFilter, number>>((counts, technology) => {
    const completed = state.research.includes(technology.name);
    const unlocked = !completed && technologyPrerequisitesMet(state, technology);
    counts[completed ? 'completed' : unlocked ? 'unlocked' : 'locked'] += 1;
    return counts;
  }, { completed: 0, unlocked: 0, locked: 0 }), [state.research]);
  const visibleTechnologies = useMemo(() => orderedTechnologyCatalog.filter((technology) => {
    const completed = state.research.includes(technology.name);
    const unlocked = !completed && technologyPrerequisitesMet(state, technology);
    const status = completed ? 'completed' : unlocked ? 'unlocked' : 'locked';
    const haystack = `${technology.name} ${technology.prerequisites.join(' ')} ${technology.effects.map((effect) => `${effect.type} ${effect.recipe ?? ''}`).join(' ')}`.toLowerCase();
    return status === filter && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  }), [filter, query, state.research]);
  const selectableVisibleTechnologyNames = visibleTechnologies
    .filter((technology) => !technology.researchTrigger)
    .map((technology) => technology.name);
  const allVisibleTechnologiesSelected = selectableVisibleTechnologyNames.length > 0
    && selectableVisibleTechnologyNames.every((name) => (state.autoResearch ?? []).includes(name));
  const toggleAllVisibleTechnologies = () => {
    setState((s) => {
      const visibleNames = visibleTechnologies
        .filter((technology) => !technology.researchTrigger)
        .map((technology) => technology.name);
      if (!visibleNames.length) return s;
      const selectedAuto = new Set(s.autoResearch ?? []);
      const shouldSelectAll = !visibleNames.every((name) => selectedAuto.has(name));
      visibleNames.forEach((name) => {
        if (shouldSelectAll) selectedAuto.add(name);
        else selectedAuto.delete(name);
      });
      const autoResearch = orderedTechnologyCatalog
        .filter((technology) => selectedAuto.has(technology.name))
        .map((technology) => technology.name);
      return {
        ...s,
        autoResearch,
        currentResearch: s.currentResearch ?? visibleNames[0],
        researchSelected: true,
      };
    });
  };
  const detailItem = detailsTechnology ? technologyMap[detailsTechnology] : undefined;
  const activeResearch = activeResearchFor(state);
  const activeResearchIsLabDriven = Boolean(activeResearch && !activeResearch.researchTrigger && activeResearch.scienceCosts.length);
  const activeResearchRate = activeResearchIsLabDriven ? scienceLabRateFor(state, activeResearch) : 0;
  const activeResearchProgress = activeResearch ? researchProgressFor(state, activeResearch) : 0;
  const activeResearchTotal = activeResearch ? researchUnitsFor(activeResearch) : 0;
  const activeResearchPercent = activeResearch ? researchProgressPercentFor(state, activeResearch) : 0;
  const activeResearchEta = activeResearchIsLabDriven && activeResearchRate > 0 ? Math.max(0, activeResearchTotal - activeResearchProgress) / activeResearchRate * 60 : null;
  return <PageFrame>
    <Header eyebrow="Technology control" title="Research" copy="Select a technology to research with your labs, or mark several for auto research. Checked technologies run one at a time from the top of this official catalog." action={<Tag><Lightbulb size={11} /> {technologyCatalog.length} technologies · {state.research.length} complete</Tag>} />
    <section className="surface mb-5 rounded-xl border-[hsl(var(--secondary)/.45)] bg-[linear-gradient(100deg,hsl(88_25%_16%/.86),hsl(216_25%_13%/.96))] p-4 sm:p-5" data-testid="panel-current-research">
      {activeResearch ? <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-[hsl(var(--secondary)/.5)] bg-[hsl(216_25%_10%/.86)] p-1 shadow-[0_0_24px_hsl(var(--secondary)/.12)]">
            <ResearchArt technology={activeResearch} accent={accentFor(activeResearch.name)} />
          </div>
          <div className="min-w-0 sm:hidden">
            <div className="eyebrow flex items-center gap-2 text-[hsl(var(--secondary))]"><span className="status-dot status-running mini-pulse" /> currently researching</div>
            <h2 className="mt-1 text-base font-extrabold leading-5">{prettyLabel(activeResearch.name)}</h2>
          </div>
        </div>
        <div className="min-w-0">
          <div className="hidden items-start justify-between gap-3 sm:flex">
            <div className="min-w-0">
              <div className="eyebrow flex items-center gap-2 text-[hsl(var(--secondary))]"><span className="status-dot status-running mini-pulse" /> currently researching</div>
              <h2 className="mt-1 truncate text-lg font-extrabold">{prettyLabel(activeResearch.name)}</h2>
            </div>
            <Tag><span className="status-dot status-running mini-pulse" /> active</Tag>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="surface-soft rounded-lg p-3">
              <div className="flex items-center justify-between gap-2"><div className="eyebrow">Progress</div><div className="mono text-sm font-bold text-[hsl(var(--secondary))]">{activeResearchPercent.toFixed(1)}%</div></div>
              <div className="mt-2"><Progress value={activeResearchPercent} tone="teal" /></div>
              <div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{fmt(activeResearchProgress)} / {fmt(activeResearchTotal)} units complete</div>
            </div>
            <div className="surface-soft rounded-lg p-3">
              <div className="eyebrow">Total cost</div>
              {activeResearch.scienceCosts.length ? <div className="mt-2 flex flex-wrap gap-1.5">{activeResearch.scienceCosts.map((cost) => {
                const costKey = keyForSource(cost.pack);
                return <span className="resource-chip !px-1.5 !py-1" key={cost.pack} title={researchRequirementLabel(activeResearch, cost)} aria-label={researchRequirementLabel(activeResearch, cost)}><ResourceIcon item={costKey} size={16} /><span className="mono text-[10px]">{fmt(researchCostAmountFor(activeResearch, cost))}</span></span>;
              })}</div> : <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">{activeResearch.researchTrigger ? 'Production trigger' : 'No science packs required'}</div>}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="surface-soft rounded-lg p-3"><div className="eyebrow">Research rate</div><div className="mono mt-1 text-lg text-[hsl(var(--secondary))]">{activeResearchIsLabDriven ? `${activeResearchRate.toFixed(1)} / min` : '—'}</div></div>
            <div className="surface-soft rounded-lg p-3"><div className="eyebrow">Estimated time</div><div className="mono mt-1 text-lg text-[hsl(var(--primary))]">{activeResearchEta === null ? '—' : duration(activeResearchEta)}</div></div>
          </div>
        </div>
      </div> : <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_25%_10%/.8)] text-[hsl(var(--muted-foreground))]"><FlaskConical size={26} /></div>
        <div className="min-w-0"><div className="eyebrow flex items-center gap-2 text-[hsl(var(--muted-foreground))]"><span className="status-dot status-starved" /> research queue</div><div className="mt-1 text-base font-extrabold">No active technology</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Select a technology or enable auto research to start a lab target.</div></div>
      </div>}
    </section>
    <section className="surface mb-5 rounded-xl p-3 sm:p-4">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search technologies, prerequisites, or effects" className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]" aria-label="Search technologies" data-testid="input-search-technologies" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Technology filters">{(['completed', 'unlocked', 'locked'] as ResearchFilter[]).map((option) => <button onClick={() => setFilter(option)} className={`button-base !px-2.5 !py-1.5 text-[9px] uppercase tracking-[.08em] ${filter === option ? 'button-primary' : 'button-ghost'}`} aria-pressed={filter === option} key={option} data-testid={`button-filter-${option}`}>{option === 'locked' ? 'Available' : option} <span className="mono opacity-75">{technologyCounts[option]}</span></button>)}</div>
        <label className="flex cursor-pointer items-center gap-2 text-[10px] text-[hsl(var(--foreground))]">
          <input type="checkbox" checked={allVisibleTechnologiesSelected} onChange={toggleAllVisibleTechnologies} disabled={!selectableVisibleTechnologyNames.length} className="h-4 w-4 accent-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Select all visible researches" data-testid="checkbox-select-all-research" />
          <span>Select all</span>
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[hsl(var(--muted-foreground))]"><span>Source names remain intact for save compatibility and dependency matching.</span><span className="mono">{(state.autoResearch ?? []).length} auto selected · {visibleTechnologies.length} visible</span></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-3">{visibleTechnologies.map((technology) => {
        const done = state.research.includes(technology.name);
        const prerequisitesMet = technologyPrerequisitesMet(state, technology);
        const triggerReady = researchTriggerMet(state, technology);
        const costsMet = technology.scienceCosts.every((cost) => quantityFor(state, keyForSource(cost.pack)) >= cost.amount);
        const ready = prerequisitesMet && (technology.researchTrigger ? triggerReady : costsMet);
        const progress = researchProgressFor(state, technology);
        const total = researchUnitsFor(technology);
        const trigger = researchTriggerProgress(state, technology);
        const autoPosition = technology.researchTrigger ? -1 : (state.autoResearch ?? []).indexOf(technology.name);
         const progressLabel = trigger ? `${fmt(trigger.produced)} / ${fmt(trigger.required)}` : `${fmt(progress)} / ${researchUnitsLabelFor(technology)} units`;
        const isResearching = activeResearch?.name === technology.name;
        return <div className={`surface rounded-xl p-3 sm:p-4 ${isResearching ? 'border-[hsl(var(--secondary)/.9)] bg-[linear-gradient(100deg,hsl(88_28%_18%/.95),hsl(174_30%_15%/.78))] shadow-[0_0_0_1px_hsl(var(--secondary)/.22)]' : selected === technology.name ? 'border-[hsl(var(--secondary)/.65)] bg-[hsl(174_30%_15%/.7)]' : 'hover:border-[hsl(var(--border))]'}`} key={technology.name}>
          <div className="flex items-start gap-3">
            <button onClick={() => selectResearch(technology.name)} className="flex min-w-0 flex-1 items-start gap-3 text-left" data-testid={`button-research-${technology.name}`}>
              <ResearchArt technology={technology} accent={accentFor(technology.name)} />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-extrabold">{prettyLabel(technology.name)}</span>{isResearching && !done ? <Tag><span className="status-dot status-running mini-pulse" /> researching</Tag> : done ? <Tag><Check size={10} /> complete</Tag> : ready ? <Tag tone="amber">ready</Tag> : !prerequisitesMet ? <Tag tone="muted"><LockKeyhole size={10} /> prerequisite</Tag> : technology.researchTrigger ? <Tag tone="muted"><Clock3 size={10} /> production trigger</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> pack low</Tag>}</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{technology.effects.length} effects · {technology.prerequisites.length} prerequisites{technology.upgrade ? ' · upgrade' : ''}</p>
                 <div className="mt-2 flex flex-wrap items-center gap-1.5">{technology.scienceCosts.length ? (() => { const amounts = technology.scienceCosts.map((cost) => researchRequirementLabel(technology, cost).split(' · ').pop() ?? ''); const sharedAmount = amounts.every((amount) => amount === amounts[0]) ? amounts[0] : amounts.join(' / '); return <span className="flex items-center gap-1.5 rounded border border-[hsl(var(--border))] bg-[hsl(216_24%_10%/.72)] px-1.5 py-1" title={`${technology.scienceCosts.map((cost) => researchRequirementLabel(technology, cost)).join(', ')}`} aria-label={`Science cost: ${technology.scienceCosts.map((cost) => researchRequirementLabel(technology, cost)).join(', ')}`}>{technology.scienceCosts.map((cost) => <ResourceIcon item={keyForSource(cost.pack)} size={18} key={cost.pack} />)}<span className="mono text-[10px] text-[hsl(var(--primary))]">×{sharedAmount}</span></span>; })() : !technology.researchTrigger ? <span className="text-[9px] text-[hsl(var(--muted-foreground))]">No science requirement</span> : null}{technology.researchTrigger && <span className="resource-chip !px-1.5 !py-1" title={`Unlock trigger: ${researchTriggerLabel(technology.researchTrigger)}`} aria-label={`Unlock trigger: ${researchTriggerLabel(technology.researchTrigger)}`}><Clock3 size={12} /> unlock trigger · {researchTriggerLabel(technology.researchTrigger)}</span>}</div>
                <div className="mt-3 flex items-center justify-between text-[9px]"><span className="eyebrow">progress</span><span className={`mono ${done ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--primary))]'}`}>{done ? 'complete' : progressLabel}</span></div><div className="mt-1"><Progress value={done ? 100 : trigger ? trigger.produced / trigger.required * 100 : progress / total * 100} tone={done ? 'teal' : 'amber'} /></div>
              </div>
              <ChevronRight size={15} className="mt-1 shrink-0 text-[hsl(var(--muted-foreground))]" />
            </button>
             <button type="button" onClick={(event) => { event.stopPropagation(); setDetailsTechnology(technology.name); }} className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(216_24%_10%/.72)] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.55)] hover:text-[hsl(var(--primary))]" title={`More info about ${prettyLabel(technology.name)}`} aria-label={`More info about ${prettyLabel(technology.name)}`} data-testid={`button-more-info-${technology.name}`}><Info size={14} /></button>
              {!technology.researchTrigger && <label className="flex shrink-0 cursor-pointer flex-col items-center gap-1 text-center text-[8px] uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]" title="Auto research when available">
              <input type="checkbox" checked={autoPosition >= 0} onChange={() => toggleAutoResearch(technology.name)} className="h-4 w-4 accent-[hsl(var(--primary))]" aria-label={`Auto research ${prettyLabel(technology.name)}`} data-testid={`checkbox-auto-research-${technology.name}`} />
              <span>{autoPosition >= 0 ? `auto #${autoPosition + 1}` : 'auto'}</span>
             </label>}
          </div>
        </div>;
      })}</section>
    </div>
    {detailItem && <TechnologyDetailModal item={detailItem} state={state} toggleAutoResearch={toggleAutoResearch} onClose={() => setDetailsTechnology(null)} />}
  </PageFrame>;
}

function TechnologyDetailModal({ item, state, toggleAutoResearch, onClose }: { item: TechnologyDefinition; state: GameState; toggleAutoResearch: (name: ResearchKey) => void; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const selectedDone = state.research.includes(item.name);
  const selectedTriggerProgress = researchTriggerProgress(state, item);
  const selectedProgress = researchProgressFor(state, item);
  const selectedTotal = researchUnitsFor(item);
  const selectedProgressPercent = selectedTriggerProgress ? selectedTriggerProgress.produced / selectedTriggerProgress.required * 100 : selectedProgress / selectedTotal * 100;
  const selectedAuto = (state.autoResearch ?? []).includes(item.name);
  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-[hsl(0_0%_0%/.78)] p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="surface mx-auto my-2 max-h-[calc(100dvh-1rem)] w-full max-w-[560px] overflow-y-auto rounded-2xl p-5 shadow-2xl sm:my-6 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="technology-detail-title" data-testid="dialog-technology-detail">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="eyebrow">Technology detail</div><h2 id="technology-detail-title" className="mt-2 text-xl font-extrabold">{prettyLabel(item.name)}</h2></div><div className="flex shrink-0 items-center gap-2"><Tag tone={item.upgrade ? 'amber' : 'teal'}>{item.upgrade ? 'upgrade' : 'technology'}</Tag><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(216_24%_10%/.72)] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.55)] hover:text-[hsl(var(--primary))]" aria-label="Close technology details" data-testid="button-close-technology-detail"><X size={15} /></button></div></div>
      <div className="mt-2 flex flex-wrap gap-1">{item.essential && <Tag>essential</Tag>}{item.maxLevel && <Tag tone="muted">{prettyLabel(item.maxLevel)} levels</Tag>}{item.researchTrigger && <Tag tone="muted">triggered</Tag>}</div>
       <div className="mt-5 border-y border-[hsl(var(--border))] py-4"><div className="flex items-center justify-between gap-3 text-[10px]"><span className="eyebrow">Research progress</span><span className={`mono ${selectedDone ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--primary))]'}`}>{selectedDone ? 'complete' : selectedTriggerProgress ? `${fmt(selectedProgress)} / ${fmt(selectedTriggerProgress.required)}` : `${fmt(selectedProgress)} / ${researchUnitsLabelFor(item)} units`}</span></div><div className="mt-2"><Progress value={selectedDone ? 100 : selectedProgressPercent} tone={selectedDone ? 'teal' : 'amber'} /></div><div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">{item.researchTrigger ? 'Production triggers complete this technology when its requirement is met.' : `Labs advance one unit every ${item.time ?? 5}s at ${labResearchSpeedFor(state)}x speed.`}</div></div>
      <div className="mt-5 border-y border-[hsl(var(--border))] py-4"><div className="eyebrow mb-3">Prerequisites</div>{item.prerequisites.length ? <div className="flex flex-wrap gap-1.5">{item.prerequisites.map((prerequisite) => <span className={`resource-chip ${state.research.includes(prerequisite) ? 'border-[hsl(var(--secondary)/.55)]' : ''}`} key={prerequisite}><span className={`status-dot ${state.research.includes(prerequisite) ? 'status-running' : 'status-starved'}`} />{prettyLabel(prerequisite)}</span>)}</div> : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No prerequisites · available at the start.</div>}</div>
       {item.researchTrigger ? <div className="border-b border-[hsl(var(--border))] py-4"><div className="eyebrow mb-2">Unlock trigger</div><div className="text-[11px]">{researchTriggerLabel(item.researchTrigger)}</div>{selectedTriggerProgress ? <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Starting inventory does not count toward this trigger.</div> : <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">This trigger type is not represented by a quantity counter in the current simulator.</div>}</div> : <div className="border-b border-[hsl(var(--border))] py-4"><div className="eyebrow mb-3">Science requirements</div><div className="space-y-2">{item.scienceCosts.length ? item.scienceCosts.map((cost) => { const costKey = keyForSource(cost.pack); const have = quantityFor(state, costKey); return <div className="flex items-center justify-between gap-3 text-[11px]" key={cost.pack}><span className="flex min-w-0 items-center gap-2"><ResourceIcon item={costKey} size={20} />{meta[costKey].label} <span className="text-[9px] text-[hsl(var(--muted-foreground))]">per unit</span></span><span className={`mono shrink-0 ${have >= cost.amount ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{fmt(have)} / {cost.amount}</span></div>; }) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No science packs required.</div>}</div><div className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">Total requirement: <span className="break-words mono">{item.scienceCosts.length ? item.scienceCosts.map((cost) => researchRequirementLabel(item, cost)).join(' · ') : 'none'}</span></div>{item.countFormula && <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Cost formula: <span className="mono text-[hsl(var(--foreground))]">{item.countFormula}</span> <span className="text-[9px]">(L = technology level)</span></div>}</div>}
      <div className="py-4"><div className="eyebrow mb-3">Effects</div><div className="space-y-2">{item.effects.length ? item.effects.map((effect, index) => <div className="data-row rounded-lg px-3 py-2 text-[10px]" key={`${effect.type}-${index}`}><span className="font-semibold">{effect.description ?? (effect.recipe ? `Unlock ${prettyLabel(effect.recipe)}` : prettyLabel(effect.type))}</span>{effect.target && <span className="text-[hsl(var(--muted-foreground))]"> · {prettyLabel(effect.target)}</span>}{effect.modifier !== undefined && <span className="mono float-right text-[hsl(var(--secondary))]">{typeof effect.modifier === 'number' && effect.modifier > 0 ? '+' : ''}{String(effect.modifier)}</span>}</div>) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No listed effects.</div>}</div></div>
      {!item.researchTrigger && <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.07)] p-3 text-[11px]"><span><span className="block font-bold">Auto research when available</span><span className="mt-1 block text-[9px] text-[hsl(var(--muted-foreground))]">{selectedAuto ? `Queue position ${((state.autoResearch ?? []).indexOf(item.name) + 1)} · runs in catalog order` : 'Add this technology to the ordered auto queue.'}</span></span><input type="checkbox" checked={selectedAuto} onChange={() => toggleAutoResearch(item.name)} className="h-5 w-5 accent-[hsl(var(--primary))]" aria-label={`Auto research ${prettyLabel(item.name)}`} data-testid={`checkbox-auto-research-detail-${item.name}`} /></label>}
    </section>
  </div>;
}

function WelcomeModal({ onBegin, replay = false }: { onBegin: () => void; replay?: boolean }) {
  return <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[hsl(0_0%_0%/.84)] p-4 backdrop-blur-sm" role="presentation">
    <section className="surface relative w-full max-w-[560px] overflow-hidden rounded-2xl border-[hsl(var(--primary)/.7)] bg-[linear-gradient(145deg,hsl(35_30%_18%),hsl(216_25%_12%))] p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="welcome-title" data-testid={replay ? 'dialog-milestone-crash-landed' : 'dialog-welcome'}>
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(135deg,#f5b52e_0_11px,#15181a_11px_22px)]" />
      <div className="-mx-5 -mt-5 border-b border-[hsl(var(--primary)/.35)] bg-[hsl(216_25%_10%)] sm:-mx-7 sm:-mt-7">
        <img src={`${import.meta.env.BASE_URL}welcome-crash-landed.jpg`} width={1122} height={1122} alt="A crashed spaceship burning in a mountain valley" className="mx-auto block h-auto w-full object-contain" />
      </div>
      <div className="pt-1">
        <h1 id="welcome-title" className="text-3xl font-extrabold tracking-[-.04em]">Emergency Briefing</h1>
      </div>
      <div className="mt-6 space-y-4 text-[12px] leading-6 text-[hsl(var(--muted-foreground))]">
        <p className="text-[15px] font-bold text-[hsl(var(--foreground))]">Welcome... to production hell.</p>
        <p>Your ship has crashed while travelling across the galaxy towards home. You are the only survivor. You have emergency supplies from your escape pod, so now you will need to build a factory to get home.</p>
      </div>
      <div className="mt-6 rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-3 text-[10px] leading-5 text-[hsl(var(--muted-foreground))]"><span className="font-bold text-[hsl(var(--primary))]">Mission brief:</span> Build your production network, unlock the science chain, and find a way off-world.</div>
      <button onClick={onBegin} className="button-base button-primary mt-6 w-full !py-3 text-[12px]" data-testid={replay ? 'button-dismiss-milestone-crash-landed' : 'button-begin-game'}><Rocket size={15} /> {replay ? 'Continue' : 'Begin production'}</button>
    </section>
  </div>;
}

function MilestoneModal({ milestone, onDismiss }: { milestone: MilestoneKey; onDismiss: () => void }) {
  const isFirstLab = milestone === 'first-lab';
  const isHundredSciencePacks = milestone === 'hundred-science-packs';
  const isThousandSciencePacks = milestone === 'thousand-science-packs';
  const isTenThousandSciencePacks = milestone === 'ten-thousand-science-packs';
  const isHundredThousandSciencePacks = milestone === 'hundred-thousand-science-packs';
  const isMillionSciencePacks = milestone === 'million-science-packs';
  const isTwentyOneLabs = milestone === 'twenty-one-labs';
  const isTurnLightsOn = milestone === 'turn-lights-on';
  const isAdvancedOilProduction = milestone === 'advanced-oil-production';
  const isNuclearPower = milestone === 'nuclear-power';
  const isTrains = milestone === 'trains';
  const isRocketSilo = milestone === 'rocket-silo';
  const isSpidertron = milestone === 'spidertron';
  const isSpaceScience = milestone === 'space-science';
  const isInfiniteScienceComplete = milestone === 'infinite-science-complete';
  const image = isFirstLab
    ? 'first-lab-milestone.jpg'
    : isHundredSciencePacks
      ? '100-science-packs-milestone.jpg'
      : isThousandSciencePacks
        ? '1000-science-packs-milestone.jpg'
      : isTenThousandSciencePacks
        ? '10000-science-packs-milestone.jpg'
      : isHundredThousandSciencePacks
        ? '100000-science-packs-milestone.jpg'
      : isMillionSciencePacks
        ? '1000000-science-packs-milestone.jpg'
    : isTwentyOneLabs
      ? 'twenty-one-labs-milestone.jpg'
      : isTurnLightsOn
        ? 'turn-lights-on-milestone.jpg'
        : isAdvancedOilProduction
          ? 'advanced-oil-production-milestone.jpg'
        : isNuclearPower
          ? 'nuclear-power-milestone.jpg'
        : isTrains
          ? 'trains-milestone.jpg'
        : isRocketSilo
          ? 'rocket-silo-milestone.jpg'
        : isSpidertron
          ? 'spidertron-milestone.jpg'
         : isSpaceScience
           ? 'space-science-milestone.jpg'
           : isInfiniteScienceComplete
             ? 'infinite-science-complete-milestone.jpg'
            : 'sixty-furnaces-milestone.jpg';
  const imageAlt = isFirstLab
    ? 'Factory Planet laboratory and production machines beside a river'
    : isHundredSciencePacks
      ? 'A growing Factory Planet science production network in a mountain valley'
      : isThousandSciencePacks
        ? 'A mature Factory Planet science production network beside a mountain river'
      : isTenThousandSciencePacks
        ? 'A vast Factory Planet industrial complex spanning a mountain river valley'
      : isHundredThousandSciencePacks
        ? 'A sprawling Factory Planet megafactory across a mountain river valley'
      : isMillionSciencePacks
        ? 'The biggest Factory Planet industrial network spanning a mountain valley'
    : isTwentyOneLabs
      ? 'Factory Planet with more than twenty laboratories connected by production lines'
      : isTurnLightsOn
        ? 'Factory Planet boiler and steam engine generating electricity in a forest'
        : isAdvancedOilProduction
          ? 'An advanced oil refinery complex beside a river and mountain valley'
        : isNuclearPower
          ? 'A nuclear-powered factory complex in a mountain valley'
        : isTrains
          ? 'A freight train carrying ore past Factory Planet and its industrial complex'
        : isRocketSilo
          ? 'A completed rocket silo surrounded by factory production lines'
        : isSpidertron
          ? 'A giant spidertron standing over a factory planet forest'
         : isSpaceScience
           ? 'A satellite orbiting above Factory Planet and its atmosphere'
           : isInfiniteScienceComplete
             ? 'A vast factory built around a glowing artificial intelligence brain'
          : 'Factory Planet with a large industrial furnace and production network';
  const imageDimensions = isRocketSilo
    ? { width: 1181, height: 1331 }
    : isSpidertron
      ? { width: 1402, height: 1122 }
       : isSpaceScience
         ? { width: 1369, height: 1149 }
       : isInfiniteScienceComplete
         ? { width: 1536, height: 1024 }
       : isTrains
         ? { width: 1536, height: 1024 }
      : isAdvancedOilProduction
        ? { width: 1536, height: 1024 }
       : isNuclearPower
         ? { width: 1536, height: 1024 }
      : isThousandSciencePacks
        ? { width: 1536, height: 1024 }
      : isTenThousandSciencePacks
        ? { width: 1536, height: 1024 }
      : isHundredThousandSciencePacks
        ? { width: 1536, height: 1024 }
      : isMillionSciencePacks
        ? { width: 1536, height: 1024 }
      : isHundredSciencePacks
        ? { width: 1536, height: 1024 }
      : { width: 1122, height: 1402 };
  const message = isFirstLab
    ? 'You have constructed your first lab, well done. This is the first major step towards regaining the technology to travel off world.'
    : isHundredSciencePacks
      ? "You've produced 100 science packs, what a great start."
      : isThousandSciencePacks
        ? "You've produced 1000 science packs, you are progressing well."
      : isTenThousandSciencePacks
        ? "You've produced 10000 science packs, now that's what I call a factory!"
      : isHundredThousandSciencePacks
        ? "You've produced 100000 science packs, this is incredible work."
      : isMillionSciencePacks
        ? "You've produced 1000000 science packs, this is the biggest factory ever."
    : isTwentyOneLabs
      ? 'Over twenty labs! Your science production will be done in no time.'
      : isTurnLightsOn
        ? 'With the power of electricity, everything can be automated.'
        : isAdvancedOilProduction
          ? 'You have now unleashed the full power of complex organic chemistry.'
         : isNuclearPower
           ? 'You have unlocked the secrets of the atom, paving the way for unlimited energy.'
        : isTrains
          ? 'Choo Choo motherfucker.'
        : isRocketSilo
          ? "It's finally time to go home."
        : isSpidertron
          ? 'What could you possibly need this for?'
         : isSpaceScience
           ? 'You may have left the planet, but the factory has grown a life of its own. Production continues on.'
          : isInfiniteScienceComplete
            ? 'What have you done..!??\nWe may never know... until it is too late.'
          : '60 furnaces! This is a burgeoning industrial empire.';
  return <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[hsl(0_0%_0%/.84)] p-4 backdrop-blur-sm" role="presentation">
    <section className="surface relative w-full max-w-[560px] overflow-hidden rounded-2xl border-[hsl(var(--secondary)/.7)] bg-[linear-gradient(145deg,hsl(88_24%_17%),hsl(216_25%_12%))] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="milestone-title" data-testid={`dialog-milestone-${milestone}`}>
      <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-[repeating-linear-gradient(135deg,#f5b52e_0_11px,#15181a_11px_22px)]" />
      <div className="border-b border-[hsl(var(--secondary)/.35)] bg-[hsl(216_25%_10%)]">
        <img src={`${import.meta.env.BASE_URL}${image}`} width={imageDimensions.width} height={imageDimensions.height} alt={imageAlt} className="mx-auto block h-auto w-full object-contain" />
      </div>
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <h2 id="milestone-title" className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Milestone Achieved</h2>
             <p className="mt-1 text-[12px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">{milestoneTitles[milestone]}</p>
          </div>
        </div>
        <p className="mt-6 whitespace-pre-line text-[13px] leading-6 text-[hsl(var(--muted-foreground))]">{message}</p>
        {isAdvancedOilProduction && <p className="mt-3 rounded-lg border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.06)] px-3 py-2 text-[10px] leading-5 text-[hsl(var(--muted-foreground))]"><span className="font-bold text-[hsl(var(--primary))]">Note:</span> Cracking plant balancing is fully automated.</p>}
        <button onClick={onDismiss} className="button-base button-primary mt-6 w-full !py-3 text-[12px]" data-testid="button-dismiss-milestone"><Check size={15} /> Continue</button>
      </div>
    </section>
  </div>;
}

function ResearchCompletionModal({ state, setState }: Pick<PageProps, 'state' | 'setState'>) {
  const technology = technologyMap[state.researchNotifications[0]];
  if (!technology) return null;
  const acknowledge = () => setState((current) => ({ ...current, researchNotifications: current.researchNotifications.slice(1) }));
  const scienceSummary = technology.scienceCosts.length
    ? technology.scienceCosts.map((cost) => researchRequirementLabel(technology, cost)).join(' · ')
    : 'None';
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[hsl(0_0%_0%/.78)] p-4 backdrop-blur-sm" role="presentation">
    <section className="surface w-full max-w-[520px] rounded-2xl border-[hsl(var(--secondary)/.7)] bg-[linear-gradient(145deg,hsl(88_24%_17%),hsl(216_25%_12%))] p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="research-complete-title" data-testid="dialog-research-complete">
      <div className="flex items-center justify-between gap-3"><Tag><Check size={11} /> research complete</Tag><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{state.researchNotifications.length > 1 ? `${state.researchNotifications.length} queued` : 'new unlock'}</span></div>
       <div className="mt-4 flex items-center gap-3"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[hsl(var(--secondary)/.5)] bg-[hsl(216_25%_10%)]"><img src={`${import.meta.env.BASE_URL}research-icons/${researchIconFileFor(technology)}.png`} width={80} height={80} alt={`${prettyLabel(technology.name)} technology icon`} className="h-full w-full object-contain p-1" /></div><div className="min-w-0"><h2 id="research-complete-title" className="text-xl font-extrabold">{prettyLabel(technology.name)}</h2><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">This technology is now online and its effects are available across the factory.</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-2"><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Research effort</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{technology.researchTrigger ? 'production trigger' : `${fmt(researchUnitsFor(technology))} lab units`}</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Science invested</div><div className="mono mt-1 truncate text-[12px] text-[hsl(var(--primary))]" title={scienceSummary}>{scienceSummary}</div></div></div>
       {technology.researchTrigger && <div className="surface-soft mt-2 rounded-lg border-[hsl(var(--primary)/.35)] p-3"><div className="eyebrow text-[hsl(var(--primary))]">Unlock trigger</div><div className="mt-1 text-[11px] font-semibold">{researchTriggerLabel(technology.researchTrigger)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">This trigger was met to unlock the technology.</div></div>}
      <div className="mt-5"><div className="eyebrow mb-2">Effects enabled</div><div className="space-y-2">{technology.effects.length ? technology.effects.map((effect, index) => <div className="data-row rounded-lg px-3 py-2 text-[10px]" key={`${effect.type}-${index}`}><span className="font-semibold">{effect.recipe ? `Unlock ${prettyLabel(effect.recipe)}` : prettyLabel(effect.type)}</span>{effect.target && <span className="text-[hsl(var(--muted-foreground))]"> · {prettyLabel(effect.target)}</span>}{effect.modifier !== undefined && <span className="mono float-right text-[hsl(var(--secondary))]">{typeof effect.modifier === 'number' && effect.modifier > 0 ? '+' : ''}{String(effect.modifier)}</span>}</div>) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No listed effects.</div>}</div></div>
      <button onClick={acknowledge} className="button-base button-primary mt-6 w-full" data-testid="button-acknowledge-research"><Check size={14} /> acknowledge</button>
    </section>
  </div>;
}

function RocketReadyModal({ onLaunch }: { onLaunch: () => void }) {
  return <div className="fixed inset-0 z-[75] grid place-items-center bg-[hsl(0_0%_0%/.8)] p-4 backdrop-blur-sm" role="presentation">
    <section className="surface w-full max-w-[520px] rounded-2xl border-[hsl(var(--primary)/.7)] bg-[linear-gradient(145deg,hsl(35_30%_18%),hsl(216_25%_12%))] p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="rocket-ready-title" data-testid="dialog-rocket-ready">
      <div className="flex items-center justify-between gap-3"><Tag tone="amber"><Rocket size={11} /> launch sequence</Tag><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">100 / 100 parts</span></div>
      <div className="mt-5 flex items-center gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-[hsl(var(--primary)/.5)] bg-[hsl(216_25%_10%)]"><Rocket size={42} className="text-[hsl(var(--primary))]" /></div><div><h2 id="rocket-ready-title" className="text-2xl font-extrabold">Rocket Ready</h2><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">The silo is fueled, the rocket is assembled, and Factory Planet is ready for its first launch.</p></div></div>
      <div className="surface-soft mt-5 rounded-xl border-[hsl(var(--primary)/.3)] p-3 text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">Launching will complete the factory objective and unlock the existing Space Science Pack technology.</div>
      <button onClick={onLaunch} className="button-base button-primary mt-5 w-full !py-3 text-[12px]" data-testid="button-launch-rocket"><Rocket size={15} /> Launch</button>
    </section>
  </div>;
}

function GameCompleteModal({ gameStartTimestamp, winMetrics, onClose }: { gameStartTimestamp: number; winMetrics: WinMetrics | null; onClose: () => void }) {
  const stats = [
    ['Time taken:', formatWinDuration(gameStartTimestamp, winMetrics?.timestamp ?? null)],
    ['Total items produced:', winMetrics ? fmt(winMetrics.totalItemsProduced) : '—'],
    ['Total science packs produced:', winMetrics ? fmt(winMetrics.totalSciencePacksProduced) : '—'],
    ['Total iron and copper mined:', winMetrics ? `${fmt(winMetrics.totalIronMined)} iron · ${fmt(winMetrics.totalCopperMined)} copper` : '—'],
  ];
  return <div className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-[hsl(0_0%_0%/.84)] p-4 backdrop-blur-sm" role="presentation">
    <section className="surface relative my-2 w-full max-w-[560px] overflow-hidden rounded-2xl border-[hsl(var(--primary)/.7)] bg-[linear-gradient(145deg,hsl(35_30%_18%),hsl(216_25%_12%))] shadow-2xl sm:my-6" role="dialog" aria-modal="true" aria-labelledby="game-complete-title" data-testid="dialog-game-complete">
      <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-[repeating-linear-gradient(135deg,#f5b52e_0_11px,#15181a_11px_22px)]" />
      <div className="border-b border-[hsl(var(--primary)/.35)] bg-[hsl(216_25%_10%)]">
        <img src={`${import.meta.env.BASE_URL}win-screen-rocket-launch.jpg`} width={1122} height={1402} alt="Rocket launching over Factory Planet" className="mx-auto block h-auto w-full object-contain" />
      </div>
      <div className="p-5 sm:p-7">
        <h2 id="game-complete-title" className="mt-1 text-3xl font-extrabold tracking-[-.04em]">Game Complete!</h2>
        <p className="mt-6 text-[13px] leading-6 text-[hsl(var(--muted-foreground))]">Your rocket has launched and you are finally on your way home. Well done.</p>
        <div className="surface-soft mt-5 rounded-xl border border-[hsl(var(--primary)/.2)] px-3 py-2" data-testid="panel-lifetime-production">
          {stats.map(([label, value], index) => <div className={`flex items-center justify-between gap-4 py-1.5 ${index > 0 ? 'border-t border-[hsl(var(--border))]' : ''}`} key={label}>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{label}</span>
            <span className="mono shrink-0 text-[12px] text-[hsl(var(--foreground))]">{value}</span>
          </div>)}
        </div>
        <button onClick={onClose} className="button-base button-primary mt-5 w-full !py-3 text-[12px]" data-testid="button-close-game-complete"><Check size={15} /> OK</button>
      </div>
    </section>
  </div>;
}

type LaunchRankingStats = {
  sessionId: string;
  timeTakenSeconds: number;
  timeTakenLabel: string;
  totalItemsProduced: number;
  totalSciencePacksProduced: number;
  totalIronMined: number;
  totalCopperMined: number;
  totalIronCopperMined: number;
};

const launchRankingStatsFor = (state: GameState): LaunchRankingStats | null => {
  if (!state.rocketLaunched || !state.winMetrics) return null;
  return {
    sessionId: state.sessionId,
    timeTakenSeconds: Math.max(0, Math.floor((state.winMetrics.timestamp - state.gameStartTimestamp) / 1000)),
    timeTakenLabel: formatWinDuration(state.gameStartTimestamp, state.winMetrics.timestamp),
    totalItemsProduced: state.winMetrics.totalItemsProduced,
    totalSciencePacksProduced: state.winMetrics.totalSciencePacksProduced,
    totalIronMined: state.winMetrics.totalIronMined,
    totalCopperMined: state.winMetrics.totalCopperMined,
    totalIronCopperMined: state.winMetrics.totalIronMined + state.winMetrics.totalCopperMined,
  };
};

type LaunchRankingComparisons = {
  timeFasterThan: number;
  itemsMoreThan: number;
  sciencePacksMoreThan: number;
  ironCopperMoreThan: number;
};

const launchRankingComparisonsFor = (submission: LaunchRankingSubmission): LaunchRankingComparisons => {
  const records = submission.records?.length ? submission.records : [submission];
  const percentageFor = (matches: number) => records.length === 0 ? 0 : Math.round((matches / records.length) * 100);
  return {
    timeFasterThan: percentageFor(records.filter((record) => record.timeTakenSeconds > submission.timeTakenSeconds).length),
    itemsMoreThan: percentageFor(records.filter((record) => record.totalItemsProduced < submission.totalItemsProduced).length),
    sciencePacksMoreThan: percentageFor(records.filter((record) => record.totalSciencePacksProduced < submission.totalSciencePacksProduced).length),
    ironCopperMoreThan: percentageFor(records.filter((record) => record.totalIronCopperMined < submission.totalIronCopperMined).length),
  };
};

function LaunchRankingResultsModal({ submission, onClose }: {
  submission: LaunchRankingSubmission;
  onClose: () => void;
}) {
  const comparisons = launchRankingComparisonsFor(submission);
  const results = [
    ['Launch time', `You were faster than ${comparisons.timeFasterThan}% of submitted launches.`],
    ['Total items', `You produced more total items than ${comparisons.itemsMoreThan}% of submitted launches.`],
    ['Science packs', `You produced more science packs than ${comparisons.sciencePacksMoreThan}% of submitted launches.`],
    ['Iron and copper', `You mined more iron and copper than ${comparisons.ironCopperMoreThan}% of submitted launches.`],
  ];
  return <div className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-[hsl(0_0%_0%/.88)] p-4 backdrop-blur-sm" role="presentation">
    <section className="surface w-full max-w-[560px] rounded-2xl border-[hsl(var(--secondary)/.7)] bg-[linear-gradient(145deg,hsl(174_24%_15%),hsl(216_25%_12%))] p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="launch-ranking-results-title" data-testid="dialog-launch-ranking-results">
      <div className="flex items-center justify-between gap-3"><Tag tone="teal"><TrendingUp size={11} /> comparison results</Tag><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">submitted launches</span></div>
      <h2 id="launch-ranking-results-title" className="mt-5 text-2xl font-extrabold">Your Factory Results</h2>
      <p className="mt-3 text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">Your result was compared with all {submission.totalSubmissions} submitted launches. Equal values are not counted as faster or greater.</p>
      <div className="mt-5 rounded-xl border border-[hsl(var(--secondary)/.35)] bg-[hsl(var(--secondary)/.06)] p-4 text-center" data-testid="panel-launch-ranking-results-rank">
        <div className="eyebrow text-[hsl(var(--secondary))]">Overall ranking</div>
        <div className="mono mt-1 text-3xl font-bold text-[hsl(var(--secondary))]">#{submission.rank}</div>
        <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">of {submission.totalSubmissions} submitted launches</div>
      </div>
      <div className="mt-5 space-y-2" data-testid="panel-launch-ranking-comparisons">
        {results.map(([label, message]) => <div className="data-row rounded-xl p-3" key={label}>
          <div className="eyebrow text-[hsl(var(--secondary))]">{label}</div>
          <div className="mt-1 text-[12px] font-semibold leading-5">{message}</div>
        </div>)}
      </div>
      <button onClick={onClose} className="button-base button-primary mt-6 w-full !py-3 text-[12px]" data-testid="button-close-launch-ranking-results"><Check size={15} /> close results</button>
    </section>
  </div>;
}

function LaunchRankingModal({ stats, submission, isSubmitting, error, onSubmit, onViewResults, onClose }: {
  stats: LaunchRankingStats;
  submission: LaunchRankingSubmission | null;
  isSubmitting: boolean;
  error: string;
  onSubmit: () => void;
  onViewResults: () => void;
  onClose: () => void;
}) {
  const submitted = submission !== null;
  const displayedStats = submission ?? stats;
  const rows = [
    ['Session ID:', displayedStats.sessionId],
    ['Time taken:', submitted ? duration(submission.timeTakenSeconds) : stats.timeTakenLabel],
    ['Total items produced:', fmt(displayedStats.totalItemsProduced)],
    ['Total science packs produced:', fmt(displayedStats.totalSciencePacksProduced)],
    ['Total iron and copper mined:', `${fmt(displayedStats.totalIronCopperMined)} total (${fmt(stats.totalIronMined)} iron · ${fmt(stats.totalCopperMined)} copper)`],
  ];
  return <div className="fixed inset-0 z-[85] grid place-items-center overflow-y-auto bg-[hsl(0_0%_0%/.84)] p-4 backdrop-blur-sm" role="presentation">
    <section className="surface w-full max-w-[560px] rounded-2xl border-[hsl(var(--primary)/.7)] bg-[linear-gradient(145deg,hsl(35_30%_18%),hsl(216_25%_12%))] p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="launch-ranking-title" data-testid="dialog-launch-ranking">
      <div className="flex items-center justify-between gap-3"><Tag tone="amber"><Rocket size={11} /> launch ranking</Tag><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{submitted ? 'submitted' : 'optional'}</span></div>
      <h2 id="launch-ranking-title" className="mt-5 text-2xl font-extrabold">{submitted ? 'Launch Ranking Confirmed' : 'Check My Launch Ranking'}</h2>
      {!submitted
        ? <p className="mt-3 text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">Submitting is optional. If you confirm, the launch statistics below and your session ID will be saved to the shared ranking. You will receive a rank compared with other submitted launches.</p>
        : <p className="mt-3 text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">{submission.alreadySubmitted ? 'This session already has a submitted result. No second row was created.' : 'Your launch result was saved to the shared ranking.'}</p>}
      <div className="surface-soft mt-5 rounded-xl border border-[hsl(var(--primary)/.2)] px-3 py-2" data-testid="panel-launch-ranking-stats">
        {rows.map(([label, value], index) => <div className={`flex items-center justify-between gap-4 py-2 ${index > 0 ? 'border-t border-[hsl(var(--border))]' : ''}`} key={label}>
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{label}</span>
          <span className="mono max-w-[65%] text-right text-[11px] text-[hsl(var(--foreground))]">{value}</span>
        </div>)}
      </div>
      {submitted && <div className="mt-5 rounded-xl border border-[hsl(var(--secondary)/.4)] bg-[hsl(var(--secondary)/.08)] p-4 text-center" data-testid="panel-launch-ranking-result"><div className="eyebrow text-[hsl(var(--secondary))]">Your ranking</div><div className="mono mt-1 text-3xl font-bold text-[hsl(var(--secondary))]">#{submission.rank}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">of {submission.totalSubmissions} submitted launches</div><button onClick={onViewResults} className="button-base button-ghost mt-4 w-full !py-2 text-[10px]" data-testid="button-view-launch-ranking-results"><TrendingUp size={13} /> view comparison results</button></div>}
      {error && <div className="mt-4 rounded-lg border border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-[10px] text-[hsl(var(--destructive))]" role="alert" data-testid="alert-launch-ranking">{error}</div>}
      <div className="mt-6 flex gap-2">
        {!submitted && <button onClick={onSubmit} disabled={isSubmitting} className="button-base button-primary flex-1 !py-3 text-[12px]" data-testid="button-submit-launch-ranking"><Rocket size={15} /> {isSubmitting ? 'submitting…' : 'submit results'}</button>}
        <button onClick={onClose} disabled={isSubmitting} className={`button-base button-ghost !py-3 text-[12px] ${submitted ? 'w-full' : 'flex-1'}`} data-testid="button-close-launch-ranking">{submitted ? 'close' : 'cancel'}</button>
      </div>
    </section>
  </div>;
}

function LegacySettingsPage({ state, setState, saveNow, reset, notice }: PageProps) {
  const [confirm, setConfirm] = useState(false);
  return <PageFrame><Header eyebrow="Control room preferences" title="Settings" copy="Local controls for this browser instance. Nothing here changes the scope of the simulation." action={<Tag><Save size={11} /> local save</Tag>} /><div className="grid gap-5 lg:grid-cols-2"><section className="surface rounded-xl p-5"><SectionTitle>Local save controls</SectionTitle><div className="rounded-xl bg-[hsl(216_24%_10%/.7)] p-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]"><Save size={16} /></div><div><div className="text-[12px] font-bold">Browser save is active</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Production ticks and settings survive a reload.</div></div></div><div className="mt-4 flex gap-2"><button onClick={() => { saveNow(); notice('save committed now'); }} className="button-base button-primary" data-testid="button-save-now"><Save size={13} /> save now</button><button onClick={() => setConfirm(true)} className="button-base button-ghost text-[hsl(var(--destructive))]" data-testid="button-reset-save"><Trash2 size={13} /> reset progress</button></div></div>{confirm && <div className="mt-3 rounded-xl border border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--destructive)/.08)] p-4" data-testid="panel-reset-confirm"><div className="flex gap-2"><ShieldAlert size={16} className="text-[hsl(var(--destructive))]" /><div><div className="text-[12px] font-bold">Reset this factory?</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">This removes the local save and starts a new sector. This cannot be undone.</p></div></div><div className="mt-3 flex gap-2"><button onClick={() => { reset(); setConfirm(false); notice('new sector initialized'); }} className="button-base bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]" data-testid="button-confirm-reset">confirm reset</button><button onClick={() => setConfirm(false)} className="button-base button-ghost" data-testid="button-cancel-reset">cancel</button></div></div>}</section><section className="surface rounded-xl p-5"><SectionTitle>Simulation speed</SectionTitle><div className="grid grid-cols-3 gap-2">{[.5, 1, 2].map((speed) => <button onClick={() => setState((s) => ({ ...s, simulationSpeed: speed }))} className={`button-base py-3 ${state.simulationSpeed === speed ? 'button-primary' : 'button-ghost'}`} key={speed} data-testid={`button-speed-${speed}`}>{speed}x</button>)}</div><div className="mt-5 border-t border-[hsl(var(--border))] pt-4"><SectionTitle>Control legend</SectionTitle><div className="space-y-3 text-[11px] text-[hsl(var(--muted-foreground))]"><div className="flex items-center gap-2"><span className="status-dot status-running" /><span><strong className="text-[hsl(var(--foreground))]">Green</strong> means a unit is consuming and producing.</span></div><div className="flex items-center gap-2"><span className="status-dot status-starved" /><span><strong className="text-[hsl(var(--foreground))]">Yellow</strong> means an input is below recipe demand.</span></div><div className="flex items-center gap-2"><span className="status-dot status-blocked" /><span><strong className="text-[hsl(var(--foreground))]">Red</strong> means output or a control path is blocked.</span></div></div></div></section></div><section className="surface mt-5 rounded-xl p-5"><div className="flex items-start gap-3"><CircleHelp size={17} className="text-[hsl(var(--primary))]" /><div><div className="eyebrow">About this slice</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Factory Production Game is a local, playable incremental factory. The resource art, production loop, and control-room language are original to this interface.</p></div></div></section></PageFrame>;
}

function SettingsPage({ state, setState, saveNow, reset, notice, replayMilestone }: PageProps) {
  const [confirm, setConfirm] = useState(false);
  const [rankingModalOpen, setRankingModalOpen] = useState(false);
  const [rankingResultsOpen, setRankingResultsOpen] = useState(false);
  const [rankingSubmission, setRankingSubmission] = useState<LaunchRankingSubmission | null>(null);
  const [rankingError, setRankingError] = useState('');
  const submitLaunchRanking = useSubmitLaunchRanking();
  const unlockedMilestones = milestoneOrder.filter((milestone) => state.unlockedMilestones.includes(milestone));
  const launchRankingStats = launchRankingStatsFor(state);
  const submitRanking = () => {
    if (!launchRankingStats) return;
    setRankingError('');
    submitLaunchRanking.mutate({
      data: {
        sessionId: launchRankingStats.sessionId,
        timeTakenSeconds: launchRankingStats.timeTakenSeconds,
        totalItemsProduced: launchRankingStats.totalItemsProduced,
        totalSciencePacksProduced: launchRankingStats.totalSciencePacksProduced,
        totalIronCopperMined: launchRankingStats.totalIronCopperMined,
      },
    }, {
      onSuccess: (result) => { setRankingSubmission(result); setRankingResultsOpen(true); },
      onError: () => setRankingError('The launch result could not be submitted. Please try again.'),
    });
  };
  return <PageFrame>
    <Header eyebrow="Control room preferences" title="Settings" copy="Local controls for this browser instance. Nothing here changes the scope of the simulation." action={<Tag><Save size={11} /> local save</Tag>} />
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="surface rounded-xl p-5">
        <SectionTitle>Local save controls</SectionTitle>
        <div className="rounded-xl bg-[hsl(216_24%_10%/.7)] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]"><Save size={16} /></div>
            <div><div className="text-[12px] font-bold">Browser save is active</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Production ticks and settings survive a reload.</div></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => { saveNow(); notice('save committed now'); }} className="button-base button-primary" data-testid="button-save-now"><Save size={13} /> save now</button>
            <button onClick={() => setConfirm(true)} className="button-base button-ghost text-[hsl(var(--destructive))]" data-testid="button-reset-save"><Trash2 size={13} /> reset progress</button>
          </div>
        </div>
        {confirm && <div className="mt-3 rounded-xl border border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--destructive)/.08)] p-4" data-testid="panel-reset-confirm">
          <div className="flex gap-2"><ShieldAlert size={16} className="text-[hsl(var(--destructive))]" /><div><div className="text-[12px] font-bold">Reset this factory?</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">This removes the local save and starts a new sector. This cannot be undone.</p></div></div>
          <div className="mt-3 flex gap-2"><button onClick={() => { reset(); setConfirm(false); notice('new sector initialized'); }} className="button-base bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]" data-testid="button-confirm-reset">confirm reset</button><button onClick={() => setConfirm(false)} className="button-base button-ghost" data-testid="button-cancel-reset">cancel</button></div>
        </div>}
        {launchRankingStats && <div className="mt-5 border-t border-[hsl(var(--border))] pt-4" data-testid="section-launch-ranking">
          <SectionTitle>Launch ranking</SectionTitle>
          <p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Your rocket has launched. Check the shared ranking only if you choose to submit this result.</p>
          <button onClick={() => { setRankingError(''); setRankingSubmission(null); setRankingModalOpen(true); }} className="button-base button-primary mt-3 w-full !py-3 text-[11px]" data-testid="button-check-launch-ranking"><Rocket size={14} /> Check My Launch Ranking</button>
        </div>}
        <div className="mt-5 border-t border-[hsl(var(--border))] pt-4">
          <SectionTitle>Tutorial display</SectionTitle>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.06)] p-3 text-[11px]" data-testid="control-tutorial-visibility">
            <span><span className="block font-bold">Show Getting Started tutorial</span><span className="mt-1 block text-[9px] text-[hsl(var(--muted-foreground))]">Display the tutorial checklist at the top of the Home screen.</span></span>
            <input type="checkbox" checked={state.tutorialVisible} onChange={() => setState((s) => ({ ...s, tutorialVisible: !s.tutorialVisible }))} className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" aria-label="Show Getting Started tutorial" data-testid="checkbox-tutorial-visibility" />
          </label>
        </div>
      </section>
      <section className="surface rounded-xl p-5">
        <SectionTitle>Simulation speed</SectionTitle>
        <div className="grid grid-cols-3 gap-2">{[.5, 1, 2].map((speed) => <button onClick={() => setState((s) => ({ ...s, simulationSpeed: speed }))} className={`button-base py-3 ${state.simulationSpeed === speed ? 'button-primary' : 'button-ghost'}`} key={speed} data-testid={`button-speed-${speed}`}>{speed}x</button>)}</div>
        <div className="mt-5 border-t border-[hsl(var(--border))] pt-4"><SectionTitle>Control legend</SectionTitle><div className="space-y-3 text-[11px] text-[hsl(var(--muted-foreground))]"><div className="flex items-center gap-2"><span className="status-dot status-running" /><span><strong className="text-[hsl(var(--foreground))]">Green</strong> means a unit is consuming and producing.</span></div><div className="flex items-center gap-2"><span className="status-dot status-starved" /><span><strong className="text-[hsl(var(--foreground))]">Yellow</strong> means an input is below recipe demand.</span></div><div className="flex items-center gap-2"><span className="status-dot status-blocked" /><span><strong className="text-[hsl(var(--foreground))]">Red</strong> means output or a control path is blocked.</span></div></div></div>
      </section>
    </div>
    <section className="surface mt-5 rounded-xl p-5" data-testid="section-unlocked-milestones">
      <div className="flex items-start gap-3"><Sparkles size={17} className="text-[hsl(var(--primary))]" /><div><div className="eyebrow">Progress archive</div><SectionTitle>Unlocked Milestones</SectionTitle><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Replay milestones you have already achieved.</p></div></div>
      {unlockedMilestones.length > 0 ? <div className="mt-4 space-y-2">{unlockedMilestones.map((milestone) => <button type="button" onClick={() => replayMilestone(milestone)} className="data-row flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:border-[hsl(var(--primary)/.5)]" key={milestone} data-testid={`button-replay-milestone-${milestone}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[hsl(var(--secondary)/.4)] bg-[hsl(var(--secondary)/.1)] text-[hsl(var(--secondary))]"><Check size={14} /></span>
        <span className="min-w-0 flex-1 text-[12px] font-bold text-[hsl(var(--foreground))]">{milestoneTitles[milestone]}</span>
        <ChevronRight size={16} className="shrink-0 text-[hsl(var(--muted-foreground))]" />
      </button>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-[hsl(var(--border))] p-3 text-[10px] text-[hsl(var(--muted-foreground))]">No milestones unlocked yet.</div>}
    </section>
    {rankingModalOpen && launchRankingStats && <LaunchRankingModal stats={launchRankingStats} submission={rankingSubmission} isSubmitting={submitLaunchRanking.isPending} error={rankingError} onSubmit={submitRanking} onViewResults={() => setRankingResultsOpen(true)} onClose={() => { if (!submitLaunchRanking.isPending) setRankingModalOpen(false); }} />}
    {rankingResultsOpen && rankingSubmission && <LaunchRankingResultsModal submission={rankingSubmission} onClose={() => setRankingResultsOpen(false)} />}
  </PageFrame>;
}

type PageProps = { state: GameState; setState: Dispatch<SetStateAction<GameState>>; enqueue: (action: QueueItem['action'], target: string, seconds: number, targetId?: string, costs?: BuildMaterialCost[], quantity?: ConstructionBatchSize) => void; cancelConstruction: (id: string) => void; constructionVisualTiming: (total: number) => Pick<QueueItem, 'progressStartedAt' | 'progressDurationMs'>; constructionBatchSize: ConstructionBatchSize; setConstructionBatchSize: (value: ConstructionBatchSize) => void; saveNow: () => void; reset: () => void; notice: (message: string) => void; replayMilestone: (milestone: MilestoneKey) => void; away: number; recovered: number; offlineReportVisible: boolean; dismissOfflineReport: () => void };

function PageFrame({ children }: { children: ReactNode }) { return <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-7 sm:px-6 md:px-8 md:pb-10">{children}</div>; }

function Game() {
  const initial = useMemo(loadState, []);
  const [state, setState] = useState<GameState>(initial.state);
  const nextSimulationAtRef = useRef(Date.now() + 1000);
  const [away] = useState(initial.away);
  const [recovered] = useState(initial.recovered);
  const [offlineReportVisible, setOfflineReportVisible] = useState(initial.away >= 60 && initial.recovered > 0);
  const [toast, setToast] = useState('');
  const [endgameModal, setEndgameModal] = useState<'rocket-ready' | 'game-complete' | null>(null);
  const [replayMilestone, setReplayMilestone] = useState<MilestoneKey | null>(null);
  const [location, navigate] = useLocation();
  const notice = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 1800); };
  useEffect(() => {
    const timer = window.setInterval(() => {
      const tickTimestamp = Date.now();
      nextSimulationAtRef.current = tickTimestamp + 1000;
      setState((s) => simulate(s, 1, tickTimestamp));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (state.gameComplete) setEndgameModal(null);
    else if (state.rocketLaunched) setEndgameModal('game-complete');
    else if (state.rocketPartsBuilt >= ROCKET_PART_TARGET && !state.rocketReadyAcknowledged) setEndgameModal('rocket-ready');
  }, [state.gameComplete, state.rocketLaunched, state.rocketPartsBuilt, state.rocketReadyAcknowledged]);
  const saveNow = () => localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, lastSeen: Date.now() }));
  const reset = () => {
    const timestamp = Math.max(Date.now(), state.gameStartTimestamp + 1);
    localStorage.removeItem(SAVE_KEY);
    setEndgameModal(null);
    setReplayMilestone(null);
    setOfflineReportVisible(false);
    navigate('/');
    setState({ ...initialState, lastSeen: timestamp, gameStartTimestamp: timestamp, sessionId: sessionIdForStartTimestamp(timestamp), storage: { ...initialState.storage }, storageBoxes: { ...initialState.storageBoxes }, storageTanks: { ...initialState.storageTanks }, raw: { ...initialState.raw }, products: { ...initialState.products }, rateHistory: [] });
  };
  const constructionVisualTiming = (total: number) => {
    const progressStartedAt = Date.now();
    return {
      progressStartedAt,
      progressDurationMs: constructionVisualDurationMsFor(total, Math.max(0, nextSimulationAtRef.current - progressStartedAt)),
    };
  };
  const enqueue = (action: QueueItem['action'], target: string, seconds: number, targetId?: string, costs?: BuildMaterialCost[], requestedQuantity: ConstructionBatchSize = 1) => setState((s) => {
    if (action === 'rocketSilo' && !canBuildRocketSilo(s.rocketSiloBuilt, s.queue.some((item) => item.action === 'rocketSilo'))) return s;
    if (action === 'rocketParts' && (!s.rocketSiloBuilt || s.rocketPartsBuilt >= ROCKET_PART_TARGET || s.queue.some((item) => item.action === 'rocketParts'))) return s;
    const quantity = normalizeConstructionBatchSize(requestedQuantity);
    const totalSeconds = constructionDurationFor(seconds, quantity, s.workerRobotSpeedLevel);
    const requestCosts = costs?.map((cost) => ({ ...cost, amount: cost.amount * quantity }));
    const affordable = !requestCosts?.length || constructionCanBeFullyFunded({ raw: s.raw, products: s.products }, requestCosts);
    if (!affordable && hasWaitingConstruction(s.queue, action, targetId)) return s;
    const raw = { ...s.raw };
    const products = { ...s.products };
    const reserved = requestCosts?.length ? reserveConstructionMaterials({ raw, products }, requestCosts) : undefined;
    const started = !requestCosts?.length || reserved?.every((amount, index) => amount >= requestCosts[index].amount - 0.000001);
    const visualTiming = started ? constructionVisualTiming(totalSeconds) : {};
    const item: QueueItem = {
      id: `${action}-${targetId ?? target}-${Date.now()}-${s.queue.length}`,
      action,
      target,
      targetId,
      seconds: started ? totalSeconds : 0,
      total: totalSeconds,
      quantity,
      costs: requestCosts,
      reserved,
      started,
      ...visualTiming,
    };
    return { ...s, raw, products, queue: [...s.queue, item] };
  });
  const launchRocket = () => {
    setState((s) => ({ ...s, rocketReadyAcknowledged: true, rocketLaunched: true, completionTotalOutput: s.totalOutput, completionStats: { ...s.produced }, unlockedMilestones: s.unlockedMilestones.includes('game-complete') ? s.unlockedMilestones : [...s.unlockedMilestones, 'game-complete'] }));
    setEndgameModal('game-complete');
  };
  const finishGame = () => {
    setState((s) => ({
      ...s,
      gameComplete: true,
      research: unlockSpaceScienceAfterLaunch(s.research),
      assemblers: {
        ...s.assemblers,
        'space-science-pack': spaceScienceRecipeMachineCountAfterUnlock(s.assemblers['space-science-pack'] ?? 0),
      },
      researchNotifications: queueSpaceScienceNotification(s.researchNotifications),
    }));
    setEndgameModal(null);
  };
  const cancelConstruction = (id: string) => setState((s) => {
    const item = s.queue.find((queueItem) => queueItem.id === id);
    if (!item) return s;
    const inventory = refundConstructionMaterials({ raw: s.raw, products: s.products }, item);
    return { ...s, raw: inventory.raw, products: inventory.products, queue: s.queue.filter((queueItem) => queueItem.id !== id) };
  });
  const constructionRoboticsUnlocked = state.research.includes('construction-robotics');
  const constructionBatchSize = constructionRoboticsUnlocked ? state.constructionBatchSize : 1;
  const props = { state, setState, enqueue, cancelConstruction, constructionVisualTiming, constructionBatchSize, setConstructionBatchSize: (value: ConstructionBatchSize) => setState((s) => ({ ...s, constructionBatchSize: s.research.includes('construction-robotics') ? value : 1 })), saveNow, reset, notice, replayMilestone: setReplayMilestone, away, recovered, offlineReportVisible, dismissOfflineReport: () => setOfflineReportVisible(false) };
  const pageKey = nav.find(([key, path]) => path === routePathFor(location))?.[0] ?? 'factory';
  let page: ReactNode;
  if (pageKey === 'mining') page = <MiningPage {...props} />;
  else if (pageKey === 'production') page = <ProductionPage {...props} />;
  else if (pageKey === 'power') page = <PowerPage {...props} />;
  else if (pageKey === 'storage') page = <StoragePage {...props} />;
  else if (pageKey === 'logistics') page = <LogisticsPage {...props} />;
  else if (pageKey === 'upgrades') page = <UpgradesPage {...props} />;
  else if (pageKey === 'science') page = <SciencePage {...props} />;
  else if (pageKey === 'research') page = <ResearchPage {...props} />;
  else if (pageKey === 'settings') page = <SettingsPage {...props} />;
  else page = <FactoryPage {...props} />;
  const replayingWelcome = replayMilestone === 'crash-landed';
  const replayingGameComplete = replayMilestone === 'game-complete';
  const popupMilestone = replayingGameComplete ? null : replayMilestone && replayMilestone !== 'crash-landed' ? replayMilestone : state.milestoneNotifications[0] ?? null;
  return <Shell state={state}>{page}{toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[hsl(var(--primary)/.4)] bg-[hsl(216_25%_13%/.97)] px-4 py-2 mono text-[10px] text-[hsl(var(--primary))] shadow-xl md:bottom-6" role="status" data-testid="status-toast">{toast}</div>}{(!state.welcomeSeen || replayingWelcome) && <WelcomeModal replay={state.welcomeSeen} onBegin={() => { if (replayingWelcome) setReplayMilestone(null); else setState((current) => ({ ...current, welcomeSeen: true, unlockedMilestones: current.unlockedMilestones.includes('crash-landed') ? current.unlockedMilestones : [...current.unlockedMilestones, 'crash-landed'] })); }} />}{popupMilestone && <MilestoneModal milestone={popupMilestone} onDismiss={() => { if (replayMilestone && replayMilestone !== 'crash-landed') setReplayMilestone(null); else setState((current) => ({ ...current, milestoneNotifications: current.milestoneNotifications.slice(1) })); }} />}{state.researchNotifications.length > 0 && <ResearchCompletionModal state={state} setState={setState} />}{endgameModal === 'rocket-ready' && <RocketReadyModal onLaunch={launchRocket} />}{(endgameModal === 'game-complete' || replayingGameComplete) && <GameCompleteModal gameStartTimestamp={state.gameStartTimestamp} winMetrics={state.winMetrics} onClose={replayingGameComplete ? () => setReplayMilestone(null) : finishGame} />}</Shell>;
}

function App() { return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Game /></WouterRouter>; }
export default App;