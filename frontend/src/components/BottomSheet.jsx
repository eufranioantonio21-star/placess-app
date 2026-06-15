import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BottomSheet = ({ places, onPlaceClick }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { user, updateUser } = useAuth();
  const savedPlaces = user?.preferences?.savedPlaces || [];

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        background: 'var(--color-surface)',
        borderTopLeftRadius: 'var(--radius-xl)',
        borderTopRightRadius: 'var(--radius-xl)',
        padding: '24px 0 100px 0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        boxShadow: 'var(--shadow-soft)',
        transform: isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 114px))',
        transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
        pointerEvents: 'auto'
      }}
    >
      {/* Handle / Title Area (Clickable to toggle) */}
      <div 
        className="btn-touch"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ width: '100%' }}
      >
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '16px'
        }}>
          <svg width="32" height="12" viewBox="0 0 24 12" fill="none" stroke="var(--color-outline)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="2" x2="20" y2="2"></line>
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="10" x2="20" y2="10"></line>
          </svg>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 24px', 
          marginBottom: '16px',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: isExpanded ? 'auto' : 'none'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Explore Nearby</h2>
          <span 
            className="btn-touch" 
            style={{ 
              color: 'var(--color-primary)', 
              fontWeight: 600, 
              fontSize: '14px'
            }}
          >
            See all
          </span>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        overflowX: 'auto', 
        gap: '16px', 
        padding: '0 24px',
        paddingBottom: '24px',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        opacity: isExpanded ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: isExpanded ? 'auto' : 'none'
      }}>
        {places.map(place => (
          <div 
            key={place.id} 
            className="btn-touch"
            onClick={() => onPlaceClick(place)}
            style={{
            minWidth: '260px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              width: '100%',
              height: '140px',
              backgroundColor: place.color || '#333',
              backgroundImage: place.photoUrl ? `url('${place.photoUrl}')` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 'var(--radius-md)',
              position: 'relative'
            }}>
              <div 
                className="btn-touch"
                onClick={(e) => {
                  e.stopPropagation();
                  const isSaved = savedPlaces.includes(place.id);
                  let updatedList = [...savedPlaces];
                  if (!isSaved) updatedList.push(place.id);
                  else updatedList = updatedList.filter(id => id !== place.id);
                  updateUser({ preferences: { ...user.preferences, savedPlaces: updatedList } });
                }}
                style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: savedPlaces.includes(place.id) ? 'var(--color-primary)' : 'var(--color-surface)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: 'var(--shadow-card)',
                color: savedPlaces.includes(place.id) ? 'var(--color-background)' : '#ef4444'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={savedPlaces.includes(place.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{place.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{place.category}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn-touch" style={{
                  background: place.takeAwayEnabled !== false ? 'var(--color-primary)' : 'var(--color-outline)',
                  color: place.takeAwayEnabled !== false ? 'var(--color-background)' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontWeight: 700,
                  fontSize: '12px',
                  fontFamily: 'var(--font-family)'
                }}>
                  {place.takeAwayEnabled !== false ? 'Open Now' : 'Closed'}
                </button>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{place.distance || "0.8km"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Floating Action Button (FAB) for Navigation */}
      <div 
        className="btn-touch"
        style={{
        position: 'absolute',
        bottom: '80px',
        right: '24px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'var(--color-surface)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: 'var(--shadow-soft)',
        zIndex: 20,
        opacity: isExpanded ? 1 : 0,
        pointerEvents: isExpanded ? 'auto' : 'none',
        transition: 'opacity 0.3s'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      </div>
    </div>
  );
};

export default BottomSheet;
