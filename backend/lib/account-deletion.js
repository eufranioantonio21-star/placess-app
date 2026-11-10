class AccountDeletionError extends Error {
  constructor(message, code = 'ACCOUNT_DELETION_FAILED') {
    super(message);
    this.name = 'AccountDeletionError';
    this.code = code;
  }
}

async function deleteAccountData(transaction, userId) {
  const places = await transaction.place.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  const placeIds = places.map(({ id }) => id);

  await transaction.order.deleteMany({
    where: placeIds.length > 0
      ? { OR: [{ userId }, { placeId: { in: placeIds } }] }
      : { userId },
  });
  await transaction.review.deleteMany({
    where: placeIds.length > 0
      ? { OR: [{ userId }, { placeId: { in: placeIds } }] }
      : { userId },
  });
  await transaction.notification.deleteMany({ where: { userId } });

  if (placeIds.length > 0) {
    await transaction.menuItem.deleteMany({ where: { placeId: { in: placeIds } } });
    await transaction.campaign.deleteMany({ where: { placeId: { in: placeIds } } });
    await transaction.businessAuditEvent.deleteMany({ where: { placeId: { in: placeIds } } });
    await transaction.place.deleteMany({ where: { id: { in: placeIds } } });
  }

  await transaction.businessAuditEvent.deleteMany({
    where: { OR: [{ actorUserId: userId }, { targetUserId: userId }] },
  });
  await transaction.user.delete({ where: { id: userId } });
}

function isMissingAuthUser(error) {
  return error?.status === 404
    || ['user_not_found', 'not_found'].includes(error?.code);
}

async function processPendingAccountDeletion({ prisma, supabaseAdmin, userId, authUserId }) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
  if (error && !isMissingAuthUser(error)) {
    throw new AccountDeletionError(
      'A eliminação foi agendada e será concluída automaticamente',
      'AUTH_DELETE_PENDING',
    );
  }

  await prisma.$transaction(
    (transaction) => deleteAccountData(transaction, userId),
    { timeout: 15_000 },
  );
}

async function deleteAccountAtomically({ prisma, supabaseAdmin, userId, authUserId }) {
  if (!supabaseAdmin) {
    throw new AccountDeletionError(
      'A eliminação de conta não está configurada',
      'AUTH_ADMIN_UNAVAILABLE',
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletionRequestedAt: new Date() },
  });

  try {
    await processPendingAccountDeletion({ prisma, supabaseAdmin, userId, authUserId });
    return { pending: false };
  } catch (error) {
    if (error instanceof AccountDeletionError && error.code === 'AUTH_DELETE_PENDING') {
      return { pending: true };
    }
    // The durable marker remains available for reconciliation after a database
    // commit/connection failure that occurs after the Auth identity is removed.
    return { pending: true };
  }
}

async function reconcilePendingAccountDeletions({ prisma, supabaseAdmin, limit = 20 }) {
  if (!supabaseAdmin) return { processed: 0, pending: 0 };
  const pendingUsers = await prisma.user.findMany({
    where: { deletionRequestedAt: { not: null } },
    select: { id: true, authUserId: true },
    orderBy: { deletionRequestedAt: 'asc' },
    take: limit,
  });
  let processed = 0;
  for (const user of pendingUsers) {
    if (!user.authUserId) continue;
    try {
      await processPendingAccountDeletion({
        prisma,
        supabaseAdmin,
        userId: user.id,
        authUserId: user.authUserId,
      });
      processed += 1;
    } catch {
      // Keep the durable marker. A later bounded pass can retry safely.
    }
  }
  return { processed, pending: pendingUsers.length - processed };
}

module.exports = {
  AccountDeletionError,
  deleteAccountAtomically,
  deleteAccountData,
  isMissingAuthUser,
  processPendingAccountDeletion,
  reconcilePendingAccountDeletions,
};
