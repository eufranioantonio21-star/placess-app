const test = require('node:test');
const assert = require('node:assert/strict');
const { assertLocalDatabaseUrl } = require('./local-database');

test('aceita apenas hosts locais, incluindo a ponte do Docker Desktop', () => {
  assert.doesNotThrow(() => assertLocalDatabaseUrl('postgresql://user:password@127.0.0.1:5432/spots'));
  assert.doesNotThrow(() => assertLocalDatabaseUrl('postgresql://user:password@host.docker.internal:55322/postgres'));
  assert.throws(
    () => assertLocalDatabaseUrl('postgresql://user:password@database.example.com:5432/spots'),
    /Refusing to run a local-only script/,
  );
});
