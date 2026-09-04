import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateResearchCountFormula, technologyLevelFor } from '../src/researchFormula.js';

test('research count formulas evaluate at the technology level and round to whole numbers', () => {
  assert.equal(technologyLevelFor('physical-projectile-damage-7'), 7);
  assert.equal(evaluateResearchCountFormula('2^(L-7)*1000', 7), 1000);
  assert.equal(evaluateResearchCountFormula('2^L*1000', 1), 2000);
  assert.equal(evaluateResearchCountFormula('1000+3^(L-1)*1000', 1), 2000);
  assert.equal(evaluateResearchCountFormula('5/2', 1), 3);
});