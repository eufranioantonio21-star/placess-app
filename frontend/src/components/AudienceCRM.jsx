import React from 'react';

const StatCard = ({ title, value, subtitle, highlight }) => (
  <div style={{ flex: 1, minWidth: '120px', background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: `1px solid ${highlight ? 'var(--color-primary)' : 'var(--color-outline)'}` }}>
    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '8px' }}>{title}</div>
    <div style={{ fontSize: '24px', fontWeight: 800, color: highlight ? 'var(--color-primary)' : 'var(--color-text-main)' }}>{value}</div>
    {subtitle && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{subtitle}</div>}
  </div>
);

const AudienceCRM = ({ place }) => {
  const orders = place?.orders || [];
  
  // 1. Calculate Business CRM Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const aov = orders.length > 0 ? (totalRevenue / orders.length) : 0;
  
  const customerStats = {};
  orders.forEach(o => {
    if (!customerStats[o.userId]) {
      customerStats[o.userId] = { count: 0, spend: 0, lastOrder: o.createdAt, name: o.user?.name || `Customer #${o.userId}` };
    }
    customerStats[o.userId].count += 1;
    customerStats[o.userId].spend += o.total;
  });

  const totalCustomers = Object.keys(customerStats).length;
  
  const reviews = place?.reviews || [];
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;
  
  // 2. Segmentation
  const customers = Object.values(customerStats);
  const vips = customers.filter(c => c.spend >= 50 || c.count >= 3);
  const regulars = customers.filter(c => c.count === 2 && c.spend < 50);
  const newbies = customers.filter(c => c.count === 1);
  const atRisk = customers.filter(c => c.count > 0); // In a real app, this would check if lastOrder > 30 days. We'll mock length for UI if needed.

  return (
    <div style={{ padding: 'var(--safe-area) 24px 24px 24px', overflowY: 'auto', height: '100%', paddingBottom: '100px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-main)', margin: '24px 0 8px 0' }}>CRM Dashboard</h1>
      <p style={{ color: 'var(--color-text-muted)', margin: '0 0 24px 0', fontSize: '14px' }}>Analyze performance and manage relationships.</p>

      {/* Business Overview */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px', scrollbarWidth: 'none' }}>
        <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} highlight={true} />
        <StatCard title="Avg Order Val" value={`$${aov.toFixed(2)}`} />
        <StatCard title="Total Clients" value={totalCustomers} subtitle="Unique buyers" />
        <StatCard title="Avg Rating" value={avgRating > 0 ? `${avgRating} ★` : 'N/A'} subtitle={`${reviews.length} reviews`} highlight={avgRating >= 4.5} />
      </div>

      {/* Actionable Follow Up Card */}
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px' }}>Follow Up Actions</h2>
      <div className="clay-card" style={{ padding: '16px', marginBottom: '32px', borderLeft: '4px solid var(--color-accent)' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>Engage with your top or recent customers to increase retention.</p>
        
        {vips.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {vips.slice(0, 3).map((vip, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-background)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{vip.name} <span style={{fontSize:'12px', color:'var(--color-accent)'}}>VIP</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Spent ${vip.spend.toFixed(2)} total</div>
                </div>
                <button className="btn-touch" style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '13px' }}>
                  Reward
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--color-background)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No VIPs yet. Keep launching campaigns to build loyalty!
          </div>
        )}
      </div>

      {/* Campaign Performance */}
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px' }}>Campaign Analytics</h2>
      <div style={{ marginBottom: '32px' }}>
        {place.campaigns && place.campaigns.length > 0 ? (
          place.campaigns.map(camp => {
            const conversionRate = camp.clicks > 0 ? ((camp.conversions / camp.clicks) * 100).toFixed(1) : 0;
            const estimatedReach = camp.clicks * 14; // Mock multiplier for impressions
            
            return (
              <div key={camp.id} className="clay-card" style={{ padding: '16px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
                {camp.isActive && <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--color-primary)' }} />}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)' }}>{camp.title}</h4>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Type: <span style={{textTransform:'capitalize'}}>{camp.type.replace('_',' ')}</span></span>
                  </div>
                  <span style={{ fontSize: '12px', background: camp.isActive ? 'rgba(58,255,21,0.1)' : 'var(--color-outline)', color: camp.isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', padding: '4px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    {camp.isActive ? 'Live' : 'Ended'}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: 'var(--color-background)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Reach (Est.)</div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>{estimatedReach}</div>
                  </div>
                  <div style={{ background: 'var(--color-background)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Conv. Rate</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent)' }}>{conversionRate}%</div>
                  </div>
                  <div style={{ background: 'var(--color-background)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Leads / Clicks</div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>{camp.clicks}</div>
                  </div>
                  <div style={{ background: 'var(--color-background)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Clients Recovered</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>{camp.conversions}</div>
                  </div>
                </div>
                
              </div>
            );
          })
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontStyle: 'italic' }}>No campaigns launched yet.</p>
        )}
      </div>

      {/* Customer Segments */}
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px' }}>Customer Demographics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'rgba(58,255,21,0.05)', border: '1px solid var(--color-primary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }}>{vips.length}</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>VIPs</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Top spenders</div>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-main)' }}>{regulars.length}</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Regulars</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Frequent buyers</div>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-main)' }}>{newbies.length}</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>New</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>First time buyers</div>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid #ef4444', padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444' }}>0</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>At-Risk</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Needs follow up</div>
        </div>
      </div>
    </div>
  );
};

export default AudienceCRM;
