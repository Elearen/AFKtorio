import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWinDuration, winMetricsFor } from '../src/endgameMetrics.js';

test('win metrics snapshot totals science packs and mined ores', () => {
  assert.deepEqual(winMetricsFor(123456, 9876, {
    automationPack: 10,
    logisticsPack: 20,
    chemicalPack: 30,
    militaryPack: 40,
    productionPack: 50,
    utilityPack: 60,
    spacePack: 70,
    iron: 800,
    copper: 900,
    rocketPart: 100,
  }), {
    timestamp: 123456,
    totalItemsProduced: 9876,
    totalSciencePacksProduced: 280,
    totalIronMined: 800,
    totalCopperMined: 900,
  });
});

test('win metrics default missing production categories to zero', () => {
  assert.deepEqual(winMetricsFor(123456, 9876, {}), {
    timestamp: 123456,
    totalItemsProduced: 9876,
    totalSciencePacksProduced: 0,
    totalIronMined: 0,
    totalCopperMined: 0,
  });
});

test('win duration is formatted as hours and minutes', () => {
  assert.equal(formatWinDuration(0, (2 * 60 + 7) * 60000), '02:07');
  assert.equal(formatWinDuration(0, 45 * 60000), '00:45');
  assert.equal(formatWinDuration(1000, null), '--:--');
});