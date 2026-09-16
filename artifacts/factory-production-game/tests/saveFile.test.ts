import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveFileTextFor, stateFromSaveFileText } from '../src/saveFile.js';

const state = {
  raw: { iron: 12 },
  products: { ironPlate: 6 },
  storage: { iron: 100 },
  research: ['automation-science-pack'],
  gameStartTimestamp: 123,
  sessionId: 'session-123',
};

test('save files round-trip through the exported wrapper', () => {
  assert.deepEqual(stateFromSaveFileText(saveFileTextFor(state, 456)), state);
});

test('save imports accept raw local save JSON and a UTF-8 BOM', () => {
  const rawText = `\uFEFF${JSON.stringify(state)}`;
  assert.deepEqual(stateFromSaveFileText(rawText), state);
});

test('save imports reject malformed and unrelated JSON with useful errors', () => {
  assert.throws(() => stateFromSaveFileText('{'), /not valid JSON/);
  assert.throws(() => stateFromSaveFileText(JSON.stringify({ hello: 'world' })), /Factory Planet save/);
});