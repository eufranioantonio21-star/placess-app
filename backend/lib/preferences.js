const ALERT_KEYS = Object.freeze(['restaurants', 'coffee', 'happyHour', 'cinema', 'newPlaces', 'nearbyCampaigns']);

function parsePreferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Preferências inválidas' };
  }

  const savedInput = input.savedPlaces ?? [];
  if (!Array.isArray(savedInput) || savedInput.length > 500) {
    return { error: 'A lista de Spots guardados é inválida' };
  }
  const savedPlaces = [...new Set(savedInput.filter((id) => Number.isInteger(id) && id > 0))];
  if (savedPlaces.length !== savedInput.length) {
    return { error: 'Os Spots guardados devem ter identificadores válidos e únicos' };
  }

  const value = { savedPlaces };
  if (input.alerts !== undefined) {
    const alerts = input.alerts;
    if (!alerts || typeof alerts !== 'object' || Array.isArray(alerts)) {
      return { error: 'Preferências de alertas inválidas' };
    }
    const alertPreferences = alerts.preferences ?? {};
    const customCategories = alerts.customCategories ?? [];
    if (!alertPreferences || typeof alertPreferences !== 'object' || Array.isArray(alertPreferences)
      || !Array.isArray(customCategories) || customCategories.length > 20) {
      return { error: 'Preferências de alertas inválidas' };
    }
    const invalidToggle = Object.entries(alertPreferences)
      .some(([key, enabled]) => !ALERT_KEYS.includes(key) || typeof enabled !== 'boolean');
    if (invalidToggle) return { error: 'Preferências de alertas inválidas' };

    const normalisedCategories = customCategories.map((category) => ({
      id: typeof category?.id === 'string' ? category.id.trim().slice(0, 80) : '',
      name: typeof category?.name === 'string' ? category.name.trim().slice(0, 80) : '',
      active: category?.active === true,
    }));
    if (normalisedCategories.some(({ id, name }) => !id || !name)) {
      return { error: 'As categorias personalizadas são inválidas' };
    }
    value.alerts = {
      preferences: Object.fromEntries(ALERT_KEYS.map((key) => [key, alertPreferences[key] === true])),
      customCategories: normalisedCategories,
    };
  }

  return { value };
}

module.exports = { ALERT_KEYS, parsePreferences };
