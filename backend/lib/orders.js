const ORDER_STATUSES = Object.freeze(['pending', 'preparing', 'ready', 'completed', 'cancelled']);
const BUSINESS_TRANSITIONS = Object.freeze({ pending: 'preparing', preparing: 'ready', ready: 'completed' });

function parseOrderRequest(input = {}) {
  const placeId = Number(input.placeId);
  const clientRequestId = typeof input.clientRequestId === 'string' ? input.clientRequestId.trim() : '';
  const items = input.items;
  if (!Number.isInteger(placeId) || placeId <= 0) return { error: 'Spot inválido' };
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(clientRequestId)) return { error: 'Identificador do pedido inválido' };
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) return { error: 'O pedido deve ter entre 1 e 20 itens' };

  const normalisedItems = items.map((item) => ({
    menuItemId: Number(item?.menuItemId),
    quantity: Number(item?.quantity),
  }));
  if (normalisedItems.some(({ menuItemId, quantity }) => (
    !Number.isInteger(menuItemId) || menuItemId <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 20
  ))) return { error: 'Itens ou quantidades inválidos' };
  if (new Set(normalisedItems.map(({ menuItemId }) => menuItemId)).size !== normalisedItems.length) {
    return { error: 'Cada item deve aparecer apenas uma vez' };
  }
  return { value: { placeId, clientRequestId, items: normalisedItems } };
}

function parseOrderStatus(value) {
  return ORDER_STATUSES.includes(value) ? { value } : { error: 'Estado do pedido inválido' };
}

function canBusinessTransition(current, next) {
  return BUSINESS_TRANSITIONS[current] === next;
}

module.exports = { BUSINESS_TRANSITIONS, ORDER_STATUSES, canBusinessTransition, parseOrderRequest, parseOrderStatus };
