import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_OFFLINE_SECONDS,
  OFFLINE_RECONCILIATION_THRESHOLD_SECONDS,
  offlineElapsedSecondsFor,
} from '../src/offlineRecovery.js';

test('offline elapsed time is calculated from wall-clock timestamps and capped', () => {
  assert.equal(offlineElapsedSecondsFor(10_000, 10_000), 0);
  assert.equal(offlineElapsedSecondsFor(10_000, 11_500), 1.5);
  assert.equal(offlineElapsedSecondsFor(11_500, 10_000), 0);
  assert.equal(offlineElapsedSecondsFor(0, (MAX_OFFLINE_SECONDS + 60) * 1000), MAX_OFFLINE_SECONDS);
});

test('offline reconciliation uses a threshold above normal timer jitter', () => {
  assert.equal(OFFLINE_RECONCILIATION_THRESHOLD_SECONDS > 1, true);
  assert.equal(OFFLINE_RECONCILIATION_THRESHOLD_SECONDS < 10, true);
});