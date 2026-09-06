export type StorageState = {
  storage: Record<string, number>;
  storageBoxes: Record<string, number>;
  storageTanks: Record<string, number>;
};

export type StorageBoxType = 'wooden' | 'iron' | 'steel';
export const FLUID_STORAGE_BASE_CAPACITY = 100;
export const STORAGE_BOX_CAPACITY = 180;
export const SPACE_SCIENCE_STORAGE_CAPACITY = 1000;
export const STORAGE_IRON_BOX_CAPACITY = 400;
export const STORAGE_IRON_BOX_COST = 8;
export const STORAGE_IRON_BOX_UPGRADE_TIME = 0.5;
export const STORAGE_STEEL_BOX_CAPACITY = STORAGE_IRON_BOX_CAPACITY;
export const STORAGE_STEEL_BOX_COST = 8;
export const STORAGE_STEEL_BOX_UPGRADE_TIME = 0.5;
export const STORAGE_TANK_CAPACITY = 25_000;
export const FLUID_HANDLING_TECHNOLOGY = 'fluid-handling';

export const itemStorageBoxCountFor = (
  trackedKeys: readonly string[],
  fluidKeys: ReadonlySet<string>,
  storageBoxes: Record<string, number>,
) => trackedKeys.reduce((total, key) => total + (fluidKeys.has(key) ? 0 : (storageBoxes[key] ?? 0)), 0);

export const ironChestUpgradeCostFor = (woodenChestCount: number) => woodenChestCount * STORAGE_IRON_BOX_COST;
export const ironChestUpgradeTimeFor = (woodenChestCount: number) => woodenChestCount * STORAGE_IRON_BOX_UPGRADE_TIME;
export const steelChestUpgradeCostFor = (ironChestCount: number) => ironChestCount * STORAGE_STEEL_BOX_COST;
export const steelChestUpgradeTimeFor = (ironChestCount: number) => ironChestCount * STORAGE_STEEL_BOX_UPGRADE_TIME;

export const storageContainerCountFor = (
  key: string,
  fluidKeys: ReadonlySet<string>,
  storageBoxes: Record<string, number>,
  storageTanks: Record<string, number>,
) => fluidKeys.has(key) ? (storageTanks[key] ?? 0) : (storageBoxes[key] ?? 1);

export const storageCapacityFor = (
  key: string,
  fluidKeys: ReadonlySet<string>,
  storageBoxes: Record<string, number>,
  storageTanks: Record<string, number>,
  boxCapacity = STORAGE_BOX_CAPACITY,
) => fluidKeys.has(key)
  ? FLUID_STORAGE_BASE_CAPACITY + storageContainerCountFor(key, fluidKeys, storageBoxes, storageTanks) * STORAGE_TANK_CAPACITY
  : storageContainerCountFor(key, fluidKeys, storageBoxes, storageTanks) * (key === 'spacePack' ? SPACE_SCIENCE_STORAGE_CAPACITY : boxCapacity);

export const canPurchaseStorageFor = (key: string, fluidKeys: ReadonlySet<string>, research: readonly string[]) =>
  !fluidKeys.has(key) || research.includes(FLUID_HANDLING_TECHNOLOGY);

export const createInitialStorageState = (trackedKeys: readonly string[], fluidKeys: ReadonlySet<string>): StorageState => ({
  storage: Object.fromEntries(trackedKeys.map((key) => [key, fluidKeys.has(key) ? FLUID_STORAGE_BASE_CAPACITY : key === 'spacePack' ? SPACE_SCIENCE_STORAGE_CAPACITY : STORAGE_BOX_CAPACITY])),
  storageBoxes: Object.fromEntries(trackedKeys.map((key) => [key, fluidKeys.has(key) ? 0 : 1])),
  storageTanks: Object.fromEntries(trackedKeys.map((key) => [key, 0])),
});

export const completeStorageConstruction = (
  current: StorageState,
  key: string,
  fluidKeys: ReadonlySet<string>,
  boxCapacity = STORAGE_BOX_CAPACITY,
): StorageState => {
  const next: StorageState = {
    storage: { ...current.storage },
    storageBoxes: { ...current.storageBoxes },
    storageTanks: { ...current.storageTanks },
  };
  if (fluidKeys.has(key)) next.storageTanks[key] = (next.storageTanks[key] ?? 0) + 1;
  else next.storageBoxes[key] = (next.storageBoxes[key] ?? 1) + 1;
  next.storage[key] = storageCapacityFor(key, fluidKeys, next.storageBoxes, next.storageTanks, boxCapacity);
  return next;
};

export const migrateStorageState = ({
  trackedKeys,
  fluidKeys,
  savedStorage,
  savedBoxes,
  savedTanks,
  boxCapacity = STORAGE_BOX_CAPACITY,
}: {
  trackedKeys: readonly string[];
  fluidKeys: ReadonlySet<string>;
  savedStorage?: Record<string, number>;
  savedBoxes?: Record<string, number>;
  savedTanks?: Record<string, number>;
  boxCapacity?: number;
}): StorageState => {
  const storageBoxes: Record<string, number> = {};
  const storageTanks: Record<string, number> = {};
  trackedKeys.forEach((key) => {
    if (fluidKeys.has(key)) {
      storageBoxes[key] = 0;
      storageTanks[key] = Math.max(0, Math.floor(savedTanks?.[key] ?? 0));
    } else {
      const savedBoxCount = savedBoxes?.[key];
      const savedCapacity = savedStorage?.[key] ?? STORAGE_BOX_CAPACITY;
      storageBoxes[key] = typeof savedBoxCount === 'number'
        ? Math.max(1, Math.floor(savedBoxCount))
        : Math.max(1, Math.ceil(savedCapacity / STORAGE_BOX_CAPACITY));
      storageTanks[key] = 0;
    }
  });
  const storage = Object.fromEntries(trackedKeys.map((key) => [
    key,
    storageCapacityFor(key, fluidKeys, storageBoxes, storageTanks, boxCapacity),
  ]));
  return { storage, storageBoxes, storageTanks };
};