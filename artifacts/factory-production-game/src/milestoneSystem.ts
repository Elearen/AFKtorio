export type MilestoneKey = 'crash-landed' | 'first-lab' | 'twenty-one-labs' | 'sixty-furnaces' | 'turn-lights-on' | 'advanced-oil-production' | 'rocket-silo' | 'spidertron' | 'game-complete' | 'space-science';

export const milestoneOrder: MilestoneKey[] = ['crash-landed', 'turn-lights-on', 'first-lab', 'sixty-furnaces', 'twenty-one-labs', 'advanced-oil-production', 'rocket-silo', 'game-complete', 'spidertron', 'space-science'];

export const milestoneTitles: Record<MilestoneKey, string> = {
  'crash-landed': 'Crash Landed',
  'first-lab': 'Built a Lab',
  'sixty-furnaces': '60 Furnaces',
  'twenty-one-labs': '21 Labs',
  'turn-lights-on': 'Power Production',
  'advanced-oil-production': 'Advanced Oil Production',
  'rocket-silo': 'Rocket Silo',
  spidertron: 'Spidertron',
  'game-complete': 'Game Complete',
  'space-science': 'Space Science',
};

const isMilestoneKey = (value: string): value is MilestoneKey => (
  value === 'crash-landed'
  || value === 'first-lab'
  || value === 'twenty-one-labs'
  || value === 'sixty-furnaces'
  || value === 'turn-lights-on'
  || value === 'advanced-oil-production'
  || value === 'rocket-silo'
  || value === 'spidertron'
  || value === 'game-complete'
  || value === 'space-science'
);

const normalizeMilestoneKeys = (value: unknown) => Array.from(new Set(
  (Array.isArray(value) ? value : []).map(String).filter(isMilestoneKey),
));

type MilestoneMigrationInput = {
  welcomeSeen?: unknown;
  unlockedMilestones?: unknown;
  milestoneNotifications?: unknown;
  labCount: number;
  furnaceCount: number;
  rocketSiloResearched?: boolean;
  spidertronResearched?: boolean;
  gameCompleted?: boolean;
  spaceScienceProduced?: number;
  advancedOilProductionCompleted?: boolean;
};

export type MigratedMilestoneState = {
  welcomeSeen: boolean;
  milestoneNotifications: MilestoneKey[];
  unlockedMilestones: MilestoneKey[];
};

export function migrateMilestoneState(input: MilestoneMigrationInput): MigratedMilestoneState {
  const savedMilestoneKeys = normalizeMilestoneKeys(input.unlockedMilestones);
  const savedMilestoneNotifications = normalizeMilestoneKeys(input.milestoneNotifications)
    .filter((key) => key !== 'crash-landed');
  const hasMilestoneMetadata = Array.isArray(input.unlockedMilestones) || Array.isArray(input.milestoneNotifications);
  const earnedMilestones: MilestoneKey[] = [
    ...(input.labCount > 0 ? ['first-lab' as MilestoneKey] : []),
    ...(input.furnaceCount >= 60 ? ['sixty-furnaces' as MilestoneKey] : []),
    ...(input.labCount >= 21 ? ['twenty-one-labs' as MilestoneKey] : []),
  ];
  const newlyEarnedMilestones: MilestoneKey[] = [
    ...(input.rocketSiloResearched && !savedMilestoneKeys.includes('rocket-silo') ? ['rocket-silo' as MilestoneKey] : []),
    ...(input.spidertronResearched && !savedMilestoneKeys.includes('spidertron') ? ['spidertron' as MilestoneKey] : []),
  ];
  const advancedOilMilestones: MilestoneKey[] = input.advancedOilProductionCompleted && !savedMilestoneKeys.includes('advanced-oil-production')
    ? ['advanced-oil-production']
    : [];
  const completedMilestones: MilestoneKey[] = input.gameCompleted && !savedMilestoneKeys.includes('game-complete')
    ? ['game-complete']
    : [];
  const spaceScienceMilestones: MilestoneKey[] = input.spaceScienceProduced && input.spaceScienceProduced > 0 && !savedMilestoneKeys.includes('space-science')
    ? ['space-science']
    : [];
  const welcomeSeen = input.welcomeSeen === true;
  const milestoneNotifications = hasMilestoneMetadata
    ? Array.from(new Set([...savedMilestoneNotifications, ...newlyEarnedMilestones, ...advancedOilMilestones, ...spaceScienceMilestones]))
    : [...earnedMilestones, ...newlyEarnedMilestones, ...advancedOilMilestones, ...spaceScienceMilestones];
  const unlockedMilestones = Array.from(new Set<MilestoneKey>([
    ...savedMilestoneKeys,
    ...(welcomeSeen ? ['crash-landed' as MilestoneKey] : []),
    ...earnedMilestones,
    ...newlyEarnedMilestones,
    ...advancedOilMilestones,
    ...completedMilestones,
    ...spaceScienceMilestones,
    ...milestoneNotifications,
  ]));

  return { welcomeSeen, milestoneNotifications, unlockedMilestones };
}