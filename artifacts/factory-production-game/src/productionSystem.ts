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
export const stoneFurnaceCraftingSpeed = 1;
export const steelFurnaceCraftingSpeed = 2;

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