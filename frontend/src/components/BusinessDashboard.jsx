import React, { useState, useEffect } from 'react';
import BusinessBottomNavBar from './BusinessBottomNavBar';
import BusinessProfile from './BusinessProfile';
import LiveCampaignManager from './LiveCampaignManager';
import OrderManager from './OrderManager';
import AudienceCRM from './AudienceCRM';
import BusinessMenuManager from './BusinessMenuManager';
import { useAuth } from '../context/AuthContext';

const BusinessDashboard = ({ onSwitchToConsumer }) => {
  const { fetchWithAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [place, setPlace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlace = async () => {
    try {
      const response = await fetchWithAuth('/api/business/places');
      const data = await response.json();
      if (response.ok && data.length > 0) {
        setPlace(data[0]); // For now, we assume the user has 1 primary place
      }
    } catch (err) {
      console.error('Failed to fetch place', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlace();
  }, []);

  if (isLoading) {
    return <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--color-background)', color: 'var(--color-text-main)' }}>Loading dashboard...</div>;
  }

  return (
    <div className="animate-business-mode" style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'var(--color-background)',
      zIndex: 100,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Global Exit Button */}
      <button className="btn-touch" onClick={onSwitchToConsumer} style={{
        position: 'absolute',
        top: 'calc(var(--safe-area) + 16px)',
        right: '24px',
        zIndex: 200,
        background: 'var(--color-surface)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-outline)',
        width: '44px', height: '44px',
        borderRadius: '50%',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        boxShadow: 'var(--shadow-floating)'
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l-5-5 5-5 M15 12H3" />
        </svg>
      </button>

      {/* Dynamic Views */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'profile' && <BusinessProfile place={place} onRefresh={fetchPlace} onSwitchToConsumer={onSwitchToConsumer} />}
        {activeTab === 'campaigns' && <LiveCampaignManager place={place} />}
        {activeTab === 'orders' && <OrderManager place={place} onRefresh={fetchPlace} />}
        {activeTab === 'menu' && <BusinessMenuManager place={place} onRefresh={fetchPlace} />}
        {activeTab === 'audience' && <AudienceCRM place={place} />}
      </div>

      <BusinessBottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default BusinessDashboard;
