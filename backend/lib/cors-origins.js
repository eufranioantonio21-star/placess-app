function parseAllowedOrigins(value) {
  return new Set(String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean));
}

function createCorsOriginGuard(value) {
  const allowedOrigins = parseAllowedOrigins(value);
  return (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origem não autorizada'));
  };
}

module.exports = { createCorsOriginGuard, parseAllowedOrigins };
