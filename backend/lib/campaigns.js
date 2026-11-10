const CAMPAIGN_RADIUS_MIN_KM = 0.1;
const CAMPAIGN_RADIUS_MAX_KM = 10;
const CAMPAIGN_DURATION_MIN_HOURS = 6;
const CAMPAIGN_DURATION_MAX_HOURS = 30 * 24;
const CAMPAIGN_TYPES = Object.freeze(['discount', 'reward', 'happy_hour', 'custom']);

function isValidCampaignRadius(radiusKm) {
  return Number.isFinite(radiusKm)
    && radiusKm >= CAMPAIGN_RADIUS_MIN_KM
    && radiusKm <= CAMPAIGN_RADIUS_MAX_KM
    && Math.abs(radiusKm * 10 - Math.round(radiusKm * 10)) < Number.EPSILON * 10;
}

function campaignDailyPriceAoa(radiusKm) {
  if (radiusKm <= 0.25) return 2500;
  if (radiusKm <= 0.5) return 5000;
  if (radiusKm <= 1) return 10000;
  if (radiusKm <= 4) return 25000;
  return 60000;
}

function calculateCampaignPriceAoa(radiusKm, durationHours) {
  if (!isValidCampaignRadius(radiusKm)) throw new Error('Raio de campanha inválido');
  if (!Number.isInteger(durationHours) || durationHours < CAMPAIGN_DURATION_MIN_HOURS || durationHours > CAMPAIGN_DURATION_MAX_HOURS) {
    throw new Error('Duração de campanha inválida');
  }
  const durationFactor = durationHours < 24 ? 0.5 : durationHours / 24;
  const durationDiscount = durationHours >= 48 ? 0.9 : 1;
  return Math.round((campaignDailyPriceAoa(radiusKm) * durationFactor * durationDiscount) / 100) * 100;
}

function parseCampaignInput(body = {}) {
  const type = typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const placeId = Number(body.placeId);
  const radiusKm = Number(body.radiusKm);
  const durationHours = Number(body.durationHours);

  if (!CAMPAIGN_TYPES.includes(type)) return { error: 'Tipo de campanha inválido' };
  if (!title || title.length > 80) return { error: 'O título da campanha deve ter entre 1 e 80 caracteres' };
  if (!description || description.length > 500) return { error: 'A mensagem da campanha deve ter entre 1 e 500 caracteres' };
  if (!Number.isInteger(placeId) || placeId <= 0) return { error: 'Spot inválido' };
  if (!isValidCampaignRadius(radiusKm)) return { error: 'O raio deve estar entre 100 m e 10 km, em passos de 100 m' };
  if (!Number.isInteger(durationHours) || durationHours < CAMPAIGN_DURATION_MIN_HOURS || durationHours > CAMPAIGN_DURATION_MAX_HOURS) {
    return { error: 'A duração deve estar entre 6 horas e 30 dias' };
  }

  return {
    value: {
      type,
      title,
      description,
      placeId,
      radiusKm,
      durationHours,
      estimatedPriceAoa: calculateCampaignPriceAoa(radiusKm, durationHours),
    },
  };
}

module.exports = {
  CAMPAIGN_DURATION_MAX_HOURS,
  CAMPAIGN_DURATION_MIN_HOURS,
  CAMPAIGN_RADIUS_MAX_KM,
  CAMPAIGN_RADIUS_MIN_KM,
  CAMPAIGN_TYPES,
  calculateCampaignPriceAoa,
  isValidCampaignRadius,
  parseCampaignInput,
};
