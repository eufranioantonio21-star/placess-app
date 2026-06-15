import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Toggle = ({ active, onClick }) => (
  <div className="btn-touch" onClick={onClick} style={{
    width: '48px', height: '28px',
    background: active ? 'var(--color-primary)' : 'var(--color-outline)',
    borderRadius: '14px',
    position: 'relative',
    transition: 'background 0.3s',
    cursor: 'pointer',
    flexShrink: 0
  }}>
    <div style={{
      width: '24px', height: '24px',
      background: active ? 'var(--color-background)' : 'white',
      borderRadius: '50%',
      position: 'absolute',
      top: '2px',
      left: active ? '22px' : '2px',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      boxShadow: 'var(--shadow-card)'
    }} />
  </div>
);

const AlertsPage = () => {
  const [preferences, setPreferences] = useState({
    restaurants: true,
    coffee: true,
    happyHour: false,
    cinema: true,
    newPlaces: false
  });

  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { user, updateUser } = useAuth();
  
  useEffect(() => {
    if (user && user.preferences && user.preferences.alerts) {
      const { preferences: prefs, customCategories: custom } = user.preferences.alerts;
      if (prefs) setPreferences(prefs);
      if (custom) setCustomCategories(custom);
    } else {
      const savedPrefs = localStorage.getItem('alertPrefs');
      if (savedPrefs) {
        try {
          const parsed = JSON.parse(savedPrefs);
          if (parsed.preferences) setPreferences(parsed.preferences);
          if (parsed.customCategories) setCustomCategories(parsed.customCategories);
        } catch (e) {}
      }
    }
  }, [user]);

  const togglePref = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCustomPref = (id) => {
    setCustomCategories(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() === '') return;
    setCustomCategories(prev => [
      ...prev,
      { id: 'custom-' + Date.now(), name: newCategoryName.trim(), active: true }
    ]);
    setNewCategoryName('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    const alertData = { preferences, customCategories };
    localStorage.setItem('alertPrefs', JSON.stringify(alertData));
    
    if (user) {
      await updateUser({
        preferences: {
          ...user.preferences,
          alerts: alertData
        }
      });
    }

    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="animate-slide-up-page" style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'var(--color-background)',
      zIndex: 40,
      display: 'flex', flexDirection: 'column',
      padding: 'var(--safe-area) 24px 100px 24px',
      overflowY: 'auto'
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: 'var(--color-primary)', marginTop: '24px' }}>Alert Preferences</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>Choose what you want to be notified about when walking nearby.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Category: Food & Drink */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>Food & Drink</h3>
          <div className="clay-card" style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-outline)' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>🍔 Restaurants & Food Trucks</span>
              <Toggle active={preferences.restaurants} onClick={() => togglePref('restaurants')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-outline)' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>☕ Coffee Shops</span>
              <Toggle active={preferences.coffee} onClick={() => togglePref('coffee')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>🍹 Happy Hours & Bars</span>
              <Toggle active={preferences.happyHour} onClick={() => togglePref('happyHour')} />
            </div>
          </div>
        </div>

        {/* Category: Entertainment */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>Entertainment</h3>
          <div className="clay-card" style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>🎬 Cinema & Events</span>
              <Toggle active={preferences.cinema} onClick={() => togglePref('cinema')} />
            </div>
          </div>
        </div>

        {/* Category: Discovery */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>Discovery</h3>
          <div className="clay-card" style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>✨ New Places</span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Be the first to know about new spots</span>
              </div>
              <Toggle active={preferences.newPlaces} onClick={() => togglePref('newPlaces')} />
            </div>
          </div>
        </div>
        {/* Category: Custom */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>Custom Categories</h3>
          <div className="clay-card" style={{ padding: '0 16px' }}>
            {customCategories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-outline)' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>🏷️ {cat.name}</span>
                <Toggle active={cat.active} onClick={() => toggleCustomPref(cat.id)} />
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '8px', padding: '16px 0', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="E.g. Live Music, Vegan..." 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                style={{ 
                  flex: 1, 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--color-outline)', 
                  color: 'var(--color-text-main)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px'
                }}
              />
              <button 
                className="btn-touch"
                onClick={handleAddCategory}
                disabled={newCategoryName.trim() === ''}
                style={{
                  background: newCategoryName.trim() === '' ? 'var(--color-outline)' : 'var(--color-primary)',
                  color: newCategoryName.trim() === '' ? 'var(--color-text-muted)' : 'var(--color-background)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
        
        {/* Call to Action */}
        <button className="btn-touch" onClick={handleSave} disabled={isSaving} style={{
          background: isSaved ? 'var(--color-surface)' : 'var(--color-primary)',
          color: isSaved ? 'var(--color-primary)' : 'var(--color-background)',
          border: isSaved ? '2px solid var(--color-primary)' : 'none',
          padding: '16px',
          borderRadius: 'var(--radius-full)',
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: 'var(--font-family)',
          boxShadow: 'var(--shadow-soft)',
          marginTop: '16px',
          transition: 'all 0.3s'
        }}>
          {isSaving ? 'Saving...' : isSaved ? '✓ Saved Successfully' : 'Save Preferences'}
        </button>

      </div>
    </div>
  );
};

export default AlertsPage;
