export type MilestoneKey = 'crash-landed' | 'first-lab' | 'twenty-one-labs' | 'sixty-furnaces';

export const milestoneOrder: MilestoneKey[] = ['crash-landed', 'first-lab', 'sixty-furnaces', 'twenty-one-labs'];

export const milestoneTitles: Record<MilestoneKey, string> = {
  'crash-landed': 'Crash Landed',
  'first-lab': 'Built a Lab',
  'sixty-furnaces': '60 Furnaces',
  'twenty-one-labs': '21 Labs',
};

const isMilestoneKey = (value: string): value is MilestoneKey => (
  value === 'crash-landed'
  || value === 'first-lab'
  || value === 'twenty-one-labs'
  || value === 'sixty-furnaces'
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
  const welcomeSeen = input.welcomeSeen === true;
  const milestoneNotifications = hasMilestoneMetadata
    ? savedMilestoneNotifications
    : earnedMilestones;
  const unlockedMilestones = Array.from(new Set<MilestoneKey>([
    ...savedMilestoneKeys,
    ...(welcomeSeen ? ['crash-landed' as MilestoneKey] : []),
    ...earnedMilestones,
    ...milestoneNotifications,
  ]));

  return { welcomeSeen, milestoneNotifications, unlockedMilestones };
}