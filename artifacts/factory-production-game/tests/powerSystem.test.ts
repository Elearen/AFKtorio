import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePowerFlow } from '../src/powerSystem.js';

const flow = (overrides: Partial<Parameters<typeof calculatePowerFlow>[0]> = {}) => calculatePowerFlow({
  boilers: 1,
  steamEngines: 1,
  coal: 100,
  water: 100,
  seconds: 1,
  simulationSpeed: 1,
  boilersEnabled: true,
  steamPowerUnlocked: true,
  boilerSteamPerSecond: 60,
  boilerCoalPerSecond: 0.45,
  boilerWaterPerSecond: 6,
  steamEngineSteamPerSecond: 30,
  steamEnginePowerMw: 0.9,
  ...overrides,
});

test('boiler runs at full rate when coal and water are available', () => {
  const result = flow();

  assert.equal(result.boilerInputRatio, 1);
  assert.equal(result.boilerCoalConsumed, 0.45);
  assert.equal(result.boilerWaterConsumed, 6);
  assert.equal(result.steamProduced, 60);
  assert.equal(result.powerGeneratedMw, 0.9);
});

test('disabling boilers removes their coal demand and consumption', () => {
  const result = flow({ boilersEnabled: false });

  assert.equal(result.boilerCoalDemand, 0);
  assert.equal(result.boilerCoalConsumed, 0);
  assert.equal(result.boilerWaterDemand, 0);
  assert.equal(result.steamProduced, 0);
  assert.equal(result.powerGeneratedMw, 0);
});

test('boiler steam scales to the limiting coal or water input', () => {
  const coalLimited = flow({ coal: 0.225 });
  const waterLimited = flow({ water: 3 });

  assert.equal(coalLimited.boilerInputRatio, 0.5);
  assert.equal(coalLimited.boilerCoalRatio, 0.5);
  assert.equal(coalLimited.boilerWaterRatio, 1);
  assert.equal(coalLimited.steamProduced, 30);
  assert.equal(coalLimited.powerGeneratedMw, 0.9);
  assert.equal(waterLimited.boilerInputRatio, 0.5);
  assert.equal(waterLimited.boilerCoalRatio, 1);
  assert.equal(waterLimited.boilerWaterRatio, 0.5);
  assert.equal(waterLimited.steamProduced, 30);
  assert.equal(waterLimited.powerGeneratedMw, 0.9);
});

test('steam engine power scales to the steam available from boilers', () => {
  const result = flow({ boilers: 1, steamEngines: 3 });

  assert.equal(result.steamProduced, 60);
  assert.equal(result.steamDemand, 90);
  assert.equal(result.steamEngineRatio, 2 / 3);
  assert.equal(result.steamConsumed, 60);
  assert.equal(result.powerGeneratedMw, 1.8);
});

test('no boiler input produces no steam or steam-engine power', () => {
  const result = flow({ coal: 0, water: 0 });

  assert.equal(result.steamProduced, 0);
  assert.equal(result.steamConsumed, 0);
  assert.equal(result.powerGeneratedMw, 0);
});