const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCampaignPriceAoa, isValidCampaignRadius, parseCampaignInput } = require('./campaigns');

test('aceita raios de 100 m a 10 km em passos de 100 m', () => {
  for (const radiusKm of [0.1, 0.5, 1, 4, 7.3, 10]) {
    assert.equal(isValidCampaignRadius(radiusKm), true);
    assert.equal(parseCampaignInput({ type: 'discount', title: 'Teste', description: 'Teste local', placeId: 1, radiusKm, durationHours: 24 }).value.radiusKm, radiusKm);
  }
  for (const radiusKm of [0, 0.05, 10.1, 100]) {
    assert.equal(isValidCampaignRadius(radiusKm), false);
  }
});

test('calcula estimativa no servidor por raio e duração', () => {
  assert.equal(calculateCampaignPriceAoa(0.1, 6), 1300);
  assert.equal(calculateCampaignPriceAoa(1, 24), 10000);
  assert.equal(calculateCampaignPriceAoa(4, 48), 45000);
  assert.equal(calculateCampaignPriceAoa(10, 168), 378000);
});

test('valida tipo, conteúdo e Spot da campanha', () => {
  const validTime = { radiusKm: 1, durationHours: 24 };
  assert.ok(parseCampaignInput({ type: 'qualquer', title: 'Teste', description: 'Mensagem', placeId: 1, ...validTime }).error);
  assert.ok(parseCampaignInput({ type: 'custom', title: '', description: 'Mensagem', placeId: 1, ...validTime }).error);
  assert.ok(parseCampaignInput({ type: 'custom', title: 'Teste', description: '', placeId: 1, ...validTime }).error);
  assert.ok(parseCampaignInput({ type: 'custom', title: 'Teste', description: 'Mensagem', placeId: 0, ...validTime }).error);
  assert.ok(parseCampaignInput({ type: 'custom', title: 'Teste', description: 'Mensagem', placeId: 1, radiusKm: 1, durationHours: 5 }).error);
  assert.ok(parseCampaignInput({ type: 'custom', title: 'Teste', description: 'Mensagem', placeId: 1, radiusKm: 1, durationHours: 721 }).error);
});
