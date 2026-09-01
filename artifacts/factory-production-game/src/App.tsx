import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import {
  Activity, ArrowRight, BatteryCharging, Box, Check, ChevronRight, CircleHelp, Clock3,
  Cog, MoveRight, Cpu, Factory as FactoryIcon, FlaskConical, Gauge, Hammer,
  Info, Layers3, Lightbulb, LockKeyhole, Pickaxe, Plus, Power,
  RotateCcw, Save, Settings2, ShieldAlert, Sparkles, Sun, Trash2,
  TrendingUp, TriangleAlert, Truck, Waves, Zap,
} from 'lucide-react';

type RawKey = 'iron' | 'copper' | 'stone' | 'coal' | 'wood' | 'water' | 'uranium';
type ComponentKey = 'ironPlate' | 'copperPlate' | 'steel' | 'gear' | 'pipe' | 'circuit' | 'automationPack' | 'logisticsPack' | 'researchPack';
type ScienceKey = 'automationPack' | 'logisticsPack' | 'researchPack';
type TrackedKey = RawKey | ComponentKey;
type UpgradeKey = 'manualMining' | 'productionSpeed' | 'storageEfficiency' | 'powerEfficiency';
type ResearchKey = 'steamPower' | 'solarPower' | 'nuclearPower' | 'steelProcessing' | 'automation';
type UnitStatus = 'running' | 'starved' | 'blocked';

type Recipe = { output: ComponentKey; label: string; cycle: number; inputs: Partial<Record<TrackedKey, number>> };
type QueueItem = { id: string; action: 'miner' | 'pump' | 'uraniumMiner' | 'assembler' | 'lab' | 'upgrade'; target: string; targetId?: string; seconds: number; total: number };
type GameState = {
  raw: Record<RawKey, number>;
  products: Record<ComponentKey, number>;
  storage: Record<TrackedKey, number>;
  miners: Record<RawKey, number>;
  pumps: number;
  uraniumMiners: number;
  assemblers: Record<ComponentKey, number>;
  labs: number;
  miningProgress: Record<RawKey, number>;
  assemblyProgress: Record<ComponentKey, number>;
  labProgress: number;
  queue: QueueItem[];
  research: ResearchKey[];
  upgrades: Record<UpgradeKey, number>;
  totalOutput: number;
  lastSeen: number;
  simulationSpeed: number;
};

const SAVE_KEY = 'factory-production-game-save-v2';
const rawKeys: RawKey[] = ['iron', 'copper', 'stone', 'coal', 'wood', 'water', 'uranium'];
const componentKeys: ComponentKey[] = ['ironPlate', 'copperPlate', 'steel', 'gear', 'pipe', 'circuit', 'automationPack', 'logisticsPack', 'researchPack'];
const scienceKeys: ScienceKey[] = ['automationPack', 'logisticsPack', 'researchPack'];
const trackedKeys: TrackedKey[] = [...rawKeys, ...componentKeys];
const meta: Record<TrackedKey, { label: string; short: string; color: string; category: string }> = {
  iron: { label: 'Iron ore', short: 'iron', color: '#bd7b45', category: 'Raw' }, copper: { label: 'Copper ore', short: 'copper', color: '#dc9361', category: 'Raw' },
  stone: { label: 'Stone', short: 'stone', color: '#9ba6a4', category: 'Raw' }, coal: { label: 'Coal', short: 'coal', color: '#929aaa', category: 'Fuel' },
  wood: { label: 'Wood', short: 'wood', color: '#b9996b', category: 'Raw' }, water: { label: 'Water', short: 'water', color: '#65afba', category: 'Fluid' },
  uranium: { label: 'Uranium ore', short: 'uranium', color: '#92c86b', category: 'Raw' }, ironPlate: { label: 'Iron plates', short: 'Fe plate', color: '#c9d3d0', category: 'Component' },
  copperPlate: { label: 'Copper plates', short: 'Cu plate', color: '#e6a067', category: 'Component' }, steel: { label: 'Steel', short: 'steel', color: '#aabac3', category: 'Component' },
  gear: { label: 'Gears', short: 'gear', color: '#dfb05c', category: 'Component' }, pipe: { label: 'Pipes', short: 'pipe', color: '#8da8a7', category: 'Component' },
  circuit: { label: 'Circuits', short: 'circuit', color: '#54b8a8', category: 'Component' }, automationPack: { label: 'Automation science', short: 'automation', color: '#df7165', category: 'Science' },
  logisticsPack: { label: 'Logistics science', short: 'logistics', color: '#d6a04f', category: 'Science' }, researchPack: { label: 'Research science', short: 'research', color: '#8ea9db', category: 'Science' },
};

const recipes: Record<ComponentKey, Recipe> = {
  ironPlate: { output: 'ironPlate', label: 'Smelt', cycle: 2, inputs: { iron: 1 } },
  copperPlate: { output: 'copperPlate', label: 'Smelt', cycle: 2.4, inputs: { copper: 1 } },
  steel: { output: 'steel', label: 'Reforge', cycle: 4, inputs: { ironPlate: 2 } },
  gear: { output: 'gear', label: 'Stamp', cycle: 3, inputs: { ironPlate: 2 } },
  pipe: { output: 'pipe', label: 'Roll', cycle: 2.5, inputs: { ironPlate: 1 } },
  circuit: { output: 'circuit', label: 'Assemble', cycle: 4, inputs: { ironPlate: 1, copperPlate: 1 } },
  automationPack: { output: 'automationPack', label: 'Pack', cycle: 5, inputs: { gear: 1, circuit: 1, copperPlate: 1 } },
  logisticsPack: { output: 'logisticsPack', label: 'Pack', cycle: 6, inputs: { gear: 1, pipe: 1, circuit: 1 } },
  researchPack: { output: 'researchPack', label: 'Pack', cycle: 8, inputs: { steel: 1, circuit: 2, automationPack: 1 } },
};

const initialState: GameState = {
  raw: { iron: 62, copper: 38, stone: 26, coal: 31, wood: 18, water: 0, uranium: 0 },
  products: { ironPlate: 28, copperPlate: 14, steel: 4, gear: 9, pipe: 4, circuit: 3, automationPack: 9, logisticsPack: 5, researchPack: 2 },
  storage: Object.fromEntries(trackedKeys.map((key) => [key, 180])) as Record<TrackedKey, number>,
  miners: { iron: 0, copper: 0, stone: 0, coal: 0, wood: 0, water: 0, uranium: 0 },
  pumps: 0, uraniumMiners: 0,
  assemblers: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labs: 1, miningProgress: Object.fromEntries(rawKeys.map((key) => [key, 0])) as Record<RawKey, number>,
  assemblyProgress: Object.fromEntries(componentKeys.map((key) => [key, 0])) as Record<ComponentKey, number>,
  labProgress: 0, queue: [], research: ['automation'], upgrades: { manualMining: 0, productionSpeed: 0, storageEfficiency: 0, powerEfficiency: 0 },
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
  water: { label: 'Water', description: 'Pumped fluid required to turn heat into power.', research: 'steamPower', needs: 'Steam Power' },
  uranium: { label: 'Uranium', description: 'Dense fuel for the late-stage reactor chain.', research: 'nuclearPower', needs: 'Nuclear Power' },
};

const researchData: Record<ResearchKey, { title: string; copy: string; cost: { pack: ScienceKey; quantity: number }[]; accent: string }> = {
  automation: { title: 'Basic automation', copy: 'The first assembly machines can repeat component recipes without supervision.', cost: [{ pack: 'automationPack', quantity: 4 }], accent: '#df7165' },
  steamPower: { title: 'Steam Power', copy: 'Boilers, steam handling, and engine control. Unlocks water pumps and the first power tree.', cost: [{ pack: 'automationPack', quantity: 6 }], accent: '#65afba' },
  steelProcessing: { title: 'Steel Processing', copy: 'Longer heat cycles convert iron plates into resilient structural steel.', cost: [{ pack: 'automationPack', quantity: 5 }, { pack: 'logisticsPack', quantity: 5 }], accent: '#aabac3' },
  solarPower: { title: 'Solar Power', copy: 'Quiet daytime generation with no fuel input or moving parts.', cost: [{ pack: 'automationPack', quantity: 8 }, { pack: 'logisticsPack', quantity: 8 }], accent: '#dfb05c' },
  nuclearPower: { title: 'Nuclear Power', copy: 'A high-density heat loop powered by uranium and sulfuric acid.', cost: [{ pack: 'logisticsPack', quantity: 10 }, { pack: 'researchPack', quantity: 10 }], accent: '#92c86b' },
};

const upgradeData: { id: UpgradeKey; title: string; copy: string; base: number; unit: string }[] = [
  { id: 'manualMining', title: 'Reinforced hand tools', copy: 'Increase every manual mining tap by 1 raw item.', base: 18, unit: 'raw / tap' },
  { id: 'productionSpeed', title: 'Tighter cycle control', copy: 'All autonomous assemblers complete cycles 10% faster.', base: 24, unit: '% speed' },
  { id: 'storageEfficiency', title: 'Dense rack packing', copy: 'Raise the effective capacity of every storage row by 8%.', base: 28, unit: '% capacity' },
  { id: 'powerEfficiency', title: 'Load balancing', copy: 'Reduce factory power draw by 6% per level.', base: 30, unit: '% efficiency' },
];

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');
const duration = (n: number) => `${Math.floor(n / 60)}m ${String(Math.max(0, Math.floor(n % 60))).padStart(2, '0')}s`;
const capFor = (state: GameState, key: TrackedKey) => Math.floor(state.storage[key] * (1 + state.upgrades.storageEfficiency * 0.08));
const totalUnits = (state: GameState) => Object.values(state.miners).reduce((a, b) => a + b, 0) + Object.values(state.assemblers).reduce((a, b) => a + b, 0) + state.labs;
const hasInputs = (state: GameState, inputs: Partial<Record<TrackedKey, number>>) => Object.entries(inputs).every(([key, value]) => (state.raw[key as RawKey] ?? state.products[key as ComponentKey] ?? 0) >= (value ?? 0));
const spendInputs = (state: GameState, inputs: Partial<Record<TrackedKey, number>>) => {
  Object.entries(inputs).forEach(([key, value]) => {
    if (rawKeys.includes(key as RawKey)) state.raw[key as RawKey] -= value ?? 0;
    else state.products[key as ComponentKey] -= value ?? 0;
  });
};
const addTracked = (state: GameState, key: TrackedKey, amount: number) => {
  if (rawKeys.includes(key as RawKey)) state.raw[key as RawKey] = Math.min(capFor(state, key), state.raw[key as RawKey] + amount);
  else state.products[key as ComponentKey] = Math.min(capFor(state, key), state.products[key as ComponentKey] + amount);
};

function simulate(previous: GameState, seconds: number): GameState {
  const state: GameState = {
    ...previous, raw: { ...previous.raw }, products: { ...previous.products }, miners: { ...previous.miners }, storage: { ...previous.storage },
    assemblers: { ...previous.assemblers }, miningProgress: { ...previous.miningProgress }, assemblyProgress: { ...previous.assemblyProgress },
    queue: previous.queue.map((item) => ({ ...item })), lastSeen: Date.now(),
  };
  const speed = state.simulationSpeed;
  rawKeys.forEach((key) => {
    const count = key === 'water' ? state.pumps : key === 'uranium' ? state.uraniumMiners : state.miners[key];
    if (!count) return;
    const base = key === 'uranium' ? 0.32 : key === 'water' ? 0.7 : key === 'copper' ? 0.88 : 1;
    state.miningProgress[key] += count * base * seconds * speed;
    while (state.miningProgress[key] >= 1) {
      if (state.raw[key] >= capFor(state, key)) { state.miningProgress[key] = 0; break; }
      state.raw[key] += 1; state.miningProgress[key] -= 1; state.totalOutput += 1;
    }
  });
  componentKeys.forEach((key) => {
    const count = state.assemblers[key];
    if (!count) return;
    const recipe = recipes[key];
    state.assemblyProgress[key] += count * seconds * speed * (1 + state.upgrades.productionSpeed * 0.1) / recipe.cycle;
    let cycles = 0;
    while (state.assemblyProgress[key] >= 1 && cycles < 80) {
      if (!hasInputs(state, recipe.inputs) || state.products[key] >= capFor(state, key)) break;
      spendInputs(state, recipe.inputs); addTracked(state, key, 1); state.assemblyProgress[key] -= 1; state.totalOutput += 1; cycles += 1;
    }
  });
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
    if (item.action === 'lab') state.labs += 1;
    if (item.action === 'upgrade') state.upgrades[(item.targetId ?? item.target) as UpgradeKey] += 1;
  });
  return state;
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as Partial<GameState> | null;
    if (!parsed) return { state: initialState, away: 0, recovered: 0 };
    const state = { ...initialState, ...parsed, raw: { ...initialState.raw, ...parsed.raw }, products: { ...initialState.products, ...parsed.products }, lastSeen: parsed.lastSeen ?? Date.now() } as GameState;
    const away = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - state.lastSeen) / 1000));
    const before = state.totalOutput;
    const recovered = simulate(state, away);
    return { state: recovered, away, recovered: recovered.totalOutput - before };
  } catch { return { state: initialState, away: 0, recovered: 0 }; }
}

function ResourceIcon({ item, size = 28 }: { item: TrackedKey; size?: number }) {
  const color = meta[item].color;
  if (item === 'water') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={color} d="M16 3S7 13 7 19a9 9 0 0 0 18 0c0-6-9-16-9-16Z"/><path fill="#ddf0ed" opacity=".3" d="M11 19a5 5 0 0 0 5 5v-2a3 3 0 0 1-3-3h-2Z"/></svg>;
  if (item === 'uranium') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill={color}/><circle cx="16" cy="16" r="6" fill="#172126"/><path fill={color} d="M14.5 6h3v7h-3zm-8 8.5h7v3h-7zm9 1.5h3v7h-3zm1.5-1h7v3h-7z"/></svg>;
  if (scienceKeys.includes(item as ScienceKey)) return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={color} d="M12 4h8v2l-2 4v3l6 10a3 3 0 0 1-2.6 4H10.6A3 3 0 0 1 8 23l6-10v-3l-2-4V4Z"/><path fill="#f8d18e" opacity=".8" d="M10.6 20h10.8l2 3.3a1 1 0 0 1-.9 1.5H9.5a1 1 0 0 1-.9-1.5l2-3.3Z"/><circle cx="14" cy="22" r="1" fill={color}/><circle cx="19" cy="24" r="1" fill={color}/></svg>;
  if (item === 'gear') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={color} d="m12 4 3 2a9 9 0 0 1 2 0l3-2 3 2-1 4a9 9 0 0 1 1 2l4 1v4l-4 1a9 9 0 0 1-1 2l1 4-3 2-3-2a9 9 0 0 1-2 0l-3 2-3-2 1-4a9 9 0 0 1-1-2l-4-1v-4l4-1a9 9 0 0 1 1-2L9 6l3-2Zm4 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>;
  if (item === 'circuit') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="6" width="20" height="20" rx="2" fill={color}/><path fill="#172126" d="M10 10h4v4h-4zm8 0h4v4h-4zm-8 8h4v4h-4zm8 0h4v4h-4z"/><path stroke={color} strokeWidth="1.5" d="M3 12h5m-5 8h5m16-8h5m-5 8h5M12 3v5m8-5v5m-8 16v5m8-5v5"/></svg>;
  if (item === 'ironPlate' || item === 'copperPlate' || item === 'steel') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={color} d="m6 9 14-4 6 4v14l-14 4-6-4V9Z"/><path fill="#f5e6ce" opacity=".22" d="m8 10 12-3 4 3-12 4-4-2v12l4 2V14l12-4v12l-12 4"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={color} d="m5 19 5-10 9-3 8 8-4 11-11 2-7-8Z"/><path fill="#f2d6b4" opacity=".3" d="m11 11 7-2 4 5-4 7-7 1-3-4 3-7Z"/></svg>;
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

function FactoryPage({ state, setState, away, recovered, notice }: PageProps) {
  const active = totalUnits(state);
  const throughput = Math.max(0, Object.values(state.assemblers).reduce((a, count, i) => a + count * 60 / recipes[componentKeys[i]].cycle, 0));
  const powerProduction = (state.research.includes('steamPower') ? 80 : 0) + (state.research.includes('solarPower') ? 45 : 0) + (state.research.includes('nuclearPower') ? 180 : 0);
  const draw = Math.max(1, Math.floor(active * 7 * (1 - state.upgrades.powerEfficiency * 0.06)));
  const bottleneck = componentKeys.find((key) => state.assemblers[key] > 0 && !hasInputs(state, recipes[key].inputs)) ?? 'circuit';
  return <PageFrame>{away >= 60 && recovered > 0 && <div className="surface mb-5 flex flex-col gap-3 rounded-xl border-[hsl(var(--secondary)/.4)] bg-[linear-gradient(100deg,hsl(174_35%_17%/.8),hsl(216_25%_14%/.96))] p-4 sm:flex-row sm:items-center sm:justify-between enter" data-testid="status-offline-production"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]"><RotateCcw size={18} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Network recovered</div><div className="mt-1 text-[13px] font-bold">{duration(away)} of offline production reconciled</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">The line added <span className="mono text-[hsl(var(--secondary))]">{fmt(recovered)} items</span> while the control room was closed.</div></div></div><button onClick={() => notice('offline report acknowledged')} className="button-base button-ghost shrink-0" data-testid="button-dismiss-offline">acknowledge <ArrowRight size={13} /></button></div>}
    <Header eyebrow="Live production network" title="Factory" copy="One control surface for the whole operation. Watch the line, then clear the next constraint." action={<Tag><span className="status-dot status-running mini-pulse" /> line online</Tag>} />
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 enter enter-delay-1">{[{ label: 'Throughput', value: throughput.toFixed(1), suffix: 'items / min', icon: TrendingUp, color: 'text-[hsl(var(--secondary))]' }, { label: 'Active units', value: fmt(active), suffix: 'machines + labs', icon: Activity, color: 'text-[#83d993]' }, { label: 'Total output', value: fmt(state.totalOutput), suffix: 'lifetime items', icon: Layers3, color: 'text-[hsl(var(--primary))]' }, { label: 'Power balance', value: `${powerProduction - draw}`, suffix: 'MW net', icon: Zap, color: powerProduction >= draw ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]' }].map((k) => <div className="surface rounded-xl p-3.5" key={k.label}><div className={`mb-2 flex items-center gap-2 ${k.color}`}><k.icon size={14} /><span className="eyebrow">{k.label}</span></div><div className="mono text-[19px]">{k.value} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{k.suffix}</span></div></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
      <section className="surface rounded-xl p-4 sm:p-5 enter enter-delay-2"><SectionTitle detail={`${state.queue.length} active`}>Command overview</SectionTitle><div className="grid gap-3 sm:grid-cols-2"><div className="surface-soft rounded-xl p-4"><div className="flex items-start justify-between"><div><div className="eyebrow">Factory health</div><div className="mt-2 text-xl font-extrabold">Stable <span className="mono text-[11px] font-normal text-[hsl(var(--secondary))]">72%</span></div></div><Gauge size={20} className="text-[hsl(var(--secondary))]" /></div><Progress value={72} /><div className="mt-2 flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]"><span>inputs ahead of demand</span><span className="mono">live</span></div></div><div className="surface-soft rounded-xl p-4"><div className="flex items-start justify-between"><div><div className="eyebrow">Bottleneck signal</div><div className="mt-2 text-xl font-extrabold">{meta[bottleneck].label}</div></div><TriangleAlert size={20} className="text-[hsl(var(--primary))]" /></div><div className="mt-3 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">One constrained input is limiting a downstream component.</div><Link href="/production" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--primary))] no-underline" data-testid="link-factory-bottleneck">inspect production <ArrowRight size={12} /></Link></div></div><div className="mt-3 grid-lines rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex items-center justify-between"><div className="eyebrow">Network pulse · last 60 seconds</div><Activity size={15} className="text-[hsl(var(--secondary))]" /></div><div className="flex h-16 items-end gap-1.5 pt-2">{[30,34,42,39,49,46,58,55,61,67,63,72,69,78,74,82,79,88,84,92].map((h, i) => <div key={i} className="flex-1 rounded-t-sm bg-[hsl(var(--secondary)/.58)]" style={{ height: `${h}%`, opacity: i > 16 ? .95 : .55 }} />)}</div><div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>-60 sec</span><span>now · {throughput.toFixed(1)} items/min</span></div></div></section>
      <div className="space-y-5"><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={`${state.queue.length} queued`}>Construction queue</SectionTitle>{state.queue.length ? <div className="space-y-2">{state.queue.map((item) => <div className="data-row flex items-center gap-3 rounded-lg p-2.5" key={item.id} data-testid={`row-factory-queue-${item.id}`}><div className="grid h-7 w-7 place-items-center rounded-md bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">{item.action === 'upgrade' ? <TrendingUp size={14} /> : <Hammer size={14} />}</div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold">{item.target} <span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">· {item.action}</span></div><Progress value={(1 - item.seconds / item.total) * 100} tone="amber" /></div><span className="mono text-[10px] text-[hsl(var(--primary))]">{duration(item.seconds)}</span></div>)}</div> : <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-[11px] text-[hsl(var(--muted-foreground))]">No construction in flight. The next build will appear here.</div>}</section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle>Control notes</SectionTitle><div className="space-y-3 text-[11px] text-[hsl(var(--muted-foreground))]"><div className="flex gap-2"><Info size={14} className="shrink-0 text-[hsl(var(--secondary))]" /><span>Raw materials begin with manual taps. Miners take over the moment their build completes.</span></div><div className="flex gap-2"><Info size={14} className="shrink-0 text-[hsl(var(--primary))]" /><span>Storage, science, and research are separate control tabs so this overview stays factory-wide.</span></div></div></section></div>
    </div><p className="mt-5 mono text-[9px] text-[hsl(var(--muted-foreground))]">LOCAL SAVE · AUTO-COMMIT EVERY TICK</p>
  </PageFrame>;
}

function MiningPage({ state, setState, enqueue, notice }: PageProps) {
  const tap = (key: RawKey) => { if (state.miners[key] || key === 'water' || key === 'uranium') return; setState((s) => ({ ...s, raw: { ...s.raw, [key]: Math.min(capFor(s, key), s.raw[key] + 1 + s.upgrades.manualMining) }, totalOutput: s.totalOutput + 1 })); notice(`manual ${rawInfo[key].label.toLowerCase()} extracted`); };
  const build = (key: RawKey) => {
    if (key === 'water') { if (!state.research.includes('steamPower')) return notice('Steam Power required'); if (state.products.ironPlate < 10 || state.products.gear < 2) return notice('need 10 iron plates + 2 gears'); setState((s) => ({ ...s, products: { ...s.products, ironPlate: s.products.ironPlate - 10, gear: s.products.gear - 2 } })); enqueue('pump', 'Water pump', 40); return; }
    if (key === 'uranium') { if (!state.research.includes('nuclearPower')) return notice('Nuclear Power required'); if (state.products.steel < 20 || state.products.circuit < 8) return notice('need 20 steel + 8 circuits'); setState((s) => ({ ...s, products: { ...s.products, steel: s.products.steel - 20, circuit: s.products.circuit - 8 } })); enqueue('uraniumMiner', 'Acid-powered uranium miner', 90); return; }
    if (state.raw.coal < 4 || state.products.ironPlate < 5 || state.products.gear < 1) return notice('need 4 coal + 5 iron plates + 1 gear'); setState((s) => ({ ...s, raw: { ...s.raw, coal: s.raw.coal - 4 }, products: { ...s.products, ironPlate: s.products.ironPlate - 5, gear: s.products.gear - 1 } })); enqueue('miner', `${rawInfo[key].label} coal-powered miner`, 45, key);
  };
  return <PageFrame><Header eyebrow="Raw material control" title="Mining" copy="Tap the ground to start. Build one extractor and that resource becomes autonomous — additional miners only deepen the same section." action={<Tag><Pickaxe size={11} /> 7 resource sections</Tag>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rawKeys.map((key) => { const info = rawInfo[key]; const locked = !!info.research && !state.research.includes(info.research); const count = key === 'water' ? state.pumps : key === 'uranium' ? state.uraniumMiners : state.miners[key]; const autonomous = count > 0; return <section className={`surface rounded-xl p-4 ${locked ? 'locked-wash opacity-75' : ''}`} key={key} data-testid={`section-mining-${key}`}><div className="flex items-start gap-3"><div className="resource-orb"><ResourceIcon item={key} size={29} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="text-[13px] font-extrabold">{info.label}</h2>{locked ? <Tag tone="muted"><LockKeyhole size={10} /> locked</Tag> : autonomous ? <Tag><span className="status-dot status-running" /> autonomous</Tag> : <Tag tone="amber">manual</Tag>}</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{info.description}</p></div></div><div className="mt-4 flex items-end justify-between"><div><div className="eyebrow">Buffer</div><div className="mono mt-1 text-[18px]">{fmt(state.raw[key])}<span className="text-[10px] text-[hsl(var(--muted-foreground))]"> / {capFor(state, key)}</span></div></div><div className="text-right"><div className="eyebrow">{key === 'water' ? 'pumps' : key === 'uranium' ? 'acid miners' : 'miners'}</div><div className="mono mt-1 text-[18px] text-[hsl(var(--secondary))]">{count}</div></div></div><Progress value={state.raw[key] / capFor(state, key) * 100} /><div className="mt-4 flex gap-2">{locked ? <button onClick={() => notice(`${info.needs} research required`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-locked-mining-${key}`}><LockKeyhole size={13} /> requires {info.needs}</button> : autonomous ? <button onClick={() => build(key)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-build-more-${key}`}><Plus size={13} /> construct {key === 'water' ? 'pump' : 'miner'}</button> : <><button onClick={() => tap(key)} className="button-base button-primary flex-1 !py-2" data-testid={`button-tap-${key}`}><Pickaxe size={13} /> tap to mine</button><button onClick={() => build(key)} className="button-base button-ghost !px-3 !py-2" aria-label={`Construct ${info.label} miner`} data-testid={`button-build-miner-${key}`}><Hammer size={13} /></button></>}</div></section>; })}</div><div className="mt-5 surface rounded-xl border-[hsl(var(--secondary)/.25)] p-4"><div className="flex items-start gap-3"><div className="text-[hsl(var(--secondary))]"><Lightbulb size={17} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">Mining rule</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Manual taps are intentionally useful at the start of a run. After construction finishes, the same section reports its miner count and the tap becomes an autonomous rate.</p></div></div></div></PageFrame>;
}

function ProductionPage({ state, setState, enqueue, notice }: PageProps) {
  const tap = (key: ComponentKey) => { const recipe = recipes[key]; if (state.assemblers[key]) return notice('assembler already controls this recipe'); if (!hasInputs(state, recipe.inputs)) return notice('missing recipe inputs'); setState((s) => { const next = { ...s, raw: { ...s.raw }, products: { ...s.products } }; spendInputs(next, recipe.inputs); addTracked(next, key, 1); next.totalOutput += 1; return next; }); notice(`${meta[key].label} produced manually`); };
  const buildAssembler = (key: ComponentKey) => { if (state.products.ironPlate < 8 || state.products.gear < 1) return notice('need 8 iron plates + 1 gear'); setState((s) => ({ ...s, products: { ...s.products, ironPlate: s.products.ironPlate - 8, gear: s.products.gear - 1 } })); enqueue('assembler', `${meta[key].label} assembler`, 50, key); };
  return <PageFrame><Header eyebrow="Component line" title="Production" copy="Every section is one recipe. Tap a component until you can afford its assembler, then let the recipe run itself." action={<Tag><Cog size={11} /> data-driven recipes</Tag>} /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{componentKeys.map((key) => { const recipe = recipes[key]; const count = state.assemblers[key]; const rate = count * 60 / recipe.cycle * (1 + state.upgrades.productionSpeed * .1); return <section className="surface rounded-xl p-4" key={key} data-testid={`section-production-${key}`}><div className="flex items-start gap-3"><div className="resource-orb"><ResourceIcon item={key} size={29} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="text-[13px] font-extrabold">{meta[key].label}</h2>{count ? <Tag><span className="status-dot status-running" /> auto</Tag> : <Tag tone="amber">manual</Tag>}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{recipe.label} cycle · {recipe.cycle}s base</div></div></div><div className="mt-4 rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><div className="eyebrow mb-2">Recipe</div><div className="flex flex-wrap items-center gap-1.5">{Object.entries(recipe.inputs).map(([input, qty]) => <span className="resource-chip" key={input}><ResourceIcon item={input as TrackedKey} size={17} /><strong>{qty}</strong> {meta[input as TrackedKey].short}</span>)}<ArrowRight size={13} className="mx-1 text-[hsl(var(--muted-foreground))]" /><span className="resource-chip" style={{ borderColor: `${meta[key].color}66` }}><ResourceIcon item={key} size={17} /><strong>1</strong> {meta[key].short}</span></div></div><div className="mt-4 flex items-end justify-between"><div><div className="eyebrow">Current rate</div><div className="mono mt-1 text-[17px] text-[hsl(var(--secondary))]">{rate.toFixed(1)} <span className="text-[9px] text-[hsl(var(--muted-foreground))]">/ min</span></div></div><div className="text-right"><div className="eyebrow">Stored</div><div className="mono mt-1 text-[14px]">{fmt(state.products[key])}</div></div></div><div className="mt-4 flex gap-2">{count ? <button onClick={() => notice(`${meta[key].label} assembler is running at ${rate.toFixed(1)} / min`)} className="button-base button-ghost flex-1 !py-2" data-testid={`button-inspect-production-${key}`}><Gauge size={13} /> inspect live rate</button> : <><button onClick={() => tap(key)} className="button-base button-primary flex-1 !py-2" data-testid={`button-tap-production-${key}`}><Plus size={13} /> produce 1</button><button onClick={() => buildAssembler(key)} className="button-base button-ghost !px-3 !py-2" aria-label={`Construct ${meta[key].label} assembler`} data-testid={`button-build-assembler-${key}`}><Hammer size={13} /></button></>}</div></section>; })}</div></PageFrame>;
}

function PowerPage({ state, notice }: PageProps) {
  const steam = state.research.includes('steamPower'); const solar = state.research.includes('solarPower'); const nuclear = state.research.includes('nuclearPower'); const draw = Math.max(1, Math.floor(totalUnits(state) * 7 * (1 - state.upgrades.powerEfficiency * .06))); const production = (steam ? 80 : 0) + (solar ? 45 : 0) + (nuclear ? 180 : 0);
  const Node = ({ title, sub, icon, active, locked }: { title: string; sub: string; icon: ReactNode; active?: boolean; locked?: boolean }) => <div className={`tree-line flex items-center gap-3 rounded-xl border p-3 ${active ? 'border-[hsl(var(--secondary)/.5)] bg-[hsl(174_30%_15%/.7)]' : locked ? 'locked-wash border-[hsl(var(--border))] opacity-65' : 'border-[hsl(var(--border))] bg-[hsl(216_24%_11%/.7)]'}`}><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{locked ? <LockKeyhole size={15} /> : icon}</div><div className="min-w-0"><div className="text-[11px] font-bold">{title}</div><div className="mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">{sub}</div></div><div className="ml-auto">{active ? <Tag>online</Tag> : locked ? <Tag tone="muted">research</Tag> : <Tag tone="amber">standby</Tag>}</div></div>;
  return <PageFrame><Header eyebrow="Energy network" title="Power" copy="Power is a dependency tree, not a single number. Research a generation family, then watch its conversion chain come online." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><BatteryCharging size={17} className="text-[hsl(var(--secondary))]" /><span className="mono text-[15px]">{production} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">MW produced</span></span></div>} /><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="surface rounded-xl p-4"><div className="eyebrow">Production</div><div className="mono mt-2 text-xl text-[hsl(var(--secondary))]">{production} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Factory draw</div><div className="mono mt-2 text-xl">{draw} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Net balance</div><div className={`mono mt-2 text-xl ${production >= draw ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{production - draw} MW</div></div><div className="surface rounded-xl p-4"><div className="eyebrow">Efficiency</div><div className="mono mt-2 text-xl">{state.upgrades.powerEfficiency * 6}%</div></div></div><div className="grid gap-5 lg:grid-cols-3"><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={steam ? 'online' : 'locked'}>Steam generation</SectionTitle><div className="space-y-4"><Node title="Boiler" sub="coal + water → heat" icon={<FlameIcon />} active={steam} locked={!steam} /><Node title="Steam" sub="pressurized thermal fluid" icon={<Waves size={16} />} active={steam} locked={!steam} /><Node title="Steam engine" sub="80 MW potential" icon={<Gauge size={16} />} active={steam} locked={!steam} /></div><button onClick={() => notice(steam ? 'steam chain is online' : 'unlock Steam Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-steam">{steam ? 'inspect steam chain' : 'view steam dependency'}</button></section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={solar ? 'online' : 'locked'}>Solar generation</SectionTitle><div className="space-y-4"><Node title="Solar array" sub="sunlight → current" icon={<Sun size={16} />} active={solar} locked={!solar} /><Node title="Inverter bank" sub="stable daytime output" icon={<Zap size={16} />} active={solar} locked={!solar} /><Node title="Power bus" sub="45 MW potential" icon={<Power size={16} />} active={solar} locked={!solar} /></div><button onClick={() => notice(solar ? 'solar array is online' : 'unlock Solar Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-solar">{solar ? 'inspect solar chain' : 'view solar dependency'}</button></section><section className="surface rounded-xl p-4 sm:p-5"><SectionTitle detail={nuclear ? 'online' : 'locked'}>Nuclear generation</SectionTitle><div className="space-y-4"><Node title="Nuclear reactor" sub="uranium + acid → heat" icon={<Sparkles size={16} />} active={nuclear} locked={!nuclear} /><Node title="Heat exchanger" sub="heat → steam" icon={<Waves size={16} />} active={nuclear} locked={!nuclear} /><Node title="Power turbine" sub="180 MW potential" icon={<Gauge size={16} />} active={nuclear} locked={!nuclear} /></div><button onClick={() => notice(nuclear ? 'nuclear chain is online' : 'unlock Nuclear Power in Research')} className="button-base button-ghost mt-5 w-full !py-2" data-testid="button-power-nuclear">{nuclear ? 'inspect nuclear chain' : 'view nuclear dependency'}</button></section></div><p className="mt-5 text-[10px] text-[hsl(var(--muted-foreground))]"><Info size={13} className="mr-1 inline text-[hsl(var(--secondary))]" /> Power families are gated by research and represented as a clear production tree before you build them.</p></PageFrame>;
}
function FlameIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 2.8c.4 3-1.3 4.2-2.4 5.4-1 1-1.2 2.3-.6 3.3.4-1.3 1.5-2.3 2.8-2.7 2.6 2 3.8 4.3 3.2 7.1-.4 1.8-1.7 3.2-3.3 4.1 4.7-.8 7-4 6.2-8.4-.5-2.8-2.5-5.8-5.9-8.8ZM10 12c-3.7 1.4-5.4 4-4.6 6.6.6 2 2.3 3.4 4.5 4-1.2-1.2-1.5-2.6-.6-4.1.7-1.2 1.6-2.1 2.6-2.6-1.1-1-1.8-2.3-1.9-3.9Z"/></svg>; }

function StoragePage({ state, setState, notice }: PageProps) {
  const upgrade = (key: TrackedKey) => { const cost = 3 + Math.floor(state.storage[key] / 60); if (state.products.gear < cost || state.products.ironPlate < cost * 2) return notice(`need ${cost} gears + ${cost * 2} iron plates`); setState((s) => ({ ...s, products: { ...s.products, gear: s.products.gear - cost, ironPlate: s.products.ironPlate - cost * 2 }, storage: { ...s.storage, [key]: s.storage[key] + 60 } })); notice(`${meta[key].label} capacity expanded`); };
  return <PageFrame><Header eyebrow="Buffer control" title="Storage" copy="Every tracked item gets one honest row. Upgrade a single capacity when a full buffer becomes the next constraint." action={<Tag><Box size={11} /> {trackedKeys.length} tracked items</Tag>} /><section className="surface overflow-hidden rounded-xl p-3 sm:p-5"><div className="hidden grid-cols-[minmax(180px,1.3fr)_110px_minmax(160px,1fr)_115px] gap-4 border-b border-[hsl(var(--border))] px-3 pb-3 md:grid"><span className="eyebrow">Item</span><span className="eyebrow">Amount</span><span className="eyebrow">Fill</span><span className="eyebrow text-right">Action</span></div><div className="space-y-2 pt-1">{trackedKeys.map((key) => { const amount = rawKeys.includes(key as RawKey) ? state.raw[key as RawKey] : state.products[key as ComponentKey]; const capacity = capFor(state, key); const cost = 3 + Math.floor(state.storage[key] / 60); return <div className="data-row grid gap-3 rounded-xl p-3 md:grid-cols-[minmax(180px,1.3fr)_110px_minmax(160px,1fr)_115px] md:items-center md:gap-4" key={key} data-testid={`row-storage-${key}`}><div className="flex items-center gap-3"><div className="resource-orb !h-9 !w-9"><ResourceIcon item={key} size={25} /></div><div><div className="text-[11px] font-bold">{meta[key].label}</div><div className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{meta[key].category} · capacity {capacity}</div></div></div><div className="flex items-baseline justify-between md:block"><span className="eyebrow md:hidden">amount</span><span className="mono text-[14px]">{fmt(amount)} <span className="text-[9px] text-[hsl(var(--muted-foreground))]">/ {capacity}</span></span></div><div><div className="mb-1 flex justify-between text-[9px] text-[hsl(var(--muted-foreground))]"><span className="md:hidden">fill level</span><span>{Math.floor(amount / capacity * 100)}%</span></div><Progress value={amount / capacity * 100} /></div><button onClick={() => upgrade(key)} className="button-base button-ghost w-full !py-2 md:w-auto" data-testid={`button-upgrade-storage-${key}`}><Plus size={12} /> +60 <span className="hidden sm:inline">capacity</span><span className="mono text-[9px] text-[hsl(var(--primary))]">· {cost}g</span></button></div>; })}</div></section><p className="mt-4 text-[10px] text-[hsl(var(--muted-foreground))]"><Info size={13} className="mr-1 inline text-[hsl(var(--primary))]" /> Storage upgrades spend factory-produced gears and iron plates, and affect only the selected row.</p></PageFrame>;
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
    state.assemblers[key] * 60 / recipes[key].cycle * (1 + state.upgrades.productionSpeed * .1),
    state.products[key] > 0 ? state.labs * 12 : 0,
  )));
  const buildLab = () => { if (state.products.ironPlate < 12 || state.products.circuit < 4) return notice('need 12 iron plates + 4 circuits'); setState((s) => ({ ...s, products: { ...s.products, ironPlate: s.products.ironPlate - 12, circuit: s.products.circuit - 4 } })); enqueue('lab', 'Science lab', 65); };
  return <PageFrame><Header eyebrow="Research fuel" title="Science" copy="Labs consume science packs at a measured rate. Identically scaled bars make the smallest capacity or demand visible at a glance." action={<div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><FlaskConical size={17} className="text-[hsl(var(--primary))]" /><span className="mono text-[15px]">{totalConsumption.toFixed(1)} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">SPM</span></span></div>} /><section className="surface rounded-xl p-4 sm:p-5"><div className="mb-5 flex items-center justify-between"><SectionTitle detail={`${state.labs} labs online`}>Science pack flow</SectionTitle><button onClick={buildLab} className="button-base button-primary !py-2" data-testid="button-build-lab"><Plus size={13} /> build lab</button></div><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Current SPM</div><div className="mono mt-2 text-xl text-[hsl(var(--primary))]">{totalConsumption.toFixed(1)}</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Labs</div><div className="mono mt-2 text-xl">{state.labs}</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Lab cycle</div><div className="mono mt-2 text-xl">5s</div></div><div className="surface-soft rounded-lg p-3"><div className="eyebrow">Research bank</div><div className="mono mt-2 text-xl">{fmt(scienceKeys.reduce((sum, key) => sum + state.products[key], 0))}</div></div></div><div className="space-y-3">{scienceKeys.map((key) => { const productionCapacity = state.assemblers[key] * 60 / recipes[key].cycle * (1 + state.upgrades.productionSpeed * .1); const consumption = state.products[key] > 0 ? state.labs * 12 : 0; return <div className="data-row rounded-xl p-3 sm:p-4" key={key} data-testid={`row-science-${key}`}><div className="flex items-center gap-3"><div className="resource-orb !h-9 !w-9"><ResourceIcon item={key} size={25} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-[12px] font-bold">{meta[key].label}</span><span className="mono text-[11px]">{fmt(state.products[key])} stored</span></div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">capacity <span className="mono text-[hsl(var(--secondary))]">{productionCapacity.toFixed(1)}/min</span> · consumption <span className="mono text-[hsl(var(--primary))]">{consumption.toFixed(1)}/min</span></div></div></div><div className="mt-3 grid grid-cols-[1fr_1fr] gap-3"><div><div className="mb-1 flex justify-between text-[9px] text-[hsl(var(--muted-foreground))]"><span>production capacity</span><span className="mono">{productionCapacity.toFixed(1)}</span></div><Progress value={productionCapacity / sharedScale * 100} /></div><div><div className="mb-1 flex justify-between text-[9px] text-[hsl(var(--muted-foreground))]"><span>lab consumption</span><span className="mono">{consumption.toFixed(1)}</span></div><Progress value={consumption / sharedScale * 100} tone="amber" /></div></div></div>; })}</div></section></PageFrame>;
}

function ResearchArt({ accent }: { accent: string }) { return <div className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_25%_10%)]" style={{ color: accent }}><svg width="72" height="56" viewBox="0 0 72 56" aria-hidden="true"><path stroke="currentColor" strokeOpacity=".35" d="M6 43 22 27l10 8 15-21 19 14" /><circle cx="22" cy="27" r="5" fill="currentColor" opacity=".85" /><circle cx="47" cy="14" r="5" fill="currentColor" opacity=".65" /><path fill="currentColor" opacity=".18" d="M7 47h58v3H7zM12 10h3v34h-3zm45 13h3v21h-3z" /></svg></div>; }
function ResearchPage({ state, setState, notice }: PageProps) {
  const [selected, setSelected] = useState<ResearchKey>('steamPower');
  const unlock = (key: ResearchKey) => { const item = researchData[key]; if (state.research.includes(key)) return; if (key === 'nuclearPower' && !state.research.includes('solarPower')) return notice('Solar Power is required first'); if (item.cost.some(({ pack, quantity }) => state.products[pack] < quantity)) return notice('not enough required science packs'); setState((s) => { const products = { ...s.products }; item.cost.forEach(({ pack, quantity }) => { products[pack] -= quantity; }); return { ...s, products, research: [...s.research, key] }; }); notice(`${item.title} research complete`); };
  return <PageFrame><Header eyebrow="Technology control" title="Research" copy="Choose a research, inspect its science recipe, and make a permanent change to the network. Costs are explicit per node." action={<Tag><Lightbulb size={11} /> {state.research.length} completed</Tag>} /><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="space-y-3">{(Object.keys(researchData) as ResearchKey[]).map((key) => { const item = researchData[key]; const done = state.research.includes(key); const available = item.cost.every(({ pack, quantity }) => state.products[pack] >= quantity); return <button onClick={() => setSelected(key)} className={`surface flex w-full items-center gap-3 rounded-xl p-3 text-left sm:p-4 ${selected === key ? 'border-[hsl(var(--secondary)/.65)] bg-[hsl(174_30%_15%/.7)]' : 'hover:border-[hsl(var(--border))]'}`} key={key} data-testid={`button-research-${key}`}><ResearchArt accent={item.accent} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-extrabold">{item.title}</span>{done ? <Tag><Check size={10} /> complete</Tag> : available ? <Tag tone="amber">ready</Tag> : <Tag tone="muted"><LockKeyhole size={10} /> pack low</Tag>}</div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{item.copy}</p></div><ChevronRight size={15} className="text-[hsl(var(--muted-foreground))]" /></button>; })}</section><aside className="surface h-fit rounded-xl p-5"><div className="eyebrow">Research detail</div>{(() => { const item = researchData[selected]; const done = state.research.includes(selected); const requirementsMet = item.cost.every(({ pack, quantity }) => state.products[pack] >= quantity); return <><h2 className="mt-3 text-lg font-extrabold">{item.title}</h2><p className="mt-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{item.copy}</p><div className="mt-5 border-y border-[hsl(var(--border))] py-4"><div className="eyebrow mb-3">Required science packs</div><div className="space-y-2">{item.cost.map(({ pack, quantity }) => <div className="flex items-center justify-between text-[11px]" key={pack}><span className="flex items-center gap-2"><ResourceIcon item={pack} size={20} />{meta[pack].label}</span><span className={`mono ${state.products[pack] >= quantity ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--destructive))]'}`}>{fmt(state.products[pack])} / {quantity}</span></div>)}</div></div><button onClick={() => unlock(selected)} disabled={done || !requirementsMet} className="button-base button-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-45" data-testid={`button-unlock-research-${selected}`}>{done ? <><Check size={14} /> research complete</> : <><FlaskConical size={14} /> complete research</>}</button><p className="mt-3 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Each node uses equal quantities of the science packs listed for its own research recipe.</p></>; })()}</aside></div></PageFrame>;
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