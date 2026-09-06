import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierProductCatalog } from '../src/productTierCatalog.js';

const tierFor = (sourceName: string) => tierProductCatalog.find((product) => product.sourceName === sourceName)?.tier;
const indexFor = (sourceName: string) => tierProductCatalog.findIndex((product) => product.sourceName === sourceName);

test('military science and flamethrower ammo use the requested progression tiers', () => {
  assert.equal(tierFor('military-science-pack'), 5);
  assert.equal(tierFor('flamethrower-ammo'), 6);
});

test('the product tier catalog remains ordered after the tier changes', () => {
  for (let index = 1; index < tierProductCatalog.length; index += 1) {
    assert.ok(
      tierProductCatalog[index - 1].tier <= tierProductCatalog[index].tier,
      `${tierProductCatalog[index - 1].sourceName} must not follow ${tierProductCatalog[index].sourceName}`,
    );
  }
});

test('science packs sit after transport and inserter but before oil products', () => {
  const logisticScience = indexFor('logistic-science-pack');
  const militaryScience = indexFor('military-science-pack');
  const transportBelt = indexFor('transport-belt');
  const inserter = indexFor('inserter');

  assert.ok(transportBelt < logisticScience);
  assert.ok(inserter < logisticScience);
  assert.ok(logisticScience < militaryScience);

  for (const oilProduct of ['heavy-oil', 'light-oil', 'petroleum-gas']) {
    assert.ok(militaryScience < indexFor(oilProduct), `${oilProduct} must follow both science packs`);
  }
});