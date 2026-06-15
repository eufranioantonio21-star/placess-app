import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';

const OrderCard = ({ order, onMarkReady }) => {
  const items = (() => {
    try {
      const parsed = JSON.parse(order.itemsJson);
      return parsed.map(i => `${i.quantity}x ${i.title}`).join(', ');
    } catch {
      return 'Items';
    }
  })();

  const color = order.status === 'pending' ? '#ef4444' : '#f59e0b';
  
  return (
    <div className="clay-card" style={{ padding: '12px', marginBottom: '12px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main)' }}>Order #{order.id}</h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>Take Away</p>
        </div>
        <div style={{ background: color + '22', color: color, padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
          {order.status.toUpperCase()}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-main)', marginBottom: '12px', fontWeight: 500 }}>
        {items}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {order.status === 'pending' && (
          <button className="btn-touch" onClick={() => onMarkReady(order.id)} style={{ flex: 1, padding: '6px', background: 'var(--color-primary)', color: 'var(--color-background)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12px' }}>
            Mark Ready
          </button>
        )}
      </div>
    </div>
  );
};

const OrderManager = ({ place, onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const lat = place?.lat || 38.7223;
  const lng = place?.lng || -9.1393;
  const orders = place?.orders || [];
  const activeOrders = orders.filter(o => o.status !== 'completed');

  const handleMarkReady = async (orderId) => {
    setIsUpdating(true);
    try {
      const res = await fetchWithAuth(`/api/business/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ready' })
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Half: Map */}
      <div style={{ flex: '1 1 40%', position: 'relative', overflow: 'hidden', background: 'var(--color-background)' }}>
        <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
        </MapContainer>
        
        {/* Restaurant Pin overlay */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '24px', height: '24px', background: 'var(--color-primary)', borderRadius: '50%', border: '4px solid white', boxShadow: 'var(--shadow-floating)', zIndex: 1000, pointerEvents: 'none'
        }} />

        <div style={{
          position: 'absolute', top: 'var(--safe-area)', left: '24px', zIndex: 1000,
          background: 'var(--color-primary)', padding: '8px 16px', borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-floating)', fontWeight: 800, fontSize: '14px', color: 'var(--color-background)'
        }}>
          Live Tracking ({activeOrders.length} Active)
        </div>
      </div>

      {/* Bottom Half: Order List */}
      <div style={{ flex: '1 1 60%', background: 'var(--color-background)', padding: '24px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 20px 0', color: 'var(--color-text-main)' }}>Active Orders</h2>
        
        {activeOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>No active orders yet.</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>When customers order, they will appear here.</p>
          </div>
        ) : (
          activeOrders.map(order => (
            <OrderCard key={order.id} order={order} onMarkReady={handleMarkReady} />
          ))
        )}
      </div>
    </div>
  );
};

export default OrderManager;
