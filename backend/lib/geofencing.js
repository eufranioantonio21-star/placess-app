const MAX_LOCATION_AGE_MS = 3 * 60 * 1000;
const BOUNDARY_TOLERANCE_METRES = 1;

function toRadians(value) {
  return value * Math.PI / 180;
}

function distanceMetres(from, to) {
  const earthRadiusMetres = 6371008.8;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMetres * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseLocationSample(input, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Localização inválida' };
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const accuracyMetres = input.accuracyMetres === undefined ? null : Number(input.accuracyMetres);
  const observedAt = new Date(input.observedAt);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: 'Coordenadas inválidas' };
  }
  if ((accuracyMetres !== null && (!Number.isFinite(accuracyMetres) || accuracyMetres < 0 || accuracyMetres > 10000))
    || Number.isNaN(observedAt.getTime())) {
    return { error: 'Amostra de localização inválida' };
  }
  const ageMs = now - observedAt.getTime();
  if (ageMs < -30000 || ageMs > MAX_LOCATION_AGE_MS) return { error: 'A localização já não é recente' };
  return { value: { lat, lng, accuracyMetres, observedAt, ageMs } };
}

function classifyCampaignPosition(sample, place, radiusKm) {
  const distance = distanceMetres(sample, place);
  const radiusMetres = radiusKm * 1000;
  const delta = distance - radiusMetres;
  const status = Math.abs(delta) <= BOUNDARY_TOLERANCE_METRES
    ? 'boundary'
    : delta < 0 ? 'inside' : 'outside';
  return {
    status,
    eligible: status !== 'outside',
    distanceMetres: Math.round(distance),
    radiusMetres: Math.round(radiusMetres),
  };
}

module.exports = {
  BOUNDARY_TOLERANCE_METRES,
  MAX_LOCATION_AGE_MS,
  classifyCampaignPosition,
  distanceMetres,
  parseLocationSample,
};
