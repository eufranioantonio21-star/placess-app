const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidSpotCategory, SPOT_CATEGORIES } = require('./categories');

test('aceita apenas as oito categorias canónicas em novas escritas', () => {
  assert.equal(SPOT_CATEGORIES.length, 8);
  for (const category of SPOT_CATEGORIES) assert.equal(isValidSpotCategory(category), true);
  assert.equal(isValidSpotCategory('Restaurant'), false);
  assert.equal(isValidSpotCategory('Outra categoria'), false);
});
