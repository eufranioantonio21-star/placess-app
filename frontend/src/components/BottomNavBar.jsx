import React, { useState } from 'react';

const navItems = [
  { id: 'map', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', circle: 'M12 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', label: 'Map' },
  { id: 'notifications', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', circle: 'M13.73 21a2 2 0 0 1-3.46 0', dot: true, label: 'Notifications' },
  { id: 'alerts', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', circle: 'M12 9v4', dot2: 'M12 17h.01', dot: true, label: 'Alerts' },
  { id: 'settings', icon: 'M5 12h.01M12 12h.01M19 12h.01', label: 'Menu' }
];

const BottomNavBar = ({ activeTab, setActiveTab }) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '0',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      zIndex: 50,
      pointerEvents: 'none'
    }}>
      <div 
        className="glass-panel"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-floating)',
          pointerEvents: 'auto',
          border: '1px solid var(--color-outline)'
        }}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="btn-touch"
              style={{
                position: 'relative',
                background: isActive ? 'var(--color-primary)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: isActive ? '10px 20px' : '10px 14px',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                color: isActive ? 'var(--color-background)' : 'var(--color-text-muted)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}></path>
                {item.circle && <path d={item.circle}></path>}
                {item.dot2 && <path d={item.dot2}></path>}
              </svg>
              {isActive && (
                <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {item.label}
                </span>
              )}
              {item.dot && !isActive && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '12px',
                  width: '8px',
                  height: '8px',
                  background: 'var(--color-secondary)',
                  borderRadius: '50%',
                  border: '2px solid var(--color-primary)'
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavBar;
