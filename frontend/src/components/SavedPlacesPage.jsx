import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const SavedPlacesPage = ({ onBack, onPlaceClick }) => {
  const { user } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/places`);
        const data = await res.json();
        const savedIds = user?.preferences?.savedPlaces || [];
        setSavedPlaces(data.filter(p => savedIds.includes(p.id)));
      } catch (err) {
        console.error("Failed to load saved places", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchPlaces();
  }, [user]);

  const handleRemove = async (e, placeId) => {
    e.stopPropagation(); // Prevent triggering the card click
    const currentSaved = user?.preferences?.savedPlaces || [];
    const newSaved = currentSaved.filter(id => id !== placeId);
    
    // Update local state immediately for snappy UI
    setSavedPlaces(prev => prev.filter(p => p.id !== placeId));
    
    // Update backend via context
    if (user && updateUser) {
      await updateUser({
        preferences: {
          ...user.preferences,
          savedPlaces: newSaved
        }
      });
    }
  };

  return (
    <div className="animate-slide-up-page" style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'var(--color-background)', zIndex: 60,
      display: 'flex', flexDirection: 'column',
      padding: 'var(--safe-area) 24px 24px 24px', overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', marginTop: '16px' }}>
        <button className="btn-touch" onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-main)', padding: '8px', marginRight: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--color-text-main)' }}>Saved Places</h1>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : savedPlaces.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤍</div>
          <p>You haven't saved any places yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {savedPlaces.map(place => (
            <div key={place.id} className="clay-card btn-touch" onClick={() => onPlaceClick(place)} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', background: place.color || '#333', backgroundImage: place.photoUrl ? `url('${place.photoUrl}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }}></div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place.name}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>{place.category}</p>
                {place.reviews && place.reviews.find(r => r.userId === user?.id) && (
                  <div style={{ marginTop: '8px', padding: '8px', background: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>My Rating:</span>
                      <div style={{ display: 'flex' }}>
                        {[...Array(place.reviews.find(r => r.userId === user?.id).rating)].map((_, i) => (
                          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        ))}
                      </div>
                    </div>
                    {place.reviews.find(r => r.userId === user?.id).comment && (
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{place.reviews.find(r => r.userId === user?.id).comment}"
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={(e) => handleRemove(e, place.id)}
                className="btn-touch"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#ef4444',
                  flexShrink: 0
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedPlacesPage;
