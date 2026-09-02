export const assemblyMachineOneCraftingSpeed = 0.5;
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