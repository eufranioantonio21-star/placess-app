const { spawnSync } = require('node:child_process');
const { assertLocalDatabaseUrl } = require('../lib/local-database');

assertLocalDatabaseUrl(process.env.DATABASE_URL);

function run(command, args) {
  const executable = process.platform === 'win32' && command === 'npx' ? 'npx.cmd' : command;
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npx', ['prisma', 'migrate', 'deploy']);
run(process.execPath, ['seed.js']);
