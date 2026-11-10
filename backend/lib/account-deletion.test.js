const test = require('node:test');
const assert = require('node:assert/strict');
const {
  deleteAccountAtomically,
  reconcilePendingAccountDeletions,
} = require('./account-deletion');

function createFixture({ authError = null, transactionError = null } = {}) {
  const calls = [];
  const model = (name) => ({
    deleteMany: async (args) => calls.push([`${name}.deleteMany`, args]),
  });
  const transaction = {
    place: {
      findMany: async () => [{ id: 11 }, { id: 12 }],
      deleteMany: async (args) => calls.push(['place.deleteMany', args]),
    },
    order: model('order'),
    review: model('review'),
    notification: model('notification'),
    menuItem: model('menuItem'),
    campaign: model('campaign'),
    businessAuditEvent: model('businessAuditEvent'),
    user: {
      delete: async (args) => calls.push(['user.delete', args]),
    },
  };
  const prisma = {
    $transaction: async (callback) => {
      await callback(transaction);
      if (transactionError) throw transactionError;
    },
    user: {
      update: async (args) => calls.push(['user.update', args]),
      findMany: async () => [],
    },
  };
  const supabaseAdmin = {
    auth: { admin: { deleteUser: async (id) => {
      calls.push(['auth.deleteUser', id]);
      return { error: authError };
    } } },
  };
  return { calls, prisma, supabaseAdmin };
}

test('regista o pedido antes de eliminar Auth e dados', async () => {
  const fixture = createFixture();
  await deleteAccountAtomically({
    prisma: fixture.prisma,
    supabaseAdmin: fixture.supabaseAdmin,
    userId: 7,
    authUserId: 'auth-7',
  });

  assert.equal(fixture.calls[0][0], 'user.update');
  assert.ok(fixture.calls.findIndex(([name]) => name === 'auth.deleteUser')
    < fixture.calls.findIndex(([name]) => name === 'user.delete'));
  assert.ok(fixture.calls.some(([name]) => name === 'place.deleteMany'));
  assert.ok(fixture.calls.some(([name]) => name === 'businessAuditEvent.deleteMany'));
});

test('recusa a operação antes de alterar dados sem cliente administrativo', async () => {
  const fixture = createFixture();
  await assert.rejects(
    deleteAccountAtomically({
      prisma: fixture.prisma,
      supabaseAdmin: null,
      userId: 7,
      authUserId: 'auth-7',
    }),
    { code: 'AUTH_ADMIN_UNAVAILABLE' },
  );
  assert.equal(fixture.calls.length, 0);
});

test('mantém o pedido pendente quando a eliminação Auth falha', async () => {
  const fixture = createFixture({ authError: new Error('indisponível') });
  const result = await deleteAccountAtomically({
    prisma: fixture.prisma,
    supabaseAdmin: fixture.supabaseAdmin,
    userId: 7,
    authUserId: 'auth-7',
  });
  assert.deepEqual(result, { pending: true });
  assert.equal(fixture.calls.some(([name]) => name === 'user.delete'), false);
});

test('mantém o marcador quando a transacção falha depois de remover a identidade Auth', async () => {
  const fixture = createFixture({ transactionError: new Error('commit indisponível') });
  const result = await deleteAccountAtomically({
    prisma: fixture.prisma,
    supabaseAdmin: fixture.supabaseAdmin,
    userId: 7,
    authUserId: 'auth-7',
  });
  assert.deepEqual(result, { pending: true });
  assert.equal(fixture.calls[0][0], 'user.update');
  assert.equal(fixture.calls.some(([name]) => name === 'auth.deleteUser'), true);
});

test('reconcilia pedidos pendentes e tolera identidade Auth já ausente', async () => {
  const fixture = createFixture({ authError: { status: 404, code: 'user_not_found' } });
  fixture.prisma.user.findMany = async () => [{ id: 7, authUserId: 'auth-7' }];
  const result = await reconcilePendingAccountDeletions({
    prisma: fixture.prisma,
    supabaseAdmin: fixture.supabaseAdmin,
  });
  assert.deepEqual(result, { processed: 1, pending: 0 });
  assert.equal(fixture.calls.some(([name]) => name === 'user.delete'), true);
});
