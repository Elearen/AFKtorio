import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Box,
  ChevronRight,
  CircleHelp,
  Clock3,
  Cog,
  Cpu,
  Factory,
  FlaskConical,
  Gauge,
  Hammer,
  Layers3,
  Lightbulb,
  LockKeyhole,
  Minus,
  Package,
  Pause,
  Pickaxe,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Timer,
  TrendingUp,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react';

type ResourceKey = 'ironOre' | 'copperOre' | 'coal' | 'stone' | 'ironPlate' | 'copperPlate' | 'gears' | 'circuits' | 'science';
type UnitStatus = 'running' | 'starved' | 'blocked';
type UnitKind = 'miner' | 'smelter' | 'press' | 'bench' | 'lab';
type GameResource = Record<ResourceKey, number>;

type Unit = {
  id: string;
  name: string;
  kind: UnitKind;
  level: number;
  status: UnitStatus;
  progress: number;
  cycles: number;
  paused?: boolean;
};

type QueueItem = {
  id: string;
  name: string;
  kind: 'construction' | 'upgrade';
  seconds: number;
  total: number;
  targetId?: string;
};

type TechKey = 'mechanizedMining' | 'heatTreatment' | 'precisionAssembly' | 'signalLogic' | 'logistics';
type GameState = {
  resources: GameResource;
  units: Unit[];
  queue: QueueItem[];
  unlockedTech: TechKey[];
  totalProduced: number;
  lastSeen: number;
  upgrades: number;
};

const STORAGE_KEY = 'factory-production-game-save-v1';
const CAPACITY = 180;

const RESOURCE_META: Record<ResourceKey, { label: string; short: string; color: string; category: string }> = {
  ironOre: { label: 'Iron ore', short: 'Fe ore', color: '#bd7b45', category: 'Raw material' },
  copperOre: { label: 'Copper ore', short: 'Cu ore', color: '#d08e5b', category: 'Raw material' },
  coal: { label: 'Coal', short: 'C', color: '#8b91a2', category: 'Fuel' },
  stone: { label: 'Stone', short: 'St', color: '#9ca5a3', category: 'Raw material' },
  ironPlate: { label: 'Iron plates', short: 'Fe plate', color: '#c6d0ce', category: 'Refined' },
  copperPlate: { label: 'Copper plates', short: 'Cu plate', color: '#e69b62', category: 'Refined' },
  gears: { label: 'Gears', short: 'Gear', color: '#e0ae57', category: 'Component' },
  circuits: { label: 'Circuits', short: 'Circuit', color: '#53b8a7', category: 'Component' },
  science: { label: 'Science packs', short: 'Science', color: '#df7061', category: 'Research' },
};

const initialState: GameState = {
  resources: { ironOre: 64, copperOre: 42, coal: 28, stone: 24, ironPlate: 22, copperPlate: 11, gears: 5, circuits: 1, science: 0 },
  units: [
    { id: 'iron-miner-01', name: 'Iron Miner 01', kind: 'miner', level: 1, status: 'running', progress: 0.36, cycles: 318 },
    { id: 'copper-miner-01', name: 'Copper Miner 01', kind: 'miner', level: 1, status: 'running', progress: 0.62, cycles: 207 },
    { id: 'coal-drill-01', name: 'Coal Drill 01', kind: 'miner', level: 1, status: 'running', progress: 0.14, cycles: 142 },
    { id: 'iron-smelter-01', name: 'Iron Smelter 01', kind: 'smelter', level: 2, status: 'running', progress: 0.78, cycles: 156 },
    { id: 'copper-smelter-01', name: 'Copper Smelter 01', kind: 'smelter', level: 1, status: 'starved', progress: 0.32, cycles: 79 },
    { id: 'gear-press-01', name: 'Gear Press 01', kind: 'press', level: 1, status: 'running', progress: 0.55, cycles: 46 },
    { id: 'circuit-bench-01', name: 'Circuit Bench 01', kind: 'bench', level: 1, status: 'starved', progress: 0.18, cycles: 6 },
    { id: 'science-lab-01', name: 'Science Lab 01', kind: 'lab', level: 1, status: 'blocked', progress: 0.7, cycles: 0 },
  ],
  queue: [
    { id: 'q-1', name: 'Copper Smelter 02', kind: 'construction', seconds: 38, total: 60 },
    { id: 'q-2', name: 'Iron Smelter 01 · Mk II', kind: 'upgrade', targetId: 'iron-smelter-01', seconds: 114, total: 180 },
  ],
  unlockedTech: ['mechanizedMining'],
  totalProduced: 1297,
  lastSeen: Date.now(),
  upgrades: 3,
};

const recipes: Record<UnitKind, { output: ResourceKey; cycle: number; inputs: Partial<GameResource>; icon: string; label: string }> = {
  miner: { output: 'ironOre', cycle: 1, inputs: {}, icon: 'mine', label: 'Extraction' },
  smelter: { output: 'ironPlate', cycle: 2, inputs: { ironOre: 1 }, icon: 'smelt', label: 'Smelting' },
  press: { output: 'gears', cycle: 3, inputs: { ironPlate: 2 }, icon: 'press', label: 'Stamping' },
  bench: { output: 'circuits', cycle: 4, inputs: { copperPlate: 1, ironPlate: 1 }, icon: 'bench', label: 'Assembly' },
  lab: { output: 'science', cycle: 5, inputs: { gears: 1, circuits: 1, coal: 1 }, icon: 'lab', label: 'Research' },
};

const unitRecipes: Record<string, { output: ResourceKey; cycle: number; inputs: Partial<GameResource> }> = {
  'iron-miner-01': { output: 'ironOre', cycle: 1, inputs: {} },
  'copper-miner-01': { output: 'copperOre', cycle: 1.2, inputs: {} },
  'coal-drill-01': { output: 'coal', cycle: 1.5, inputs: {} },
};

const formatNumber = (value: number) => Math.floor(value).toLocaleString('en-US');
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${Math.max(0, Math.floor(seconds % 60)).toString().padStart(2, '0')}s`;

function getRecipe(unit: Unit) {
  if (unit.kind === 'smelter' && unit.name.toLowerCase().includes('copper')) return { output: 'copperPlate' as ResourceKey, cycle: 2.4, inputs: { copperOre: 1 } };
  return unitRecipes[unit.id] ?? recipes[unit.kind];
}

function simulate(previous: GameState, deltaSeconds: number): GameState {
  const next: GameState = {
    ...previous,
    resources: { ...previous.resources },
    units: previous.units.map((unit) => ({ ...unit })),
    queue: previous.queue.map((item) => ({ ...item })),
    lastSeen: Date.now(),
  };
  let produced = 0;
  next.units.forEach((unit) => {
    if (unit.paused) {
      unit.status = 'blocked';
      return;
    }
    const recipe = getRecipe(unit);
    const cycleProgress = deltaSeconds / recipe.cycle * (1 + (unit.level - 1) * 0.12);
    unit.progress += cycleProgress;
    let cycles = 0;
    while (unit.progress >= 1 && cycles < 120) {
      const hasInputs = Object.entries(recipe.inputs).every(([key, amount]) => next.resources[key as ResourceKey] >= (amount ?? 0));
      const output = next.resources[recipe.output];
      if (!hasInputs) {
        unit.status = 'starved';
        break;
      }
      if (output >= CAPACITY) {
        unit.status = 'blocked';
        break;
      }
      Object.entries(recipe.inputs).forEach(([key, amount]) => { next.resources[key as ResourceKey] -= amount ?? 0; });
      next.resources[recipe.output] = Math.min(CAPACITY, output + 1);
      unit.progress -= 1;
      unit.cycles += 1;
      cycles += 1;
      produced += 1;
      unit.status = 'running';
    }
    if (unit.status === 'running' && unit.progress > 1) unit.progress = unit.progress % 1;
    if (!Object.keys(recipe.inputs).length) unit.status = 'running';
  });
  const completed = next.queue.filter((item) => item.seconds <= deltaSeconds);
  next.queue = next.queue.map((item) => ({ ...item, seconds: Math.max(0, item.seconds - deltaSeconds) })).filter((item) => item.seconds > 0);
  completed.forEach((item) => {
    if (item.kind === 'upgrade' && item.targetId) {
      next.units = next.units.map((unit) => unit.id === item.targetId ? { ...unit, level: unit.level + 1 } : unit);
    }
    if (item.kind === 'construction') {
      const index = next.units.filter((unit) => unit.kind === 'smelter').length + 1;
      next.units.push({ id: `smelter-${item.id}`, name: item.name || `Copper Smelter 0${index}`, kind: 'smelter', level: 1, status: 'running', progress: 0, cycles: 0 });
    }
  });
  next.totalProduced += produced;
  return next;
}

function loadGame(): { state: GameState; offlineSeconds: number; offlineProduced: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      const safe = { ...initialState, ...parsed, resources: { ...initialState.resources, ...parsed.resources } };
      const offlineSeconds = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - safe.lastSeen) / 1000));
      const before = safe.totalProduced;
      const recovered = simulate(safe, offlineSeconds);
      return { state: recovered, offlineSeconds, offlineProduced: recovered.totalProduced - before };
    }
  } catch {
    // A damaged save should never prevent the control room from opening.
  }
  return { state: initialState, offlineSeconds: 0, offlineProduced: 0 };
}

function ResourceIcon({ resource, size = 28 }: { resource: ResourceKey; size?: number }) {
  const meta = RESOURCE_META[resource];
  const fill = meta.color;
  if (resource === 'gears') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={fill} d="m12.6 3 2.3 2.1c.7-.1 1.4-.1 2.1 0L19.4 3l3.1 1.7-.5 3.1c.5.5.9 1.1 1.2 1.8l3.1.5v3.5l-3.1.5c-.3.7-.7 1.3-1.2 1.8l.5 3.1-3.1 1.7L17 18.6a9 9 0 0 1-2.1 0l-2.3 2.1-3.1-1.7.5-3.1a8 8 0 0 1-1.2-1.8l-3.1-.5V10l3.1-.5c.3-.7.7-1.3 1.2-1.8l-.5-3.1L12.6 3Zm3.4 6.1a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"/><path fill={fill} opacity=".55" d="m23 17.7 1.7 1.1-.2 2 1.7 1.2-1.2 2-2-.4c-.5.4-1 .7-1.6.9l-.4 2h-2.3l-.5-2c-.5-.2-1.1-.5-1.5-.9l-2 .4-1.2-2 1.7-1.2-.2-2 1.8-1.1 1.5 1.2a5 5 0 0 1 1.8 0l1.5-1.2Z"/></svg>;
  if (resource === 'circuits') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={fill} d="M6 7.5A1.5 1.5 0 0 1 7.5 6h17A1.5 1.5 0 0 1 26 7.5v17a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 6 24.5v-17Z"/><path fill="#172126" d="M10 11h4v4h-4zm8 0h4v4h-4zm-8 8h4v4h-4zm8 0h4v4h-4z"/><path stroke={fill} strokeWidth="1.5" d="M3 12h5M3 20h5m16-8h5m-5 8h5M12 3v5m8-5v5m-8 16v5m8-5v5"/><circle cx="12" cy="13" r="1" fill="#d8f3dc"/><circle cx="20" cy="21" r="1" fill="#d8f3dc"/></svg>;
  if (resource === 'science') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={fill} d="M12 4h8v2l-2 3.7v3.1l6.4 10.4A3 3 0 0 1 21.8 28H10.2a3 3 0 0 1-2.6-4.8L14 12.8V9.7L12 6V4Z"/><path fill="#f8c181" d="M10.5 20.5h11l2.1 3.4a1 1 0 0 1-.8 1.6H9.2a1 1 0 0 1-.8-1.6l2.1-3.4Z"/><circle cx="14" cy="22" r="1" fill={fill}/><circle cx="19" cy="24" r="1" fill={fill}/></svg>;
  if (resource === 'coal') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={fill} d="m6 22 3-10 8-5 9 6-2 10-10 5-8-6Z"/><path fill="#cbd0d3" opacity=".22" d="m12 12 5-2 5 3-1 6-6 3-4-3 1-7Z"/></svg>;
  if (resource === 'stone') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={fill} d="m5 23 4-13 8-5 10 7-3 12-10 4-9-5Z"/><path fill="#edf0e6" opacity=".35" d="m11 13 6-3 5 3-2 7-7 3-4-3 2-7Z"/></svg>;
  if (resource === 'ironPlate' || resource === 'copperPlate') return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={fill} d="m6 9 14-4 6 4v14l-14 4-6-4V9Z"/><path fill="#f5e6ce" opacity=".22" d="m8 10 12-3 4 3-12 4-4-2v12l4 2V14l12-4v12l-12 4"/><path stroke={fill} strokeWidth="1" d="m8 10 4 2 12-4"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path fill={fill} d="m5 19 5-10 9-3 8 8-4 11-11 2-7-8Z"/><path fill="#f2d6b4" opacity=".32" d="m11 11 7-2 4 5-4 7-7 1-3-4 3-7Z"/></svg>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const nav = [
    { href: '/', label: 'Factory floor', icon: Factory },
    { href: '/tech', label: 'Technology', icon: Layers3 },
  ];
  return (
    <div className="app-shell">
      <header className="sticky top-0 z-30 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(217_30%_8%/.92)] backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="icon-button md:hidden" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" data-testid="button-toggle-navigation"><Layers3 size={17} /></button>
            <Link href="/" className="flex items-center gap-3 no-underline" data-testid="link-factory-home">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><Factory size={19} /></div>
              <div><div className="text-[13px] font-extrabold tracking-[.05em] text-[hsl(var(--foreground))]">FACTORY</div><div className="mono text-[9px] tracking-[.19em] text-[hsl(var(--primary))]">PRODUCTION GAME</div></div>
            </Link>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="status-tag tag-running"><span className="status-dot status-running mini-pulse" /> autosave on</span>
            <span className="mono hidden text-[10px] text-[hsl(var(--muted-foreground))] lg:block">SECTOR 07 · LOCAL INSTANCE</span>
          </div>
          <div className="relative"><button className="icon-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Control room settings" data-testid="button-settings"><Settings2 size={16} /></button>{settingsOpen && <div className="surface absolute right-0 top-11 z-50 w-48 rounded-xl p-3" data-testid="panel-settings"><div className="eyebrow">Control room</div><div className="mt-2 text-[11px] font-semibold">Local save active</div><div className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Your production persists in this browser.</div><button onClick={() => setSettingsOpen(false)} className="button-base button-ghost mt-3 w-full !py-2" data-testid="button-close-settings">close panel</button></div>}</div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px]">
        <aside className={`${mobileNav ? 'fixed inset-x-3 top-[78px] z-40 block shadow-2xl' : 'hidden'} surface w-auto shrink-0 rounded-xl p-2 md:sticky md:top-[84px] md:block md:h-[calc(100dvh-100px)] md:w-[220px] md:rounded-none md:border-0 md:border-r md:border-[hsl(var(--sidebar-border))] md:bg-transparent md:p-5 md:shadow-none`}>
          <div className="mb-4 hidden px-3 md:block"><span className="eyebrow">Operations</span></div>
          <nav className="flex flex-col gap-1" aria-label="Primary navigation">
            {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileNav(false)} className={`nav-link flex items-center gap-3 rounded-lg px-3 py-3 text-[12px] font-semibold no-underline transition-colors ${location === href ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon size={17} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />}</Link>)}
          </nav>
          <div className="mt-8 hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.62)] p-3 md:block">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--secondary))]"><Activity size={14} /><span className="eyebrow">Network signal</span></div>
            <div className="mono text-[12px] text-[hsl(var(--foreground))]">+14.8 items/min</div>
            <div className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">The line is learning. Keep inputs ahead of demand.</div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[hsl(var(--border))] bg-[hsl(217_30%_8%/.96)] px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-bold no-underline ${location === href ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`link-mobile-${label.toLowerCase().replace(' ', '-')}`}><Icon size={17} /><span>{label}</span></Link>)}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, detail }: { children: ReactNode; detail?: string }) {
  return <div className="mb-3 flex items-end justify-between"><div className="eyebrow">{children}</div>{detail && <div className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{detail}</div>}</div>;
}

function StatusTag({ status }: { status: UnitStatus }) {
  const copy = { running: 'running', starved: 'input low', blocked: 'blocked' };
  return <span className={`status-tag tag-${status}`}><span className={`status-dot status-${status}`} />{copy[status]}</span>;
}

function UnitCard({ unit, selected, onSelect, onToggle }: { unit: Unit; selected: boolean; onSelect: () => void; onToggle: () => void }) {
  const recipe = getRecipe(unit);
  const meta = RESOURCE_META[recipe.output];
  return <div className={`surface-soft group rounded-xl p-3 transition-colors ${selected ? 'border-[hsl(var(--primary)/.65)] bg-[hsl(216_25%_17%)]' : 'hover:border-[hsl(var(--secondary)/.5)]'}`} data-testid={`card-unit-${unit.id}`}>
    <button onClick={onSelect} className="w-full text-left" data-testid={`button-inspect-${unit.id}`}>
      <div className="flex items-start gap-3">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(216_25%_10%)] text-[hsl(var(--secondary))]">
          {unit.kind === 'miner' ? <Pickaxe size={19} /> : unit.kind === 'smelter' ? <Gauge size={19} /> : unit.kind === 'press' ? <Cog size={19} /> : unit.kind === 'bench' ? <Cpu size={19} /> : <FlaskConical size={19} />}
          <span className={`absolute -right-1 -top-1 status-dot status-${unit.status}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><span className="truncate text-[12px] font-bold text-[hsl(var(--foreground))]">{unit.name}</span><ChevronRight size={14} className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" /></div>
          <div className="mt-1 flex items-center gap-2"><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">LVL {unit.level}</span><span className="text-[10px] text-[hsl(var(--muted-foreground))]">·</span><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{recipes[unit.kind].label}</span></div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2"><div className="progress-track flex-1"><div className={`progress-fill ${unit.status === 'blocked' ? 'red' : unit.status === 'starved' ? 'amber' : ''}`} style={{ width: `${Math.min(100, unit.progress * 100)}%` }} /></div><span className="mono w-8 text-right text-[9px] text-[hsl(var(--muted-foreground))]">{Math.floor(unit.progress * 100)}%</span></div>
      <div className="mt-2 flex items-center justify-between"><StatusTag status={unit.status} /><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]"><span style={{ color: meta.color }}>+1</span> {meta.short}/cycle</span></div>
    </button>
    <div className="mt-3 flex items-center justify-between border-t border-[hsl(var(--border)/.7)] pt-2">
      <span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{formatNumber(unit.cycles)} cycles logged</span>
      <button onClick={onToggle} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" data-testid={`button-toggle-${unit.id}`}>{unit.paused ? <Play size={12} /> : <Pause size={12} />}{unit.paused ? 'resume' : 'pause'}</button>
    </div>
  </div>;
}

function BufferCard({ resource, amount, onSelect }: { resource: ResourceKey; amount: number; onSelect: () => void }) {
  const meta = RESOURCE_META[resource];
  const percentage = Math.min(100, amount / CAPACITY * 100);
  return <button onClick={onSelect} className="surface-soft flex min-w-[140px] flex-1 items-center gap-3 rounded-xl p-3 text-left transition-colors hover:border-[hsl(var(--secondary)/.55)]" data-testid={`button-buffer-${resource}`}>
    <div className="resource-orb"><ResourceIcon resource={resource} size={28} /></div>
    <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-1"><span className="truncate text-[11px] font-bold text-[hsl(var(--foreground))]">{meta.label}</span><ArrowRight size={12} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-1 flex items-baseline gap-1"><span className="mono text-[15px] text-[hsl(var(--foreground))]">{formatNumber(amount)}</span><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">/ {CAPACITY}</span></div><div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${percentage}%`, background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }} /></div></div>
  </button>;
}

function QueueStrip({ queue, onSpeed }: { queue: QueueItem[]; onSpeed: () => void }) {
  return <section className="surface rounded-xl p-4 enter enter-delay-3">
    <div className="flex items-center justify-between"><SectionLabel detail={`${queue.length} active`}>Build queue</SectionLabel><button onClick={onSpeed} className="button-base button-ghost !px-2.5 !py-1.5" data-testid="button-speed-queue"><Timer size={13} /> speed up</button></div>
    {queue.length === 0 ? <div className="flex items-center gap-3 rounded-lg border border-dashed border-[hsl(var(--border))] p-3 text-[11px] text-[hsl(var(--muted-foreground))]"><Hammer size={15} /> Queue clear. Your next build will appear here.</div> : <div className="space-y-2">{queue.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg bg-[hsl(216_24%_10%/.65)] p-2.5" data-testid={`row-queue-${item.id}`}><div className={`grid h-7 w-7 place-items-center rounded-md ${item.kind === 'upgrade' ? 'bg-[hsl(var(--secondary)/.13)] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]'}`}>{item.kind === 'upgrade' ? <TrendingUp size={14} /> : <Hammer size={14} />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-[11px] font-semibold text-[hsl(var(--foreground))]">{item.name}</span><span className="status-tag hidden bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] sm:inline-flex">{item.kind}</span></div><div className="progress-track mt-1.5"><div className="progress-fill amber" style={{ width: `${(1 - item.seconds / item.total) * 100}%` }} /></div></div><span className="mono text-[10px] text-[hsl(var(--primary))]">{formatDuration(item.seconds)}</span></div>)}</div>}
  </section>;
}

function DetailPanel({ unit, resources, onClose, onUpgrade }: { unit: Unit; resources: GameResource; onClose: () => void; onUpgrade: () => void }) {
  const recipe = getRecipe(unit);
  const outputMeta = RESOURCE_META[recipe.output];
  return <div className="surface fixed inset-x-3 bottom-[74px] z-20 max-h-[70dvh] overflow-y-auto rounded-2xl p-5 shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-6 md:top-24 md:w-[330px]" data-testid="panel-unit-detail">
    <div className="flex items-start justify-between"><div><div className="eyebrow">Unit telemetry</div><h2 className="mt-1 text-lg font-extrabold text-[hsl(var(--foreground))]">{unit.name}</h2></div><button className="icon-button !h-8 !w-8" onClick={onClose} aria-label="Close unit details" data-testid="button-close-detail"><X size={15} /></button></div>
    <div className="mt-4 flex items-center justify-between rounded-lg bg-[hsl(216_24%_10%/.7)] p-3"><StatusTag status={unit.status} /><span className="mono text-[11px] text-[hsl(var(--muted-foreground))]">LVL {unit.level}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg border border-[hsl(var(--border))] p-3"><div className="eyebrow">Output</div><div className="mt-2 flex items-center gap-2"><ResourceIcon resource={recipe.output} size={23} /><span className="text-[11px] font-semibold">{outputMeta.label}</span></div><div className="mono mt-2 text-[12px] text-[hsl(var(--secondary))]">+1 / {recipe.cycle}s</div></div><div className="rounded-lg border border-[hsl(var(--border))] p-3"><div className="eyebrow">Lifetime</div><div className="mono mt-3 text-[17px] text-[hsl(var(--foreground))]">{formatNumber(unit.cycles)}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">cycles completed</div></div></div>
    <div className="mt-4"><div className="eyebrow mb-2">Inputs required</div><div className="space-y-2">{Object.entries(recipe.inputs).map(([key, amount]) => <div key={key} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]"><ResourceIcon resource={key as ResourceKey} size={19} />{RESOURCE_META[key as ResourceKey].label}</span><span className={`mono ${resources[key as ResourceKey] < (amount ?? 0) ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`}>{formatNumber(resources[key as ResourceKey])} / {amount}</span></div>)}</div></div>
    <div className="mt-5 flex items-center gap-2"><button className="button-base button-primary flex-1" onClick={onUpgrade} data-testid={`button-upgrade-${unit.id}`}><TrendingUp size={14} /> upgrade · {unit.level + 1}</button><Link href="/tech" className="button-base button-ghost" data-testid="link-detail-tech">tech tree</Link></div>
  </div>;
}

function OfflineSummary({ seconds, produced, onDismiss }: { seconds: number; produced: number; onDismiss: () => void }) {
  if (seconds < 60 || produced < 1) return null;
  return <div className="surface mb-5 flex flex-col gap-4 rounded-xl border-[hsl(var(--secondary)/.35)] bg-[linear-gradient(100deg,hsl(174_35%_17%/.8),hsl(216_25%_14%/.96))] p-4 sm:flex-row sm:items-center sm:justify-between enter" data-testid="status-offline-summary"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]"><RotateCcw size={18} /></div><div><div className="eyebrow text-[hsl(var(--secondary))]">While you were away</div><div className="mt-1 text-[13px] font-bold text-[hsl(var(--foreground))]">{formatDuration(seconds)} of quiet production recovered</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Your network kept working and added <span className="mono text-[hsl(var(--secondary))]">{formatNumber(produced)} items</span> to the buffers.</div></div></div><button onClick={onDismiss} className="button-base button-ghost shrink-0" data-testid="button-dismiss-offline">acknowledge <ArrowRight size={13} /></button></div>;
}

function Overview() {
  const loaded = useMemo(loadGame, []);
  const [game, setGame] = useState<GameState>(loaded.state);
  const [offline, setOffline] = useState({ seconds: loaded.offlineSeconds, produced: loaded.offlineProduced });
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceKey | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setGame((previous) => simulate(previous, 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 550);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const selected = game.units.find((unit) => unit.id === selectedUnit);
  const activeUnits = game.units.filter((unit) => unit.status === 'running').length;
  const runningRate = game.units.reduce((sum, unit) => sum + (unit.status === 'running' ? 60 / getRecipe(unit).cycle : 0), 0);
  const bottleneck = game.units.find((unit) => unit.status === 'starved' || unit.status === 'blocked') ?? game.units[0];
  const resourceRows: ResourceKey[] = ['ironOre', 'copperOre', 'coal', 'stone', 'ironPlate', 'copperPlate', 'gears', 'circuits'];

  const toggleUnit = (id: string) => {
    setGame((previous) => ({ ...previous, units: previous.units.map((unit) => unit.id === id ? { ...unit, paused: !unit.paused, status: unit.paused ? 'running' : 'blocked' } : unit) }));
    setFlash(id);
  };
  const upgradeUnit = (id: string) => {
    setGame((previous) => {
      if (previous.queue.some((item) => item.targetId === id)) return previous;
      const unit = previous.units.find((item) => item.id === id);
      if (!unit) return previous;
      const cost = 10 + unit.level * 5;
      if (previous.resources.ironPlate < cost) return previous;
      return { ...previous, resources: { ...previous.resources, ironPlate: previous.resources.ironPlate - cost }, queue: [...previous.queue, { id: `upgrade-${Date.now()}`, name: `${unit.name} · Mk ${unit.level + 1}`, kind: 'upgrade', targetId: id, seconds: 120, total: 120 }], upgrades: previous.upgrades + 1 };
    });
    setFlash(id);
  };
  const buildSmelter = () => {
    setGame((previous) => {
      if (previous.resources.ironPlate < 12 || previous.resources.stone < 8) return previous;
      const count = previous.units.filter((unit) => unit.kind === 'smelter').length + 1;
      return { ...previous, resources: { ...previous.resources, ironPlate: previous.resources.ironPlate - 12, stone: previous.resources.stone - 8 }, queue: [...previous.queue, { id: `build-${Date.now()}`, name: `Copper Smelter 0${count}`, kind: 'construction', seconds: 60, total: 60 }] };
    });
    setFlash('build');
  };
  const speedQueue = () => setGame((previous) => ({ ...previous, queue: previous.queue.map((item) => ({ ...item, seconds: Math.max(1, item.seconds - 10) })) }));

  return <AppShell><div className="relative mx-auto max-w-[1220px] px-4 pb-28 pt-7 sm:px-6 md:px-8 md:pb-10">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end enter">
      <div><div className="eyebrow flex items-center gap-2 text-[hsl(var(--primary))]"><span className="h-px w-5 bg-[hsl(var(--primary))]" /> Live production network</div><h1 className="mt-2 text-[clamp(1.65rem,4vw,2.5rem)] font-extrabold tracking-[-.04em] text-[hsl(var(--foreground))]">Factory floor</h1><p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">A small line. A clear signal. Make the next bottleneck disappear.</p></div>
      <div className="flex items-center gap-2"><span className="status-tag tag-running"><span className="status-dot status-running mini-pulse" /> line online</span><span className="mono hidden text-[10px] text-[hsl(var(--muted-foreground))] sm:inline">T+ 04:18:32</span></div>
    </div>
    <OfflineSummary seconds={offline.seconds} produced={offline.produced} onDismiss={() => setOffline({ seconds: 0, produced: 0 })} />
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 enter enter-delay-1">
      {[{ label: 'Throughput', value: `${runningRate.toFixed(1)}`, suffix: 'items / min', icon: TrendingUp, color: 'text-[hsl(var(--secondary))]' }, { label: 'Active units', value: `${activeUnits}`, suffix: `/ ${game.units.length} online`, icon: Activity, color: 'text-[#83d993]' }, { label: 'Total produced', value: formatNumber(game.totalProduced), suffix: 'lifetime items', icon: Package, color: 'text-[hsl(var(--primary))]' }, { label: 'Power draw', value: '62', suffix: 'kW · stable', icon: Zap, color: 'text-[hsl(var(--primary))]' }].map(({ label, value, suffix, icon: Icon, color }) => <div key={label} className="surface rounded-xl p-3.5"><div className={`mb-2 flex items-center gap-2 ${color}`}><Icon size={14} /><span className="eyebrow">{label}</span></div><div className="mono text-[19px] text-[hsl(var(--foreground))]">{value} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{suffix}</span></div></div>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.75fr)]">
      <div className="min-w-0 space-y-5">
        <section className="surface rounded-xl p-4 sm:p-5 enter enter-delay-2">
          <div className="flex items-center justify-between"><SectionLabel detail={`${game.units.length} units`}>Production units</SectionLabel><button onClick={buildSmelter} className="button-base button-primary !px-2.5 !py-1.5" data-testid="button-build-smelter"><Plus size={14} /> build smelter</button></div>
          <div className="grid gap-2.5 sm:grid-cols-2">{game.units.map((unit) => <UnitCard key={unit.id} unit={unit} selected={selectedUnit === unit.id} onSelect={() => setSelectedUnit(unit.id)} onToggle={() => toggleUnit(unit.id)} />)}</div>
        </section>
        <QueueStrip queue={game.queue} onSpeed={speedQueue} />
      </div>
      <div className="space-y-5">
        <section className="surface rounded-xl p-4 sm:p-5 enter enter-delay-2">
          <div className="flex items-center justify-between"><SectionLabel detail={`${formatNumber(Object.values(game.resources).reduce((a, b) => a + b, 0))} items`}>Storage buffers</SectionLabel><span className="status-tag tag-running"><Box size={11} /> {CAPACITY} max / bin</span></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">{resourceRows.map((resource) => <BufferCard key={resource} resource={resource} amount={game.resources[resource]} onSelect={() => setSelectedResource(resource)} />)}</div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-[hsl(var(--border))] p-3"><div className="flex items-center gap-2"><ResourceIcon resource="science" size={20} /><span className="text-[11px] font-semibold">Science packs</span></div><span className="mono text-[12px] text-[hsl(var(--destructive))]">{formatNumber(game.resources.science)} <span className="text-[9px] text-[hsl(var(--muted-foreground))]">stored</span></span></div>
        </section>
        <section className="surface rounded-xl border-[hsl(var(--primary)/.25)] bg-[linear-gradient(145deg,hsl(39_50%_13%/.8),hsl(216_25%_14%/.95))] p-4 sm:p-5 enter enter-delay-3" data-testid="card-bottleneck-recommendation">
          <div className="flex items-start justify-between"><div className="flex items-center gap-2 text-[hsl(var(--primary))]"><Lightbulb size={16} /><span className="eyebrow text-[hsl(var(--primary))]">Recommended move</span></div><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">SIGNAL 04</span></div>
          <h2 className="mt-3 text-[15px] font-extrabold text-[hsl(var(--foreground))]">{bottleneck.status === 'blocked' ? 'Clear the output buffer' : 'Feed the assembly bench'}</h2>
          <p className="mt-1.5 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{bottleneck.status === 'blocked' ? `${bottleneck.name} cannot unload its output. Expand storage or redirect the line.` : `${bottleneck.name} is waiting on copper plates. Copper Smelter 02 will close the gap.`}</p>
          <div className="mt-4 flex items-center gap-2"><button onClick={() => bottleneck && setSelectedUnit(bottleneck.id)} className="button-base button-primary" data-testid="button-follow-recommendation">inspect bottleneck <ArrowRight size={13} /></button><Link href="/tech" className="button-base button-ghost" data-testid="link-recommendation-tech">dependencies</Link></div>
        </section>
        <section className="grid-lines overflow-hidden rounded-xl border border-[hsl(var(--border))] p-4 sm:p-5"><div className="flex items-center justify-between"><SectionLabel detail="last 60 seconds">Network pulse</SectionLabel><Gauge size={15} className="text-[hsl(var(--secondary))]" /></div><div className="flex h-16 items-end gap-1.5 pt-2">{[24,32,29,39,46,40,52,48,62,58,67,64,73,69,78,76,83,80,87,91].map((height, index) => <div key={index} className="flex-1 rounded-t-sm bg-[hsl(var(--secondary)/.48)] transition-all" style={{ height: `${height}%`, opacity: index > 16 ? .9 : .55 }} />)}</div><div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>-60s</span><span>now · {runningRate.toFixed(1)} items/min</span></div></section>
      </div>
    </div>
    {selected && <DetailPanel unit={selected} resources={game.resources} onClose={() => setSelectedUnit(null)} onUpgrade={() => upgradeUnit(selected.id)} />}
    {selectedResource && <div className="surface fixed inset-x-3 bottom-[74px] z-20 rounded-2xl p-5 md:bottom-6 md:left-auto md:right-6 md:w-[300px]" data-testid="panel-buffer-detail"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><ResourceIcon resource={selectedResource} size={32} /><div><div className="eyebrow">{RESOURCE_META[selectedResource].category}</div><h2 className="mt-1 text-base font-extrabold">{RESOURCE_META[selectedResource].label}</h2></div></div><button className="icon-button !h-8 !w-8" onClick={() => setSelectedResource(null)} aria-label="Close buffer details" data-testid="button-close-buffer"><X size={15} /></button></div><div className="mt-5 flex items-end justify-between"><span className="eyebrow">Current buffer</span><span className="mono text-2xl text-[hsl(var(--foreground))]">{formatNumber(game.resources[selectedResource])}<span className="text-[10px] text-[hsl(var(--muted-foreground))]"> / {CAPACITY}</span></span></div><div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${game.resources[selectedResource] / CAPACITY * 100}%`, background: RESOURCE_META[selectedResource].color }} /></div><div className="mt-4 flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]"><span>Produced this session</span><span className="mono text-[hsl(var(--secondary))]">tracking live</span></div></div>}
    {flash && <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[hsl(var(--primary)/.35)] bg-[hsl(216_25%_13%/.96)] px-4 py-2 mono text-[10px] text-[hsl(var(--primary))] shadow-xl flash">{flash === 'build' ? 'construction queued' : 'control signal sent'}</div>}
  </div></AppShell>;
}

const techData: { id: TechKey; name: string; description: string; cost: number; requires: TechKey[]; icon: typeof Pickaxe; state: 'unlocked' | 'available' | 'locked' }[] = [
  { id: 'mechanizedMining', name: 'Mechanized mining', description: 'Increase ore extraction speed and unlock deeper buffers.', cost: 0, requires: [], icon: Pickaxe, state: 'unlocked' },
  { id: 'heatTreatment', name: 'Heat treatment', description: 'Raise smelter throughput by 18% with better thermal cycling.', cost: 12, requires: ['mechanizedMining'], icon: Gauge, state: 'available' },
  { id: 'precisionAssembly', name: 'Precision assembly', description: 'Gear presses consume less plate and hold a tighter cycle.', cost: 18, requires: ['heatTreatment'], icon: Cog, state: 'locked' },
  { id: 'signalLogic', name: 'Signal logic', description: 'Route circuit priorities automatically around full buffers.', cost: 26, requires: ['precisionAssembly'], icon: Cpu, state: 'locked' },
  { id: 'logistics', name: 'Long-haul logistics', description: 'Connect distant production blocks to one responsive network.', cost: 34, requires: ['signalLogic'], icon: ArrowDownRight, state: 'locked' },
];

function TechView() {
  const [game, setGame] = useState<GameState>(() => loadGame().state);
  const [selectedTech, setSelectedTech] = useState<TechKey>('heatTreatment');
  const [notice, setNotice] = useState('');
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(game)), [game]);
  const science = game.resources.science;
  const unlock = (id: TechKey) => {
    const node = techData.find((tech) => tech.id === id);
    if (!node || node.state === 'unlocked' || science < node.cost || node.requires.some((req) => !game.unlockedTech.includes(req))) return;
    setGame((previous) => ({ ...previous, resources: { ...previous.resources, science: previous.resources.science - node.cost }, unlockedTech: [...previous.unlockedTech, id] }));
    setNotice(`${node.name} online`);
    window.setTimeout(() => setNotice(''), 2200);
  };
  return <AppShell><div className="mx-auto max-w-[1120px] px-4 pb-28 pt-7 sm:px-6 md:px-8 md:pb-10">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end enter"><div><div className="eyebrow flex items-center gap-2 text-[hsl(var(--secondary))]"><span className="h-px w-5 bg-[hsl(var(--secondary))]" /> Research and progression</div><h1 className="mt-2 text-[clamp(1.65rem,4vw,2.5rem)] font-extrabold tracking-[-.04em]">Technology map</h1><p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">Every breakthrough should answer a constraint on the floor.</p></div><div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(216_24%_12%/.8)] px-3 py-2"><ResourceIcon resource="science" size={25} /><div><div className="eyebrow">Research bank</div><div className="mono mt-0.5 text-[15px] text-[hsl(var(--foreground))]">{formatNumber(science)} <span className="text-[10px] text-[hsl(var(--muted-foreground))]">science packs</span></div></div></div></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
      <section className="surface overflow-hidden rounded-xl p-4 sm:p-6 enter enter-delay-1"><div className="mb-7 flex items-center justify-between"><SectionLabel detail={`${game.unlockedTech.length} / ${techData.length} online`}>Development route</SectionLabel><span className="status-tag tag-running"><Sparkles size={11} /> frontier</span></div><div className="relative space-y-3 before:absolute before:bottom-6 before:left-[25px] before:top-6 before:w-px before:bg-[hsl(var(--border))]">{techData.map((tech, index) => { const Icon = tech.icon; const unlocked = game.unlockedTech.includes(tech.id); const available = !unlocked && tech.requires.every((req) => game.unlockedTech.includes(req)); return <button key={tech.id} onClick={() => setSelectedTech(tech.id)} className={`relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors sm:gap-4 sm:p-4 ${selectedTech === tech.id ? 'border-[hsl(var(--secondary)/.65)] bg-[hsl(174_30%_16%/.7)]' : 'border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.45)]'} ${!unlocked && !available ? 'opacity-60' : ''}`} data-testid={`button-tech-${tech.id}`}><div className={`relative z-10 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg border ${unlocked ? 'border-[hsl(var(--secondary)/.6)] bg-[hsl(var(--secondary)/.13)] text-[hsl(var(--secondary))]' : available ? 'border-[hsl(var(--primary)/.6)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] bg-[hsl(216_25%_10%)] text-[hsl(var(--muted-foreground))]'}`}>{unlocked ? <Icon size={16} /> : available ? <Icon size={16} /> : <LockKeyhole size={15} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-bold sm:text-[13px]">{tech.name}</span><span className={`status-tag ${unlocked ? 'tag-running' : available ? 'tag-starved' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{unlocked ? 'online' : available ? 'researchable' : `phase ${index + 1}`}</span></div><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{tech.description}</p></div><ChevronRight size={15} className="shrink-0 text-[hsl(var(--muted-foreground))]" /></button>})}</div></section>
      <aside className="surface h-fit rounded-xl p-5 enter enter-delay-2"><div className="eyebrow">Selected node</div>{(() => { const tech = techData.find((item) => item.id === selectedTech)!; const unlocked = game.unlockedTech.includes(tech.id); const available = tech.requires.every((req) => game.unlockedTech.includes(req)); const Icon = tech.icon; return <><div className="mt-4 grid h-12 w-12 place-items-center rounded-xl border border-[hsl(var(--secondary)/.5)] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]"><Icon size={22} /></div><h2 className="mt-4 text-lg font-extrabold">{tech.name}</h2><p className="mt-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{tech.description}</p><div className="mt-5 space-y-3 border-y border-[hsl(var(--border))] py-4"><div className="flex items-center justify-between text-[11px]"><span className="text-[hsl(var(--muted-foreground))]">Research cost</span><span className="flex items-center gap-1.5 mono text-[hsl(var(--foreground))]"><ResourceIcon resource="science" size={16} /> {tech.cost || 'complete'}</span></div><div className="flex items-center justify-between text-[11px]"><span className="text-[hsl(var(--muted-foreground))]">Dependencies</span><span className="mono text-[hsl(var(--foreground))]">{tech.requires.length ? tech.requires.length : 'none'}</span></div></div><button onClick={() => unlock(tech.id)} disabled={unlocked || !available || science < tech.cost} className={`button-base mt-5 w-full ${unlocked ? 'button-ghost' : 'button-primary'} disabled:cursor-not-allowed disabled:opacity-45`} data-testid={`button-unlock-${tech.id}`}>{unlocked ? <><Activity size={14} /> research complete</> : !available ? <><LockKeyhole size={14} /> dependency locked</> : <><FlaskConical size={14} /> unlock technology</>}</button><Link href="/" className="mt-2 flex items-center justify-center gap-1 py-2 text-[10px] font-bold text-[hsl(var(--muted-foreground))] no-underline hover:text-[hsl(var(--foreground))]" data-testid="link-back-floor">back to floor <ArrowRight size={12} /></Link></>})()}</aside>
    </div>
    <section className="mt-5 grid gap-3 sm:grid-cols-3"><div className="surface-soft rounded-xl p-4"><div className="eyebrow">Next constraint</div><div className="mt-2 flex items-center gap-2 text-[12px] font-bold"><TriangleAlert size={15} className="text-[hsl(var(--primary))]" /> copper refining</div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">One upgrade clears two downstream waits.</p></div><div className="surface-soft rounded-xl p-4"><div className="eyebrow">Research velocity</div><div className="mt-2 mono text-[16px]">0.0 <span className="text-[10px] text-[hsl(var(--muted-foreground))]">packs / min</span></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Bring the lab online to begin.</p></div><div className="surface-soft rounded-xl p-4"><div className="eyebrow">Network reach</div><div className="mt-2 mono text-[16px]">04 <span className="text-[10px] text-[hsl(var(--muted-foreground))]">production tiers</span></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Raw material to research.</p></div></section>
    {notice && <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[hsl(var(--secondary)/.45)] bg-[hsl(216_25%_13%/.96)] px-4 py-2 mono text-[10px] text-[hsl(var(--secondary))] shadow-xl md:bottom-6">{notice}</div>}
  </div></AppShell>;
}

function NotFoundView() {
  return <AppShell><div className="mx-auto flex min-h-[70dvh] max-w-lg flex-col items-center justify-center px-6 text-center"><CircleHelp size={36} className="text-[hsl(var(--primary))]" /><h1 className="mt-5 text-2xl font-extrabold">Signal not found</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">That control room route does not exist in this sector.</p><Link href="/" className="button-base button-primary mt-6" data-testid="link-return-floor">return to factory floor</Link></div></AppShell>;
}

function App() {
  return <Switch><Route path="/" component={Overview} /><Route path="/tech" component={TechView} /><Route component={NotFoundView} /></Switch>;
}

export default App;