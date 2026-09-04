import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateMilestoneState, milestoneOrder, milestoneTitles } from '../src/milestoneSystem.js';

test('Turn the lights on is a replayable milestone with the requested settings label', () => {
  assert.equal(milestoneTitles['turn-lights-on'], 'Turn the lights on');
  assert.equal(milestoneOrder.includes('turn-lights-on'), true);
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