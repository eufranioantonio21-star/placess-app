import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MenuItemCard = ({ id, title, description, price, available, image, onToggle }) => {
  const [isAvailable, setIsAvailable] = useState(available);
  const { fetchWithAuth } = useAuth();
  
  return (
    <div className="clay-card" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', marginBottom: '12px' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: 'var(--radius-md)', overflow: 'hidden',
        background: 'var(--color-outline)', flexShrink: 0, marginRight: '16px', position: 'relative'
      }}>
        {image ? (
          <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </div>
        )}
      </div>

      <div style={{ flex: 1, paddingRight: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main)' }}>{title}</h4>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-primary)' }}>${price}</span>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-touch" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '12px', padding: 0 }}>Edit</button>
          <span style={{ color: 'var(--color-outline)' }}>|</span>
          <button className="btn-touch" style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, fontSize: '12px', padding: 0 }}>Delete</button>
        </div>
      </div>
      
      {/* Availability Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: isAvailable ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          {isAvailable ? 'In Stock' : 'Out'}
        </span>
        <div 
          className="btn-touch"
          onClick={async () => {
            const newVal = !isAvailable;
            setIsAvailable(newVal);
            try {
              await fetchWithAuth(`/api/business/menu/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ available: newVal })
              });
              if (onToggle) onToggle(id, newVal);
            } catch (err) {
              setIsAvailable(!newVal); // Revert on failure
            }
          }}
          style={{
            width: '44px', height: '24px', background: isAvailable ? 'var(--color-primary)' : '#e5e7eb',
            borderRadius: '12px', position: 'relative', transition: 'background 0.3s'
          }}
        >
          <div style={{
            position: 'absolute', top: '2px', left: isAvailable ? '22px' : '2px', width: '20px', height: '20px',
            background: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }} />
        </div>
      </div>
    </div>
  );
};

const BusinessMenuManager = ({ place, onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [takeAwayEnabled, setTakeAwayEnabled] = useState(place?.takeAwayEnabled || true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', price: '', image: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (place) setTakeAwayEnabled(place.takeAwayEnabled);
  }, [place]);

  const toggleTakeAway = async () => {
    if (!place) return;
    const newVal = !takeAwayEnabled;
    setTakeAwayEnabled(newVal);
    try {
      await fetchWithAuth(`/api/business/places/${place.id}`, {
        method: 'PUT',
        body: JSON.stringify({ takeAwayEnabled: newVal })
      });
    } catch(err) {
      setTakeAwayEnabled(!newVal);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title || !newItem.price) return alert('Title and price are required');
    setIsSubmitting(true);
    try {
      await fetchWithAuth('/api/business/menu', {
        method: 'POST',
        body: JSON.stringify({
          ...newItem,
          placeId: place.id
        })
      });
      setShowAddModal(false);
      setNewItem({ title: '', description: '', price: '', image: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!place) return <div style={{ padding: '24px' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)' }}>
      {/* Header and Global Settings */}
      <div style={{ padding: 'calc(var(--safe-area) + 24px) 24px 24px 24px', background: 'var(--color-background)', borderBottom: '1px solid var(--color-outline)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-main)', margin: '0 0 24px 0' }}>Menu & Services</h1>
        
        <div className="clay-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)' }}>Take-Away Service</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>Allow customers to order for pickup</p>
          </div>
          <div 
            className="btn-touch"
            onClick={toggleTakeAway}
            style={{
              width: '44px', height: '24px', background: takeAwayEnabled ? 'var(--color-primary)' : 'var(--color-outline)',
              borderRadius: '12px', position: 'relative', transition: 'background 0.3s'
            }}
          >
            <div style={{
              position: 'absolute', top: '2px', left: takeAwayEnabled ? '22px' : '2px', width: '20px', height: '20px',
              background: takeAwayEnabled ? 'var(--color-background)' : 'var(--color-text-main)', borderRadius: '50%', transition: 'left 0.3s'
            }} />
          </div>
        </div>
      </div>

      {/* Menu Items List */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>Active Menu</h2>
          <button className="btn-touch" onClick={() => setShowAddModal(true)} style={{
            background: 'var(--color-primary)', color: 'var(--color-background)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: 'var(--shadow-soft)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Item
          </button>
        </div>

        {(!place.menuItems || place.menuItems.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Your menu is empty.</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Add items so customers can order from you.</p>
          </div>
        ) : (
          place.menuItems.map(item => (
            <MenuItemCard 
              key={item.id}
              id={item.id}
              title={item.title} 
              description={item.description} 
              price={item.price} 
              available={item.available} 
              image={item.image}
              onToggle={() => onRefresh && onRefresh()}
            />
          ))
        )}
      </div>

      {showAddModal && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="clay-card animate-slide-up" style={{ width: '100%', padding: '24px', background: 'var(--color-surface)', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>New Item</h3>
              <button onClick={() => setShowAddModal(false)} className="btn-touch" style={{ background: 'none', border: 'none', color: 'var(--color-text-main)', padding: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Title *</label>
                <input type="text" className="auth-input" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="E.g. Vegan Burger" />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Description</label>
                <textarea className="auth-input" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Brief description of the item" rows="2" style={{ resize: 'none' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Price ($) *</label>
                  <input type="number" className="auth-input" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Image URL</label>
                  <input type="text" className="auth-input" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              
              <button 
                className="btn-touch" 
                onClick={handleAddItem}
                disabled={isSubmitting}
                style={{
                  background: 'var(--color-primary)', color: 'var(--color-background)', border: 'none', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 800, marginTop: '8px'
                }}
              >
                {isSubmitting ? 'Adding...' : 'Add to Menu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessMenuManager;
