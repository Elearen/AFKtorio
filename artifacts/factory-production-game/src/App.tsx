import { useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type ReactNode, type SetStateAction } from 'react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import { recipeCatalog, type RecipeCatalogEntry, type RecipeMaterial, type RecipeScienceChain } from './recipeCatalog';
import { tierProductCatalog } from './productTierCatalog';
import { technologyCatalog, type TechnologyDefinition } from './technologyCatalog';
import { technologyOrder } from './technologyOrder';
import { assemblyMachineOneCraftingSpeed, craftingSpeedFor, cyclesPerMinuteFor } from './productionSystem';
import { activateReadyConstruction, fulfillConstructionReservation, normalizeConstructionQueue, reserveConstructionMaterials } from './constructionSystem';
import {
  applyUpgradeCompletion, beginUpgrade, bufferedActualRateFor, machineCountForUpgrade as upgradeMachineCountFor,
  migrateMachineUpgradeState, scaledBuildCosts, upgradeData, upgradeMap,
  type BuildMaterialCost, type MachineVariants, type UpgradeDefinition,
} from './upgradeSystem';
import {
  canPurchaseStorageFor, completeStorageConstruction, createInitialStorageState,
  FLUID_HANDLING_TECHNOLOGY, FLUID_STORAGE_BASE_CAPACITY, migrateStorageState,
  storageCapacityFor as calculateStorageCapacityFor, storageContainerCountFor as calculateStorageContainerCountFor,
  STORAGE_BOX_CAPACITY, STORAGE_TANK_CAPACITY,
} from './storageSystem';
import {
  Activity, ArrowRight, BatteryCharging, Box, Check, ChevronRight, CircleHelp, Clock3,
  Cog, MoveRight, Cpu, Factory as FactoryIcon, FlaskConical, Gauge, Hammer,
  Info, Layers3, Lightbulb, LockKeyhole, Pickaxe, Plus, Power,
  RotateCcw, Save, Settings2, ShieldAlert, Sparkles, Sun, Trash2,
  TrendingUp, TriangleAlert, Truck, Waves, Zap,
} from 'lucide-react';

type RawKey = 'iron' | 'copper' | 'stone' | 'coal' | 'wood' | 'water' | 'uranium' | 'crudeOil';
type ComponentKey = string;
type ScienceKey = 'automationPack' | 'logisticsPack' | 'chemicalPack' | 'militaryPack' | 'productionPack' | 'utilityPack';
type TrackedKey = string;
type ResearchKey = string;
type ResearchFilter = 'completed' | 'unlocked' | 'locked';
type RecipeScienceFilter = 'all' | RecipeScienceChain;
type UnitStatus = 'running' | 'starved' | 'blocked';
const defaultTechnologyResearchTime = 30;
type SupplyStatusTone = 'teal' | 'amber' | 'red' | 'muted';
type SupplyStatus = { tone: SupplyStatusTone; label: string; detail: string };

type Recipe = RecipeCatalogEntry;
type QueueItem = {
  id: string;
  action: 'miner' | 'pump' | 'pumpjack' | 'uraniumMiner' | 'assembler' | 'furnace' | 'lab' | 'boiler' | 'steamEngine' | 'solarPanel' | 'storage' | 'upgrade';
  target: string;
  targetId?: string;
  seconds: number;
  total: number;
  machineCount?: number;
  costs?: BuildMaterialCost[];
  reserved?: number[];
  started?: boolean;
};
type HandcraftJob = { recipeKey: string; seconds: number; total: number };
type ManualMiningJob = { resourceKey: RawKey; seconds: number; total: number };
type RateSample = { seconds: number; production: Record<TrackedKey, number>; manualProduction?: Record<TrackedKey, number>; consumption: Record<TrackedKey, number> };
type GameState = {
  raw: Record<RawKey, number>;
  products: Record<string, number>;
  storage: Record<TrackedKey, number>;
  storageBoxes: Record<TrackedKey, number>;
  storageTanks: Record<TrackedKey, number>;
  miners: Record<RawKey, number>;
  pumps: number;
  pumpjacks: number;
  uraniumMiners: number;
  assemblers: Record<string, number>;
  labs: number;
  boilers: number;
  boilersEnabled: boolean;
  steamEngines: number;
  solarPanels: number;
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
  produced: Record<string, number>;
  rateHistory: RateSample[];
  machineVariants: MachineVariants;
  totalOutput: number;
  lastSeen: number;
  simulationSpeed: number;
};

const SAVE_KEY = 'factory-production-game-save-v2';
const rawKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal', 'wood', 'water', 'uranium', 'crudeOil'];
const scienceKeys: ScienceKey[] = ['automationPack', 'logisticsPack', 'chemicalPack', 'militaryPack', 'productionPack', 'utilityPack'];
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
  'production-science-pack': 'productionPack', 'utility-science-pack': 'utilityPack',
};
const keyForSource = (name: string) => sourceKeyAliases[name] ?? name;
const recipeMap: Record<string, Recipe> = Object.fromEntries(recipeCatalog.map((recipe) => [recipe.name, recipe]));
const componentKeys: ComponentKey[] = recipeCatalog.map((recipe) => recipe.name);
const scienceRecipeKeys: Record<ScienceKey, string> = {
  automationPack: 'automation-science-pack', logisticsPack: 'logistic-science-pack',
  chemicalPack: 'chemical-science-pack', militaryPack: 'military-science-pack',
  productionPack: 'production-science-pack', utilityPack: 'utility-science-pack',
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
  for (const technology of orderedTechnologyCatalog) {
    if (!selected.has(technology.name) || state.research.includes(technology.name)) continue;
    if (!technologyPrerequisitesMet(state, technology)) return undefined;
    return technology;
  }
  return undefined;
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
const researchUnitsFor = (technology: TechnologyDefinition) => technology.count ?? (technology.countFormula ? 1000 : 1);
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
  const quantity = technology.count ? cost.amount * technology.count : technology.countFormula ? `${cost.amount} × ${technology.countFormula}` : cost.amount;
  return `${meta[keyForSource(cost.pack)]?.label ?? prettyLabel(cost.pack)} · ${quantity}`;
};
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
const pumpjackRecipe = recipeMap['pumpjack'];
const fueledBurnerMinerKeys: RawKey[] = ['iron', 'copper', 'stone'];
const smeltingRecipeKeys = new Set(['iron-plate', 'copper-plate', 'steel-plate', 'stone-brick']);
const stoneFurnaceRecipe = recipeMap['stone-furnace'];
const stoneFurnaceBuildCost = { stone: 5 };
const assemblyMachineOneRecipe = recipeMap['assembling-machine-1'];
const assemblyMachineOneBuildCost = { circuit: 3, gear: 5, ironPlate: 9 };
const assemblyMachineOnePowerKw = 75;
const assemblyMachineOneProductionSpeed = assemblyMachineOneCraftingSpeed;
const assemblyMachineTwoRecipe = recipeMap['assembling-machine-2'];
const assemblyMachineTwoBuildCost = upgradeMap['assembly-machine-2'].newMachineMaterialCost;
const assemblyMachineTwoPowerKw = upgradeMap['assembly-machine-2'].newMachinePowerDraw;
const assemblyMachineTwoProductionSpeed = upgradeMap['assembly-machine-2'].newMachineProductionSpeed;
const labPowerKw = 7000;
const storageBoxCapacity = STORAGE_BOX_CAPACITY;
const fluidStorageBaseCapacity = FLUID_STORAGE_BASE_CAPACITY;
const storageTankCapacity = STORAGE_TANK_CAPACITY;
const storageBoxWoodCost = 2;
const storageBoxBuildSeconds = 1;
const manualMiningSeconds = 2.5;
const boilerRecipe = recipeMap['boiler'];
const steamEngineRecipe = recipeMap['steam-engine'];
const labRecipe = recipeMap['lab'];
const labBaseResearchSpeed = 1;
const technologyResearchTimeFor = (technology?: TechnologyDefinition) => Math.max(1, technology?.time ?? defaultTechnologyResearchTime);
const boilerSteamPerSecond = 30;
const boilerCoalPerSecond = 0.1;
const boilerWaterPerSecond = 0.5;
const steamEngineSteamPerSecond = 30;
const steamEnginePowerMw = 80;
const solarPanelBasePowerKw = 60;
const solarPanelEfficiency = 0.5;
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
const productionBuildingFor = (state: GameState, recipe: Recipe) => isSmeltingRecipe(recipe) ? 'stone-furnace' : state.machineVariants.assembly;
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
const isFluidKey = (key: TrackedKey) => fluidKeys.has(key);
const initialStorageState = createInitialStorageState(trackedKeys, fluidKeys);
const emptyRateRecord = () => Object.fromEntries(trackedKeys.map((key) => [key, 0])) as Record<TrackedKey, number>;
const tierProductOrder = new Map(tierProductCatalog.map((product, index) => [keyForSource(product.sourceName), index]));
const tierForProduct = (key: string) => tierProductOrder.get(key) ?? Number.MAX_SAFE_INTEGER;
const orderedTrackedKeys = [...trackedKeys].sort((a, b) => tierForProduct(a) - tierForProduct(b) || a.localeCompare(b));
const orderedRecipeCatalog = [...recipeCatalog].sort((a, b) => {
  const aTier = Math.min(...recipeOutputs(a).map((output) => tierForProduct(output.key)), Number.MAX_SAFE_INTEGER);
  const bTier = Math.min(...recipeOutputs(b).map((output) => tierForProduct(output.key)), Number.MAX_SAFE_INTEGER);
  return aTier - bTier;
});
const coreTrackedKeys = new Set(recipeCatalog.filter((recipe) => recipe.scienceChain === 'Core').flatMap((recipe) => [
  ...recipe.ingredients,
  ...recipe.results,
  ...(recipe.fuel ? [recipe.fuel] : []),
].map((material) => keyForSource(material.name))));
const trackedScienceChainFor = (key: TrackedKey): RecipeScienceChain => coreTrackedKeys.has(key) ? 'Core' : 'Non-Core';
const recipeUnlockResearch: Record<string, string[]> = {};
technologyCatalog.forEach((technology) => technology.effects.forEach((effect) => {
  if (effect.type === 'unlock-recipe' && effect.recipe) recipeUnlockResearch[effect.recipe] = [...(recipeUnlockResearch[effect.recipe] ?? []), technology.name];
}));
const rawProductIsUnlocked = (key: string, state: GameState) => key !== 'water' && key !== 'uranium' && key !== 'crudeOil'
  || key === 'water' && state.research.includes('steam-power')
  || key === 'uranium' && state.research.includes('nuclear-power')
  || key === 'crudeOil' && state.research.includes('oil-gathering');
const recipeIsUnlocked = (recipe: Recipe, state: GameState) => recipe.enabled
  || (recipeUnlockResearch[recipe.name] ?? []).some((technology) => state.research.includes(technology));
const unlockedProductKeys = (state: GameState) => new Set([
  ...rawKeys.filter((key) => rawProductIsUnlocked(key, state)),
  ...recipeCatalog.filter((recipe) => recipeIsUnlocked(recipe, state)).flatMap((recipe) => recipeOutputs(recipe).map((output) => output.key)),
]);
const prettyLabel = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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
const solarPanelBuildCost = recipeBuildCosts(solarPanelRecipe);
const pumpjackBuildCost = recipeBuildCosts(pumpjackRecipe);
const storageTankBuildCost = recipeBuildCosts(storageTankRecipe);
const missingBuildMaterials = (state: GameState, costs: BuildMaterialCost[]) => costs
  .map(({ key, amount, source }) => ({ key, missing: Math.max(0, amount - ((state[source] as Record<string, number>)[key] ?? 0)) }))
  .filter(({ missing }) => missing > 0)
  .map(({ key, missing }) => `${Number.isInteger(missing) ? fmt(missing) : missing.toFixed(2)} ${meta[key]?.label.toLowerCase() ?? prettyLabel(key).toLowerCase()}`)
  .join(' + ');
const starterProducts: Record<string, number> = {
  ...Object.fromEntries(trackedKeys.map((key) => [key, 0])),
  ironPlate: 28, copperPlate: 14, steel: 4, gear: 9, pipe: 4, circuit: 3, automationPack: 9, logisticsPack: 5, chemicalPack: 0, militaryPack: 0, productionPack: 0, utilityPack: 0,
};

const initialState: GameState = {
  raw: { iron: 62, copper: 38, stone: 26, coal: 31, wood: 18, water: 0, uranium: 0, crudeOil: 0 },
  products: starterProducts,
  storage: initialStorageState.storage as Record<TrackedKey, number>,
  storageBoxes: initialStorageState.storageBoxes as Record<TrackedKey, number>,
  storageTanks: initialStorageState.storageTanks as Record<TrackedKey, number>,
  miners: { iron: 0, copper: 0, stone: 0, coal: 0, wood: 0, water: 0, uranium: 0, crudeOil: 0 },
  pumps: 0, pumpjacks: 0, uraniumMiners: 0,
  assemblers: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labs: 0, boilers: 0, boilersEnabled: true, steamEngines: 0, solarPanels: 0, miningProgress: Object.fromEntries(rawKeys.map((key) => [key, 0])) as Record<RawKey, number>,
  assemblyProgress: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labProgress: 0, handcraft: null, manualMining: null, queue: [], research: [], currentResearch: null, researchSelected: false, researchProgress: {}, autoResearch: [], researchNotifications: [], produced: Object.fromEntries(trackedKeys.map((key) => [key, 0])), rateHistory: [], machineVariants: { assembly: 'assembling-machine-1', mining: 'burner-mining-drill' },
  totalOutput: 1642, lastSeen: Date.now(), simulationSpeed: 1,
};

const nav = [
  ['factory', '/', FactoryIcon], ['mining', '/mining', Pickaxe], ['production', '/production', Cog], ['power', '/power', Power],
  ['storage', '/storage', Box], ['logistics', '/logistics', MoveRight], ['upgrades', '/upgrades', TrendingUp], ['science', '/science', FlaskConical],
  ['research', '/research', Layers3], ['settings', '/settings', Settings2],
] as const;
const tabLabel = (key: string) => key === 'mining' ? 'Mining / Raw' : key.charAt(0).toUpperCase() + key.slice(1);

const rawInfo: Record<RawKey, { label: string; description: string; research?: ResearchKey; needs?: string }> = {
  iron: { label: 'Iron', description: 'Reliable ferrous feedstock for the first production tier.' },
  copper: { label: 'Copper', description: 'Conductive ore for plates and circuit work.' },
  stone: { label: 'Stone', description: 'Bulk aggregate for foundations and early construction.' },
  coal: { label: 'Coal', description: 'Dense fuel for boilers and high-heat processing.' },
  wood: { label: 'Wood', description: 'Manual-start biomass for early structures.' },
  water: { label: 'Water', description: 'Pumped fluid required to turn heat into power.', research: 'steam-power', needs: 'Steam Power' },
  uranium: { label: 'Uranium', description: 'Dense fuel for the late-stage reactor chain.', research: 'nuclear-power', needs: 'Nuclear Power' },
  crudeOil: { label: 'Crude oil', description: 'Raw hydrocarbon feedstock for refining and the chemical chain.', research: 'oil-gathering', needs: 'Oil Gathering' },
};

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');
const duration = (n: number) => `${Math.floor(n / 60)}m ${String(Math.max(0, Math.floor(n % 60))).padStart(2, '0')}s`;
const containerCountFor = (state: GameState, key: TrackedKey) => calculateStorageContainerCountFor(key, fluidKeys, state.storageBoxes, state.storageTanks);
const storageCapacityFor = (state: GameState, key: TrackedKey) => calculateStorageCapacityFor(key, fluidKeys, state.storageBoxes, state.storageTanks);
const capFor = (state: GameState, key: TrackedKey) => Math.floor(state.storage[key] ?? storageCapacityFor(state, key));
const burnerMinerCount = (state: GameState) => burnerMinerKeys.reduce((total, key) => total + state.miners[key], 0);
const electricAssemblerCount = (state: GameState) => Object.entries(state.assemblers).reduce((total, [recipeKey, count]) => total + (recipeMap[recipeKey] && !isSmeltingRecipe(recipeMap[recipeKey]) ? count : 0), 0);
const productionUnitCount = (state: GameState) => Object.values(state.assemblers).reduce((total, count) => total + count, 0);
const assemblyMachineProductionSpeedFor = (state: GameState) => state.machineVariants.assembly === 'assembling-machine-2' ? assemblyMachineTwoProductionSpeed : assemblyMachineOneProductionSpeed;
const assemblyMachinePowerFor = (state: GameState) => state.machineVariants.assembly === 'assembling-machine-2' ? assemblyMachineTwoPowerKw : assemblyMachineOnePowerKw;
const miningMachineProductionSpeedFor = (state: GameState) => state.machineVariants.mining === 'electric-mining-drill' ? electricMiningDrillProductionSpeed : burnerMiningDrillProductionSpeed;
const miningMachinePowerFor = (state: GameState) => state.machineVariants.mining === 'electric-mining-drill' ? electricMiningDrillPowerKw : 0;
const miningUsesStoredCoal = (state: GameState) => state.machineVariants.mining !== 'electric-mining-drill';
const fueledBurnerMinerCount = (state: GameState) => miningUsesStoredCoal(state) ? fueledBurnerMinerKeys.reduce((total, key) => total + state.miners[key], 0) : 0;
const burnerMinerCoalRate = (state: GameState) => fueledBurnerMinerCount(state) * burnerMiningDrillCoalPerSecond;
const boilerPeakSteamRateFor = (state: GameState) => state.research.includes('steam-power') && state.boilersEnabled ? state.boilers * boilerSteamPerSecond * 60 * state.simulationSpeed : 0;
const boilerPeakCoalUsageFor = (state: GameState) => state.research.includes('steam-power') && state.boilersEnabled ? state.boilers * boilerCoalPerSecond * 60 * state.simulationSpeed : 0;
const boilerPeakWaterUsageFor = (state: GameState) => state.research.includes('steam-power') && state.boilersEnabled ? state.boilers * boilerWaterPerSecond * 60 * state.simulationSpeed : 0;
const boilerSteamRateFor = (state: GameState) => boilerPeakSteamRateFor(state);
const boilerCoalUsageFor = (state: GameState) => boilerPeakCoalUsageFor(state);
const boilerWaterUsageFor = (state: GameState) => boilerPeakWaterUsageFor(state);
const steamEnginePeakSteamUsageFor = (state: GameState) => state.research.includes('steam-power') ? state.steamEngines * steamEngineSteamPerSecond * 60 * state.simulationSpeed : 0;
const steamEngineSteamUsageFor = (state: GameState) => steamEnginePeakSteamUsageFor(state);
const steamEnginePeakPowerFor = (state: GameState) => state.research.includes('steam-power') ? state.steamEngines * steamEnginePowerMw * state.simulationSpeed : 0;
const steamEnginePowerFor = (state: GameState) => steamEnginePeakPowerFor(state);
const solarPanelPotentialPowerKwFor = (state: GameState) => state.research.includes('solar-energy') ? state.solarPanels * solarPanelBasePowerKw * state.simulationSpeed : 0;
const solarPanelNetPowerKwFor = (state: GameState) => solarPanelPotentialPowerKwFor(state) * solarPanelEfficiency;
const solarPowerFor = (state: GameState) => solarPanelNetPowerKwFor(state) / 1000;
const nuclearPowerFor = (state: GameState) => state.research.includes('nuclear-power') ? 180 * state.simulationSpeed : 0;
const powerProductionFor = (state: GameState) => steamEnginePowerFor(state) + solarPowerFor(state) + nuclearPowerFor(state);
const electricPowerDraw = (state: GameState) => {
  const assemblerPower = electricAssemblerCount(state) * assemblyMachinePowerFor(state);
  const miningPower = state.machineVariants.mining === 'electric-mining-drill' ? burnerMinerCount(state) * miningMachinePowerFor(state) : 0;
  return (state.labs * labPowerKw + assemblerPower + miningPower) / 1000;
};
const electricPowerRatioFor = (state: GameState) => {
  const required = electricPowerDraw(state);
  return required > 0 ? Math.min(1, powerProductionFor(state) / required) : 1;
};
const powerLabel = (value: number) => Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
const totalUnits = (state: GameState) => burnerMinerCount(state) + state.pumps + state.pumpjacks + state.uraniumMiners + productionUnitCount(state) + state.labs + state.boilers + state.steamEngines + state.solarPanels;
const machineCountForUpgrade = (state: GameState, upgrade: UpgradeDefinition) => upgradeMachineCountFor({ assembly: electricAssemblerCount(state), mining: burnerMinerCount(state) }, upgrade);
const miningMachineLabelFor = (state: GameState) => state.machineVariants.mining === 'electric-mining-drill' ? 'Electric Miner' : 'Burner Mining Drill';
const miningMachineRecipeFor = (state: GameState) => state.machineVariants.mining === 'electric-mining-drill' ? electricMiningDrillRecipe : burnerMiningDrillRecipe;
const miningMachineCountFor = (state: GameState, key: RawKey) => key === 'wood' ? 0 : key === 'water' ? state.pumps : key === 'crudeOil' ? state.pumpjacks : key === 'uranium' ? state.uraniumMiners : state.miners[key];
const miningOutputPerSecondFor = (key: RawKey) => key === 'uranium' ? 0.32 : key === 'water' ? waterPumpPerSecond : key === 'crudeOil' ? 50 : key === 'copper' ? 0.88 : 1;
const miningMachineBuildCostFor = (state: GameState): BuildMaterialCost[] => state.machineVariants.mining === 'electric-mining-drill'
  ? electricMiningDrillBuildCost
  : [{ key: 'gear', amount: burnerMiningDrillCost.gear, source: 'products' }, { key: 'ironPlate', amount: burnerMiningDrillCost.ironPlate, source: 'products' }, { key: 'stone', amount: burnerMiningDrillCost.stone, source: 'raw' }];
const productionMachineLabelFor = (state: GameState) => state.machineVariants.assembly === 'assembling-machine-2' ? 'Assembly Machine 2' : 'Assembly Machine 1';
const productionMachineRecipeFor = (state: GameState) => state.machineVariants.assembly === 'assembling-machine-2' ? assemblyMachineTwoRecipe : assemblyMachineOneRecipe;
const productionMachineBuildCostFor = (state: GameState): BuildMaterialCost[] => state.machineVariants.assembly === 'assembling-machine-2'
  ? assemblyMachineTwoBuildCost
  : [{ key: 'circuit', amount: assemblyMachineOneBuildCost.circuit, source: 'products' }, { key: 'gear', amount: assemblyMachineOneBuildCost.gear, source: 'products' }, { key: 'ironPlate', amount: assemblyMachineOneBuildCost.ironPlate, source: 'products' }];
const quantityFor = (state: GameState, key: TrackedKey) => rawKeys.includes(key as RawKey) ? state.raw[key as RawKey] : state.products[key] ?? 0;
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
  if (available <= 0) return;
  if (rawKeys.includes(key as RawKey)) state.raw[key as RawKey] = ignoreCapacity ? state.raw[key as RawKey] + available : Math.min(capFor(state, key), state.raw[key as RawKey] + available);
  else state.products[key] = ignoreCapacity ? (state.products[key] ?? 0) + available : Math.min(capFor(state, key), (state.products[key] ?? 0) + available);
};
const recordProduction = (state: GameState, key: TrackedKey, amount: number, production?: Record<TrackedKey, number>, manualProduction?: Record<TrackedKey, number>) => {
  state.produced[key] = (state.produced[key] ?? 0) + amount;
  if (production) production[key] = (production[key] ?? 0) + amount;
  if (manualProduction) manualProduction[key] = (manualProduction[key] ?? 0) + amount;
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
  if (!state.researchNotifications.includes(technology.name)) state.researchNotifications.push(technology.name);
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
  craftingSpeedFor(isSmeltingRecipe(recipe), assemblyMachineProductionSpeedFor(state)),
);
const miningBaseProductionRateFor = (state: GameState, key: RawKey) => {
  const count = miningMachineCountFor(state, key);
  const base = miningOutputPerSecondFor(key);
  const machineSpeedRatio = burnerMinerKeys.includes(key) ? miningMachineProductionSpeedFor(state) / burnerMiningDrillProductionSpeed : 1;
  return count * base * 60 * state.simulationSpeed * machineSpeedRatio;
};
const coalAvailableAfterBoilersFor = (state: GameState) => Math.max(0, state.raw.coal - boilerPeakCoalUsageFor(state));
const miningProductionRateFor = (state: GameState, key: RawKey) => {
  if (key === 'coal') return Math.max(0, miningBaseProductionRateFor(state, key) - (miningUsesStoredCoal(state) ? state.miners.coal * burnerMiningDrillCoalPerSecond * 60 * state.simulationSpeed : 0));
  const fuelRatio = fueledBurnerMinerCount(state) ? Math.min(1, coalAvailableAfterBoilersFor(state) / Math.max(0.01, burnerMinerCoalRate(state) * 60 * state.simulationSpeed)) : 1;
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
  const steamFlowPerSecond = boilerPeakSteamRateFor(state) / 60;
  const coalStatus = boilerInputStatusFor(state, 'coal');
  const waterStatus = boilerInputStatusFor(state, 'water');
  if (steamFlowPerSecond >= requiredPerSecond && coalStatus.label === 'sufficient' && waterStatus.label === 'sufficient') {
    return { tone: 'teal', label: 'sufficient', detail: `${steamFlowPerSecond.toFixed(1)} / ${requiredPerSecond.toFixed(1)} steam per sec from boilers` };
  }
  if (steamFlowPerSecond >= requiredPerSecond && coalStatus.label !== 'insufficient' && waterStatus.label !== 'insufficient') {
    return { tone: 'amber', label: 'buffered', detail: `steam capacity is ready · boiler inputs rely on stored buffers` };
  }
  return { tone: 'red', label: 'insufficient', detail: `${steamFlowPerSecond.toFixed(1)} / ${requiredPerSecond.toFixed(1)} steam per sec available` };
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
const miningActualProductionRateFor = (state: GameState, key: RawKey) => {
  const peakRate = miningProductionRateFor(state, key);
  const requiredRate = demandRateFor(state, key);
  return bufferedActualRateFor(peakRate, quantityFor(state, key), capFor(state, key), requiredRate);
};
const miningStorageThrottleFor = (state: GameState, key: RawKey) => {
  const peakRate = miningProductionRateFor(state, key);
  return peakRate > 0 ? miningActualProductionRateFor(state, key) / peakRate : 0;
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
    const input = automatedRecipeInputs(recipe)[key];
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
  const output = recipeOutputs(recipe)[0];
  return output ? productionRateFor(state, output.key) : 0;
};
const furnaceCoalPerItemFor = (recipe: Recipe) => {
  const output = recipeOutputs(recipe)[0];
  return recipe.fuel && output ? materialAmount(recipe.fuel) / Math.max(0.01, output.amount) : 0;
};
const furnaceCoalUsageFor = (state: GameState, recipe: Recipe, peak = false) => {
  const output = recipeOutputs(recipe)[0];
  if (!recipe.fuel || !output) return 0;
  const outputRate = peak ? recipeCycleRateFor(state, recipe) * output.amount : recipeProductionRateFor(state, recipe);
  return outputRate * furnaceCoalPerItemFor(recipe);
};
const scienceLabRateFor = (state: GameState, technology?: TechnologyDefinition, applyPowerRatio = true) => state.labs * labBaseResearchSpeed * 60 * state.simulationSpeed / technologyResearchTimeFor(technology) * (applyPowerRatio ? electricPowerRatioFor(state) : 1);
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

function simulate(previous: GameState, seconds: number): GameState {
  const liveProduction = emptyRateRecord();
  const liveManualProduction = emptyRateRecord();
  const liveConsumption = emptyRateRecord();
  const state: GameState = {
    ...previous, raw: { ...previous.raw }, products: { ...previous.products }, miners: { ...previous.miners }, storage: { ...previous.storage }, storageBoxes: { ...previous.storageBoxes }, storageTanks: { ...previous.storageTanks },
    assemblers: { ...previous.assemblers }, boilers: previous.boilers, boilersEnabled: previous.boilersEnabled, steamEngines: previous.steamEngines, solarPanels: previous.solarPanels, machineVariants: { ...previous.machineVariants }, miningProgress: { ...previous.miningProgress }, assemblyProgress: { ...previous.assemblyProgress },
    researchProgress: { ...(previous.researchProgress ?? {}) }, autoResearch: [...(previous.autoResearch ?? [])], researchNotifications: [...(previous.researchNotifications ?? [])],
    rateHistory: previous.rateHistory ?? [],
    handcraft: previous.handcraft ? { ...previous.handcraft } : null, manualMining: previous.manualMining ? { ...previous.manualMining } : null,
    queue: previous.queue.map((item) => ({ ...item, costs: item.costs?.map((cost) => ({ ...cost })), reserved: item.reserved ? [...item.reserved] : undefined })),
    research: [...previous.research], produced: { ...previous.produced }, lastSeen: Date.now(),
  };
  const speed = state.simulationSpeed;
  const powerRatio = electricPowerRatioFor(state);
  const boilerCoalDemand = boilerPeakCoalUsageFor(state) * seconds / 60;
  const boilerWaterDemand = boilerPeakWaterUsageFor(state) * seconds / 60;
  if (boilerCoalDemand > 0) {
    state.raw.coal = Math.max(0, state.raw.coal - boilerCoalDemand);
    liveConsumption.coal += boilerCoalDemand;
  }
  if (boilerWaterDemand > 0) {
    state.raw.water = Math.max(0, state.raw.water - boilerWaterDemand);
    liveConsumption.water += boilerWaterDemand;
  }
  const operatingSeconds = burnerOperatingSeconds(state, seconds);
  if (fueledBurnerMinerCount(state)) {
    const coalConsumed = burnerMinerCoalRate(state) * operatingSeconds * speed;
    state.raw.coal = Math.max(0, state.raw.coal - coalConsumed);
    liveConsumption.coal += coalConsumed;
  }
  rawKeys.forEach((key) => {
    const count = miningMachineCountFor(state, key);
    if (!count) return;
    const base = miningOutputPerSecondFor(key);
    const minerSeconds = fueledBurnerMinerKeys.includes(key) ? operatingSeconds : seconds;
      const outputRate = key === 'coal' && miningUsesStoredCoal(state) ? base - burnerMiningDrillCoalPerSecond : base;
    state.miningProgress[key] += count * outputRate * minerSeconds * speed * miningStorageThrottleFor(state, key);
    while (state.miningProgress[key] >= 1) {
      if (state.raw[key] >= capFor(state, key)) { state.miningProgress[key] = 0; break; }
      state.raw[key] += 1; state.miningProgress[key] -= 1; state.totalOutput += 1; recordProduction(state, key, 1, liveProduction);
    }
  });
  componentKeys.forEach((key) => {
    const count = state.assemblers[key] ?? 0;
    if (!count) return;
    const recipe = recipeMap[key];
    const machinePowerRatio = isSmeltingRecipe(recipe) ? 1 : powerRatio;
    const storageThrottle = recipeStorageThrottleFor(state, recipe, machinePowerRatio);
    // Progress represents an in-flight cycle, not a queue of completed
    // cycles. Clamp legacy/starved backlog before advancing the line so a
    // machine cannot burst above its steady-state rate when inputs return.
    const machineCraftingSpeed = craftingSpeedFor(isSmeltingRecipe(recipe), assemblyMachineProductionSpeedFor(state));
    state.assemblyProgress[key] = Math.min(state.assemblyProgress[key] ?? 0, 0.999999)
      + cyclesPerMinuteFor(count, speed, recipe.energyRequired, machineCraftingSpeed) * seconds / 60 * machinePowerRatio * storageThrottle;
    let cycles = 0;
    let blocked = false;
    while (state.assemblyProgress[key] >= 1 && cycles < 80) {
      const outputs = recipeOutputs(recipe);
       if (!hasInputs(state, automatedRecipeInputs(recipe)) || outputs.some(({ key: outputKey, amount }) => quantityFor(state, outputKey) + amount > capFor(state, outputKey))) {
        blocked = true;
        break;
      }
       spendInputs(state, automatedRecipeInputs(recipe), liveConsumption);
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
      outputs.forEach(({ key: outputKey, amount }) => { addTracked(state, outputKey, amount, true); recordProduction(state, outputKey, amount, liveProduction, liveManualProduction); });
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
  activateReadyConstruction(state.queue);
  const completed = state.queue.filter((item) => item.started !== false && item.seconds <= seconds);
  state.queue = state.queue.map((item) => item.started === false ? item : ({ ...item, seconds: Math.max(0, item.seconds - seconds) })).filter((item) => item.started === false || item.seconds > 0);
  completed.forEach((item) => {
    if (item.action === 'miner' && (item.targetId ?? item.target) !== 'wood') state.miners[(item.targetId ?? item.target) as RawKey] += 1;
    if (item.action === 'pump') state.pumps += 1;
    if (item.action === 'pumpjack') { state.pumpjacks += 1; recordProduction(state, 'pumpjack', 1); }
    if (item.action === 'uraniumMiner') state.uraniumMiners += 1;
     if (item.action === 'assembler' || item.action === 'furnace') state.assemblers[(item.targetId ?? item.target) as ComponentKey] += 1;
    if (item.action === 'lab') { state.labs += 1; recordProduction(state, 'lab', 1, liveProduction); }
    if (item.action === 'boiler') state.boilers += 1;
    if (item.action === 'steamEngine') state.steamEngines += 1;
    if (item.action === 'solarPanel') state.solarPanels += 1;
    if (item.action === 'storage') {
      const key = item.targetId ?? item.target;
      const completedStorage = completeStorageConstruction({
        storage: state.storage,
        storageBoxes: state.storageBoxes,
        storageTanks: state.storageTanks,
      }, key, fluidKeys);
      state.storage = completedStorage.storage;
      state.storageBoxes = completedStorage.storageBoxes;
      state.storageTanks = completedStorage.storageTanks;
    }
    if (item.action === 'upgrade') {
      state.machineVariants = applyUpgradeCompletion(state.machineVariants, item.targetId ?? item.target);
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
    const savedRateHistory = parsed.rateHistory ?? [];
    const hasRateSourceData = savedRateHistory.every((sample) => sample.manualProduction !== undefined);
    const migratedUpgradeState = migrateMachineUpgradeState({ machineVariants: parsed.machineVariants, queue: parsed.queue });
    const savedLabCount = typeof parsed.labs === 'number' ? Math.max(0, parsed.labs) : initialState.labs;
    const migratedLabCount = savedLabCount === 1 && !(Array.isArray(parsed.queue) && parsed.queue.some((item) => item.action === 'lab')) ? 0 : savedLabCount;
    const normalizedStorage = (() => {
      const storage = { ...initialState.storage, ...parsed.storage };
      if (parsed.storage?.researchPack !== undefined && parsed.storage?.productionPack === undefined) storage.productionPack = parsed.storage.researchPack;
      delete storage.researchPack;
      return storage;
    })();
    const migratedStorage = migrateStorageState({
      trackedKeys,
      fluidKeys,
      savedStorage: normalizedStorage,
      savedBoxes: parsed.storageBoxes,
      savedTanks: parsed.storageTanks,
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
      miners: { ...initialState.miners, ...parsed.miners },
      assemblers: { ...initialState.assemblers, ...parsed.assemblers },
      labs: migratedLabCount,
      boilersEnabled: parsed.boilersEnabled !== false,
      miningProgress: { ...initialState.miningProgress, ...parsed.miningProgress },
      assemblyProgress: { ...initialState.assemblyProgress, ...parsed.assemblyProgress },
      handcraft: parsed.handcraft ? { ...parsed.handcraft } : null,
      manualMining: parsed.manualMining ? { ...parsed.manualMining } : null,
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
       queue: normalizeConstructionQueue(migratedUpgradeState.queue as QueueItem[]),
      research: Array.from(new Set((parsed.research ?? initialState.research).map((key) => normalizeResearchKey(String(key))))),
      currentResearch: parsed.currentResearch ? normalizeResearchKey(String(parsed.currentResearch)) : initialState.currentResearch,
      researchSelected: parsed.researchSelected === true,
      researchProgress: Object.fromEntries(Object.entries(parsed.researchProgress ?? {}).filter(([key, value]) => technologyMap[key] && typeof value === 'number').map(([key, value]) => [normalizeResearchKey(key), Math.max(0, value as number)])),
      autoResearch: orderedTechnologyCatalog.filter((technology) => (parsed.autoResearch ?? []).map((key) => normalizeResearchKey(String(key))).includes(technology.name)).map((technology) => technology.name),
      researchNotifications: Array.from(new Set((parsed.researchNotifications ?? []).map((key) => normalizeResearchKey(String(key))).filter((key) => technologyMap[key]))),
      lastSeen: parsed.lastSeen ?? Date.now(),
    } as GameState;
    delete (state as GameState & { upgrades?: unknown }).upgrades;
    const away = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - state.lastSeen) / 1000));
    const before = state.totalOutput;
    const recovered = simulate(state, away);
    return { state: recovered, away, recovered: recovered.totalOutput - before };
  } catch { return { state: initialState, away: 0, recovered: 0 }; }
}

const iconFileFor: Record<string, string> = {
  crudeOil: 'crude-oil', chemicalPack: 'chemical-science-pack', militaryPack: 'military-science-pack',
  productionPack: 'researchPack', utilityPack: 'utility-science-pack',
};
function ResourceIcon({ item, size = 28 }: { item: TrackedKey; size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}item-icons/${iconFileFor[item] ?? item}.png`} width={size} height={size} alt="" aria-hidden="true" className="object-contain" />;
}
function BrandLogo({ size = 36 }: { size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}logo.svg`} width={size} height={size} alt="Factory Production Game logo" className="object-contain" />;
}
function Tag({ children, tone = 'teal' }: { children: ReactNode; tone?: 'teal' | 'amber' | 'red' | 'muted' }) {
  return <span className={`status-tag ${tone === 'teal' ? 'tag-running' : tone === 'amber' ? 'tag-starved' : tone === 'red' ? 'tag-blocked' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{children}</span>;
}
function SupplyStatus({ label, status, testId }: { label: string; status: SupplyStatus; testId: string }) {
  return <div className="data-row rounded-lg p-2.5" data-testid={testId}>
    <div className="flex items-center justify-between gap-2"><div className="eyebrow">{label}</div><Tag tone={status.tone}>{status.label}</Tag></div>
    <div className="mt-1 text-[9px] leading-4 text-[hsl(var(--muted-foreground))]">{status.detail}</div>
  </div>;
}

function Shell({ children, state }: { children: ReactNode; state: GameState }) {
  const [location] = useLocation();
  const [menu, setMenu] = useState(false);
  const active = nav.find(([key, path]) => path === location)?.[0] ?? 'factory';
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
    setMenu(false);
  };
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = scrollPositions.current[active] ?? 0;
  }, [active]);
  return <div className="app-shell flex h-[100dvh] flex-col">
    <header className="shrink-0 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(217_30%_8%/.94)]">
      <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><button onClick={() => setMenu(!menu)} className="icon-button md:hidden" aria-label="Open navigation" data-testid="button-open-navigation"><Layers3 size={17} /></button><Link href="/" className="flex items-center gap-3 no-underline" data-testid="link-logo"><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.12)]"><BrandLogo size={36} /></div><div className="min-w-0"><div className="text-[13px] font-extrabold tracking-[.05em]">FACTORY PLANET</div><div className="mono truncate text-[9px] tracking-[.18em] text-[hsl(var(--primary))]">Idle production</div></div></Link></div>
        <div className="hidden items-center gap-3 lg:flex"><Tag><span className="status-dot status-running mini-pulse" /> simulation live</Tag><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">SECTOR 07 · LOCAL INSTANCE</span></div>
        <div className="flex items-center gap-2"><span className="mono hidden text-[10px] text-[hsl(var(--muted-foreground))] sm:block">T+ NETWORK</span><button onClick={() => setMenu(!menu)} className="icon-button" aria-label="Toggle command navigation" data-testid="button-toggle-command"><Settings2 size={16} /></button></div>
      </div>
      {activeResearch && <div className="border-t border-[hsl(var(--sidebar-border))] bg-[hsl(216_25%_10%/.9)]" data-testid="header-research-status"><div className="mx-auto flex min-h-8 max-w-[1500px] flex-wrap items-center gap-x-1.5 gap-y-1 px-4 py-2 mono text-[9px] text-[hsl(var(--muted-foreground))] sm:px-6 lg:px-8"><span className="status-dot status-running mini-pulse" /><span>Current research: <strong className="font-semibold text-[hsl(var(--foreground))]">{prettyLabel(activeResearch.name)}</strong></span><span className="text-[hsl(var(--border))]">|</span><span>Current progress: <strong className="font-semibold text-[hsl(var(--primary))]">{activeResearchProgress.toFixed(0)}%</strong></span><span className="text-[hsl(var(--border))]">|</span><span>Time remaining: <strong className="font-semibold text-[hsl(var(--primary))]">{activeResearchTimeRemaining === null ? '--' : duration(activeResearchTimeRemaining)}</strong></span></div></div>}
    </header>
    <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1">
      <aside className={`${menu ? 'fixed inset-x-3 top-[78px] z-40 block shadow-2xl' : 'hidden'} surface rounded-xl p-2 md:sticky md:top-0 md:block md:h-full md:w-[214px] md:shrink-0 md:rounded-none md:border-0 md:border-r md:border-[hsl(var(--sidebar-border))] md:bg-transparent md:p-5 md:shadow-none`}><div className="mb-4 hidden px-3 md:block"><span className="eyebrow">Command tabs · 10</span></div><nav className="grid grid-cols-2 gap-1 md:flex md:flex-col" aria-label="Primary navigation">{nav.map(([key, path, Icon]) => <Link key={key} href={path} onClick={(event) => handleNavClick(key, event)} className={`nav-link flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[11px] font-bold no-underline transition-colors ${active === key ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`} data-testid={`link-tab-${key}`}><Icon size={15} /><span>{tabLabel(key)}</span>{active === key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />}</Link>)}</nav></aside>
      <main ref={contentRef} onScroll={() => { if (contentRef.current) scrollPositions.current[active] = contentRef.current.scrollTop; }} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
    </div>
    <div className="tab-rail fixed inset-x-0 bottom-0 z-30 border-t border-[hsl(var(--border))] bg-[hsl(217_30%_8%/.97)] px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl md:hidden"><div className="grid w-full grid-cols-5 grid-rows-2 gap-1">{nav.map(([key, path, Icon]) => <Link key={key} href={path} onClick={(event) => handleNavClick(key, event)} className={`flex min-w-0 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[9px] font-bold no-underline ${active === key ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`link-mobile-tab-${key}`}><Icon size={16} /><span className="truncate">{tabLabel(key)}</span></Link>)}</div></div>
  </div>;
}

function Header({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end enter"><div><div className="eyebrow flex items-center gap-2 text-[hsl(var(--primary))]"><span className="h-px w-5 bg-[hsl(var(--primary))]" />{eyebrow}</div><h1 className="mt-2 text-[clamp(1.65rem,4vw,2.5rem)] font-extrabold tracking-[-.04em]">{title}</h1><p className="mt-1 max-w-2xl text-[12px] text-[hsl(var(--muted-foreground))]">{copy}</p></div>{action}</div>;
}
function SectionTitle({ children, detail }: { children: ReactNode; detail?: string }) { return <div className="mb-3 flex items-end justify-between"><span className="eyebrow">{children}</span>{detail && <span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{detail}</span>}</div>; }
function Progress({ value, tone = 'teal' }: { value: number; tone?: 'teal' | 'amber' | 'red' }) { return <div className="progress-track"><div className={`progress-fill ${tone === 'amber' ? 'amber' : tone === 'red' ? 'red' : ''}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }
function CompactMetricsRow({ production, peakProduction, demand, peakConsumption, net, storage, capacity }: { production: number; peakProduction: number; demand: number; peakConsumption: number; net: number; storage: number; capacity: number }) {
  const rate = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
  const metric = ({ label, value, tone }: { label: string; value: string; tone: string }) => <div className="min-w-0 text-center" key={label} title={`${label}: ${value}`}><div className="truncate text-[8px] uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]">{label}</div><div className={`mono mt-1 truncate text-[10px] font-semibold ${tone}`}>{value}</div></div>;
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
        { label: 'peak production', value: `${peakProduction.toFixed(1)}/m`, tone: 'text-[hsl(var(--secondary)/.7)]' },
        { label: 'peak consumption', value: `${peakConsumption.toFixed(1)}/m`, tone: 'text-[hsl(var(--primary)/.7)]' },
        { label: 'storage', value: `${fmt(storage)}/${fmt(capacity)}`, tone: 'text-[hsl(var(--foreground))]' },
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
function BuildProgress({ items, label }: { items: QueueItem[]; label: string }) {
  if (!items.length) return null;
  const active = items[0];
  const waitingForMaterials = active.started === false;
  const complete = waitingForMaterials
    ? Math.min(...(active.costs ?? []).map((cost, index) => (active.reserved?.[index] ?? 0) / Math.max(0.0001, cost.amount) * 100), 0)
    : (1 - active.seconds / active.total) * 100;
  const missing = waitingForMaterials
    ? (active.costs ?? []).map((cost, index) => {
      const amount = Math.max(0, cost.amount - (active.reserved?.[index] ?? 0));
      return amount > 0 ? `${Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2)} ${meta[cost.key]?.label.toLowerCase() ?? prettyLabel(cost.key).toLowerCase()}` : '';
    }).filter(Boolean).join(' + ')
    : '';
  return <div className="construction-panel mt-3 rounded-lg p-3" aria-live="polite" data-testid={`panel-construction-${active.id}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="construction-pulse mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"><Hammer size={12} /></div>
        <div className="min-w-0">
          <div className="eyebrow text-[hsl(var(--primary))]">{waitingForMaterials ? 'Materials requested' : 'Construction in progress'}</div>
          <div className="mt-1 truncate text-[10px] font-bold">{label}{items.length > 1 ? ` · ${items.length} queued` : ''}</div>
        </div>
      </div>
      <span className="mono shrink-0 text-[10px] text-[hsl(var(--primary))]">{waitingForMaterials ? 'awaiting materials' : duration(active.seconds)}</span>
    </div>
    <div className="mt-2"><Progress value={complete} tone="amber" /></div>
    <div className="mt-1 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{waitingForMaterials ? `${Math.floor(Math.max(0, complete))}% funded` : `${Math.floor(Math.max(0, complete))}% complete`}</span><span>{waitingForMaterials ? `needs ${missing}` : 'building now'}</span></div>
  </div>;
}
function HandcraftProgress({ job, recipe }: { job: HandcraftJob; recipe: Recipe }) {
  const output = recipeOutputs(recipe)[0];
  const finishing = job.seconds <= 0;
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
    <div className="mt-2"><Progress value={(1 - job.seconds / job.total) * 100} tone="amber" /></div>
    <div className="mt-1 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{finishing ? 'output will be stored above capacity if needed' : `${Math.floor(Math.max(0, 1 - job.seconds / job.total) * 100)}% complete`}</span><span>one item at a time</span></div>
  </div>;
}
function ManualMiningProgress({ job }: { job: ManualMiningJob }) {
  const complete = Math.floor(Math.max(0, 1 - job.seconds / job.total) * 100);
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
    <div className="mt-2"><Progress value={complete} tone="amber" /></div>
    <div className="mt-1 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{complete}% complete</span><span>one item at a time</span></div>
  </div>;
}

function FactoryPage({ state, setState, away, recovered, notice }: PageProps) {
  const active = totalUnits(state);
  const powerProduction = powerProductionFor(state);
  const draw = electricPowerDraw(state);
  const powerRatio = electricPowerRatioFor(state);
  const history = state.rateHistory ?? [];
  const historySeconds = history.reduce((total, sample) => total + sample.seconds, 0);
  const aggregateRate = (field: 'production' | 'consumption') => trackedKeys.reduce((total, key) => total + rateFromHistory(state, key, field), 0);
  const observedProduction = aggregateRate('production');
  const observedConsumption = aggregateRate('consumption');
  const netFlow = observedProduction - observedConsumption;
  const ratedCapacity = trackedKeys.reduce((total, key) => total + peakProductionRateFor(state, key), 0);
  const activeAssemblers = productionUnitCount(state);
  const starvedLines = componentKeys.filter((key) => {
    const recipe = recipeMap[key];
    return (state.assemblers[key] ?? 0) > 0 && !hasInputs(state, automatedRecipeInputs(recipe));
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
  return <PageFrame>
    {away >= 60 && recovered > 0 && <div className="surface mb-5 flex flex-col gap-3 rounded-xl border-[hsl(var(--secondary)/.4)] bg-[linear-gradient(100deg,hsl(174_35%_17%/.8),hsl(216_25%_14%/.96))] p-4 sm:flex-row sm:items-center sm:justify-between enter" data-testid="status-offline-production"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]"><RotateCcw size={18} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Network recovered</div><div className="mt-1 text-[13px] font-bold">{duration(away)} of offline production reconciled</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">The line added <span className="mono text-[hsl(var(--secondary))]">{fmt(recovered)} items</span> while the control room was closed.</div></div></div><button onClick={() => notice('offline report acknowledged')} className="button-base button-ghost shrink-0" data-testid="button-dismiss-offline">acknowledge <ArrowRight size={13} /></button></div>}
    <Header eyebrow="Live production network" title="Factory" copy="A dense readout of every operating group. Clear the first pressure point, then scale the network." action={<Tag><span className="status-dot status-running mini-pulse" /> line online · {state.simulationSpeed}x</Tag>} />
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 enter enter-delay-1">
      {[
        { label: 'Observed output', value: observedProduction.toFixed(1), suffix: historySeconds ? 'items / min' : 'awaiting sample', icon: TrendingUp, color: 'text-[hsl(var(--secondary))]' },
        { label: 'Network flow', value: `${netFlow >= 0 ? '+' : ''}${netFlow.toFixed(1)}`, suffix: historySeconds ? 'items / min net' : 'no samples yet', icon: Waves, color: netFlow < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--secondary))]' },
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
         <section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={`${constructionCount} queued`}>Construction queue</SectionTitle>{constructionCount ? <div className="space-y-2">{state.queue.map((item) => {
           const waitingForMaterials = item.started === false;
           const progress = waitingForMaterials
             ? Math.min(...(item.costs ?? []).map((cost, index) => (item.reserved?.[index] ?? 0) / Math.max(0.0001, cost.amount) * 100), 0)
             : (1 - item.seconds / item.total) * 100;
           return <div className="data-row flex items-center gap-3 rounded-lg p-2.5" key={item.id} data-testid={`row-factory-queue-${item.id}`}><div className="grid h-7 w-7 place-items-center rounded-md bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">{item.action === 'upgrade' ? <TrendingUp size={14} /> : <Hammer size={14} />}</div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold">{item.target} <span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">· {waitingForMaterials ? 'materials requested' : item.action}</span></div><Progress value={progress} tone="amber" /></div><span className="mono text-[10px] text-[hsl(var(--primary))]">{waitingForMaterials ? 'awaiting materials' : duration(item.seconds)}</span></div>;
         })}</div> : <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4"><div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]"><Clock3 size={14} /><span className="text-[11px]">Queue clear</span></div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Nothing is under construction. Choose a build from a control tab when the network is ready.</p></div>}</section>
        <section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={researchTarget ? `${Math.round(researchProgressPercentFor(state, researchTarget))}% complete` : `${state.research.length} complete`}>Research watch</SectionTitle>{researchTarget ? <div className="surface-soft rounded-lg p-3"><div className="flex items-start justify-between gap-2"><div><div className="eyebrow text-[hsl(var(--secondary))]">Active target</div><div className="mt-1 text-[12px] font-bold">{researchTarget.name}</div></div><FlaskConical size={17} className="text-[hsl(var(--secondary))]" /></div><div className="mt-3"><Progress value={researchProgressPercentFor(state, researchTarget)} /><div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{fmt(researchProgressFor(state, researchTarget))} / {fmt(researchUnitsFor(researchTarget))} units</span><span>{activeResearchTimeRemainingFor(state, researchTarget) === null ? 'triggered path' : duration(activeResearchTimeRemainingFor(state, researchTarget) ?? 0)}</span></div></div></div> : <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-3 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{researchableCount ? `${researchableCount} technology path${researchableCount === 1 ? '' : 's'} ready when you are.` : 'No research target is active right now.'}</div>}<Link href="/research" className="button-base button-ghost mt-3 w-full no-underline" data-testid="link-factory-research">open research <ArrowRight size={13} /></Link></section>
        <section className="surface rounded-xl p-4 sm:p-5"><div className="flex items-center justify-between"><SectionTitle detail={historySeconds ? `${Math.round(historySeconds)} sec sampled` : 'no samples'}>Network pulse</SectionTitle><Activity size={15} className="text-[hsl(var(--secondary))]" /></div>{pulseRates.length ? <><div className="grid-lines flex h-20 items-end gap-1 rounded-lg border border-[hsl(var(--border))] px-2 pb-2 pt-3">{pulseRates.map((rate, index) => <div key={`${rate}-${index}`} className="min-h-[3px] flex-1 rounded-t-sm bg-[hsl(var(--secondary)/.68)]" style={{ height: `${Math.max(4, rate / Math.max(pulsePeak, .01) * 100)}%` }} title={`${rate.toFixed(1)} items / min`} />)}</div><div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>oldest sample</span><span>now · {observedProduction.toFixed(1)} / min</span></div></> : <div className="grid h-20 place-items-center rounded-lg border border-dashed border-[hsl(var(--border))] text-center"><div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">Waiting for live rate samples</div><div className="mt-1 mono text-[9px] text-[hsl(var(--muted-foreground))]">The chart fills as the simulation ticks.</div></div></div>}</section>
      </div>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-4"><div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]"><Zap size={13} className="text-[hsl(var(--primary))]" /><span>Rated capacity <strong className="mono font-normal text-[hsl(var(--foreground))]">{ratedCapacity.toFixed(1)} items / min</strong> · live units only</span></div><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">LOCAL SAVE · AUTO-COMMIT EVERY TICK</span></div>
  </PageFrame>;
}

function MiningPage({ state, setState, enqueue, notice }: PageProps) {
  const tap = (key: RawKey) => {
    if (!manualMiningKeys.includes(key)) return notice(`${rawInfo[key].label} requires a machine`);
    if (state.manualMining) return notice(state.manualMining.resourceKey === key ? `already mining ${rawInfo[key].label.toLowerCase()}` : `finish mining ${rawInfo[state.manualMining.resourceKey].label.toLowerCase()} first`);
    setState((s) => ({ ...s, manualMining: { resourceKey: key, seconds: manualMiningSeconds, total: manualMiningSeconds } }));
    notice(`manual ${rawInfo[key].label.toLowerCase()} mining started`);
  };
  const build = (key: RawKey) => {
    if (key === 'wood') return notice('Wood can only be collected manually');
    if (key === 'water') { if (!state.research.includes('steam-power')) return notice('Steam Power required'); enqueue('pump', 'Water pump', 40, undefined, [{ key: 'ironPlate', amount: 10, source: 'products' }, { key: 'gear', amount: 2, source: 'products' }]); return; }
    if (key === 'crudeOil') {
      if (!state.research.includes('oil-gathering')) return notice('Oil Gathering required');
      enqueue('pumpjack', 'Crude oil pumpjack', pumpjackRecipe.energyRequired, undefined, pumpjackBuildCost);
      return;
    }
    if (key === 'uranium') { if (!state.research.includes('nuclear-power')) return notice('Nuclear Power required'); enqueue('uraniumMiner', 'Acid-powered uranium miner', 90, undefined, [{ key: 'steel', amount: 20, source: 'products' }, { key: 'circuit', amount: 8, source: 'products' }]); return; }
    const machineCosts = miningMachineBuildCostFor(state);
    const machine = miningMachineRecipeFor(state);
    enqueue('miner', `${rawInfo[key].label} ${miningMachineLabelFor(state).toLowerCase()}`, machine.energyRequired, key, machineCosts);
  };
  return <PageFrame>
    <Header eyebrow="Raw material control" title="Mining" copy={miningUsesStoredCoal(state) ? "Tap the ground to start. Build burner mining drills to make the ore lines autonomous. Wood remains manual-only, and coal drills offset their own fuel use against the coal they produce." : "Electric mining is online. Your upgraded drills run without coal while wood remains manual-only."} action={<Tag><Pickaxe size={11} /> 8 resource sections</Tag>} />
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
        const manualCollectionControl = <button onClick={() => tap(key)} disabled={!manualCollectionAvailable} className={`button-base !py-2 ${count ? '!px-2' : manualCollectionAvailable ? 'button-primary flex-1' : 'button-ghost flex-1 opacity-60'}`} aria-label={manualCollectionAvailable ? `Collect ${info.label} manually` : `${info.label} requires a machine`} title={manualCollectionAvailable ? 'Collect manually' : 'This material requires a machine'} data-testid={`button-tap-${key}`}>
          {!manualCollectionAvailable ? <><LockKeyhole size={13} />{!count && ' machine only'}</> : manualMiningJob ? <><Clock3 size={13} /> {manualMiningJob.seconds.toFixed(2)}s</> : manualMiningBusy ? <><Clock3 size={13} /> busy</> : <><Pickaxe size={13} />{!count && ' collect manually'}</>}
        </button>;
        const buildControl = manualOnly ? null : <button onClick={() => build(key)} className={`button-base !py-2 ${count ? 'flex-1' : '!px-3'} ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct ${machineLabel} for ${info.label}`} data-testid={count ? `button-build-more-${key}` : `button-build-miner-${key}`}>
          {isBuilding ? <><Check size={13} />{count && ' queued · build another'}</> : <>{count ? <><Hammer size={13} /> construct another</> : <Hammer size={13} />}</>}
        </button>;
        return <section className={`surface rounded-xl p-4 ${locked ? 'locked-wash opacity-75' : ''}`} key={key} data-testid={`section-mining-${key}`}>
          <div className="flex items-start gap-3">
            <div className="resource-orb">{<ResourceIcon item={key} size={29} />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate text-[13px] font-extrabold">{info.label}</h2>
                <div className="flex shrink-0 items-center gap-2">
                  {locked ? <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag> : autonomous ? <Tag><span className="status-dot status-running" /> auto</Tag> : <Tag tone="amber">manual</Tag>}
                  <div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title={`${machineLabel} count`}>
                    {isBurnerOre ? <ResourceIcon item={state.machineVariants.mining} size={17} /> : key === 'water' ? <Waves size={16} /> : key === 'crudeOil' ? <ResourceIcon item="pumpjack" size={17} /> : <Pickaxe size={16} />}
                    <span className="mono text-[13px]">{count}</span>
                  </div>
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
              <span className="resource-chip"><ResourceIcon item={key} size={17} /><strong>{machineLabel}</strong></span>
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
          <CompactMetricsRow production={productionRate} peakProduction={peakProductionRate} demand={demandRate} peakConsumption={peakDemandRate} net={productionRate - demandRate} storage={state.raw[key]} capacity={capFor(state, key)} />
          <BuildProgress items={constructionItems} label={constructionLabel} />
          <div className="mt-4 flex gap-2">
            {locked ? <button onClick={() => notice(`${info.needs} research required`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-locked-mining-${key}`}><LockKeyhole size={13} /> requires {info.needs}</button> : autonomous ? <><button onClick={() => notice(`${info.label} ${machineLabel.toLowerCase()} is running at ${productionRate.toFixed(1)} / min`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-inspect-mining-${key}`}><Gauge size={13} /> inspect live rate</button>{manualCollectionControl}{buildControl}</> : <>{manualCollectionControl}{buildControl}</>}
          </div>
           {manualMiningJob && <ManualMiningProgress job={manualMiningJob} />}
        </section>;
      })}
    </div>
    <div className="mt-5 surface rounded-xl border-[hsl(var(--secondary)/.25)] p-4"><div className="flex items-start gap-3"><div className="text-[hsl(var(--secondary))]"><Lightbulb size={17} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Mining rule</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Manual collection takes 2.5 seconds and remains available while automated drills run. Wood is manual-only, and hand-collected output can exceed storage capacity. Only one resource can be collected by hand at a time. Coal drills are self-fueled: their usage is offset from mined coal instead of stored fuel.</p></div></div></div>
  </PageFrame>;
}

function ProductionPage({ state, setState, enqueue, notice }: PageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [scienceFilter, setScienceFilter] = useState<RecipeScienceFilter>('Core');
  const automationUnlocked = state.research.includes('automation');
  const categories = useMemo(() => Array.from(new Set(recipeCatalog.map((recipe) => recipe.category))).sort(), []);
  const visibleRecipes = useMemo(() => orderedRecipeCatalog.filter((recipe) => !['solar-panel', 'pumpjack'].includes(recipe.name) && recipeIsUnlocked(recipe, state)).filter((recipe) => {
    const matchesQuery = !query.trim() || `${recipe.name} ${recipe.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (category === 'all' || recipe.category === category) && (scienceFilter === 'all' || recipe.scienceChain === scienceFilter);
  }), [category, query, scienceFilter, state]);
  const amountLabel = (amount: number) => Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2);
  const handcraft = (key: ComponentKey) => {
    const recipe = recipeMap[key];
    if (state.handcraft) return notice(state.handcraft.recipeKey === key ? `already handcrafting ${prettyLabel(key)}` : `finish handcrafting ${prettyLabel(state.handcraft.recipeKey)} first`);
    const missing = missingBuildMaterials(state, recipeBuildCosts(recipe));
    if (missing) return notice(`need ${missing}`);
    const outputs = recipeOutputs(recipe);
    setState((s) => {
      const next = { ...s, raw: { ...s.raw }, products: { ...s.products } };
      spendInputs(next, recipeInputs(recipe));
      next.handcraft = { recipeKey: key, seconds: recipe.energyRequired, total: recipe.energyRequired };
      return next;
    });
    notice(`handcrafting ${prettyLabel(outputs[0]?.key ?? recipe.name)}`);
  };
  const buildProductionUnit = (key: ComponentKey) => {
    const recipe = recipeMap[key];
    if (isSmeltingRecipe(recipe)) {
      enqueue('furnace', `${prettyLabel(key)} stone furnace`, stoneFurnaceRecipe.energyRequired, key, [{ key: 'stone', amount: stoneFurnaceBuildCost.stone, source: 'raw' }]);
      return;
    }
    if (!automationUnlocked) return notice('Automation technology required');
    const machineCosts = productionMachineBuildCostFor(state);
    const machine = productionMachineRecipeFor(state);
    enqueue('assembler', `${prettyLabel(key)} ${productionMachineLabelFor(state).toLowerCase()}`, machine.energyRequired, key, machineCosts);
  };
  return <PageFrame>
    <Header eyebrow="Recipe catalog" title="Production" copy="The attached recipe definitions drive every card below. Search the full line, inspect item and fluid flows, then run recipes manually or with the appropriate production building." action={<Tag><Cog size={11} /> {recipeCatalog.length} recipes loaded</Tag>} />
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[hsl(var(--muted-foreground))]"><span>Source data includes hidden and disabled definitions.</span><span className="mono">{visibleRecipes.length} visible · {recipeCatalog.filter((recipe) => recipe.scienceChain === 'Core').length} core / {recipeCatalog.filter((recipe) => recipe.scienceChain === 'Non-Core').length} non-core</span></div>
      <div className="data-row mt-3 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2"><ResourceIcon item="stone-furnace" size={18} /><span className="text-[10px] font-semibold">Stone Furnace</span><span className="ml-auto text-right text-[9px] text-[hsl(var(--muted-foreground))]">5 stone · {stoneFurnaceRecipe.energyRequired}s build · smelting fuel 0.1 coal/item</span></div>
      <div className="data-row mt-2 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2"><ResourceIcon item={state.machineVariants.assembly} size={18} /><span className="text-[10px] font-semibold">{productionMachineLabelFor(state)}</span><span className="ml-auto text-right text-[9px] text-[hsl(var(--muted-foreground))]">{productionMachineBuildCostFor(state).map((cost) => `${cost.amount} ${meta[cost.key]?.short ?? prettyLabel(cost.key).toLowerCase()}`).join(' + ')} · {productionMachineRecipeFor(state).energyRequired}s build · {assemblyMachineProductionSpeedFor(state).toFixed(2)} speed · {assemblyMachinePowerFor(state)} kW</span></div>
    </section>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleRecipes.map((recipe) => {
      const key = recipe.name;
      const outputs = recipeOutputs(recipe);
      const primaryOutput = outputs[0];
      const count = state.assemblers[key] ?? 0;
      const productionRate = recipeProductionRateFor(state, recipe);
      const peakProductionRate = primaryOutput ? peakProductionRateFor(state, primaryOutput.key) : 0;
      const demandRate = primaryOutput ? demandRateFor(state, primaryOutput.key) : 0;
      const peakDemandRate = primaryOutput ? peakDemandRateFor(state, primaryOutput.key) : 0;
      const netRate = productionRate - demandRate;
      const smelting = isSmeltingRecipe(recipe);
       const building = productionBuildingFor(state, recipe);
       const buildingLabel = smelting ? 'Stone Furnace' : productionMachineLabelFor(state);
      const buildingAction: QueueItem['action'] = smelting ? 'furnace' : 'assembler';
      const constructionItems = state.queue.filter((item) => item.action === buildingAction && item.targetId === key);
      const isBuilding = constructionItems.length > 0;
      const handcraftJob = state.handcraft?.recipeKey === key ? state.handcraft : null;
      const handcraftBusy = Boolean(state.handcraft && !handcraftJob);
      const handcraftControl = <button onClick={() => handcraft(key)} className={`button-base !py-2 ${count ? '!px-2' : 'button-primary flex-1'}`} aria-label={`Handcraft ${prettyLabel(key)}`} title={handcraftJob ? `Handcrafting ${prettyLabel(key)}` : handcraftBusy ? 'Another item is being handcrafted' : `Handcraft ${prettyLabel(key)}`} data-testid={`button-handcraft-production-${key}`}>{handcraftJob ? <><Clock3 size={13} /> {handcraftJob.seconds.toFixed(2)}s</> : handcraftBusy ? <Clock3 size={13} /> : <><Plus size={13} />{!count && ' handcraft'}</>}</button>;
      return <section className="surface rounded-xl p-4" key={key} data-testid={`section-production-${key}`}>
        <div className="flex items-start gap-3">
          <div className="resource-orb">{primaryOutput && <ResourceIcon item={primaryOutput.key} size={29} />}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">{prettyLabel(key)}</h2><div className="flex items-center gap-2">{count ? <Tag><span className="status-dot status-running" /> auto</Tag> : <Tag tone="amber">manual</Tag>}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title={`${buildingLabel} count`}><ResourceIcon item={building} size={17} /><span className="mono text-[13px]">{count}</span></div></div></div>
            <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{prettyLabel(recipe.category)} · {recipe.energyRequired}s cycle · {buildingLabel}</div>
             <div className="mt-1 flex flex-wrap gap-1"><Tag tone={recipe.scienceChain === 'Core' ? 'teal' : 'muted'}>{recipe.scienceChain}</Tag>{recipe.hidden && <Tag tone="muted">hidden</Tag>}{!recipe.enabled && <Tag tone="muted">research lock</Tag>}{recipe.results.length > 1 && <Tag tone="amber">multi-output</Tag>}</div>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3">
          <div className="eyebrow mb-2">Recipe</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {recipe.ingredients.map((material, index) => { const materialKey = keyForSource(material.name); return <span className="resource-chip" key={`${material.name}-${index}`}><ResourceIcon item={materialKey} size={17} /><strong>{amountLabel(materialAmount(material))}</strong> {meta[materialKey].short}</span>; })}
            <ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" />
            {outputs.map(({ key: outputKey, amount }, index) => <span className="resource-chip" style={{ borderColor: `${meta[outputKey].color}66` }} key={`${outputKey}-${index}`}><ResourceIcon item={outputKey} size={17} /><strong>{amountLabel(amount)}</strong> {meta[outputKey].short}</span>)}
          </div>
        </div>
        {smelting && recipe.fuel && <div className="mt-2 rounded-lg border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-3" data-testid={`panel-furnace-fuel-${key}`}><div className="flex items-center gap-2 text-[10px]"><ResourceIcon item={keyForSource(recipe.fuel.name)} size={17} /><span className="font-semibold">Furnace fuel</span><span className="ml-auto text-[9px] text-[hsl(var(--muted-foreground))]">coal usage</span></div><div className="mt-3 grid grid-cols-3 gap-2"><div><div className="eyebrow">Cost / item</div><div className="mono mt-1 text-[11px] text-[hsl(var(--primary))]">{amountLabel(furnaceCoalPerItemFor(recipe))}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">coal</div></div><div><div className="eyebrow">Current total</div><div className="mono mt-1 text-[11px] text-[hsl(var(--primary))]">{furnaceCoalUsageFor(state, recipe).toFixed(2)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">coal / min</div></div><div><div className="eyebrow">Peak potential</div><div className="mono mt-1 text-[11px] text-[hsl(var(--secondary))]">{furnaceCoalUsageFor(state, recipe, true).toFixed(2)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">coal / min</div></div></div></div>}
         <CompactMetricsRow production={productionRate} peakProduction={peakProductionRate} demand={demandRate} peakConsumption={peakDemandRate} net={netRate} storage={primaryOutput ? quantityFor(state, primaryOutput.key) : 0} capacity={primaryOutput ? capFor(state, primaryOutput.key) : 0} />
         <div className="mt-4 flex gap-2">{count ? <><button onClick={() => notice(`${prettyLabel(key)} ${buildingLabel.toLowerCase()} is running at ${productionRate.toFixed(1)} / min`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-inspect-production-${key}`}><Gauge size={13} /> inspect live rate</button>{handcraftControl}<button onClick={() => buildProductionUnit(key)} className={`button-base flex-1 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct another ${buildingLabel} for ${prettyLabel(key)}`} data-testid={`button-build-more-${buildingAction}-${key}`}>{isBuilding ? <><Check size={13} /> queued · build another</> : <><Hammer size={13} /> construct another</>}</button></> : <><button onClick={() => handcraft(key)} className="button-base button-primary flex-1 !py-2" data-testid={`button-handcraft-production-${key}`}><Plus size={13} /> handcraft</button><button onClick={() => buildProductionUnit(key)} className={`button-base !px-3 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct ${buildingLabel} for ${prettyLabel(key)}`} data-testid={`button-build-${buildingAction}-${key}`}>{isBuilding ? <Check size={13} /> : <Hammer size={13} />}</button></>}</div>
         {handcraftJob && <HandcraftProgress job={handcraftJob} recipe={recipe} />}
      </section>;
    })}</div>
  </PageFrame>;
}

function PowerPage({ state, setState, enqueue, notice }: PageProps) {
  const steam = state.research.includes('steam-power');
  const solar = state.research.includes('solar-energy');
  const boilersEnabled = state.boilersEnabled;
  const draw = electricPowerDraw(state);
  const production = powerProductionFor(state);
  const potential = steamEnginePeakPowerFor(state) + solarPowerFor(state);
  const boilerCoalStatus = boilerInputStatusFor(state, 'coal');
  const boilerWaterStatus = boilerInputStatusFor(state, 'water');
  const steamEngineSteamStatus = steamEngineInputStatusFor(state);
  const boilerConstructionItems = state.queue.filter((item) => item.action === 'boiler');
  const steamEngineConstructionItems = state.queue.filter((item) => item.action === 'steamEngine');
  const solarPanelConstructionItems = state.queue.filter((item) => item.action === 'solarPanel');
  const toggleBoilers = () => setState((s) => ({ ...s, boilersEnabled: !s.boilersEnabled }));
  const buildPowerUnit = (unit: 'boiler' | 'steamEngine' | 'solarPanel') => {
    const isSolarPanel = unit === 'solarPanel';
    if (!(isSolarPanel ? solar : steam)) return notice(isSolarPanel ? 'Solar Energy required' : 'Steam Power required');
    const costs = isSolarPanel ? solarPanelBuildCost : unit === 'boiler' ? boilerBuildCost : steamEngineBuildCost;
    enqueue(unit, isSolarPanel ? 'Solar panel' : unit === 'boiler' ? 'Boiler' : 'Steam engine', isSolarPanel ? solarPanelRecipe.energyRequired : unit === 'boiler' ? boilerRecipe.energyRequired : steamEngineRecipe.energyRequired, undefined, costs);
  };
  const constructionChips = (costs: BuildMaterialCost[], output: string) => <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Construction</div><div className="flex flex-wrap items-center gap-1.5">{costs.map(({ key, amount }, index) => <span className="contents" key={`${key}-${index}`}><span className="resource-chip"><ResourceIcon item={key} size={17} /><strong>{amount}</strong> {meta[key]?.short ?? prettyLabel(key)}</span>{index < costs.length - 1 && <span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">+</span>}</span>)}<ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--primary)/.4)' }}><ResourceIcon item={output} size={17} /><strong>1</strong> {prettyLabel(output)}</span></div></div>;
  const statusTag = (unlocked: boolean, count: number, queued: number) => unlocked ? count ? <Tag><span className="status-dot status-running" /> auto</Tag> : queued > 0 ? <Tag tone="amber"><Clock3 size={10} /> queued</Tag> : <Tag tone="amber">offline</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag>;
  const boilerStatusTag = !steam ? statusTag(false, state.boilers, boilerConstructionItems.length) : state.boilers > 0 && !boilersEnabled ? <Tag tone="amber"><Power size={10} /> disabled</Tag> : statusTag(true, state.boilers, boilerConstructionItems.length);
  return <PageFrame>
    <Header eyebrow="Energy network" title="Power" copy="Power producers run at their rated output. Boilers get first claim on coal, and you can disable boiler production when fuel supply needs to recover." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><BatteryCharging size={17} className="text-[hsl(var(--secondary))]" /><span className="mono text-[15px]">{powerLabel(production)} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">MW produced</span></span></div>} />
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="surface rounded-xl p-4"><div className="eyebrow">Production</div><div className="mono mt-2 text-xl text-[hsl(var(--secondary))]">{powerLabel(production)} MW</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">current generation</div></div>
      <div className="surface rounded-xl p-4"><div className="eyebrow">Peak potential</div><div className="mono mt-2 text-xl text-[hsl(var(--secondary))]">{powerLabel(potential)} MW</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">available at full input</div></div>
      <div className="surface rounded-xl p-4"><div className="eyebrow">Factory draw</div><div className="mono mt-2 text-xl">{powerLabel(draw)} MW</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">labs + electric machines</div></div>
      <div className="surface rounded-xl p-4"><div className="eyebrow">Net balance</div><div className={`mono mt-2 text-xl ${production >= draw ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{powerLabel(production - draw)} MW</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">generation minus draw</div></div>
    </div>
    <section className="surface rounded-xl p-4 sm:p-5">
      <SectionTitle detail={`${steam ? 'steam power unlocked' : 'steam power locked'} · ${solar ? 'solar online' : 'solar locked'}`}>Production cards</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className={`rounded-xl border p-3.5 sm:p-4 ${steam ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-boiler">
          <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="boiler" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Boiler</h2><div className="flex items-center gap-2">{boilerStatusTag}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Boiler count"><ResourceIcon item="boiler" size={17} /><span className="mono text-[13px]">{state.boilers}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Crafting · fuel and water to steam · Boiler</p><div className="mt-1 flex flex-wrap gap-1"><Tag tone={steam && boilersEnabled ? 'teal' : 'muted'}>{steam ? boilersEnabled ? 'steam line · enabled' : 'steam line · disabled' : 'research lock'}</Tag>{boilerConstructionItems.length > 0 && <Tag tone="muted">construction queued</Tag>}</div></div></div>
           <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Maximum-rate process · each boiler</div><div className="grid grid-cols-3 gap-2"><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Water usage</div><div className="mono mt-1 text-[12px] text-[hsl(var(--primary))]">{boilerWaterPerSecond.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">water / sec</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Coal usage</div><div className="mono mt-1 text-[12px] text-[hsl(var(--primary))]">{boilerCoalPerSecond.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">coal / sec</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Steam output</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{boilerSteamPerSecond.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">steam / sec</div></div></div></div>
           <div className="mt-2 grid gap-2 sm:grid-cols-2"><SupplyStatus label="Coal input" status={boilerCoalStatus} testId="status-power-boiler-coal" /><SupplyStatus label="Water input" status={boilerWaterStatus} testId="status-power-boiler-water" /></div>
          {constructionChips(boilerBuildCost, 'boiler')}
          <PowerMetrics production={boilerSteamRateFor(state)} peakProduction={boilerPeakSteamRateFor(state)} productionUnit="steam / min" consumption={boilerCoalUsageFor(state) + boilerWaterUsageFor(state)} peakConsumption={boilerPeakCoalUsageFor(state) + boilerPeakWaterUsageFor(state)} consumptionUnit="inputs / min" />
          <BuildProgress items={boilerConstructionItems} label="Boiler" />
           {steam && state.boilers > 0 && <button onClick={toggleBoilers} className={`button-base mt-4 w-full !py-2 ${boilersEnabled ? 'button-ghost' : 'button-primary'}`} aria-pressed={boilersEnabled} data-testid="button-toggle-boilers"><Power size={13} /> {boilersEnabled ? 'disable boiler production' : 'enable boiler production'}</button>}
          <div className="mt-4 flex gap-2">{steam && state.boilers ? <><button onClick={() => notice(`boilers are producing ${boilerSteamRateFor(state).toFixed(1)} steam / min`)} className="button-base button-ghost flex-1 !py-2" data-testid="button-inspect-power-boiler"><Gauge size={13} /> inspect live rate</button><button onClick={() => buildPowerUnit('boiler')} className={`button-base flex-1 !py-2 ${boilerConstructionItems.length ? 'button-build-active' : 'button-ghost'}`} data-testid="button-build-more-boiler">{boilerConstructionItems.length ? <><Check size={13} /> queued · build another</> : <><Hammer size={13} /> construct another</>}</button></> : <button onClick={() => buildPowerUnit('boiler')} className="button-base button-primary flex-1 !py-2" data-testid="button-build-boiler">{steam ? <><Hammer size={13} /> construct boiler</> : <><LockKeyhole size={13} /> requires Steam Power</>}</button>}</div>
        </article>
        <article className={`rounded-xl border p-3.5 sm:p-4 ${steam ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-steam-engine">
          <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="steam-engine" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Steam engine</h2><div className="flex items-center gap-2">{statusTag(steam, state.steamEngines, steamEngineConstructionItems.length)}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Steam engine count"><ResourceIcon item="steam-engine" size={17} /><span className="mono text-[13px]">{state.steamEngines}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Power generation · steam to electricity · Steam engine</p><div className="mt-1 flex flex-wrap gap-1"><Tag tone={steam ? 'teal' : 'muted'}>{steam ? 'steam line' : 'research lock'}</Tag>{steamEngineConstructionItems.length > 0 && <Tag tone="muted">construction queued</Tag>}</div></div></div>
           <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Maximum-rate process · each engine</div><div className="grid grid-cols-2 gap-2"><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Steam usage</div><div className="mono mt-1 text-[12px] text-[hsl(var(--primary))]">{steamEngineSteamPerSecond.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">steam / sec</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Power output</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{steamEnginePowerMw.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">MW</div></div></div></div>
           <div className="mt-2"><SupplyStatus label="Steam input" status={steamEngineSteamStatus} testId="status-power-steam-engine-steam" /></div>
          {constructionChips(steamEngineBuildCost, 'steam-engine')}
          <PowerMetrics production={steamEnginePowerFor(state)} peakProduction={steamEnginePeakPowerFor(state)} productionUnit="MW" consumption={steamEngineSteamUsageFor(state)} peakConsumption={steamEnginePeakSteamUsageFor(state)} consumptionUnit="steam / min" />
          <BuildProgress items={steamEngineConstructionItems} label="Steam engine" />
          <div className="mt-4 flex gap-2">{steam && state.steamEngines ? <><button onClick={() => notice(`steam engines are producing ${steamEnginePowerFor(state).toFixed(1)} MW`)} className="button-base button-ghost flex-1 !py-2" data-testid="button-inspect-power-steam-engine"><Gauge size={13} /> inspect live rate</button><button onClick={() => buildPowerUnit('steamEngine')} className={`button-base flex-1 !py-2 ${steamEngineConstructionItems.length ? 'button-build-active' : 'button-ghost'}`} data-testid="button-build-more-steam-engine">{steamEngineConstructionItems.length ? <><Check size={13} /> queued · build another</> : <><Hammer size={13} /> construct another</>}</button></> : <button onClick={() => buildPowerUnit('steamEngine')} className="button-base button-primary flex-1 !py-2" data-testid="button-build-steam-engine">{steam ? <><Hammer size={13} /> construct steam engine</> : <><LockKeyhole size={13} /> requires Steam Power</>}</button>}</div>
        </article>
          <article className={`rounded-xl border p-3.5 sm:p-4 ${solar ? 'surface-soft' : 'locked-wash opacity-60 grayscale'}`} data-testid="card-power-solar">
           <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="solar-panel" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Solar panels</h2><div className="flex items-center gap-2">{statusTag(solar, state.solarPanels, solarPanelConstructionItems.length)}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Solar panel count"><ResourceIcon item="solar-panel" size={17} /><span className="mono text-[13px]">{state.solarPanels}</span></div></div></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Power generation · passive sunlight conversion · Solar panel</p><div className="mt-1 flex flex-wrap gap-1"><Tag tone={solar ? 'teal' : 'muted'}>{solar ? 'solar line' : 'research lock'}</Tag>{solarPanelConstructionItems.length > 0 && <Tag tone="muted">construction queued</Tag>}</div></div></div>
           <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Passive generation · no production recipe</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip"><Sun size={16} /><strong>sunlight</strong></span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--secondary)/.4)' }}><Zap size={16} /><strong>{solarPanelBasePowerKw}</strong> kW base / panel</span></div></div>
           {constructionChips(solarPanelBuildCost, 'solar-panel')}
           <div className="mt-3 grid grid-cols-3 gap-2"><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Potential output</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{solarPanelPotentialPowerKwFor(state).toFixed(1)} kW</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">{solarPanelBasePowerKw} kW / panel</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Efficiency factor</div><div className="mono mt-1 text-[12px] text-[hsl(var(--primary))]">{(solarPanelEfficiency * 100).toFixed(0)}%</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">current factor</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">Net output</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{solarPanelNetPowerKwFor(state).toFixed(1)} kW</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">factory supply</div></div></div>
           <BuildProgress items={solarPanelConstructionItems} label="Solar panel" />
           <div className="mt-4 flex gap-2">{solar && state.solarPanels ? <><button onClick={() => notice(`solar panels are supplying ${solarPowerFor(state).toFixed(3)} MW net`)} className="button-base button-ghost flex-1 !py-2" data-testid="button-inspect-power-solar"><Gauge size={13} /> inspect output</button><button onClick={() => buildPowerUnit('solarPanel')} className={`button-base flex-1 !py-2 ${solarPanelConstructionItems.length ? 'button-build-active' : 'button-ghost'}`} data-testid="button-build-more-solar-panel">{solarPanelConstructionItems.length ? <><Check size={13} /> queued · build another</> : <><Hammer size={13} /> construct another</>}</button></> : <button onClick={() => buildPowerUnit('solarPanel')} className="button-base button-primary flex-1 !py-2" data-testid="button-build-solar-panel">{solar ? <><Hammer size={13} /> construct solar panel</> : <><LockKeyhole size={13} /> requires Solar Energy</>}</button>}</div>
         </article>
      </div>
    </section>
      <p className="mt-5 text-[10px] text-[hsl(var(--muted-foreground))]"><Info size={13} className="mr-1 inline text-[hsl(var(--secondary))]" /> Boilers reserve coal before miners and furnaces. Disable boiler production to stop its coal and water demand while the rest of the factory recovers; electrically powered production still slows when network demand exceeds generation.</p>
  </PageFrame>;
}

function PowerDependencyTreePage({ state, notice }: PageProps) {
  const steam = state.research.includes('steam-power'); const solar = state.research.includes('solar-energy'); const nuclear = state.research.includes('nuclear-power'); const draw = electricPowerDraw(state); const production = powerProductionFor(state);
  const Node = ({ title, sub, icon, active, locked }: { title: string; sub: string; icon: ReactNode; active?: boolean; locked?: boolean }) => <div className={`tree-line flex items-center gap-3 rounded-xl border p-3 ${active ? 'border-[hsl(var(--secondary)/.5)] bg-[hsl(174_30%_15%/.7)]' : locked ? 'locked-wash border-[hsl(var(--border))] opacity-65' : 'border-[hsl(var(--border))] bg-[hsl(216_24%_11%/.7)]'}`}><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{locked ? <LockKeyhole size={15} /> : icon}</div><div className="min-w-0"><div className="text-[11px] font-bold">{title}</div><div className="mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">{sub}</div></div><div className="ml-auto">{active ? <Tag>online</Tag> : locked ? <Tag tone="muted">research</Tag> : <Tag tone="amber">standby</Tag>}</div></div>;
  return <PageFrame><Header eyebrow="Energy network" title="Power" copy="Power is a dependency tree, not a single number. Research a generation family, then watch its conversion chain come online." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><BatteryCharging size={17} className="text-[hsl(var(--secondary))]" /><span className="mono text-[15px]">{production} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">MW produced</span></span></div>} /><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="surface rounded-xl p-4"><div className="eyebrow">Production</div><div className="mono mt-2 text-xl text-[hsl(var(--secondary))]">{production} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Factory draw</div><div className="mono mt-2 text-xl">{draw} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Net balance</div><div className={`mono mt-2 text-xl ${production >= draw ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{production - draw} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Machine load</div><div className="mono mt-2 text-xl">{productionMachineLabelFor(state)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{assemblyMachinePowerFor(state)} kW per assembly machine · {state.machineVariants.mining === 'electric-mining-drill' ? `${miningMachinePowerFor(state)} kW per miner` : 'burner drills use coal'}</div></div></div><div className="grid gap-5 lg:grid-cols-3"><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={steam ? 'online' : 'locked'}>Steam generation</SectionTitle><div className="space-y-4"><Node title="Boiler" sub="coal + water → heat" icon={<FlameIcon />} active={steam} locked={!steam} /><Node title="Steam" sub="pressurized thermal fluid" icon={<Waves size={16} />} active={steam} locked={!steam} /><Node title="Steam engine" sub="80 MW potential" icon={<Gauge size={16} />} active={steam} locked={!steam} /></div><button onClick={() => notice(steam ? 'steam chain is online' : 'unlock Steam Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-steam">{steam ? 'inspect steam chain' : 'view steam dependency'}</button></section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={solar ? 'online' : 'locked'}>Solar generation</SectionTitle><div className="space-y-4"><Node title="Solar array" sub="sunlight → current" icon={<Sun size={16} />} active={solar} locked={!solar} /><Node title="Inverter bank" sub="stable daytime output" icon={<Zap size={16} />} active={solar} locked={!solar} /><Node title="Power bus" sub="0.03 MW per panel after 50% efficiency" icon={<Power size={16} />} active={solar} locked={!solar} /></div><button onClick={() => notice(solar ? 'solar array is online' : 'unlock Solar Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-solar">{solar ? 'inspect solar chain' : 'view solar dependency'}</button></section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={nuclear ? 'online' : 'locked'}>Nuclear generation</SectionTitle><div className="space-y-4"><Node title="Nuclear reactor" sub="uranium + acid → heat" icon={<Sparkles size={16} />} active={nuclear} locked={!nuclear} /><Node title="Heat exchanger" sub="heat → steam" icon={<Waves size={16} />} active={nuclear} locked={!nuclear} /><Node title="Power turbine" sub="180 MW potential" icon={<Gauge size={16} />} active={nuclear} locked={!nuclear} /></div><button onClick={() => notice(nuclear ? 'nuclear chain is online' : 'unlock Nuclear Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-nuclear">{nuclear ? 'inspect nuclear chain' : 'view nuclear dependency'}</button></section></div><p className="mt-5 text-[10px] text-[hsl(var(--muted-foreground))]"><Info size={13} className="mr-1 inline text-[hsl(var(--secondary))]" /> Power families are gated by research and represented as a clear production tree before you build them.</p></PageFrame>;
}
function FlameIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 2.8c.4 3-1.3 4.2-2.4 5.4-1 1-1.2 2.3-.6 3.3.4-1.3 1.5-2.3 2.8-2.7 2.6 2 3.8 4.3 3.2 7.1-.4 1.8-1.7 3.2-3.3 4.1 4.7-.8 7-4 6.2-8.4-.5-2.8-2.5-5.8-5.9-8.8ZM10 12c-3.7 1.4-5.4 4-4.6 6.6.6 2 2.3 3.4 4.5 4-1.2-1.2-1.5-2.6-.6-4.1.7-1.2 1.6-2.1 2.6-2.6-1.1-1-1.8-2.3-1.9-3.9Z"/></svg>; }

function StoragePage({ state, setState, enqueue, notice }: PageProps) {
  const buildStorage = (key: TrackedKey) => {
    const fluid = isFluidKey(key);
    if (fluid && !canPurchaseStorageFor(key, fluidKeys, state.research)) return notice('Fluid Handling required');
    const constructionItems = state.queue.filter((item) => item.action === 'storage' && item.targetId === key);
    const costs = fluid ? storageTankBuildCost : [{ key: 'wood', amount: storageBoxWoodCost, source: 'raw' as const }];
    const buildSeconds = fluid ? storageTankRecipe.energyRequired : storageBoxBuildSeconds;
    const containerLabel = fluid ? 'storage tank' : 'wooden box';
    enqueue('storage', `${containerLabel[0].toUpperCase()}${containerLabel.slice(1)} · ${meta[key].label}`, buildSeconds, key, costs);
    notice(`${containerLabel} for ${meta[key].label} queued`);
  };
  const unlockedKeys = orderedTrackedKeys.filter((key) => unlockedProductKeys(state).has(key));
  const [scienceFilter, setScienceFilter] = useState<RecipeScienceFilter>('Core');
  const visibleKeys = unlockedKeys.filter((key) => scienceFilter === 'all' || trackedScienceChainFor(key) === scienceFilter);
  return <PageFrame>
    <Header eyebrow="Buffer control" title="Storage" copy="Item buffers use wooden boxes. Fluids start with 100 units of base capacity, then expand with storage tanks after Fluid Handling research." action={<Tag><Box size={11} /> {visibleKeys.length} visible items</Tag>} />
    <section className="surface rounded-xl p-2.5 sm:p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="eyebrow">Science chain filter</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{unlockedKeys.length} unlocked · {unlockedKeys.filter((key) => trackedScienceChainFor(key) === 'Core').length} core / {unlockedKeys.filter((key) => trackedScienceChainFor(key) === 'Non-Core').length} non-core</div></div><select value={scienceFilter} onChange={(event) => setScienceFilter(event.target.value as RecipeScienceFilter)} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none" aria-label="Filter storage science chain" data-testid="select-storage-science-filter"><option value="all">All items</option><option value="Core">Core items</option><option value="Non-Core">Non-Core items</option></select></div>
      <div className="space-y-2">
        {visibleKeys.map((key) => {
          const amount = quantityFor(state, key);
          const capacity = capFor(state, key);
          const fluid = isFluidKey(key);
          const canPurchase = canPurchaseStorageFor(key, fluidKeys, state.research);
          const containerCount = containerCountFor(state, key);
          const containerLabel = fluid ? 'storage tank' : 'wooden box';
          const containerIcon = fluid ? 'storage-tank' : 'wooden-chest';
          const costs = fluid ? storageTankBuildCost : [{ key: 'wood', amount: storageBoxWoodCost, source: 'raw' as const }];
          const buildSeconds = fluid ? storageTankRecipe.energyRequired : storageBoxBuildSeconds;
          const constructionItems = state.queue.filter((item) => item.action === 'storage' && item.targetId === key);
          const isBuilding = constructionItems.length > 0;
          return <section className="data-row rounded-lg p-2.5" key={key} data-testid={`row-storage-${key}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="resource-orb !h-8 !w-8 shrink-0"><ResourceIcon item={key} size={22} /></div>
              <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold">{meta[key].label}</div><div className="text-[9px] text-[hsl(var(--muted-foreground))]">{meta[key].category} · {trackedScienceChainFor(key)}</div></div>
               <div className="flex shrink-0 items-center gap-1.5 text-[hsl(var(--secondary))]" title={`${containerCount} ${containerLabel}${containerCount === 1 ? '' : 's'}`}>
                 <ResourceIcon item={containerIcon} size={17} /><span className="mono text-[11px]">{containerCount}</span>
              </div>
               <button onClick={() => buildStorage(key)} disabled={fluid && !canPurchase} className={`button-base button-ghost !gap-1 !px-2 !py-1.5 ${isBuilding ? 'button-build-active' : ''}`} aria-label={fluid && !canPurchase ? `Fluid Handling required to construct a storage tank for ${meta[key].label}` : `Construct another ${containerLabel} for ${meta[key].label}`} title={fluid && !canPurchase ? 'Fluid Handling required' : fluid ? `Construct another storage tank · ${costs.map((cost) => `${cost.amount} ${meta[cost.key]?.short ?? prettyLabel(cost.key).toLowerCase()}`).join(' + ')} · ${buildSeconds} sec` : `Construct another wooden box · ${storageBoxWoodCost} wood · ${storageBoxBuildSeconds} sec`} data-testid={`button-build-storage-${key}`}>
                 {fluid && !canPurchase ? <><LockKeyhole size={12} /><span className="hidden sm:inline">Fluid Handling</span></> : <>{isBuilding ? <Check size={12} /> : <Plus size={12} />}<span className="hidden sm:inline">{fluid ? 'tank' : 'box'}</span>{fluid ? costs.map((cost) => <span className="contents" key={`${cost.source}-${cost.key}`}><ResourceIcon item={cost.key} size={13} /><span className="mono text-[9px] text-[hsl(var(--primary))]">{fmt(cost.amount)}</span></span>) : <><ResourceIcon item="wood" size={13} /><span className="mono text-[9px] text-[hsl(var(--primary))]">{storageBoxWoodCost}</span></>}</>}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2" aria-label={`${meta[key].label}: ${fmt(amount)} in stock, capacity ${fmt(capacity)}`}>
              <span className="mono w-12 shrink-0 text-[11px]" title="Current stock">{fmt(amount)}</span>
              <div className="min-w-0 flex-1"><Progress value={amount / capacity * 100} /></div>
              <span className="mono w-14 shrink-0 text-right text-[11px]" title="Total capacity">{fmt(capacity)}</span>
            </div>
             {isBuilding && <BuildProgress items={constructionItems} label={`${fluid ? 'Storage tank' : 'Wooden box'} · ${meta[key].label}`} />}
          </section>;
        })}
      </div>
    </section>
  </PageFrame>;
}

function LogisticsPage({ notice }: PageProps) {
  const entries = [{ title: 'Inserters', copy: 'Short-range item handoff between machines.', icon: ArrowRight }, { title: 'Conveyor belts', copy: 'Continuous item movement across production blocks.', icon: MoveRight }, { title: 'Power lines', copy: 'Extend a power bus beyond the starter block.', icon: Zap }, { title: 'Transport robots', copy: 'On-demand routing for a distributed factory.', icon: Truck }, { title: 'Trains', copy: 'Long-haul bulk transport between distant sectors.', icon: Truck }];
  return <PageFrame><Header eyebrow="Later-stage systems" title="Logistics" copy="The line is not ready for a freight network yet. These systems are mapped here so future expansion has a clear shape." action={<Tag tone="amber"><Clock3 size={11} /> coming later</Tag>} /><section className="surface rounded-xl p-4 sm:p-5"><div className="mb-5 flex items-start gap-3 rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] p-4"><div className="text-[hsl(var(--primary))]"><Info size={17} /></div><div><div className="eyebrow text-[hsl(var(--primary))]">Later-stage tab</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">These are intentionally visible but non-functional. No fake throughput, no pretend routing — just the systems waiting beyond the first efficient loop.</p></div></div><div className="grid gap-3 sm:grid-cols-2">{entries.map(({ title, copy, icon: Icon }) => <button onClick={() => notice(`${title} is planned for a later stage`)} className="locked-wash flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-4 text-left transition-colors hover:border-[hsl(var(--secondary)/.4)]" key={title} data-testid={`button-logistics-${title.toLowerCase().replace(' ', '-')}`}><div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><Icon size={17} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[12px] font-bold">{title}<Tag tone="muted"><LockKeyhole size={9} /> later</Tag></div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{copy}</p></div><ChevronRight size={15} className="text-[hsl(var(--muted-foreground))]" /></button>)}</div></section></PageFrame>;
}

function UpgradesPage({ state, setState, notice }: PageProps) {
  const activeUpgrade = state.queue.find((item) => item.action === 'upgrade');
  const costLabel = (cost: BuildMaterialCost) => `${fmt(cost.amount)} ${meta[cost.key]?.short ?? prettyLabel(cost.key).toLowerCase()}`;
  const costChips = (costs: BuildMaterialCost[]) => <div className="flex flex-wrap gap-1.5">{costs.map((cost) => <span className="resource-chip !px-1.5 !py-1" key={`${cost.source}-${cost.key}`}><ResourceIcon item={cost.key} size={16} />{costLabel(cost)}</span>)}</div>;
  const startUpgrade = (upgrade: UpgradeDefinition) => {
    const jobId = `upgrade-${Date.now()}`;
    const result = beginUpgrade({
      raw: state.raw,
      products: state.products,
      research: state.research,
      machineVariants: state.machineVariants,
      machineCounts: { assembly: electricAssemblerCount(state), mining: burnerMinerCount(state) },
      queue: state.queue,
    }, upgrade.id, jobId);
    if (!result.ok) return notice(result.message);
    setState((s) => ({ ...s, raw: result.state.raw, products: result.state.products, queue: result.state.queue as QueueItem[] }));
    notice(`${upgrade.name} started for ${result.job.machineCount} machine${result.job.machineCount === 1 ? '' : 's'}`);
  };
  return <PageFrame>
    <Header eyebrow="Machine conversion" title="Upgrades" copy="Convert every relevant machine in one timed job. The full cost is reserved when an upgrade starts, and only one conversion can run at a time." action={<Tag><TrendingUp size={11} /> 2 machine upgrades</Tag>} />
    <section className="surface mb-5 rounded-xl border-[hsl(var(--primary)/.25)] bg-[linear-gradient(100deg,hsl(34_28%_16%/.82),hsl(216_25%_14%/.96))] p-4 sm:p-5">
      <div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><Info size={17} /></div><div><div className="eyebrow text-[hsl(var(--primary))]">How conversion works</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Costs are calculated from the current number of relevant machines, deducted immediately, and all matching machines change variant together when the timer completes. Construction elsewhere in the factory can continue.</p></div></div>
    </section>
    <div className="grid gap-3 md:grid-cols-2">
      {upgradeData.map((item) => {
        const Icon = item.machineGroup === 'assembly' ? Cog : Pickaxe;
        const machineCount = machineCountForUpgrade(state, item);
        const complete = state.machineVariants[item.machineGroup] === item.newMachine;
        const prerequisiteMet = state.research.includes(item.prerequisiteTechnology);
        const queued = activeUpgrade?.targetId === item.id;
        const totalCosts = scaledBuildCosts(item.upgradeCostPerMachine, machineCount);
        const missing = complete || !machineCount ? '' : missingBuildMaterials(state, totalCosts);
        const conversionCount = activeUpgrade?.machineCount ?? machineCount;
        const totalSeconds = activeUpgrade?.total ?? item.upgradeTimePerMachine * conversionCount;
        const canStart = !complete && !activeUpgrade && prerequisiteMet && machineCount > 0 && !missing;
        const progress = queued && activeUpgrade ? (1 - activeUpgrade.seconds / activeUpgrade.total) * 100 : 0;
        return <section className="surface rounded-xl p-4 sm:p-5" key={item.id} data-testid={`card-upgrade-${item.id}`}>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Icon size={18} /></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[13px] font-extrabold">{item.name}</h2>{complete ? <Tag><Check size={10} /> installed</Tag> : queued ? <Tag tone="amber"><Clock3 size={10} /> converting</Tag> : !prerequisiteMet ? <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag> : <Tag tone="amber">available</Tag>}</div><p className="mt-1 text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">{item.copy}</p></div>
          </div>
          {queued && activeUpgrade && <div className="construction-panel mt-4 rounded-lg p-3" aria-live="polite" data-testid={`panel-upgrade-progress-${item.id}`}><div className="flex items-start justify-between gap-3"><div><div className="eyebrow text-[hsl(var(--primary))]">Upgrade in progress</div><div className="mt-1 text-[10px] font-bold">{conversionCount} {item.relevantMachine.toLowerCase()}{conversionCount === 1 ? '' : 's'} converting</div></div><span className="mono text-[10px] text-[hsl(var(--primary))]">{duration(activeUpgrade.seconds)}</span></div><div className="mt-2"><Progress value={progress} tone="amber" /></div><div className="mt-1 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{Math.floor(Math.max(0, progress))}% complete</span><span>{totalSeconds.toFixed(1)}s total</span></div></div>}
          <div className="mt-4 grid gap-2 text-[10px]">
            <div className="data-row rounded-lg p-2.5"><div className="eyebrow">Prerequisite</div><div className={`mt-1 flex items-center gap-1.5 font-semibold ${prerequisiteMet ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{prerequisiteMet ? <Check size={12} /> : <LockKeyhole size={12} />}{prettyLabel(item.prerequisiteTechnology)}</div></div>
            <div className="data-row rounded-lg p-2.5"><div className="eyebrow">Relevant machine</div><div className="mt-1 flex items-center justify-between gap-2"><span className="font-semibold">{item.relevantMachine}</span><span className="mono text-[hsl(var(--secondary))]">{machineCount} built</span></div></div>
            <div className="data-row rounded-lg p-2.5"><div className="eyebrow">Cost per machine · {item.upgradeTimePerMachine}s</div><div className="mt-2">{costChips(item.upgradeCostPerMachine)}</div></div>
            <div className="data-row rounded-lg p-2.5"><div className="eyebrow">New machine</div><div className="mt-1 flex items-center gap-2 font-semibold"><ResourceIcon item={item.newMachine} size={18} />{item.newMachineLabel}<span className="ml-auto mono text-[hsl(var(--secondary))]">{item.newMachinePowerDraw} kW · speed {item.newMachineProductionSpeed}</span></div><div className="mt-2">{costChips(item.newMachineMaterialCost)}</div></div>
          </div>
          {!complete && <div className="mt-4 border-t border-[hsl(var(--border))] pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="eyebrow">Current conversion</div><div className="mono mt-1 text-[10px] text-[hsl(var(--primary))]">{machineCount ? `${machineCount} machines · ${totalSeconds.toFixed(1)}s · total cost` : 'No relevant machines built'}</div></div><button onClick={() => startUpgrade(item)} disabled={!canStart} className="button-base button-primary !py-2 disabled:cursor-not-allowed disabled:opacity-45" data-testid={`button-start-upgrade-${item.id}`}><TrendingUp size={13} /> {activeUpgrade ? 'upgrade busy' : missing ? `need ${missing}` : !prerequisiteMet ? 'locked' : !machineCount ? 'build machines first' : 'start upgrade'}</button></div>{machineCount > 0 && <div className="mt-2 text-[9px] text-[hsl(var(--muted-foreground))]">Total reserved now: {totalCosts.map(costLabel).join(' + ')}</div>}</div>}
        </section>;
      })}
    </div>
  </PageFrame>;
}

function SciencePage({ state, setState, enqueue, notice }: PageProps) {
  const activeResearch = activeResearchFor(state);
  const requiredScienceKeys = scienceRequirementKeysFor(activeResearch);
  const currentSpm = scienceCurrentSpmFor(state, requiredScienceKeys);
  const peakSpm = sciencePeakSpmFor(state, requiredScienceKeys);
  const labRate = scienceLabRateFor(state, activeResearch);
  const buildLab = () => { enqueue('lab', 'Science lab', labRecipe.energyRequired, undefined, [{ key: 'ironPlate', amount: 12, source: 'products' }, { key: 'circuit', amount: 4, source: 'products' }]); };
  const labConstructionItems = state.queue.filter((item) => item.action === 'lab');
  const labIsBuilding = labConstructionItems.length > 0;
  const currentLabUsage = requiredScienceKeys.reduce((total, key) => total + demandRateFor(state, key), 0);
  const peakLabUsage = activeResearch ? activeResearch.scienceCosts.reduce((total, cost) => total + scienceLabRateFor(state, activeResearch, false) * cost.amount, 0) : 0;
  const amountLabel = (amount: number) => Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2);
  return <PageFrame>
    <Header eyebrow="Research fuel" title="Science" copy="Labs consume every science pack required by the active research. SPM is limited by lab capacity and the tightest available pack line." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><FlaskConical size={17} className="text-[hsl(var(--primary))]" /><span className="mono text-[15px]">{currentSpm.toFixed(1)} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">SPM</span></span></div>} />
    <section className="surface mb-5 rounded-xl p-4 sm:p-5">
       <div className="mb-5 flex items-center justify-between gap-3"><SectionTitle detail={activeResearch ? `${requiredScienceKeys.length} pack types required` : 'select research to run labs'}>Science throughput</SectionTitle></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="surface-soft rounded-lg p-3"><div className="eyebrow">Current SPM</div><div className="mono mt-2 text-xl text-[hsl(var(--primary))]">{currentSpm.toFixed(1)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">actual recent consumption</div></div>
        <div className="surface-soft rounded-lg p-3"><div className="eyebrow">Peak SPM</div><div className="mono mt-2 text-xl text-[hsl(var(--secondary))]">{peakSpm.toFixed(1)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">pack supply bottleneck</div></div>
        <div className="surface-soft rounded-lg p-3"><div className="eyebrow">Labs online</div><div className="mono mt-2 text-xl">{state.labs}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{labRate.toFixed(1)} cycles / min capacity</div></div>
        <div className="surface-soft rounded-lg p-3"><div className="eyebrow">Active research</div><div className="mt-2 truncate text-[13px] font-extrabold">{activeResearch ? prettyLabel(activeResearch.name) : 'None selected'}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{activeResearch ? 'packs consumed per lab cycle' : 'choose a technology in Research'}</div></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]"><span className="eyebrow">Required line</span>{requiredScienceKeys.length ? requiredScienceKeys.map((key) => <span className="resource-chip" key={key}><span className="status-dot status-running" />{meta[key]?.label ?? prettyLabel(key)}</span>) : <span>No science packs required.</span>}</div>
    </section>
    <section className="surface rounded-xl p-4 sm:p-5">
      <SectionTitle detail={`${scienceKeys.filter((key) => recipeIsUnlocked(recipeMap[scienceRecipeKeys[key]], state)).length}/${scienceKeys.length} recipes unlocked`}>Production cards</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className="surface-soft rounded-xl p-3.5 sm:p-4" data-testid="card-science-labs">
            <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="lab" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">Science labs</h2><div className="flex items-center gap-2">{state.labs ? <Tag><span className="status-dot status-running" /> auto</Tag> : labIsBuilding ? <Tag tone="amber"><Clock3 size={10} /> queued</Tag> : <Tag tone="amber">offline</Tag>}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Science lab count"><ResourceIcon item="lab" size={17} /><span className="mono text-[13px]">{state.labs}</span></div></div></div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Research facility · {activeResearch ? `${activeResearch.time ?? 5}s cycle` : 'standby'} · Science lab</p><div className="mt-1 flex flex-wrap gap-1"><Tag tone={activeResearch ? 'teal' : 'amber'}>{activeResearch ? 'active research' : 'select research'}</Tag>{labIsBuilding && <Tag tone="muted">construction queued</Tag>}</div></div></div>
           <div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Construction</div><div className="flex flex-wrap items-center gap-1.5"><span className="resource-chip"><ResourceIcon item="ironPlate" size={17} /><strong>12</strong> iron plates</span><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">+</span><span className="resource-chip"><ResourceIcon item="circuit" size={17} /><strong>4</strong> circuits</span><ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: 'hsl(var(--primary)/.4)' }}><ResourceIcon item="lab" size={17} /><strong>1</strong> lab</span></div></div>
            <div className="mt-3 grid grid-cols-3 gap-2"><div className="data-row rounded-lg p-2.5"><div className="eyebrow">current usage</div><div className="mono mt-1 text-[13px] text-[hsl(var(--primary))]">{currentLabUsage.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">packs / min</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">peak usage</div><div className="mono mt-1 text-[13px] text-[hsl(var(--secondary))]">{peakLabUsage.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">packs / min</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">capacity</div><div className="mono mt-1 text-[13px]">{labRate.toFixed(1)}</div><div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">cycles / min</div></div></div>
           <BuildProgress items={labConstructionItems} label="Science lab" />
           <div className="mt-4 flex gap-2">{state.labs ? <><button onClick={() => notice(`science labs are using ${currentLabUsage.toFixed(1)} packs / min`)} className="button-base button-ghost flex-1 !py-2" data-testid="button-inspect-science-labs"><Gauge size={13} /> inspect usage</button><button onClick={buildLab} className={`button-base flex-1 !py-2 ${labIsBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label="Construct another science lab" data-testid="button-build-more-lab">{labIsBuilding ? <><Check size={13} /> queued · build another</> : <><Hammer size={13} /> construct another</>}</button></> : <button onClick={buildLab} className={`button-base button-primary flex-1 !py-2 ${labIsBuilding ? 'button-build-active' : ''}`} data-testid="button-build-lab">{labIsBuilding ? <><Check size={13} /> queued · build lab</> : <><Hammer size={13} /> construct lab</>}</button>}</div>
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
          return <article className={`rounded-xl border p-3.5 sm:p-4 ${unlocked ? 'surface-soft' : 'locked-wash opacity-55 grayscale'}`} key={key} data-testid={`card-science-${key}`}>
            <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item={key} size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">{meta[key].label}</h2>{unlocked ? <Tag><span className="status-dot status-running" /> unlocked</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag>}</div><p className="mt-1 truncate text-[9px] text-[hsl(var(--muted-foreground))]" title={`${ingredients} → ${outputs}`}>recipe · {ingredients} → {outputs} · {recipe.energyRequired}s cycle</p></div></div>
            <CompactMetricsRow production={currentProduction} peakProduction={productionCapacity} demand={currentConsumption} peakConsumption={peakConsumption} net={currentProduction - currentConsumption} storage={state.products[key] ?? 0} capacity={capFor(state, key)} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-[hsl(var(--muted-foreground))]"><span>{required ? 'required by active research' : 'not required by active research'}</span><span className="text-right"><span className="mono">{recipe.energyRequired}s</span> / cycle · <span className="mono">{amountLabel(recipeOutputs(recipe).reduce((total, output) => total + output.amount, 0))}</span> output</span></div>
          </article>;
        })}
      </div>
    </section>
  </PageFrame>;
}

function researchIconFileFor(technology: TechnologyDefinition) {
  return technology.iconPath?.split('/').pop()?.replace(/\.png$/, '') ?? technology.name;
}
function ResearchArt({ technology, accent }: { technology: TechnologyDefinition; accent: string }) {
  const iconFile = researchIconFileFor(technology);
  return <div className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_25%_10%)]" style={{ color: accent }}><img src={`${import.meta.env.BASE_URL}research-icons/${iconFile}.png`} width={64} height={64} alt="" aria-hidden="true" className="h-full w-full object-contain p-1" /></div>;
}
function ResearchPage({ state, setState, notice }: PageProps) {
  const [selected, setSelected] = useState<ResearchKey>(state.currentResearch ?? orderedTechnologyCatalog[0]?.name ?? '');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ResearchFilter>('unlocked');
  const accentFor = (name: string) => ['#65afba', '#df7165', '#dfb05c', '#8ea9db', '#92c86b', '#c9d3d0'][name.length % 6];
  const selectResearch = (name: ResearchKey) => {
    setSelected(name);
    setState((s) => s.currentResearch === name && s.researchSelected ? s : { ...s, currentResearch: name, researchSelected: true });
  };
  const toggleAutoResearch = (name: ResearchKey) => {
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
  const item = technologyMap[selected] ?? orderedTechnologyCatalog[0];
  if (!item) return null;
  const selectedDone = state.research.includes(item.name);
  const selectedPrerequisitesMet = technologyPrerequisitesMet(state, item);
  const selectedTriggerProgress = researchTriggerProgress(state, item);
  const selectedTriggerReady = researchTriggerMet(state, item);
  const selectedProgress = researchProgressFor(state, item);
  const selectedTotal = researchUnitsFor(item);
  const selectedProgressPercent = selectedTriggerProgress ? selectedTriggerProgress.produced / selectedTriggerProgress.required * 100 : selectedProgress / selectedTotal * 100;
  const selectedAuto = (state.autoResearch ?? []).includes(item.name);
  const activeResearch = activeResearchFor(state);
  const activeResearchIsLabDriven = Boolean(activeResearch && !activeResearch.researchTrigger && activeResearch.scienceCosts.length);
  const activeResearchRate = activeResearchIsLabDriven ? scienceLabRateFor(state, activeResearch) : 0;
  const activeResearchProgress = activeResearch ? researchProgressFor(state, activeResearch) : 0;
  const activeResearchTotal = activeResearch ? researchUnitsFor(activeResearch) : 0;
  const activeResearchEta = activeResearchIsLabDriven && activeResearchRate > 0 ? Math.max(0, activeResearchTotal - activeResearchProgress) / activeResearchRate * 60 : null;
  return <PageFrame>
    <Header eyebrow="Technology control" title="Research" copy="Select a technology to research with your labs, or mark several for auto research. Checked technologies run one at a time from the top of this official catalog." action={<Tag><Lightbulb size={11} /> {technologyCatalog.length} technologies · {state.research.length} complete</Tag>} />
    <section className="surface mb-5 rounded-xl border-[hsl(var(--secondary)/.45)] bg-[linear-gradient(100deg,hsl(88_25%_16%/.86),hsl(216_25%_13%/.96))] p-4 sm:p-5" data-testid="panel-current-research">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><div className="eyebrow flex items-center gap-2 text-[hsl(var(--secondary))]"><span className="status-dot status-running mini-pulse" /> currently researching</div><div className="mt-2 truncate text-base font-extrabold">{activeResearch ? prettyLabel(activeResearch.name) : 'No active technology'}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{activeResearch?.researchTrigger ? 'Waiting for its production trigger.' : activeResearch ? `${fmt(activeResearchProgress)} / ${activeResearch.countFormula ?? fmt(activeResearchTotal)} research units complete.` : 'Select a technology or enable auto research to start a lab target.'}</div></div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]"><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Research rate</div><div className="mono mt-1 text-lg text-[hsl(var(--secondary))]">{activeResearchIsLabDriven ? `${activeResearchRate.toFixed(1)} / min` : '—'}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{activeResearch?.researchTrigger ? 'production trigger' : activeResearch ? 'lab units per minute' : 'no active lab target'}</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Estimated time</div><div className="mono mt-1 text-lg text-[hsl(var(--primary))]">{activeResearchEta === null ? '—' : duration(activeResearchEta)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{activeResearchEta === null ? (activeResearch?.researchTrigger ? 'waiting for trigger' : 'waiting for science') : 'until completion'}</div></div></div>
      </div>
      {activeResearchIsLabDriven && <div className="mt-4"><Progress value={activeResearchProgress / activeResearchTotal * 100} tone="teal" /></div>}
    </section>
    <section className="surface mb-5 rounded-xl p-3 sm:p-4">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search technologies, prerequisites, or effects" className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]" aria-label="Search technologies" data-testid="input-search-technologies" />
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Technology filters">{(['completed', 'unlocked', 'locked'] as ResearchFilter[]).map((option) => <button onClick={() => setFilter(option)} className={`button-base !px-2.5 !py-1.5 text-[9px] uppercase tracking-[.08em] ${filter === option ? 'button-primary' : 'button-ghost'}`} aria-pressed={filter === option} key={option} data-testid={`button-filter-${option}`}>{option} <span className="mono opacity-75">{technologyCounts[option]}</span></button>)}</div>
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
        const autoPosition = (state.autoResearch ?? []).indexOf(technology.name);
        const progressLabel = trigger ? `${fmt(trigger.produced)} / ${fmt(trigger.required)}` : `${fmt(progress)} / ${technology.countFormula ?? fmt(total)} units`;
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
            <label className="flex shrink-0 cursor-pointer flex-col items-center gap-1 text-center text-[8px] uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]" title="Auto research when available">
              <input type="checkbox" checked={autoPosition >= 0} onChange={() => toggleAutoResearch(technology.name)} className="h-4 w-4 accent-[hsl(var(--primary))]" aria-label={`Auto research ${prettyLabel(technology.name)}`} data-testid={`checkbox-auto-research-${technology.name}`} />
              <span>{autoPosition >= 0 ? `auto #${autoPosition + 1}` : 'auto'}</span>
            </label>
          </div>
        </div>;
      })}</section>
      <aside className="surface h-fit rounded-xl p-5">
        <div className="eyebrow">Technology detail</div>
        <div className="mt-3 flex items-start justify-between gap-3"><h2 className="text-lg font-extrabold">{prettyLabel(item.name)}</h2><Tag tone={item.upgrade ? 'amber' : 'teal'}>{item.upgrade ? 'upgrade' : 'technology'}</Tag></div>
        <div className="mt-2 flex flex-wrap gap-1">{item.essential && <Tag>essential</Tag>}{item.maxLevel && <Tag tone="muted">{prettyLabel(item.maxLevel)} levels</Tag>}{item.researchTrigger && <Tag tone="muted">triggered</Tag>}</div>
        <div className="mt-5 border-y border-[hsl(var(--border))] py-4"><div className="flex items-center justify-between text-[10px]"><span className="eyebrow">Research progress</span><span className={`mono ${selectedDone ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--primary))]'}`}>{selectedDone ? 'complete' : selectedTriggerProgress ? `${fmt(selectedProgress)} / ${fmt(selectedTriggerProgress.required)}` : `${fmt(selectedProgress)} / ${item.countFormula ?? fmt(selectedTotal)} units`}</span></div><div className="mt-2"><Progress value={selectedDone ? 100 : selectedProgressPercent} tone={selectedDone ? 'teal' : 'amber'} /></div><div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">{item.researchTrigger ? 'Production triggers complete this technology when its requirement is met.' : `Labs advance one unit every ${item.time ?? 5}s at 1x speed.`}</div></div>
        <div className="mt-5 border-y border-[hsl(var(--border))] py-4">
          <div className="eyebrow mb-3">Prerequisites</div>
          {item.prerequisites.length ? <div className="flex flex-wrap gap-1.5">{item.prerequisites.map((prerequisite) => <span className={`resource-chip ${state.research.includes(prerequisite) ? 'border-[hsl(var(--secondary)/.55)]' : ''}`} key={prerequisite}><span className={`status-dot ${state.research.includes(prerequisite) ? 'status-running' : 'status-starved'}`} />{prettyLabel(prerequisite)}</span>)}</div> : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No prerequisites · available at the start.</div>}
        </div>
          {item.researchTrigger ? <div className="border-b border-[hsl(var(--border))] py-4"><div className="eyebrow mb-2">Unlock trigger</div><div className="text-[11px]">{researchTriggerLabel(item.researchTrigger)}</div>{selectedTriggerProgress ? <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Starting inventory does not count toward this trigger.</div> : <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">This trigger type is not represented by a quantity counter in the current simulator.</div>}</div> : <div className="border-b border-[hsl(var(--border))] py-4"><div className="eyebrow mb-3">Science requirements</div><div className="space-y-2">{item.scienceCosts.length ? item.scienceCosts.map((cost) => { const costKey = keyForSource(cost.pack); const have = quantityFor(state, costKey); return <div className="flex items-center justify-between text-[11px]" key={cost.pack}><span className="flex items-center gap-2"><ResourceIcon item={costKey} size={20} />{meta[costKey].label} <span className="text-[9px] text-[hsl(var(--muted-foreground))]">per unit</span></span><span className={`mono ${have >= cost.amount ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{fmt(have)} / {cost.amount}</span></div>; }) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No science packs required.</div>}</div><div className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">Total requirement: <span className="mono">{item.scienceCosts.length ? item.scienceCosts.map((cost) => researchRequirementLabel(item, cost)).join(' · ') : 'none'}</span></div></div>}
        <div className="py-4"><div className="eyebrow mb-3">Effects</div><div className="space-y-2">{item.effects.length ? item.effects.map((effect, index) => <div className="data-row rounded-lg px-3 py-2 text-[10px]" key={`${effect.type}-${index}`}><span className="font-semibold">{effect.recipe ? `Unlock ${prettyLabel(effect.recipe)}` : prettyLabel(effect.type)}</span>{effect.target && <span className="text-[hsl(var(--muted-foreground))]"> · {prettyLabel(effect.target)}</span>}{effect.modifier !== undefined && <span className="mono float-right text-[hsl(var(--secondary))]">{typeof effect.modifier === 'number' && effect.modifier > 0 ? '+' : ''}{String(effect.modifier)}</span>}</div>) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No listed effects.</div>}</div></div>
         <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.07)] p-3 text-[11px]"><span><span className="block font-bold">Auto research when available</span><span className="mt-1 block text-[9px] text-[hsl(var(--muted-foreground))]">{selectedAuto ? `Queue position ${((state.autoResearch ?? []).indexOf(item.name) + 1)} · runs in catalog order` : 'Add this technology to the ordered auto queue.'}</span></span><input type="checkbox" checked={selectedAuto} onChange={() => toggleAutoResearch(item.name)} className="h-5 w-5 accent-[hsl(var(--primary))]" aria-label={`Auto research ${prettyLabel(item.name)}`} data-testid={`checkbox-auto-research-detail-${item.name}`} /></label>
      </aside>
    </div>
  </PageFrame>;
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

function SettingsPage({ state, setState, saveNow, reset, notice }: PageProps) {
  const [confirm, setConfirm] = useState(false);
  return <PageFrame><Header eyebrow="Control room preferences" title="Settings" copy="Local controls for this browser instance. Nothing here changes the scope of the simulation." action={<Tag><Save size={11} /> local save</Tag>} /><div className="grid gap-5 lg:grid-cols-2"><section className="surface rounded-xl p-5"><SectionTitle>Local save controls</SectionTitle><div className="rounded-xl bg-[hsl(216_24%_10%/.7)] p-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]"><Save size={16} /></div><div><div className="text-[12px] font-bold">Browser save is active</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Production ticks and settings survive a reload.</div></div></div><div className="mt-4 flex gap-2"><button onClick={() => { saveNow(); notice('save committed now'); }} className="button-base button-primary" data-testid="button-save-now"><Save size={13} /> save now</button><button onClick={() => setConfirm(true)} className="button-base button-ghost text-[hsl(var(--destructive))]" data-testid="button-reset-save"><Trash2 size={13} /> reset progress</button></div></div>{confirm && <div className="mt-3 rounded-xl border border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--destructive)/.08)] p-4" data-testid="panel-reset-confirm"><div className="flex gap-2"><ShieldAlert size={16} className="text-[hsl(var(--destructive))]" /><div><div className="text-[12px] font-bold">Reset this factory?</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">This removes the local save and starts a new sector. This cannot be undone.</p></div></div><div className="mt-3 flex gap-2"><button onClick={() => { reset(); setConfirm(false); notice('new sector initialized'); }} className="button-base bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]" data-testid="button-confirm-reset">confirm reset</button><button onClick={() => setConfirm(false)} className="button-base button-ghost" data-testid="button-cancel-reset">cancel</button></div></div>}</section><section className="surface rounded-xl p-5"><SectionTitle>Simulation speed</SectionTitle><div className="grid grid-cols-3 gap-2">{[.5, 1, 2].map((speed) => <button onClick={() => setState((s) => ({ ...s, simulationSpeed: speed }))} className={`button-base py-3 ${state.simulationSpeed === speed ? 'button-primary' : 'button-ghost'}`} key={speed} data-testid={`button-speed-${speed}`}>{speed}x</button>)}</div><div className="mt-5 border-t border-[hsl(var(--border))] pt-4"><SectionTitle>Control legend</SectionTitle><div className="space-y-3 text-[11px] text-[hsl(var(--muted-foreground))]"><div className="flex items-center gap-2"><span className="status-dot status-running" /><span><strong className="text-[hsl(var(--foreground))]">Green</strong> means a unit is consuming and producing.</span></div><div className="flex items-center gap-2"><span className="status-dot status-starved" /><span><strong className="text-[hsl(var(--foreground))]">Yellow</strong> means an input is below recipe demand.</span></div><div className="flex items-center gap-2"><span className="status-dot status-blocked" /><span><strong className="text-[hsl(var(--foreground))]">Red</strong> means output or a control path is blocked.</span></div></div></div></section></div><section className="surface mt-5 rounded-xl p-5"><div className="flex items-start gap-3"><CircleHelp size={17} className="text-[hsl(var(--primary))]" /><div><div className="eyebrow">About this slice</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Factory Production Game is a local, playable incremental factory. The resource art, production loop, and control-room language are original to this interface.</p></div></div></section></PageFrame>;
}

type PageProps = { state: GameState; setState: Dispatch<SetStateAction<GameState>>; enqueue: (action: QueueItem['action'], target: string, seconds: number, targetId?: string, costs?: BuildMaterialCost[]) => void; saveNow: () => void; reset: () => void; notice: (message: string) => void; away: number; recovered: number };

function PageFrame({ children }: { children: ReactNode }) { return <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-7 sm:px-6 md:px-8 md:pb-10">{children}</div>; }

function Game() {
  const initial = useMemo(loadState, []);
  const [state, setState] = useState<GameState>(initial.state);
  const [away] = useState(initial.away);
  const [recovered] = useState(initial.recovered);
  const [toast, setToast] = useState('');
  const [location] = useLocation();
  const notice = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 1800); };
  useEffect(() => { const timer = window.setInterval(() => setState((s) => simulate(s, 1)), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }, [state]);
  const saveNow = () => localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, lastSeen: Date.now() }));
  const reset = () => { localStorage.removeItem(SAVE_KEY); setState({ ...initialState, lastSeen: Date.now(), storage: { ...initialState.storage }, storageBoxes: { ...initialState.storageBoxes }, storageTanks: { ...initialState.storageTanks }, raw: { ...initialState.raw }, products: { ...initialState.products }, rateHistory: [] }); };
  const enqueue = (action: QueueItem['action'], target: string, seconds: number, targetId?: string, costs?: BuildMaterialCost[]) => setState((s) => {
    const raw = { ...s.raw };
    const products = { ...s.products };
    const requestCosts = costs?.map((cost) => ({ ...cost }));
    const reserved = requestCosts?.length ? reserveConstructionMaterials({ raw, products }, requestCosts) : undefined;
    const started = !requestCosts?.length || reserved?.every((amount, index) => amount >= requestCosts[index].amount - 0.000001);
    const item: QueueItem = {
      id: `${action}-${Date.now()}`,
      action,
      target,
      targetId,
      seconds: started ? seconds : 0,
      total: seconds,
      costs: requestCosts,
      reserved,
      started,
    };
    return { ...s, raw, products, queue: [...s.queue, item] };
  });
  const props = { state, setState, enqueue, saveNow, reset, notice, away, recovered };
  const pageKey = nav.find(([key, path]) => path === location)?.[0] ?? 'factory';
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
  return <Shell state={state}>{page}{toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[hsl(var(--primary)/.4)] bg-[hsl(216_25%_13%/.97)] px-4 py-2 mono text-[10px] text-[hsl(var(--primary))] shadow-xl md:bottom-6" role="status" data-testid="status-toast">{toast}</div>}{state.researchNotifications.length > 0 && <ResearchCompletionModal state={state} setState={setState} />}</Shell>;
}

function App() { return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Game /></WouterRouter>; }
export default App;