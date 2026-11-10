const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePreferences } = require('./preferences');

test('normaliza guardados e alertas aprovados', () => {
  const result = parsePreferences({
    savedPlaces: [1, 2],
    alerts: { preferences: { restaurants: true }, customCategories: [{ id: 'praia', name: 'Praia', active: true }] },
  });
  assert.deepEqual(result.value.savedPlaces, [1, 2]);
  assert.equal(result.value.alerts.preferences.restaurants, true);
  assert.equal(result.value.alerts.preferences.coffee, false);
});

test('recusa identificadores duplicados ou inválidos', () => {
  assert.equal(parsePreferences({ savedPlaces: [1, 1] }).error, 'Os Spots guardados devem ter identificadores válidos e únicos');
  assert.equal(parsePreferences({ savedPlaces: ['1'] }).error, 'Os Spots guardados devem ter identificadores válidos e únicos');
});

test('limita categorias personalizadas', () => {
  const categories = Array.from({ length: 21 }, (_, id) => ({ id: String(id), name: String(id), active: true }));
  assert.equal(parsePreferences({ alerts: { customCategories: categories } }).error, 'Preferências de alertas inválidas');
});
