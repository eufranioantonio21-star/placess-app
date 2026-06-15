import React from 'react';

const MenuItem = ({ icon, title, subtitle, onClick, isDanger }) => (
  <div className="btn-touch" onClick={onClick} style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '12px',
    boxShadow: 'var(--shadow-card)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        width: '40px', height: '40px',
        borderRadius: '50%',
        background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-outline)',
        color: isDanger ? '#ef4444' : 'var(--color-primary)',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon}></path>
        </svg>
      </div>
      <div>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: isDanger ? '#ef4444' : 'var(--color-text-main)' }}>{title}</h4>
        {subtitle && <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  </div>
);

import PersonalInfoPage from './PersonalInfoPage';
import PrivacySecurityPage from './PrivacySecurityPage';
import BusinessSetupPage from './BusinessSetupPage';
import SavedPlacesPage from './SavedPlacesPage';
import { useAuth } from '../context/AuthContext';

const MenuPage = ({ onSwitchToBusiness, onPlaceClick }) => {
  const { user, logout } = useAuth();
  const [showPersonalInfo, setShowPersonalInfo] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const [showBusinessSetup, setShowBusinessSetup] = React.useState(false);
  const [showSavedPlaces, setShowSavedPlaces] = React.useState(false);

  const hasBusiness = user?.places && user.places.length > 0;

  const avatarUrl = user?.photoUrl 
    ? user.photoUrl 
    : user?.initials
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.initials)}&background=3AFF15&color=111111&bold=true`
      : user?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3AFF15&color=111111&bold=true` 
        : 'https://ui-avatars.com/api/?name=U&background=3AFF15&color=111111';

  if (showSavedPlaces) {
    return <SavedPlacesPage onBack={() => setShowSavedPlaces(false)} onPlaceClick={onPlaceClick} />;
  }

  if (showPersonalInfo) {
    return <PersonalInfoPage onBack={() => setShowPersonalInfo(false)} />;
  }

  if (showPrivacy) {
    return <PrivacySecurityPage onBack={() => setShowPrivacy(false)} />;
  }

  if (showBusinessSetup) {
    return <BusinessSetupPage onBack={() => setShowBusinessSetup(false)} onComplete={() => {
      setShowBusinessSetup(false);
      onSwitchToBusiness();
    }} />;
  }

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
      {/* Profile Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '32px', marginBottom: '40px' }}>
        <div style={{
          width: '96px', height: '96px',
          borderRadius: '50%',
          background: 'var(--color-outline)',
          overflow: 'hidden',
          border: '4px solid white',
          boxShadow: 'var(--shadow-floating)',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '36px',
          color: 'var(--color-primary)',
          padding: 0
        }}>
          <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--color-text-main)' }}>{user?.name || 'User'}</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '15px' }}>{user?.email || 'user@example.com'}</p>
      </div>

      {/* Menu Options */}
      <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '16px', marginLeft: '8px' }}>
        Account
      </h3>
      <MenuItem 
        icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" 
        title="Personal Information" 
        subtitle="Manage your details"
        onClick={() => setShowPersonalInfo(true)}
      />
      <MenuItem 
        icon="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
        title="Saved Places" 
        subtitle="Your favorite spots"
        onClick={() => setShowSavedPlaces(true)}
      />

      <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: '24px', marginLeft: '8px' }}>
        Settings
      </h3>
      <MenuItem 
        icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
        title="Privacy & Security" 
        subtitle="Location, cookies and data"
        onClick={() => setShowPrivacy(true)}
      />

      <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: '24px', marginLeft: '8px' }}>
        Business
      </h3>
      {hasBusiness ? (
        <MenuItem 
          icon="M3 3v18h18 M18 9l-5 5-4-4-5 5" 
          title="Switch to Business Dashboard" 
          subtitle="Manage your restaurant or store"
          onClick={onSwitchToBusiness}
        />
      ) : (
        <MenuItem 
          icon="M12 5v14 M5 12h14" 
          title="Create Business Account" 
          subtitle="Start managing your restaurant or store"
          onClick={() => setShowBusinessSetup(true)}
        />
      )}

      <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: '24px', marginLeft: '8px' }}>
        Other
      </h3>
      <MenuItem 
        icon="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" 
        title="Log Out" 
        isDanger={true}
        onClick={logout}
      />
    </div>
  );
};

export default MenuPage;
