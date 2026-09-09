export const miningPowerRatioFor = (variant: string, powerRatio: number) => {
  if (variant !== 'electric-mining-drill') return 1;
  return Math.max(0, Math.min(1, powerRatio));
};

export const burnerMinerNeedsFuel = (stored: number, capacity: number, demandRate: number) =>
  !(capacity > 0 && stored >= capacity * 0.95 && demandRate <= 0);