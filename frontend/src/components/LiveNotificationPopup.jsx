import React from 'react';

const LiveNotificationPopup = ({ offer, onClick }) => {
  return (
    <div className="animate-drop-down" style={{ padding: '0 var(--safe-area)', marginTop: '16px' }}>
      <div 
        className="clay-card btn-touch"
        onClick={onClick}
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text-main)',
          border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: 'var(--shadow-floating)'
        }}
      >
        <div style={{
          background: 'rgba(58, 255, 21, 0.15)',
          color: 'var(--color-primary)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 2 13 9 20 9"></polyline>
            <path d="M13 2L3 14h9l-1 8 10-12h-9z"></path>
          </svg>
        </div>
        <div key={offer.id} className="animate-fade-in-up" style={{ flex: 1, overflow: 'hidden' }}>
          <span className="text-caption" style={{ color: 'var(--color-text-muted)', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            Live Offer • {offer.subtitle}
          </span>
          <h4 style={{ fontSize: '16px', margin: '4px 0 0 0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {offer.title}
          </h4>
        </div>
        <button style={{
          background: 'var(--color-primary)',
          color: 'var(--color-background)',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: '8px 16px',
          fontWeight: 700,
          fontFamily: 'var(--font-family)',
          cursor: 'pointer'
        }}>
          Claim
        </button>
      </div>
    </div>
  );
};

export default LiveNotificationPopup;
