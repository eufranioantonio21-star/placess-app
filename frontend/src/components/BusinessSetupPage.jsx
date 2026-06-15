import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LocationPickerMap from './LocationPickerMap';

const BusinessSetupPage = ({ onBack, onComplete }) => {
  const { fetchWithAuth, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Restaurant');
  const [customCategory, setCustomCategory] = useState('');
  const [phone, setPhone] = useState('');
  
  // Location State
  const [addressMode, setAddressMode] = useState('manual'); // 'manual' | 'map'
  const [manualAddress, setManualAddress] = useState('');
  const [mapLocation, setMapLocation] = useState(null); // { lat, lng, address }
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter your business name');
        return;
      }
      setError(null);
      setStep(2);
    }
  };

  const handleMapConfirm = (lat, lng, address) => {
    setMapLocation({ lat, lng, address });
    setManualAddress(address); // sync to manual in case they want to tweak it
    setShowMapPicker(false);
  };

  const handleSubmit = async () => {
    // Basic validation
    const finalCategory = category === 'Other' ? customCategory : category;

    if (category === 'Other' && !customCategory.trim()) {
      setError('Please specify your category');
      return;
    }
    if (addressMode === 'map' && !mapLocation) {
      setError('Please select a location on the map');
      return;
    }
    if (addressMode === 'manual' && !manualAddress.trim()) {
      setError('Please enter your business address');
      return;
    }

    setIsLoading(true);
    setError(null);

    // If manual address, we need some dummy lat/lng for now since we don't have a real geocoder to convert address->coords here
    // In a real app, we'd use Google Maps Geocoding API. For now, default to Lisbon center or use map location if available.
    let lat = 38.7223;
    let lng = -9.1393;
    
    if (addressMode === 'map' && mapLocation) {
      lat = mapLocation.lat;
      lng = mapLocation.lng;
    }

    try {
      const response = await fetchWithAuth('/api/business/setup', {
        method: 'POST',
        body: JSON.stringify({
          name,
          category: finalCategory,
          phoneNumber: phone,
          lat,
          lng,
          address: addressMode === 'map' ? mapLocation.address : manualAddress
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business account');
      }

      await refreshUser(); // Fetch the new user data with the newly created place
      onComplete(); // Switch to business dashboard
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-slide-up-page" style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'var(--color-background)', zIndex: 60,
      display: 'flex', flexDirection: 'column', overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ padding: 'var(--safe-area) 24px 16px 24px', display: 'flex', alignItems: 'center', background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={step === 1 ? onBack : () => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-main)', padding: '8px 8px 8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 0 8px', color: 'var(--color-text-main)' }}>Create Business</h1>
      </div>

      <div style={{ padding: '24px', flex: 1 }}>
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <div style={{ flex: 1, height: '4px', background: 'var(--color-primary)', borderRadius: '2px' }} />
          <div style={{ flex: 1, height: '4px', background: step === 2 ? 'var(--color-primary)' : 'var(--color-surface)', borderRadius: '2px', transition: 'background 0.3s' }} />
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '24px', fontSize: '14px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'var(--color-primary)' }}>Business Details</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px', fontSize: '15px' }}>Tell us about your restaurant, cafe, or store to get started.</p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Business Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Golden Cup"
                style={{ width: '100%', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: 600 }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: 600, appearance: 'none', marginBottom: category === 'Other' ? '12px' : '0' }}
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Cafe">Cafe & Bakery</option>
                <option value="Bar">Bar & Nightlife</option>
                <option value="Store">Retail Store</option>
                <option value="Other">Other</option>
              </select>
              {category === 'Other' && (
                <div className="animate-fade-in-up">
                  <input 
                    type="text" 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="E.g. Food Truck, Salon..."
                    style={{ width: '100%', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: 600 }}
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Phone Number (Optional)</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+351 912 345 678"
                style={{ width: '100%', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: 600 }}
              />
            </div>

            <button className="btn-primary" onClick={handleNext} style={{ width: '100%', fontSize: '16px', padding: '16px' }}>
              Next Step
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'var(--color-primary)' }}>Location</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px', fontSize: '15px' }}>Where is your business located? This helps customers find you.</p>

            <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '24px' }}>
              <button 
                onClick={() => setAddressMode('map')}
                style={{ flex: 1, padding: '12px', background: addressMode === 'map' ? 'var(--color-background)' : 'transparent', border: 'none', color: addressMode === 'map' ? 'var(--color-text-main)' : 'var(--color-text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s' }}
              >
                Pick on Map
              </button>
              <button 
                onClick={() => setAddressMode('manual')}
                style={{ flex: 1, padding: '12px', background: addressMode === 'manual' ? 'var(--color-background)' : 'transparent', border: 'none', color: addressMode === 'manual' ? 'var(--color-text-main)' : 'var(--color-text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s' }}
              >
                Type Manually
              </button>
            </div>

            {addressMode === 'manual' ? (
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Full Address</label>
                <textarea 
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="e.g. Rua Augusta 123, 1100-048 Lisboa"
                  rows={4}
                  style={{ width: '100%', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: 600, resize: 'none' }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '32px' }}>
                {mapLocation ? (
                  <div style={{ padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, paddingRight: '16px' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--color-text-main)' }}>Selected Location</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{mapLocation.address}</p>
                    </div>
                    <button className="btn-touch" onClick={() => setShowMapPicker(true)} style={{ background: 'rgba(58,255,21,0.1)', color: 'var(--color-primary)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '12px' }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <button className="btn-touch" onClick={() => setShowMapPicker(true)} style={{ width: '100%', padding: '24px', background: 'rgba(58,255,21,0.05)', border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>Tap to choose location on map</span>
                  </button>
                )}
              </div>
            )}

            <button className="btn-primary" onClick={handleSubmit} disabled={isLoading} style={{ width: '100%', fontSize: '16px', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {isLoading ? 'Creating Account...' : 'Complete Setup'}
            </button>
          </div>
        )}
      </div>

      {showMapPicker && (
        <LocationPickerMap 
          hideTitle={true}
          onCancel={() => setShowMapPicker(false)}
          onSelect={({ address, lat, lng }) => {
            setMapLocation({ lat, lng, address });
            setManualAddress(address); // sync to manual in case they want to tweak it
            setShowMapPicker(false);
          }}
        />
      )}
    </div>
  );
};

export default BusinessSetupPage;
