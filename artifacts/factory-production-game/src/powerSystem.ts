export type PowerFlowInput = {
  boilers: number;
  steamEngines: number;
  coal: number;
  water: number;
  seconds: number;
  simulationSpeed: number;
  boilersEnabled: boolean;
  steamPowerUnlocked: boolean;
  boilerSteamPerSecond: number;
  boilerCoalPerSecond: number;
  boilerWaterPerSecond: number;
  steamEngineSteamPerSecond: number;
  steamEnginePowerMw: number;
};

export type PowerFlow = {
  boilerInputRatio: number;
  boilerCoalRatio: number;
  boilerWaterRatio: number;
  boilerCoalDemand: number;
  boilerWaterDemand: number;
  boilerCoalConsumed: number;
  boilerWaterConsumed: number;
  steamProduced: number;
  steamDemand: number;
  steamConsumed: number;
  steamEngineRatio: number;
  powerGeneratedMw: number;
};

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

export const calculatePowerFlow = (input: PowerFlowInput): PowerFlow => {
  const seconds = Math.max(0, input.seconds);
  const speed = Math.max(0, input.simulationSpeed);
  const boilerActive = input.steamPowerUnlocked && input.boilersEnabled;
  const boilerMultiplier = boilerActive ? Math.max(0, input.boilers) * speed : 0;
  const engineMultiplier = input.steamPowerUnlocked ? Math.max(0, input.steamEngines) * speed : 0;
  const boilerCoalDemand = boilerMultiplier * Math.max(0, input.boilerCoalPerSecond) * seconds;
  const boilerWaterDemand = boilerMultiplier * Math.max(0, input.boilerWaterPerSecond) * seconds;
  const coalRatio = boilerCoalDemand > 0 ? clampRatio(input.coal / boilerCoalDemand) : 1;
  const waterRatio = boilerWaterDemand > 0 ? clampRatio(input.water / boilerWaterDemand) : 1;
  const boilerInputRatio = boilerActive && input.boilers > 0 ? Math.min(coalRatio, waterRatio) : 0;
  const boilerCoalConsumed = boilerCoalDemand * boilerInputRatio;
  const boilerWaterConsumed = boilerWaterDemand * boilerInputRatio;
  const steamProduced = boilerMultiplier * Math.max(0, input.boilerSteamPerSecond) * seconds * boilerInputRatio;
  const steamDemand = engineMultiplier * Math.max(0, input.steamEngineSteamPerSecond) * seconds;
  const steamEngineRatio = steamDemand > 0 ? clampRatio(steamProduced / steamDemand) : 0;
  const steamConsumed = steamDemand * steamEngineRatio;
  const powerGeneratedMw = engineMultiplier * Math.max(0, input.steamEnginePowerMw) * seconds * steamEngineRatio;

  return {
    boilerInputRatio,
    boilerCoalRatio: coalRatio,
    boilerWaterRatio: waterRatio,
    boilerCoalDemand,
    boilerWaterDemand,
    boilerCoalConsumed,
    boilerWaterConsumed,
    steamProduced,
    steamDemand,
    steamConsumed,
    steamEngineRatio,
    powerGeneratedMw,
  };
};