require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcrypt');

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.order.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.place.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const hashedConsumerPassword = await bcrypt.hash('password123', 10);
  const hashedBusinessPassword = await bcrypt.hash('password123', 10);

  const consumerUser = await prisma.user.create({
    data: {
      email: 'consumer@test.com',
      password: hashedConsumerPassword,
      name: 'Test Consumer',
      role: 'CONSUMER'
    }
  });

  const businessUser = await prisma.user.create({
    data: {
      email: 'business@test.com',
      password: hashedBusinessPassword,
      name: 'Test Business Owner',
      role: 'BUSINESS'
    }
  });

  // Create Place
  const place1 = await prisma.place.create({
    data: {
      name: 'The Rustic Spoon',
      category: 'Burgers & Craft Beer',
      lat: 38.7223,
      lng: -9.1393,
      capacity: '45% Full',
      takeAwayEnabled: true,
      ownerId: businessUser.id,
      menuItems: {
        create: [
          {
            title: 'Classic Smash Burger',
            description: 'Double beef patty, cheddar, house sauce, brioche bun.',
            price: 12.99,
            available: true,
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=150'
          },
          {
            title: 'Truffle Fries',
            description: 'Crispy fries tossed in truffle oil and parmesan.',
            price: 5.99,
            available: true,
            image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&q=80&w=150'
          }
        ]
      },
      campaigns: {
        create: [
          {
            type: 'discount',
            title: 'Live Discount Active!',
            description: '20% off entire meal! Arrive in next 30 mins.',
            isActive: true
          }
        ]
      }
    }
  });

  const place2 = await prisma.place.create({
    data: {
      name: 'Bella Italia',
      category: 'Pizza & Pasta',
      lat: 38.7250,
      lng: -9.1400,
      capacity: '20% Full',
      takeAwayEnabled: true,
      ownerId: businessUser.id,
      campaigns: {
        create: [
          {
            type: 'reward',
            title: 'Live Reward!',
            description: 'Free Pastry with any large coffee.',
            isActive: true
          }
        ]
      }
    }
  });

  console.log('Database seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
