require('dotenv').config();
const { assertLocalDatabaseUrl } = require('./lib/local-database');
const { prisma } = require('./lib/prisma');

assertLocalDatabaseUrl(process.env.DATABASE_URL);

async function main() {
  const [users, placeCount, orderCount, campaignCount] = await Promise.all([
    prisma.user.findMany({ select: { role: true } }),
    prisma.place.count(),
    prisma.order.count(),
    prisma.campaign.count(),
  ]);
  const roles = users.reduce((counts, user) => {
    counts[user.role] = (counts[user.role] || 0) + 1;
    return counts;
  }, {});

  console.log('Synthetic database summary:', {
    users: users.length,
    roles,
    places: placeCount,
    orders: orderCount,
    campaigns: campaignCount,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
