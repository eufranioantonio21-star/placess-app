const { ORDER_STATUSES, parseOrderStatus } = require('./orders');

function cleanText(value, maximum) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function parseCoordinates(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: 'Localização inválida' };
  }
  return { value: { lat: latitude, lng: longitude } };
}

function isApprovedImageUrl(value, supabaseUrl = process.env.SUPABASE_URL) {
  if (!value) return true;
  try {
    const candidate = new URL(value);
    const storageOrigin = new URL(supabaseUrl).origin;
    return candidate.protocol === 'https:'
      && candidate.origin === storageOrigin
      && candidate.pathname.startsWith('/storage/v1/object/public/spots-media/');
  } catch {
    return false;
  }
}

function isApprovedProfileImage(value, supabaseUrl = process.env.SUPABASE_URL) {
  if (value === null || value === '') return true;
  if (typeof value !== 'string') return false;

  const candidate = value.trim();
  if (candidate.length > 1_500_000) return false;
  if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(candidate)) {
    return true;
  }
  return isApprovedImageUrl(candidate, supabaseUrl);
}

function parseMenuItem(input = {}) {
  const title = cleanText(input.title, 120);
  const description = cleanText(input.description, 600);
  const price = Number(input.price);
  const placeId = Number(input.placeId);
  const image = cleanText(input.image, 1000) || null;
  if (!title) return { error: 'O nome do item é obrigatório' };
  if (!Number.isFinite(price) || price < 0 || price > 100000000) return { error: 'Preço inválido' };
  if (!Number.isInteger(placeId) || placeId <= 0) return { error: 'Spot inválido' };
  if (image && !isApprovedImageUrl(image)) {
    return { error: 'A imagem deve pertencer ao armazenamento oficial da SPOTS' };
  }
  return { value: { title, description, price, image, placeId } };
}

function parseAvailability(value) {
  return typeof value === 'boolean' ? { value } : { error: 'Disponibilidade inválida' };
}

module.exports = {
  ORDER_STATUSES,
  isApprovedImageUrl,
  isApprovedProfileImage,
  parseCoordinates,
  parseMenuItem,
  parseAvailability,
  parseOrderStatus,
};
