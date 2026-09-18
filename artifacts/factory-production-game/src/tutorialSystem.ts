export type TutorialState = {
  miners: Record<string, number>;
  assemblers: Record<string, number>;
  boilers: number;
  steamEngines: number;
  pumps: number;
  labs: number;
  manualOutputEvents: Record<string, number>;
};

export type TutorialGoal = {
  id: string;
  label: string;
  complete: boolean;
};

export const tutorialGoalsFor = (state: TutorialState): TutorialGoal[] => [
  {
    id: 'mine-iron-by-hand',
    label: 'Mine your first iron by hand',
    complete: (state.manualOutputEvents.iron ?? 0) > 0,
  },
  {
    id: 'build-coal-miner',
    label: 'Build a burner miner drill on a coal patch for infinite coal',
    complete: (state.miners.coal ?? 0) > 0,
  },
  {
    id: 'auto-smelt-iron',
    label: 'Build a stone furnace to auto-smelt iron (you might need to hand-mine more stone)',
    complete: (state.assemblers['iron-plate'] ?? 0) > 0,
  },
  {
    id: 'hand-craft-gears',
    label: 'Hand-craft three iron gears (you might need to hand-mine more iron or coal)',
    complete: (state.manualOutputEvents.gear ?? 0) >= 3,
  },
  {
    id: 'build-stone-and-iron-miners',
    label: 'Build a burner miner drill on a stone patch and iron patch (you might need more coal mining)',
    complete: (state.miners.stone ?? 0) > 0 && (state.miners.iron ?? 0) > 0,
  },
  {
    id: 'auto-smelt-copper',
    label: 'Build a burner miner drill on a copper patch, and a stone furnace to auto-smelt copper',
    complete: (state.miners.copper ?? 0) > 0 && (state.assemblers['copper-plate'] ?? 0) > 0,
  },
  {
    id: 'turn-power-on',
    label: 'Turn the power on by constructing a boiler and steam engine (power tab) and an offshore pump (mining/raw tab)',
    complete: state.boilers > 0 && state.steamEngines > 0 && state.pumps > 0,
  },
  {
    id: 'build-lab',
    label: 'Build your first lab to start researching new technology',
    complete: state.labs > 0,
  },
];