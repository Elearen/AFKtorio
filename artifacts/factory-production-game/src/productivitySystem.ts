export type RecipeProductivity = Record<string, number>;
export type RecipeSpeed = Record<string, number>;
const miningProductivityResearchPattern = /^mining-productivity-\d+$/;

const finiteNonNegativeNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

export const recipeProductivityBonusFor = (
  productivity: RecipeProductivity | undefined,
  recipeName: string,
) => finiteNonNegativeNumber(productivity?.[recipeName]);

export const recipeProductivityMultiplierFor = (
  productivity: RecipeProductivity | undefined,
  recipeName: string,
) => 1 + recipeProductivityBonusFor(productivity, recipeName);

export const productiveOutputAmountFor = (
  amount: number,
  productivity: RecipeProductivity | undefined,
  recipeName: string,
) => amount * recipeProductivityMultiplierFor(productivity, recipeName);

export const normalizeRecipeProductivity = (
  saved: unknown,
  recipeNames: ReadonlySet<string>,
): RecipeProductivity => {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
  return Object.fromEntries(
    Object.entries(saved)
      .filter(([recipeName, value]) => recipeNames.has(recipeName) && finiteNonNegativeNumber(value) === value)
      .map(([recipeName, value]) => [recipeName, finiteNonNegativeNumber(value)]),
  );
};

export const recipeSpeedBonusFor = (
  speed: RecipeSpeed | undefined,
  recipeName: string,
) => finiteNonNegativeNumber(speed?.[recipeName]);

export const recipeSpeedMultiplierFor = (
  speed: RecipeSpeed | undefined,
  recipeName: string,
) => 1 + recipeSpeedBonusFor(speed, recipeName);

export const effectiveRecipeSecondsFor = (
  seconds: number,
  speed: RecipeSpeed | undefined,
  recipeName: string,
) => seconds / recipeSpeedMultiplierFor(speed, recipeName);

export const normalizeRecipeSpeed = (
  saved: unknown,
  recipeNames: ReadonlySet<string>,
): RecipeSpeed => {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
  return Object.fromEntries(
    Object.entries(saved)
      .filter(([recipeName, value]) => recipeNames.has(recipeName) && finiteNonNegativeNumber(value) === value)
      .map(([recipeName, value]) => [recipeName, finiteNonNegativeNumber(value)]),
  );
};

export const miningProductivityBonusFor = (research: readonly string[]) =>
  new Set(research.filter((technology) => miningProductivityResearchPattern.test(technology))).size * 0.1;

export const miningProductivityMultiplierFor = (
  resourceKey: string,
  research: readonly string[],
) => resourceKey === 'water' ? 1 : 1 + miningProductivityBonusFor(research);