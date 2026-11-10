const test = require('node:test');
const assert = require('node:assert/strict');
const { recordCampaignClick } = require('./campaign-clicks');

function createFixture({ duplicate = false, active = true } = {}) {
  let increments = 0;
  const transaction = {
    campaign: {
      findFirst: async () => (active ? { id: 9 } : null),
      update: async () => { increments += 1; },
    },
    campaignClick: {
      create: async () => {
        if (duplicate) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      },
    },
  };
  return {
    prisma: { $transaction: async (callback) => callback(transaction) },
    increments: () => increments,
  };
}

test('conta o primeiro clique autenticado', async () => {
  const fixture = createFixture();
  assert.deepEqual(await recordCampaignClick(fixture.prisma, { campaignId: 9, userId: 4 }), { counted: true });
  assert.equal(fixture.increments(), 1);
});

test('torna repetição do mesmo utilizador idempotente', async () => {
  const fixture = createFixture({ duplicate: true });
  assert.deepEqual(await recordCampaignClick(fixture.prisma, { campaignId: 9, userId: 4 }), { counted: false });
  assert.equal(fixture.increments(), 0);
});

test('recusa campanha inactiva sem incrementar', async () => {
  const fixture = createFixture({ active: false });
  await assert.rejects(
    recordCampaignClick(fixture.prisma, { campaignId: 9, userId: 4 }),
    { code: 'CAMPAIGN_NOT_FOUND' },
  );
  assert.equal(fixture.increments(), 0);
});
