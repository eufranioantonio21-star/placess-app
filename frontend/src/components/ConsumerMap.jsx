import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationMarker = ({ position, avatarUrl }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  const userIcon = L.divIcon({
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div class="animate-ping" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #3b82f6; opacity: 0.7;"></div>
        <div style="position: absolute; width: 20px; height: 20px; top: 2px; left: 2px; border-radius: 50%; background-color: #3b82f6; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    className: 'custom-user-pin',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  return position === null ? null : (
    <Marker position={position} icon={userIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
};

const CustomMarker = ({ place, onPinClick }) => {
  // Map category to color and icon
  const categoryStyles = {
    'Restaurant': { color: '#ef4444', icon: '🍔' },
    'Coffee Shop': { color: '#8b5cf6', icon: '☕' },
    'Food Truck': { color: '#f59e0b', icon: '🌮' },
    'Store': { color: '#10b981', icon: '🏪' },
    'Cinema': { color: '#3b82f6', icon: '🎬' },
    'Burguery': { color: '#f97316', icon: '🍔' }
  };
  const style = categoryStyles[place.category] || { color: 'var(--color-primary)', icon: '📍' };

  // Create a custom div icon using the business photo or initials
  const avatarUrl = place.photoUrl 
    ? place.photoUrl 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(place.name)}&background=${style.color.replace('#','')}&color=ffffff&bold=true`;

  const iconHtml = `
    <div class="animate-float" style="
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid ${style.color};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      background-image: url('${avatarUrl}');
      background-size: cover;
      background-position: center;
      background-color: var(--color-surface);
    "></div>
  `;
  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-pin',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  return (
    <Marker 
      position={[place.lat, place.lng]} 
      icon={customIcon}
      eventHandlers={{
        click: () => onPinClick(place)
      }}
    >
    </Marker>
  );
};

const ConsumerMap = ({ places, onPinClick }) => {
  const [position, setPosition] = useState(null);
  const { user } = useAuth();
  
  const avatarUrl = user?.photoUrl 
    ? user.photoUrl 
    : user?.initials
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.initials)}&background=3AFF15&color=111111&bold=true`
      : user?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3AFF15&color=111111&bold=true` 
        : 'https://ui-avatars.com/api/?name=U&background=3AFF15&color=111111';

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          console.log("GPS denied or unavailable");
          setPosition([38.7223, -9.1393]); // Fallback to Lisbon
        }
      );
    } else {
      setPosition([38.7223, -9.1393]);
    }
  }, []);

  if (!position) return <div style={{ height: '100vh', background: '#111' }}>Loading map...</div>;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
      <MapContainer 
        center={position} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <LocationMarker position={position} avatarUrl={avatarUrl} />
        {places.map(place => (
          <CustomMarker key={place.id} place={place} onPinClick={onPinClick} />
        ))}
      </MapContainer>
    </div>
  );
};

export default ConsumerMap;
