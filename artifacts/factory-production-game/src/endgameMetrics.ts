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

export const formatWinDuration = (startTimestamp: number, winTimestamp: number | null) => {
  if (winTimestamp === null || !Number.isFinite(startTimestamp) || !Number.isFinite(winTimestamp)) return '--:--';
  const totalMinutes = Math.max(0, Math.floor((winTimestamp - startTimestamp) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};