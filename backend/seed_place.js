require('dotenv').config();
const { assertLocalDatabaseUrl } = require('./lib/local-database');
const { prisma } = require('./lib/prisma');

assertLocalDatabaseUrl(process.env.DATABASE_URL);

async function seed() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log('No user found to own the place.');

  const place = await prisma.place.create({
    data: {
      name: 'Spot Sintético Miramar',
      category: 'Restaurantes',
      description: 'Ficha sintética para testes locais da SPOTS.',
      keywords: 'Synthetic, Local, Test',
      lat: -8.8147,
      lng: 13.2302,
      phoneNumber: '+244 900 000 000',
      ownerId: user.id,
      campaigns: {
        create: {
          type: 'reward',
          title: 'Campanha sintética inactiva',
          description: 'Conteúdo exclusivamente local para testes.',
          isActive: true
        }
      }
    }
  });
  console.log('Created place:', place.name);
}
seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
