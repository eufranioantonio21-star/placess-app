const { Client } = require('pg');
const { assertLocalDatabaseUrl } = require('../lib/local-database');

assertLocalDatabaseUrl(process.env.DATABASE_URL);

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT c.title, c."radiusKm", c."durationHours", c."estimatedPriceAoa", c."isSynthetic", p.name AS spot, u.role
      FROM "Campaign" c
      JOIN "Place" p ON p.id = c."placeId"
      JOIN "User" u ON u.id = p."ownerId"
      WHERE c."isActive" = true
      ORDER BY c.id
    `);
    if (rows.length === 0) throw new Error('Nenhuma campanha activa local encontrada');
    for (const row of rows) {
      if (row.role !== 'BUSINESS') throw new Error(`Campanha sem conta negócio: ${row.title}`);
      if (row.radiusKm < 0.1 || row.radiusKm > 10) throw new Error(`Raio inválido: ${row.title}`);
      if (row.durationHours < 6 || row.durationHours > 720) throw new Error(`Duração inválida: ${row.title}`);
      if (row.estimatedPriceAoa < 0) throw new Error(`Estimativa inválida: ${row.title}`);
    }
    const fixture = rows.find((row) => row.title === 'Campanha sintética activa');
    if (!fixture || !fixture.isSynthetic || fixture.radiusKm !== 4 || fixture.durationHours !== 24 || fixture.estimatedPriceAoa !== 25000 || fixture.spot !== 'Spot Sintético Ilha') {
      throw new Error('A campanha sintética activa não tem a proveniência esperada');
    }
    console.log('Campanhas locais verificadas:', rows.map((row) => `${row.title} -> ${row.spot} -> ${row.role} -> ${row.radiusKm} km -> ${row.durationHours} h -> ${row.estimatedPriceAoa} AOA${row.isSynthetic ? ' -> TESTE' : ''}`).join('; '));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
