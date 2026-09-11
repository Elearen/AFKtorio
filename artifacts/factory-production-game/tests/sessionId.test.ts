import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionIdForStartTimestamp } from '../src/sessionId.js';

test('session IDs are deterministic and derived from the start timestamp', () => {
  const startTimestamp = 1_757_500_123_456;
  const first = sessionIdForStartTimestamp(startTimestamp);

  assert.equal(first, sessionIdForStartTimestamp(startTimestamp));
  assert.match(first, /^afk-[a-z0-9]+-[a-z0-9]+$/);
  assert.notEqual(first, sessionIdForStartTimestamp(startTimestamp + 1));
});

test('invalid start timestamps still produce a valid session ID', () => {
  assert.match(sessionIdForStartTimestamp(Number.NaN), /^afk-0-[a-z0-9]+$/);
  assert.match(sessionIdForStartTimestamp(Number.POSITIVE_INFINITY), /^afk-0-[a-z0-9]+$/);
});