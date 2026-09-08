import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateMilestoneState, milestoneOrder, milestoneTitles } from '../src/milestoneSystem.js';

test('Turn the lights on is a replayable milestone with the requested settings label', () => {
  assert.equal(milestoneTitles['turn-lights-on'], 'Power Production');
  assert.equal(milestoneOrder.includes('turn-lights-on'), true);
});

test('100 Science Packs triggers at 100 total science packs produced', () => {
  assert.equal(milestoneTitles['hundred-science-packs'], '100 Science Packs');
  assert.equal(milestoneOrder.includes('hundred-science-packs'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed'],
    milestoneNotifications: [],
    labCount: 0,
    furnaceCount: 0,
    totalSciencePacksProduced: 100,
  });
  assert.deepEqual(migrated.milestoneNotifications, ['hundred-science-packs']);
  assert.equal(migrated.unlockedMilestones.includes('hundred-science-packs'), true);
});

test('1000 Science Packs triggers at 1000 total science packs produced', () => {
  assert.equal(milestoneTitles['thousand-science-packs'], '1000 Science Packs');
  assert.equal(milestoneOrder.includes('thousand-science-packs'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed', 'hundred-science-packs'],
    milestoneNotifications: ['hundred-science-packs'],
    labCount: 0,
    furnaceCount: 0,
    totalSciencePacksProduced: 1000,
  });
  assert.deepEqual(migrated.milestoneNotifications, ['hundred-science-packs', 'thousand-science-packs']);
  assert.equal(migrated.unlockedMilestones.includes('thousand-science-packs'), true);
});

test('10000 Science Packs triggers at 10000 total science packs produced', () => {
  assert.equal(milestoneTitles['ten-thousand-science-packs'], '10000 Science Packs');
  assert.equal(milestoneOrder.includes('ten-thousand-science-packs'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed', 'hundred-science-packs', 'thousand-science-packs'],
    milestoneNotifications: ['hundred-science-packs', 'thousand-science-packs'],
    labCount: 0,
    furnaceCount: 0,
    totalSciencePacksProduced: 10000,
  });
  assert.deepEqual(migrated.milestoneNotifications, [
    'hundred-science-packs',
    'thousand-science-packs',
    'ten-thousand-science-packs',
  ]);
  assert.equal(migrated.unlockedMilestones.includes('ten-thousand-science-packs'), true);
});

test('100000 Science Packs triggers at 100000 total science packs produced', () => {
  assert.equal(milestoneTitles['hundred-thousand-science-packs'], '100000 Science Packs');
  assert.equal(milestoneOrder.includes('hundred-thousand-science-packs'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: [
      'crash-landed',
      'hundred-science-packs',
      'thousand-science-packs',
      'ten-thousand-science-packs',
    ],
    milestoneNotifications: [
      'hundred-science-packs',
      'thousand-science-packs',
      'ten-thousand-science-packs',
    ],
    labCount: 0,
    furnaceCount: 0,
    totalSciencePacksProduced: 100000,
  });
  assert.deepEqual(migrated.milestoneNotifications, [
    'hundred-science-packs',
    'thousand-science-packs',
    'ten-thousand-science-packs',
    'hundred-thousand-science-packs',
  ]);
  assert.equal(migrated.unlockedMilestones.includes('hundred-thousand-science-packs'), true);
});

test('1000000 Science Packs triggers at 1000000 total science packs produced', () => {
  assert.equal(milestoneTitles['million-science-packs'], '1000000 Science Packs');
  assert.equal(milestoneOrder.includes('million-science-packs'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: [
      'crash-landed',
      'hundred-science-packs',
      'thousand-science-packs',
      'ten-thousand-science-packs',
      'hundred-thousand-science-packs',
    ],
    milestoneNotifications: [
      'hundred-science-packs',
      'thousand-science-packs',
      'ten-thousand-science-packs',
      'hundred-thousand-science-packs',
    ],
    labCount: 0,
    furnaceCount: 0,
    totalSciencePacksProduced: 1000000,
  });
  assert.deepEqual(migrated.milestoneNotifications, [
    'hundred-science-packs',
    'thousand-science-packs',
    'ten-thousand-science-packs',
    'hundred-thousand-science-packs',
    'million-science-packs',
  ]);
  assert.equal(migrated.unlockedMilestones.includes('million-science-packs'), true);
});

test('milestones use the requested archive order', () => {
  assert.deepEqual(milestoneOrder, [
    'crash-landed',
    'turn-lights-on',
    'first-lab',
    'hundred-science-packs',
    'thousand-science-packs',
    'ten-thousand-science-packs',
    'hundred-thousand-science-packs',
    'million-science-packs',
    'sixty-furnaces',
    'twenty-one-labs',
    'trains',
    'advanced-oil-production',
    'rocket-silo',
    'game-complete',
    'spidertron',
    'space-science',
  ]);
});

test('Advanced Oil Production is triggered by a completed oil conversion', () => {
  assert.equal(milestoneTitles['advanced-oil-production'], 'Advanced Oil Production');
  assert.equal(milestoneOrder.indexOf('turn-lights-on') < milestoneOrder.indexOf('advanced-oil-production'), true);
  assert.equal(milestoneOrder.indexOf('advanced-oil-production') < milestoneOrder.indexOf('rocket-silo'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed'],
    milestoneNotifications: [],
    labCount: 0,
    furnaceCount: 0,
    advancedOilProductionCompleted: true,
  });
  assert.deepEqual(migrated.milestoneNotifications, ['advanced-oil-production']);
  assert.equal(migrated.unlockedMilestones.includes('advanced-oil-production'), true);
});

test('Trains is triggered when Railway is unlocked and migrates into the archive', () => {
  assert.equal(milestoneTitles.trains, 'Trains');
  assert.equal(milestoneOrder.indexOf('trains') > milestoneOrder.indexOf('twenty-one-labs'), true);
  assert.equal(milestoneOrder.indexOf('trains') < milestoneOrder.indexOf('advanced-oil-production'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed'],
    milestoneNotifications: [],
    labCount: 0,
    furnaceCount: 0,
    railwayResearched: true,
  });
  assert.deepEqual(migrated.milestoneNotifications, ['trains']);
  assert.equal(migrated.unlockedMilestones.includes('trains'), true);
});

test('Spidertron is a replayable milestone and migrates completed research into the archive', () => {
  assert.equal(milestoneTitles.spidertron, 'Spidertron');
  assert.equal(milestoneOrder.includes('spidertron'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed'],
    milestoneNotifications: [],
    labCount: 0,
    furnaceCount: 0,
    spidertronResearched: true,
  });
  assert.deepEqual(migrated.milestoneNotifications, ['spidertron']);
  assert.equal(migrated.unlockedMilestones.includes('spidertron'), true);
});

test('Rocket Silo is ordered before Spidertron and migrates completed research into the archive', () => {
  assert.equal(milestoneTitles['rocket-silo'], 'Rocket Silo');
  assert.equal(milestoneOrder.indexOf('rocket-silo') < milestoneOrder.indexOf('spidertron'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed'],
    milestoneNotifications: [],
    labCount: 0,
    furnaceCount: 0,
    rocketSiloResearched: true,
  });
  assert.deepEqual(migrated.milestoneNotifications, ['rocket-silo']);
  assert.equal(migrated.unlockedMilestones.includes('rocket-silo'), true);
});

test('Game Complete is replayable without creating a second completion notification', () => {
  assert.equal(milestoneTitles['game-complete'], 'Game Complete');
  assert.equal(milestoneOrder.indexOf('game-complete') < milestoneOrder.indexOf('space-science'), true);
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed'],
    milestoneNotifications: [],
    labCount: 0,
    furnaceCount: 0,
    gameCompleted: true,
  });
  assert.deepEqual(migrated.milestoneNotifications, []);
  assert.equal(migrated.unlockedMilestones.includes('game-complete'), true);
});

test('Space Science is a replayable milestone triggered by the first produced pack', () => {
  assert.equal(milestoneTitles['space-science'], 'Space Science');
  assert.equal(milestoneOrder.at(-1), 'space-science');
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed'],
    milestoneNotifications: [],
    labCount: 0,
    furnaceCount: 0,
    spaceScienceProduced: 1000,
  });
  assert.deepEqual(migrated.milestoneNotifications, ['space-science']);
  assert.equal(migrated.unlockedMilestones.includes('space-science'), true);
});

test('legacy saves surface welcome and earned milestones as unviewed', () => {
  const migrated = migrateMilestoneState({ labCount: 21, furnaceCount: 60 });

  assert.equal(migrated.welcomeSeen, false);
  assert.deepEqual(migrated.milestoneNotifications, ['first-lab', 'sixty-furnaces', 'twenty-one-labs']);
  assert.deepEqual(migrated.unlockedMilestones, ['first-lab', 'sixty-furnaces', 'twenty-one-labs']);
});

test('explicitly viewed metadata suppresses replay notifications', () => {
  const migrated = migrateMilestoneState({
    welcomeSeen: true,
    unlockedMilestones: ['crash-landed', 'first-lab', 'sixty-furnaces', 'twenty-one-labs'],
    milestoneNotifications: [],
    labCount: 21,
    furnaceCount: 60,
  });

  assert.equal(migrated.welcomeSeen, true);
  assert.deepEqual(migrated.milestoneNotifications, []);
  assert.deepEqual(migrated.unlockedMilestones, ['crash-landed', 'first-lab', 'sixty-furnaces', 'twenty-one-labs']);
});

test('partial milestone metadata preserves only explicitly pending notifications', () => {
  const migrated = migrateMilestoneState({
    welcomeSeen: false,
    unlockedMilestones: ['first-lab', 'sixty-furnaces', 'twenty-one-labs'],
    milestoneNotifications: ['twenty-one-labs'],
    labCount: 21,
    furnaceCount: 60,
  });

  assert.equal(migrated.welcomeSeen, false);
  assert.deepEqual(migrated.milestoneNotifications, ['twenty-one-labs']);
});