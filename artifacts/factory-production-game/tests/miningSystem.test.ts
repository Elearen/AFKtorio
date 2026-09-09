import { test } from 'node:test';
import assert from 'node:assert/strict';
import { burnerMinerNeedsFuel, miningPowerRatioFor } from '../src/miningSystem.js';

test('burner mining drills ignore low electrical power', () => {
  assert.equal(miningPowerRatioFor('burner-mining-drill', 0), 1);
  assert.equal(miningPowerRatioFor('burner-mining-drill', 0.35), 1);
});

test('electric mining drills scale with available electrical power', () => {
  assert.equal(miningPowerRatioFor('electric-mining-drill', 0), 0);
  assert.equal(miningPowerRatioFor('electric-mining-drill', 0.35), 0.35);
  assert.equal(miningPowerRatioFor('electric-mining-drill', 1.5), 1);
});

test('full no-demand burner lines do not consume shared coal fuel', () => {
  assert.equal(burnerMinerNeedsFuel(1200, 1200, 0), false);
  assert.equal(burnerMinerNeedsFuel(1200, 1200, 120), true);
  assert.equal(burnerMinerNeedsFuel(0, 1200, 0), true);
});