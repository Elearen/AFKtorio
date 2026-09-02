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
  boilerSteamPerSecond: 30,
  boilerCoalPerSecond: 0.1,
  boilerWaterPerSecond: 0.5,
  steamEngineSteamPerSecond: 30,
  steamEnginePowerMw: 80,
  ...overrides,
});

test('boiler runs at full rate when coal and water are available', () => {
  const result = flow();

  assert.equal(result.boilerInputRatio, 1);
  assert.equal(result.boilerCoalConsumed, 0.1);
  assert.equal(result.boilerWaterConsumed, 0.5);
  assert.equal(result.steamProduced, 30);
  assert.equal(result.powerGeneratedMw, 80);
});

test('boiler steam scales to the limiting coal or water input', () => {
  const coalLimited = flow({ coal: 0.05 });
  const waterLimited = flow({ water: 0.25 });

  assert.equal(coalLimited.boilerInputRatio, 0.5);
  assert.equal(coalLimited.steamProduced, 15);
  assert.equal(coalLimited.powerGeneratedMw, 40);
  assert.equal(waterLimited.boilerInputRatio, 0.5);
  assert.equal(waterLimited.steamProduced, 15);
  assert.equal(waterLimited.powerGeneratedMw, 40);
});

test('steam engine power scales to the steam available from boilers', () => {
  const result = flow({ boilers: 1, steamEngines: 2 });

  assert.equal(result.steamProduced, 30);
  assert.equal(result.steamDemand, 60);
  assert.equal(result.steamEngineRatio, 0.5);
  assert.equal(result.steamConsumed, 30);
  assert.equal(result.powerGeneratedMw, 80);
});

test('no boiler input produces no steam or steam-engine power', () => {
  const result = flow({ coal: 0, water: 0 });

  assert.equal(result.steamProduced, 0);
  assert.equal(result.steamConsumed, 0);
  assert.equal(result.powerGeneratedMw, 0);
});