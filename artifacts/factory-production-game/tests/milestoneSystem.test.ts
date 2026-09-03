import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateMilestoneState } from '../src/milestoneSystem.js';

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