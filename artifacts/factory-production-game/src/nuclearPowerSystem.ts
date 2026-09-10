export type NuclearPowerFlowInput = {
  nuclearReactors: number;
  heatExchangers: number;
  steamTurbines: number;
  uraniumFuelCells: number;
  water: number;
  seconds: number;
  simulationSpeed: number;
  nuclearPowerUnlocked: boolean;
  fuelCellPerSecond: number;
  heatPerReactorPerSecond: number;
  heatPerExchangerPerSecond: number;
  waterPerExchangerPerSecond: number;
  nuclearSteamPerExchangerPerSecond: number;
  steamPerTurbinePerSecond: number;
  turbinePowerMw: number;
};

export type NuclearPowerFlow = {
  fuelCellDemand: number;
  fuelCellsConsumed: number;
  reactorFuelRatio: number;
  heatProduced: number;
  heatDemand: number;
  heatConsumed: number;
  heatSupplyRatio: number;
  waterDemand: number;
  waterConsumed: number;
  waterSupplyRatio: number;
  nuclearSteamProduced: number;
  nuclearSteamDemand: number;
  nuclearSteamConsumed: number;
  turbineRatio: number;
  powerGeneratedMw: number;
};

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

export const calculateNuclearPowerFlow = (input: NuclearPowerFlowInput): NuclearPowerFlow => {
  const seconds = Math.max(0, input.seconds);
  const speed = Math.max(0, input.simulationSpeed);
  const enabled = input.nuclearPowerUnlocked;
  const reactorMultiplier = enabled ? Math.max(0, input.nuclearReactors) * speed : 0;
  const exchangerMultiplier = enabled ? Math.max(0, input.heatExchangers) * speed : 0;
  const turbineMultiplier = enabled ? Math.max(0, input.steamTurbines) * speed : 0;

  const fuelCellDemand = reactorMultiplier * Math.max(0, input.fuelCellPerSecond) * seconds;
  const reactorFuelRatio = fuelCellDemand > 0
    ? clampRatio(input.uraniumFuelCells / fuelCellDemand)
    : 0;
  const fuelCellsConsumed = fuelCellDemand * reactorFuelRatio;
  const heatProduced = reactorMultiplier * Math.max(0, input.heatPerReactorPerSecond) * seconds * reactorFuelRatio;

  const heatDemand = exchangerMultiplier * Math.max(0, input.heatPerExchangerPerSecond) * seconds;
  const heatSupplyRatio = heatDemand > 0 ? clampRatio(heatProduced / heatDemand) : 0;
  const waterDemand = exchangerMultiplier * Math.max(0, input.waterPerExchangerPerSecond) * seconds;
  const waterSupplyRatio = waterDemand > 0 ? clampRatio(input.water / waterDemand) : 0;
  const exchangerRatio = Math.min(heatSupplyRatio, waterSupplyRatio);
  const heatConsumed = heatDemand * exchangerRatio;
  const waterConsumed = waterDemand * exchangerRatio;
  const nuclearSteamProduced = exchangerMultiplier * Math.max(0, input.nuclearSteamPerExchangerPerSecond) * seconds * exchangerRatio;

  const nuclearSteamDemand = turbineMultiplier * Math.max(0, input.steamPerTurbinePerSecond) * seconds;
  const turbineRatio = nuclearSteamDemand > 0 ? clampRatio(nuclearSteamProduced / nuclearSteamDemand) : 0;
  const nuclearSteamConsumed = nuclearSteamDemand * turbineRatio;
  const powerGeneratedMw = turbineMultiplier * Math.max(0, input.turbinePowerMw) * seconds * turbineRatio;

  return {
    fuelCellDemand,
    fuelCellsConsumed,
    reactorFuelRatio,
    heatProduced,
    heatDemand,
    heatConsumed,
    heatSupplyRatio,
    waterDemand,
    waterConsumed,
    waterSupplyRatio,
    nuclearSteamProduced,
    nuclearSteamDemand,
    nuclearSteamConsumed,
    turbineRatio,
    powerGeneratedMw,
  };
};