import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activateReadyConstruction,
  constructionRequestReady,
  constructionCanBeFullyFunded,
  constructionDurationFor,
  constructionTickCountFor,
  constructionVisualDurationMsFor,
  constructionVisualProgressFor,
  hasWaitingConstruction,
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

test('queued power constructions prioritize shared materials in FIFO order', () => {
  const boiler: ConstructionQueueItem = {
    action: 'boiler',
    seconds: 0,
    total: 8,
    costs: [
      { key: 'stone', amount: 5, source: 'raw' },
      { key: 'pipe', amount: 4, source: 'products' },
    ],
    reserved: [5, 0],
    started: false,
  };
  const steamEngine: ConstructionQueueItem = {
    action: 'steamEngine',
    seconds: 0,
    total: 12,
    costs: [
      { key: 'gear', amount: 8, source: 'products' },
      { key: 'pipe', amount: 5, source: 'products' },
      { key: 'ironPlate', amount: 10, source: 'products' },
    ],
    reserved: [0, 0, 0],
    started: false,
  };
  const queue = [boiler, steamEngine];

  assert.equal(fulfillConstructionReservation(queue, 'pipe', 6, 'products'), 6);
  assert.deepEqual(boiler.reserved, [5, 4]);
  assert.deepEqual(steamEngine.reserved, [0, 2, 0]);
  assert.equal(boiler.started, true);
  assert.equal(steamEngine.started, false);

  assert.equal(fulfillConstructionReservation(queue, 'pipe', 3, 'products'), 3);
  assert.deepEqual(steamEngine.reserved, [0, 5, 0]);
  assert.equal(steamEngine.started, false);
  assert.equal(fulfillConstructionReservation(queue, 'gear', 8, 'products'), 8);
  assert.equal(fulfillConstructionReservation(queue, 'ironPlate', 10, 'products'), 10);
  assert.equal(steamEngine.started, true);
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

test('only one unaffordable construction can wait for a construction button', () => {
  const queue = [{
    action: 'assembler',
    targetId: 'electronic-circuit',
    seconds: 0,
    total: 3,
    costs: [{ key: 'ironPlate', amount: 5, source: 'products' as const }],
    reserved: [2],
    started: false,
  }];

  assert.equal(hasWaitingConstruction(queue, 'assembler', 'electronic-circuit'), true);
  assert.equal(hasWaitingConstruction(queue, 'assembler', 'copper-cable'), false);
  assert.equal(hasWaitingConstruction(queue, 'furnace', 'electronic-circuit'), false);
});

test('fully affordable follow-up constructions remain allowed', () => {
  const inventory = {
    raw: {},
    products: { ironPlate: 5 },
  };
  const costs = [{ key: 'ironPlate', amount: 5, source: 'products' as const }];

  assert.equal(constructionCanBeFullyFunded(inventory, costs), true);
  assert.equal(constructionCanBeFullyFunded({ raw: {}, products: { ironPlate: 4 } }, costs), false);
});

test('construction visual timing starts at zero and ends on the simulation completion tick', () => {
  assert.equal(constructionTickCountFor(10), 10);
  assert.equal(constructionTickCountFor(2.5), 3);
  assert.equal(constructionVisualDurationMsFor(10, 250), 9250);
  assert.equal(constructionVisualProgressFor(1000, 1000, 9250), 0);
  assert.equal(constructionVisualProgressFor(10250, 1000, 9250), 100);
  assert.equal(constructionVisualProgressFor(11000, 1000, 9250), 100);
});

test('construction batches use worker robot speed while preserving single-building time', () => {
  assert.equal(constructionDurationFor(10, 1, 0), 10);
  assert.equal(constructionDurationFor(10, 10, 0), 100);
  assert.equal(constructionDurationFor(10, 10, 1), 50);
  assert.equal(constructionDurationFor(10, 100, 9), 250);
  assert.equal(constructionDurationFor(10, 1, 100), 10);
});