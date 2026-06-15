import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PinDropper = ({ position, setPosition, setAddress }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      
      // Reverse Geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            // Simplify address
            const parts = data.display_name.split(',').slice(0, 3);
            setAddress(parts.join(',').trim());
          } else {
            setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        })
        .catch(() => setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`));
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const LocationPickerMap = ({ onSelect, onCancel, hideTitle = false, initialTitle = '' }) => {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          setPosition([38.7223, -9.1393]); // Fallback
        }
      );
    } else {
      setPosition([38.7223, -9.1393]);
    }
  }, []);

  const handleConfirm = () => {
    if (!hideTitle && !title.trim()) return;
    if (!address.trim()) return;
    onSelect({ title, address, lat: position[0], lng: position[1] });
  };

  if (!position) return <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--color-background)', color: 'var(--color-text-main)' }}>Loading map...</div>;

  return (
    <div className="animate-slide-up-page" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, display: 'flex', flexDirection: 'column', background: 'var(--color-background)' }}>
      {/* Header */}
      <div style={{ padding: 'calc(var(--safe-area) + 16px) 24px 16px 24px', display: 'flex', alignItems: 'center', background: 'rgba(17,17,17,0.9)', borderBottom: '1px solid var(--color-outline)', zIndex: 10 }}>
        <button className="btn-touch" onClick={onCancel} style={{ background: 'var(--color-outline)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--color-text-main)' }}>Pick Location</h2>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <PinDropper position={position} setPosition={setPosition} setAddress={setAddress} />
        </MapContainer>
        
        {/* Info overlay */}
        <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', zIndex: 1000, background: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid var(--color-outline)' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>Tap on the map to pin your location</p>
          {!hideTitle && (
            <input type="text" placeholder="Location Name (e.g. Gym, Office)" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '15px' }} />
          )}
          <input type="text" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '16px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '14px' }} />
          
          <button 
            className="btn-touch" 
            onClick={handleConfirm} 
            disabled={(!hideTitle && !title.trim()) || !address.trim()} 
            style={{ 
              width: '100%', padding: '14px', 
              background: ((!hideTitle && !title.trim()) || !address.trim()) ? 'var(--color-outline)' : 'var(--color-primary)', 
              color: ((!hideTitle && !title.trim()) || !address.trim()) ? 'var(--color-text-muted)' : 'var(--color-background)', 
              border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '15px' 
            }}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerMap;
