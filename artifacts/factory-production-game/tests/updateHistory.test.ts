import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateHistoryChangedSince, updateHistoryVersion } from '../src/updateHistory.js';

test('current update history version does not trigger a migration notice', () => {
  assert.equal(updateHistoryChangedSince(updateHistoryVersion), false);
});

test('missing or older update history versions trigger a migration notice', () => {
  assert.equal(updateHistoryChangedSince(undefined), true);
  assert.equal(updateHistoryChangedSince('older-update-history-version'), true);
});