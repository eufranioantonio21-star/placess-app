require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seed() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log('No user found to own the place.');

  const place = await prisma.place.create({
    data: {
      name: 'Green Leaf Vegan',
      category: 'Restaurant',
      description: 'The best 100% plant-based restaurant in town. We serve delicious organic meals.',
      keywords: 'Vegan, Organic, Healthy, Plant-based, Vegetarian',
      lat: 38.7230,
      lng: -9.1400,
      phoneNumber: '+351 912 345 600',
      ownerId: user.id,
      campaigns: {
        create: {
          type: 'reward',
          title: 'Free Vegan Smoothie',
          description: 'Get a free smoothie when you buy any main dish today!',
          isActive: true
        }
      }
    }
  });
  console.log('Created place:', place.name);
}
seed().catch(console.error).finally(() => process.exit(0));
