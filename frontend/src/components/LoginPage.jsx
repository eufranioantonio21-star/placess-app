import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Store, ArrowRight, Loader, Phone, Camera, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import './LoginPage.css';

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationPicker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={position} /> : null;
};

const LoginPage = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CONSUMER');
  
  // Registration Fields
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Business Specific Fields
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Restaurant');
  const [photoUrl, setPhotoUrl] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [position, setPosition] = useState(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([38.7223, -9.1393]);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    if (!isLogin && role === 'BUSINESS' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
          setMapZoom(15);
        },
        () => console.log("GPS denied")
      );
    }
  }, [isLogin, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let result;
    if (isLogin) {
      result = await login(email, password);
    } else {
      if (role === 'BUSINESS' && !position) {
        setError('Please drop a pin on the map for your business location.');
        setIsLoading(false);
        return;
      }
      
      const payload = {
        email, password, name, role, phoneNumber
      };
      
      if (role === 'BUSINESS') {
        payload.businessName = businessName;
        payload.category = category;
        payload.lat = position.lat;
        payload.lng = position.lng;
        payload.businessPhone = businessPhone;
        payload.photoUrl = photoUrl;
      }
      
      result = await register(payload);
    }

    if (!result.success) {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  const handleMockGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    
    // Auto-fill and register a mock consumer
    const mockEmail = `consumer_${Date.now()}@google.com`;
    const payload = {
      email: mockEmail,
      password: 'password123',
      name: 'Google User',
      phoneNumber: '555-0199',
      role: 'CONSUMER'
    };
    
    const result = await register(payload);
    if (!result.success) setError(result.error);
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-glass-panel" style={{ maxHeight: '90vh', overflowY: 'auto', width: '100%', maxWidth: '400px' }}>
        <div className="login-header">
          <div className="logo-placeholder">
            <span>P</span>
          </div>
          <h1>Welcome to PleySIS</h1>
          <p>{isLogin ? 'Login to continue' : 'Create a new account'}</p>
        </div>

        <div className="auth-tabs">
          <button type="button" className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Login</button>
          <button type="button" className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          {!isLogin && (
            <div className="role-selector" style={{ marginBottom: '16px' }}>
              <label>
                <input type="radio" value="CONSUMER" checked={role === 'CONSUMER'} onChange={() => setRole('CONSUMER')} />
                Consumer
              </label>
              <label>
                <input type="radio" value="BUSINESS" checked={role === 'BUSINESS'} onChange={() => setRole('BUSINESS')} />
                Business Owner
              </label>
            </div>
          )}

          {/* COMMON LOGIN FIELDS */}
          {isLogin && (
            <>
              <div className="input-group">
                <User className="input-icon" size={20} />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <Lock className="input-icon" size={20} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </>
          )}

          {/* SIGN UP FIELDS */}
          {!isLogin && (
            <>
              <h3 style={{ fontSize: '14px', color: 'var(--color-primary)', marginBottom: '8px' }}>Personal Info</h3>
              <div className="input-group">
                <User className="input-icon" size={20} />
                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="input-group">
                <Phone className="input-icon" size={20} />
                <input type="tel" placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
              </div>
              <div className="input-group">
                <User className="input-icon" size={20} />
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <Lock className="input-icon" size={20} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {role === 'BUSINESS' && (
                <>
                  <h3 style={{ fontSize: '14px', color: 'var(--color-primary)', margin: '16px 0 8px 0' }}>Business Info</h3>
                  <div className="input-group">
                    <Store className="input-icon" size={20} />
                    <input type="text" placeholder="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <Phone className="input-icon" size={20} />
                    <input type="tel" placeholder="Business Phone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} required />
                  </div>
                  <div className="input-group" style={{ padding: '4px' }}>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', padding: '8px' }}
                    >
                      <option value="Restaurant" style={{color: '#000'}}>Restaurant</option>
                      <option value="Coffee Shop" style={{color: '#000'}}>Coffee Shop</option>
                      <option value="Food Truck" style={{color: '#000'}}>Food Truck</option>
                      <option value="Store" style={{color: '#000'}}>Store</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <Camera className="input-icon" size={20} />
                    <input type="url" placeholder="Photo URL (Optional)" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                  </div>

                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px', marginTop: '12px' }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Tap map to set location
                  </label>
                  <div style={{ height: '150px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '16px' }}>
                    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; CARTO'
                      />
                      <LocationPicker position={position} setPosition={setPosition} />
                    </MapContainer>
                  </div>
                </>
              )}
            </>
          )}

          <button type="submit" className="login-submit-btn" disabled={isLoading}>
            {isLoading ? <Loader className="animate-spin" /> : (isLogin ? 'Log In' : 'Sign Up')}
            {!isLoading && <ArrowRight size={20} />}
          </button>

          {!isLogin && role === 'CONSUMER' && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginBottom: '16px' }}>OR</div>
              <button 
                type="button" 
                onClick={handleMockGoogleLogin}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  cursor: 'pointer', fontWeight: 600
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
