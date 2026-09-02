import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import { recipeCatalog, type RecipeCatalogEntry, type RecipeMaterial, type RecipeScienceChain } from './recipeCatalog';
import { tierProductCatalog } from './productTierCatalog';
import { technologyCatalog, type TechnologyDefinition } from './technologyCatalog';
import { technologyOrder } from './technologyOrder';
import {
  Activity, ArrowRight, BatteryCharging, Box, Check, ChevronRight, CircleHelp, Clock3,
  Cog, MoveRight, Cpu, Factory as FactoryIcon, FlaskConical, Gauge, Hammer,
  Info, Layers3, Lightbulb, LockKeyhole, Pickaxe, Plus, Power,
  RotateCcw, Save, Settings2, ShieldAlert, Sparkles, Sun, Trash2,
  TrendingUp, TriangleAlert, Truck, Waves, Zap,
} from 'lucide-react';

type RawKey = 'iron' | 'copper' | 'stone' | 'coal' | 'wood' | 'water' | 'uranium';
type ComponentKey = string;
type ScienceKey = 'automationPack' | 'logisticsPack' | 'chemicalPack' | 'militaryPack' | 'productionPack' | 'utilityPack';
type TrackedKey = string;
type UpgradeKey = 'manualMining' | 'productionSpeed' | 'storageEfficiency' | 'powerEfficiency';
type ResearchKey = string;
type ResearchFilter = 'completed' | 'unlocked' | 'locked';
type RecipeScienceFilter = 'all' | RecipeScienceChain;
type UnitStatus = 'running' | 'starved' | 'blocked';

type Recipe = RecipeCatalogEntry;
type QueueItem = { id: string; action: 'miner' | 'pump' | 'uraniumMiner' | 'assembler' | 'furnace' | 'lab' | 'storage' | 'upgrade'; target: string; targetId?: string; seconds: number; total: number };
type HandcraftJob = { recipeKey: string; seconds: number; total: number };
type ManualMiningJob = { resourceKey: RawKey; seconds: number; total: number };
type RateSample = { seconds: number; production: Record<TrackedKey, number>; consumption: Record<TrackedKey, number> };
type GameState = {
  raw: Record<RawKey, number>;
  products: Record<string, number>;
  storage: Record<TrackedKey, number>;
  storageBoxes: Record<TrackedKey, number>;
  miners: Record<RawKey, number>;
  pumps: number;
  uraniumMiners: number;
  assemblers: Record<string, number>;
  labs: number;
  miningProgress: Record<RawKey, number>;
  assemblyProgress: Record<string, number>;
  labProgress: number;
  handcraft: HandcraftJob | null;
  manualMining: ManualMiningJob | null;
  queue: QueueItem[];
  research: ResearchKey[];
  currentResearch: ResearchKey | null;
  researchProgress: Record<ResearchKey, number>;
  autoResearch: ResearchKey[];
  researchNotifications: ResearchKey[];
  produced: Record<string, number>;
  rateHistory: RateSample[];
  upgrades: Record<UpgradeKey, number>;
  totalOutput: number;
  lastSeen: number;
  simulationSpeed: number;
};

const SAVE_KEY = 'factory-production-game-save-v2';
const rawKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal', 'wood', 'water', 'uranium'];
const scienceKeys: ScienceKey[] = ['automationPack', 'logisticsPack', 'chemicalPack', 'militaryPack', 'productionPack', 'utilityPack'];
const technologyMap: Record<string, TechnologyDefinition> = Object.fromEntries(technologyCatalog.map((technology) => [technology.name, technology]));
const legacyResearchAliases: Record<string, string> = { steamPower: 'steam-power', solarPower: 'solar-energy', nuclearPower: 'nuclear-power', steelProcessing: 'steel-processing' };
const normalizeResearchKey = (key: string) => legacyResearchAliases[key] ?? key;
const sourceKeyAliases: Record<string, TrackedKey> = {
  'iron-ore': 'iron', 'copper-ore': 'copper', 'uranium-ore': 'uranium',
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
const catalogOrderIndex = new Map<string, number>(technologyCatalog.map((technology, index) => [technology.name, index]));
const orderedTechnologyCatalog = [...technologyCatalog].sort((a, b) => {
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
  if (!state.currentResearch || state.research.includes(state.currentResearch)) return undefined;
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
const researchRequirementLabel = (technology: TechnologyDefinition, cost: TechnologyDefinition['scienceCosts'][number]) => {
  const quantity = technology.count ? cost.amount * technology.count : technology.countFormula ? `${cost.amount} × ${technology.countFormula}` : cost.amount;
  return `${meta[keyForSource(cost.pack)]?.label ?? prettyLabel(cost.pack)} · ${quantity}`;
};
const burnerMinerKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal', 'wood'];
const burnerMiningDrillRecipe = recipeMap['burner-mining-drill'];
const burnerMiningDrillCost = { gear: 3, ironPlate: 3, stone: 5 };
const burnerMiningDrillCoalPerSecond = 0.25;
const smeltingRecipeKeys = new Set(['iron-plate', 'copper-plate', 'steel-plate', 'stone-brick']);
const stoneFurnaceRecipe = recipeMap['stone-furnace'];
const stoneFurnaceBuildCost = { stone: 5 };
const assemblyMachineOneRecipe = recipeMap['assembling-machine-1'];
const assemblyMachineOneBuildCost = { circuit: 3, gear: 5, ironPlate: 9 };
const assemblyMachineOnePowerKw = 75;
const labPowerKw = 7000;
const storageBoxCapacity = 180;
const storageBoxWoodCost = 2;
const storageBoxBuildSeconds = 1;
const manualMiningSeconds = 0.5;
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
const productionBuildingFor = (recipe: Recipe) => isSmeltingRecipe(recipe) ? 'stone-furnace' : 'assembling-machine-1';
const recipeOutputs = (recipe: Recipe) => recipe.results.map((material) => ({ key: keyForSource(material.name), amount: materialAmount(material), source: material }));
const trackedKeys: TrackedKey[] = Array.from(new Set([
  ...rawKeys,
  ...recipeCatalog.flatMap((recipe) => [...recipe.ingredients, ...recipe.results].map((material) => keyForSource(material.name))),
  ...technologyCatalog.flatMap((technology) => technology.scienceCosts.map((cost) => keyForSource(cost.pack))),
]));
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
const rawProductIsUnlocked = (key: string, state: GameState) => key !== 'water' && key !== 'uranium'
  || key === 'water' && state.research.includes('steam-power')
  || key === 'uranium' && state.research.includes('nuclear-power');
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
  uranium: { label: 'Uranium ore', short: 'uranium', color: '#92c86b', category: 'Raw' }, ironPlate: { label: 'Iron plates', short: 'Fe plate', color: '#c9d3d0', category: 'Component' },
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
type BuildMaterialCost = { key: string; amount: number; source: 'raw' | 'products' };
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
  raw: { iron: 62, copper: 38, stone: 26, coal: 31, wood: 18, water: 0, uranium: 0 },
  products: starterProducts,
  storage: Object.fromEntries(trackedKeys.map((key) => [key, storageBoxCapacity])) as Record<TrackedKey, number>,
  storageBoxes: Object.fromEntries(trackedKeys.map((key) => [key, 1])) as Record<TrackedKey, number>,
  miners: { iron: 0, copper: 0, stone: 0, coal: 0, wood: 0, water: 0, uranium: 0 },
  pumps: 0, uraniumMiners: 0,
  assemblers: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labs: 1, miningProgress: Object.fromEntries(rawKeys.map((key) => [key, 0])) as Record<RawKey, number>,
  assemblyProgress: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labProgress: 0, handcraft: null, manualMining: null, queue: [], research: [], currentResearch: orderedTechnologyCatalog[0]?.name ?? null, researchProgress: {}, autoResearch: [], researchNotifications: [], produced: Object.fromEntries(trackedKeys.map((key) => [key, 0])), rateHistory: [], upgrades: { manualMining: 0, productionSpeed: 0, storageEfficiency: 0, powerEfficiency: 0 },
  totalOutput: 1642, lastSeen: Date.now(), simulationSpeed: 1,
};

const nav = [
  ['factory', '/', FactoryIcon], ['mining', '/mining', Pickaxe], ['production', '/production', Cog], ['power', '/power', Power],
  ['storage', '/storage', Box], ['logistics', '/logistics', MoveRight], ['upgrades', '/upgrades', TrendingUp], ['science', '/science', FlaskConical],
  ['research', '/research', Layers3], ['settings', '/settings', Settings2],
] as const;
const tabLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

const rawInfo: Record<RawKey, { label: string; description: string; research?: ResearchKey; needs?: string }> = {
  iron: { label: 'Iron', description: 'Reliable ferrous feedstock for the first production tier.' },
  copper: { label: 'Copper', description: 'Conductive ore for plates and circuit work.' },
  stone: { label: 'Stone', description: 'Bulk aggregate for foundations and early construction.' },
  coal: { label: 'Coal', description: 'Dense fuel for boilers and high-heat processing.' },
  wood: { label: 'Wood', description: 'Manual-start biomass for early structures.' },
  water: { label: 'Water', description: 'Pumped fluid required to turn heat into power.', research: 'steam-power', needs: 'Steam Power' },
  uranium: { label: 'Uranium', description: 'Dense fuel for the late-stage reactor chain.', research: 'nuclear-power', needs: 'Nuclear Power' },
};

const upgradeData: { id: UpgradeKey; title: string; copy: string; base: number; unit: string }[] = [
  { id: 'manualMining', title: 'Reinforced hand tools', copy: 'Increase every manual mining tap by 1 raw item.', base: 18, unit: 'raw / tap' },
  { id: 'productionSpeed', title: 'Tighter cycle control', copy: 'All autonomous production units complete cycles 10% faster.', base: 24, unit: '% speed' },
  { id: 'storageEfficiency', title: 'Dense rack packing', copy: 'Raise the effective capacity of every storage row by 8%.', base: 28, unit: '% capacity' },
  { id: 'powerEfficiency', title: 'Load balancing', copy: 'Reduce factory power draw by 6% per level.', base: 30, unit: '% efficiency' },
];

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');
const duration = (n: number) => `${Math.floor(n / 60)}m ${String(Math.max(0, Math.floor(n % 60))).padStart(2, '0')}s`;
const capFor = (state: GameState, key: TrackedKey) => Math.floor((state.storage[key] ?? 180) * (1 + state.upgrades.storageEfficiency * 0.08));
const burnerMinerCount = (state: GameState) => burnerMinerKeys.reduce((total, key) => total + state.miners[key], 0);
const electricAssemblerCount = (state: GameState) => Object.entries(state.assemblers).reduce((total, [recipeKey, count]) => total + (recipeMap[recipeKey] && !isSmeltingRecipe(recipeMap[recipeKey]) ? count : 0), 0);
const productionUnitCount = (state: GameState) => Object.values(state.assemblers).reduce((total, count) => total + count, 0);
const burnerMinerCoalRate = (state: GameState) => burnerMinerCount(state) * burnerMiningDrillCoalPerSecond;
const electricPowerDraw = (state: GameState) => {
  const assemblerPower = electricAssemblerCount(state) * assemblyMachineOnePowerKw;
  return (state.labs * labPowerKw + assemblerPower) * (1 - state.upgrades.powerEfficiency * 0.06) / 1000;
};
const powerLabel = (value: number) => Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
const totalUnits = (state: GameState) => burnerMinerCount(state) + state.pumps + state.uraniumMiners + productionUnitCount(state) + state.labs;
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
  if (rawKeys.includes(key as RawKey)) state.raw[key as RawKey] = ignoreCapacity ? state.raw[key as RawKey] + amount : Math.min(capFor(state, key), state.raw[key as RawKey] + amount);
  else state.products[key] = ignoreCapacity ? (state.products[key] ?? 0) + amount : Math.min(capFor(state, key), (state.products[key] ?? 0) + amount);
};
const recordProduction = (state: GameState, key: TrackedKey, amount: number, production?: Record<TrackedKey, number>) => {
  state.produced[key] = (state.produced[key] ?? 0) + amount;
  if (production) production[key] = (production[key] ?? 0) + amount;
};
const researchTriggerProgress = (state: GameState, technology: TechnologyDefinition) => {
  const trigger = technology.researchTrigger;
  if (!trigger || trigger.type !== 'craft-item' || !trigger.item) return null;
  const key = keyForSource(trigger.item);
  return { key, produced: state.produced[key] ?? 0, required: trigger.count ?? 1 };
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
const recipeCycleRateFor = (state: GameState, recipe: Recipe) => {
  const count = state.assemblers[recipe.name] ?? 0;
  return count * 60 * state.simulationSpeed * (1 + state.upgrades.productionSpeed * 0.1) / recipe.energyRequired;
};
const miningBaseProductionRateFor = (state: GameState, key: RawKey) => {
  const count = key === 'water' ? state.pumps : key === 'uranium' ? state.uraniumMiners : state.miners[key];
  const base = key === 'uranium' ? 0.32 : key === 'water' ? 0.7 : key === 'copper' ? 0.88 : 1;
  return count * base * 60 * state.simulationSpeed;
};
const miningProductionRateFor = (state: GameState, key: RawKey) => {
  const fuelRatio = burnerMinerCount(state) ? Math.min(1, state.raw.coal / Math.max(0.01, burnerMinerCoalRate(state) * 60 * state.simulationSpeed)) : 1;
  return miningBaseProductionRateFor(state, key) * (burnerMinerKeys.includes(key) ? fuelRatio : 1);
};
const peakProductionRateFor = (state: GameState, key: TrackedKey) => {
  let rate = rawKeys.includes(key as RawKey) ? miningBaseProductionRateFor(state, key as RawKey) : 0;
  componentKeys.forEach((recipeKey) => {
    const recipe = recipeMap[recipeKey];
    const outputRate = recipeCycleRateFor(state, recipe);
    recipeOutputs(recipe).forEach(({ key: outputKey, amount }) => {
      if (outputKey === key) rate += outputRate * amount;
    });
  });
  return rate;
};
const peakDemandRateFor = (state: GameState, key: TrackedKey) => {
  let rate = key === 'coal' ? burnerMinerCoalRate(state) * 60 * state.simulationSpeed : 0;
  componentKeys.forEach((recipeKey) => {
    const recipe = recipeMap[recipeKey];
    const input = automatedRecipeInputs(recipe)[key];
    if (input) rate += recipeCycleRateFor(state, recipe) * input;
  });
  if (scienceKeys.includes(key as ScienceKey)) rate += state.labs * 12 * state.simulationSpeed;
  return rate;
};
const rateFromHistory = (state: GameState, key: TrackedKey, field: 'production' | 'consumption') => {
  const history = state.rateHistory ?? [];
  const seconds = history.reduce((total, sample) => total + sample.seconds, 0);
  if (!seconds) return 0;
  const amount = history.reduce((total, sample) => total + (sample[field][key] ?? 0), 0);
  return amount / seconds * 60;
};
const productionRateFor = (state: GameState, key: TrackedKey) => rateFromHistory(state, key, 'production');
const demandRateFor = (state: GameState, key: TrackedKey) => rateFromHistory(state, key, 'consumption');
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
const scienceLabRateFor = (state: GameState, technology?: TechnologyDefinition) => state.labs * 60 * state.simulationSpeed / Math.max(1, technology?.time ?? 5);
const sciencePackProductionRateFor = (state: GameState, key: string) => {
  const recipeKey = scienceRecipeKeys[key as ScienceKey];
  const recipe = recipeKey ? recipeMap[recipeKey] : undefined;
  if (!recipe || !recipeIsUnlocked(recipe, state)) return 0;
  const output = recipeOutputs(recipe).find((entry) => entry.key === key);
  return output ? recipeCycleRateFor(state, recipe) * output.amount : 0;
};
const scienceCurrentSpmFor = (state: GameState, requiredKeys: string[]) => {
  if (!requiredKeys.length) return 0;
  return Math.min(...requiredKeys.map((key) => rateFromHistory(state, key, 'consumption')));
};
const sciencePeakSpmFor = (state: GameState, requiredKeys: string[]) => {
  if (!requiredKeys.length) return 0;
  const technology = activeResearchFor(state);
  const labRate = scienceLabRateFor(state, technology);
  return Math.min(labRate, ...requiredKeys.map((key) => sciencePackProductionRateFor(state, key)));
};
const burnerOperatingSeconds = (state: GameState, seconds: number) => {
  const fuelRate = burnerMinerCoalRate(state) * state.simulationSpeed;
  return fuelRate > 0 ? Math.min(seconds, Math.max(0, state.raw.coal) / fuelRate) : seconds;
};

function simulate(previous: GameState, seconds: number): GameState {
  const liveProduction = emptyRateRecord();
  const liveConsumption = emptyRateRecord();
  const state: GameState = {
    ...previous, raw: { ...previous.raw }, products: { ...previous.products }, miners: { ...previous.miners }, storage: { ...previous.storage }, storageBoxes: { ...previous.storageBoxes },
    assemblers: { ...previous.assemblers }, miningProgress: { ...previous.miningProgress }, assemblyProgress: { ...previous.assemblyProgress },
    researchProgress: { ...(previous.researchProgress ?? {}) }, autoResearch: [...(previous.autoResearch ?? [])], researchNotifications: [...(previous.researchNotifications ?? [])],
    rateHistory: previous.rateHistory ?? [],
    handcraft: previous.handcraft ? { ...previous.handcraft } : null, manualMining: previous.manualMining ? { ...previous.manualMining } : null, queue: previous.queue.map((item) => ({ ...item })), research: [...previous.research], produced: { ...previous.produced }, lastSeen: Date.now(),
  };
  const speed = state.simulationSpeed;
  const operatingSeconds = burnerOperatingSeconds(state, seconds);
  if (burnerMinerCount(state)) {
    const coalConsumed = burnerMinerCoalRate(state) * operatingSeconds * speed;
    state.raw.coal = Math.max(0, state.raw.coal - coalConsumed);
    liveConsumption.coal += coalConsumed;
  }
  rawKeys.forEach((key) => {
    const count = key === 'water' ? state.pumps : key === 'uranium' ? state.uraniumMiners : state.miners[key];
    if (!count) return;
    const base = key === 'uranium' ? 0.32 : key === 'water' ? 0.7 : key === 'copper' ? 0.88 : 1;
    const minerSeconds = burnerMinerKeys.includes(key) ? operatingSeconds : seconds;
    state.miningProgress[key] += count * base * minerSeconds * speed;
    while (state.miningProgress[key] >= 1) {
      if (state.raw[key] >= capFor(state, key)) { state.miningProgress[key] = 0; break; }
      state.raw[key] += 1; state.miningProgress[key] -= 1; state.totalOutput += 1; recordProduction(state, key, 1, liveProduction);
    }
  });
  componentKeys.forEach((key) => {
    const count = state.assemblers[key] ?? 0;
    if (!count) return;
    const recipe = recipeMap[key];
    state.assemblyProgress[key] = (state.assemblyProgress[key] ?? 0) + count * seconds * speed * (1 + state.upgrades.productionSpeed * 0.1) / recipe.energyRequired;
    let cycles = 0;
    while (state.assemblyProgress[key] >= 1 && cycles < 80) {
      const outputs = recipeOutputs(recipe);
       if (!hasInputs(state, automatedRecipeInputs(recipe)) || outputs.some(({ key: outputKey, amount }) => quantityFor(state, outputKey) + amount > capFor(state, outputKey))) break;
       spendInputs(state, automatedRecipeInputs(recipe), liveConsumption);
      outputs.forEach(({ key: outputKey, amount }) => { addTracked(state, outputKey, amount); recordProduction(state, outputKey, amount, liveProduction); });
      state.assemblyProgress[key] -= 1; state.totalOutput += outputs.reduce((sum, output) => sum + output.amount, 0); cycles += 1;
    }
  });
  if (state.handcraft) {
    state.handcraft.seconds = Math.max(0, state.handcraft.seconds - seconds * speed);
    if (state.handcraft.seconds <= 0) {
      const recipe = recipeMap[state.handcraft.recipeKey];
      const outputs = recipeOutputs(recipe);
      outputs.forEach(({ key: outputKey, amount }) => { addTracked(state, outputKey, amount, true); recordProduction(state, outputKey, amount, liveProduction); });
      state.totalOutput += outputs.reduce((sum, output) => sum + output.amount, 0);
      state.handcraft = null;
    }
  }
  if (state.manualMining) {
    state.manualMining.seconds = Math.max(0, state.manualMining.seconds - seconds * speed);
    if (state.manualMining.seconds <= 0) {
      const resourceKey = state.manualMining.resourceKey;
      const amount = 1 + state.upgrades.manualMining;
      addTracked(state, resourceKey, amount, true);
      recordProduction(state, resourceKey, amount, liveProduction);
      state.totalOutput += amount;
      state.manualMining = null;
    }
  }
  const activeResearch = activeResearchFor(state);
  if (!activeResearch || activeResearch.researchTrigger || !activeResearch.scienceCosts.length) {
    state.labProgress = 0;
  } else {
    state.labProgress += state.labs * seconds * speed / Math.max(1, activeResearch.time ?? 5);
    let researchCycles = 0;
    while (state.labProgress >= 1 && researchCycles < 80) {
      const currentResearch = activeResearchFor(state);
      if (!currentResearch || currentResearch.researchTrigger || !currentResearch.scienceCosts.length) break;
      const costs = Object.fromEntries(currentResearch.scienceCosts.map((cost) => [keyForSource(cost.pack), cost.amount]));
      if (!hasInputs(state, costs)) break;
      spendInputs(state, costs, liveConsumption);
      const totalUnits = researchUnitsFor(currentResearch);
      const nextProgress = Math.min(totalUnits, (state.researchProgress[currentResearch.name] ?? 0) + 1);
      state.researchProgress[currentResearch.name] = nextProgress;
      state.labProgress -= 1;
      researchCycles += 1;
      if (nextProgress >= totalUnits) {
        markResearchComplete(state, currentResearch);
        state.currentResearch = autoResearchTargetFor(state)?.name ?? currentResearch.name;
        state.labProgress = 0;
        break;
      }
    }
  }
  const completed = state.queue.filter((item) => item.seconds <= seconds);
  state.queue = state.queue.map((item) => ({ ...item, seconds: Math.max(0, item.seconds - seconds) })).filter((item) => item.seconds > 0);
  completed.forEach((item) => {
    if (item.action === 'miner') state.miners[(item.targetId ?? item.target) as RawKey] += 1;
    if (item.action === 'pump') state.pumps += 1;
    if (item.action === 'uraniumMiner') state.uraniumMiners += 1;
     if (item.action === 'assembler' || item.action === 'furnace') state.assemblers[(item.targetId ?? item.target) as ComponentKey] += 1;
    if (item.action === 'lab') { state.labs += 1; recordProduction(state, 'lab', 1, liveProduction); }
    if (item.action === 'storage') {
      const key = item.targetId ?? item.target;
      state.storageBoxes[key] = (state.storageBoxes[key] ?? 1) + 1;
      state.storage[key] = (state.storage[key] ?? storageBoxCapacity) + storageBoxCapacity;
    }
    if (item.action === 'upgrade') state.upgrades[(item.targetId ?? item.target) as UpgradeKey] += 1;
  });
  applyResearchTriggers(state);
  state.rateHistory = seconds > 0 && seconds <= 5
    ? [...(previous.rateHistory ?? []), { seconds, production: liveProduction, consumption: liveConsumption }].slice(-5)
    : [];
  return state;
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as Partial<GameState> | null;
    if (!parsed) return { state: initialState, away: 0, recovered: 0 };
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
      storage: (() => {
        const storage = { ...initialState.storage, ...parsed.storage };
        if (parsed.storage?.researchPack !== undefined && parsed.storage?.productionPack === undefined) storage.productionPack = parsed.storage.researchPack;
        delete storage.researchPack;
        return storage;
      })(),
      storageBoxes: Object.fromEntries(trackedKeys.map((key) => {
        const savedBoxes = parsed.storageBoxes?.[key] ?? (key === 'productionPack' ? parsed.storageBoxes?.researchPack : undefined);
        const savedCapacity = parsed.storage?.[key] ?? (key === 'productionPack' ? parsed.storage?.researchPack : undefined) ?? storageBoxCapacity;
        return [key, typeof savedBoxes === 'number' ? Math.max(1, Math.floor(savedBoxes)) : Math.max(1, Math.ceil(savedCapacity / storageBoxCapacity))];
      })) as Record<TrackedKey, number>,
      miners: { ...initialState.miners, ...parsed.miners },
      assemblers: { ...initialState.assemblers, ...parsed.assemblers },
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
      rateHistory: (parsed.rateHistory ?? []).map((sample) => {
        const production = { ...sample.production };
        const consumption = { ...sample.consumption };
        if (production.researchPack !== undefined && production.productionPack === undefined) production.productionPack = production.researchPack;
        if (consumption.researchPack !== undefined && consumption.productionPack === undefined) consumption.productionPack = consumption.researchPack;
        delete production.researchPack;
        delete consumption.researchPack;
        return { ...sample, production, consumption };
      }),
      upgrades: { ...initialState.upgrades, ...parsed.upgrades },
      queue: parsed.queue ?? [],
      research: Array.from(new Set((parsed.research ?? initialState.research).map((key) => normalizeResearchKey(String(key))))),
      currentResearch: parsed.currentResearch ? normalizeResearchKey(String(parsed.currentResearch)) : initialState.currentResearch,
      researchProgress: Object.fromEntries(Object.entries(parsed.researchProgress ?? {}).filter(([key, value]) => technologyMap[key] && typeof value === 'number').map(([key, value]) => [normalizeResearchKey(key), Math.max(0, value as number)])),
      autoResearch: orderedTechnologyCatalog.filter((technology) => (parsed.autoResearch ?? []).map((key) => normalizeResearchKey(String(key))).includes(technology.name)).map((technology) => technology.name),
      researchNotifications: Array.from(new Set((parsed.researchNotifications ?? []).map((key) => normalizeResearchKey(String(key))).filter((key) => technologyMap[key]))),
      lastSeen: parsed.lastSeen ?? Date.now(),
    } as GameState;
    Object.keys(state.storageBoxes).forEach((key) => { state.storage[key] = state.storageBoxes[key] * storageBoxCapacity; });
    const away = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - state.lastSeen) / 1000));
    const before = state.totalOutput;
    const recovered = simulate(state, away);
    return { state: recovered, away, recovered: recovered.totalOutput - before };
  } catch { return { state: initialState, away: 0, recovered: 0 }; }
}

const iconFileFor: Record<string, string> = {
  chemicalPack: 'chemical-science-pack', militaryPack: 'military-science-pack',
  productionPack: 'researchPack', utilityPack: 'utility-science-pack',
};
function ResourceIcon({ item, size = 28 }: { item: TrackedKey; size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}item-icons/${iconFileFor[item] ?? item}.png`} width={size} height={size} alt="" aria-hidden="true" className="object-contain" />;
}
function Tag({ children, tone = 'teal' }: { children: ReactNode; tone?: 'teal' | 'amber' | 'red' | 'muted' }) {
  return <span className={`status-tag ${tone === 'teal' ? 'tag-running' : tone === 'amber' ? 'tag-starved' : tone === 'red' ? 'tag-blocked' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{children}</span>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menu, setMenu] = useState(false);
  const active = nav.find(([key, path]) => path === location)?.[0] ?? 'factory';
  return <div className="app-shell">
    <header className="sticky top-0 z-30 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(217_30%_8%/.94)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><button onClick={() => setMenu(!menu)} className="icon-button md:hidden" aria-label="Open navigation" data-testid="button-open-navigation"><Layers3 size={17} /></button><Link href="/" className="flex items-center gap-3 no-underline" data-testid="link-logo"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><FactoryIcon size={19} /></div><div className="min-w-0"><div className="text-[13px] font-extrabold tracking-[.05em]">FACTORY</div><div className="mono truncate text-[9px] tracking-[.18em] text-[hsl(var(--primary))]">PRODUCTION GAME</div></div></Link></div>
        <div className="hidden items-center gap-3 lg:flex"><Tag><span className="status-dot status-running mini-pulse" /> simulation live</Tag><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">SECTOR 07 · LOCAL INSTANCE</span></div>
        <div className="flex items-center gap-2"><span className="mono hidden text-[10px] text-[hsl(var(--muted-foreground))] sm:block">T+ NETWORK</span><button onClick={() => setMenu(!menu)} className="icon-button" aria-label="Toggle command navigation" data-testid="button-toggle-command"><Settings2 size={16} /></button></div>
      </div>
    </header>
    <div className="mx-auto flex max-w-[1500px]">
      <aside className={`${menu ? 'fixed inset-x-3 top-[78px] z-40 block shadow-2xl' : 'hidden'} surface rounded-xl p-2 md:sticky md:top-[84px] md:block md:h-[calc(100dvh-100px)] md:w-[214px] md:shrink-0 md:rounded-none md:border-0 md:border-r md:border-[hsl(var(--sidebar-border))] md:bg-transparent md:p-5 md:shadow-none`}><div className="mb-4 hidden px-3 md:block"><span className="eyebrow">Command tabs · 10</span></div><nav className="grid grid-cols-2 gap-1 md:flex md:flex-col" aria-label="Primary navigation">{nav.map(([key, path, Icon]) => <Link key={key} href={path} onClick={() => setMenu(false)} className={`nav-link flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[11px] font-bold no-underline transition-colors ${active === key ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`} data-testid={`link-tab-${key}`}><Icon size={15} /><span>{tabLabel(key)}</span>{active === key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />}</Link>)}</nav></aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
    <div className="tab-rail fixed inset-x-0 bottom-0 z-30 overflow-x-auto border-t border-[hsl(var(--border))] bg-[hsl(217_30%_8%/.97)] px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl md:hidden"><div className="flex min-w-max gap-1">{nav.map(([key, path, Icon]) => <Link key={key} href={path} className={`flex min-w-[62px] flex-col items-center gap-1 rounded-lg px-2 py-2 text-[9px] font-bold no-underline ${active === key ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`link-mobile-tab-${key}`}><Icon size={16} /><span>{tabLabel(key)}</span></Link>)}</div></div>
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
function BuildProgress({ items, label }: { items: QueueItem[]; label: string }) {
  if (!items.length) return null;
  const active = items[0];
  const complete = (1 - active.seconds / active.total) * 100;
  return <div className="construction-panel mt-3 rounded-lg p-3" aria-live="polite" data-testid={`panel-construction-${active.id}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="construction-pulse mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"><Hammer size={12} /></div>
        <div className="min-w-0">
          <div className="eyebrow text-[hsl(var(--primary))]">Construction in progress</div>
          <div className="mt-1 truncate text-[10px] font-bold">{label}{items.length > 1 ? ` · ${items.length} queued` : ''}</div>
        </div>
      </div>
      <span className="mono shrink-0 text-[10px] text-[hsl(var(--primary))]">{duration(active.seconds)}</span>
    </div>
    <div className="mt-2"><Progress value={complete} tone="amber" /></div>
    <div className="mt-1 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>{Math.floor(Math.max(0, complete))}% complete</span><span>building now</span></div>
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
  const throughput = Math.max(0, Object.entries(state.assemblers).reduce((total, [recipeKey, count]) => {
    const recipe = recipeMap[recipeKey];
    return total + (recipe ? count * 60 / recipe.energyRequired : 0);
  }, 0));
  const powerProduction = (state.research.includes('steam-power') ? 80 : 0) + (state.research.includes('solar-energy') ? 45 : 0) + (state.research.includes('nuclear-power') ? 180 : 0);
  const draw = electricPowerDraw(state);
  const bottleneckRecipe = componentKeys.map((key) => recipeMap[key]).find((recipe) => (state.assemblers[recipe.name] ?? 0) > 0 && !hasInputs(state, automatedRecipeInputs(recipe)));
  const bottleneck = keyForSource(bottleneckRecipe?.results[0]?.name ?? 'electronic-circuit');
  return <PageFrame>{away >= 60 && recovered > 0 && <div className="surface mb-5 flex flex-col gap-3 rounded-xl border-[hsl(var(--secondary)/.4)] bg-[linear-gradient(100deg,hsl(174_35%_17%/.8),hsl(216_25%_14%/.96))] p-4 sm:flex-row sm:items-center sm:justify-between enter" data-testid="status-offline-production"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]"><RotateCcw size={18} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Network recovered</div><div className="mt-1 text-[13px] font-bold">{duration(away)} of offline production reconciled</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">The line added <span className="mono text-[hsl(var(--secondary))]">{fmt(recovered)} items</span> while the control room was closed.</div></div></div><button onClick={() => notice('offline report acknowledged')} className="button-base button-ghost shrink-0" data-testid="button-dismiss-offline">acknowledge <ArrowRight size={13} /></button></div>}
    <Header eyebrow="Live production network" title="Factory" copy="One control surface for the whole operation. Watch the line, then clear the next constraint." action={<Tag><span className="status-dot status-running mini-pulse" /> line online</Tag>} />
     <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 enter enter-delay-1">{[{ label: 'Throughput', value: throughput.toFixed(1), suffix: 'items / min', icon: TrendingUp, color: 'text-[hsl(var(--secondary))]' }, { label: 'Active units', value: fmt(active), suffix: 'machines + labs', icon: Activity, color: 'text-[#83d993]' }, { label: 'Total output', value: fmt(state.totalOutput), suffix: 'lifetime items', icon: Layers3, color: 'text-[hsl(var(--primary))]' }, { label: 'Power balance', value: powerLabel(powerProduction - draw), suffix: 'MW net', icon: Zap, color: powerProduction >= draw ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]' }].map((k) => <div className="surface rounded-xl p-3.5" key={k.label}><div className={`mb-2 flex items-center gap-2 ${k.color}`}><k.icon size={14} /><span className="eyebrow">{k.label}</span></div><div className="mono text-[19px]">{k.value} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{k.suffix}</span></div></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
      <section className="surface rounded-xl p-4 sm:p-5 enter enter-delay-2"><SectionTitle detail={`${state.queue.length} active`}>Command overview</SectionTitle><div className="grid gap-3 sm:grid-cols-2"><div className="surface-soft rounded-xl p-4"><div className="flex items-start justify-between"><div><div className="eyebrow">Factory health</div><div className="mt-2 text-xl font-extrabold">Stable <span className="mono text-[11px] font-normal text-[hsl(var(--secondary))]">72%</span></div></div><Gauge size={20} className="text-[hsl(var(--secondary))]" /></div><Progress value={72} /><div className="mt-2 flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]"><span>inputs ahead of demand</span><span className="mono">live</span></div></div><div className="surface-soft rounded-xl p-4"><div className="flex items-start justify-between"><div><div className="eyebrow">Bottleneck signal</div><div className="mt-2 text-xl font-extrabold">{meta[bottleneck].label}</div></div><TriangleAlert size={20} className="text-[hsl(var(--primary))]" /></div><div className="mt-3 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">One constrained input is limiting a downstream component.</div><Link href="/production" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--primary))] no-underline" data-testid="link-factory-bottleneck">inspect production <ArrowRight size={12} /></Link></div></div><div className="mt-3 grid-lines rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex items-center justify-between"><div className="eyebrow">Network pulse · last 60 seconds</div><Activity size={15} className="text-[hsl(var(--secondary))]" /></div><div className="flex h-16 items-end gap-1.5 pt-2">{[30,34,42,39,49,46,58,55,61,67,63,72,69,78,74,82,79,88,84,92].map((h, i) => <div key={i} className="flex-1 rounded-t-sm bg-[hsl(var(--secondary)/.58)]" style={{ height: `${h}%`, opacity: i > 16 ? .95 : .55 }} />)}</div><div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>-60 sec</span><span>now · {throughput.toFixed(1)} items/min</span></div></div></section>
      <div className="space-y-5"><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={`${state.queue.length} queued`}>Construction queue</SectionTitle>{state.queue.length ? <div className="space-y-2">{state.queue.map((item) => <div className="data-row flex items-center gap-3 rounded-lg p-2.5" key={item.id} data-testid={`row-factory-queue-${item.id}`}><div className="grid h-7 w-7 place-items-center rounded-md bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">{item.action === 'upgrade' ? <TrendingUp size={14} /> : <Hammer size={14} />}</div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold">{item.target} <span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">· {item.action}</span></div><Progress value={(1 - item.seconds / item.total) * 100} tone="amber" /></div><span className="mono text-[10px] text-[hsl(var(--primary))]">{duration(item.seconds)}</span></div>)}</div> : <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-[11px] text-[hsl(var(--muted-foreground))]">No construction in flight. The next build will appear here.</div>}</section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle>Control notes</SectionTitle><div className="space-y-3 text-[11px] text-[hsl(var(--muted-foreground))]"><div className="flex gap-2"><Info size={14} className="shrink-0 text-[hsl(var(--secondary))]" /><span>Raw materials begin with manual taps. Miners take over the moment their build completes.</span></div><div className="flex gap-2"><Info size={14} className="shrink-0 text-[hsl(var(--primary))]" /><span>Storage, science, and research are separate control tabs so this overview stays factory-wide.</span></div></div></section></div>
    </div><p className="mt-5 mono text-[9px] text-[hsl(var(--muted-foreground))]">LOCAL SAVE · AUTO-COMMIT EVERY TICK</p>
  </PageFrame>;
}

function MiningPage({ state, setState, enqueue, notice }: PageProps) {
  const tap = (key: RawKey) => {
    if (state.miners[key] || key === 'water' || key === 'uranium') return;
    if (state.manualMining) return notice(state.manualMining.resourceKey === key ? `already mining ${rawInfo[key].label.toLowerCase()}` : `finish mining ${rawInfo[state.manualMining.resourceKey].label.toLowerCase()} first`);
    setState((s) => ({ ...s, manualMining: { resourceKey: key, seconds: manualMiningSeconds, total: manualMiningSeconds } }));
    notice(`manual ${rawInfo[key].label.toLowerCase()} mining started`);
  };
  const build = (key: RawKey) => {
    if (key === 'water') { if (!state.research.includes('steam-power')) return notice('Steam Power required'); const missing = missingBuildMaterials(state, [{ key: 'ironPlate', amount: 10, source: 'products' }, { key: 'gear', amount: 2, source: 'products' }]); if (missing) return notice(`need ${missing}`); setState((s) => ({ ...s, products: { ...s.products, ironPlate: s.products.ironPlate - 10, gear: s.products.gear - 2 } })); enqueue('pump', 'Water pump', 40); return; }
    if (key === 'uranium') { if (!state.research.includes('nuclear-power')) return notice('Nuclear Power required'); const missing = missingBuildMaterials(state, [{ key: 'steel', amount: 20, source: 'products' }, { key: 'circuit', amount: 8, source: 'products' }]); if (missing) return notice(`need ${missing}`); setState((s) => ({ ...s, products: { ...s.products, steel: s.products.steel - 20, circuit: s.products.circuit - 8 } })); enqueue('uraniumMiner', 'Acid-powered uranium miner', 90); return; }
    const missing = missingBuildMaterials(state, [{ key: 'gear', amount: burnerMiningDrillCost.gear, source: 'products' }, { key: 'ironPlate', amount: burnerMiningDrillCost.ironPlate, source: 'products' }, { key: 'stone', amount: burnerMiningDrillCost.stone, source: 'raw' }]);
    if (missing) return notice(`need ${missing}`);
    setState((s) => ({ ...s, raw: { ...s.raw, stone: s.raw.stone - burnerMiningDrillCost.stone }, products: { ...s.products, ironPlate: s.products.ironPlate - burnerMiningDrillCost.ironPlate, gear: s.products.gear - burnerMiningDrillCost.gear } }));
    enqueue('miner', `${rawInfo[key].label} burner mining drill`, burnerMiningDrillRecipe.energyRequired, key);
  };
  return <PageFrame><Header eyebrow="Raw material control" title="Mining" copy="Tap the ground to start. Build burner mining drills to make the ore line autonomous — each drill consumes coal while it operates." action={<Tag><Pickaxe size={11} /> 7 resource sections</Tag>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rawKeys.map((key) => { const info = rawInfo[key]; const locked = !!info.research && !state.research.includes(info.research); const count = key === 'water' ? state.pumps : key === 'uranium' ? state.uraniumMiners : state.miners[key]; const isBurnerOre = burnerMinerKeys.includes(key); const fuelRate = count * burnerMiningDrillCoalPerSecond; const autonomous = count > 0; const productionRate = miningProductionRateFor(state, key); const peakProductionRate = peakProductionRateFor(state, key); const demandRate = demandRateFor(state, key); const peakDemandRate = peakDemandRateFor(state, key); const manualMiningJob = state.manualMining?.resourceKey === key ? state.manualMining : null; const manualMiningBusy = Boolean(state.manualMining && !manualMiningJob); const constructionAction = key === 'water' ? 'pump' : key === 'uranium' ? 'uraniumMiner' : 'miner'; const constructionItems = state.queue.filter((item) => item.action === constructionAction && (constructionAction !== 'miner' || item.targetId === key)); const isBuilding = constructionItems.length > 0; const constructionLabel = key === 'water' ? 'Water pump' : key === 'uranium' ? 'Acid-powered uranium miner' : `${info.label} burner mining drill`; return <section className={`surface rounded-xl p-4 ${locked ? 'locked-wash opacity-75' : ''}`} key={key} data-testid={`section-mining-${key}`}><div className="flex items-start gap-3"><div className="resource-orb"><ResourceIcon item={key} size={29} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="text-[13px] font-extrabold">{info.label}</h2>{locked ? <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag> : autonomous ? <Tag><span className="status-dot status-running" /> autonomous</Tag> : <Tag tone="amber">manual</Tag>}</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{info.description}</p></div></div><div className="mt-4 flex items-end justify-between"><div><div className="eyebrow">Buffer</div><div className="mono mt-1 text-[18px]">{fmt(state.raw[key])}<span className="text-[10px] text-[hsl(var(--muted-foreground))]"> / {capFor(state, key)}</span></div></div><div className="text-right">{isBurnerOre ? <div className="eyebrow flex items-center justify-end gap-1"><ResourceIcon item="burner-mining-drill" size={14} /> burner drills</div> : <div className="eyebrow">{key === 'water' ? 'pumps' : 'acid miners'}</div>}<div className="mono mt-1 text-[18px] text-[hsl(var(--secondary))]">{count}</div></div></div><CompactMetricsRow production={productionRate} peakProduction={peakProductionRate} demand={demandRate} peakConsumption={peakDemandRate} net={productionRate - demandRate} storage={state.raw[key]} capacity={capFor(state, key)} /><Progress value={state.raw[key] / capFor(state, key) * 100} />{manualMiningJob && <ManualMiningProgress job={manualMiningJob} />}{isBurnerOre && <><div className="data-row mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2"><ResourceIcon item="burner-mining-drill" size={18} /><span className="text-[10px] font-semibold">Burner drill fuel</span><span className="ml-auto flex items-center gap-1 mono text-[10px] text-[hsl(var(--primary))]"><ResourceIcon item="coal" size={15} /> {fuelRate.toFixed(2)} /s</span><span className="text-[9px] text-[hsl(var(--muted-foreground))]">no electricity</span></div><div className="mt-2 text-[9px] text-[hsl(var(--muted-foreground))]">Build: {burnerMiningDrillCost.gear} gears + {burnerMiningDrillCost.ironPlate} iron plates + {burnerMiningDrillCost.stone} stone · {burnerMiningDrillRecipe.energyRequired}s</div></>}<BuildProgress items={constructionItems} label={constructionLabel} /><div className="mt-4 flex gap-2">{locked ? <button onClick={() => notice(`${info.needs} research required`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-locked-mining-${key}`}><LockKeyhole size={13} /> requires {info.needs}</button> : autonomous ? <button onClick={() => build(key)} className={`button-base flex-1 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} data-testid={`button-build-more-${key}`}>{isBuilding ? <><Check size={13} /> queued · construct another</> : <><Plus size={13} /> construct {key === 'water' ? 'pump' : 'burner drill'}</>}</button> : <><button onClick={() => tap(key)} className="button-base button-primary flex-1 !py-2" data-testid={`button-tap-${key}`}>{manualMiningJob ? <><Clock3 size={13} /> {manualMiningJob.seconds.toFixed(2)}s</> : manualMiningBusy ? <><Clock3 size={13} /> busy</> : <><Pickaxe size={13} /> tap to mine</>}</button><button onClick={() => build(key)} className={`button-base !px-3 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct ${info.label} miner`} data-testid={`button-build-miner-${key}`}>{isBuilding ? <Check size={13} /> : <Hammer size={13} />}</button></>}</div></section>; })}</div><div className="mt-5 surface rounded-xl border-[hsl(var(--secondary)/.25)] p-4"><div className="flex items-start gap-3"><div className="text-[hsl(var(--secondary))]"><Lightbulb size={17} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Mining rule</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Manual taps now take 0.5 seconds and only one resource can be mined by hand at a time. Hand-mined output can exceed storage capacity.</p></div></div></div></PageFrame>;
}

function ProductionPage({ state, setState, enqueue, notice }: PageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [scienceFilter, setScienceFilter] = useState<RecipeScienceFilter>('Core');
  const automationUnlocked = state.research.includes('automation');
  const categories = useMemo(() => Array.from(new Set(recipeCatalog.map((recipe) => recipe.category))).sort(), []);
  const visibleRecipes = useMemo(() => orderedRecipeCatalog.filter((recipe) => recipeIsUnlocked(recipe, state)).filter((recipe) => {
    const matchesQuery = !query.trim() || `${recipe.name} ${recipe.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (category === 'all' || recipe.category === category) && (scienceFilter === 'all' || recipe.scienceChain === scienceFilter);
  }), [category, query, scienceFilter, state]);
  const amountLabel = (amount: number) => Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2);
  const handcraft = (key: ComponentKey) => {
    const recipe = recipeMap[key];
    if (state.handcraft) return notice(state.handcraft.recipeKey === key ? `already handcrafting ${prettyLabel(key)}` : `finish handcrafting ${prettyLabel(state.handcraft.recipeKey)} first`);
    if (!hasInputs(state, recipeInputs(recipe))) return notice('missing recipe inputs');
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
      const missing = missingBuildMaterials(state, [{ key: 'stone', amount: stoneFurnaceBuildCost.stone, source: 'raw' }]);
      if (missing) return notice(`need ${missing}`);
      setState((s) => ({ ...s, raw: { ...s.raw, stone: s.raw.stone - stoneFurnaceBuildCost.stone } }));
      enqueue('furnace', `${prettyLabel(key)} stone furnace`, stoneFurnaceRecipe.energyRequired, key);
      return;
    }
    if (!automationUnlocked) return notice('Automation technology required');
    const missing = missingBuildMaterials(state, [{ key: 'circuit', amount: assemblyMachineOneBuildCost.circuit, source: 'products' }, { key: 'gear', amount: assemblyMachineOneBuildCost.gear, source: 'products' }, { key: 'ironPlate', amount: assemblyMachineOneBuildCost.ironPlate, source: 'products' }]);
    if (missing) return notice(`need ${missing}`);
    setState((s) => ({ ...s, products: { ...s.products, circuit: s.products.circuit - assemblyMachineOneBuildCost.circuit, gear: s.products.gear - assemblyMachineOneBuildCost.gear, ironPlate: s.products.ironPlate - assemblyMachineOneBuildCost.ironPlate } }));
    enqueue('assembler', `${prettyLabel(key)} assembly machine 1`, assemblyMachineOneRecipe.energyRequired, key);
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
      <div className="data-row mt-2 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2"><ResourceIcon item="assembling-machine-1" size={18} /><span className="text-[10px] font-semibold">Assembly Machine 1</span><span className="ml-auto text-right text-[9px] text-[hsl(var(--muted-foreground))]">3 circuits + 5 gears + 9 plates · {assemblyMachineOneRecipe.energyRequired}s build</span></div>
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
      const building = productionBuildingFor(recipe);
      const buildingLabel = smelting ? 'Stone Furnace' : 'Assembly Machine 1';
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
        {handcraftJob && <HandcraftProgress job={handcraftJob} recipe={recipe} />}
        <div className="mt-4 flex gap-2">{count ? <><button onClick={() => notice(`${prettyLabel(key)} ${buildingLabel.toLowerCase()} is running at ${productionRate.toFixed(1)} / min`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-inspect-production-${key}`}><Gauge size={13} /> inspect live rate</button>{handcraftControl}<button onClick={() => buildProductionUnit(key)} className={`button-base flex-1 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct another ${buildingLabel} for ${prettyLabel(key)}`} data-testid={`button-build-more-${buildingAction}-${key}`}>{isBuilding ? <><Check size={13} /> queued · build another</> : <><Hammer size={13} /> construct another</>}</button></> : <><button onClick={() => handcraft(key)} className="button-base button-primary flex-1 !py-2" data-testid={`button-handcraft-production-${key}`}><Plus size={13} /> handcraft</button><button onClick={() => buildProductionUnit(key)} className={`button-base !px-3 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct ${buildingLabel} for ${prettyLabel(key)}`} data-testid={`button-build-${buildingAction}-${key}`}>{isBuilding ? <Check size={13} /> : <Hammer size={13} />}</button></>}</div>
      </section>;
    })}</div>
  </PageFrame>;
}

function PowerPage({ state, notice }: PageProps) {
  const steam = state.research.includes('steam-power'); const solar = state.research.includes('solar-energy'); const nuclear = state.research.includes('nuclear-power'); const draw = electricPowerDraw(state); const production = (steam ? 80 : 0) + (solar ? 45 : 0) + (nuclear ? 180 : 0);
  const Node = ({ title, sub, icon, active, locked }: { title: string; sub: string; icon: ReactNode; active?: boolean; locked?: boolean }) => <div className={`tree-line flex items-center gap-3 rounded-xl border p-3 ${active ? 'border-[hsl(var(--secondary)/.5)] bg-[hsl(174_30%_15%/.7)]' : locked ? 'locked-wash border-[hsl(var(--border))] opacity-65' : 'border-[hsl(var(--border))] bg-[hsl(216_24%_11%/.7)]'}`}><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{locked ? <LockKeyhole size={15} /> : icon}</div><div className="min-w-0"><div className="text-[11px] font-bold">{title}</div><div className="mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">{sub}</div></div><div className="ml-auto">{active ? <Tag>online</Tag> : locked ? <Tag tone="muted">research</Tag> : <Tag tone="amber">standby</Tag>}</div></div>;
  return <PageFrame><Header eyebrow="Energy network" title="Power" copy="Power is a dependency tree, not a single number. Research a generation family, then watch its conversion chain come online." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><BatteryCharging size={17} className="text-[hsl(var(--secondary))]" /><span className="mono text-[15px]">{production} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">MW produced</span></span></div>} /><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="surface rounded-xl p-4"><div className="eyebrow">Production</div><div className="mono mt-2 text-xl text-[hsl(var(--secondary))]">{production} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Factory draw</div><div className="mono mt-2 text-xl">{draw} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Net balance</div><div className={`mono mt-2 text-xl ${production >= draw ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{production - draw} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Efficiency</div><div className="mono mt-2 text-xl">{state.upgrades.powerEfficiency * 6}%</div></div></div><div className="grid gap-5 lg:grid-cols-3"><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={steam ? 'online' : 'locked'}>Steam generation</SectionTitle><div className="space-y-4"><Node title="Boiler" sub="coal + water → heat" icon={<FlameIcon />} active={steam} locked={!steam} /><Node title="Steam" sub="pressurized thermal fluid" icon={<Waves size={16} />} active={steam} locked={!steam} /><Node title="Steam engine" sub="80 MW potential" icon={<Gauge size={16} />} active={steam} locked={!steam} /></div><button onClick={() => notice(steam ? 'steam chain is online' : 'unlock Steam Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-steam">{steam ? 'inspect steam chain' : 'view steam dependency'}</button></section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={solar ? 'online' : 'locked'}>Solar generation</SectionTitle><div className="space-y-4"><Node title="Solar array" sub="sunlight → current" icon={<Sun size={16} />} active={solar} locked={!solar} /><Node title="Inverter bank" sub="stable daytime output" icon={<Zap size={16} />} active={solar} locked={!solar} /><Node title="Power bus" sub="45 MW potential" icon={<Power size={16} />} active={solar} locked={!solar} /></div><button onClick={() => notice(solar ? 'solar array is online' : 'unlock Solar Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-solar">{solar ? 'inspect solar chain' : 'view solar dependency'}</button></section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={nuclear ? 'online' : 'locked'}>Nuclear generation</SectionTitle><div className="space-y-4"><Node title="Nuclear reactor" sub="uranium + acid → heat" icon={<Sparkles size={16} />} active={nuclear} locked={!nuclear} /><Node title="Heat exchanger" sub="heat → steam" icon={<Waves size={16} />} active={nuclear} locked={!nuclear} /><Node title="Power turbine" sub="180 MW potential" icon={<Gauge size={16} />} active={nuclear} locked={!nuclear} /></div><button onClick={() => notice(nuclear ? 'nuclear chain is online' : 'unlock Nuclear Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-nuclear">{nuclear ? 'inspect nuclear chain' : 'view nuclear dependency'}</button></section></div><p className="mt-5 text-[10px] text-[hsl(var(--muted-foreground))]"><Info size={13} className="mr-1 inline text-[hsl(var(--secondary))]" /> Power families are gated by research and represented as a clear production tree before you build them.</p></PageFrame>;
}
function FlameIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 2.8c.4 3-1.3 4.2-2.4 5.4-1 1-1.2 2.3-.6 3.3.4-1.3 1.5-2.3 2.8-2.7 2.6 2 3.8 4.3 3.2 7.1-.4 1.8-1.7 3.2-3.3 4.1 4.7-.8 7-4 6.2-8.4-.5-2.8-2.5-5.8-5.9-8.8ZM10 12c-3.7 1.4-5.4 4-4.6 6.6.6 2 2.3 3.4 4.5 4-1.2-1.2-1.5-2.6-.6-4.1.7-1.2 1.6-2.1 2.6-2.6-1.1-1-1.8-2.3-1.9-3.9Z"/></svg>; }

function StoragePage({ state, setState, enqueue, notice }: PageProps) {
  const buildStorageBox = (key: TrackedKey) => {
    const constructionItems = state.queue.filter((item) => item.action === 'storage' && item.targetId === key);
    const missing = missingBuildMaterials(state, [{ key: 'wood', amount: storageBoxWoodCost, source: 'raw' }]);
    if (missing) return notice(`need ${missing}`);
    setState((s) => ({ ...s, raw: { ...s.raw, wood: s.raw.wood - storageBoxWoodCost } }));
    enqueue('storage', `Wooden box · ${meta[key].label}`, storageBoxBuildSeconds, key);
    notice(`wooden box for ${meta[key].label} queued`);
  };
  const unlockedKeys = orderedTrackedKeys.filter((key) => unlockedProductKeys(state).has(key));
  const [scienceFilter, setScienceFilter] = useState<RecipeScienceFilter>('Core');
  const visibleKeys = unlockedKeys.filter((key) => scienceFilter === 'all' || trackedScienceChainFor(key) === scienceFilter);
  return <PageFrame>
    <Header eyebrow="Buffer control" title="Storage" copy="Compact buffers for every unlocked material. Build wooden boxes to expand a product's capacity." action={<Tag><Box size={11} /> {visibleKeys.length} visible items</Tag>} />
    <section className="surface rounded-xl p-2.5 sm:p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="eyebrow">Science chain filter</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{unlockedKeys.length} unlocked · {unlockedKeys.filter((key) => trackedScienceChainFor(key) === 'Core').length} core / {unlockedKeys.filter((key) => trackedScienceChainFor(key) === 'Non-Core').length} non-core</div></div><select value={scienceFilter} onChange={(event) => setScienceFilter(event.target.value as RecipeScienceFilter)} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none" aria-label="Filter storage science chain" data-testid="select-storage-science-filter"><option value="all">All items</option><option value="Core">Core items</option><option value="Non-Core">Non-Core items</option></select></div>
      <div className="space-y-2">
        {visibleKeys.map((key) => {
          const amount = quantityFor(state, key);
          const capacity = capFor(state, key);
          const boxCount = state.storageBoxes[key] ?? Math.max(1, Math.ceil((state.storage[key] ?? storageBoxCapacity) / storageBoxCapacity));
          const constructionItems = state.queue.filter((item) => item.action === 'storage' && item.targetId === key);
          const isBuilding = constructionItems.length > 0;
          return <section className="data-row rounded-lg p-2.5" key={key} data-testid={`row-storage-${key}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="resource-orb !h-8 !w-8 shrink-0"><ResourceIcon item={key} size={22} /></div>
              <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold">{meta[key].label}</div><div className="text-[9px] text-[hsl(var(--muted-foreground))]">{meta[key].category} · {trackedScienceChainFor(key)}</div></div>
              <div className="flex shrink-0 items-center gap-1.5 text-[hsl(var(--secondary))]" title={`${boxCount} wooden storage box${boxCount === 1 ? '' : 'es'}`}>
                <ResourceIcon item="wooden-chest" size={17} /><span className="mono text-[11px]">{boxCount}</span>
              </div>
              <button onClick={() => buildStorageBox(key)} className={`button-base button-ghost !gap-1 !px-2 !py-1.5 ${isBuilding ? 'button-build-active' : ''}`} aria-label={`Construct another wooden box for ${meta[key].label}`} title={`Construct another wooden box · ${storageBoxWoodCost} wood · ${storageBoxBuildSeconds} sec`} data-testid={`button-build-storage-${key}`}>
                {isBuilding ? <Check size={12} /> : <Plus size={12} />}<span className="hidden sm:inline">box</span><ResourceIcon item="wood" size={13} /><span className="mono text-[9px] text-[hsl(var(--primary))]">{storageBoxWoodCost}</span>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2" aria-label={`${meta[key].label}: ${fmt(amount)} in stock, capacity ${fmt(capacity)}`}>
              <span className="mono w-12 shrink-0 text-[11px]" title="Current stock">{fmt(amount)}</span>
              <div className="min-w-0 flex-1"><Progress value={amount / capacity * 100} /></div>
              <span className="mono w-14 shrink-0 text-right text-[11px]" title="Total capacity">{fmt(capacity)}</span>
            </div>
            {isBuilding && <BuildProgress items={constructionItems} label={`Wooden box · ${meta[key].label}`} />}
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

function UpgradesPage({ state, setState, enqueue, notice }: PageProps) {
  const buy = (item: typeof upgradeData[number]) => { const level = state.upgrades[item.id]; const cost = item.base + totalUnits(state) * 2 + level * item.base; if (state.products.circuit < cost) return notice(`need ${cost} circuits`); setState((s) => ({ ...s, products: { ...s.products, circuit: s.products.circuit - cost } })); enqueue('upgrade', `${item.title} · level ${level + 1}`, 35, item.id); notice(`${item.title} queued for upgrade`); };
  return <PageFrame><Header eyebrow="Gameplay modifications" title="Upgrades" copy="These are not unlocks. Each upgrade changes the way an existing part of the factory behaves, with costs that scale as the network grows." action={<Tag><TrendingUp size={11} /> levels persist</Tag>} /><div className="grid gap-3 md:grid-cols-2">{upgradeData.map((item) => { const level = state.upgrades[item.id]; const cost = item.base + totalUnits(state) * 2 + level * item.base; return <section className="surface rounded-xl p-4 sm:p-5" key={item.id} data-testid={`card-upgrade-${item.id}`}><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">{item.id === 'manualMining' ? <Pickaxe size={18} /> : item.id === 'productionSpeed' ? <Gauge size={18} /> : item.id === 'storageEfficiency' ? <Box size={18} /> : <Zap size={18} />}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h2 className="text-[13px] font-extrabold">{item.title}</h2><span className="mono text-[11px] text-[hsl(var(--primary))]">LVL {level}</span></div><p className="mt-1 text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">{item.copy}</p></div></div><div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3"><div><div className="eyebrow">Next effect</div><div className="mono mt-1 text-[11px] text-[hsl(var(--secondary))]">+{item.id === 'manualMining' ? level + 2 : item.id === 'productionSpeed' ? '10%' : item.id === 'storageEfficiency' ? '8%' : '6%'} {item.unit}</div></div><button onClick={() => buy(item)} className="button-base button-primary !py-2" data-testid={`button-buy-upgrade-${item.id}`}><TrendingUp size={13} /> upgrade · {cost} circuit</button></div></section>; })}</div></PageFrame>;
}

function SciencePage({ state, setState, enqueue, notice }: PageProps) {
  const activeResearch = activeResearchFor(state);
  const requiredScienceKeys = scienceRequirementKeysFor(activeResearch);
  const currentSpm = scienceCurrentSpmFor(state, requiredScienceKeys);
  const peakSpm = sciencePeakSpmFor(state, requiredScienceKeys);
  const labRate = scienceLabRateFor(state, activeResearch);
  const buildLab = () => { const missing = missingBuildMaterials(state, [{ key: 'ironPlate', amount: 12, source: 'products' }, { key: 'circuit', amount: 4, source: 'products' }]); if (missing) return notice(`need ${missing}`); setState((s) => ({ ...s, products: { ...s.products, ironPlate: s.products.ironPlate - 12, circuit: s.products.circuit - 4 } })); enqueue('lab', 'Science lab', 65); };
  const amountLabel = (amount: number) => Number.isInteger(amount) ? fmt(amount) : amount.toFixed(2);
  return <PageFrame>
    <Header eyebrow="Research fuel" title="Science" copy="Labs consume every science pack required by the active research. SPM is limited by lab capacity and the tightest available pack line." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><FlaskConical size={17} className="text-[hsl(var(--primary))]" /><span className="mono text-[15px]">{currentSpm.toFixed(1)} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">SPM</span></span></div>} />
    <section className="surface mb-5 rounded-xl p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3"><SectionTitle detail={activeResearch ? `${requiredScienceKeys.length} pack types required` : 'select research to run labs'}>Science throughput</SectionTitle><button onClick={buildLab} className="button-base button-primary !py-2" data-testid="button-build-lab"><Plus size={13} /> build lab</button></div>
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
           <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item="lab" size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="text-[13px] font-extrabold">Science labs</h2><Tag><span className="status-dot status-running" /> online</Tag></div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Each lab advances the active technology on its research timer and consumes its science requirements.</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><div className="data-row rounded-lg p-2.5"><div className="eyebrow">current</div><div className="mono mt-1 text-[15px] text-[hsl(var(--primary))]">{currentSpm.toFixed(1)} / min</div></div><div className="data-row rounded-lg p-2.5"><div className="eyebrow">peak</div><div className="mono mt-1 text-[15px] text-[hsl(var(--secondary))]">{peakSpm.toFixed(1)} / min</div></div></div>
        </article>
        {scienceKeys.map((key) => {
          const recipe = recipeMap[scienceRecipeKeys[key]];
          const unlocked = recipeIsUnlocked(recipe, state);
          const required = requiredScienceKeys.includes(key);
          const productionCapacity = unlocked ? sciencePackProductionRateFor(state, key) : 0;
          const currentProduction = unlocked ? productionRateFor(state, key) : 0;
          const currentConsumption = required ? demandRateFor(state, key) : 0;
          const peakConsumption = required ? labRate : 0;
          const ingredients = recipe.ingredients.map((ingredient) => `${amountLabel(materialAmount(ingredient))} ${prettyLabel(keyForSource(ingredient.name))}`).join(' + ');
          return <article className={`rounded-xl border p-3.5 sm:p-4 ${unlocked ? 'surface-soft' : 'locked-wash opacity-55 grayscale'}`} key={key} data-testid={`card-science-${key}`}>
            <div className="flex items-start gap-3"><div className="resource-orb !h-10 !w-10"><ResourceIcon item={key} size={27} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">{meta[key].label}</h2>{unlocked ? <Tag><span className="status-dot status-running" /> unlocked</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag>}</div><p className="mt-1 truncate text-[9px] text-[hsl(var(--muted-foreground))]" title={ingredients}>recipe · {ingredients}</p></div></div>
            <CompactMetricsRow production={currentProduction} peakProduction={productionCapacity} demand={currentConsumption} peakConsumption={peakConsumption} net={currentProduction - currentConsumption} storage={state.products[key] ?? 0} capacity={capFor(state, key)} />
            <div className="mt-3 flex items-center justify-between text-[9px] text-[hsl(var(--muted-foreground))]"><span>{required ? 'required by active research' : 'not required by active research'}</span><span className="mono">{Math.min(productionCapacity, required ? labRate : productionCapacity).toFixed(1)} supported / min</span></div>
          </article>;
        })}
      </div>
    </section>
  </PageFrame>;
}

function ResearchArt({ accent }: { accent: string }) { return <div className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_25%_10%)]" style={{ color: accent }}><svg width="72" height="56" viewBox="0 0 72 56" aria-hidden="true"><path stroke="currentColor" strokeOpacity=".35" d="M6 43 22 27l10 8 15-21 19 14" /><circle cx="22" cy="27" r="5" fill="currentColor" opacity=".85" /><circle cx="47" cy="14" r="5" fill="currentColor" opacity=".65" /><path fill="currentColor" opacity=".18" d="M7 47h58v3H7zM12 10h3v34h-3zm45 13h3v21h-3z" /></svg></div>; }
function ResearchPage({ state, setState, notice }: PageProps) {
  const [selected, setSelected] = useState<ResearchKey>(state.currentResearch ?? orderedTechnologyCatalog[0]?.name ?? '');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ResearchFilter>('unlocked');
  const accentFor = (name: string) => ['#65afba', '#df7165', '#dfb05c', '#8ea9db', '#92c86b', '#c9d3d0'][name.length % 6];
  const selectResearch = (name: ResearchKey) => {
    setSelected(name);
    setState((s) => s.currentResearch === name ? s : { ...s, currentResearch: name });
  };
  const toggleAutoResearch = (name: ResearchKey) => {
    setState((s) => {
      const selectedAuto = new Set(s.autoResearch ?? []);
      if (selectedAuto.has(name)) selectedAuto.delete(name);
      else selectedAuto.add(name);
      const autoResearch = orderedTechnologyCatalog.filter((technology) => selectedAuto.has(technology.name)).map((technology) => technology.name);
      return { ...s, autoResearch, currentResearch: s.currentResearch ?? name };
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
              <ResearchArt accent={accentFor(technology.name)} />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-extrabold">{prettyLabel(technology.name)}</span>{isResearching && !done ? <Tag><span className="status-dot status-running mini-pulse" /> researching</Tag> : done ? <Tag><Check size={10} /> complete</Tag> : ready ? <Tag tone="amber">ready</Tag> : !prerequisitesMet ? <Tag tone="muted"><LockKeyhole size={10} /> prerequisite</Tag> : technology.researchTrigger ? <Tag tone="muted"><Clock3 size={10} /> production trigger</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> pack low</Tag>}</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{technology.effects.length} effects · {technology.prerequisites.length} prerequisites{technology.upgrade ? ' · upgrade' : ''}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">{technology.scienceCosts.length ? (() => { const amounts = technology.scienceCosts.map((cost) => researchRequirementLabel(technology, cost).split(' · ').pop() ?? ''); const sharedAmount = amounts.every((amount) => amount === amounts[0]) ? amounts[0] : amounts.join(' / '); return <span className="flex items-center gap-1.5 rounded border border-[hsl(var(--border))] bg-[hsl(216_24%_10%/.72)] px-1.5 py-1" title={`${technology.scienceCosts.map((cost) => researchRequirementLabel(technology, cost)).join(', ')}`} aria-label={`Science cost: ${technology.scienceCosts.map((cost) => researchRequirementLabel(technology, cost)).join(', ')}`}>{technology.scienceCosts.map((cost) => <ResourceIcon item={keyForSource(cost.pack)} size={18} key={cost.pack} />)}<span className="mono text-[10px] text-[hsl(var(--primary))]">×{sharedAmount}</span></span>; })() : technology.researchTrigger ? <span className="resource-chip !px-1.5 !py-1"><Clock3 size={12} /> trigger · {prettyLabel(technology.researchTrigger.item ?? technology.researchTrigger.type)}{technology.researchTrigger.count ? ` · ${fmt(technology.researchTrigger.count)}` : ''}</span> : <span className="text-[9px] text-[hsl(var(--muted-foreground))]">No science requirement</span>}</div>
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
         {item.researchTrigger ? <div className="border-b border-[hsl(var(--border))] py-4"><div className="eyebrow mb-2">Production trigger</div><div className="text-[11px]">{prettyLabel(item.researchTrigger.type)}{item.researchTrigger.item ? ` · ${prettyLabel(item.researchTrigger.item)}` : ''}</div>{selectedTriggerProgress ? <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Starting inventory does not count toward this trigger.</div> : <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">This trigger type is not represented by a quantity counter in the current simulator.</div>}</div> : <div className="border-b border-[hsl(var(--border))] py-4"><div className="eyebrow mb-3">Science requirements</div><div className="space-y-2">{item.scienceCosts.length ? item.scienceCosts.map((cost) => { const costKey = keyForSource(cost.pack); const have = quantityFor(state, costKey); return <div className="flex items-center justify-between text-[11px]" key={cost.pack}><span className="flex items-center gap-2"><ResourceIcon item={costKey} size={20} />{meta[costKey].label} <span className="text-[9px] text-[hsl(var(--muted-foreground))]">per unit</span></span><span className={`mono ${have >= cost.amount ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{fmt(have)} / {cost.amount}</span></div>; }) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No science packs required.</div>}</div><div className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">Total requirement: <span className="mono">{item.scienceCosts.length ? item.scienceCosts.map((cost) => researchRequirementLabel(item, cost)).join(' · ') : 'none'}</span></div></div>}
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
    : technology.researchTrigger ? 'Production trigger' : 'No science packs';
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[hsl(0_0%_0%/.78)] p-4 backdrop-blur-sm" role="presentation">
    <section className="surface w-full max-w-[520px] rounded-2xl border-[hsl(var(--secondary)/.7)] bg-[linear-gradient(145deg,hsl(88_24%_17%),hsl(216_25%_12%))] p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="research-complete-title" data-testid="dialog-research-complete">
      <div className="flex items-center justify-between gap-3"><Tag><Check size={11} /> research complete</Tag><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{state.researchNotifications.length > 1 ? `${state.researchNotifications.length} queued` : 'new unlock'}</span></div>
      <h2 id="research-complete-title" className="mt-4 text-xl font-extrabold">{prettyLabel(technology.name)}</h2>
      <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">This technology is now online and its effects are available across the factory.</p>
      <div className="mt-5 grid grid-cols-2 gap-2"><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Research effort</div><div className="mono mt-1 text-[12px] text-[hsl(var(--secondary))]">{technology.researchTrigger ? 'production trigger' : `${fmt(researchUnitsFor(technology))} lab units`}</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Science invested</div><div className="mono mt-1 truncate text-[12px] text-[hsl(var(--primary))]" title={scienceSummary}>{scienceSummary}</div></div></div>
      <div className="mt-5"><div className="eyebrow mb-2">Effects enabled</div><div className="space-y-2">{technology.effects.length ? technology.effects.map((effect, index) => <div className="data-row rounded-lg px-3 py-2 text-[10px]" key={`${effect.type}-${index}`}><span className="font-semibold">{effect.recipe ? `Unlock ${prettyLabel(effect.recipe)}` : prettyLabel(effect.type)}</span>{effect.target && <span className="text-[hsl(var(--muted-foreground))]"> · {prettyLabel(effect.target)}</span>}{effect.modifier !== undefined && <span className="mono float-right text-[hsl(var(--secondary))]">{typeof effect.modifier === 'number' && effect.modifier > 0 ? '+' : ''}{String(effect.modifier)}</span>}</div>) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No listed effects.</div>}</div></div>
      <button onClick={acknowledge} className="button-base button-primary mt-6 w-full" data-testid="button-acknowledge-research"><Check size={14} /> acknowledge</button>
    </section>
  </div>;
}

function SettingsPage({ state, setState, saveNow, reset, notice }: PageProps) {
  const [confirm, setConfirm] = useState(false);
  return <PageFrame><Header eyebrow="Control room preferences" title="Settings" copy="Local controls for this browser instance. Nothing here changes the scope of the simulation." action={<Tag><Save size={11} /> local save</Tag>} /><div className="grid gap-5 lg:grid-cols-2"><section className="surface rounded-xl p-5"><SectionTitle>Local save controls</SectionTitle><div className="rounded-xl bg-[hsl(216_24%_10%/.7)] p-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]"><Save size={16} /></div><div><div className="text-[12px] font-bold">Browser save is active</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Production ticks and settings survive a reload.</div></div></div><div className="mt-4 flex gap-2"><button onClick={() => { saveNow(); notice('save committed now'); }} className="button-base button-primary" data-testid="button-save-now"><Save size={13} /> save now</button><button onClick={() => setConfirm(true)} className="button-base button-ghost text-[hsl(var(--destructive))]" data-testid="button-reset-save"><Trash2 size={13} /> reset progress</button></div></div>{confirm && <div className="mt-3 rounded-xl border border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--destructive)/.08)] p-4" data-testid="panel-reset-confirm"><div className="flex gap-2"><ShieldAlert size={16} className="text-[hsl(var(--destructive))]" /><div><div className="text-[12px] font-bold">Reset this factory?</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">This removes the local save and starts a new sector. This cannot be undone.</p></div></div><div className="mt-3 flex gap-2"><button onClick={() => { reset(); setConfirm(false); notice('new sector initialized'); }} className="button-base bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]" data-testid="button-confirm-reset">confirm reset</button><button onClick={() => setConfirm(false)} className="button-base button-ghost" data-testid="button-cancel-reset">cancel</button></div></div>}</section><section className="surface rounded-xl p-5"><SectionTitle>Simulation speed</SectionTitle><div className="grid grid-cols-3 gap-2">{[.5, 1, 2].map((speed) => <button onClick={() => setState((s) => ({ ...s, simulationSpeed: speed }))} className={`button-base py-3 ${state.simulationSpeed === speed ? 'button-primary' : 'button-ghost'}`} key={speed} data-testid={`button-speed-${speed}`}>{speed}x</button>)}</div><div className="mt-5 border-t border-[hsl(var(--border))] pt-4"><SectionTitle>Control legend</SectionTitle><div className="space-y-3 text-[11px] text-[hsl(var(--muted-foreground))]"><div className="flex items-center gap-2"><span className="status-dot status-running" /><span><strong className="text-[hsl(var(--foreground))]">Green</strong> means a unit is consuming and producing.</span></div><div className="flex items-center gap-2"><span className="status-dot status-starved" /><span><strong className="text-[hsl(var(--foreground))]">Yellow</strong> means an input is below recipe demand.</span></div><div className="flex items-center gap-2"><span className="status-dot status-blocked" /><span><strong className="text-[hsl(var(--foreground))]">Red</strong> means output or a control path is blocked.</span></div></div></div></section></div><section className="surface mt-5 rounded-xl p-5"><div className="flex items-start gap-3"><CircleHelp size={17} className="text-[hsl(var(--primary))]" /><div><div className="eyebrow">About this slice</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Factory Production Game is a local, playable incremental factory. The resource art, production loop, and control-room language are original to this interface.</p></div></div></section></PageFrame>;
}

type PageProps = { state: GameState; setState: Dispatch<SetStateAction<GameState>>; enqueue: (action: QueueItem['action'], target: string, seconds: number, targetId?: string) => void; saveNow: () => void; reset: () => void; notice: (message: string) => void; away: number; recovered: number };

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
  const reset = () => { localStorage.removeItem(SAVE_KEY); setState({ ...initialState, lastSeen: Date.now(), storage: { ...initialState.storage }, storageBoxes: { ...initialState.storageBoxes }, raw: { ...initialState.raw }, products: { ...initialState.products }, rateHistory: [] }); };
  const enqueue = (action: QueueItem['action'], target: string, seconds: number, targetId?: string) => setState((s) => ({ ...s, queue: [...s.queue, { id: `${action}-${Date.now()}`, action, target, targetId, seconds, total: seconds }] }));
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
  return <Shell>{page}{toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[hsl(var(--primary)/.4)] bg-[hsl(216_25%_13%/.97)] px-4 py-2 mono text-[10px] text-[hsl(var(--primary))] shadow-xl md:bottom-6" role="status" data-testid="status-toast">{toast}</div>}{state.researchNotifications.length > 0 && <ResearchCompletionModal state={state} setState={setState} />}</Shell>;
}

function App() { return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Game /></WouterRouter>; }
export default App;