import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import { recipeCatalog, type RecipeCatalogEntry, type RecipeMaterial } from './recipeCatalog';
import { tierProductCatalog } from './productTierCatalog';
import { technologyCatalog, type TechnologyDefinition } from './technologyCatalog';
import {
  Activity, ArrowRight, BatteryCharging, Box, Check, ChevronRight, CircleHelp, Clock3,
  Cog, MoveRight, Cpu, Factory as FactoryIcon, FlaskConical, Gauge, Hammer,
  Info, Layers3, Lightbulb, LockKeyhole, Pickaxe, Plus, Power,
  RotateCcw, Save, Settings2, ShieldAlert, Sparkles, Sun, Trash2,
  TrendingUp, TriangleAlert, Truck, Waves, Zap,
} from 'lucide-react';

type RawKey = 'iron' | 'copper' | 'stone' | 'coal' | 'wood' | 'water' | 'uranium';
type ComponentKey = string;
type ScienceKey = 'automationPack' | 'logisticsPack' | 'researchPack';
type TrackedKey = string;
type UpgradeKey = 'manualMining' | 'productionSpeed' | 'storageEfficiency' | 'powerEfficiency';
type ResearchKey = string;
type UnitStatus = 'running' | 'starved' | 'blocked';

type Recipe = RecipeCatalogEntry;
type QueueItem = { id: string; action: 'miner' | 'pump' | 'uraniumMiner' | 'assembler' | 'lab' | 'upgrade'; target: string; targetId?: string; seconds: number; total: number };
type HandcraftJob = { recipeKey: string; seconds: number; total: number };
type GameState = {
  raw: Record<RawKey, number>;
  products: Record<string, number>;
  storage: Record<TrackedKey, number>;
  miners: Record<RawKey, number>;
  pumps: number;
  uraniumMiners: number;
  assemblers: Record<string, number>;
  labs: number;
  miningProgress: Record<RawKey, number>;
  assemblyProgress: Record<string, number>;
  labProgress: number;
  handcraft: HandcraftJob | null;
  queue: QueueItem[];
  research: ResearchKey[];
  produced: Record<string, number>;
  upgrades: Record<UpgradeKey, number>;
  totalOutput: number;
  lastSeen: number;
  simulationSpeed: number;
};

const SAVE_KEY = 'factory-production-game-save-v2';
const rawKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal', 'wood', 'water', 'uranium'];
const scienceKeys: ScienceKey[] = ['automationPack', 'logisticsPack', 'researchPack'];
const technologyMap: Record<string, TechnologyDefinition> = Object.fromEntries(technologyCatalog.map((technology) => [technology.name, technology]));
const legacyResearchAliases: Record<string, string> = { steamPower: 'steam-power', solarPower: 'solar-energy', nuclearPower: 'nuclear-power', steelProcessing: 'steel-processing' };
const normalizeResearchKey = (key: string) => legacyResearchAliases[key] ?? key;
const sourceKeyAliases: Record<string, TrackedKey> = {
  'iron-ore': 'iron', 'copper-ore': 'copper', 'uranium-ore': 'uranium',
  'iron-plate': 'ironPlate', 'copper-plate': 'copperPlate', 'steel-plate': 'steel',
  'iron-gear-wheel': 'gear', 'electronic-circuit': 'circuit',
  'automation-science-pack': 'automationPack', 'logistic-science-pack': 'logisticsPack',
  'production-science-pack': 'researchPack',
};
const keyForSource = (name: string) => sourceKeyAliases[name] ?? name;
const recipeMap: Record<string, Recipe> = Object.fromEntries(recipeCatalog.map((recipe) => [recipe.name, recipe]));
const componentKeys: ComponentKey[] = recipeCatalog.map((recipe) => recipe.name);
const scienceRecipeKeys: Record<ScienceKey, string> = { automationPack: 'automation-science-pack', logisticsPack: 'logistic-science-pack', researchPack: 'production-science-pack' };
const burnerMinerKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal', 'wood'];
const burnerMiningDrillRecipe = recipeMap['burner-mining-drill'];
const burnerMiningDrillCost = { gear: 3, ironPlate: 3, stone: 5 };
const burnerMiningDrillCoalPerSecond = 0.25;
const assemblyMachineOneRecipe = recipeMap['assembling-machine-1'];
const assemblyMachineOneBuildCost = { circuit: 3, gear: 5, ironPlate: 9 };
const assemblyMachineOnePowerKw = 75;
const labPowerKw = 7000;
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
const recipeOutputs = (recipe: Recipe) => recipe.results.map((material) => ({ key: keyForSource(material.name), amount: materialAmount(material), source: material }));
const trackedKeys: TrackedKey[] = Array.from(new Set([
  ...rawKeys,
  ...recipeCatalog.flatMap((recipe) => [...recipe.ingredients, ...recipe.results].map((material) => keyForSource(material.name))),
  ...technologyCatalog.flatMap((technology) => technology.scienceCosts.map((cost) => keyForSource(cost.pack))),
]));
const tierProductOrder = new Map(tierProductCatalog.map((product, index) => [keyForSource(product.sourceName), index]));
const tierForProduct = (key: string) => tierProductOrder.get(key) ?? Number.MAX_SAFE_INTEGER;
const orderedTrackedKeys = [...trackedKeys].sort((a, b) => tierForProduct(a) - tierForProduct(b) || a.localeCompare(b));
const orderedRecipeCatalog = [...recipeCatalog].sort((a, b) => {
  const aTier = Math.min(...recipeOutputs(a).map((output) => tierForProduct(output.key)), Number.MAX_SAFE_INTEGER);
  const bTier = Math.min(...recipeOutputs(b).map((output) => tierForProduct(output.key)), Number.MAX_SAFE_INTEGER);
  return aTier - bTier;
});
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
  logisticsPack: { label: 'Logistics science', short: 'logistics', color: '#d6a04f', category: 'Science' }, researchPack: { label: 'Research science', short: 'research', color: '#8ea9db', category: 'Science' },
};
const meta: Record<TrackedKey, { label: string; short: string; color: string; category: string }> = Object.fromEntries(trackedKeys.map((key, index) => {
  const fallback = { label: prettyLabel(key), short: key, color: ['#c9d3d0', '#e6a067', '#8da8a7', '#dfb05c', '#54b8a8', '#8ea9db'][index % 6], category: 'Component' };
  return [key, baseMeta[key] ?? fallback];
}));
const starterProducts: Record<string, number> = {
  ...Object.fromEntries(trackedKeys.map((key) => [key, 0])),
  ironPlate: 28, copperPlate: 14, steel: 4, gear: 9, pipe: 4, circuit: 3, automationPack: 9, logisticsPack: 5, researchPack: 2,
};

const initialState: GameState = {
  raw: { iron: 62, copper: 38, stone: 26, coal: 31, wood: 18, water: 0, uranium: 0 },
  products: starterProducts,
  storage: Object.fromEntries(trackedKeys.map((key) => [key, 180])) as Record<TrackedKey, number>,
  miners: { iron: 0, copper: 0, stone: 0, coal: 0, wood: 0, water: 0, uranium: 0 },
  pumps: 0, uraniumMiners: 0,
  assemblers: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labs: 1, miningProgress: Object.fromEntries(rawKeys.map((key) => [key, 0])) as Record<RawKey, number>,
  assemblyProgress: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labProgress: 0, handcraft: null, queue: [], research: [], produced: Object.fromEntries(trackedKeys.map((key) => [key, 0])), upgrades: { manualMining: 0, productionSpeed: 0, storageEfficiency: 0, powerEfficiency: 0 },
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
  { id: 'productionSpeed', title: 'Tighter cycle control', copy: 'All autonomous assemblers complete cycles 10% faster.', base: 24, unit: '% speed' },
  { id: 'storageEfficiency', title: 'Dense rack packing', copy: 'Raise the effective capacity of every storage row by 8%.', base: 28, unit: '% capacity' },
  { id: 'powerEfficiency', title: 'Load balancing', copy: 'Reduce factory power draw by 6% per level.', base: 30, unit: '% efficiency' },
];

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');
const duration = (n: number) => `${Math.floor(n / 60)}m ${String(Math.max(0, Math.floor(n % 60))).padStart(2, '0')}s`;
const capFor = (state: GameState, key: TrackedKey) => Math.floor((state.storage[key] ?? 180) * (1 + state.upgrades.storageEfficiency * 0.08));
const burnerMinerCount = (state: GameState) => burnerMinerKeys.reduce((total, key) => total + state.miners[key], 0);
const electricUnitCount = (state: GameState) => Object.values(state.assemblers).reduce((a, b) => a + b, 0) + state.labs;
const burnerMinerCoalRate = (state: GameState) => burnerMinerCount(state) * burnerMiningDrillCoalPerSecond;
const electricPowerDraw = (state: GameState) => {
  const assemblerPower = Object.values(state.assemblers).reduce((total, count) => total + count * assemblyMachineOnePowerKw, 0);
  return (state.labs * labPowerKw + assemblerPower) * (1 - state.upgrades.powerEfficiency * 0.06) / 1000;
};
const powerLabel = (value: number) => Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
const totalUnits = (state: GameState) => burnerMinerCount(state) + state.pumps + state.uraniumMiners + electricUnitCount(state);
const quantityFor = (state: GameState, key: TrackedKey) => rawKeys.includes(key as RawKey) ? state.raw[key as RawKey] : state.products[key] ?? 0;
const hasInputs = (state: GameState, inputs: Partial<Record<TrackedKey, number>>) => Object.entries(inputs).every(([key, value]) => quantityFor(state, key) >= (value ?? 0));
const spendInputs = (state: GameState, inputs: Partial<Record<TrackedKey, number>>) => {
  Object.entries(inputs).forEach(([key, value]) => {
    if (rawKeys.includes(key as RawKey)) state.raw[key as RawKey] -= value ?? 0;
    else state.products[key] = (state.products[key] ?? 0) - (value ?? 0);
  });
};
const addTracked = (state: GameState, key: TrackedKey, amount: number, ignoreCapacity = false) => {
  if (rawKeys.includes(key as RawKey)) state.raw[key as RawKey] = ignoreCapacity ? state.raw[key as RawKey] + amount : Math.min(capFor(state, key), state.raw[key as RawKey] + amount);
  else state.products[key] = ignoreCapacity ? (state.products[key] ?? 0) + amount : Math.min(capFor(state, key), (state.products[key] ?? 0) + amount);
};
const recordProduction = (state: GameState, key: TrackedKey, amount: number) => {
  state.produced[key] = (state.produced[key] ?? 0) + amount;
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
const applyResearchTriggers = (state: GameState) => {
  let added = true;
  while (added) {
    added = false;
    technologyCatalog.forEach((technology) => {
      if (!technology.researchTrigger || state.research.includes(technology.name) || !researchTriggerMet(state, technology)) return;
      if (!technology.prerequisites.every((prerequisite) => state.research.includes(prerequisite))) return;
      state.research.push(technology.name);
      added = true;
    });
  }
};
const netRateFor = (state: GameState, key: TrackedKey) => {
  const speed = state.simulationSpeed;
  let rate = 0;
  if (rawKeys.includes(key as RawKey)) {
    const rawKey = key as RawKey;
    const count = rawKey === 'water' ? state.pumps : rawKey === 'uranium' ? state.uraniumMiners : state.miners[rawKey];
    const base = rawKey === 'uranium' ? 0.32 : rawKey === 'water' ? 0.7 : rawKey === 'copper' ? 0.88 : 1;
    const fuelRatio = burnerMinerCount(state) ? Math.min(1, state.raw.coal / Math.max(0.01, burnerMinerCoalRate(state) * 60 * speed)) : 1;
    rate += count * base * 60 * speed * (burnerMinerKeys.includes(rawKey) ? fuelRatio : 1);
    if (rawKey === 'coal') rate -= burnerMinerCoalRate(state) * 60 * speed * fuelRatio;
  }
  componentKeys.forEach((recipeKey) => {
    const recipe = recipeMap[recipeKey];
    const outputRate = (state.assemblers[recipeKey] ?? 0) * 60 * speed * (1 + state.upgrades.productionSpeed * 0.1) / recipe.energyRequired;
    recipeOutputs(recipe).forEach(({ key: outputKey, amount }) => {
      if (outputKey === key) rate += outputRate * amount;
    });
    Object.entries(recipeInputs(recipe)).forEach(([input, quantity]) => {
      if (input === key) rate -= outputRate * (quantity ?? 0);
    });
  });
  const activeLabPack = scienceKeys.find((pack) => state.products[pack] > 0);
  if (activeLabPack === key) rate -= state.labs * 12 * speed;
  return rate;
};

const burnerOperatingSeconds = (state: GameState, seconds: number) => {
  const fuelRate = burnerMinerCoalRate(state) * state.simulationSpeed;
  return fuelRate > 0 ? Math.min(seconds, Math.max(0, state.raw.coal) / fuelRate) : seconds;
};

function simulate(previous: GameState, seconds: number): GameState {
  const state: GameState = {
    ...previous, raw: { ...previous.raw }, products: { ...previous.products }, miners: { ...previous.miners }, storage: { ...previous.storage },
    assemblers: { ...previous.assemblers }, miningProgress: { ...previous.miningProgress }, assemblyProgress: { ...previous.assemblyProgress },
    handcraft: previous.handcraft ? { ...previous.handcraft } : null, queue: previous.queue.map((item) => ({ ...item })), research: [...previous.research], produced: { ...previous.produced }, lastSeen: Date.now(),
  };
  const speed = state.simulationSpeed;
  const operatingSeconds = burnerOperatingSeconds(state, seconds);
  if (burnerMinerCount(state)) {
    state.raw.coal = Math.max(0, state.raw.coal - burnerMinerCoalRate(state) * operatingSeconds * speed);
  }
  rawKeys.forEach((key) => {
    const count = key === 'water' ? state.pumps : key === 'uranium' ? state.uraniumMiners : state.miners[key];
    if (!count) return;
    const base = key === 'uranium' ? 0.32 : key === 'water' ? 0.7 : key === 'copper' ? 0.88 : 1;
    const minerSeconds = burnerMinerKeys.includes(key) ? operatingSeconds : seconds;
    state.miningProgress[key] += count * base * minerSeconds * speed;
    while (state.miningProgress[key] >= 1) {
      if (state.raw[key] >= capFor(state, key)) { state.miningProgress[key] = 0; break; }
      state.raw[key] += 1; state.miningProgress[key] -= 1; state.totalOutput += 1; recordProduction(state, key, 1);
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
      if (!hasInputs(state, recipeInputs(recipe)) || outputs.some(({ key: outputKey, amount }) => quantityFor(state, outputKey) + amount > capFor(state, outputKey))) break;
      spendInputs(state, recipeInputs(recipe));
      outputs.forEach(({ key: outputKey, amount }) => { addTracked(state, outputKey, amount); recordProduction(state, outputKey, amount); });
      state.assemblyProgress[key] -= 1; state.totalOutput += outputs.reduce((sum, output) => sum + output.amount, 0); cycles += 1;
    }
  });
  if (state.handcraft) {
    state.handcraft.seconds = Math.max(0, state.handcraft.seconds - seconds * speed);
    if (state.handcraft.seconds <= 0) {
      const recipe = recipeMap[state.handcraft.recipeKey];
      const outputs = recipeOutputs(recipe);
      outputs.forEach(({ key: outputKey, amount }) => { addTracked(state, outputKey, amount, true); recordProduction(state, outputKey, amount); });
      state.totalOutput += outputs.reduce((sum, output) => sum + output.amount, 0);
      state.handcraft = null;
    }
  }
  state.labProgress += state.labs * seconds * speed / 5;
  while (state.labProgress >= 1) {
    const pack = scienceKeys.find((key) => state.products[key] > 0);
    if (!pack) break;
    state.products[pack] -= 1; state.labProgress -= 1;
  }
  const completed = state.queue.filter((item) => item.seconds <= seconds);
  state.queue = state.queue.map((item) => ({ ...item, seconds: Math.max(0, item.seconds - seconds) })).filter((item) => item.seconds > 0);
  completed.forEach((item) => {
    if (item.action === 'miner') state.miners[(item.targetId ?? item.target) as RawKey] += 1;
    if (item.action === 'pump') state.pumps += 1;
    if (item.action === 'uraniumMiner') state.uraniumMiners += 1;
    if (item.action === 'assembler') state.assemblers[(item.targetId ?? item.target) as ComponentKey] += 1;
    if (item.action === 'lab') { state.labs += 1; recordProduction(state, 'lab', 1); }
    if (item.action === 'upgrade') state.upgrades[(item.targetId ?? item.target) as UpgradeKey] += 1;
  });
  applyResearchTriggers(state);
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
      products: { ...initialState.products, ...parsed.products },
      storage: { ...initialState.storage, ...parsed.storage },
      miners: { ...initialState.miners, ...parsed.miners },
      assemblers: { ...initialState.assemblers, ...parsed.assemblers },
      miningProgress: { ...initialState.miningProgress, ...parsed.miningProgress },
      assemblyProgress: { ...initialState.assemblyProgress, ...parsed.assemblyProgress },
      handcraft: parsed.handcraft ? { ...parsed.handcraft } : null,
      produced: { ...initialState.produced, ...parsed.produced },
      upgrades: { ...initialState.upgrades, ...parsed.upgrades },
      queue: parsed.queue ?? [],
      research: Array.from(new Set((parsed.research ?? initialState.research).map((key) => normalizeResearchKey(String(key))))),
      lastSeen: parsed.lastSeen ?? Date.now(),
    } as GameState;
    const away = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - state.lastSeen) / 1000));
    const before = state.totalOutput;
    const recovered = simulate(state, away);
    return { state: recovered, away, recovered: recovered.totalOutput - before };
  } catch { return { state: initialState, away: 0, recovered: 0 }; }
}

function ResourceIcon({ item, size = 28 }: { item: TrackedKey; size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}item-icons/${item}.png`} width={size} height={size} alt="" aria-hidden="true" className="object-contain" />;
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

function FactoryPage({ state, setState, away, recovered, notice }: PageProps) {
  const active = totalUnits(state);
  const throughput = Math.max(0, Object.entries(state.assemblers).reduce((total, [recipeKey, count]) => {
    const recipe = recipeMap[recipeKey];
    return total + (recipe ? count * 60 / recipe.energyRequired : 0);
  }, 0));
  const powerProduction = (state.research.includes('steam-power') ? 80 : 0) + (state.research.includes('solar-energy') ? 45 : 0) + (state.research.includes('nuclear-power') ? 180 : 0);
  const draw = electricPowerDraw(state);
  const bottleneckRecipe = componentKeys.map((key) => recipeMap[key]).find((recipe) => (state.assemblers[recipe.name] ?? 0) > 0 && !hasInputs(state, recipeInputs(recipe)));
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
    setState((s) => {
      const amount = Math.min(1 + s.upgrades.manualMining, Math.max(0, capFor(s, key) - s.raw[key]));
      const next = { ...s, raw: { ...s.raw, [key]: s.raw[key] + amount }, totalOutput: s.totalOutput + amount, produced: { ...s.produced } };
      recordProduction(next, key, amount);
      applyResearchTriggers(next);
      return next;
    });
    notice(`manual ${rawInfo[key].label.toLowerCase()} extracted`);
  };
  const build = (key: RawKey) => {
    if (key === 'water') { if (!state.research.includes('steam-power')) return notice('Steam Power required'); if (state.products.ironPlate < 10 || state.products.gear < 2) return notice('need 10 iron plates + 2 gears'); setState((s) => ({ ...s, products: { ...s.products, ironPlate: s.products.ironPlate - 10, gear: s.products.gear - 2 } })); enqueue('pump', 'Water pump', 40); return; }
    if (key === 'uranium') { if (!state.research.includes('nuclear-power')) return notice('Nuclear Power required'); if (state.products.steel < 20 || state.products.circuit < 8) return notice('need 20 steel + 8 circuits'); setState((s) => ({ ...s, products: { ...s.products, steel: s.products.steel - 20, circuit: s.products.circuit - 8 } })); enqueue('uraniumMiner', 'Acid-powered uranium miner', 90); return; }
    if (state.products.gear < burnerMiningDrillCost.gear || state.products.ironPlate < burnerMiningDrillCost.ironPlate || state.raw.stone < burnerMiningDrillCost.stone) return notice('need 3 iron gears + 3 iron plates + 5 stone');
    setState((s) => ({ ...s, raw: { ...s.raw, stone: s.raw.stone - burnerMiningDrillCost.stone }, products: { ...s.products, ironPlate: s.products.ironPlate - burnerMiningDrillCost.ironPlate, gear: s.products.gear - burnerMiningDrillCost.gear } }));
    enqueue('miner', `${rawInfo[key].label} burner mining drill`, burnerMiningDrillRecipe.energyRequired, key);
  };
  return <PageFrame><Header eyebrow="Raw material control" title="Mining" copy="Tap the ground to start. Build burner mining drills to make the ore line autonomous — each drill consumes coal while it operates." action={<Tag><Pickaxe size={11} /> 7 resource sections</Tag>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rawKeys.map((key) => { const info = rawInfo[key]; const locked = !!info.research && !state.research.includes(info.research); const count = key === 'water' ? state.pumps : key === 'uranium' ? state.uraniumMiners : state.miners[key]; const isBurnerOre = burnerMinerKeys.includes(key); const fuelRate = count * burnerMiningDrillCoalPerSecond; const autonomous = count > 0; const constructionAction = key === 'water' ? 'pump' : key === 'uranium' ? 'uraniumMiner' : 'miner'; const constructionItems = state.queue.filter((item) => item.action === constructionAction && (constructionAction !== 'miner' || item.targetId === key)); const isBuilding = constructionItems.length > 0; const constructionLabel = key === 'water' ? 'Water pump' : key === 'uranium' ? 'Acid-powered uranium miner' : `${info.label} burner mining drill`; return <section className={`surface rounded-xl p-4 ${locked ? 'locked-wash opacity-75' : ''}`} key={key} data-testid={`section-mining-${key}`}><div className="flex items-start gap-3"><div className="resource-orb"><ResourceIcon item={key} size={29} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="text-[13px] font-extrabold">{info.label}</h2>{locked ? <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag> : autonomous ? <Tag><span className="status-dot status-running" /> autonomous</Tag> : <Tag tone="amber">manual</Tag>}</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{info.description}</p></div></div><div className="mt-4 flex items-end justify-between"><div><div className="eyebrow">Buffer</div><div className="mono mt-1 text-[18px]">{fmt(state.raw[key])}<span className="text-[10px] text-[hsl(var(--muted-foreground))]"> / {capFor(state, key)}</span></div></div><div className="text-right">{isBurnerOre ? <div className="eyebrow flex items-center justify-end gap-1"><ResourceIcon item="burner-mining-drill" size={14} /> burner drills</div> : <div className="eyebrow">{key === 'water' ? 'pumps' : 'acid miners'}</div>}<div className="mono mt-1 text-[18px] text-[hsl(var(--secondary))]">{count}</div></div></div><Progress value={state.raw[key] / capFor(state, key) * 100} />{isBurnerOre && <><div className="data-row mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2"><ResourceIcon item="burner-mining-drill" size={18} /><span className="text-[10px] font-semibold">Burner drill fuel</span><span className="ml-auto flex items-center gap-1 mono text-[10px] text-[hsl(var(--primary))]"><ResourceIcon item="coal" size={15} /> {fuelRate.toFixed(2)} /s</span><span className="text-[9px] text-[hsl(var(--muted-foreground))]">no electricity</span></div><div className="mt-2 text-[9px] text-[hsl(var(--muted-foreground))]">Build: {burnerMiningDrillCost.gear} gears + {burnerMiningDrillCost.ironPlate} iron plates + {burnerMiningDrillCost.stone} stone · {burnerMiningDrillRecipe.energyRequired}s</div></>}<BuildProgress items={constructionItems} label={constructionLabel} /><div className="mt-4 flex gap-2">{locked ? <button onClick={() => notice(`${info.needs} research required`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-locked-mining-${key}`}><LockKeyhole size={13} /> requires {info.needs}</button> : autonomous ? <button onClick={() => build(key)} className={`button-base flex-1 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} data-testid={`button-build-more-${key}`}>{isBuilding ? <><Check size={13} /> queued · construct another</> : <><Plus size={13} /> construct {key === 'water' ? 'pump' : 'burner drill'}</>}</button> : <><button onClick={() => tap(key)} className="button-base button-primary flex-1 !py-2" data-testid={`button-tap-${key}`}><Pickaxe size={13} /> tap to mine</button><button onClick={() => build(key)} className={`button-base !px-3 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct ${info.label} miner`} data-testid={`button-build-miner-${key}`}>{isBuilding ? <Check size={13} /> : <Hammer size={13} />}</button></>}</div></section>; })}</div><div className="mt-5 surface rounded-xl border-[hsl(var(--secondary)/.25)] p-4"><div className="flex items-start gap-3"><div className="text-[hsl(var(--secondary))]"><Lightbulb size={17} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Mining rule</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Manual taps are intentionally useful at the start of a run. Burner mining drills take over after construction and consume 0.25 coal per second each.</p></div></div></div></PageFrame>;
}

function ProductionPage({ state, setState, enqueue, notice }: PageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const automationUnlocked = state.research.includes('automation');
  const categories = useMemo(() => Array.from(new Set(recipeCatalog.map((recipe) => recipe.category))).sort(), []);
  const visibleRecipes = useMemo(() => orderedRecipeCatalog.filter((recipe) => recipeIsUnlocked(recipe, state)).filter((recipe) => {
    const matchesQuery = !query.trim() || `${recipe.name} ${recipe.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (category === 'all' || recipe.category === category);
  }), [category, query, state]);
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
  const buildAssembler = (key: ComponentKey) => {
    if (!automationUnlocked) return notice('Automation technology required');
    if (state.products.circuit < assemblyMachineOneBuildCost.circuit || state.products.gear < assemblyMachineOneBuildCost.gear || state.products.ironPlate < assemblyMachineOneBuildCost.ironPlate) return notice('need 3 electronic circuits + 5 iron gears + 9 iron plates');
    setState((s) => ({ ...s, products: { ...s.products, circuit: s.products.circuit - assemblyMachineOneBuildCost.circuit, gear: s.products.gear - assemblyMachineOneBuildCost.gear, ironPlate: s.products.ironPlate - assemblyMachineOneBuildCost.ironPlate } }));
    enqueue('assembler', `${prettyLabel(key)} assembly machine 1`, assemblyMachineOneRecipe.energyRequired, key);
  };
  return <PageFrame>
    <Header eyebrow="Recipe catalog" title="Production" copy="The attached recipe definitions drive every card below. Search the full line, inspect item and fluid flows, then run any recipe manually or with an Assembly Machine 1 after Automation is unlocked." action={<Tag><Cog size={11} /> {recipeCatalog.length} recipes loaded</Tag>} />
    <section className="surface mb-5 rounded-xl p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recipes, items, or fluids" className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]" aria-label="Search recipes" data-testid="input-search-recipes" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none" aria-label="Filter recipe category" data-testid="select-recipe-category">
          <option value="all">All categories</option>
          {categories.map((entry) => <option key={entry} value={entry}>{prettyLabel(entry)}</option>)}
        </select>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]"><span>Source data includes hidden and disabled definitions.</span><span className="mono">{visibleRecipes.length} visible</span></div>
      <div className="data-row mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2"><ResourceIcon item="assembling-machine-1" size={18} /><span className="text-[10px] font-semibold">Assembly Machine 1</span><span className="ml-auto text-right text-[9px] text-[hsl(var(--muted-foreground))]">3 circuits + 5 gears + 9 plates · {assemblyMachineOneRecipe.energyRequired}s build</span></div>
    </section>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleRecipes.map((recipe) => {
      const key = recipe.name;
      const outputs = recipeOutputs(recipe);
      const primaryOutput = outputs[0];
      const count = state.assemblers[key] ?? 0;
      const rate = count * 60 / recipe.energyRequired * (1 + state.upgrades.productionSpeed * .1);
      const netRate = primaryOutput ? netRateFor(state, primaryOutput.key) : 0;
      const constructionItems = state.queue.filter((item) => item.action === 'assembler' && item.targetId === key);
      const isBuilding = constructionItems.length > 0;
      const handcraftJob = state.handcraft?.recipeKey === key ? state.handcraft : null;
      const handcraftBusy = Boolean(state.handcraft && !handcraftJob);
      const handcraftControl = <button onClick={() => handcraft(key)} className={`button-base !py-2 ${count ? '!px-2' : 'button-primary flex-1'}`} aria-label={`Handcraft ${prettyLabel(key)}`} title={handcraftJob ? `Handcrafting ${prettyLabel(key)}` : handcraftBusy ? 'Another item is being handcrafted' : `Handcraft ${prettyLabel(key)}`} data-testid={`button-handcraft-production-${key}`}>{handcraftJob ? <><Clock3 size={13} /> {handcraftJob.seconds.toFixed(2)}s</> : handcraftBusy ? <Clock3 size={13} /> : <><Plus size={13} />{!count && ' handcraft'}</>}</button>;
      return <section className="surface rounded-xl p-4" key={key} data-testid={`section-production-${key}`}>
        <div className="flex items-start gap-3">
          <div className="resource-orb">{primaryOutput && <ResourceIcon item={primaryOutput.key} size={29} />}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2"><h2 className="truncate text-[13px] font-extrabold">{prettyLabel(key)}</h2><div className="flex items-center gap-2">{count ? <Tag><span className="status-dot status-running" /> auto</Tag> : <Tag tone="amber">manual</Tag>}<div className="flex items-center gap-1 text-[hsl(var(--secondary))]" title="Assembly machine 1 count"><ResourceIcon item="assembling-machine-1" size={17} /><span className="mono text-[13px]">{count}</span></div></div></div>
            <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{prettyLabel(recipe.category)} · {recipe.energyRequired}s cycle</div>
            <div className="mt-1 flex flex-wrap gap-1">{recipe.hidden && <Tag tone="muted">hidden</Tag>}{!recipe.enabled && <Tag tone="muted">research lock</Tag>}{recipe.results.length > 1 && <Tag tone="amber">multi-output</Tag>}</div>
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
        <div className="mt-4 flex items-end justify-between"><div><div className="eyebrow">Net rate · primary output</div><div className={`mono mt-1 text-[17px] ${netRate < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--secondary))]'}`}>{netRate > 0 ? '+' : ''}{netRate.toFixed(1)} <span className="text-[9px] text-[hsl(var(--muted-foreground))]">/ min</span></div></div><div className="text-right"><div className="eyebrow">Stored</div><div className="mono mt-1 text-[14px]">{fmt(primaryOutput ? quantityFor(state, primaryOutput.key) : 0)}</div></div></div>
        {handcraftJob && <HandcraftProgress job={handcraftJob} recipe={recipe} />}
        <div className="mt-4 flex gap-2">{count ? <><button onClick={() => notice(`${prettyLabel(key)} assembler is running at ${rate.toFixed(1)} / min`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-inspect-production-${key}`}><Gauge size={13} /> inspect live rate</button>{handcraftControl}<button onClick={() => buildAssembler(key)} className={`button-base flex-1 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct another assembly machine 1 for ${prettyLabel(key)}`} data-testid={`button-build-more-assembler-${key}`}>{isBuilding ? <><Check size={13} /> queued · build another</> : <><Hammer size={13} /> construct another</>}</button></> : <><button onClick={() => handcraft(key)} className="button-base button-primary flex-1 !py-2" data-testid={`button-handcraft-production-${key}`}><Plus size={13} /> handcraft</button><button onClick={() => buildAssembler(key)} className={`button-base !px-3 !py-2 ${isBuilding ? 'button-build-active' : 'button-ghost'}`} aria-label={`Construct assembly machine 1 for ${prettyLabel(key)}`} data-testid={`button-build-assembler-${key}`}>{isBuilding ? <Check size={13} /> : <Hammer size={13} />}</button></>}</div>
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

function StoragePage({ state, setState, notice }: PageProps) {
  const upgrade = (key: TrackedKey) => { const cost = 3 + Math.floor(state.storage[key] / 60); if (state.products.gear < cost || state.products.ironPlate < cost * 2) return notice(`need ${cost} gears + ${cost * 2} iron plates`); setState((s) => ({ ...s, products: { ...s.products, gear: s.products.gear - cost, ironPlate: s.products.ironPlate - cost * 2 }, storage: { ...s.storage, [key]: s.storage[key] + 60 } })); notice(`${meta[key].label} capacity expanded`); };
  const visibleKeys = orderedTrackedKeys.filter((key) => unlockedProductKeys(state).has(key));
  return <PageFrame><Header eyebrow="Buffer control" title="Storage" copy="Every unlocked product gets one honest row, arranged by the imported product tiers. Hidden products appear after their source recipe is researched." action={<Tag><Box size={11} /> {visibleKeys.length} unlocked items</Tag>} /><section className="surface overflow-hidden rounded-xl p-3 sm:p-5"><div className="hidden grid-cols-[minmax(180px,1.3fr)_110px_minmax(160px,1fr)_115px] gap-4 border-b border-[hsl(var(--border))] px-3 pb-3 md:grid"><span className="eyebrow">Item</span><span className="eyebrow">Amount</span><span className="eyebrow">Fill</span><span className="eyebrow text-right">Action</span></div><div className="space-y-2 pt-1">{visibleKeys.map((key) => { const amount = quantityFor(state, key); const capacity = capFor(state, key); const cost = 3 + Math.floor(state.storage[key] / 60); return <div className="data-row grid gap-3 rounded-xl p-3 md:grid-cols-[minmax(180px,1.3fr)_110px_minmax(160px,1fr)_115px] md:items-center md:gap-4" key={key} data-testid={`row-storage-${key}`}><div className="flex items-center gap-3"><div className="resource-orb !h-9 !w-9"><ResourceIcon item={key} size={25} /></div><div><div className="text-[11px] font-bold">{meta[key].label}</div><div className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{meta[key].category} · capacity {capacity}</div></div></div><div className="flex items-baseline justify-between md:block"><span className="eyebrow md:hidden">amount</span><span className="mono text-[14px]">{fmt(amount)} <span className="text-[9px] text-[hsl(var(--muted-foreground))]">/ {capacity}</span></span></div><div><div className="mb-1 flex justify-between text-[9px] text-[hsl(var(--muted-foreground))]"><span className="md:hidden">fill level</span><span>{Math.floor(amount / capacity * 100)}%</span></div><Progress value={amount / capacity * 100} /></div><button onClick={() => upgrade(key)} className="button-base button-ghost w-full !py-2 md:w-auto" data-testid={`button-upgrade-storage-${key}`}><Plus size={12} /> +60 <span className="hidden sm:inline">capacity</span><span className="mono text-[9px] text-[hsl(var(--primary))]">· {cost}g</span></button></div>; })}</div></section><p className="mt-4 text-[10px] text-[hsl(var(--muted-foreground))]"><Info size={13} className="mr-1 inline text-[hsl(var(--primary))]" /> Storage upgrades spend factory-produced gears and iron plates, and affect only the selected row.</p></PageFrame>;
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
  const totalConsumption = state.labs * 12 * state.simulationSpeed * (scienceKeys.some((key) => state.products[key] > 0) ? 1 : 0);
  const sharedScale = Math.max(1, ...scienceKeys.map((key) => Math.max(
    (state.assemblers[scienceRecipeKeys[key]] ?? 0) * 60 / recipeMap[scienceRecipeKeys[key]].energyRequired * (1 + state.upgrades.productionSpeed * .1),
    state.products[key] > 0 ? state.labs * 12 : 0,
  )));
  const buildLab = () => { if (state.products.ironPlate < 12 || state.products.circuit < 4) return notice('need 12 iron plates + 4 circuits'); setState((s) => ({ ...s, products: { ...s.products, ironPlate: s.products.ironPlate - 12, circuit: s.products.circuit - 4 } })); enqueue('lab', 'Science lab', 65); };
  return <PageFrame><Header eyebrow="Research fuel" title="Science" copy="Labs consume science packs at a measured rate. Identically scaled bars make the smallest capacity or demand visible at a glance." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><FlaskConical size={17} className="text-[hsl(var(--primary))]" /><span className="mono text-[15px]">{totalConsumption.toFixed(1)} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">SPM</span></span></div>} /><section className="surface rounded-xl p-4 sm:p-5"><div className="mb-5 flex items-center justify-between"><SectionTitle detail={`${state.labs} labs online`}>Science pack flow</SectionTitle><button onClick={buildLab} className="button-base button-primary !py-2" data-testid="button-build-lab"><Plus size={13} /> build lab</button></div><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Current SPM</div><div className="mono mt-2 text-xl text-[hsl(var(--primary))]">{totalConsumption.toFixed(1)}</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Labs</div><div className="mono mt-2 text-xl">{state.labs}</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Lab cycle</div><div className="mono mt-2 text-xl">5s</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Research bank</div><div className="mono mt-2 text-xl">{fmt(scienceKeys.reduce((sum, key) => sum + state.products[key], 0))}</div></div></div><div className="space-y-3">{scienceKeys.map((key) => { const scienceRecipe = recipeMap[scienceRecipeKeys[key]]; const productionCapacity = (state.assemblers[scienceRecipe.name] ?? 0) * 60 / scienceRecipe.energyRequired * (1 + state.upgrades.productionSpeed * .1) * (recipeOutputs(scienceRecipe).find((output) => output.key === key)?.amount ?? 1); const consumption = state.products[key] > 0 ? state.labs * 12 : 0; return <div className="data-row rounded-xl p-3 sm:p-4" key={key} data-testid={`row-science-${key}`}><div className="flex items-center gap-3"><div className="resource-orb !h-9 !w-9"><ResourceIcon item={key} size={25} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-[12px] font-bold">{meta[key].label}</span><span className="mono text-[11px]">{fmt(state.products[key])} stored</span></div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">capacity <span className="mono text-[hsl(var(--secondary))]">{productionCapacity.toFixed(1)}/min</span> · consumption <span className="mono text-[hsl(var(--primary))]">{consumption.toFixed(1)}/min</span></div></div></div><div className="mt-3 grid grid-cols-[1fr_1fr] gap-3"><div><div className="mb-1 flex justify-between text-[9px] text-[hsl(var(--muted-foreground))]"><span>production capacity</span><span className="mono">{productionCapacity.toFixed(1)}</span></div><Progress value={productionCapacity / sharedScale * 100} /></div><div><div className="mb-1 flex justify-between text-[9px] text-[hsl(var(--muted-foreground))]"><span>lab consumption</span><span className="mono">{consumption.toFixed(1)}</span></div><Progress value={consumption / sharedScale * 100} tone="amber" /></div></div></div>; })}</div></section></PageFrame>;
}

function ResearchArt({ accent }: { accent: string }) { return <div className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_25%_10%)]" style={{ color: accent }}><svg width="72" height="56" viewBox="0 0 72 56" aria-hidden="true"><path stroke="currentColor" strokeOpacity=".35" d="M6 43 22 27l10 8 15-21 19 14" /><circle cx="22" cy="27" r="5" fill="currentColor" opacity=".85" /><circle cx="47" cy="14" r="5" fill="currentColor" opacity=".65" /><path fill="currentColor" opacity=".18" d="M7 47h58v3H7zM12 10h3v34h-3zm45 13h3v21h-3z" /></svg></div>; }
function ResearchPage({ state, setState, notice }: PageProps) {
  const [selected, setSelected] = useState<ResearchKey>(technologyCatalog[0]?.name ?? '');
  const [query, setQuery] = useState('');
  const accentFor = (name: string) => ['#65afba', '#df7165', '#dfb05c', '#8ea9db', '#92c86b', '#c9d3d0'][name.length % 6];
  const visibleTechnologies = useMemo(() => technologyCatalog.filter((technology) => {
    const haystack = `${technology.name} ${technology.prerequisites.join(' ')} ${technology.effects.map((effect) => `${effect.type} ${effect.recipe ?? ''}`).join(' ')}`.toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  }), [query]);
  const item = technologyMap[selected] ?? technologyCatalog[0];
  const unlock = (key: ResearchKey) => {
    const technology = technologyMap[key];
    if (!technology || state.research.includes(key)) return;
    if (!technology.prerequisites.every((prerequisite) => state.research.includes(prerequisite))) return notice('complete the listed prerequisites first');
    if (technology.researchTrigger) return notice('this technology unlocks automatically from its production trigger');
    const costsMet = technology.scienceCosts.every((cost) => quantityFor(state, keyForSource(cost.pack)) >= cost.amount);
    if (!costsMet) return notice('not enough required science packs');
    setState((s) => {
      const products = { ...s.products };
      technology.scienceCosts.forEach((cost) => {
        const costKey = keyForSource(cost.pack);
        products[costKey] = (products[costKey] ?? 0) - cost.amount;
      });
      return { ...s, products, research: [...s.research, key] };
    });
    notice(`${prettyLabel(key)} research complete`);
  };
  if (!item) return null;
  const selectedDone = state.research.includes(item.name);
  const selectedPrerequisitesMet = item.prerequisites.every((prerequisite) => state.research.includes(prerequisite));
  const selectedTriggerProgress = researchTriggerProgress(state, item);
  const selectedTriggerReady = researchTriggerMet(state, item);
  const selectedCostsMet = item.scienceCosts.every((cost) => quantityFor(state, keyForSource(cost.pack)) >= cost.amount);
  const selectedReady = selectedPrerequisitesMet && (item.researchTrigger ? selectedTriggerReady : selectedCostsMet);
  return <PageFrame>
    <Header eyebrow="Technology control" title="Research" copy="The official technology definitions drive this tree: prerequisites, science-pack units, research triggers, effects, upgrades, and infinite levels are all visible." action={<Tag><Lightbulb size={11} /> {technologyCatalog.length} technologies · {state.research.length} complete</Tag>} />
    <section className="surface mb-5 rounded-xl p-3 sm:p-4">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search technologies, prerequisites, or effects" className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_24%_9%)] px-3 py-2 text-[11px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]" aria-label="Search technologies" data-testid="input-search-technologies" />
      <div className="mt-2 flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]"><span>Source names remain intact for save compatibility and dependency matching.</span><span className="mono">{visibleTechnologies.length} visible</span></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-3">{visibleTechnologies.map((technology) => {
        const done = state.research.includes(technology.name);
        const prerequisitesMet = technology.prerequisites.every((prerequisite) => state.research.includes(prerequisite));
        const triggerReady = researchTriggerMet(state, technology);
        const costsMet = technology.scienceCosts.every((cost) => quantityFor(state, keyForSource(cost.pack)) >= cost.amount);
        const ready = prerequisitesMet && (technology.researchTrigger ? triggerReady : costsMet);
        return <button onClick={() => setSelected(technology.name)} className={`surface flex w-full items-center gap-3 rounded-xl p-3 text-left sm:p-4 ${selected === technology.name ? 'border-[hsl(var(--secondary)/.65)] bg-[hsl(174_30%_15%/.7)]' : 'hover:border-[hsl(var(--border))]'}`} key={technology.name} data-testid={`button-research-${technology.name}`}>
          <ResearchArt accent={accentFor(technology.name)} />
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-extrabold">{prettyLabel(technology.name)}</span>{done ? <Tag><Check size={10} /> complete</Tag> : ready ? <Tag tone="amber">ready</Tag> : !prerequisitesMet ? <Tag tone="muted"><LockKeyhole size={10} /> prerequisite</Tag> : technology.researchTrigger ? <Tag tone="muted"><Clock3 size={10} /> production trigger</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> pack low</Tag>}</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{technology.effects.length} effects · {technology.prerequisites.length} prerequisites{technology.upgrade ? ' · upgrade' : ''}</p></div>
          <ChevronRight size={15} className="text-[hsl(var(--muted-foreground))]" />
        </button>;
      })}</section>
      <aside className="surface h-fit rounded-xl p-5">
        <div className="eyebrow">Technology detail</div>
        <div className="mt-3 flex items-start justify-between gap-3"><h2 className="text-lg font-extrabold">{prettyLabel(item.name)}</h2><Tag tone={item.upgrade ? 'amber' : 'teal'}>{item.upgrade ? 'upgrade' : 'technology'}</Tag></div>
        <div className="mt-2 flex flex-wrap gap-1">{item.essential && <Tag>essential</Tag>}{item.maxLevel && <Tag tone="muted">{prettyLabel(item.maxLevel)} levels</Tag>}{item.researchTrigger && <Tag tone="muted">triggered</Tag>}</div>
        <div className="mt-5 border-y border-[hsl(var(--border))] py-4">
          <div className="eyebrow mb-3">Prerequisites</div>
          {item.prerequisites.length ? <div className="flex flex-wrap gap-1.5">{item.prerequisites.map((prerequisite) => <span className={`resource-chip ${state.research.includes(prerequisite) ? 'border-[hsl(var(--secondary)/.55)]' : ''}`} key={prerequisite}><span className={`status-dot ${state.research.includes(prerequisite) ? 'status-running' : 'status-starved'}`} />{prettyLabel(prerequisite)}</span>)}</div> : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No prerequisites · available at the start.</div>}
        </div>
         {item.researchTrigger ? <div className="border-b border-[hsl(var(--border))] py-4"><div className="eyebrow mb-2">Production trigger</div><div className="text-[11px]">{prettyLabel(item.researchTrigger.type)}{item.researchTrigger.item ? ` · ${prettyLabel(item.researchTrigger.item)}` : ''}</div>{selectedTriggerProgress ? <><div className="mt-3 flex items-center justify-between text-[10px]"><span className="text-[hsl(var(--muted-foreground))]">produced by this factory</span><span className={`mono ${selectedTriggerReady ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--primary))]'}`}>{fmt(selectedTriggerProgress.produced)} / {fmt(selectedTriggerProgress.required)}</span></div><div className="mt-2"><Progress value={selectedTriggerProgress.produced / selectedTriggerProgress.required * 100} tone={selectedTriggerReady ? 'teal' : 'amber'} /></div><div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Starting inventory does not count toward this trigger.</div></> : <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">This trigger type is not represented by a quantity counter in the current simulator.</div>}</div> : <div className="border-b border-[hsl(var(--border))] py-4"><div className="eyebrow mb-3">Science unit</div><div className="space-y-2">{item.scienceCosts.map((cost) => { const costKey = keyForSource(cost.pack); const have = quantityFor(state, costKey); return <div className="flex items-center justify-between text-[11px]" key={cost.pack}><span className="flex items-center gap-2"><ResourceIcon item={costKey} size={20} />{meta[costKey].label}</span><span className={`mono ${have >= cost.amount ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{fmt(have)} / {cost.amount}</span></div>; })}</div><div className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">Unit time: <span className="mono">{item.time ?? 'formula-defined'}s</span>{item.count ? ` · ${item.count} total units` : item.countFormula ? ` · ${item.countFormula}` : ''}</div></div>}
        <div className="py-4"><div className="eyebrow mb-3">Effects</div><div className="space-y-2">{item.effects.length ? item.effects.map((effect, index) => <div className="data-row rounded-lg px-3 py-2 text-[10px]" key={`${effect.type}-${index}`}><span className="font-semibold">{effect.recipe ? `Unlock ${prettyLabel(effect.recipe)}` : prettyLabel(effect.type)}</span>{effect.target && <span className="text-[hsl(var(--muted-foreground))]"> · {prettyLabel(effect.target)}</span>}{effect.modifier !== undefined && <span className="mono float-right text-[hsl(var(--secondary))]">{typeof effect.modifier === 'number' && effect.modifier > 0 ? '+' : ''}{String(effect.modifier)}</span>}</div>) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No listed effects.</div>}</div></div>
         <button onClick={() => unlock(item.name)} disabled={selectedDone || !selectedReady} className="button-base button-primary w-full disabled:cursor-not-allowed disabled:opacity-45" data-testid={`button-unlock-research-${item.name}`}>{selectedDone ? <><Check size={14} /> research complete</> : item.researchTrigger ? <><Clock3 size={14} /> waiting for production</> : <><FlaskConical size={14} /> complete research</>}</button>
      </aside>
    </div>
  </PageFrame>;
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
  const reset = () => { localStorage.removeItem(SAVE_KEY); setState({ ...initialState, lastSeen: Date.now(), storage: { ...initialState.storage }, raw: { ...initialState.raw }, products: { ...initialState.products } }); };
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
  return <Shell>{page}{toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[hsl(var(--primary)/.4)] bg-[hsl(216_25%_13%/.97)] px-4 py-2 mono text-[10px] text-[hsl(var(--primary))] shadow-xl md:bottom-6" role="status" data-testid="status-toast">{toast}</div>}</Shell>;
}

function App() { return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Game /></WouterRouter>; }
export default App;