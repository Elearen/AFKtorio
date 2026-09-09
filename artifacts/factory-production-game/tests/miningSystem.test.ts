import { test } from 'node:test';
import assert from 'node:assert/strict';
import { miningPowerRatioFor } from '../src/miningSystem.js';

test('burner mining drills ignore low electrical power', () => {
  assert.equal(miningPowerRatioFor('burner-mining-drill', 0), 1);
  assert.equal(miningPowerRatioFor('burner-mining-drill', 0.35), 1);
});

test('electric mining drills scale with available electrical power', () => {
  assert.equal(miningPowerRatioFor('electric-mining-drill', 0), 0);
  assert.equal(miningPowerRatioFor('electric-mining-drill', 0.35), 0.35);
  assert.equal(miningPowerRatioFor('electric-mining-drill', 1.5), 1);
});