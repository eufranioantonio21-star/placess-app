import React from 'react';

const categories = [
  { name: 'Restaurant', icon: '🍔' },
  { name: 'Coffee Shop', icon: '☕' },
  { name: 'Food Truck', icon: '🌮' },
  { name: 'Store', icon: '🏪' }
];

const CategoryShelf = ({ searchQuery, setSearchQuery }) => {
  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      padding: '16px 16px 4px 16px',
      gap: '12px',
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
    }}>
      {categories.map((cat, idx) => {
        const isActive = searchQuery.toLowerCase() === cat.name.toLowerCase();
        return (
          <button 
            key={idx}
            onClick={() => setSearchQuery(isActive ? '' : cat.name)}
            className="btn-touch"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-outline)',
              borderRadius: 'var(--radius-full)',
              background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
              boxShadow: 'var(--shadow-card)',
              fontFamily: 'var(--font-family)',
              fontWeight: 600,
              fontSize: '13px',
              color: isActive ? 'var(--color-background)' : 'var(--color-primary)',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '14px' }}>{cat.icon}</span>
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryShelf;
