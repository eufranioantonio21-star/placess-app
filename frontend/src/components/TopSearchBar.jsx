import React from 'react';
import { useAuth } from '../context/AuthContext';

const TopSearchBar = ({ searchQuery, setSearchQuery }) => {
  const { user } = useAuth();
  
  // Generate avatar based on photoUrl, initials, or name
  const avatarUrl = user?.photoUrl 
    ? user.photoUrl 
    : user?.initials
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.initials)}&background=3AFF15&color=111111&bold=true`
      : user?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3AFF15&color=111111&bold=true` 
        : 'https://ui-avatars.com/api/?name=U&background=3AFF15&color=111111';

  return (
    <div style={{ padding: '0 var(--safe-area)' }}>
      <div 
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-floating)',
          marginTop: '16px',
          border: '1px solid var(--color-outline)'
        }}
      >
        {/* App Logo */}
        <div className="btn-touch" style={{ 
          color: 'var(--color-background)', 
          background: 'var(--color-primary)', 
          borderRadius: '50%', 
          width: '32px', 
          height: '32px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          flexShrink: 0,
          marginRight: '8px',
          fontWeight: 900,
          fontSize: '18px',
          fontFamily: 'var(--font-family)'
        }}>
          P
        </div>

        {/* Search Input */}
        <div className="btn-touch" style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.05)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-full)',
          color: 'var(--color-text-main)',
          border: '1px solid var(--color-outline)'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search places or categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              outline: 'none', 
              color: 'var(--color-text-main)', 
              width: '100%', 
              fontSize: '15px', 
              fontWeight: 500 
            }} 
          />
          {searchQuery && (
            <button 
              className="btn-touch"
              onClick={() => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-background)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          )}
        </div>

        {/* Profile Image */}
        <div className="btn-touch" style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--color-outline)',
          marginLeft: '8px',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid var(--color-primary)'
        }}>
          <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
    </div>
  );
};

export default TopSearchBar;
