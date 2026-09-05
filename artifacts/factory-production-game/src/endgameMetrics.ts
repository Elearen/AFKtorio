export type WinMetrics = {
  timestamp: number;
  totalItemsProduced: number;
  totalSciencePacksProduced: number;
  totalIronMined: number;
  totalCopperMined: number;
};

const sciencePackKeys = [
  'automationPack',
  'logisticsPack',
  'chemicalPack',
  'militaryPack',
  'productionPack',
  'utilityPack',
  'spacePack',
];

export const winMetricsFor = (
  timestamp: number,
  totalItemsProduced: number,
  produced: Record<string, number>,
): WinMetrics => ({
  timestamp,
  totalItemsProduced,
  totalSciencePacksProduced: sciencePackKeys.reduce((total, key) => total + (produced[key] ?? 0), 0),
  totalIronMined: produced.iron ?? 0,
  totalCopperMined: produced.copper ?? 0,
});