import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierProductCatalog } from '../src/productTierCatalog.js';

const tierFor = (sourceName: string) => tierProductCatalog.find((product) => product.sourceName === sourceName)?.tier;

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