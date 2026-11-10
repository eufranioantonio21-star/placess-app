const test = require('node:test');
const assert = require('node:assert/strict');
const { createCorsOriginGuard, parseAllowedOrigins } = require('./cors-origins');

test('normaliza várias origens explícitas', () => {
  assert.deepEqual(
    [...parseAllowedOrigins('https://localhost, http://127.0.0.1:5173,https://localhost')],
    ['https://localhost', 'http://127.0.0.1:5173'],
  );
});

test('aceita cliente sem Origin e rejeita origem não autorizada', async () => {
  const guard = createCorsOriginGuard('https://localhost');
  await new Promise((resolve, reject) => guard(undefined, (error, allowed) => (
    error || !allowed ? reject(error || new Error('cliente nativo recusado')) : resolve()
  )));
  await new Promise((resolve, reject) => guard('https://tracker.example', (error, allowed) => (
    error && !allowed ? resolve() : reject(new Error('origem externa aceite'))
  )));
});
