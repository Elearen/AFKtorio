import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateNuclearPowerFlow } from '../src/nuclearPowerSystem.js';

const defaults = {
  nuclearReactors: 1,
  heatExchangers: 1,
  steamTurbines: 1,
  uraniumFuelCells: 1,
  water: 10.3,
  seconds: 1,
  simulationSpeed: 1,
  nuclearPowerUnlocked: true,
  fuelCellPerSecond: 1 / 200,
  heatPerReactorPerSecond: 120_000,
  heatPerExchangerPerSecond: 10_000,
  waterPerExchangerPerSecond: 10.3,
  nuclearSteamPerExchangerPerSecond: 103,
  steamPerTurbinePerSecond: 60,
  turbinePowerMw: 5.82,
};

test('nuclear flow converts fuel cells to heat, independent steam, and turbine power', () => {
  const flow = calculateNuclearPowerFlow(defaults);

  assert.equal(flow.fuelCellsConsumed, 0.005);
  assert.equal(flow.heatProduced, 120_000);
  assert.equal(flow.heatConsumed, 10_000);
  assert.equal(flow.waterConsumed, 10.3);
  assert.equal(flow.nuclearSteamProduced, 103);
  assert.equal(flow.nuclearSteamConsumed, 60);
  assert.equal(flow.powerGeneratedMw, 5.82);
});

test('each steam turbine consumes 60 steam per second and produces 5.82 MW', () => {
  const flow = calculateNuclearPowerFlow({
    ...defaults,
    nuclearReactors: 2,
    heatExchangers: 2,
    steamTurbines: 2,
    water: 20.6,
  });

  assert.equal(flow.nuclearSteamProduced, 206);
  assert.equal(flow.nuclearSteamConsumed, 120);
  assert.equal(flow.powerGeneratedMw, 11.64);
});

test('nuclear flow limits reactors, exchangers, and turbines to available inputs', () => {
  const flow = calculateNuclearPowerFlow({
    ...defaults,
    uraniumFuelCells: 0,
    water: 0,
  });

  assert.equal(flow.fuelCellsConsumed, 0);
  assert.equal(flow.heatProduced, 0);
  assert.equal(flow.waterConsumed, 0);
  assert.equal(flow.nuclearSteamProduced, 0);
  assert.equal(flow.powerGeneratedMw, 0);
});

test('nuclear flow is disabled before Nuclear Power research', () => {
  const flow = calculateNuclearPowerFlow({ ...defaults, nuclearPowerUnlocked: false });

  assert.equal(flow.fuelCellsConsumed, 0);
  assert.equal(flow.heatProduced, 0);
  assert.equal(flow.nuclearSteamProduced, 0);
  assert.equal(flow.powerGeneratedMw, 0);
});