const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isApprovedImageUrl,
  isApprovedProfileImage,
  parseCoordinates,
  parseMenuItem,
  parseAvailability,
  parseOrderStatus,
} = require('./management-input');

test('valida coordenadas geográficas', () => {
  assert.deepEqual(parseCoordinates('-8.8', '13.2').value, { lat: -8.8, lng: 13.2 });
  assert.equal(parseCoordinates(91, 13).error, 'Localização inválida');
});

test('normaliza um item de menu válido', () => {
  assert.deepEqual(parseMenuItem({ title: ' Café ', description: ' Quente ', price: '1200', placeId: '2', image: '' }).value,
    { title: 'Café', description: 'Quente', price: 1200, image: null, placeId: 2 });
});

test('recusa preço, imagem, disponibilidade e estado inválidos', () => {
  assert.equal(parseMenuItem({ title: 'Item', price: -1, placeId: 1 }).error, 'Preço inválido');
  assert.equal(parseMenuItem({ title: 'Item', price: 1, placeId: 1, image: 'https://tracker.example/item.jpg' }).error,
    'A imagem deve pertencer ao armazenamento oficial da SPOTS');
  assert.equal(parseAvailability('true').error, 'Disponibilidade inválida');
  assert.equal(parseOrderStatus('desconhecido').error, 'Estado do pedido inválido');
});

test('aceita apenas imagens públicas do armazenamento oficial', () => {
  const supabaseUrl = 'https://project.supabase.co';
  assert.equal(isApprovedImageUrl(
    'https://project.supabase.co/storage/v1/object/public/spots-media/menu/item.webp',
    supabaseUrl,
  ), true);
  assert.equal(isApprovedImageUrl('http://project.supabase.co/storage/v1/object/public/spots-media/item.webp', supabaseUrl), false);
  assert.equal(isApprovedImageUrl('https://project.supabase.co/storage/v1/object/public/other/item.webp', supabaseUrl), false);
  assert.equal(isApprovedImageUrl('https://tracker.example/item.webp', supabaseUrl), false);
});

test('aceita avatares raster locais limitados e recusa SVG ou servidores externos', () => {
  const supabaseUrl = 'https://project.supabase.co';
  assert.equal(isApprovedProfileImage('data:image/png;base64,iVBORw0KGgo=', supabaseUrl), true);
  assert.equal(isApprovedProfileImage('data:image/svg+xml;base64,PHN2Zz4=', supabaseUrl), false);
  assert.equal(isApprovedProfileImage('https://tracker.example/avatar.jpg', supabaseUrl), false);
  assert.equal(isApprovedProfileImage(
    'https://project.supabase.co/storage/v1/object/public/spots-media/avatars/user.webp',
    supabaseUrl,
  ), true);
});
