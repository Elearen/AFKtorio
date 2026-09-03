import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activateReadyConstruction,
  constructionRequestReady,
  fulfillConstructionReservation,
  normalizeConstructionQueue,
  refundConstructionMaterials,
  reserveConstructionMaterials,
  type ConstructionQueueItem,
} from '../src/constructionSystem.js';

const costs = [
  { key: 'circuit', amount: 5, source: 'products' as const },
  { key: 'stone', amount: 2, source: 'raw' as const },
];

test('construction reserves available materials and waits for the remainder', () => {
  const inventory = { raw: { stone: 1 }, products: { circuit: 3 } };
  const reserved = reserveConstructionMaterials(inventory, costs);
  const request: ConstructionQueueItem = { action: 'assembler', seconds: 0, total: 10, costs, reserved, started: false };

  assert.deepEqual(reserved, [3, 1]);
  assert.deepEqual(inventory, { raw: { stone: 0 }, products: { circuit: 0 } });
  assert.equal(constructionRequestReady(request), false);

  assert.equal(fulfillConstructionReservation([request], 'circuit', 2, 'products'), 2);
  assert.equal(fulfillConstructionReservation([request], 'stone', 1, 'raw'), 1);
  assert.deepEqual(request.reserved, [5, 2]);
  assert.equal(request.started, true);
  assert.equal(request.seconds, 10);
});

test('construction requests take produced output before storage and honor queue order', () => {
  const first: ConstructionQueueItem = {
    action: 'assembler',
    seconds: 0,
    total: 10,
    costs: [{ key: 'circuit', amount: 2, source: 'products' }],
    reserved: [0],
    started: false,
  };
  const second: ConstructionQueueItem = {
    action: 'furnace',
    seconds: 0,
    total: 5,
    costs: [{ key: 'circuit', amount: 2, source: 'products' }],
    reserved: [0],
    started: false,
  };
  const queue = [first, second];

  assert.equal(fulfillConstructionReservation(queue, 'circuit', 3, 'products'), 3);
  assert.deepEqual(first.reserved, [2]);
  assert.deepEqual(second.reserved, [1]);
  assert.equal(first.started, true);
  assert.equal(second.started, false);

  assert.equal(fulfillConstructionReservation(queue, 'circuit', 1, 'products'), 1);
  assert.equal(second.started, true);
  activateReadyConstruction(queue);
  assert.equal(first.seconds, 10);
  assert.equal(second.seconds, 5);
  assert.equal(fulfillConstructionReservation(queue, 'circuit', 1, 'products'), 0);
});

test('legacy partially funded queue entries load as waiting instead of active', () => {
  const [normalized] = normalizeConstructionQueue([{
    action: 'assembler',
    seconds: 0,
    total: 10,
    costs: [{ key: 'circuit', amount: 5, source: 'products' }],
    reserved: [2],
  }]);

  assert.equal(normalized.started, false);
  assert.deepEqual(normalized.reserved, [2]);
});

test('cancelling a queue item refunds paid and reserved materials without applying capacity', () => {
  const refunded = refundConstructionMaterials({
    raw: { stone: 179 },
    products: { circuit: 180 },
  }, {
    action: 'assembler',
    seconds: 8,
    total: 10,
    costs: [
      { key: 'circuit', amount: 5, source: 'products' },
      { key: 'stone', amount: 2, source: 'raw' },
    ],
    reserved: [5, 1],
    started: true,
  });

  assert.deepEqual(refunded, {
    raw: { stone: 180 },
    products: { circuit: 185 },
  });
});