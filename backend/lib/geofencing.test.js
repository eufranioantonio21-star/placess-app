const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyCampaignPosition, distanceMetres, parseLocationSample } = require('./geofencing');

test('calcula uma distância geográfica coerente em Luanda', () => {
  const metres = distanceMetres({ lat: -8.838333, lng: 13.234444 }, { lat: -8.838333, lng: 13.243544 });
  assert.ok(metres > 995 && metres < 1005);
});

test('distingue dentro, limite e fora sem usar a precisão como alcance adicional', () => {
  const place = { lat: 0, lng: 0 };
  assert.equal(classifyCampaignPosition({ lat: 0, lng: 0.004 }, place, 1).status, 'inside');
  const boundaryLat = 1 / 111.195;
  assert.equal(classifyCampaignPosition({ lat: boundaryLat, lng: 0 }, place, 1).status, 'boundary');
  assert.equal(classifyCampaignPosition({ lat: 0.02, lng: 0 }, place, 1).status, 'outside');
});

test('aceita apenas amostras válidas dos últimos três minutos', () => {
  const now = Date.parse('2026-11-04T12:00:00.000Z');
  assert.ok(parseLocationSample({ lat: -8.83, lng: 13.23, accuracyMetres: 15, observedAt: '2026-11-04T11:57:01.000Z' }, now).value);
  assert.equal(parseLocationSample({ lat: -8.83, lng: 13.23, observedAt: '2026-11-04T11:56:59.000Z' }, now).error, 'A localização já não é recente');
  assert.equal(parseLocationSample({ lat: 91, lng: 13.23, observedAt: '2026-11-04T12:00:00.000Z' }, now).error, 'Coordenadas inválidas');
});
