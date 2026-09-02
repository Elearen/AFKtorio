export const assemblyMachineOneCraftingSpeed = 0.5;
export const stoneFurnaceCraftingSpeed = 1;

export const craftingSpeedFor = (isSmelting: boolean, assemblyCraftingSpeed: number) =>
  isSmelting ? stoneFurnaceCraftingSpeed : assemblyCraftingSpeed;

export const cyclesPerMinuteFor = (
  machineCount: number,
  simulationSpeed: number,
  recipeSeconds: number,
  craftingSpeed: number,
) => machineCount * 60 * simulationSpeed * craftingSpeed / recipeSeconds;