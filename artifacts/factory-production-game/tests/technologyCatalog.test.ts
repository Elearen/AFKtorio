import { test } from 'node:test';
import assert from 'node:assert/strict';
import { technologyCatalog } from '../src/technologyCatalog.js';

test('Oil Processing unlocks after constructing one pumpjack', () => {
  const oilProcessing = technologyCatalog.find((technology) => technology.name === 'oil-processing');

  assert.ok(oilProcessing);
  assert.deepEqual(oilProcessing.researchTrigger, {
    type: 'construct-item',
    item: 'pumpjack',
    count: 1,
  });
});

test('Advanced Oil Processing unlocks only the two cracking recipes', () => {
  const advancedOilProcessing = technologyCatalog.find((technology) => technology.name === 'advanced-oil-processing');

  assert.ok(advancedOilProcessing);
  assert.deepEqual(advancedOilProcessing.effects, [
    { type: 'unlock-recipe', recipe: 'heavy-oil-cracking' },
    { type: 'unlock-recipe', recipe: 'light-oil-cracking' },
  ]);
});

test('Uranium Processing unlocks after constructing the first uranium miner', () => {
  const uraniumProcessing = technologyCatalog.find((technology) => technology.name === 'uranium-processing');

  assert.ok(uraniumProcessing);
  assert.deepEqual(uraniumProcessing.researchTrigger, {
    type: 'construct-item',
    item: 'uranium-miner',
    count: 1,
  });
});

test('technology upgrade science costs use the correct pack types and scaled quantities', () => {
  const physicalProjectileDamage3 = technologyCatalog.find((technology) => technology.name === 'physical-projectile-damage-3');

  assert.ok(physicalProjectileDamage3);
  assert.deepEqual(physicalProjectileDamage3.scienceCosts, [
    { pack: 'automation-science-pack', amount: 1 },
    { pack: 'logistic-science-pack', amount: 1 },
    { pack: 'military-science-pack', amount: 1 },
  ]);
  assert.equal(physicalProjectileDamage3.count, 300);

  const scaledFamilies = [
    'physical-projectile-damage',
    'weapon-shooting-speed',
    'stronger-explosives',
    'refined-flammables',
    'laser-weapons-damage',
  ];

  for (const family of scaledFamilies) {
    for (let level = 1; level <= 6; level += 1) {
      const technology = technologyCatalog.find((entry) => entry.name === `${family}-${level}`);

      assert.ok(technology, `missing ${family}-${level}`);
      assert.equal(technology.count, level * 100, `${family}-${level} research count`);
      assert.ok(technology.scienceCosts.every((cost) => cost.amount === 1), `${family}-${level} science amount`);
    }
  }
});