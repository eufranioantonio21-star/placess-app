import React from 'react';

const BusinessBottomNavBar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'profile', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', label: 'Profile' },
    { id: 'campaigns', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', label: 'Live' },
    { id: 'orders', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2', label: 'Orders' },
    { id: 'menu', icon: 'M4 6h16 M4 12h16 M4 18h16', label: 'Menu' },
    { id: 'audience', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', label: 'CRM' },
  ];

  return (
    <div className="bottom-nav-glass" style={{
      margin: '0 24px var(--safe-area) 24px',
      flexShrink: 0,
      height: '64px',
      borderRadius: '32px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0 8px',
      zIndex: 50,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-outline)',
      boxShadow: 'var(--shadow-floating)'
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <div 
            key={tab.id}
            className="btn-touch"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '24px',
              background: isActive ? 'rgba(58, 255, 21, 0.15)' : 'transparent',
              transition: 'all 0.3s ease',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon}></path>
            </svg>
            <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: isActive ? 700 : 500, opacity: isActive ? 1 : 0.8 }}>
              {tab.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default BusinessBottomNavBar;
