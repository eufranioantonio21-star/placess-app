const LOCAL_DATABASE_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
  'db',
  'host.docker.internal',
]);

function assertLocalDatabaseUrl(connectionString) {
  let parsed;

  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (!LOCAL_DATABASE_HOSTS.has(parsed.hostname)) {
    throw new Error('Refusing to run a local-only script against a remote database');
  }
}

module.exports = { assertLocalDatabaseUrl };
