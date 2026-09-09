import type { RecipeCatalogEntry } from './recipeCatalog.js';

export const ROCKET_PART_TARGET = 100;

export type RocketBuildCost = {
  key: string;
  amount: number;
  source: 'raw' | 'products';
};

export const recipeBuildCostsForRocket = (recipe: RecipeCatalogEntry): RocketBuildCost[] => {
  const totals = new Map<string, number>();
  recipe.ingredients.forEach((ingredient) => {
    const amount = ingredient.amount ?? ((ingredient.amountMin ?? 0) + (ingredient.amountMax ?? ingredient.amountMin ?? 0)) / 2;
    const key = ingredient.name === 'iron-ore' ? 'iron'
      : ingredient.name === 'copper-ore' ? 'copper'
        : ingredient.name === 'stone' ? 'stone'
          : ingredient.name === 'coal' ? 'coal'
            : ingredient.name === 'wood' ? 'wood'
              : ingredient.name === 'water' ? 'water'
                : ingredient.name === 'uranium-ore' ? 'uranium'
                  : ingredient.name === 'crude-oil' ? 'crudeOil'
                    : ingredient.name === 'iron-plate' ? 'ironPlate'
                      : ingredient.name === 'copper-plate' ? 'copperPlate'
                        : ingredient.name === 'steel-plate' ? 'steel'
                          : ingredient.name === 'iron-gear-wheel' ? 'gear'
                            : ingredient.name === 'electronic-circuit' ? 'circuit'
                              : ingredient.name;
    totals.set(key, (totals.get(key) ?? 0) + amount);
  });
  return [...totals.entries()].map(([key, amount]) => ({
    key,
    amount,
    source: ['iron', 'copper', 'stone', 'coal', 'wood', 'water', 'uranium', 'crudeOil'].includes(key) ? 'raw' : 'products',
  }));
};

export const scaleRocketCosts = (costs: RocketBuildCost[], multiplier: number): RocketBuildCost[] =>
  costs.map((cost) => ({ ...cost, amount: cost.amount * multiplier }));

export const rocketPartBatchTimeFor = (recipe: RecipeCatalogEntry, count = ROCKET_PART_TARGET) =>
  recipe.energyRequired * count;

export const canBuildRocketSilo = (siloBuilt: boolean, siloQueued: boolean) => !siloBuilt && !siloQueued;

export const rocketPartCountAfterConstruction = (current: number, constructed: number) =>
  Math.min(ROCKET_PART_TARGET, Math.max(0, current) + Math.max(0, constructed));

export const unlockSpaceScienceAfterLaunch = (research: string[]) =>
  Array.from(new Set([...research, 'space-science-pack']));

export const spaceScienceRecipeMachineCountAfterUnlock = (currentCount: number) =>
  Math.max(1, Math.floor(Number.isFinite(currentCount) ? currentCount : 0));

export const queueSpaceScienceNotification = (notifications: string[]) =>
  notifications.includes('space-science-pack') ? notifications : [...notifications, 'space-science-pack'];