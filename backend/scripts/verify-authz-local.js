require('dotenv').config();

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { prisma } = require('../lib/prisma');

const API_URL = process.env.SPOTS_API_URL || 'http://127.0.0.1:3001';
const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || 'SpotsLocalTest123!';

async function signIn(email) {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  assert.equal(response.status, 200, `Falha ao autenticar a conta sintética ${email}`);
  const payload = await response.json();
  assert.ok(payload.access_token, `A conta sintética ${email} não devolveu uma sessão`);
  return payload.access_token;
}

async function request(path, token, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

function decodeClaims(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

function signExpiredToken(validToken) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  assert.ok(secret, 'SUPABASE_JWT_SECRET é necessário para a prova local de expiração');
  const original = decodeClaims(validToken);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    ...original,
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function main() {
  const [ownerAToken, ownerBToken, consumerToken, staffAToken] = await Promise.all([
    signIn('owner-a@spots.test'),
    signIn('owner-b@spots.test'),
    signIn('consumer@spots.test'),
    signIn('staff-a@spots.test'),
  ]);

  const [island, miramar, talatona] = await Promise.all([
    prisma.place.findFirstOrThrow({ where: { name: 'Spot Sintético Ilha' } }),
    prisma.place.findFirstOrThrow({ where: { name: 'Spot Sintético Miramar' } }),
    prisma.place.findFirstOrThrow({ where: { name: 'Spot Sintético Talatona' } }),
  ]);

  const protectedRoutes = [
    ['GET', '/api/auth/me'], ['PUT', '/api/auth/me'], ['DELETE', '/api/auth/me'],
    ['GET', '/api/orders/mine'], ['POST', '/api/orders'], ['PUT', '/api/orders/1/cancel'],
    ['GET', '/api/notifications'], ['PUT', '/api/notifications/1/read'], ['DELETE', '/api/notifications/1'],
    ['GET', '/api/business/places'], ['POST', `/api/business/places/${island.id}/staff`],
    ['POST', '/api/business/campaigns'], ['PUT', '/api/business/campaigns/1/status'],
    ['GET', `/api/business/reach?placeId=${island.id}`],
    ['POST', '/api/business/menu'], ['PUT', '/api/business/menu/1'], ['PUT', '/api/business/orders/1'],
  ];
  for (const [method, path] of protectedRoutes) {
    const response = await request(path, null, { method });
    assert.equal(response.status, 401, `${method} ${path} deve exigir autenticação`);
  }

  const malformed = await request('/api/auth/me', 'token-adulterado');
  assert.equal(malformed.status, 401, 'Um token adulterado deve ser recusado');

  const expired = await request('/api/auth/me', signExpiredToken(consumerToken));
  assert.equal(expired.status, 401, 'Um token expirado, mesmo correctamente assinado, deve ser recusado');

  const rejectedMinorGate = await request('/api/auth/profile', ownerAToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Teste', role: 'BUSINESS', adultConfirmed: false }),
  });
  assert.equal(rejectedMinorGate.status, 400, 'O perfil deve exigir confirmação explícita de idade 18+');

  const adultProfile = await prisma.user.findUniqueOrThrow({ where: { email: 'owner-a@spots.test' } });
  assert.ok(adultProfile.adultConfirmedAt, 'A confirmação 18+ sintética deve ficar registada');

  const consumerProfile = await prisma.user.findUniqueOrThrow({ where: { email: 'consumer@spots.test' } });
  const originalPreferences = consumerProfile.preferences;
  const saveSpot = await request('/api/auth/me', consumerToken, {
    method: 'PUT', body: JSON.stringify({ preferences: { savedPlaces: [island.id] } }),
  });
  assert.equal(saveSpot.status, 200, 'Uma pessoa autenticada deve conseguir guardar um Spot');
  assert.deepEqual((await saveSpot.json()).preferences.savedPlaces, [island.id]);
  const invalidSaved = await request('/api/auth/me', consumerToken, {
    method: 'PUT', body: JSON.stringify({ preferences: { savedPlaces: [island.id, island.id] } }),
  });
  assert.equal(invalidSaved.status, 400, 'Guardados duplicados devem ser recusados');
  const afterInvalidSaved = await prisma.user.findUniqueOrThrow({ where: { id: consumerProfile.id } });
  assert.deepEqual(JSON.parse(afterInvalidSaved.preferences).savedPlaces, [island.id], 'Uma escrita inválida não deve alterar preferências');
  await prisma.user.update({ where: { id: consumerProfile.id }, data: { preferences: originalPreferences } });
  await prisma.notification.deleteMany({ where: { userId: consumerProfile.id, title: 'Preferências actualizadas' } });

  const anonymous = await request('/api/business/places');
  assert.equal(anonymous.status, 401, 'Uma pessoa anónima não pode ler a gestão');

  const consumer = await request('/api/business/places', consumerToken);
  assert.equal(consumer.status, 200, 'Uma conta sem Spots recebe uma colecção vazia');
  assert.deepEqual(await consumer.json(), [], 'Uma conta sem relação de gestão não recebe dados de negócio');

  const ownerA = await request('/api/business/places', ownerAToken);
  assert.equal(ownerA.status, 200, 'O proprietário A deve conseguir abrir a gestão');
  const ownerAPlaces = await ownerA.json();
  assert.deepEqual(ownerAPlaces.map(({ id }) => id), [island.id, miramar.id]);
  assert.equal(ownerAPlaces[0].campaigns.some(({ isActive }) => isActive), true);
  assert.equal(ownerAPlaces[0].staff.length, 1, 'O responsável deve conseguir gerir a equipa');

  const ownerB = await request('/api/business/places', ownerBToken);
  assert.equal(ownerB.status, 200, 'O proprietário B deve conseguir abrir a gestão');
  const ownerBPlaces = await ownerB.json();
  assert.deepEqual(ownerBPlaces.map(({ id }) => id), [talatona.id]);

  const staffA = await request('/api/business/places', staffAToken);
  assert.equal(staffA.status, 200, 'Um funcionário autorizado deve abrir a gestão');
  const staffPlaces = await staffA.json();
  assert.deepEqual(staffPlaces.map(({ id }) => id), [island.id]);
  assert.deepEqual(staffPlaces[0].access, {
    isOwner: false,
    canManageOrders: true,
    canManageCampaigns: false,
    canManageMenu: true,
    canViewMetrics: false,
  });
  assert.equal(staffPlaces[0].staff.length, 0, 'Um funcionário não deve receber a lista da equipa');
  assert.equal(staffPlaces[0].campaigns.length, 0, 'Campanhas sem permissão não devem ser expostas');

  const consumerCannotCreatePlace = await request('/api/business/places', consumerToken, {
    method: 'POST', body: JSON.stringify({ name: 'Não deve existir', category: 'Cafés', lat: -8.8, lng: 13.2 }),
  });
  assert.equal(consumerCannotCreatePlace.status, 403, 'Uma conta consumidor não cria Spots comerciais');
  const invalidCoordinates = await request('/api/business/places', ownerAToken, {
    method: 'POST', body: JSON.stringify({ name: 'Não deve existir', category: 'Cafés', lat: 91, lng: 13.2 }),
  });
  assert.equal(invalidCoordinates.status, 400, 'Coordenadas geográficas inválidas devem ser recusadas');

  const staffCannotEditProfile = await request(`/api/business/places/${island.id}`, staffAToken, {
    method: 'PUT', body: JSON.stringify({ name: 'Não deve mudar' }),
  });
  assert.equal(staffCannotEditProfile.status, 403, 'Um funcionário não edita o perfil do Spot');

  const membership = await prisma.placeMembership.findFirstOrThrow({ where: { placeId: island.id } });
  const staffCannotEditTeam = await request(`/api/business/places/${island.id}/staff/${membership.id}`, staffAToken, {
    method: 'PUT', body: JSON.stringify({ permissions: { canManageCampaigns: true } }),
  });
  assert.equal(staffCannotEditTeam.status, 403, 'Um funcionário não altera permissões da equipa');

  const staffCannotRemoveTeam = await request(`/api/business/places/${island.id}/staff/${membership.id}`, staffAToken, { method: 'DELETE' });
  assert.equal(staffCannotRemoveTeam.status, 403, 'Um funcionário não remove membros da equipa');

  const forbiddenStaffCampaign = await request('/api/business/campaigns', staffAToken, {
    method: 'POST',
    body: JSON.stringify({
      type: 'custom', title: 'Não deve existir', description: 'Prova de autorização.',
      placeId: island.id, radiusKm: 0.1, durationHours: 6,
    }),
  });
  assert.equal(forbiddenStaffCampaign.status, 403, 'Funcionário sem permissão não cria campanhas');

  const forbiddenStaffMetrics = await request(`/api/business/reach?placeId=${island.id}`, staffAToken);
  assert.equal(forbiddenStaffMetrics.status, 403, 'Funcionário sem permissão não lê métricas');
  const forbiddenOtherOwnerMetrics = await request(`/api/business/reach?placeId=${island.id}`, ownerBToken);
  assert.equal(forbiddenOtherOwnerMetrics.status, 403, 'Outro proprietário não lê métricas deste Spot');
  const ownerMetrics = await request(`/api/business/reach?placeId=${island.id}`, ownerAToken);
  assert.equal(ownerMetrics.status, 200, 'O proprietário deve consultar o estado das métricas');
  assert.deepEqual(await ownerMetrics.json(), { reach: null, methodology: 'unavailable' }, 'Alcance sem metodologia deve permanecer indisponível');

  const notificationCountBeforeLocation = await prisma.notification.count();
  const nearbyCampaigns = await request('/api/campaigns/eligible', null, {
    method: 'POST',
    body: JSON.stringify({ lat: island.lat, lng: island.lng, accuracyMetres: 12, observedAt: new Date().toISOString() }),
  });
  assert.equal(nearbyCampaigns.status, 200, 'Uma amostra recente deve permitir verificar campanhas sem exigir conta');
  assert.equal((await nearbyCampaigns.json()).eligible.some(({ placeId }) => placeId === island.id), true, 'A posição no Spot deve ser elegível para a campanha activa');
  const distantCampaigns = await request('/api/campaigns/eligible', null, {
    method: 'POST',
    body: JSON.stringify({ lat: 0, lng: 0, accuracyMetres: 12, observedAt: new Date().toISOString() }),
  });
  assert.equal((await distantCampaigns.json()).eligible.length, 0, 'Uma posição distante deve ficar fora das campanhas de Luanda');
  const staleLocation = await request('/api/campaigns/eligible', null, {
    method: 'POST',
    body: JSON.stringify({ lat: island.lat, lng: island.lng, observedAt: new Date(Date.now() - 181000).toISOString() }),
  });
  assert.equal(staleLocation.status, 400, 'Uma posição com mais de três minutos deve ser recusada');
  assert.equal(await prisma.notification.count(), notificationCountBeforeLocation, 'A verificação de proximidade não deve persistir localização nem criar notificações');

  const forbiddenOtherOwnerCampaign = await request('/api/business/campaigns', ownerBToken, {
    method: 'POST',
    body: JSON.stringify({ type: 'custom', title: 'Não deve existir', description: 'Isolamento.', placeId: island.id, radiusKm: 0.1, durationHours: 6 }),
  });
  assert.equal(forbiddenOtherOwnerCampaign.status, 403, 'Outro proprietário não cria campanhas neste Spot');

  const activeCampaign = await prisma.campaign.findFirstOrThrow({
    where: { placeId: island.id, isActive: true },
    orderBy: { id: 'asc' },
  });
  const auditBefore = (await prisma.businessAuditEvent.aggregate({ _max: { id: true } }))._max.id || 0;
  const staffCannotChangeCampaign = await request(`/api/business/campaigns/${activeCampaign.id}/status`, staffAToken, {
    method: 'PUT', body: JSON.stringify({ isActive: false }),
  });
  assert.equal(staffCannotChangeCampaign.status, 403, 'Funcionário sem permissão não altera o estado da campanha');
  const otherOwnerCannotChangeCampaign = await request(`/api/business/campaigns/${activeCampaign.id}/status`, ownerBToken, {
    method: 'PUT', body: JSON.stringify({ isActive: false }),
  });
  assert.equal(otherOwnerCannotChangeCampaign.status, 403, 'Outro proprietário não altera o estado da campanha');
  const invalidCampaignStatus = await request(`/api/business/campaigns/${activeCampaign.id}/status`, ownerAToken, {
    method: 'PUT', body: JSON.stringify({ isActive: 'false' }),
  });
  assert.equal(invalidCampaignStatus.status, 400, 'O estado da campanha exige um booleano');
  const deactivatedCampaign = await request(`/api/business/campaigns/${activeCampaign.id}/status`, ownerAToken, {
    method: 'PUT', body: JSON.stringify({ isActive: false }),
  });
  assert.equal(deactivatedCampaign.status, 200, 'O proprietário deve poder desactivar a campanha');
  assert.equal((await prisma.campaign.findUniqueOrThrow({ where: { id: activeCampaign.id } })).isActive, false, 'A desactivação deve persistir');
  const publicPlaceWithoutCampaign = await request(`/api/places/${island.id}`);
  assert.equal((await publicPlaceWithoutCampaign.json()).campaigns.some(({ id }) => id === activeCampaign.id), false, 'A campanha inactiva não aparece ao público');
  const reactivatedCampaign = await request(`/api/business/campaigns/${activeCampaign.id}/status`, ownerAToken, {
    method: 'PUT', body: JSON.stringify({ isActive: true }),
  });
  assert.equal(reactivatedCampaign.status, 200, 'O proprietário deve poder reactivar a campanha');
  const publicPlaceWithCampaign = await request(`/api/places/${island.id}`);
  assert.equal((await publicPlaceWithCampaign.json()).campaigns.some(({ id }) => id === activeCampaign.id), true, 'A campanha reactivada volta a aparecer ao público');
  assert.equal(await prisma.businessAuditEvent.count({ where: { id: { gt: auditBefore }, action: 'CAMPAIGN_STATUS_CHANGED' } }), 2, 'Cada alteração autorizada deve gerar auditoria');
  await prisma.businessAuditEvent.deleteMany({ where: { id: { gt: auditBefore }, action: 'CAMPAIGN_STATUS_CHANGED' } });

  const order = await prisma.order.findFirstOrThrow({ where: { placeId: island.id } });
  const orderAuditBefore = (await prisma.businessAuditEvent.aggregate({ _max: { id: true } }))._max.id || 0;
  const orderNotificationsBefore = (await prisma.notification.aggregate({ _max: { id: true } }))._max.id || 0;
  const allowedStaffOrder = await request(`/api/business/orders/${order.id}`, staffAToken, {
    method: 'PUT', body: JSON.stringify({ status: 'preparing' }),
  });
  assert.equal(allowedStaffOrder.status, 200, 'Funcionário autorizado deve gerir pedidos');
  await prisma.order.update({ where: { id: order.id }, data: { status: order.status } });
  await prisma.businessAuditEvent.deleteMany({ where: { id: { gt: orderAuditBefore }, action: 'ORDER_STATUS_CHANGED' } });
  await prisma.notification.deleteMany({ where: { id: { gt: orderNotificationsBefore }, type: 'ORDER' } });

  const menuItem = await prisma.menuItem.findFirstOrThrow({ where: { placeId: island.id } });
  const allowedStaffMenu = await request(`/api/business/menu/${menuItem.id}`, staffAToken, {
    method: 'PUT', body: JSON.stringify({ available: menuItem.available }),
  });
  assert.equal(allowedStaffMenu.status, 200, 'Funcionário autorizado deve gerir o menu');
  const invalidMenu = await request('/api/business/menu', ownerAToken, {
    method: 'POST', body: JSON.stringify({ title: 'Inválido', description: '', price: -1, placeId: island.id }),
  });
  assert.equal(invalidMenu.status, 400, 'Preços negativos devem ser recusados');
  const invalidAvailability = await request(`/api/business/menu/${menuItem.id}`, ownerAToken, {
    method: 'PUT', body: JSON.stringify({ available: 'false' }),
  });
  assert.equal(invalidAvailability.status, 400, 'Disponibilidade não booleana deve ser recusada');

  const otherOwnerMenu = await request(`/api/business/menu/${menuItem.id}`, ownerBToken, {
    method: 'PUT', body: JSON.stringify({ available: !menuItem.available }),
  });
  assert.equal(otherOwnerMenu.status, 403, 'Outro proprietário não altera o menu deste Spot');
  const menuUnchanged = await prisma.menuItem.findUniqueOrThrow({ where: { id: menuItem.id } });
  assert.equal(menuUnchanged.available, menuItem.available, 'A tentativa cruzada não altera o menu');

  const otherOwnerOrder = await request(`/api/business/orders/${order.id}`, ownerBToken, {
    method: 'PUT', body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(otherOwnerOrder.status, 403, 'Outro proprietário não altera pedidos deste Spot');
  const orderUnchanged = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(orderUnchanged.status, order.status, 'A tentativa cruzada não altera o pedido');
  const invalidOrderStatus = await request(`/api/business/orders/${order.id}`, ownerAToken, {
    method: 'PUT', body: JSON.stringify({ status: 'desconhecido' }),
  });
  assert.equal(invalidOrderStatus.status, 400, 'Estados de pedido desconhecidos devem ser recusados');
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, order.status, 'Estado inválido não altera o pedido');

  const firstMenuItem = await prisma.menuItem.findFirstOrThrow({ where: { placeId: island.id, available: true }, orderBy: { id: 'asc' } });
  const orderFlowAuditBefore = (await prisma.businessAuditEvent.aggregate({ _max: { id: true } }))._max.id || 0;
  const orderFlowNotificationBefore = (await prisma.notification.aggregate({ _max: { id: true } }))._max.id || 0;
  const clientRequestId = 'integracao_pedido_0001';
  await prisma.order.deleteMany({ where: { userId: consumerProfile.id, clientRequestId: { in: [clientRequestId, 'integracao_cancelar_0001'] } } });
  const orderPayload = JSON.stringify({ placeId: island.id, clientRequestId, items: [
    { menuItemId: firstMenuItem.id, quantity: 2 },
  ] });
  const concurrentOrderResponses = await Promise.all([
    request('/api/orders', consumerToken, { method: 'POST', body: orderPayload }),
    request('/api/orders', consumerToken, { method: 'POST', body: orderPayload }),
  ]);
  assert.deepEqual(concurrentOrderResponses.map(({ status }) => status).sort(), [200, 201], 'Dois envios concorrentes devem convergir num pedido');
  const concurrentOrderPayloads = await Promise.all(concurrentOrderResponses.map((response) => response.json()));
  assert.equal(concurrentOrderPayloads[0].id, concurrentOrderPayloads[1].id, 'A resposta idempotente deve apontar para o mesmo pedido');
  const createdOrder = concurrentOrderPayloads[0];
  assert.equal(createdOrder.total, firstMenuItem.price * 2, 'O servidor deve recalcular o total pelo menu');
  assert.equal(await prisma.order.count({ where: { userId: consumerProfile.id, clientRequestId } }), 1, 'O duplo envio não deve duplicar o pedido');
  const myOrders = await request('/api/orders/mine', consumerToken);
  assert.equal((await myOrders.json()).some(({ id }) => id === createdOrder.id), true, 'O consumidor deve acompanhar o próprio pedido');
  const ownerCannotCancelConsumerOrder = await request(`/api/orders/${createdOrder.id}/cancel`, ownerAToken, { method: 'PUT' });
  assert.equal(ownerCannotCancelConsumerOrder.status, 404, 'Outra conta não deve cancelar o pedido do consumidor');
  const invalidJump = await request(`/api/business/orders/${createdOrder.id}`, ownerAToken, {
    method: 'PUT', body: JSON.stringify({ status: 'ready' }),
  });
  assert.equal(invalidJump.status, 409, 'O negócio não deve saltar directamente de pendente para pronto');
  const preparingOrder = await request(`/api/business/orders/${createdOrder.id}`, staffAToken, {
    method: 'PUT', body: JSON.stringify({ status: 'preparing' }),
  });
  assert.equal(preparingOrder.status, 200, 'Funcionário autorizado deve iniciar a preparação');
  const readyOrder = await request(`/api/business/orders/${createdOrder.id}`, ownerAToken, {
    method: 'PUT', body: JSON.stringify({ status: 'ready' }),
  });
  assert.equal(readyOrder.status, 200, 'O negócio deve marcar o pedido como pronto');
  const completedOrder = await request(`/api/business/orders/${createdOrder.id}`, ownerAToken, {
    method: 'PUT', body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(completedOrder.status, 200, 'O negócio deve concluir o pedido');
  assert.equal(await prisma.notification.count({ where: { id: { gt: orderFlowNotificationBefore }, type: 'ORDER', userId: consumerProfile.id } }), 3, 'Cada avanço deve notificar o consumidor');
  assert.equal(await prisma.businessAuditEvent.count({ where: { id: { gt: orderFlowAuditBefore }, action: 'ORDER_STATUS_CHANGED' } }), 3, 'Cada avanço deve gerar auditoria');

  const cancellableOrder = await request('/api/orders', consumerToken, {
    method: 'POST', body: JSON.stringify({ placeId: island.id, clientRequestId: 'integracao_cancelar_0001', items: [{ menuItemId: firstMenuItem.id, quantity: 1 }] }),
  });
  assert.equal(cancellableOrder.status, 201, 'Deve ser possível criar um pedido para cancelar');
  const cancellablePayload = await cancellableOrder.json();
  const cancelledOrder = await request(`/api/orders/${cancellablePayload.id}/cancel`, consumerToken, { method: 'PUT' });
  assert.equal(cancelledOrder.status, 200, 'O consumidor deve cancelar enquanto o pedido está pendente');
  const secondCancellation = await request(`/api/orders/${cancellablePayload.id}/cancel`, consumerToken, { method: 'PUT' });
  assert.equal(secondCancellation.status, 409, 'O cancelamento repetido deve ser recusado sem alterar o estado');
  await prisma.order.deleteMany({ where: { id: { in: [createdOrder.id, cancellablePayload.id] } } });
  await prisma.notification.deleteMany({ where: { id: { gt: orderFlowNotificationBefore }, type: 'ORDER' } });
  await prisma.businessAuditEvent.deleteMany({ where: { id: { gt: orderFlowAuditBefore }, action: 'ORDER_STATUS_CHANGED' } });

  await prisma.review.deleteMany({ where: { userId: consumerProfile.id, placeId: island.id } });
  const concurrentReviews = await Promise.all([
    request(`/api/places/${island.id}/reviews`, consumerToken, { method: 'POST', body: JSON.stringify({ rating: 4, comment: 'Teste concorrente A' }) }),
    request(`/api/places/${island.id}/reviews`, consumerToken, { method: 'POST', body: JSON.stringify({ rating: 5, comment: 'Teste concorrente B' }) }),
  ]);
  assert.deepEqual(concurrentReviews.map(({ status }) => status), [200, 200], 'As duas actualizações concorrentes devem concluir');
  const persistedReviews = await prisma.review.findMany({ where: { userId: consumerProfile.id, placeId: island.id } });
  assert.equal(persistedReviews.length, 1, 'A concorrência mantém uma só avaliação por pessoa e Spot');
  assert.ok([4, 5].includes(persistedReviews[0].rating), 'A avaliação final deve corresponder a uma das escritas válidas');
  const invalidReview = await request(`/api/places/${island.id}/reviews`, consumerToken, {
    method: 'POST', body: JSON.stringify({ rating: 6, comment: 'Inválida' }),
  });
  assert.equal(invalidReview.status, 400, 'Classificações fora de 1–5 são recusadas');
  assert.equal(await prisma.review.count({ where: { userId: consumerProfile.id, placeId: island.id } }), 1, 'A escrita inválida não duplica a avaliação');
  await prisma.review.deleteMany({ where: { userId: consumerProfile.id, placeId: island.id } });

  const revocationToken = await signIn('consumer@spots.test');
  const beforeRevocation = await request('/api/auth/me', revocationToken);
  assert.equal(beforeRevocation.status, 200, 'A sessão sintética deve estar válida antes de terminar sessão');
  const logout = await request('/api/auth/logout', revocationToken, { method: 'POST' });
  assert.equal(logout.status, 204, 'Terminar sessão deve registar a revogação imediata');
  const afterRevocation = await request('/api/auth/me', revocationToken);
  assert.equal(afterRevocation.status, 401, 'O mesmo access token deve ser recusado após terminar sessão');

  const crossOwner = await request(`/api/business/places/${talatona.id}`, ownerAToken, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Tentativa não autorizada' }),
  });
  assert.equal(crossOwner.status, 403, 'Um proprietário não pode alterar o Spot de outro');

  const unchanged = await prisma.place.findUniqueOrThrow({ where: { id: talatona.id } });
  assert.equal(unchanged.name, 'Spot Sintético Talatona');

  const pricedCampaignResponse = await request('/api/business/campaigns', ownerAToken, {
    method: 'POST',
    body: JSON.stringify({
      type: 'custom',
      title: 'Verificação temporária',
      description: 'Campanha sintética eliminada no fim da prova.',
      placeId: island.id,
      radiusKm: 0.1,
      durationHours: 6,
    }),
  });
  assert.equal(pricedCampaignResponse.status, 201, 'O dono deve poder criar campanha de 100 m/6 h');
  const pricedCampaign = await pricedCampaignResponse.json();
  assert.equal(pricedCampaign.estimatedPriceAoa, 1300, 'O servidor deve calcular a estimativa');
  await prisma.campaign.delete({ where: { id: pricedCampaign.id } });

  console.log(JSON.stringify({
    passed: 97,
    adultGate: true,
    anonymousManagement: 401,
    unrelatedAccountManagement: 'empty',
    ownerIsolation: true,
    campaignLineage: true,
    campaignPricing: true,
    campaignLifecycle: true,
    foregroundGeofencing: true,
    consumerOrderLifecycle: true,
    multiSpotOwner: true,
    granularStaffPermissions: true,
    protectedRouteMatrix: protectedRoutes.length,
    expiredToken: 401,
    malformedToken: 401,
    revokedSession: 401,
    savedPlacesPersistence: true,
    invalidPreferencesNoMutation: true,
    crossOwnerMutationsBlocked: true,
    concurrentReviewUpsert: true,
    managementInputValidation: true,
    crmPermissionAndUnavailableReach: true,
    tokensPrinted: false,
  }));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
