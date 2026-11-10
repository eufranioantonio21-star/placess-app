const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReviewInput } = require('./reviews');

test('aceita apenas classificações inteiras de 1 a 5', () => {
  for (const rating of [1, 2, 3, 4, 5]) assert.deepEqual(parseReviewInput({ rating }).value, { rating, comment: null });
  for (const rating of [0, 6, 1.5, 'abc', null]) assert.ok(parseReviewInput({ rating }).error);
});

test('normaliza comentário e limita o comprimento', () => {
  assert.deepEqual(parseReviewInput({ rating: 5, comment: '  Muito bom  ' }).value, { rating: 5, comment: 'Muito bom' });
  assert.ok(parseReviewInput({ rating: 5, comment: 'x'.repeat(1001) }).error);
  assert.ok(parseReviewInput({ rating: 5, comment: 123 }).error);
});
