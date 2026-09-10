export type MilestoneKey = 'crash-landed' | 'first-lab' | 'hundred-science-packs' | 'thousand-science-packs' | 'ten-thousand-science-packs' | 'hundred-thousand-science-packs' | 'million-science-packs' | 'twenty-one-labs' | 'sixty-furnaces' | 'turn-lights-on' | 'trains' | 'advanced-oil-production' | 'nuclear-power' | 'rocket-silo' | 'spidertron' | 'game-complete' | 'space-science' | 'infinite-science-complete';

export const milestoneOrder: MilestoneKey[] = ['crash-landed', 'turn-lights-on', 'first-lab', 'hundred-science-packs', 'thousand-science-packs', 'ten-thousand-science-packs', 'hundred-thousand-science-packs', 'million-science-packs', 'sixty-furnaces', 'twenty-one-labs', 'trains', 'advanced-oil-production', 'nuclear-power', 'rocket-silo', 'game-complete', 'spidertron', 'space-science', 'infinite-science-complete'];
export const SCIENCE_PACKS_MILESTONE_THRESHOLD = 100;
export const SCIENCE_PACKS_THOUSAND_MILESTONE_THRESHOLD = 1000;
export const SCIENCE_PACKS_TEN_THOUSAND_MILESTONE_THRESHOLD = 10000;
export const SCIENCE_PACKS_HUNDRED_THOUSAND_MILESTONE_THRESHOLD = 100000;
export const SCIENCE_PACKS_MILLION_MILESTONE_THRESHOLD = 1000000;

export const milestoneTitles: Record<MilestoneKey, string> = {
  'crash-landed': 'Crash Landed',
  'first-lab': 'Built a Lab',
  'hundred-science-packs': '100 Science Packs',
  'thousand-science-packs': '1000 Science Packs',
  'ten-thousand-science-packs': '10000 Science Packs',
  'hundred-thousand-science-packs': '100000 Science Packs',
  'million-science-packs': '1000000 Science Packs',
  'sixty-furnaces': '60 Furnaces',
  'twenty-one-labs': '21 Labs',
  'turn-lights-on': 'Power Production',
  trains: 'Trains',
  'advanced-oil-production': 'Advanced Oil Production',
  'nuclear-power': 'Nuclear Power',
  'rocket-silo': 'Rocket Silo',
  spidertron: 'Spidertron',
  'game-complete': 'Game Complete',
  'space-science': 'Space Science',
  'infinite-science-complete': 'Infinite Science Complete',
};

const isMilestoneKey = (value: string): value is MilestoneKey => (
  value === 'crash-landed'
  || value === 'first-lab'
  || value === 'hundred-science-packs'
  || value === 'thousand-science-packs'
  || value === 'ten-thousand-science-packs'
  || value === 'hundred-thousand-science-packs'
  || value === 'million-science-packs'
  || value === 'twenty-one-labs'
  || value === 'sixty-furnaces'
  || value === 'turn-lights-on'
  || value === 'trains'
  || value === 'advanced-oil-production'
  || value === 'nuclear-power'
  || value === 'rocket-silo'
  || value === 'spidertron'
  || value === 'game-complete'
  || value === 'space-science'
  || value === 'infinite-science-complete'
);

export const nuclearPowerMilestoneTriggered = (powerProductionMw: number) => Number.isFinite(powerProductionMw) && powerProductionMw > 0;

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
  railwayResearched?: boolean;
  spidertronResearched?: boolean;
  gameCompleted?: boolean;
  spaceScienceProduced?: number;
  infiniteResearchCompleted?: boolean;
  totalSciencePacksProduced?: number;
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
    ...(input.railwayResearched && !savedMilestoneKeys.includes('trains') ? ['trains' as MilestoneKey] : []),
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
  const infiniteScienceMilestones: MilestoneKey[] = input.infiniteResearchCompleted && !savedMilestoneKeys.includes('infinite-science-complete')
    ? ['infinite-science-complete']
    : [];
  const sciencePackMilestones: MilestoneKey[] = input.totalSciencePacksProduced !== undefined
    && input.totalSciencePacksProduced >= SCIENCE_PACKS_MILESTONE_THRESHOLD
    && !savedMilestoneKeys.includes('hundred-science-packs')
    ? ['hundred-science-packs']
    : [];
  const thousandSciencePackMilestones: MilestoneKey[] = input.totalSciencePacksProduced !== undefined
    && input.totalSciencePacksProduced >= SCIENCE_PACKS_THOUSAND_MILESTONE_THRESHOLD
    && !savedMilestoneKeys.includes('thousand-science-packs')
    ? ['thousand-science-packs']
    : [];
  const tenThousandSciencePackMilestones: MilestoneKey[] = input.totalSciencePacksProduced !== undefined
    && input.totalSciencePacksProduced >= SCIENCE_PACKS_TEN_THOUSAND_MILESTONE_THRESHOLD
    && !savedMilestoneKeys.includes('ten-thousand-science-packs')
    ? ['ten-thousand-science-packs']
    : [];
  const hundredThousandSciencePackMilestones: MilestoneKey[] = input.totalSciencePacksProduced !== undefined
    && input.totalSciencePacksProduced >= SCIENCE_PACKS_HUNDRED_THOUSAND_MILESTONE_THRESHOLD
    && !savedMilestoneKeys.includes('hundred-thousand-science-packs')
    ? ['hundred-thousand-science-packs']
    : [];
  const millionSciencePackMilestones: MilestoneKey[] = input.totalSciencePacksProduced !== undefined
    && input.totalSciencePacksProduced >= SCIENCE_PACKS_MILLION_MILESTONE_THRESHOLD
    && !savedMilestoneKeys.includes('million-science-packs')
    ? ['million-science-packs']
    : [];
  const welcomeSeen = input.welcomeSeen === true;
  const milestoneNotifications = hasMilestoneMetadata
     ? Array.from(new Set([...savedMilestoneNotifications, ...newlyEarnedMilestones, ...advancedOilMilestones, ...sciencePackMilestones, ...thousandSciencePackMilestones, ...tenThousandSciencePackMilestones, ...hundredThousandSciencePackMilestones, ...millionSciencePackMilestones, ...spaceScienceMilestones, ...infiniteScienceMilestones]))
      : [...earnedMilestones, ...newlyEarnedMilestones, ...advancedOilMilestones, ...sciencePackMilestones, ...thousandSciencePackMilestones, ...tenThousandSciencePackMilestones, ...hundredThousandSciencePackMilestones, ...millionSciencePackMilestones, ...spaceScienceMilestones, ...infiniteScienceMilestones];
  const unlockedMilestones = Array.from(new Set<MilestoneKey>([
    ...savedMilestoneKeys,
    ...(welcomeSeen ? ['crash-landed' as MilestoneKey] : []),
    ...earnedMilestones,
    ...newlyEarnedMilestones,
    ...advancedOilMilestones,
    ...sciencePackMilestones,
    ...thousandSciencePackMilestones,
    ...tenThousandSciencePackMilestones,
    ...hundredThousandSciencePackMilestones,
    ...millionSciencePackMilestones,
    ...completedMilestones,
    ...spaceScienceMilestones,
    ...infiniteScienceMilestones,
    ...milestoneNotifications,
  ]));

  return { welcomeSeen, milestoneNotifications, unlockedMilestones };
}