const SPOT_CATEGORIES = [
  'Restaurantes',
  'Cafés',
  'Bares e noite',
  'Praias',
  'Cultura e lazer',
  'Compras',
  'Serviços',
  'Eventos',
];

const CATEGORY_SET = new Set(SPOT_CATEGORIES);

function isValidSpotCategory(category) {
  return typeof category === 'string' && CATEGORY_SET.has(category);
}

module.exports = { SPOT_CATEGORIES, isValidSpotCategory };
