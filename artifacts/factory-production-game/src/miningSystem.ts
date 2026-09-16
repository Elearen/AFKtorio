export const miningPowerRatioFor = (variant: string, powerRatio: number) => {
  if (variant !== 'electric-mining-drill' && variant !== 'electric-mining-drill-modules-1' && variant !== 'electric-mining-drill-modules-2' && variant !== 'electric-mining-drill-modules-3') return 1;
  return Math.max(0, Math.min(1, powerRatio));
};

export const burnerMinerNeedsFuel = (stored: number, capacity: number, demandRate: number) =>
  !(capacity > 0 && stored >= capacity * 0.95 && demandRate <= 0);

export const burnerMinerFuelRatioFor = (availableCoal: number, minerCount: number) =>
  minerCount > 0 ? (availableCoal > 0 ? 1 : 0) : 1;