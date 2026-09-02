import type { BuildMaterialCost } from './upgradeSystem.js';

export type ConstructionInventory = {
  raw: Record<string, number>;
  products: Record<string, number>;
};

export type ConstructionQueueItem = {
  action: string;
  seconds: number;
  total: number;
  costs?: BuildMaterialCost[];
  reserved?: number[];
  started?: boolean;
};

const EPSILON = 0.000001;
const isBuildMaterialCost = (value: unknown): value is BuildMaterialCost => {
  if (!value || typeof value !== 'object') return false;
  const cost = value as Partial<BuildMaterialCost>;
  return typeof cost.key === 'string'
    && typeof cost.amount === 'number'
    && Number.isFinite(cost.amount)
    && cost.amount >= 0
    && (cost.source === 'raw' || cost.source === 'products');
};

export const constructionRequestReady = (item: ConstructionQueueItem) =>
  !item.costs?.length || item.costs.every((cost, index) => (item.reserved?.[index] ?? 0) >= cost.amount - EPSILON);

export const normalizeConstructionQueue = <T extends ConstructionQueueItem>(queue: T[]) =>
  queue.map((item) => {
    const costs = Array.isArray(item.costs) ? item.costs.filter(isBuildMaterialCost).map((cost) => ({ ...cost })) : undefined;
    if (!costs?.length) return { ...item, costs: undefined, reserved: undefined };
    const reserved = costs.map((cost, index) => {
      const savedAmount = item.reserved?.[index] ?? 0;
      return Math.min(cost.amount, Math.max(0, Number.isFinite(savedAmount) ? savedAmount : 0));
    });
    const fullyFunded = reserved.every((amount, index) => amount >= costs[index].amount - EPSILON);
    return {
      ...item,
      costs,
      reserved,
      started: item.started === false ? false : item.started === true ? true : fullyFunded,
    };
  });

export const reserveConstructionMaterials = (
  inventory: ConstructionInventory,
  costs: BuildMaterialCost[],
  reserved: number[] = [],
) => {
  const nextReserved = costs.map((cost, index) => {
    const alreadyReserved = Math.max(0, reserved[index] ?? 0);
    const remaining = Math.max(0, cost.amount - alreadyReserved);
    const available = Math.max(0, inventory[cost.source][cost.key] ?? 0);
    const amount = Math.min(remaining, available);
    if (amount > 0) inventory[cost.source][cost.key] -= amount;
    return alreadyReserved + amount;
  });
  return nextReserved;
};

export const activateReadyConstruction = (queue: ConstructionQueueItem[]) => {
  queue.forEach((item) => {
    if (item.action === 'upgrade' || item.started || !item.costs?.length || !constructionRequestReady(item)) return;
    item.started = true;
    item.seconds = item.total;
  });
};

export const fulfillConstructionReservation = (
  queue: ConstructionQueueItem[],
  key: string,
  amount: number,
  source: BuildMaterialCost['source'],
) => {
  let remaining = amount;
  queue.forEach((item) => {
    const costs = item.costs;
    if (remaining <= 0 || item.action === 'upgrade' || item.started || !costs?.length) return;
    costs.forEach((cost, index) => {
      if (remaining <= 0 || cost.source !== source || cost.key !== key) return;
      const reserved = item.reserved?.[index] ?? 0;
      const needed = Math.max(0, cost.amount - reserved);
      const reservedNow = Math.min(needed, remaining);
      if (reservedNow <= 0) return;
      if (!item.reserved) item.reserved = costs.map(() => 0);
      item.reserved[index] = reserved + reservedNow;
      remaining -= reservedNow;
    });
    if (constructionRequestReady(item)) {
      item.started = true;
      item.seconds = item.total;
    }
  });
  return amount - remaining;
};