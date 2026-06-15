// Force rebuild
import React, { useState } from 'react';
import ConsumerMap from './components/ConsumerMap';
import TopSearchBar from './components/TopSearchBar';
import CategoryShelf from './components/CategoryShelf';
import BottomSheet from './components/BottomSheet';
import LiveNotificationPopup from './components/LiveNotificationPopup';
import BottomNavBar from './components/BottomNavBar';
import PlaceDetailsSheet from './components/PlaceDetailsSheet';
import NotificationsPage from './components/NotificationsPage';
import AlertsPage from './components/AlertsPage';
import MenuPage from './components/MenuPage';


import BusinessDashboard from './components/BusinessDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [selectedPlace, setSelectedPlace] = React.useState(null);
  const [offerIndex, setOfferIndex] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState('map');
  const [appMode, setAppMode] = React.useState('consumer');
  const [places, setPlaces] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredPlaces = React.useMemo(() => {
    if (!searchQuery) return places;
    const q = searchQuery.toLowerCase();
    return places.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    );
  }, [places, searchQuery]);

  const fetchPlaces = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${API_URL}/api/places`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPlaces(data);
          // Update selectedPlace if it exists so the card stays live
          setSelectedPlace(prev => {
            if (!prev) return null;
            return data.find(p => p.id === prev.id) || prev;
          });
        } else {
          setPlaces([]);
        }
      })
      .catch(() => setPlaces([]));
  };

  React.useEffect(() => {
    if (user && appMode === 'consumer') {
      fetchPlaces();
      const interval = setInterval(fetchPlaces, 5000); // Poll every 5s for live campaigns
      return () => clearInterval(interval);
    }
  }, [user, appMode]);



  // Extract all active campaigns across all places, filtered by User Alert Preferences
  const activeCampaigns = React.useMemo(() => {
    let alertPrefs = { preferences: {}, customCategories: [] };
    if (user?.preferences?.alerts) {
      alertPrefs = user.preferences.alerts;
    } else {
      try {
        const stored = localStorage.getItem('alertPrefs');
        if (stored) alertPrefs = JSON.parse(stored);
      } catch (e) {}
    }
    const { preferences: basicPrefs, customCategories } = alertPrefs;
    
    // Default active if nothing is saved
    const isRestaurantActive = basicPrefs?.restaurants ?? true;
    const isCoffeeActive = basicPrefs?.coffee ?? true;
    const isHappyHourActive = basicPrefs?.happyHour ?? false;
    const isCinemaActive = basicPrefs?.cinema ?? true;

    const campaigns = [];
    places.forEach(p => {
      let matchesAlert = false;
      const cat = p.category ? p.category.toLowerCase() : '';
      const desc = p.description ? p.description.toLowerCase() : '';
      const kw = p.keywords ? p.keywords.toLowerCase() : '';
      const textToSearch = `${cat} ${desc} ${kw}`;

      // Basic category checks
      if (isRestaurantActive && (cat.includes('restaurant') || cat.includes('food'))) matchesAlert = true;
      if (isCoffeeActive && (cat.includes('coffee') || cat.includes('cafe') || cat.includes('bakery'))) matchesAlert = true;
      if (isHappyHourActive && (cat.includes('bar') || cat.includes('club'))) matchesAlert = true;
      if (isCinemaActive && (cat.includes('cinema') || cat.includes('event'))) matchesAlert = true;

      // Custom category checks
      if (!matchesAlert && customCategories && customCategories.length > 0) {
        for (const custom of customCategories) {
          if (custom.active && custom.name && textToSearch.includes(custom.name.toLowerCase())) {
            matchesAlert = true;
            break;
          }
        }
      }

      if (matchesAlert && p.campaigns && p.campaigns.length > 0) {
        p.campaigns.forEach(c => {
          if (c.isActive) {
            campaigns.push({
              id: c.id,
              placeId: p.id,
              title: c.title,
              subtitle: p.name,
              place: p
            });
          }
        });
      }
    });
    return campaigns;
  }, [places, user?.preferences]);

  React.useEffect(() => {
    if (activeCampaigns.length > 0) {
      const interval = setInterval(() => {
        setOfferIndex(prev => (prev + 1) % activeCampaigns.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeCampaigns.length]);

  const activeOffer = activeCampaigns.length > 0 ? activeCampaigns[offerIndex % activeCampaigns.length] : null;
  const activeOfferPlace = activeOffer ? activeOffer.place : null;

  const handlePlaceClick = (place) => {
    setSelectedPlace(place);
  };

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'var(--color-primary)' }}>Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {appMode === 'consumer' ? (
        <>
          {activeTab === 'map' && (
            <>
              <ConsumerMap places={filteredPlaces} onPinClick={handlePlaceClick} />
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }}>
                  <TopSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                  <CategoryShelf searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                  {activeOfferPlace && (
                    <LiveNotificationPopup 
                      offer={activeOffer} 
                      onClick={async () => {
                        // Ping backend to register a Lead (click)
                        try {
                          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                          await fetch(`${API_URL}/api/campaigns/${activeOffer.id}/click`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                          });
                        } catch (e) {
                          console.error('Failed to register campaign click', e);
                        }
                        setSelectedPlace(activeOfferPlace);
                      }} 
                    />
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pointerEvents: 'none' }}>
                  <div style={{ pointerEvents: 'none', width: '100%' }}>
                    <BottomSheet places={filteredPlaces} onPlaceClick={handlePlaceClick} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notifications' && <NotificationsPage activeCampaigns={activeCampaigns} />}
          {activeTab === 'alerts' && <AlertsPage />}
          {activeTab === 'settings' && <MenuPage 
            onSwitchToBusiness={() => setAppMode('business')} 
            onPlaceClick={(place) => { setActiveTab('map'); setSelectedPlace(place); }}
          />}

          <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
          {selectedPlace && <PlaceDetailsSheet place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
        </>
      ) : (
        <BusinessDashboard onSwitchToConsumer={() => setAppMode('consumer')} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
