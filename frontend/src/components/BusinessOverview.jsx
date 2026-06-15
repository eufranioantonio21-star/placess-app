import React from 'react';
import { useAuth } from '../context/AuthContext';

const MetricCard = ({ title, value, trend, icon }) => (
  <div className="clay-card" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-accent-transparent)', color: 'var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        {icon}
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: trend.startsWith('+') || trend === '0' ? 'var(--color-primary)' : '#ef4444', background: trend.startsWith('+') || trend === '0' ? 'rgba(25, 80, 41, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '12px' }}>
        {trend}
      </span>
    </div>
    <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{title}</span>
    <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '4px' }}>{value}</span>
  </div>
);

const BusinessOverview = ({ place }) => {
  const { user } = useAuth();
  
  // Calculate real metrics
  const orders = place?.orders || [];
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'ready').length;
  
  // Unique customers based on userId
  const uniqueCustomers = new Set(orders.map(o => o.userId)).size;

  return (
    <div style={{ padding: 'var(--safe-area) 24px 24px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>{place?.name || 'My Business'}</p>
        </div>
      </div>

      {/* Live Metrics */}
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '16px' }}>Today's Performance</h3>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <MetricCard 
          title="Revenue" 
          value={`$${totalRevenue.toFixed(2)}`} 
          trend={totalRevenue > 0 ? "+1" : "0"} 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>} 
        />
        <MetricCard 
          title="Live Orders" 
          value={activeOrders} 
          trend={activeOrders > 0 ? `+${activeOrders}` : "0"} 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>} 
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <MetricCard 
          title="Total Customers" 
          value={uniqueCustomers} 
          trend={uniqueCustomers > 0 ? `+${uniqueCustomers}` : "0"} 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>} 
        />
      </div>

      {/* Recommended Action */}
      {/* Recommended Action */}
      <div className="clay-card" style={{ padding: '20px', background: 'var(--color-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-text-main)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>Ready to Start</h4>
          <span style={{ fontSize: '20px' }}>⚡</span>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.9, color: 'var(--color-text-muted)' }}>Your dashboard is clean. Go to the Menu tab to add your first items and start receiving orders!</p>
        <button className="btn-touch" style={{
          background: 'var(--color-primary)', color: 'var(--color-background)', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '14px', width: '100%'
        }}>
          Launch Happy Hour
        </button>
      </div>

    </div>
  );
};

export default BusinessOverview;
