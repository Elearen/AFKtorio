export const miningPowerRatioFor = (variant: string, powerRatio: number) => {
  if (variant !== 'electric-mining-drill') return 1;
  return Math.max(0, Math.min(1, powerRatio));
};