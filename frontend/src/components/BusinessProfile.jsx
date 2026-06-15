import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BusinessProfile = ({ place, onRefresh, onSwitchToConsumer }) => {
  const { fetchWithAuth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: place?.name || '',
    category: place?.category || '',
    photoUrl: place?.photoUrl || '',
    phoneNumber: place?.phoneNumber || '',
    takeAwayEnabled: place?.takeAwayEnabled ?? true,
    capacity: place?.capacity || ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetchWithAuth(`/api/business/places/${place.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await onRefresh();
        setIsEditing(false);
      } else {
        alert("Failed to save profile");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!place) return null;

  const getInitials = (name) => {
    if (!name) return 'B';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const styleInitials = getInitials(place.name);

  const reviews = place.reviews || [];
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;

  return (
    <div style={{ padding: 'var(--safe-area) 24px 24px 24px', overflowY: 'auto', height: '100%', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '64px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>Business Profile</h1>
        {!isEditing ? (
          <button className="btn-touch" onClick={() => setIsEditing(true)} style={{ background: 'var(--color-outline)', border: 'none', color: 'var(--color-text-main)', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
            Edit
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-touch" onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: '1px solid var(--color-outline)', color: 'var(--color-text-muted)', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
              Cancel
            </button>
            <button className="btn-touch" onClick={handleSave} disabled={isSaving} style={{ background: 'var(--color-primary)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="clay-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
        {isEditing ? (
          <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Photo URL</label>
              <input type="text" name="photoUrl" value={formData.photoUrl} onChange={handleChange} placeholder="https://example.com/photo.jpg" className="auth-input" />
              {formData.photoUrl && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                  <img src={formData.photoUrl} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)' }} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Business Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="auth-input" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Category</label>
              <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Restaurant, Coffee Shop" className="auth-input" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Phone Number</label>
              <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="+1 234 567 8900" className="auth-input" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Capacity / Status</label>
              <input type="text" name="capacity" value={formData.capacity} onChange={handleChange} placeholder="e.g. 45% Full, Very Busy" className="auth-input" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-background)', padding: '16px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <input type="checkbox" name="takeAwayEnabled" checked={formData.takeAwayEnabled} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 700 }}>Take Away Available</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Allow customers to order for pickup</div>
              </div>
            </label>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              {place.photoUrl ? (
                <img src={place.photoUrl} alt={place.name} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-surface)', boxShadow: 'var(--shadow-soft)' }} />
              ) : (
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', color: 'var(--color-background)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', fontWeight: 800, border: '3px solid var(--color-surface)', boxShadow: 'var(--shadow-soft)' }}>
                  {styleInitials}
                </div>
              )}
            </div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 800, textAlign: 'center' }}>{place.name}</h2>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>{place.category}</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="var(--color-primary)" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>{avgRating > 0 ? avgRating : 'New'}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>({reviews.length} reviews)</span>
            </div>
            
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Phone</span>
                <span style={{ fontWeight: 700 }}>{place.phoneNumber || 'Not provided'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Take Away</span>
                <span style={{ fontWeight: 700, color: place.takeAwayEnabled ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{place.takeAwayEnabled ? 'Available' : 'Disabled'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Capacity</span>
                <span style={{ fontWeight: 700 }}>{place.capacity || 'Not specified'}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="clay-card" style={{ padding: '20px', background: 'var(--color-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-text-main)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>Consumer View</h4>
            <span style={{ fontSize: '20px' }}>🗺️</span>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.9, color: 'var(--color-text-muted)' }}>See how your business looks to customers on the live map.</p>
          <button className="btn-touch" onClick={onSwitchToConsumer} style={{
            background: 'var(--color-primary)', color: 'var(--color-background)', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '14px', width: '100%'
          }}>
            Open Map
          </button>
        </div>
      )}

    </div>
  );
};

export default BusinessProfile;
