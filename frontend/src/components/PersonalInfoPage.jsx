import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LocationPickerMap from './LocationPickerMap';

const InfoField = ({ label, value, type = 'text', isPassword = false, isEditing, onEdit, onSave, onCancel, editValue, setEditValue, isSaving }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </label>
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)'
    }}>
      {isEditing ? (
        <input 
          type={type} 
          value={editValue} 
          onChange={(e) => setEditValue(e.target.value)}
          disabled={isSaving}
          style={{
            flex: 1, background: 'transparent', border: 'none', color: 'var(--color-text-main)', fontSize: '15px', fontWeight: 500, outline: 'none'
          }}
          autoFocus
        />
      ) : (
        <span style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 500 }}>
          {isPassword ? '••••••••' : value}
        </span>
      )}
      
      {isEditing ? (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-touch" onClick={onCancel} disabled={isSaving} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '13px' }}>Cancel</button>
          <button className="btn-touch" onClick={onSave} disabled={isSaving} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px' }}>{isSaving ? '...' : 'Save'}</button>
        </div>
      ) : (
        <button className="btn-touch" onClick={onEdit} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px' }}>Edit</button>
      )}
    </div>
  </div>
);

const LocationItem = ({ loc, onDelete, onEdit, isEditing, editTitle, setEditTitle, editAddress, setEditAddress, onSaveEdit, onCancelEdit }) => {
  if (isEditing) {
    return (
      <div style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)', marginBottom: '12px' }}>
        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '8px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '14px' }} />
        <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '14px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-touch" onClick={onCancelEdit} style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
          <button className="btn-touch" onClick={onSaveEdit} style={{ flex: 1, padding: '8px', background: 'var(--color-primary)', border: 'none', color: 'var(--color-background)', fontWeight: 700, borderRadius: '8px' }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)', marginBottom: '12px'
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(58, 255, 21, 0.15)', color: 'var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main)' }}>{loc.title}</h4>
        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>{loc.address}</p>
      </div>
      <button className="btn-touch" onClick={onEdit} style={{ background: 'none', border: 'none', color: 'var(--color-text-main)', marginLeft: '8px', padding: '8px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
      <button className="btn-touch" onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ef4444', marginLeft: '4px', padding: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  );
};

const ProfilePictureEditor = ({ user, onSave, isSaving }) => {
  const avatarUrl = user?.photoUrl 
    ? user.photoUrl 
    : user?.initials
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.initials)}&background=3AFF15&color=111111&bold=true`
      : user?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3AFF15&color=111111&bold=true` 
        : 'https://ui-avatars.com/api/?name=U&background=3AFF15&color=111111';

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSave({ photoUrl: reader.result, initials: null });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInitialsChange = () => {
    const init = prompt("Enter 1-2 letters for your avatar:", user?.initials || "");
    if (init !== null && init.trim().length > 0) {
      onSave({ initials: init.trim().substring(0,2).toUpperCase(), photoUrl: null });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
      <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--color-primary)', marginBottom: '16px', position: 'relative' }}>
        <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {isSaving && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>Saving...</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <label className="btn-touch" style={{ padding: '8px 16px', background: 'var(--color-surface)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 700, border: '1px solid var(--color-outline)', cursor: 'pointer' }}>
          Upload Photo
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} disabled={isSaving} />
        </label>
        <button className="btn-touch" onClick={handleInitialsChange} disabled={isSaving} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--color-text-main)', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 700, border: '1px solid var(--color-outline)' }}>
          Change Letters
        </button>
      </div>
    </div>
  );
};

const PersonalInfoPage = ({ onBack }) => {
  const { user, updateUser, fetchWithAuth } = useAuth();
  const [locations, setLocations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Editing state
  const [editingField, setEditingField] = useState(null); // 'name', 'email', 'phone', 'password'
  const [editValue, setEditValue] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Password editing state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Location editing state
  const [editingLocId, setEditingLocId] = useState(null);
  const [editLocTitle, setEditLocTitle] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');

  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    const savedLocations = localStorage.getItem('deliveryLocations');
    if (savedLocations) {
      try {
        setLocations(JSON.parse(savedLocations));
      } catch (e) {}
    }
  }, []);

  const handleEditClick = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSaveUser = async (directData = null) => {
    setIsSavingUser(true);
    let updatedData = {};
    
    if (directData) {
      updatedData = directData;
    } else {
      if (editingField === 'name') updatedData.name = editValue;
      if (editingField === 'email') updatedData.email = editValue;
      if (editingField === 'phone') updatedData.phoneNumber = editValue;
    }

    const res = await updateUser(updatedData);
    setIsSavingUser(false);
    if (res.success) {
      if (!directData) setEditingField(null);
    } else {
      alert('Failed to update: ' + res.error);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setIsSavingUser(true);
    try {
      const res = await fetchWithAuth('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      
      setEditingField(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert("Password updated successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleAddLocation = () => {
    if (!newTitle.trim() || !newAddress.trim()) return;
    const newLocs = [...locations, { id: Date.now(), title: newTitle, address: newAddress }];
    setLocations(newLocs);
    localStorage.setItem('deliveryLocations', JSON.stringify(newLocs));
    setNewTitle('');
    setNewAddress('');
    setShowAddForm(false);
  };

  const handleSaveEditLocation = (id) => {
    if (!editLocTitle.trim() || !editLocAddress.trim()) return;
    const newLocs = locations.map(l => l.id === id ? { ...l, title: editLocTitle, address: editLocAddress } : l);
    setLocations(newLocs);
    localStorage.setItem('deliveryLocations', JSON.stringify(newLocs));
    setEditingLocId(null);
  };

  const handleDeleteLocation = (id) => {
    const newLocs = locations.filter(l => l.id !== id);
    setLocations(newLocs);
    localStorage.setItem('deliveryLocations', JSON.stringify(newLocs));
  };

  const handleMapLocationSelected = (locData) => {
    const newLocs = [...locations, { id: Date.now(), title: locData.title, address: locData.address }];
    setLocations(newLocs);
    localStorage.setItem('deliveryLocations', JSON.stringify(newLocs));
    setShowMapPicker(false);
  };

  if (showMapPicker) {
    return <LocationPickerMap onSelect={handleMapLocationSelected} onCancel={() => setShowMapPicker(false)} />;
  }

  return (
    <div className="animate-slide-up-page" style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'var(--color-background)',
      zIndex: 60,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: 'calc(var(--safe-area) + 16px) 24px 16px 24px',
        display: 'flex', alignItems: 'center',
        background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--color-outline)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button className="btn-touch" onClick={onBack} style={{
          background: 'var(--color-outline)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--color-text-main)' }}>Personal Info</h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        
        <ProfilePictureEditor user={user} onSave={handleSaveUser} isSaving={isSavingUser} />

        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px' }}>Profile Details</h3>
        <InfoField 
          label="Full Name" 
          value={user?.name || "Loading..."} 
          isEditing={editingField === 'name'}
          editValue={editValue}
          setEditValue={setEditValue}
          onEdit={() => handleEditClick('name', user?.name)}
          onSave={handleSaveUser}
          onCancel={() => setEditingField(null)}
          isSaving={isSavingUser}
        />
        <InfoField 
          label="Email Address" 
          type="email"
          value={user?.email || "Loading..."} 
          isEditing={editingField === 'email'}
          editValue={editValue}
          setEditValue={setEditValue}
          onEdit={() => handleEditClick('email', user?.email)}
          onSave={handleSaveUser}
          onCancel={() => setEditingField(null)}
          isSaving={isSavingUser}
        />
        <InfoField 
          label="Phone Number" 
          type="tel"
          value={user?.phoneNumber || "Not provided"} 
          isEditing={editingField === 'phone'}
          editValue={editValue}
          setEditValue={setEditValue}
          onEdit={() => handleEditClick('phone', user?.phoneNumber)}
          onSave={handleSaveUser}
          onCancel={() => setEditingField(null)}
          isSaving={isSavingUser}
        />

        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '32px', marginBottom: '16px' }}>Security</h3>
        
        {editingField === 'password' ? (
          <div style={{ marginBottom: '16px', background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change Password</label>
            <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} disabled={isSavingUser} style={{ width: '100%', padding: '10px', marginBottom: '8px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '14px' }} />
            <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isSavingUser} style={{ width: '100%', padding: '10px', marginBottom: '8px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '14px' }} />
            <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isSavingUser} style={{ width: '100%', padding: '10px', marginBottom: '16px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '14px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-touch" onClick={() => setEditingField(null)} disabled={isSavingUser} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
              <button className="btn-touch" onClick={handleSavePassword} disabled={isSavingUser} style={{ flex: 1, padding: '10px', background: 'var(--color-primary)', border: 'none', color: 'var(--color-background)', fontWeight: 700, borderRadius: '8px' }}>{isSavingUser ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        ) : (
          <InfoField 
            label="Password" 
            value="password" 
            isPassword={true} 
            isEditing={false}
            onEdit={() => setEditingField('password')}
          />
        )}
        <button className="btn-touch" style={{
          width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px', marginBottom: '32px'
        }}>
          Enable Two-Factor Authentication
        </button>

        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px' }}>Delivery Locations</h3>
        
        {locations.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-outline)' }}>
            No saved locations yet.
          </div>
        ) : (
          locations.map(loc => (
            <LocationItem 
              key={loc.id}
              loc={loc}
              isEditing={editingLocId === loc.id}
              editTitle={editLocTitle}
              setEditTitle={setEditLocTitle}
              editAddress={editLocAddress}
              setEditAddress={setEditLocAddress}
              onEdit={() => { setEditingLocId(loc.id); setEditLocTitle(loc.title); setEditLocAddress(loc.address); }}
              onSaveEdit={() => handleSaveEditLocation(loc.id)}
              onCancelEdit={() => setEditingLocId(null)}
              onDelete={() => handleDeleteLocation(loc.id)}
            />
          ))
        )}

        {showAddForm ? (
          <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', marginTop: '16px', border: '1px solid var(--color-outline)' }}>
            <input type="text" placeholder="Location Name (e.g., Home, Job)" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '8px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '14px' }} />
            <input type="text" placeholder="Full Address" value={newAddress} onChange={e => setNewAddress(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', background: 'var(--color-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontSize: '14px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-touch" onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
              <button className="btn-touch" onClick={handleAddLocation} style={{ flex: 1, padding: '10px', background: 'var(--color-primary)', border: 'none', color: 'var(--color-background)', fontWeight: 700, borderRadius: '8px' }}>Save</button>
              <button className="btn-touch" onClick={() => { setShowAddForm(false); setShowMapPicker(true); }} style={{ width: '44px', padding: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-primary)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn-touch" onClick={() => setShowAddForm(true)} style={{
              flex: 1, padding: '14px', background: 'var(--color-primary)', color: 'var(--color-background)', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Address
            </button>
            <button className="btn-touch" onClick={() => setShowMapPicker(true)} style={{
              width: '50px', padding: '14px', background: 'var(--color-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-full)', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </button>
          </div>
        )}

        <div style={{ height: '120px' }}></div>
      </div>
    </div>
  );
};

export default PersonalInfoPage;
