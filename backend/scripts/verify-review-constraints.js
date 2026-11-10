const { Client } = require('pg');
const { assertLocalDatabaseUrl } = require('../lib/local-database');

assertLocalDatabaseUrl(process.env.DATABASE_URL);

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT conname AS name
      FROM pg_constraint
      WHERE conrelid = '"Review"'::regclass
        AND conname = 'Review_rating_range_check'
      UNION
      SELECT indexname AS name
      FROM pg_indexes
      WHERE tablename = 'Review'
        AND indexname = 'Review_userId_placeId_key'
      ORDER BY name
    `);
    const names = rows.map(({ name }) => name);
    const expected = ['Review_rating_range_check', 'Review_userId_placeId_key'];
    if (JSON.stringify(names) !== JSON.stringify(expected)) {
      throw new Error(`Restrições em falta: ${expected.filter((name) => !names.includes(name)).join(', ')}`);
    }
    console.log('Integridade local de avaliações verificada:', names.join(', '));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
