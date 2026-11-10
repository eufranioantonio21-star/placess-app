const test = require('node:test');
const assert = require('node:assert/strict');
const { normalisePermissions, resolvePlaceAccess } = require('./place-access');

test('o proprietário recebe todas as permissões', () => {
  assert.deepEqual(resolvePlaceAccess({ ownerId: 7, staffMemberships: [] }, 7), {
    isOwner: true,
    canManageOrders: true,
    canManageCampaigns: true,
    canManageMenu: true,
    canViewMetrics: true,
  });
});

test('o funcionário recebe apenas permissões guardadas na base', () => {
  const access = resolvePlaceAccess({ ownerId: 7, staffMemberships: [{ userId: 8, canManageOrders: true }] }, 8);
  assert.equal(access.isOwner, false);
  assert.equal(access.canManageOrders, true);
  assert.equal(access.canManageCampaigns, false);
});

test('normaliza permissões sem aceitar valores truthy', () => {
  assert.deepEqual(normalisePermissions({ canManageMenu: 'true', canViewMetrics: true }), {
    canManageOrders: false,
    canManageCampaigns: false,
    canManageMenu: false,
    canViewMetrics: true,
  });
});
