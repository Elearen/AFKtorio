import type { RecipeCatalogEntry } from './recipeCatalog.js';

export const assemblyMachineOneCraftingSpeed = 0.5;
export const oilRefineryCraftingSpeed = 1;
export const oilRefineryPowerKw = 420;
export const chemicalPlantCraftingSpeed = 1;
export const chemicalPlantPowerKw = 210;
export const chemicalPlantRecipeNames = [
  'light-oil-cracking',
  'plastic-bar',
  'heavy-oil-cracking',
  'sulfur',
  'sulfuric-acid',
  'lubricant',
  'solid-fuel',
  'rocket-fuel',
  'battery',
  'explosives',
] as const;
const chemicalPlantRecipeNameSet = new Set<string>(chemicalPlantRecipeNames);
export const stoneFurnaceCraftingSpeed = 1;
export const steelFurnaceCraftingSpeed = 2;

export const isAutomatedOnlyRecipe = (recipe: Pick<RecipeCatalogEntry, 'name' | 'category'>) =>
  recipe.category === 'smelting'
  || recipe.category === 'crafting-with-fluid'
  || recipe.name === 'basic-oil-processing'
  || recipe.name === 'advanced-oil-processing'
  || chemicalPlantRecipeNameSet.has(recipe.name)
  || recipe.name === 'space-science-pack';

export const craftingSpeedFor = (
  isSmelting: boolean,
  assemblyCraftingSpeed: number,
  furnaceCraftingSpeed = stoneFurnaceCraftingSpeed,
) => isSmelting ? furnaceCraftingSpeed : assemblyCraftingSpeed;

export const cyclesPerMinuteFor = (
  machineCount: number,
  simulationSpeed: number,
  recipeSeconds: number,
  craftingSpeed: number,
) => machineCount * 60 * simulationSpeed * craftingSpeed / recipeSeconds;

export const cycleBudgetFor = (cycleRatePerMinute: number, seconds: number) =>
  Math.max(1, Math.ceil(cycleRatePerMinute * seconds / 60) + 1);