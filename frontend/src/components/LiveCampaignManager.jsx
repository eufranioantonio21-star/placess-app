import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';

const LiveCampaignManager = ({ place }) => {
  const { fetchWithAuth } = useAuth();
  const [radius, setRadius] = useState(() => parseInt(localStorage.getItem(`live_radius_${place?.id}`)) || 500);
  const [offerType, setOfferType] = useState(() => localStorage.getItem(`live_offerType_${place?.id}`) || 'Discount');
  const [discountPercentage, setDiscountPercentage] = useState(() => parseInt(localStorage.getItem(`live_discount_${place?.id}`)) || 20);
  const [message, setMessage] = useState(() => localStorage.getItem(`live_message_${place?.id}`) || 'Flash Sale! 20% off all main courses for the next hour. Come on in!');

  useEffect(() => {
    if (!place?.id) return;
    localStorage.setItem(`live_radius_${place.id}`, radius);
    localStorage.setItem(`live_offerType_${place.id}`, offerType);
    localStorage.setItem(`live_discount_${place.id}`, discountPercentage);
    localStorage.setItem(`live_message_${place.id}`, message);
  }, [radius, offerType, discountPercentage, message, place?.id]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [potentialReach, setPotentialReach] = useState(0);

  const lat = place?.lat || 38.7223;
  const lng = place?.lng || -9.1393;

  // Fetch potential reach when radius changes
  useEffect(() => {
    const fetchReach = async () => {
      try {
        const res = await fetchWithAuth(`/api/business/reach?radius=${radius}`);
        if (res.ok) {
          const data = await res.json();
          setPotentialReach(data.reach);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    // Simple debounce
    const timeoutId = setTimeout(() => {
      fetchReach();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [radius, fetchWithAuth]);

  const handleLaunch = async () => {
    if (!place) return;
    setIsLaunching(true);
    try {
      const res = await fetchWithAuth('/api/business/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          type: offerType,
          title: offerType === 'Discount' ? `${discountPercentage}% Off` : offerType,
          description: message,
          placeId: place.id
        })
      });
      if (res.ok) {
        setLaunched(true);
        setTimeout(() => setLaunched(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Half: Live Map with Reach Bubble */}
      <div style={{ flex: '1 1 45%', position: 'relative', overflow: 'hidden', background: 'var(--color-background)' }}>
        <MapContainer center={[lat, lng]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={true} dragging={true} scrollWheelZoom={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: 'var(--color-accent)', fillColor: 'var(--color-accent)', fillOpacity: 0.2 }} />
          
          <Marker 
            position={[lat, lng]} 
            icon={L.divIcon({
              html: `
                <div class="animate-float" style="
                  width: 40px;
                  height: 40px;
                  background: var(--color-surface);
                  border-radius: 50%;
                  border: 2px solid var(--color-primary);
                  box-shadow: 0 4px 12px rgba(58, 255, 21, 0.4);
                  background-image: ${place?.photoUrl ? `url('${place.photoUrl}')` : `url('https://ui-avatars.com/api/?name=${encodeURIComponent(place?.name || 'B')}&background=3AFF15&color=111111')`};
                  background-size: cover;
                  background-position: center;
                "></div>
              `,
              className: 'custom-leaflet-pin',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            })} 
          />
        </MapContainer>

        <div style={{
          position: 'absolute', top: 'var(--safe-area)', left: '24px',
          background: 'var(--color-surface)', padding: '8px 16px', borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-card)', fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)',
          backdropFilter: 'blur(10px)', border: '1px solid var(--color-outline)'
        }}>
          Reaching {potentialReach} potential customers
        </div>
      </div>

      {/* Bottom Half: Controls */}
      <div className="clay-card" style={{ flex: '1 1 55%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '24px', overflowY: 'auto', background: 'var(--color-background)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--color-text-main)' }}>Live Broadcast</h2>
          <button className="btn-touch" onClick={handleLaunch} disabled={isLaunching || launched} style={{
            background: launched ? 'var(--color-surface)' : 'var(--color-primary)', color: launched ? 'var(--color-text-main)' : 'var(--color-background)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '14px', boxShadow: 'var(--shadow-soft)'
          }}>
            {launched ? 'Launched! ✓' : isLaunching ? 'Launching...' : 'Launch 🚀'}
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>Broadcast Radius</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-primary)' }}>{radius < 1000 ? `${radius}m` : `${(radius / 1000).toFixed(1)}km`}</span>
          </div>
          <input 
            type="range" min="100" max="10000" step="100" 
            value={radius} onChange={(e) => setRadius(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
          />
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>Offer Type</span>
            <select 
              value={offerType} 
              onChange={(e) => setOfferType(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)',
                background: 'var(--color-surface)', color: 'var(--color-text-main)', fontFamily: 'var(--font-family)', fontSize: '14px', outline: 'none'
              }}
            >
              <option value="Discount">Discount</option>
              <option value="Free Item">Free Item</option>
              <option value="Happy Hour">Happy Hour</option>
              <option value="Buy 1 Get 1">Buy 1 Get 1</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          {offerType === 'Discount' && (
            <div style={{ width: '100px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>% Off</span>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  min="1" max="100"
                  value={discountPercentage} 
                  onChange={(e) => setDiscountPercentage(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)',
                    background: 'var(--color-surface)', color: 'var(--color-text-main)', fontFamily: 'var(--font-family)', fontSize: '14px', outline: 'none', textAlign: 'center'
                  }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--color-text-muted)', fontSize: '14px' }}>%</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>Notification Message</span>
          <textarea 
            rows="2" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)',
              background: 'var(--color-surface)', color: 'var(--color-text-main)', fontFamily: 'var(--font-family)', fontSize: '14px', resize: 'none'
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default LiveCampaignManager;
