import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialGoalsFor, type TutorialState } from '../src/tutorialSystem.js';

const baseState = (): TutorialState => ({
  miners: {},
  assemblers: {},
  boilers: 0,
  steamEngines: 0,
  pumps: 0,
  labs: 0,
  manualOutputEvents: {},
});

test('the getting started checklist uses the new player sequence and wording', () => {
  assert.deepEqual(tutorialGoalsFor(baseState()).map(({ id, label }) => ({ id, label })), [
    { id: 'mine-iron-by-hand', label: 'Mine your first iron by hand' },
    { id: 'build-coal-miner', label: 'Build a burner miner drill on a coal patch for infinite coal' },
    { id: 'auto-smelt-iron', label: 'Build a stone furnace to auto-smelt iron (you might need to hand-mine more stone)' },
    { id: 'hand-craft-gears', label: 'Hand-craft three iron gears (you might need to hand-mine more iron or coal)' },
    { id: 'build-stone-and-iron-miners', label: 'Build a burner miner drill on a stone patch and iron patch (you might need more coal mining)' },
    { id: 'auto-smelt-copper', label: 'Build a burner miner drill on a copper patch, and a stone furnace to auto-smelt copper' },
    { id: 'turn-power-on', label: 'Turn the power on by constructing a boiler and steam engine (power tab) and an offshore pump (mining/raw tab)' },
    { id: 'build-lab', label: 'Build your first lab to start researching new technology' },
  ]);
});

test('tutorial goals trigger from the specific manual, machine, and power actions', () => {
  const state = baseState();
  const incomplete = () => tutorialGoalsFor(state).map((goal) => goal.complete);
  assert.deepEqual(incomplete(), [false, false, false, false, false, false, false, false]);

  state.manualOutputEvents.iron = 1;
  assert.equal(tutorialGoalsFor(state)[0].complete, true);
  state.miners.coal = 1;
  state.assemblers['iron-plate'] = 1;
  state.manualOutputEvents.gear = 2;
  assert.deepEqual(incomplete().slice(0, 4), [true, true, true, false]);
  state.manualOutputEvents.gear = 3;
  state.miners.stone = 1;
  state.miners.iron = 1;
  state.miners.copper = 1;
  state.assemblers['copper-plate'] = 1;
  state.boilers = 1;
  state.steamEngines = 1;
  assert.equal(tutorialGoalsFor(state)[4].complete, true);
  assert.equal(tutorialGoalsFor(state)[5].complete, true);
  assert.equal(tutorialGoalsFor(state)[6].complete, false);
  state.pumps = 1;
  state.labs = 1;
  assert.deepEqual(incomplete(), [true, true, true, true, true, true, true, true]);
});