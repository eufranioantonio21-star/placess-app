const PERMISSION_FIELDS = Object.freeze([
  'canManageOrders',
  'canManageCampaigns',
  'canManageMenu',
  'canViewMetrics',
]);

function normalisePermissions(input = {}) {
  return Object.fromEntries(PERMISSION_FIELDS.map((field) => [field, input[field] === true]));
}

function resolvePlaceAccess(place, userId) {
  if (!place) return null;
  if (place.ownerId === userId) {
    return { isOwner: true, ...Object.fromEntries(PERMISSION_FIELDS.map((field) => [field, true])) };
  }
  const membership = place.staffMemberships?.find((candidate) => candidate.userId === userId);
  return membership ? { isOwner: false, ...normalisePermissions(membership) } : null;
}

module.exports = { PERMISSION_FIELDS, normalisePermissions, resolvePlaceAccess };
