import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';

const PlaceDetailsSheet = ({ place, onClose }) => {
  const { user, fetchWithAuth, updateUser } = useAuth();
  
  const savedPlaces = user?.preferences?.savedPlaces || [];
  const [isSaved, setIsSaved] = useState(savedPlaces.includes(place?.id));
  
  useEffect(() => {
    setIsSaved((user?.preferences?.savedPlaces || []).includes(place?.id));
  }, [user?.preferences?.savedPlaces, place?.id]);
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);

  const [isRatingMode, setIsRatingMode] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const toggleSave = async () => {
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    
    let updatedList = [...savedPlaces];
    if (newSaved) {
      if (!updatedList.includes(place.id)) updatedList.push(place.id);
    } else {
      updatedList = updatedList.filter(id => id !== place.id);
    }
    
    await updateUser({ preferences: { ...user.preferences, savedPlaces: updatedList } });
  };

  const submitRating = async () => {
    if (rating === 0) return alert("Please select a rating!");
    setIsSubmittingRating(true);
    try {
      const res = await fetchWithAuth(`/api/places/${place.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        setIsRatingMode(false);
        setRating(0);
        setComment('');
        alert("Thank you for your evaluation!");
      } else {
        alert("Failed to submit review");
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    if (isNavigating) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserLocation([lat, lng]);
            
            try {
              const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${place.lng},${place.lat}?overview=full&geometries=geojson&steps=true`);
              const data = await res.json();
              if (data.routes && data.routes.length > 0) {
                const r = data.routes[0];
                // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
                const latLngs = r.geometry.coordinates.map(c => [c[1], c[0]]);
                setRoute(latLngs);
                
                // Format distance and duration
                const distKm = (r.distance / 1000).toFixed(1);
                const durationMin = Math.round(r.duration / 60);
                
                // Calculate arrival time
                const arrival = new Date(Date.now() + r.duration * 1000);
                const arrivalStr = arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                setRouteStats({ distance: `${distKm} km`, duration: `${durationMin} min`, arrival: arrivalStr });
                
                if (r.legs && r.legs[0] && r.legs[0].steps && r.legs[0].steps.length > 0) {
                  // Find the first meaningful turn instruction
                  const step = r.legs[0].steps.length > 1 ? r.legs[0].steps[1] : r.legs[0].steps[0];
                  setCurrentStep({
                    instruction: step.maneuver?.type === 'turn' ? `Turn ${step.maneuver.modifier}` : (step.maneuver?.type || 'Proceed'),
                    distance: `${Math.round(step.distance)} meters`,
                    name: step.name ? `onto ${step.name}` : ''
                  });
                }
              }
            } catch(e) {
              console.error("OSRM error:", e);
            }
          },
          () => {
            console.log("GPS denied");
            setUserLocation([38.7200, -9.1400]); // Fallback
          }
        );
      }
    }
  }, [isNavigating, place]);

  const createDotIcon = (color) => L.divIcon({
    html: `<div style="width:20px;height:20px;background:${color};border-radius:50%;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    className: 'custom-dot',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  if (!place) return null;

  if (isNavigating) {
    return (
      <div className="animate-slide-up-page" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--color-background)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
        
        {/* Real Map Layer */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          {userLocation ? (
            <MapContainer center={userLocation} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {route && <Polyline positions={route} color="var(--color-primary)" weight={8} opacity={0.9} lineCap="round" lineJoin="round" />}
              <Marker position={userLocation} icon={createDotIcon('var(--color-primary)')} />
              <Marker position={[place.lat, place.lng]} icon={createDotIcon('#ef4444')} />
            </MapContainer>
          ) : (
             <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-text-muted)'}}>Locating...</div>
          )}
        </div>

        {/* Turn-by-turn Banner */}
        {currentStep && (
          <div style={{ position: 'absolute', top: 'calc(var(--safe-area) + 16px)', left: '24px', right: '24px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '16px', color: 'var(--color-text-main)', border: '1px solid var(--color-outline)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: 'var(--shadow-floating)', zIndex: 10 }}>
            <div style={{ background: 'var(--color-background)', padding: '8px', borderRadius: '50%', display: 'flex' }}>
              <svg color="var(--color-primary)" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, textTransform: 'capitalize' }}>{currentStep.instruction}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>In {currentStep.distance} {currentStep.name}</p>
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', background: 'var(--color-surface)', padding: '24px 24px calc(var(--safe-area) + 24px) 24px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -4px 12px rgba(0,0,0,0.3)', zIndex: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)' }}>{routeStats?.duration || "Calculating..."}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{routeStats?.distance || "-- km"} • {routeStats?.arrival || "--:--"} arrival</p>
          </div>
          <button className="btn-touch" onClick={() => setIsNavigating(false)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '16px 24px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-soft)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Exit
          </button>
        </div>
      </div>
    );
  }

  if (isRatingMode) {
    return (
      <div className="animate-slide-up-page" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--color-surface)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: 'var(--safe-area) 24px 24px 24px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Rate Experience</h2>
          <button onClick={() => setIsRatingMode(false)} className="btn-touch" style={{ background: 'var(--color-background)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-main)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <svg key={star} onClick={() => setRating(star)} width="40" height="40" viewBox="0 0 24 24" fill={rating >= star ? 'var(--color-primary)' : 'none'} stroke={rating >= star ? 'var(--color-primary)' : 'var(--color-outline)'} strokeWidth="2" style={{ cursor: 'pointer' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          ))}
        </div>
        
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment (optional)..."
          className="auth-input"
          style={{ minHeight: '120px', resize: 'none', marginBottom: 'auto' }}
        />
        
        <button className="btn-touch" onClick={submitRating} disabled={isSubmittingRating} style={{ background: 'var(--color-primary)', color: 'var(--color-background)', border: 'none', padding: '16px', borderRadius: 'var(--radius-full)', fontSize: '16px', fontWeight: 700, marginTop: '24px' }}>
          {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    );
  }

  return (
    <div 
      className="animate-slide-up-page"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'var(--color-surface)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--safe-area) 24px 24px 24px',
        boxSizing: 'border-box'
      }}
    >

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', marginTop: '24px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>{place.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '15px' }}>
              <span>{place.category}</span>
            </div>
            <button className="btn-touch" onClick={() => {
              const existingReview = place?.reviews?.find(r => r.userId === user?.id);
              if (existingReview) {
                setRating(existingReview.rating);
                setComment(existingReview.comment || '');
              } else {
                setRating(0);
                setComment('');
              }
              setIsRatingMode(true);
            }} style={{
              marginTop: '12px',
              background: 'var(--color-primary)',
              color: 'var(--color-background)',
              border: 'none',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
              fontWeight: 800
            }}>
              {place?.reviews?.find(r => r.userId === user?.id) ? 'Update Rating' : 'Rate Experience'}
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={toggleSave}
              className="btn-touch"
              style={{
                background: isSaved ? 'var(--color-primary)' : 'var(--color-background)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: isSaved ? 'var(--color-background)' : 'var(--color-text-main)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button 
              onClick={onClose}
              className="btn-touch"
              style={{
                background: 'var(--color-background)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--color-text-main)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Live Offer Highlight */}
        {place.campaigns && place.campaigns.filter(c => c.isActive).map(campaign => (
          <div key={campaign.id} className="btn-touch" style={{
            background: 'var(--color-outline)',
            border: '2px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ background: 'rgba(58, 255, 21, 0.15)', color: 'var(--color-primary)', padding: '8px', borderRadius: '50%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div>
              <h4 style={{ color: 'var(--color-primary)', fontWeight: 800, margin: 0 }}>{campaign.title}</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-main)' }}>{campaign.description}</p>
            </div>
          </div>
        ))}

        {/* Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ background: 'var(--color-background)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <span className="text-caption">Capacity</span>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '4px' }}>{place.capacity || 'Not specified'}</div>
          </div>
          <div style={{ background: 'var(--color-background)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <span className="text-caption">Take Away</span>
            <div style={{ fontSize: '18px', fontWeight: 600, color: place.takeAwayEnabled ? 'var(--color-tertiary)' : 'var(--color-text-muted)', marginTop: '4px' }}>
              {place.takeAwayEnabled ? 'Available' : 'Disabled'}
            </div>
          </div>
        </div>

        {/* Menu Section */}
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Menu Highlights</h3>
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
          {place.menuItems && place.menuItems.length > 0 ? (
            place.menuItems.map((item) => (
              <div key={item.id} className="btn-touch" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-outline)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{item.title}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>{item.description}</p>
                </div>
                <span style={{ fontWeight: 700 }}>${item.price.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontStyle: 'italic' }}>No menu items available.</p>
          )}
        </div>
        
        {/* Call to Action */}
        <button className="btn-touch" onClick={() => setIsNavigating(true)} style={{
          background: 'var(--color-primary)',
          color: 'var(--color-background)',
          border: 'none',
          padding: '16px',
          borderRadius: 'var(--radius-full)',
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: 'var(--font-family)',
          boxShadow: 'var(--shadow-soft)',
          marginTop: 'auto'
        }}>
          Navigate Here
        </button>

    </div>
  );
};

export default PlaceDetailsSheet;
