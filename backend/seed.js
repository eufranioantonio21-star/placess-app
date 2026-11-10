require('dotenv').config();

const { assertLocalDatabaseUrl } = require('./lib/local-database');
const { prisma } = require('./lib/prisma');
const { supabaseAdmin } = require('./lib/supabase-auth');

assertLocalDatabaseUrl(process.env.DATABASE_URL);

const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || 'SpotsLocalTest123!';
const SYNTHETIC_EMAILS = {
  consumer: 'consumer@spots.test',
  ownerA: 'owner-a@spots.test',
  ownerB: 'owner-b@spots.test',
  staffA: 'staff-a@spots.test',
};

async function ensureAuthUser(email) {
  if (!supabaseAdmin) throw new Error('SUPABASE_SECRET_KEY is required for local auth seed');

  const { data: listed, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = listed.users.find((candidate) => candidate.email === email);
  if (existing) return existing;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function upsertUser({ authUserId, email, name, role }) {
  return prisma.user.upsert({
    where: { email },
    update: { authUserId, name, role, password: null, adultConfirmedAt: new Date() },
    create: { authUserId, email, name, role, password: null, adultConfirmedAt: new Date() },
  });
}

async function clearSyntheticOwnerData(db, ownerIds) {
  const places = await db.place.findMany({
    where: { ownerId: { in: ownerIds } },
    select: { id: true },
  });
  const placeIds = places.map(({ id }) => id);

  if (placeIds.length === 0) return;

  await db.notification.deleteMany({
    where: { userId: { in: ownerIds } },
  });
  await db.review.deleteMany({ where: { placeId: { in: placeIds } } });
  await db.order.deleteMany({ where: { placeId: { in: placeIds } } });
  await db.campaign.deleteMany({ where: { placeId: { in: placeIds } } });
  await db.menuItem.deleteMany({ where: { placeId: { in: placeIds } } });
  await db.place.deleteMany({ where: { id: { in: placeIds } } });
}

async function main() {
  const [consumerAuth, ownerAAuth, ownerBAuth, staffAAuth] = await Promise.all([
    ensureAuthUser(SYNTHETIC_EMAILS.consumer),
    ensureAuthUser(SYNTHETIC_EMAILS.ownerA),
    ensureAuthUser(SYNTHETIC_EMAILS.ownerB),
    ensureAuthUser(SYNTHETIC_EMAILS.staffA),
  ]);

  const [consumer, ownerA, ownerB, staffA] = await Promise.all([
    upsertUser({
      authUserId: consumerAuth.id,
      email: SYNTHETIC_EMAILS.consumer,
      name: 'Consumidor Sintético',
      role: 'CONSUMER',
    }),
    upsertUser({
      authUserId: ownerAAuth.id,
      email: SYNTHETIC_EMAILS.ownerA,
      name: 'Proprietário Sintético A',
      role: 'BUSINESS',
    }),
    upsertUser({
      authUserId: ownerBAuth.id,
      email: SYNTHETIC_EMAILS.ownerB,
      name: 'Proprietário Sintético B',
      role: 'BUSINESS',
    }),
    upsertUser({
      authUserId: staffAAuth.id,
      email: SYNTHETIC_EMAILS.staffA,
      name: 'Funcionário Sintético A',
      role: 'CONSUMER',
    }),
  ]);

  await prisma.$transaction(async (tx) => {
    await clearSyntheticOwnerData(tx, [ownerA.id, ownerB.id]);

    const placeA = await tx.place.create({
      data: {
        name: 'Spot Sintético Ilha',
        category: 'Restaurantes',
        description: 'Ficha exclusivamente sintética para testes locais.',
        keywords: 'sintético, teste, Luanda',
        lat: -8.8059,
        lng: 13.2354,
        phoneNumber: '+244 900 000 001',
        capacity: null,
        takeAwayEnabled: true,
        ownerId: ownerA.id,
        menuItems: {
          create: [
            {
              title: 'Prato Sintético A',
              description: 'Item fictício para validar o menu.',
              price: 4500,
              available: true,
            },
            {
              title: 'Bebida Sintética A',
              description: 'Item fictício indisponível para validar estados.',
              price: 1200,
              available: false,
            },
          ],
        },
        campaigns: {
          create: {
            type: 'discount',
            title: 'Campanha sintética activa',
            description: 'Conteúdo fictício para testes locais.',
            isActive: true,
            radiusKm: 4,
            durationHours: 24,
            estimatedPriceAoa: 25000,
            isSynthetic: true,
          },
        },
      },
    });

    await tx.placeMembership.create({
      data: {
        placeId: placeA.id,
        userId: staffA.id,
        canManageOrders: true,
        canManageCampaigns: false,
        canManageMenu: true,
        canViewMetrics: false,
      },
    });

    await tx.place.create({
      data: {
        name: 'Spot Sintético Miramar',
        category: 'Cafés',
        description: 'Segunda ficha do proprietário A para validar a gestão de vários Spots.',
        keywords: 'sintético, teste, Miramar, café',
        lat: -8.8218,
        lng: 13.2292,
        phoneNumber: '+244 900 000 003',
        capacity: null,
        takeAwayEnabled: true,
        ownerId: ownerA.id,
      },
    });

    await tx.place.create({
      data: {
        name: 'Spot Sintético Talatona',
        category: 'Eventos',
        description: 'Segunda ficha sintética para testar isolamento e pesquisa de eventos.',
        keywords: 'sintético, teste, Talatona, eventos',
        lat: -8.9185,
        lng: 13.1844,
        phoneNumber: '+244 900 000 002',
        capacity: null,
        takeAwayEnabled: false,
        ownerId: ownerB.id,
        campaigns: {
          create: {
            type: 'reward',
            title: 'Campanha sintética inactiva',
            description: 'Conteúdo fictício para validar estados.',
            isActive: false,
            radiusKm: 1,
            durationHours: 24,
            estimatedPriceAoa: 10000,
            isSynthetic: true,
          },
        },
      },
    });

    await tx.order.create({
      data: {
        status: 'pending',
        total: 5700,
        userId: consumer.id,
        placeId: placeA.id,
        itemsJson: JSON.stringify([
          { title: 'Prato Sintético A', quantity: 1, unitPrice: 4500 },
          { title: 'Bebida Sintética A', quantity: 1, unitPrice: 1200 },
        ]),
      },
    });
  });

  console.log('Synthetic local seed completed', {
    users: 4,
    places: 3,
    orders: 1,
    staffMemberships: 1,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
