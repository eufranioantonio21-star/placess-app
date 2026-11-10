const test = require('node:test');
const assert = require('node:assert/strict');
const { canBusinessTransition, parseOrderRequest, parseOrderStatus } = require('./orders');

test('normaliza um pedido simples com quantidades limitadas', () => {
  assert.deepEqual(parseOrderRequest({
    placeId: '3', clientRequestId: 'pedido_local_123456', items: [{ menuItemId: '8', quantity: '2' }],
  }).value, { placeId: 3, clientRequestId: 'pedido_local_123456', items: [{ menuItemId: 8, quantity: 2 }] });
});

test('recusa carrinho vazio, itens repetidos e quantidades inválidas', () => {
  assert.ok(parseOrderRequest({ placeId: 1, clientRequestId: 'pedido_local_123456', items: [] }).error);
  assert.ok(parseOrderRequest({ placeId: 1, clientRequestId: 'pedido_local_123456', items: [{ menuItemId: 1, quantity: 1 }, { menuItemId: 1, quantity: 2 }] }).error);
  assert.ok(parseOrderRequest({ placeId: 1, clientRequestId: 'pedido_local_123456', items: [{ menuItemId: 1, quantity: 21 }] }).error);
});

test('impõe a progressão pendente, preparação, pronto e concluído', () => {
  assert.equal(canBusinessTransition('pending', 'preparing'), true);
  assert.equal(canBusinessTransition('preparing', 'ready'), true);
  assert.equal(canBusinessTransition('ready', 'completed'), true);
  assert.equal(canBusinessTransition('pending', 'completed'), false);
  assert.equal(parseOrderStatus('cancelled').value, 'cancelled');
});
